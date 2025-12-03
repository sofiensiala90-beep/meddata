
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ChatMessage, Form, FormResponse, User, SystemSettings, FormField } from '../types';

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

// Schéma pour la sélection des champs pertinents (Étape 1)
const fieldSelectionResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    relevantFieldIds: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Liste des IDs de questions strictement nécessaires pour répondre à la demande de l'utilisateur.",
    },
    reasoning: {
      type: Type.STRING,
      description: "Brève explication du choix des champs."
    }
  },
  required: ["relevantFieldIds"],
};

// Schéma JSON strict pour l'analyse (Étape 2)
const analysisResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    analysisText: {
      type: Type.STRING,
      description: "Une analyse experte en biostatistiques et épidémiologie, formatée en Markdown. Doit inclure : Méthodologie, Résultats Descriptifs, Analyse Inférentielle (si applicable), et Recommandations.",
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
 * Prépare uniquement la structure du formulaire (Schema) sans les réponses.
 * Utilisé pour l'étape 1 : Sélection des colonnes.
 */
const prepareSchemaContext = (forms: Form[]) => {
  return JSON.stringify(forms.map(f => ({
    id: f.id,
    title: f.title,
    description: f.description,
    questions: f.schema.map(q => ({
      id: q.id,
      label: q.label,
      type: q.type,
      options: q.options
    }))
  })));
};

/**
 * ÉTAPE 2 (Optimisée) : Compression CSV avec Système de Codage (Codebook)
 * Transforme les données en un format ultra-compact pour l'IA.
 */
const prepareCompressedContext = (forms: Form[], responses: FormResponse[], relevantFieldIds?: string[]) => {
  // 1. Aplatir et filtrer le schéma pour obtenir toutes les questions pertinentes
  let allQuestions: FormField[] = [];
  forms.forEach(f => {
     const fields = f.schema.filter(q => !relevantFieldIds || relevantFieldIds.includes(q.id));
     allQuestions = [...allQuestions, ...fields];
  });

  // 2. Construire la LÉGENDE (Codebook)
  // Mapping: FieldID -> { Code (Q1), Type, OptionsMap (Option Texte -> "1") }
  let legendText = "LÉGENDE DES DONNÉES (CODAGE) :\n";
  const fieldMap = new Map<string, { code: string, type: string, optionsMap?: Map<string, string> }>();

  allQuestions.forEach((q, index) => {
    const code = `Q${index + 1}`;
    let mappingInfo = "";
    let optionsMap: Map<string, string> | undefined;

    if ((q.type === 'choice' || q.type === 'checkbox') && q.options) {
       optionsMap = new Map();
       const optionsLegend: string[] = [];
       q.options.forEach((opt, i) => {
          const optCode = `${i + 1}`; // Code numérique simple pour les options : 1, 2, 3...
          optionsMap!.set(opt, optCode);
          optionsLegend.push(`${optCode}="${opt}"`);
       });
       mappingInfo = ` [Codes Options: ${optionsLegend.join(', ')}]`;
    }

    fieldMap.set(q.id, { code, type: q.type, optionsMap });
    // Format ligne légende : Q1: "Age du patient" (number)
    legendText += `- ${code}: "${q.label}" (${q.type})${mappingInfo}\n`;
  });

  // 3. Construire le CSV
  // Header: Q1,Q2,Q3...
  const header = Array.from(fieldMap.values()).map(f => f.code).join(',');
  
  // Rows
  const rows = responses.map(r => {
     return allQuestions.map(q => {
        const fieldInfo = fieldMap.get(q.id);
        let val = r.data[q.id];

        // Gérer les valeurs vides
        if (val === undefined || val === null || val === '') return "";

        if (fieldInfo?.optionsMap) {
           // Cas Choix / Checkbox : Remplacer le texte par le code
           if (Array.isArray(val)) {
              // Checkbox: on joint les codes par un pipe '|' (ex: 1|3 pour Option 1 et Option 3)
              return val.map(v => fieldInfo.optionsMap?.get(v) || v).join('|');
           } else {
              // Choice: code simple
              return fieldInfo.optionsMap.get(val) || val;
           }
        } else {
           // Cas Texte / Nombre : On garde la valeur brute mais on nettoie pour le CSV
           // On enlève les retours à la ligne et les virgules pour ne pas casser le CSV
           const strVal = String(val).replace(/[\n\r]/g, ' ').replace(/,/g, ';'); 
           return strVal;
        }
     }).join(',');
  });

  return `${legendText}\nDONNÉES (Format CSV Compressé):\n${header}\n${rows.join('\n')}`;
};

/**
 * ÉTAPE 1 : Identifie les champs nécessaires pour répondre à la question
 */
const identifyRelevantFields = async (forms: Form[], userPrompt: string): Promise<string[]> => {
    try {
        const schemaContext = prepareSchemaContext(forms);
        const systemInstruction = `
            Tu es un expert en optimisation de données.
            L'utilisateur veut analyser un jeu de données médicales mais le volume est trop grand.
            
            TA MISSION :
            Analyser la demande de l'utilisateur et la structure du formulaire pour identifier UNIQUEMENT les IDs des questions ('relevantFieldIds') strictement nécessaires pour répondre.
            
            RÈGLES :
            1. Si l'utilisateur demande une "analyse globale" ou "générale", sélectionne les champs démographiques clés (âge, sexe) et les variables principales (diagnostics, résultats). Ne sélectionne pas tout.
            2. Si l'utilisateur pose une question précise (ex: "Lien entre Tabac et Cancer"), ne sélectionne QUE les champs liés au Tabac et au Cancer.
            3. Sois minimaliste pour économiser les tokens.
            
            STRUCTURE DU FORMULAIRE :
            ${schemaContext}
        `;

        const response = await ai.models.generateContent({
            model: ANALYSIS_MODEL,
            contents: `Demande utilisateur : "${userPrompt}"`,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: fieldSelectionResponseSchema,
                temperature: 0.1, // Très déterministe
            },
        });

        const result = JSON.parse(response.text || "{}");
        return result.relevantFieldIds || [];
    } catch (error) {
        console.warn("Échec de la sélection intelligente des champs, utilisation de tous les champs.", error);
        return []; // Retourne vide pour dire "tous les champs" en fallback
    }
};

/**
 * Génère des suggestions d'analyse basées sur la structure du formulaire
 */
export const getAnalysisSuggestions = async (forms: Form[], responses: FormResponse[]): Promise<Array<{title: string, description: string, searchPrompt: string}>> => {
  if (!apiKey || apiKey === "MISSING_KEY") {
      throw new Error("Clé API manquante");
  }

  try {
    // Utilisation du format compressé même pour l'échantillon
    const sampleResponses = responses.slice(0, 10);
    const dataContext = prepareCompressedContext(forms, sampleResponses);
    
    const systemInstruction = `
      Tu es un Professeur expert en Méthodologie de Recherche et Biostatistiques.
      Tu assistes un étudiant en médecine qui a collecté des données.

      TA MISSION :
      Analyser la structure du formulaire fournie (via la Légende et l'échantillon CSV) pour proposer 4 à 6 pistes d'analyses pertinentes.

      CRITÈRES DE SUGGESTION :
      1. **Pertinence Scientifique** : Propose des analyses qui ont du sens médicalement.
      2. **Faisabilité Statistique** : Vérifie si les variables (Q1, Q2...) permettent ces tests.
      3. **Diversité** : Propose un mélange d'analyses descriptives et analytiques.

      CONTEXTE DES DONNÉES (Format Codebook + CSV) :
      ${dataContext}
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
 * Effectue une analyse complète des données (Optimisée en 2 étapes + Compression CSV)
 */
export const getAnalysis = async (forms: Form[], responses: FormResponse[], userPrompt: string): Promise<any> => {
  if (!apiKey || apiKey === "MISSING_KEY") {
      return {
          analysisText: "⚠️ La clé API Gemini n'est pas configurée sur Vercel. Veuillez ajouter la variable API_KEY dans les settings.",
          chartData: null,
          requiresConfirmation: false
      };
  }
  
  try {
    // ÉTAPE 1 : Identification des colonnes pertinentes pour réduire la charge
    let relevantFieldIds: string[] = [];
    
    // On ne fait cette optimisation que si on a beaucoup de données (> 20 réponses)
    if (responses.length > 20) {
        relevantFieldIds = await identifyRelevantFields(forms, userPrompt);
        console.log(`Optimisation IA : ${relevantFieldIds.length} champs sélectionnés sur ${forms[0]?.schema.length || 0} pour l'analyse.`);
    }

    // ÉTAPE 2 : Filtrage et Compression CSV
    // Utilise le nouveau format Codebook + CSV
    const filteredContext = prepareCompressedContext(forms, responses, relevantFieldIds.length > 0 ? relevantFieldIds : undefined);
    
    const systemInstruction = `
      Tu es MedataAI, un expert de classe mondiale en biostatistiques médicales.
      
      IMPORTANT : FORMAT DES DONNÉES
      Les données te sont fournies sous un format compressé comprenant :
      1. Une LÉGENDE (Codebook) : Elle t'indique que 'Q1' correspond à telle question, et que le code '1' signifie 'Homme', etc.
      2. Un CSV : Contenant les données brutes encodées.
      
      TA MISSION :
      1. DÉCODER les données en utilisant la légende.
      2. ANALYSER les données décodées pour répondre à la demande de l'utilisateur.
      3. RAPPORTER tes résultats avec la rigueur d'un article scientifique.

      CAPACITÉS D'EXPERT ATTENDUES :
      - Identifie automatiquement les types de variables via la légende.
      - Effectue les calculs (fréquences, moyennes, croisements) sur les données CSV.
      - Suggère ou simule les tests statistiques appropriés (Chi-2, Student, etc.).
      - Interprète les résultats cliniquement.

      STRUCTURE DE LA RÉPONSE (Markdown) :
      - **Résumé Méthodologique** : (Ex: "Analyse ciblée portant sur N=${responses.length} patients...")
      - **Résultats Clés** : Chiffres marquants en gras.
      - **Analyse Détaillée** : Réponses spécifiques au prompt.
      - **Pistes de Réflexion** : Suggestions de tests statistiques à valider.

      RÈGLES STRICTES :
      - Utilise un langage médical précis.
      - Génère TOUJOURS un graphique pertinent ('chartData') si des comparaisons chiffrées sont possibles.

      CONTEXTE DES DONNÉES (Légende + CSV) :
      ${filteredContext}
    `;

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: analysisResponseSchema,
        temperature: 0.2, // Température basse pour une analyse rigoureuse des chiffres
      },
    });

    const responseText = response.text;
    if (!responseText) throw new Error("Réponse vide de l'IA");
    
    return JSON.parse(responseText);

  } catch (error: any) {
    console.error("Erreur Gemini Analysis:", error);
    let errorMsg = "⚠️ Une erreur technique est survenue lors de l'analyse IA.";
    const errorString = String(error);
    if (errorString.includes("leaked") || errorString.includes("API key not valid")) {
        errorMsg = "⚠️ Clé API bloquée par Google (fuite détectée ou invalide). Veuillez générer une nouvelle clé sur Google AI Studio et mettre à jour Vercel.";
    } else if (errorString.includes("429")) {
        errorMsg = "⚠️ Trop de requêtes (Quota dépassé). Veuillez réessayer dans une minute.";
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
 * Chatbot interactif avec streaming
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
