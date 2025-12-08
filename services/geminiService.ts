
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ChatMessage, Form, FormResponse, User, SystemSettings } from '../types';

// La clé API sera injectée par Vite via la constante globale __APP_API_KEY__
const apiKey = process.env.API_KEY || "";

let ai: GoogleGenAI;
try {
    ai = new GoogleGenAI({ apiKey: apiKey });
} catch (error) {
    console.error("Erreur d'initialisation Gemini:", error);
    // Fallback pour éviter le crash immédiat si la clé manque
    ai = new GoogleGenAI({ apiKey: "MISSING_KEY" });
}

// Modèles utilisés
const ANALYSIS_MODEL = 'gemini-2.5-flash';
const CHAT_MODEL = 'gemini-2.5-flash';

// Schéma JSON strict pour l'analyse (Étape 2)
const analysisResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    analysisText: {
      type: Type.STRING,
      description: "Une analyse experte en biostatistiques et épidémiologie, formatée en HTML STRICT (pas de Markdown). Doit inclure : Méthodologie, Résultats Descriptifs, Analyse Inférentielle (si applicable), et Recommandations. Utiliser des balises <h3>, <p>, <ul>, <li>, <strong>.",
    },
    chartData: {
      type: Type.OBJECT,
      nullable: true,
      description: "Données structurées pour générer un graphique (Chart.js) illustrant le point le plus important de l'analyse.",
      properties: {
        type: {
          type: Type.STRING,
          enum: ["bar", "pie", "doughnut"],
          description: "Le type de graphique le plus adapté aux données.",
        },
        data: {
          type: Type.OBJECT,
          properties: {
            labels: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Les étiquettes de l'axe X ou de la légende.",
            },
            datasets: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: "Titre du jeu de données" },
                  data: { 
                    type: Type.ARRAY, 
                    items: { type: Type.NUMBER },
                    description: "Les valeurs numériques correspondantes aux étiquettes."
                  },
                  backgroundColor: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    nullable: true,
                    description: "Tableau de codes couleurs hexadécimaux pour chaque segment/barre."
                  }
                },
                required: ["label", "data"],
              },
            },
          },
          required: ["labels", "datasets"],
        },
      },
      required: ["type", "data"],
    },
    requiresConfirmation: {
      type: Type.BOOLEAN,
      description: "Mettre à true uniquement si les données sont trop volumineuses et nécessitent une analyse par lot. Pour l'instant, false.",
    },
    relevantFieldIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Liste des IDs de champs pertinents utilisés pour l'analyse.",
        nullable: true
    }
  },
  required: ["analysisText"],
};

// Schéma pour les suggestions d'expert
const suggestionsResponseSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Titre court de l'analyse suggérée (ex: Étude des facteurs de risque)." },
      description: { type: Type.STRING, description: "Explication de pourquoi cette analyse est pertinente pour une thèse." },
      searchPrompt: { type: Type.STRING, description: "L'instruction technique précise à renvoyer à l'IA pour exécuter cette analyse." }
    },
    required: ["title", "description", "searchPrompt"]
  }
};

/**
 * Prépare le contexte des données pour l'analyse finale (Optimisé format Texte/CSV).
 * Transforme les données JSON en format tabulaire pipe-separated pour économiser des tokens.
 * Retourne le texte ET le nombre exact de lignes traitées.
 */
const prepareDataContext = (forms: Form[], responses: FormResponse[]): { contextText: string, totalRows: number } => {
  let output = "";
  let totalRows = 0;

  forms.forEach(form => {
    output += `--- FORMULAIRE: ${form.title} (ID: ${form.id}) ---\n`;
    output += `DESCRIPTION: ${form.description || 'Aucune'}\n`;
    output += `FORMAT DONNÉES: Valeurs séparées par des barres verticales '|' (Pipe-separated values). Première ligne = En-têtes.\n\n`;
    
    // En-têtes (Questions)
    // On nettoie les labels pour éviter les pipes qui casseraient le format
    const headers = form.schema.map(f => f.label.replace(/\|/g, '/').trim());
    const fieldIds = form.schema.map(f => f.id);
    
    output += headers.join(" | ") + "\n";
    // Ligne de séparation visuelle (optionnelle mais aide l'IA)
    output += headers.map(() => "---").join("|") + "\n";

    // Données (Réponses)
    const formResponses = responses.filter(r => r.formId === form.id);
    
    if (formResponses.length === 0) {
        output += "(Aucune réponse collectée pour ce formulaire)\n";
    } else {
        formResponses.forEach(r => {
            totalRows++; // Comptage précis
            const rowValues = fieldIds.map(fid => {
                const val = r.data[fid];
                let strVal = "";
                
                if (Array.isArray(val)) {
                    // Pour les choix multiples, on sépare par des points-virgules pour distinguer du séparateur de colonne
                    strVal = val.join("; "); 
                } else if (val !== undefined && val !== null) {
                    strVal = String(val);
                }
                
                // Nettoyage critique : remplacer les pipes et les sauts de ligne pour maintenir la structure CSV
                return strVal.replace(/\|/g, "/").replace(/[\r\n]+/g, " ").trim();
            });
            output += rowValues.join(" | ") + "\n";
        });
    }
    output += "\n\n";
  });

  return { contextText: output, totalRows };
};

/**
 * Génère un résumé statistique mathématiquement exact pour guider l'IA.
 * Cela empêche les hallucinations sur les comptages simples.
 */
const generateStatisticalSummary = (forms: Form[], responses: FormResponse[]): string => {
  let summary = "";

  forms.forEach(form => {
    // Filter responses for this specific form
    const formResponses = responses.filter(r => r.formId === form.id);
    const total = formResponses.length;
    if (total === 0) return;

    summary += `RÉSUMÉ STATISTIQUE POUR "${form.title}" (N=${total} participants) :\n`;

    form.schema.forEach(field => {
        if (field.type === 'note' || field.type === 'text' || field.type === 'textarea') return; // Skip non-analyzable simply

        const validValues = formResponses
            .map(r => r.data[field.id])
            .filter(v => v !== undefined && v !== null && v !== '');

        if (['number', 'range'].includes(field.type)) {
            const nums = validValues.map(v => Number(v)).filter(n => !isNaN(n));
            if (nums.length > 0) {
                const min = Math.min(...nums);
                const max = Math.max(...nums);
                const sum = nums.reduce((a, b) => a + b, 0);
                const avg = (sum / nums.length).toFixed(2);
                summary += `- ${field.label} : Moyenne=${avg}, Min=${min}, Max=${max}\n`;
            } else {
                summary += `- ${field.label} : Aucune donnée numérique valide.\n`;
            }
        } else if (['choice', 'checkbox'].includes(field.type)) {
            const counts: Record<string, number> = {};
            validValues.forEach(val => {
                const items = Array.isArray(val) ? val : [val];
                items.forEach(item => {
                    const strItem = String(item).trim();
                    counts[strItem] = (counts[strItem] || 0) + 1;
                });
            });
            const details = Object.entries(counts)
                .map(([k, v]) => `${k}=${v} (${((v/total)*100).toFixed(1)}%)`)
                .join(', ');
            summary += `- ${field.label} : ${details}\n`;
        }
    });
    summary += "\n";
  });
  return summary;
};

/**
 * Génère des suggestions d'analyse basées sur la structure du formulaire
 */
export const getAnalysisSuggestions = async (forms: Form[], responses: FormResponse[]): Promise<Array<{title: string, description: string, searchPrompt: string}>> => {
  if (!apiKey || apiKey === "MISSING_KEY") {
      throw new Error("Clé API manquante");
  }

  try {
    // Pour les suggestions, on envoie un extrait des réponses (5 premières) pour que l'IA comprenne le contenu sans saturer
    const sampleResponses = responses.slice(0, 5);
    const { contextText } = prepareDataContext(forms, sampleResponses);
    
    const systemInstruction = `
      Tu es un Professeur expert en Méthodologie de Recherche et Biostatistiques.
      Tu assistes un étudiant en médecine qui a collecté des données mais ne sait pas quelles analyses statistiques effectuer pour sa thèse.

      TA MISSION :
      Analyser la structure du formulaire et l'échantillon de données fourni pour proposer 4 à 6 pistes d'analyses pertinentes.

      CRITÈRES DE SUGGESTION :
      1. **Pertinence Scientifique** : Propose des analyses qui ont du sens médicalement (ex: Facteurs de risque, Évaluation d'impact, Corrélations cliniques).
      2. **Faisabilité Statistique** : Vérifie si les variables (qualitatives/quantitatives) permettent ces tests (Chi-2, Student, ANOVA, etc.).
      3. **Diversité** : Propose un mélange d'analyses descriptives (profil épidémiologique) et analytiques (recherche de liens).

      FORMAT DE SORTIE (JSON) :
      Une liste d'objets contenant :
      - title : Un titre accrocheur pour l'analyse.
      - description : Une phrase expliquant l'intérêt de cette analyse pour la thèse.
      - searchPrompt : Une instruction très précise que l'étudiant pourra renvoyer à l'IA pour réaliser cette analyse (ex: "Réalise un test de Chi-2 pour croiser la variable X et la variable Y...").

      CONTEXTE DES DONNÉES (Échantillon format Tableau Texte) :
      ${contextText}
    `;

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: "Quelles sont les meilleures analyses statistiques à faire sur ces données pour une thèse de médecine ?",
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: suggestionsResponseSchema,
        temperature: 0.5,
      },
    });

    const responseText = response.text;
    if (!responseText) throw new Error("Réponse vide de l'IA");
    
    return JSON.parse(responseText);

  } catch (error) {
    console.error("Erreur Gemini Suggestions:", error);
    throw error;
  }
};

/**
 * Effectue une analyse complète des données.
 * Supporte le mode "Refinement" si un previousReport est fourni.
 */
export const getAnalysis = async (forms: Form[], responses: FormResponse[], userPrompt: string, previousReport: any = null): Promise<any> => {
  if (!apiKey || apiKey === "MISSING_KEY") {
      return {
          analysisText: "<p class='text-red-500 font-bold'>⚠️ La clé API Gemini n'est pas configurée sur Vercel. Veuillez ajouter la variable API_KEY dans les settings.</p>",
          chartData: null,
          requiresConfirmation: false
      };
  }
  
  try {
    // Préparation des données complètes au format optimisé (CSV-like)
    // On récupère le nombre exact de lignes pour l'injecter dans le prompt
    const { contextText: fullContext, totalRows } = prepareDataContext(forms, responses);
    
    // CALCUL STATISTIQUE EXACT (Vérité Terrain)
    const statisticalSummary = generateStatisticalSummary(forms, responses);
    
    let baseInstruction = `
      Tu es MedataAI, un expert de classe mondiale en biostatistiques médicales, épidémiologie et méthodologie de recherche clinique.
      Ton rôle est d'assister des étudiants en médecine dans l'analyse de leurs thèses.

      DONNÉES FOURNIES :
      - Tu as reçu exactement **${totalRows}** entrées (lignes de réponses patients).
      
      *** DIRECTIVE PRINCIPALE : RIGUEUR SCIENTIFIQUE + CRÉATIVITÉ D'INTERPRÉTATION ***
      Tu dois diviser ton "cerveau" en deux modes :
      
      1. **MODE COMPTABLE (Rigueur Absolue)** :
         - Pour citer des chiffres (fréquences, moyennes, nombres d'hommes/femmes), **UTILISE EXCLUSIVEMENT le "RÉSUMÉ STATISTIQUE PRÉ-CALCULÉ" fourni ci-dessous**.
         - Ce résumé est la vérité absolue mathématique. Ne le contredis jamais.
         - Si tu dois citer un chiffre, copie-le du résumé. Ne recompte pas les lignes brutes.

      2. **MODE CHERCHEUR (Créativité & Perspicacité)** :
         - Pour *interpréter* ces chiffres, expliquer les causes, les conséquences cliniques ou suggérer des pistes de discussion, sois **CRÉATIF, NUANCÉ et PROFOND**.
         - Ne te contente pas de dire "Il y a 15 hommes". Dis plutôt "On observe une prédominance féminine marquée, ce qui est cohérent avec la littérature sur cette pathologie..."
         - Fais des liens inattendus mais plausibles médicalement.

      CAPACITÉS D'EXPERT ATTENDUES :
      1. **Qualification des variables** : Identifie automatiquement si les variables sont qualitatives ou quantitatives.
      2. **Choix des tests** : Suggère ou simule les tests appropriés (Chi-2, Fisher, Student, ANOVA, Pearson, etc.) en te basant sur les chiffres du résumé.
      3. **Interprétation clinique** : Explique ce que les chiffres signifient médicalement.
      
      IMPORTANT - FORMAT DE SORTIE HTML :
      - Tu dois générer le contenu de 'analysisText' en **HTML** pur.
      - **N'UTILISE JAMAIS DE MARKDOWN**.
      - Utilise des balises sémantiques : <h3>, <p>, <ul class="list-disc pl-5 space-y-1">, <li>.
      - Utilise des classes Tailwind CSS si nécessaire pour la mise en page.
      
      RÈGLES DE SORTIE :
      - Génère TOUJOURS un graphique pertinent ('chartData') si des comparaisons sont possibles.
      - Le format de sortie doit être un JSON conforme au schéma.
    `;

    // Contexte combiné : Stats calculées + Données brutes
    const contextWithStats = `
    === RÉSUMÉ STATISTIQUE PRÉ-CALCULÉ (SOURCE DE VÉRITÉ ABSOLUE) ===
    ${statisticalSummary}
    =================================================================

    === DONNÉES BRUTES (Pour analyses croisées complexes uniquement) ===
    ${fullContext}
    `;

    let userContent = "";

    if (previousReport) {
        // MODE MODIFICATION / RAFFINEMENT
        baseInstruction += `
        
        CONTEXTE DE MODIFICATION :
        L'utilisateur souhaite modifier ou approfondir un rapport existant.
        Tu recevras le "Rapport Actuel" et la "Nouvelle Instruction".
        Tu dois régénérer le JSON complet du rapport (analysisText et chartData).
        
        IMPORTANT - MISE EN ÉVIDENCE VISUELLE :
        1. Entoure EXCLUSIVEMENT les phrases ajoutées ou modifiées avec : <span style="color: #6366f1; font-weight: bold;">...</span>
        `;

        userContent = `
        ${contextWithStats}

        RAPPORT ACTUEL (JSON) :
        ${JSON.stringify(previousReport)}

        NOUVELLE INSTRUCTION UTILISATEUR :
        "${userPrompt}"
        `;
    } else {
        // MODE CRÉATION
        baseInstruction += `
        
        TA MISSION :
        Analyser les données fournies et répondre à la demande de l'utilisateur avec rigueur sur les chiffres et créativité sur l'analyse.
        
        STRUCTURE DE LA RÉPONSE (HTML dans 'analysisText') :
        - <h3>Résumé Méthodologique</h3> (Indiquer n = ${totalRows})
        - <h3>Résultats Clés</h3> (Utilise les stats pré-calculées obligatoirement)
        - <h3>Analyse & Discussion</h3> (Sois créatif et perspicace ici)
        - <h3>Recommandations</h3>
        `;

        userContent = `
        ${contextWithStats}

        DEMANDE UTILISATEUR :
        "${userPrompt}"
        `;
    }

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: userContent,
      config: {
        systemInstruction: baseInstruction,
        responseMimeType: "application/json",
        responseSchema: analysisResponseSchema,
        temperature: 0.2,
      },
    });

    const responseText = response.text;
    if (!responseText) throw new Error("Réponse vide de l'IA");
    
    return JSON.parse(responseText);

  } catch (error: any) {
    console.error("Erreur Gemini Analysis:", error);
    let errorMsg = "<p class='text-red-600'>⚠️ Une erreur technique est survenue lors de l'analyse IA.</p>";
    const errorString = String(error);
    if (errorString.includes("leaked") || errorString.includes("API key not valid")) {
        errorMsg = "<p class='text-red-600 font-bold'>⚠️ Clé API bloquée par Google (fuite détectée ou invalide). Veuillez générer une nouvelle clé sur Google AI Studio et mettre à jour Vercel.</p>";
    } else if (errorString.includes("429")) {
        errorMsg = "<p class='text-yellow-600'>⚠️ Trop de requêtes (Quota dépassé). Veuillez réessayer dans une minute.</p>";
    }
    return {
      analysisText: errorMsg,
      chartData: null,
      requiresConfirmation: false
    };
  }
};

export const performSampledAnalysis = async (forms: Form[], responses: FormResponse[], userPrompt: string, relevantFieldIds: string[]): Promise<any> => {
  return getAnalysis(forms, responses, userPrompt);
};

/**
 * Chatbot interactif avec streaming (Reste inchangé pour le chatbot général)
 */
export const getChatbotResponseStream = async (userRole: User['role'], history: ChatMessage[], settings: SystemSettings) => {
  if (!apiKey || apiKey === "MISSING_KEY") {
      return (async function* () {
        yield { text: "⚠️ Clé API manquante. Veuillez configurer API_KEY sur Vercel." };
      })();
  }

  try {
    const systemInstruction = `
      Tu es l'assistant virtuel intelligent de la plateforme MedataAI.
      Ton rôle est d'aider les étudiants en médecine et les administrateurs à utiliser la plateforme.

      INFORMATIONS TARIFAIRES ACTUELLES (EN COINS) :
      - Création de formulaire : Gratuit
      - Validation de formulaire (pour collecter des réponses) : ${settings.coinCosts.validateForm} coins
      - Ajout de réponse à un formulaire : ${settings.coinCosts.addResponse} coins
      - Analyse IA avancée (déblocage par formulaire) : ${settings.coinCosts.aiAnalysis} coins
      - Frais mensuels d'utilisation : ${settings.platformFees.monthly} coins/mois
      - Bonus de bienvenue (nouveaux inscrits) : ${settings.welcomeBonus} coins
      
      INFORMATIONS BIBLIOTHÈQUE :
      - Prix de vente standard d'un formulaire : ${settings.libraryPrices.defaultFormPrice} coins
      - Prix de vente standard par réponse : ${settings.libraryPrices.defaultPricePerResponse} coins
      
      ACTIONS DE NAVIGATION DISPONIBLES :
      Si l'utilisateur veut aller quelque part, ajoute ce tag à la fin de ta réponse :
      - Pour créer/gérer des formulaires : [ACTION:navigate_formulaires]
      - Pour voir la bibliothèque publique : [ACTION:navigate_bibliotheque]
      - Pour lancer une analyse IA : [ACTION:navigate_analyse]
      - Pour voir son solde/portefeuille : [ACTION:navigate_portefeuille]
      
      Rôle de l'utilisateur actuel : ${userRole}
      
      RÈGLES DE COMPORTEMENT :
      1. Sois poli, concis et serviable.
      2. Si on te demande un prix, utilise UNIQUEMENT les valeurs fournies ci-dessus.
      3. Ne pas inventer de fonctionnalités qui n'existent pas.
    `;

    const chat = ai.chats.create({
      model: CHAT_MODEL,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
      history: history.slice(0, -1),
    });

    const lastMessage = history[history.length - 1].parts[0].text;
    
    const resultStream = await chat.sendMessageStream({
      message: lastMessage,
    });

    return (async function* () {
      for await (const chunk of resultStream) {
        yield { text: chunk.text };
      }
    })();

  } catch (error: any) {
    console.error("Erreur Gemini Chatbot:", error);
    let errorMsg = "Désolé, je rencontre des difficultés techniques.";
    const errorString = String(error);
    
    if (errorString.includes("leaked")) {
        errorMsg = "⚠️ ALERTE : Votre clé API a été désactivée par Google car elle a fuité sur internet. Veuillez en générer une nouvelle immédiatement.";
    } else if (errorString.includes("API key not valid")) {
        errorMsg = "⚠️ Clé API invalide. Vérifiez la configuration Vercel.";
    } else if (errorString.includes("403")) {
        errorMsg = "⚠️ Accès refusé (403). Vérifiez votre clé API.";
    }

    return (async function* () {
      yield { text: errorMsg };
    })();
  }
};
