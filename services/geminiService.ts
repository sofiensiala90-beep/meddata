
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ChatMessage, Form, FormResponse, User } from '../types';

// Récupération sécurisée de la clé API
// Grâce à vite.config.ts, process.env.API_KEY sera remplacé par la chaîne de caractères réelle.
// On ajoute une vérification typeof pour éviter le crash "process is not defined" dans certains environnements.
const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) ? process.env.API_KEY : "";

// Initialisation du client Gemini avec une gestion d'erreur pour éviter l'écran blanc
let ai: GoogleGenAI;
try {
    // Si la clé est vide, cela ne plantera pas ici, mais les appels échoueront gracieusement plus tard
    ai = new GoogleGenAI({ apiKey: apiKey || "MISSING_KEY" });
} catch (error) {
    console.error("Erreur critique lors de l'initialisation de GoogleGenAI:", error);
    // Instance de secours pour ne pas casser l'import du module
    ai = new GoogleGenAI({ apiKey: "" }); 
}

// Modèles utilisés - On utilise la série Flash pour la rapidité et le coût
const ANALYSIS_MODEL = 'gemini-2.5-flash';
const CHAT_MODEL = 'gemini-2.5-flash';

// Schéma JSON strict pour l'analyse
// Cela garantit que l'IA renvoie toujours des données compatibles avec le composant ChartRenderer.tsx
const analysisResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    analysisText: {
      type: Type.STRING,
      description: "Une analyse textuelle détaillée, formatée en Markdown. Doit inclure des observations clés, des tendances et des conclusions basées sur les données fournies.",
    },
    chartData: {
      type: Type.OBJECT,
      nullable: true,
      description: "Données structurées pour générer un graphique (Chart.js) si une visualisation est pertinente.",
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
      description: "Mettre à true uniquement si les données sont trop volumineuses et nécessitent une analyse par lot (logique avancée). Pour l'instant, false.",
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

/**
 * Prépare le contexte des données pour l'analyse en nettoyant les objets complexes
 */
const prepareDataContext = (forms: Form[], responses: FormResponse[]) => {
  // Simplification des formulaires pour réduire la taille du prompt (économie de tokens)
  const formsSummary = forms.map(f => ({
    id: f.id,
    title: f.title,
    description: f.description,
    schema: f.schema.map(q => ({ id: q.id, label: q.label, type: q.type, options: q.options }))
  }));

  // Simplification des réponses
  const responsesSummary = responses.map(r => ({
    formId: r.formId,
    answers: r.data
  }));

  return JSON.stringify({ forms: formsSummary, responses: responsesSummary });
};

/**
 * Effectue une analyse complète des données fournies via Gemini.
 */
export const getAnalysis = async (forms: Form[], responses: FormResponse[], userPrompt: string): Promise<any> => {
  if (!apiKey) {
      return {
          analysisText: "⚠️ La clé API Gemini n'est pas configurée sur Vercel. Veuillez ajouter la variable d'environnement `API_KEY`.",
          chartData: null,
          requiresConfirmation: false
      };
  }
  
  try {
    const dataContext = prepareDataContext(forms, responses);
    
    const systemInstruction = `
      Tu es MedataAI, un expert en biostatistiques et en analyse de données médicales.
      
      TA MISSION :
      Analyser les réponses aux formulaires médicaux fournies dans le contexte JSON et répondre à la demande de l'utilisateur.

      RÈGLES :
      1. Précision : Base tes conclusions UNIQUEMENT sur les données fournies.
      2. Format : Retourne un objet JSON respectant strictement le schéma fourni.
      3. Visualisation : Si la demande implique des comparaisons, des proportions ou des évolutions, tu DOIS générer l'objet 'chartData'.
      4. Texte : Le champ 'analysisText' doit être en Markdown propre. Utilise du gras pour les chiffres clés.
      5. Confidentialité : Ne mentionne jamais d'ID utilisateur ou de données brutes sensibles, parle de "répondants" ou "patients".

      CONTEXTE DES DONNÉES (JSON) :
      ${dataContext}
    `;

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: analysisResponseSchema,
        temperature: 0.3, // Température basse pour une analyse factuelle
      },
    });

    // Extraction et parsing de la réponse
    const responseText = response.text;
    if (!responseText) throw new Error("Réponse vide de l'IA");
    
    return JSON.parse(responseText);

  } catch (error) {
    console.error("Erreur Gemini Analysis:", error);
    // Retour d'une erreur gracieuse pour l'interface utilisateur
    return {
      analysisText: "⚠️ Une erreur est survenue lors de l'analyse IA. Vérifiez que votre clé API est valide et que vous avez des crédits suffisants.",
      chartData: null,
      requiresConfirmation: false
    };
  }
};

/**
 * Fonction pour l'analyse sur échantillon (Utilisée si requiresConfirmation était true)
 * Ici, on réutilise la logique principale pour simplifier, mais on pourrait ajuster le prompt.
 */
export const performSampledAnalysis = async (forms: Form[], responses: FormResponse[], userPrompt: string, relevantFieldIds: string[]): Promise<any> => {
  // Dans une version avancée, on filtrerait 'responses' pour ne garder que les champs 'relevantFieldIds'
  return getAnalysis(forms, responses, userPrompt);
};

/**
 * Chatbot interactif avec streaming.
 * Gère la conversation et les actions de navigation dans l'app.
 */
export const getChatbotResponseStream = async (userRole: User['role'], history: ChatMessage[]) => {
  if (!apiKey) {
      return (async function* () {
        yield { text: "⚠️ Clé API manquante. Veuillez configurer la variable API_KEY sur Vercel." };
      })();
  }

  try {
    const systemInstruction = `
      Tu es l'assistant virtuel intelligent de la plateforme MedataAI.
      Ton rôle est d'aider les étudiants en médecine et les administrateurs.

      TON STYLE :
      - Professionnel, empathique et concis.
      - Tu parles français.

      TES CAPACITÉS :
      - Expliquer comment créer des formulaires.
      - Aider à interpréter des statistiques.
      - Expliquer le système de "Coins" (monnaie virtuelle).

      ACTIONS DE NAVIGATION (IMPORTANT) :
      Si l'utilisateur demande explicitement à aller quelque part, tu dois ajouter un "tag d'action" à la fin de ta réponse.
      L'interface utilisateur détectera ce tag et effectuera la navigation.
      
      Liste des tags disponibles :
      - [ACTION:navigate_formulaires] : Pour voir/créer des formulaires.
      - [ACTION:navigate_bibliotheque] : Pour acheter des formulaires/données.
      - [ACTION:navigate_analyse] : Pour l'outil d'analyse IA.
      - [ACTION:navigate_portefeuille] : Pour voir le solde ou les transactions.

      Exemple : "Bien sûr, je vous emmène vers votre portefeuille. [ACTION:navigate_portefeuille]"
      
      Rôle de l'utilisateur actuel : ${userRole}
    `;

    // Création de la session de chat
    const chat = ai.chats.create({
      model: CHAT_MODEL,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7, // Plus créatif pour la conversation
      },
      // On convertit l'historique sauf le dernier message qui sera envoyé via sendMessageStream
      history: history.slice(0, -1),
    });

    const lastMessage = history[history.length - 1].parts[0].text;
    
    // Appel en streaming
    const resultStream = await chat.sendMessageStream({
      message: lastMessage,
    });

    // Retourne le flux asynchrone pour que le composant React puisse l'itérer
    return (async function* () {
      for await (const chunk of resultStream) {
        yield { text: chunk.text };
      }
    })();

  } catch (error) {
    console.error("Erreur Gemini Chatbot:", error);
    // Flux de secours en cas d'erreur
    return (async function* () {
      yield { text: "Je suis désolé, je rencontre des difficultés techniques pour accéder à mes fonctions cognitives. Veuillez vérifier votre clé API." };
    })();
  }
};
