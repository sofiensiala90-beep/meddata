
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ChatMessage, Form, FormResponse, User, SystemSettings } from '../types';

// Initialisation stricte conforme aux guidelines
// process.env.API_KEY est injecté par Vite/Vercel
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Utilisation de gemini-3-flash-preview pour toutes les tâches afin d'assurer 
// une disponibilité maximale et une latence réduite en production.
const ANALYSIS_MODEL = 'gemini-3-flash-preview';
const CHAT_MODEL = 'gemini-3-flash-preview';

// Schéma JSON strict pour l'analyse
const analysisResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    analysisText: {
      type: Type.STRING,
      description: "Rapport d'analyse experte formaté en HTML STRICT (pas de Markdown). Utiliser <h3>, <p>, <ul>, <li>, <strong>.",
    },
    chatResponse: {
      type: Type.STRING,
      description: "Résumé conversationnel court + 2 ou 3 pistes concrètes d'analyses supplémentaires.",
    },
    charts: {
      type: Type.ARRAY,
      description: "Objets structurés pour les graphiques.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["bar", "pie", "doughnut"] },
          data: {
            type: Type.OBJECT,
            properties: {
              labels: { type: Type.ARRAY, items: { type: Type.STRING } },
              datasets: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    data: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                    backgroundColor: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true }
                  },
                  required: ["label", "data"],
                },
              },
            },
            required: ["labels", "datasets"],
          },
        },
        required: ["title", "type", "data"]
      },
      nullable: true
    }
  },
  required: ["analysisText", "chatResponse"],
};

/**
 * Prépare le contexte au format PSV (Pipe-Separated Values)
 * Ajout d'une limite de sécurité pour éviter les prompts trop volumineux (Timeout Vercel)
 */
const prepareDataContext = (forms: Form[], responses: FormResponse[]): string => {
  let output = "";
  forms.forEach(form => {
    output += `### FORMULAIRE: ${form.title}\n`;
    const headers = form.schema.map(f => f.label.replace(/\|/g, '/').trim());
    const fieldIds = form.schema.map(f => f.id);
    
    output += headers.join(" | ") + "\n";
    output += headers.map(() => "---").join("|") + "\n";

    const formResponses = responses.filter(r => r.formId === form.id);
    // On limite aux 150 dernières réponses pour garantir la rapidité de l'analyse en mode Preview
    formResponses.slice(-150).forEach(r => {
      const rowValues = fieldIds.map(fid => {
        const val = r.data[fid];
        const strVal = Array.isArray(val) ? val.join("; ") : (val != null ? String(val) : "");
        return strVal.replace(/\|/g, "/").replace(/[\r\n]+/g, " ").trim();
      });
      output += rowValues.join(" | ") + "\n";
    });
    output += "\n";
  });
  return output.slice(0, 30000); // Sécurité anti-saturation
};

/**
 * Résumé Statistique Pré-calculé (Source de Vérité)
 */
const generateStatisticalSummary = (forms: Form[], responses: FormResponse[]): string => {
  let summary = "";
  forms.forEach(form => {
    const formResponses = responses.filter(r => r.formId === form.id);
    const n = formResponses.length;
    if (n === 0) return;

    summary += `RÉSUMÉ STATISTIQUE VÉRIFIÉ POUR "${form.title}" (n=${n}) :\n`;
    form.schema.forEach(field => {
      if (['note', 'text', 'textarea'].includes(field.type)) return;

      const values = formResponses
        .map(r => r.data[field.id])
        .filter(v => v !== undefined && v !== null && v !== '');
      
      const count = values.length;
      if (count === 0) return;

      if (['number', 'range'].includes(field.type)) {
        const nums = values.map(v => Number(v)).filter(v => !isNaN(v));
        if (nums.length > 0) {
          const avg = (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
          summary += `- ${field.label} : Moyenne=${avg}, Min=${Math.min(...nums)}, Max=${Math.max(...nums)}\n`;
        }
      } else if (['choice', 'checkbox'].includes(field.type)) {
        const freq: Record<string, number> = {};
        values.forEach(v => {
          const items = Array.isArray(v) ? v : [v];
          items.forEach(it => { freq[it] = (freq[it] || 0) + 1; });
        });
        const details = Object.entries(freq)
          .sort(([, a], [, b]) => b - a)
          .map(([k, v]) => `${k}=${v} (${((v / count) * 100).toFixed(2)}%)`)
          .join(', ');
        summary += `- ${field.label} : ${details}\n`;
      }
    });
    summary += "\n";
  });
  return summary;
};

export const getAnalysis = async (forms: Form[], responses: FormResponse[], userPrompt: string, previousReport: any = null): Promise<any> => {
  try {
    const stats = generateStatisticalSummary(forms, responses);
    const psvData = prepareDataContext(forms, responses);
    
    let baseInstruction = `
      Tu es DASS, expert mondial en biostatistiques médicales. 
      Ton rôle est d'analyser les données de recherche pour des thèses de médecine.

      TA MISSION : Diviser ton raisonnement en deux modes :

      1. MODE COMPTABLE (Rigueur Absolue) :
         - Pour tous les chiffres descriptifs (%, moyennes, effectifs), UTILISE EXCLUSIVEMENT le "RÉSUMÉ STATISTIQUE PRÉ-CALCULÉ".
         - INTERDICTION de recalculer ou d'arrondir. Si le résumé dit "17.24%", tu écris "17.24%".

      2. MODE CHERCHEUR (Créativité & Perspicacité) :
         - Interprète cliniquement ces chiffres. Pourquoi sont-ils importants ?
         - Utilise les données brutes (PSV) pour identifier des corrélations complexes.

      CONTRAINTES DE SORTIE :
      - Format : JSON Strict.
      - Contenu 'analysisText' : HTML Pur uniquement. **Markdown INTERDIT**.
      - 'chatResponse' : Un résumé d'une phrase + 2 propositions d'analyses de corrélation spécifiques.
    `;

    if (previousReport) {
      baseInstruction += `
        MODE RAFFINEMENT : 
        L'étudiant souhaite approfondir le rapport précédent.
        IMPORTANT : Entoure EXCLUSIVEMENT les phrases ajoutées ou modifiées avec : <span style="color: #14b8a6; font-weight: bold;">...</span>
      `;
    }

    const userContent = `
      === RÉSUMÉ STATISTIQUE PRÉ-CALCULÉ ===
      ${stats}

      === DONNÉES BRUTES ===
      ${psvData}

      ${previousReport ? `RAPPORT ACTUEL : ${JSON.stringify(previousReport)}` : ""}
      DEMANDE DE L'ÉTUDIANT : "${userPrompt}"
    `;

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: userContent,
      config: {
        systemInstruction: baseInstruction,
        responseMimeType: "application/json",
        responseSchema: analysisResponseSchema,
        temperature: 0.1,
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error; // On laisse le composant UI gérer l'affichage de l'erreur
  }
};

export const getAnalysisSuggestions = async (forms: Form[], responses: FormResponse[]): Promise<any[]> => {
  try {
    const psv = prepareDataContext(forms, responses).slice(0, 5000);
    const instruction = "Tu es un expert biostatisticien. Analyse ces données PSV et suggère 4 analyses pertinentes pour une thèse (Titre, Raison, Prompt technique).";
    
    const response = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: psv,
      config: {
        systemInstruction: instruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              searchPrompt: { type: Type.STRING }
            },
            required: ["title", "description", "searchPrompt"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Suggestions Error:", error);
    return [];
  }
};

export const generateNotificationRefinement = async (draftText: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: CHAT_MODEL,
            contents: `Professionnalise ce message pour un étudiant en médecine : "${draftText}"`,
            config: { systemInstruction: "Tu es un secrétaire de faculté de médecine. Rends le texte courtois et clair." }
        });
        return response.text?.trim() || draftText;
    } catch {
        return draftText;
    }
};

export const getChatbotResponseStream = async (userRole: string, history: ChatMessage[], settings: SystemSettings) => {
  const instruction = `Tu es DASS, assistant de JS GATE. Aide les utilisateurs sur la plateforme. Tarifs : Validation=${settings.coinCosts.validateForm}, Réponse=${settings.coinCosts.addResponse}, IA=${settings.coinCosts.aiAnalysis}. Tags : [ACTION:navigate_formulaires], [ACTION:navigate_bibliotheque], [ACTION:navigate_analyse], [ACTION:navigate_portefeuille].`;

  const chat = ai.chats.create({
    model: CHAT_MODEL,
    config: { systemInstruction: instruction, temperature: 0.7 },
    history: history.slice(0, -1),
  });

  const lastMessage = history[history.length - 1].parts[0].text;
  const resultStream = await chat.sendMessageStream({ message: lastMessage });

  return (async function* () {
    for await (const chunk of resultStream) {
      yield { text: chunk.text };
    }
  })();
};
