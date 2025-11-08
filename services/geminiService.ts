import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ChatMessage, Form, FormResponse, User, ChatbotResponse } from '../types';

export const getChatbotResponseStream = async (userRole: User['role'], history: ChatMessage[]) => {
  try {
    console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const model = 'gemini-2.0-flash';

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
                - **Validation :** Finalise ton formulaire pour pouvoir y ajouter des réponses. Un formulaire validé ne peut plus être modifié. Le coût est de **200 coins** pour un formulaire créé de zéro, et de **120 coins** pour un modèle de formulaire acheté.
                - **Ajouter une réponse (2 coins) :** Ajoute des données à tes propres formulaires validés.
                - **Publication (Gratuit) :** Partage ton travail avec la communauté en publiant un formulaire validé dans la bibliothèque. C'est un excellent moyen de gagner des coins passivement ! Tu gagnes 60% sur la vente du formulaire (soit 120 coins) et 50% sur la vente de chaque réponse (soit 2 coins par réponse). Une fois publié, tu ne peux plus le modifier ni y ajouter de réponses.
            - **Mes Achats :**
                - Retrouve ici tous les formulaires que tu as achetés.
                - Tu peux y ajouter tes propres réponses pour enrichir le jeu de données.
                - Les formulaires achetés sont prêts à être utilisés avec l'Analyse IA, en combinant les réponses achetées et celles que tu as ajoutées.

        3.  **Bibliothèque :**
            - Explore et achète des formulaires de haute qualité créés par d'autres étudiants.
            - **Aperçu Gratuit :** Avant tout achat, tu peux visualiser la structure complète d'un formulaire (questions, options, logique conditionnelle) pour t'assurer qu'il correspond à tes besoins.
            - **Deux options d'achat flexibles :**
                - **Formulaire Seul (200 coins) :** Idéal pour commencer ta propre collecte de données sur une base solide.
                - **Formulaire + Réponses (200 coins + 4 coins/réponse) :** Accélère tes recherches en achetant le formulaire avec toutes les données anonymes déjà collectées par son créateur.

        4.  **Analyse IA :**
            - Sélectionne un de tes formulaires **validés** ou **achetés**.
            - Pose une question en langage naturel sur tes données (ex: "Quelle est la moyenne d'âge ?").
            - Demande des graphiques (ex: "Fais un diagramme circulaire des symptômes.").
            - L'analyse d'un formulaire acheté utilise à la fois les réponses que tu as achetées et celles que tu as personnellement ajoutées.
            - **Coût :** 10 coins par analyse.

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
    console.error("Error getting chatbot response stream:", error);
    throw new Error("Désolé, une erreur est survenue lors de la communication avec l'IA.");
  }
};


export const getAnalysis = async (forms: Form[], responses: FormResponse[], userPrompt: string): Promise<any> => {
    console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const formsData = forms.map(form => ({
        id: form.id,
        title: form.title,
        schema: form.schema.map(f => ({ id: f.id, label: f.label, type: f.type, options: f.options, condition: f.condition }))
    }));

    const prompt = `
        Tu es un analyste de données médicales. Analyse les données de formulaire suivantes en fonction de la demande de l'utilisateur.
        
        Tu analyses les données de ${forms.length} formulaire(s).
        
        Détails des formulaires (schémas) :
        ${JSON.stringify(formsData, null, 2)}
        
        Réponses collectées (les réponses sont associées à un formulaire via 'formId') :
        ${JSON.stringify(responses.map(r => ({ formId: r.formId, data: r.data })), null, 2)}

        NOTE IMPORTANTE SUR LES DONNÉES : Dans le schéma d'un formulaire, une question peut avoir un champ 'condition'. Ce champ indique que la question n'est posée que si une question précédente (identifiée par 'sourceFieldId') a une valeur spécifique ('sourceFieldValue'). Prends en compte cette logique conditionnelle dans ton analyse, car elle peut expliquer pourquoi certains participants n'ont pas répondu à toutes les questions.

        Demande de l'utilisateur : "${userPrompt}"

        En te basant sur ces données et la demande de l'utilisateur, fournis ton analyse.
        - Ton analyse textuelle DOIT être en français.
        - Si l'utilisateur demande un graphique, une visualisation ou un diagramme, tu DOIS fournir les données pour celui-ci dans le champ 'chartData'. Si aucun graphique n'est demandé, 'chartData' doit être null.
        - Le 'type' de graphique peut être 'bar', 'pie', 'line', ou 'doughnut'.
        - Pour les graphiques, tu DOIS aussi fournir un tableau 'backgroundColor' dans chaque dataset. Ce tableau DOIT contenir des codes de couleur au format hexadécimal (par exemple, "#FF6384" ou "#36A2EB"). N'utilise JAMAIS de noms de couleur (comme "rouge"). Choisis une palette de couleurs esthétique et cohérente. Le nombre de couleurs doit correspondre exactement au nombre de points de données dans le tableau 'data'.
    `;

    try {
        const model = 'gemini-2.0-flash';
        
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        analysisText: { 
                            type: Type.STRING,
                            description: "Une analyse textuelle en français répondant à la demande de l'utilisateur."
                        },
                        chartData: {
                            type: Type.OBJECT,
                            nullable: true,
                            description: "Données structurées pour un graphique si demandé, sinon null.",
                            properties: {
                                type: { type: Type.STRING, description: "Type de graphique, ex: 'bar', 'pie', 'line'." },
                                data: {
                                    type: Type.OBJECT,
                                    properties: {
                                        labels: {
                                            type: Type.ARRAY,
                                            items: { type: Type.STRING }
                                        },
                                        datasets: {
                                            type: Type.ARRAY,
                                            items: {
                                                type: Type.OBJECT,
                                                properties: {
                                                    label: { type: Type.STRING },
                                                    data: {
                                                        type: Type.ARRAY,
                                                        items: { type: Type.NUMBER }
                                                    },
                                                    backgroundColor: {
                                                        type: Type.ARRAY,
                                                        items: { type: Type.STRING },
                                                        description: "Tableau de couleurs (codes hexadécimaux, ex: '#FF6384') pour chaque point de donnée. DOIT être de la même taille que le tableau 'data'."
                                                    }
                                                },
                                                required: ['label', 'data', 'backgroundColor']
                                            }
                                        }
                                    },
                                    required: ['labels', 'datasets']
                                }
                            },
                            required: ['type', 'data']
                        }
                    },
                    required: ['analysisText']
                }
            }
        });
        
        const jsonResponse = JSON.parse(response.text);
        return jsonResponse;

    } catch (error) {
        console.error("Error getting analysis:", error);
        throw new Error("Échec de l'obtention de l'analyse par le service IA.");
    }
};