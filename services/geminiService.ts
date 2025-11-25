
import { GoogleGenAI, Type } from "@google/genai";
import { ChatMessage, Form, FormResponse, User } from '../types';

// Clé de secours (Celle spécifique pour l'IA Gemini, fournie par l'utilisateur)
// CORRECTION : Clé complète insérée.
const FALLBACK_KEY = "AIzaSyAWB3NXtWYRMIFQlnmYp9620c4Gtty_C-s";

// Fonction simplifiée pour récupérer la clé API de manière sécurisée
const getGeminiApiKey = () => {
    let key = '';
    
    // 1. Essai via import.meta.env (Vite)
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // Accès explicite pour le remplacement statique par Vite
            // @ts-ignore
            if (import.meta.env.VITE_API_KEY) key = import.meta.env.VITE_API_KEY;
            // @ts-ignore
            else if (import.meta.env.VITE_GEMINI_API_KEY) key = import.meta.env.VITE_GEMINI_API_KEY;
            // @ts-ignore
            else if (import.meta.env.API_KEY) key = import.meta.env.API_KEY; // Souvent masqué par Vite, mais on tente
        }
    } catch (e) {
        // Ignorer
    }
    
    // 2. Fallback via process.env (Pour certains environnements Node)
    if (!key && typeof process !== 'undefined' && process.env) {
        // @ts-ignore
        if (process.env.VITE_API_KEY) key = process.env.VITE_API_KEY;
        // @ts-ignore
        else if (process.env.API_KEY) key = process.env.API_KEY;
    }
    
    // 3. Clé de secours ultime (Hardcoded)
    if (!key) {
        console.log("Gemini: Aucune clé d'environnement trouvée. Utilisation de la clé de secours.");
        return FALLBACK_KEY;
    }
    
    return key;
};

const API_KEY = getGeminiApiKey();

/**
 * Cleans the AI's text response to extract a valid JSON string.
 * It handles markdown code fences (```json ... ``` or ``` ... ```) and trims whitespace.
 * @param text The raw text response from the AI.
 * @returns A parsed JavaScript object.
 * @throws An error if parsing fails.
 */
const cleanAndParseJson = (text: string): any => {
    let cleanedText = text.trim();
    // Handles ```json ... ```
    if (cleanedText.startsWith('```json') && cleanedText.endsWith('```')) {
        cleanedText = cleanedText.substring(7, cleanedText.length - 3).trim();
    } 
    // Handles ``` ... ```
    else if (cleanedText.startsWith('```') && cleanedText.endsWith('```')) {
        cleanedText = cleanedText.substring(3, cleanedText.length - 3).trim();
    }
    return JSON.parse(cleanedText);
};


/**
 * First step of the analysis: Ask a powerful model to identify which specific
 * data fields are required to answer the user's query.
 * @param schema - The structure of the form.
 * @param userPrompt - The user's question in natural language.
 * @returns A promise that resolves to an array of field IDs.
 */
const getRelevantFieldIds = async (schema: Form['schema'], userPrompt: string): Promise<string[]> => {
    if (!API_KEY) {
        console.error("API Key manquante pour Gemini.");
        throw new Error("Clé API manquante. Veuillez configurer VITE_API_KEY sur Vercel.");
    }
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const systemInstruction = `
        Tu es un pré-processeur de données intelligent. Ton unique tâche est de déterminer quels champs de données sont nécessaires pour répondre à une demande utilisateur, en te basant sur le schéma d'un formulaire.
        Tu dois répondre UNIQUEMENT avec un objet JSON contenant une seule clé "fieldIds", qui est un tableau de chaînes de caractères. Chaque chaîne doit être l'ID d'un champ requis.
        Par exemple : { "fieldIds": ["field_age", "field_symptoms"] }.
        N'ajoute aucun texte, aucune explication, aucune salutation. Ta réponse doit être uniquement et directement l'objet JSON.
        Si la question est générale ("donne-moi un résumé", "analyse tout", "rapport pour ma thèse"), sélectionne tous les champs qui ne sont pas de type 'note'.
    `;

    const prompt = `
        Schéma du formulaire :
        \`\`\`json
        ${JSON.stringify(schema.map(({ id, label, type, options }) => ({ id, label, type, options: options || [] })), null, 2)}
        \`\`\`

        Demande de l'utilisateur : "${userPrompt}"

        Identifie les field IDs nécessaires.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Standard model
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: 'application/json',
            }
        });
        
        const jsonResponse = cleanAndParseJson(response.text as string);
        if (jsonResponse && Array.isArray(jsonResponse.fieldIds)) {
            return jsonResponse.fieldIds;
        }
        return [];
    } catch (error) {
        console.error("Failed to get relevant field IDs:", error);
        // Fallback: return all non-note field IDs if the first call fails
        return schema.filter(f => f.type !== 'note').map(f => f.id);
    }
};


/**
 * Performs the final analysis, adapting its system prompt based on whether it receives
 * raw data, a sample of raw data, or a pre-computed summary.
 * @param dataPayload - The data to analyze.
 * @param userPrompt - The original user question.
 * @param schema - The form schema, for context.
 * @param sampleInfo - Optional information about the sample size if applicable.
 * @returns A promise that resolves to the final analysis object.
 */
const generateFinalReport = async (
    dataPayload: Record<string, any>[],
    userPrompt: string,
    schema: Form['schema'],
    sampleInfo?: { sampleSize: number; totalSize: number }
) => {
    if (!API_KEY) {
        throw new Error("Clé API manquante.");
    }
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    let dataContextInstruction = `
        Tu es un assistant d'analyse de données médicales expert.
        Analyse les données brutes fournies ci-dessous pour répondre à la demande de l'utilisateur. Ces données sont un extrait ciblé des réponses à un formulaire.
    `;

    if (sampleInfo) {
        dataContextInstruction = `
            Tu es un assistant d'analyse de données médicales expert.
            Analyse les données brutes fournies ci-dessous.
            NOTE TRÈS IMPORTANTE : Ces données sont un **échantillon aléatoire de ${sampleInfo.sampleSize} réponses** sur un total de ${sampleInfo.totalSize}. Tu dois mentionner ce fait dans ton analyse textuelle pour contextualiser tes conclusions (par ex. "Sur la base d'un échantillon de ${sampleInfo.sampleSize} réponses...").
        `;
    }

    const commonInstruction = `
        Ta réponse DOIT être un objet JSON valide avec la structure suivante :
        {
          "analysisText": "Ton analyse textuelle détaillée et perspicace en français, formatée en Markdown...",
          "chartData": {
            "type": "type_de_graphique", // 'bar', 'pie', ou 'doughnut'
            "data": {
              "labels": ["Label 1", "Label 2", ...],
              "datasets": [{
                "label": "Titre du jeu de données",
                "data": [valeur1, valeur2, ...],
                "backgroundColor": ["#RRGGBB", "#RRGGBB", ...]
              }]
            }
          } // Ou null si aucun graphique n'est pertinent
        }

        RÈGLES IMPORTANTES :
        1.  Base TOUTE ton analyse UNIQUEMENT sur les données fournies. N'invente pas de données.
        2.  Si un graphique est pertinent, fournis les données pour 'chartData'. Choisis le type de graphique le plus approprié.
        3.  Si aucun graphique n'est pertinent, mets la valeur de 'chartData' à null.
        4.  Assure-toi que la longueur des tableaux 'labels' et 'data' est exactement la même.
        5.  Ton 'analysisText' doit être bien structuré, en français, et facile à lire. Utilise le format Markdown (par ex. des listes à puces \`*\`) si cela améliore la clarté.
        6.  Si tu génères un graphique, le tableau 'backgroundColor' DOIT être fourni et avoir EXACTEMENT le même nombre d'éléments que le tableau 'data'. Utilise des couleurs hexadécimales vives et distinctes.
    `;

    const systemInstruction = dataContextInstruction + commonInstruction;
    
    const prompt = `
        Voici les données à analyser (${(dataPayload as any[]).length} réponses) :
        \`\`\`json
        ${JSON.stringify(dataPayload, null, 2)}
        \`\`\`

        Voici le schéma des questions correspondantes pour le contexte :
        \`\`\`json
        ${JSON.stringify(schema, null, 2)}
        \`\`\`

        Demande de l'utilisateur : "${userPrompt}"

        Génère l'objet JSON de réponse.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: 'application/json'
            }
        });

        return cleanAndParseJson(response.text as string);
    } catch (error) {
        console.error("Failed to perform final analysis:", error);
        throw new Error("L'IA n'a pas réussi à générer une analyse valide.");
    }
};

/**
 * An AI planner that decides the best analysis strategy based on the query's complexity and data size.
 */
const getAnalysisStrategy = async (userPrompt: string, relevantFieldCount: number, totalResponseCount: number): Promise<'ANALYZE_ALL' | 'ANALYZE_SAMPLE'> => {
    if (!API_KEY) return 'ANALYZE_ALL';
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // For smaller datasets, always analyze everything directly. This respects a previous user requirement.
    if (totalResponseCount <= 100) {
        return 'ANALYZE_ALL';
    }

    const systemInstruction = `
        You are a data analysis planner AI. Your task is to choose the best strategy to analyze a dataset based on a user's request.
        The goal is to provide a high-quality analysis while respecting technical limitations (large amounts of raw data can be slow or fail).

        You have two choices:
        1. "ANALYZE_ALL": Analyze the raw data from all responses. This is best for specific, targeted questions.
        2. "ANALYZE_SAMPLE": The user's request is broad, and the dataset is large. The best approach is to analyze a random sample of the raw data (e.g., 100 responses) to provide a detailed, qualitative analysis without performance issues.

        Based on the user's prompt and the data size, decide which strategy is more appropriate.
        - If the user asks for specific correlations, statistics on a few fields, or filters (e.g., "average age of patients with symptom X"), choose "ANALYZE_ALL".
        - If the user asks for a general summary, a full report, an open-ended analysis, or anything that requires looking at many fields at once (e.g., "give me a report for my thesis", "summarize the key findings", "analyze everything"), choose "ANALYZE_SAMPLE".

        You MUST respond with a single JSON object with one key, "strategy". Do not add any other text.
        Example: { "strategy": "ANALYZE_ALL" }
    `;

    const prompt = `
        User's request: "${userPrompt}"
        Number of relevant data fields: ${relevantFieldCount}
        Total number of responses: ${totalResponseCount}

        Choose the analysis strategy.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
            }
        });
        
        const jsonResponse = cleanAndParseJson(response.text as string);
        if (jsonResponse.strategy === 'ANALYZE_SAMPLE') {
            return 'ANALYZE_SAMPLE';
        }
        return 'ANALYZE_ALL';
    } catch (error) {
        console.error("Failed to get analysis strategy, using fallback:", error);
        // Fallback to simple logic if the AI planner fails.
        if (relevantFieldCount > 25 && totalResponseCount > 100) {
            return 'ANALYZE_SAMPLE';
        }
        return 'ANALYZE_ALL';
    }
};

/**
 * Main analysis function. It now uses an AI planner to decide the best strategy.
 */
export const getAnalysis = async (forms: Form[], responses: FormResponse[], userPrompt: string): Promise<any> => {
    try {
        if (!API_KEY) {
            return {
                analysisText: "Erreur de configuration : La clé API pour l'Intelligence Artificielle est manquante.",
                chartData: null
            };
        }

        const representativeSchema = forms[0].schema;
        const SAMPLE_SIZE = 100;

        const responsesToAnalyze = responses.filter(r => forms.map(f => f.id).includes(r.formId));
        if (responsesToAnalyze.length === 0) {
            return {
                analysisText: "Aucune réponse disponible pour le(s) formulaire(s) sélectionné(s). Il n'y a rien à analyser.",
                chartData: null
            };
        }

        const relevantFieldIds = await getRelevantFieldIds(representativeSchema, userPrompt);
        
        if (relevantFieldIds.length === 0) {
           return {
                analysisText: "L'IA n'a pas pu déterminer quels champs étaient nécessaires pour votre question. Essayez de reformuler votre demande de manière plus précise.",
                chartData: null
            };
        }
        
        // Let the AI planner decide the best strategy.
        const strategy = await getAnalysisStrategy(userPrompt, relevantFieldIds.length, responsesToAnalyze.length);

        if (strategy === 'ANALYZE_SAMPLE') {
            return {
                requiresConfirmation: true,
                message: `Votre demande est large et concerne ${responsesToAnalyze.length} réponses. Pour garantir une analyse de qualité, l'IA propose de l'effectuer sur un échantillon aléatoire de ${SAMPLE_SIZE} réponses. Voulez-vous continuer ?`,
                relevantFieldIds: relevantFieldIds,
            };
        }
        
        // If strategy is 'ANALYZE_ALL', proceed with a direct analysis of all relevant data.
        const leanData = responsesToAnalyze.map(response => {
            const extracted: Record<string, any> = {};
            for (const fieldId of relevantFieldIds) {
                if (response.data.hasOwnProperty(fieldId)) {
                    extracted[fieldId] = response.data[fieldId];
                }
            }
            return extracted;
        }).filter(obj => Object.keys(obj).length > 0);
        
        if (leanData.length === 0) {
             return {
                analysisText: "Aucune des réponses ne contient de données pour les champs pertinents à votre question.",
                chartData: null
            };
        }
        
        const relevantSchemaForContext = representativeSchema.filter(f => relevantFieldIds.includes(f.id));
        const result = await generateFinalReport(leanData, userPrompt, relevantSchemaForContext);
        
        return result;

    } catch (error) {
        console.error("Error during analysis process:", error);
        return {
            analysisText: `Une erreur est survenue durant l'analyse. L'IA a peut-être retourné une réponse inattendue. Veuillez réessayer.`,
            chartData: null
        };
    }
};

/**
 * Performs analysis on a random sample of responses after user confirmation.
 */
export const performSampledAnalysis = async (forms: Form[], responses: FormResponse[], userPrompt: string, relevantFieldIds: string[]): Promise<any> => {
    try {
        const SAMPLE_SIZE = 100;
        const responsesToAnalyze = responses.filter(r => forms.map(f => f.id).includes(r.formId));

        // Create a random sample
        const sampledResponses = [...responsesToAnalyze].sort(() => 0.5 - Math.random()).slice(0, SAMPLE_SIZE);

        const leanData = sampledResponses.map(response => {
            const extracted: Record<string, any> = {};
            for (const fieldId of relevantFieldIds) {
                if (response.data.hasOwnProperty(fieldId)) {
                    extracted[fieldId] = response.data[fieldId];
                }
            }
            return extracted;
        }).filter(obj => Object.keys(obj).length > 0);
        
        if (leanData.length === 0) {
             return {
                analysisText: "L'échantillon de réponses ne contenait pas de données pour les champs pertinents à votre question.",
                chartData: null
            };
        }

        const representativeSchema = forms[0].schema;
        const relevantSchemaForContext = representativeSchema.filter(f => relevantFieldIds.includes(f.id));
        const sampleInfo = { sampleSize: leanData.length, totalSize: responsesToAnalyze.length };

        const result = await generateFinalReport(leanData, userPrompt, relevantSchemaForContext, sampleInfo);
        return result;

    } catch (error) {
        console.error("Error during sampled analysis:", error);
        return {
            analysisText: `Une erreur est survenue durant l'analyse de l'échantillon. Veuillez réessayer.`,
            chartData: null
        };
    }
};



export const getChatbotResponseStream = async (userRole: User['role'], history: ChatMessage[]) => {
  try {
    if (!API_KEY) {
        throw new Error("Clé API manquante.");
    }
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    const model = 'gemini-2.5-flash';

    const contents = history;

    const baseInstruction = `
        Tu es l'assistant IA de MedataAI. Ton rôle est d'aider les utilisateurs à utiliser la plateforme en te basant **uniquement** sur les informations de fonctionnalités fournies ci-dessous.
        Réponds de manière concise, amicale et professionnelle. Ne donne JAMAIS de conseils médicaux.
        Ne mentionne pas de fonctionnalités qui ne sont pas listées dans ta base de connaissances.
        Ta réponse sera du texte brut.

        **Règle importante :** Ne salue l'utilisateur (par ex. avec "Bonjour") que si c'est le tout début de la conversation. Si un historique de discussion existe déjà, va directement à la réponse sans salutation.
        
        **Instructions d'action :**
        Si la demande de l'utilisateur peut être résolue en naviguant vers une page, ajoute un code spécial à la TOUTE FIN de ta réponse, après tout le texte. Ne mets rien après ce code.
        Le code doit être exactement au format : [ACTION:nom_de_l_action]

        Actions possibles :
        - 'navigate_formulaires' : Si l'utilisateur veut créer, voir ou gérer ses formulaires (y compris ses achats).
        - 'navigate_bibliotheque' : Si l'utilisateur veut explorer, prévisualiser ou acheter des formulaires publics.
        - 'navigate_analyse' : Si l'utilisateur veut analyser ses données ou utiliser l'analyse IA.
        - 'navigate_portefeuille' : Si l'utilisateur veut vérifier son solde de coins, voir ses transactions ou acheter des coins.

        Exemple de demande utilisateur : "Comment je fais pour créer un nouveau formulaire ?"
        Ta réponse attendue :
        Vous pouvez créer un nouveau formulaire en allant sur la page 'Formulaires'.
[ACTION:navigate_formulaires]
    `;

    const studentFeatures = `
        ### **Fonctionnalités Disponibles (Étudiant)**

        1.  **Tableau de bord :**
            - Vue d'ensemble de ton activité.
            - Affiche ton solde de "Coins", le nombre de formulaires validés et en brouillon.
            - Accès rapides pour créer un formulaire, lancer une analyse, ou voir ton portefeuille.

        2.  **Formulaires :**
            - **Mes Formulaires :**
                - **Création et Gestion :** Crée des formulaires de A à Z avec différents types de questions et de la logique conditionnelle.
                - **Brouillon (Gratuit) :** Modifie ton formulaire librement.
                - **Validation (500 coins) :** Finalise ton formulaire pour pouvoir y ajouter des réponses. Un formulaire validé ne peut plus être modifié.
                - **Ajouter une réponse (10 coins) :** Ajoute des données à tes propres formulaires validés.
                - **Publication (Gratuit) :** Partage ton travail avec la communauté en publiant un formulaire validé dans la bibliothèque. C'est un excellent moyen de gagner des coins passivement ! Tu gagnes 400 coins sur la vente du formulaire et 10 coins sur la vente de chaque réponse. Une fois publié, tu ne peux plus le modifier ni y ajouter de réponses.
            - **Mes Achats :**
                - Retrouve ici tous les formulaires que tu as achetés.
                - Tu peux y ajouter tes propres réponses pour enrichir le jeu de données.
                - Les formulaires achetés sont prêts à être utilisés avec l'Analyse IA, en combinant les réponses achetées et celles que tu as ajoutées.

        3.  **Bibliothèque :**
            - Explore et achète des formulaires de haute qualité créés par d'autres étudiants.
            - **Aperçu Gratuit :** Avant tout achat, tu peux visualiser la structure complète d'un formulaire (questions, options, logique conditionnelle) pour t'assurer qu'il correspond à tes besoins.
            - **Deux options d'achat flexibles :**
                - **Formulaire Seul (700 coins) :** Idéal pour commencer ta propre collecte de données sur une base solide.
                - **Formulaire + Réponses (700 coins + 15 coins/réponse) :** Accélère tes recherches en achetant le formulaire avec toutes les données anonymes déjà collectées par son créateur.

        4.  **Analyse IA :**
            - Sélectionne un de tes formulaires **validés** ou **achetés**.
            - Pose une question en langage naturel sur tes données (ex: "Quelle est la moyenne d'âge ?").
            - Demande des graphiques (ex: "Fais un diagramme circulaire des symptômes.").
            - L'analyse d'un formulaire acheté utilise à la fois les réponses que tu as achetées et celles que tu as personnellement ajoutées.
            - **Coût :** 500 coins pour débloquer l'analyse illimitée sur un formulaire. Les analyses suivantes sur le même formulaire sont gratuites.

        5.  **Portefeuille :**
            - Affiche ton solde de Coins.
            - Historique de toutes tes transactions.
            - La fonction "Acheter des Coins" n'est pas encore disponible.

        6.  **Profil :**
            - Modifie tes informations personnelles (nom, université, etc.).
    `;

    const adminFeatures = `
        ---
        ### **Fonctionnalités Supplémentaires (Administrateur)**

        Tu as aussi accès à des outils de gestion pour superviser la plateforme.

        1.  **Tableau de bord (Admin) :**
            - Vue d'ensemble de toute la plateforme.
            - Affiche le nombre total d'étudiants, de formulaires créés, de réponses collectées.
            - Affiche le total des coins dépensés sur la plateforme.

        2.  **Étudiants :**
            - **Vue Globale :** Liste tous les étudiants avec des filtres (nom, université, filière...).
            - **Gestion Individuelle :** En cliquant sur "Gérer", tu peux :
                - Consulter les infos détaillées d'un étudiant.
                - Voir tous les formulaires et réponses d'un étudiant.
                - **Ajuster le solde de Coins** (créditer ou débiter).
                - **Suspendre ou Réactiver** un compte étudiant.
                - Envoyer une **notification individuelle**.
            - **Notifications groupées :** Envoyer un message à tous les étudiants en même temps.

        3.  **Formulaires (Admin) :**
            - Consulter **tous les formulaires** créés par tous les étudiants.
            - Tu peux filtrer les formulaires par étudiant, mot-clé et **statut de publication** (publiés/non publiés).
            - Les administrateurs ne peuvent pas créer de formulaires eux-mêmes.

        4.  **Finances :**
            - Voir l'historique complet de **toutes les transactions** de la plateforme.
            - Suivi des débits et crédits globaux.

        5.  **Activité :**
            - (Fonctionnalité future) Affichera un journal de toutes les actions importantes sur la plateforme.
    `;

    let systemInstruction = baseInstruction;

    if (userRole === 'student') {
        systemInstruction += studentFeatures;
    } else if (userRole === 'admin') {
        systemInstruction += `\nTu es connecté en tant qu'administrateur. Tu as accès aux fonctionnalités étudiantes et aux fonctionnalités d'administration de la plateforme.\n`;
        systemInstruction += studentFeatures;
        systemInstruction += adminFeatures;
    }

    const responseStream = await ai.models.generateContentStream({
        model,
        contents,
        config: {
            systemInstruction: systemInstruction,
        },
    });
    
    return responseStream;
  } catch (error) {
    console.error("Error getting chatbot stream:", error);
    // This is a generator function, so we need to handle the error within the stream
    // or let it bubble up. Here, we'll throw to be caught by the caller.
    throw error;
  }
};
