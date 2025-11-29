
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ChatMessage, Form, FormResponse, User } from '../types';

// La clé API sera injectée par Vite
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

// Schéma JSON strict pour l'analyse
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

/**
 * Prépare le contexte des données pour l'analyse
 */
const prepareDataContext = (forms: Form[], responses: FormResponse[]) => {
  const formsSummary = forms.map(f => ({
    id: f.id,
    title: f.title,
    description: f.description,
    schema: f.schema.map(q => ({ id: q.id, label: q.label, type: q.type, options: q.options }))
  }));

  const responsesSummary = responses.map(r => ({
    formId: r.formId,
    answers: r.data
  }));

  return JSON.stringify({ forms: formsSummary, responses: responsesSummary });
};

/**
 * Effectue une analyse complète des données
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
      5. Confidentialité : Ne mentionne jamais d'ID utilisateur ou de données brutes sensibles.

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
        temperature: 0.3,
      },
    });

    const responseText = response.text;
    if (!responseText) throw new Error("Réponse vide de l'IA");
    
    return JSON.parse(responseText);

  } catch (error) {
    console.error("Erreur Gemini Analysis:", error);
    return {
      analysisText: "⚠️ Une erreur technique est survenue lors de l'analyse IA. Veuillez réessayer plus tard.",
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
export const getChatbotResponseStream = async (userRole: User['role'], history: ChatMessage[]) => {
  if (!apiKey || apiKey === "MISSING_KEY") {
      return (async function* () {
        yield { text: "⚠️ Clé API manquante. Veuillez configurer API_KEY sur Vercel." };
      })();
  }

  try {
    const systemInstruction = `
      Tu es l'assistant virtuel intelligent de la plateforme MedataAI.
      Ton rôle est d'aider les étudiants en médecine et les administrateurs.

      ACTIONS DE NAVIGATION :
      - [ACTION:navigate_formulaires]
      - [ACTION:navigate_bibliotheque]
      - [ACTION:navigate_analyse]
      - [ACTION:navigate_portefeuille]
      
      Rôle de l'utilisateur actuel : ${userRole}
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

  } catch (error) {
    console.error("Erreur Gemini Chatbot:", error);
    return (async function* () {
      yield { text: "Désolé, je rencontre des difficultés techniques." };
    })();
  }
};
