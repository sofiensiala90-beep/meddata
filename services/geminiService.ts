
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
 * Prépare le contexte des données pour l'analyse finale (Étape 2).
 * Ne contient que les champs filtrés.
 */
const prepareDataContext = (forms: Form[], responses: FormResponse[], relevantFieldIds?: string[]) => {
  // Résumé des formulaires (structure légère)
  const formsSummary = forms.map(f => ({
    id: f.id,
    title: f.title,
    schema: f.schema
        .filter(q => !relevantFieldIds || relevantFieldIds.includes(q.id))
        .map(q => ({ id: q.id, label: q.label, type: q.type, options: q.options }))
  }));

  // Résumé des réponses (Données filtrées)
  const responsesSummary = responses.map(r => {
    const filteredData: Record<string, any> = {};
    
    if (relevantFieldIds) {
      // Garder uniquement les champs demandés
      relevantFieldIds.forEach(fieldId => {
        if (r.data.hasOwnProperty(fieldId)) {
          filteredData[fieldId] = r.data[fieldId];
        }
      });
    } else {
      // Tout garder (comportement par défaut)
      Object.assign(filteredData, r.data);
    }

    return {
      // On retire l'ID utilisateur pour économiser des tokens et anonymiser
      formId: r.formId,
      answers: filteredData
    };
  });

  return JSON.stringify({ forms: formsSummary, responses: responsesSummary });
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
    // Pour les suggestions, on envoie un extrait des réponses (5 premières) pour que l'IA comprenne le contenu sans saturer
    const sampleResponses = responses.slice(0, 5);
    const dataContext = prepareDataContext(forms, sampleResponses);
    
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

      CONTEXTE DES DONNÉES (Échantillon) :
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
 * Effectue une analyse complète des données (Optimisée en 2 étapes)
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
    
    // On ne fait cette optimisation que si on a beaucoup de données (> 10 réponses)
    // Sinon on peut tout envoyer, c'est rapide.
    if (responses.length > 10) {
        relevantFieldIds = await identifyRelevantFields(forms, userPrompt);
        console.log(`Optimisation IA : ${relevantFieldIds.length} champs sélectionnés sur ${forms[0]?.schema.length || 0} pour l'analyse.`);
    }

    // ÉTAPE 2 : Filtrage et Analyse Finale
    // Si relevantFieldIds est vide (échec ou demande "tout"), prepareDataContext mettra tout (ou une limite safe).
    const filteredContext = prepareDataContext(forms, responses, relevantFieldIds.length > 0 ? relevantFieldIds : undefined);
    
    const systemInstruction = `
      Tu es MedataAI, un expert de classe mondiale en biostatistiques médicales, épidémiologie et méthodologie de recherche clinique.
      Ton rôle est d'assister des étudiants en médecine dans l'analyse de leurs thèses.

      TA MISSION :
      Analyser les données fournies au format JSON (qui ont été pré-filtrées pour être pertinentes à la demande) et répondre à la demande de l'utilisateur avec la rigueur d'un article scientifique.

      CAPACITÉS D'EXPERT ATTENDUES :
      1. **Qualification des variables** : Identifie automatiquement si les variables sont qualitatives (nominales/ordinales) ou quantitatives (discrètes/continues).
      2. **Choix des tests** : Suggère ou simule les tests appropriés :
         - Chi-2 ou Fisher pour comparer deux variables qualitatives.
         - T-Student ou ANOVA pour comparer des moyennes.
         - Corrélation de Pearson/Spearman pour les variables quantitatives.
         - Odds Ratio (OR) et Risque Relatif (RR) pour les facteurs de risque.
      3. **Interprétation clinique** : Ne donne pas juste des chiffres. Explique ce qu'ils signifient médicalement.
      4. **Propositions proactives** : Si la demande de l'utilisateur est vague (ex: "Analyse tout"), tu dois structurer une réponse complète basée sur les champs fournis.

      STRUCTURE DE LA RÉPONSE (Markdown) :
      - **Résumé Méthodologique** : (Ex: "Analyse ciblée portant sur N=${responses.length} patients...")
      - **Résultats Clés** : Chiffres marquants en gras.
      - **Analyse Détaillée** : Réponses spécifiques au prompt.
      - **Pistes de Réflexion** : Suggestions de tests statistiques à valider officiellement.

      RÈGLES STRICTES :
      - Utilise un langage médical précis mais pédagogique.
      - Génère TOUJOURS un graphique pertinent ('chartData') si des comparaisons chiffrées sont possibles.

      CONTEXTE DES DONNÉES (JSON) :
      ${filteredContext}
    `;

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: analysisResponseSchema,
        temperature: 0.4, // Température basse pour plus de rigueur analytique
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
