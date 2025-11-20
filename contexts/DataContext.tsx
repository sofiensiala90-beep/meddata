import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { User, Form, FormResponse, Transaction, Notification, AnalysisHistory, PurchasedForm, Activity, TransactionReason, TransactionType } from '../types';
import { useAuth } from './AuthContext';
import { COIN_COSTS, COMMISSION_RATES, PLATFORM_FEES } from '../constants';
import firebase from 'firebase/compat/app';

interface DataContextType {
    users: User[];
    forms: Form[];
    responses: FormResponse[];
    transactions: Transaction[];
    notifications: Notification[];
    analysisHistory: AnalysisHistory[];
    purchasedForms: PurchasedForm[];
    activities: Activity[];
    unlockedAnalysis: { userId: string; formId: string }[];

    // Actions
    handleAddFormResponse: (formId: string, data: Record<string, any>) => Promise<void>;
    handleDeleteFormResponse: (responseId: string) => Promise<void>;
    handleCreateForm: (newForm: Form) => Promise<void>;
    handleUpdateForm: (updatedForm: Form) => Promise<void>;
    handleDeleteForm: (formId: string) => Promise<void>;
    handleSaveAndValidateForm: (formToValidate: Form) => Promise<void>;
    handlePublishForm: (formId: string, price: number, pricePerResponse: number) => Promise<void>;
    handlePurchaseForm: (formToBuy: Form, withResponses: boolean) => Promise<boolean>;
    handleRequestFormModification: (form: Form, reason: string) => Promise<void>;
    handleUnvalidateForm: (formId: string) => Promise<void>;
    handleModificationDecision: (formId: string, keepResponses: boolean) => Promise<void>;
    handleUpdateProfile: (updatedUser: User) => Promise<void>;
    handleMarkNotificationsRead: (userId: string) => Promise<void>;
    handleUpdateUserStatus: (userId: string, status: User['status']) => Promise<void>;
    handleAdminCoinAdjustment: (userId: string, amount: number, type: TransactionType) => Promise<void>;
    handleSendComplaint: (message: string) => Promise<void>;
    handleSaveAnalysisToHistory: (formIds: string[], formTitles: string[], userPrompt: string, analysisResult: any) => Promise<void>;
    handleDeleteAnalysisHistory: (historyId: string) => Promise<void>;
    handleCoinTransfer: (recipientEmail: string, amount: number) => Promise<boolean>;
    handleAddActivity: (type: any, userId: string, details: string, targetId?: string) => Promise<void>;
    handleTransaction: (userId: string, reason: TransactionReason, context?: any) => Promise<boolean>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();

    const [users, setUsers] = useState<User[]>([]);
    const [forms, setForms] = useState<Form[]>([]);
    const [responses, setResponses] = useState<FormResponse[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistory[]>([]);
    const [purchasedForms, setPurchasedForms] = useState<PurchasedForm[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [unlockedAnalysis, setUnlockedAnalysis] = useState<{ userId: string; formId: string }[]>([]);

    const listenersRef = useRef<(() => void)[]>([]);

    // Data Subscription Effect
    useEffect(() => {
        if (!currentUser) {
            setUsers([]);
            setForms([]);
            setResponses([]);
            setTransactions([]);
            setNotifications([]);
            setAnalysisHistory([]);
            setPurchasedForms([]);
            setActivities([]);
            setUnlockedAnalysis([]);
            return;
        }

        // Clear existing listeners
        listenersRef.current.forEach(unsubscribe => unsubscribe());
        listenersRef.current = [];

        const genericCollections = ['users', 'responses', 'transactions', 'analysisHistory', 'purchasedForms', 'activities', 'unlockedAnalysis'];
        const setters: any = {
            users: setUsers,
            responses: setResponses,
            transactions: setTransactions,
            analysisHistory: setAnalysisHistory,
            purchasedForms: setPurchasedForms,
            activities: setActivities,
            unlockedAnalysis: setUnlockedAnalysis
        };

        genericCollections.forEach(collection => {
            const unsubscribe = db.collection(collection).onSnapshot(snapshot => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setters[collection](data);
            });
            listenersRef.current.push(unsubscribe);
        });

        // Forms listener with migration logic
        const formsUnsubscribe = db.collection('forms').onSnapshot(snapshot => {
            const formsData = snapshot.docs.map(doc => {
                const data: any = doc.data();
                if (!data.status && typeof data.validated === 'boolean') {
                    data.status = data.validated ? 'validated' : 'draft';
                }
                if (!data.status) {
                    data.status = 'draft';
                }
                return { id: doc.id, ...data } as Form;
            });
            setForms(formsData);
        });
        listenersRef.current.push(formsUnsubscribe);

        // Notifications listener
        const notifUnsubscribe = db.collection('notifications').where('userId', '==', currentUser.id).onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNotifications(data as Notification[]);
        });
        listenersRef.current.push(notifUnsubscribe);

        return () => {
            listenersRef.current.forEach(unsubscribe => unsubscribe());
        };
    }, [currentUser]);

    // Helper for notifications
    const handleSendNotification = async (userId: string, message: string, showAlert = true) => {
        const newNotification: Omit<Notification, 'id'> = {
            userId,
            message,
            read: false,
            createdAt: new Date().toISOString(),
        };
        await db.collection('notifications').add(newNotification);
        if (showAlert) alert('Notification envoyée !');
    };

    // Helper for activities
    const handleAddActivity = async (type: any, userId: string, details: string, targetId?: string) => {
        const newActivity: Omit<Activity, 'id'> = {
            userId,
            type,
            details,
            targetId,
            createdAt: new Date().toISOString(),
        };
        await db.collection('activities').add(newActivity);
    };

    // Transaction Logic
    const handleTransaction = async (userId: string, reason: TransactionReason, context?: { form?: Form, formIds?: string[], formTitles?: string[] }): Promise<boolean> => {
        const user = users.find(u => u.id === userId);
        if (!user || user.role === 'admin') return true;

        if (user.status.startsWith('suspended')) {
            alert("Votre compte est suspendu. Vous ne pouvez pas effectuer cette action.");
            return false;
        }

        let cost = 0;
        let details = '';
        let formsToUnlock: string[] = [];

        switch (reason) {
            case TransactionReason.FormValidation:
                cost = context?.form?.origin === 'purchased' ? COIN_COSTS.VALIDATE_PURCHASED_FORM : COIN_COSTS.VALIDATE_FORM;
                details = `Validation du formulaire : "${context?.form?.title || 'N/A'}"`;
                break;
            case TransactionReason.FormResponse:
                cost = COIN_COSTS.ADD_RESPONSE;
                details = `Ajout de réponse au formulaire : "${context?.form?.title || 'N/A'}"`;
                break;
            case TransactionReason.AiRequest:
                if (!context?.formIds || context.formIds.length === 0) return false;
                formsToUnlock = context.formIds.filter(formId => !unlockedAnalysis.some(ua => ua.userId === userId && ua.formId === formId));
                if (formsToUnlock.length === 0) return true;
                cost = formsToUnlock.length * COIN_COSTS.AI_ANALYSIS;
                const formTitlesToUnlock = context.formTitles?.filter((_, index) => formsToUnlock.includes(context.formIds![index]));
                details = `Déblocage de l'analyse IA pour ${formsToUnlock.length} formulaire(s): "${formTitlesToUnlock?.join('", "')}"`;
                break;
            default: return true;
        }

        if (user.coinBalance < cost) {
            // setInsufficientFundsInfo({ required: cost, balance: user.coinBalance }); // TODO: Handle UI for this
            alert(`Fonds insuffisants. Requis: ${cost}, Solde: ${user.coinBalance}`);
            return false;
        }

        const batch = db.batch();
        const userRef = db.collection('users').doc(userId);
        batch.update(userRef, { coinBalance: firebase.firestore.FieldValue.increment(-cost) });

        const newTransaction: Omit<Transaction, 'id'> = { userId, type: TransactionType.Debit, amount: cost, reason, details, createdAt: new Date().toISOString() };
        const txRef = db.collection('transactions').doc();
        batch.set(txRef, newTransaction);

        const newNotification: Omit<Notification, 'id'> = { userId, message: `Transaction : ${details}. Montant : -${cost} coins.`, read: false, createdAt: new Date().toISOString() };
        const notifRef = db.collection('notifications').doc();
        batch.set(notifRef, newNotification);

        if (reason === TransactionReason.AiRequest && formsToUnlock.length > 0) {
            formsToUnlock.forEach(formId => {
                const unlockRef = db.collection('unlockedAnalysis').doc();
                batch.set(unlockRef, { userId, formId });
            });
        }

        await batch.commit();
        return true;
    };

    // --- Action Implementations (Copied from App.tsx) ---

    const handleAddFormResponse = async (formId: string, data: Record<string, any>) => {
        if (!currentUser) return;
        const form = forms.find(f => f.id === formId);
        if (!form) return;
        if (!await handleTransaction(currentUser.id, TransactionReason.FormResponse, { form })) return;

        const newResponse: Omit<FormResponse, 'id'> = {
            userId: currentUser.id, formId, data, createdAt: new Date().toISOString()
        };
        await db.collection('responses').add(newResponse);
        await handleAddActivity('RESPONSE_ADDED', currentUser.id, `Nouvelle réponse ajoutée au formulaire "${form.title}".`, form.id);
        alert("Réponse soumise avec succès !");
    };

    const handleDeleteFormResponse = async (responseId: string) => {
        await db.collection('responses').doc(responseId).delete();
        alert("Réponse supprimée avec succès !");
    };

    const handleCreateForm = async (newForm: Form) => {
        const { id, ...formData } = newForm;
        await db.collection('forms').doc(id).set(formData);
        await handleAddActivity('FORM_CREATED', newForm.userId, `Le formulaire "${newForm.title}" a été créé en tant que brouillon.`, newForm.id);
    };

    const handleUpdateForm = async (updatedForm: Form) => {
        const { id, ...formData } = updatedForm;
        await db.collection('forms').doc(id).update(formData);
    };

    const handleDeleteForm = async (formId: string) => {
        if (!currentUser) return;
        const formToDelete = forms.find(f => f.id === formId);
        if (!formToDelete) {
            alert("Erreur: formulaire introuvable.");
            return;
        }

        if (formToDelete.status !== 'draft') {
            alert("Impossible de supprimer un formulaire qui n'est pas en brouillon.");
            return;
        }

        try {
            await db.collection('forms').doc(formId).delete();
            await handleAddActivity('FORM_DELETED', currentUser.id, `Le formulaire en brouillon "${formToDelete.title}" a été supprimé.`, formId);
            alert("Formulaire supprimé avec succès.");
        } catch (error) {
            console.error("Error deleting form: ", error);
            alert("Une erreur est survenue lors de la suppression du formulaire.");
        }
    };

    const handleSaveAndValidateForm = async (formToValidate: Form) => {
        if (!currentUser) return;

        const isFree = formToValidate.revalidationFree === true;

        if (!isFree) {
            if (!await handleTransaction(currentUser.id, TransactionReason.FormValidation, { form: formToValidate })) return;
        }

        const { id, ...formData } = formToValidate;
        const formRef = db.collection('forms').doc(id);

        const updates = {
            ...formData,
            status: 'validated' as Form['status'],
            revalidationFree: false
        };

        const isNew = !forms.some(f => f.id === id);
        if (isNew) {
            await formRef.set(updates);
        } else {
            await formRef.update(updates);
        }

        await handleAddActivity('FORM_VALIDATED', currentUser.id, `Le formulaire "${formToValidate.title}" a été validé${isFree ? ' gratuitement' : ''}.`, formToValidate.id);
    };

    const handlePublishForm = async (formId: string, price: number, pricePerResponse: number) => {
        const formToPublish = forms.find(f => f.id === formId);
        if (!formToPublish) return;

        await db.collection('forms').doc(formId).update({ isPublic: true, price, pricePerResponse });
        await handleSendNotification(formToPublish.userId, `Votre formulaire "${formToPublish.title}" a été publié dans la bibliothèque !`, false);
        await handleAddActivity('FORM_PUBLISHED', formToPublish.userId, `Le formulaire "${formToPublish.title}" a été publié dans la bibliothèque.`, formId);
        alert("Formulaire publié avec succès !");
    };

    const handlePurchaseForm = async (formToBuy: Form, withResponses: boolean): Promise<boolean> => {
        if (!currentUser || currentUser.role !== 'student') return false;
        const seller = users.find(u => u.id === formToBuy.userId);
        const admin = users.find(u => u.role === 'admin');

        if (!seller || !admin) {
            alert("Erreur: Le vendeur ou l'administrateur n'a pas pu être trouvé.");
            return false;
        }

        const formResponses = responses.filter(r => r.formId === formToBuy.id);
        const responseCount = formResponses.length;

        const formCost = formToBuy.price;
        const responsesCost = withResponses ? responseCount * formToBuy.pricePerResponse : 0;
        const totalCost = formCost + responsesCost;

        if (currentUser.coinBalance < totalCost) {
            alert(`Fonds insuffisants. Requis: ${totalCost}, Solde: ${currentUser.coinBalance}`);
            return false;
        }

        const creatorFormCommission = formCost * COMMISSION_RATES.CREATOR_FORM_SALE;
        const creatorResponsesCommission = responsesCost * COMMISSION_RATES.CREATOR_RESPONSE_SALE;
        const creatorTotalCommission = creatorFormCommission + creatorResponsesCommission;
        const platformCommission = totalCost - creatorTotalCommission;

        try {
            const batch = db.batch();

            const buyerRef = db.collection('users').doc(currentUser.id);
            batch.update(buyerRef, { coinBalance: firebase.firestore.FieldValue.increment(-totalCost) });

            const sellerRef = db.collection('users').doc(seller.id);
            batch.update(sellerRef, { coinBalance: firebase.firestore.FieldValue.increment(creatorTotalCommission) });

            const adminRef = db.collection('users').doc(admin.id);
            batch.update(adminRef, { coinBalance: firebase.firestore.FieldValue.increment(platformCommission) });

            const buyerTx: Omit<Transaction, 'id'> = {
                userId: currentUser.id, type: TransactionType.Debit, amount: totalCost,
                reason: withResponses ? TransactionReason.ResponseBundlePurchase : TransactionReason.FormPurchase,
                details: `Achat du formulaire "${formToBuy.title}"${withResponses ? ' avec réponses' : ''}.`,
                createdAt: new Date().toISOString()
            };
            batch.set(db.collection('transactions').doc(), buyerTx);

            const sellerTx: Omit<Transaction, 'id'> = {
                userId: seller.id, type: TransactionType.Credit, amount: creatorTotalCommission,
                reason: TransactionReason.FormSaleCommission,
                details: `Commission sur la vente de "${formToBuy.title}" à ${currentUser.name}.`,
                createdAt: new Date().toISOString()
            };
            batch.set(db.collection('transactions').doc(), sellerTx);

            const platformTx: Omit<Transaction, 'id'> = {
                userId: admin.id, type: TransactionType.Credit, amount: platformCommission,
                reason: TransactionReason.PlatformCommission,
                details: `Commission de la plateforme sur la vente de "${formToBuy.title}".`,
                createdAt: new Date().toISOString()
            };
            batch.set(db.collection('transactions').doc(), platformTx);

            if (withResponses) {
                const newPurchase: Omit<PurchasedForm, 'id'> = {
                    userId: currentUser.id, formId: formToBuy.id, purchasedAt: new Date().toISOString(),
                    withResponses: true, purchasePrice: totalCost,
                };
                batch.set(db.collection('purchasedForms').doc(), newPurchase);
            } else {
                const newFormCopy: Omit<Form, 'id'> = {
                    userId: currentUser.id, title: `${formToBuy.title} (Copie)`, description: formToBuy.description,
                    schema: formToBuy.schema, status: 'draft', createdAt: new Date().toISOString(),
                    isPublic: false, price: 0, pricePerResponse: 0, origin: 'purchased'
                };
                batch.set(db.collection('forms').doc(), newFormCopy);
            }

            const buyerNotif: Omit<Notification, 'id'> = {
                userId: currentUser.id, message: `Achat de "${formToBuy.title}" réussi pour ${totalCost} coins !`,
                read: false, createdAt: new Date().toISOString(),
            };
            batch.set(db.collection('notifications').doc(), buyerNotif);

            const sellerNotif: Omit<Notification, 'id'> = {
                userId: seller.id,
                message: `Félicitations ! ${currentUser.name} a acheté votre formulaire "${formToBuy.title}". Vous avez gagné ${Math.round(creatorTotalCommission)} coins.`,
                read: false, createdAt: new Date().toISOString(),
            };
            batch.set(db.collection('notifications').doc(), sellerNotif);

            await batch.commit();

            await handleAddActivity('FORM_PURCHASED', currentUser.id, `Le formulaire "${formToBuy.title}" a été acheté pour ${totalCost} coins.`, formToBuy.id);
            alert("Achat réussi !");
            return true;
        } catch (error) {
            console.error("Form purchase failed:", error);
            alert("Une erreur est survenue lors de l'achat. Votre solde n'a pas été modifié.");
            return false;
        }
    };

    const handleRequestFormModification = async (form: Form, reason: string) => {
        if (!currentUser) return;
        const admin = users.find(u => u.role === 'admin');
        if (!admin) {
            alert("Erreur: Administrateur non trouvé. La demande ne peut pas être envoyée.");
            return;
        }

        const message = `L'étudiant ${currentUser.name} (${currentUser.email}) demande une modification pour le formulaire "${form.title}".\n\nRaison : "${reason}"\n\nPour approuver, allez dans la gestion de l'étudiant et cliquez sur "Annuler la validation" pour ce formulaire.`;
        await handleSendNotification(admin.id, message, false);

        alert('Votre demande a été envoyée à l\'administrateur.');
    };

    const handleUnvalidateForm = async (formId: string) => {
        if (!currentUser || currentUser.role !== 'admin') {
            alert("Action non autorisée.");
            return;
        }
        const formToUpdate = forms.find(f => f.id === formId);
        if (!formToUpdate) {
            alert("Erreur: Formulaire introuvable.");
            return;
        }

        try {
            await db.collection('forms').doc(formId).update({
                status: 'awaiting_modification_decision',
                revalidationFree: true
            });

            const student = users.find(u => u.id === formToUpdate.userId);
            if (student) {
                const message = `Votre demande de modification pour "${formToUpdate.title}" a été approuvée.\n\n` +
                    `⚠️ Attention : Les modifications ne doivent pas être majeures, sinon votre formulaire risque d'être supprimé pour éviter toute fraude.\n\n` +
                    `Vous devrez choisir de conserver ou supprimer les réponses existantes avant de pouvoir le modifier à nouveau.`;
                await handleSendNotification(student.id, message, false);
            }

            await handleAddActivity('FORM_VALIDATION_CANCELLED', currentUser.id, `A annulé la validation du formulaire "${formToUpdate.title}" pour l'étudiant ${student?.name || 'inconnu'}.`, formId);

            alert("La validation du formulaire a été annulée. L'étudiant a été notifié.");

        } catch (error) {
            console.error("Error un-validating form: ", error);
            alert("Une erreur est survenue lors de l'annulation de la validation.");
        }
    };

    const handleModificationDecision = async (formId: string, keepResponses: boolean) => {
        if (!currentUser) return;
        const form = forms.find(f => f.id === formId);
        if (!form || form.status !== 'awaiting_modification_decision') {
            alert("Action non valide ou formulaire non trouvé.");
            return;
        }

        const batch = db.batch();

        if (!keepResponses) {
            const responsesToDelete = await db.collection('responses').where('formId', '==', formId).get();
            responsesToDelete.forEach(doc => {
                batch.delete(doc.ref);
            });
        }

        const formRef = db.collection('forms').doc(formId);
        batch.update(formRef, { status: 'draft' });

        await batch.commit();

        const notifMessage = `Vous pouvez maintenant modifier votre formulaire "${form.title}". Les réponses existantes ont été ${keepResponses ? 'conservées' : 'supprimées'} comme demandé.`;
        await handleSendNotification(currentUser.id, notifMessage, false);

        alert("Vous pouvez maintenant modifier votre formulaire.");
    };

    const handleUpdateProfile = async (updatedUser: User) => {
        const { id, ...profileData } = updatedUser;
        const dataToUpdate = {
            name: profileData.name,
            university: profileData.university,
            field: profileData.field,
            studyYear: profileData.studyYear,
            phoneNumber: profileData.phoneNumber
        };
        await db.collection('users').doc(id).update(dataToUpdate);
        alert("Profil mis à jour !");
    };

    const handleMarkNotificationsRead = async (userId: string) => {
        const unreadNotifs = await db.collection('notifications').where('userId', '==', userId).where('read', '==', false).get();
        if (unreadNotifs.empty) return;

        const batch = db.batch();
        unreadNotifs.docs.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });
        await batch.commit();
    };

    const handleUpdateUserStatus = async (userId: string, status: User['status']) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;
        await db.collection('users').doc(userId).update({ status });
        const statusText = status.startsWith('suspended') ? 'suspendu' : 'réactivé';
        await handleAddActivity('USER_STATUS_CHANGED', currentUser!.id, `Le compte de ${user.name} a été ${statusText}.`, userId);
    };

    const handleAdminCoinAdjustment = async (userId: string, amount: number, type: TransactionType) => {
        const user = users.find(u => u.id === userId);
        if (!user) {
            alert("Utilisateur introuvable.");
            return;
        }
        if (!currentUser || currentUser.role !== 'admin') {
            alert("Action non autorisée.");
            return;
        }

        const userRef = db.collection('users').doc(userId);
        const increment = type === TransactionType.Credit ? amount : -amount;
        const actionText = type === TransactionType.Credit ? 'crédité' : 'débité';
        const actionTextPast = type === TransactionType.Credit ? 'crédit' : 'débit';

        const batch = db.batch();

        batch.update(userRef, { coinBalance: firebase.firestore.FieldValue.increment(increment) });

        const newTransaction: Omit<Transaction, 'id'> = {
            userId, type, amount, reason: TransactionReason.AdminAdjustment,
            details: `Ajustement de ${actionTextPast} par l'administrateur ${currentUser.name}.`,
            createdAt: new Date().toISOString(),
        };
        const txRef = db.collection('transactions').doc();
        batch.set(txRef, newTransaction);

        const newNotification: Omit<Notification, 'id'> = {
            userId, message: `Un administrateur a ${actionText} ${amount} coins sur votre compte.`,
            read: false, createdAt: new Date().toISOString(),
        };
        const notifRef = db.collection('notifications').doc();
        batch.set(notifRef, newNotification);

        await batch.commit();

        const details = `A ${actionText} ${amount} coins sur le compte de ${user.name}.`;
        await handleAddActivity('ADMIN_COIN_ADJUSTMENT', currentUser.id, details, userId);

        alert("Ajustement des coins effectué !");
    };

    const handleSendComplaint = async (message: string) => {
        const admin = users.find(u => u.role === 'admin');
        if (!admin || !currentUser) return;

        const fullMessage = `Réclamation de ${currentUser.name} (${currentUser.email}):\n\n${message}`;
        await handleSendNotification(admin.id, fullMessage, false);

        alert('Votre réclamation a été envoyée avec succès.');
    };

    const handleSaveAnalysisToHistory = async (formIds: string[], formTitles: string[], userPrompt: string, analysisResult: any) => {
        if (!currentUser) return;
        const newHistoryItem: Omit<AnalysisHistory, 'id'> = {
            userId: currentUser.id,
            formIds,
            formTitles,
            userPrompt,
            analysisResult,
            createdAt: new Date().toISOString()
        };
        await db.collection('analysisHistory').add(newHistoryItem);
        const details = `Analyse IA effectuée sur le(s) formulaire(s) : "${formTitles.join('", "')}".`;
        await handleAddActivity('AI_ANALYSIS_PERFORMED', currentUser.id, details, formIds.join(','));
    };

    const handleDeleteAnalysisHistory = async (historyId: string) => {
        await db.collection('analysisHistory').doc(historyId).delete();
    };

    const handleCoinTransfer = async (recipientEmail: string, amount: number): Promise<boolean> => {
        if (!currentUser) return false;

        if (amount < 100) {
            alert("Le montant minimum pour un transfert est de 100 coins.");
            return false;
        }
        if (currentUser.coinBalance < amount) {
            alert("Votre solde est insuffisant pour ce transfert.");
            return false;
        }

        const recipientQuery = await db.collection('users').where('email', '==', recipientEmail.toLowerCase()).limit(1).get();
        if (recipientQuery.empty) {
            alert("Aucun étudiant trouvé avec cette adresse e-mail.");
            return false;
        }
        const recipient = { id: recipientQuery.docs[0].id, ...recipientQuery.docs[0].data() } as User;

        if (recipient.id === currentUser.id) {
            alert("Vous ne pouvez pas vous envoyer de coins à vous-même.");
            return false;
        }

        try {
            await db.runTransaction(async (transaction) => {
                const senderRef = db.collection('users').doc(currentUser.id);
                const recipientRef = db.collection('users').doc(recipient.id);
                transaction.update(senderRef, { coinBalance: firebase.firestore.FieldValue.increment(-amount) });
                transaction.update(recipientRef, { coinBalance: firebase.firestore.FieldValue.increment(amount) });

                const senderTxRef = db.collection('transactions').doc();
                const senderTx: Omit<Transaction, 'id'> = {
                    userId: currentUser.id, type: TransactionType.Debit, amount: amount,
                    reason: TransactionReason.COIN_TRANSFER_SENT,
                    details: `Transfert de ${amount} coins à ${recipient.name}.`,
                    createdAt: new Date().toISOString(),
                };
                transaction.set(senderTxRef, senderTx);

                const recipientTxRef = db.collection('transactions').doc();
                const recipientTx: Omit<Transaction, 'id'> = {
                    userId: recipient.id, type: TransactionType.Credit, amount: amount,
                    reason: TransactionReason.COIN_TRANSFER_RECEIVED,
                    details: `Reçu ${amount} coins de ${currentUser.name}.`,
                    createdAt: new Date().toISOString(),
                };
                transaction.set(recipientTxRef, recipientTx);
            });

            const batch = db.batch();
            const senderNotif: Omit<Notification, 'id'> = {
                userId: currentUser.id,
                message: `Vous avez transféré avec succès ${amount} coins à ${recipient.name}.`,
                read: false, createdAt: new Date().toISOString(),
            };
            batch.set(db.collection('notifications').doc(), senderNotif);

            const recipientNotif: Omit<Notification, 'id'> = {
                userId: recipient.id,
                message: `Vous avez reçu ${amount} coins de la part de ${currentUser.name}.`,
                read: false, createdAt: new Date().toISOString(),
            };
            batch.set(db.collection('notifications').doc(), recipientNotif);
            await batch.commit();

            await handleAddActivity(
                'COIN_TRANSFER', currentUser.id,
                `A transféré ${amount} coins à ${recipient.name}.`, recipient.id
            );

            alert("Transfert effectué avec succès !");
            return true;

        } catch (error) {
            console.error("Coin transfer transaction failed: ", error);
            alert("Une erreur est survenue pendant le transfert. Votre solde n'a pas été modifié. Veuillez réessayer.");
            return false;
        }
    };

    return (
        <DataContext.Provider value={{
            users, forms, responses, transactions, notifications, analysisHistory, purchasedForms, activities, unlockedAnalysis,
            handleAddFormResponse, handleDeleteFormResponse, handleCreateForm, handleUpdateForm, handleDeleteForm,
            handleSaveAndValidateForm, handlePublishForm, handlePurchaseForm, handleRequestFormModification,
            handleUnvalidateForm, handleModificationDecision, handleUpdateProfile, handleMarkNotificationsRead,
            handleUpdateUserStatus, handleAdminCoinAdjustment, handleSendComplaint, handleSaveAnalysisToHistory,
            handleDeleteAnalysisHistory, handleCoinTransfer, handleAddActivity, handleTransaction
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
