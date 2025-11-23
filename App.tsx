
import React, { useState, useEffect, useRef } from 'react';
import { User, Form, FormResponse, Transaction, Notification, TransactionReason, TransactionType, AnalysisHistory, PurchasedForm, Activity, ActivityType, SystemSettings } from './types';
import { auth, db } from './services/firebase';
import firebase from 'firebase/compat/app';

import AuthPage from './pages/AuthPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Forms from './pages/Forms';
import Analysis from './pages/Analysis';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import Students from './pages/Students';
import Finance from './pages/Finance';
import ActivityPage from './pages/Activity';
import Chatbot from './components/Chatbot';
import ComplaintModal from './components/ComplaintModal';
import { DEFAULT_SETTINGS } from './constants'; // Use DEFAULT_SETTINGS as fallback only
import NotificationsPage from './pages/NotificationsPage';
import Library from './pages/Library';
import InsufficientFundsModal from './components/InsufficientFundsModal';
import Spinner from './components/Spinner';
import AdminConfiguration from './pages/AdminConfiguration';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<string>('tableau-de-bord');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [analysisContext, setAnalysisContext] = useState<{ formIds: string[] } | null>(null);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [insufficientFundsInfo, setInsufficientFundsInfo] = useState<{ required: number; balance: number } | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  // App-wide state, now populated from Firestore
  const [users, setUsers] = useState<User[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistory[]>([]);
  const [purchasedForms, setPurchasedForms] = useState<PurchasedForm[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [unlockedAnalysis, setUnlockedAnalysis] = useState<{userId: string; formId: string}[]>([]);
  
  const listenersRef = useRef<(() => void)[]>([]);

  const updateLocalUserState = (userId: string, updates: Partial<User>) => {
    setCurrentUser(prev => (prev?.id === userId ? { ...prev, ...updates } : prev));
    setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, ...updates } : u));
  };
  
  // Load System Settings
  useEffect(() => {
    const unsubscribe = db.collection('settings').doc('general').onSnapshot(doc => {
      if (doc.exists) {
        setSystemSettings(doc.data() as SystemSettings);
      } else {
        // Init if not exists
        db.collection('settings').doc('general').set(DEFAULT_SETTINGS);
        setSystemSettings(DEFAULT_SETTINGS);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const authUnsubscribe = auth.onAuthStateChanged(async (user) => {
        listenersRef.current.forEach(unsubscribe => unsubscribe());
        listenersRef.current = [];

        if (user) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = { id: user.uid, ...userDoc.data() } as User;
                setCurrentUser(userData);
                setIsLoading(false);

                // Collections with generic listeners
                const genericCollections = ['users', 'responses', 'transactions', 'analysisHistory', 'purchasedForms', 'activities', 'unlockedAnalysis'];
                const setters:any = {
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

                // Special listener for 'forms' to handle data migration
                const formsUnsubscribe = db.collection('forms').onSnapshot(snapshot => {
                    const formsData = snapshot.docs.map(doc => {
                        const data: any = doc.data();
                        // Compatibility layer: If 'status' is missing, infer from old 'validated' field.
                        if (!data.status && typeof data.validated === 'boolean') {
                            data.status = data.validated ? 'validated' : 'draft';
                        }
                        // Default to 'draft' if status is still missing, for safety.
                        if (!data.status) {
                            data.status = 'draft';
                        }
                        return { id: doc.id, ...data } as Form;
                    });
                    setForms(formsData);
                });
                listenersRef.current.push(formsUnsubscribe);

                // Notifications listener (user-specific)
                const notifUnsubscribe = db.collection('notifications').where('userId', '==', user.uid).onSnapshot(snapshot => {
                    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setNotifications(data as Notification[]);
                });
                listenersRef.current.push(notifUnsubscribe);
            } else {
                // This is a new user who has authenticated but does not have a user profile
                // in Firestore yet. The AuthPage component is responsible for creating it.
                // We must NOT sign them out. We just finish loading so the AuthPage can
                // continue the signup process.
                setCurrentUser(null);
                setIsLoading(false);
            }
        } else {
            setCurrentUser(null);
            setIsLoading(false);
            setCurrentPage('tableau-de-bord');
            setAnalysisContext(null);
            setUsers([]);
            setForms([]);
            setResponses([]);
            setTransactions([]);
            setNotifications([]);
            setAnalysisHistory([]);
            setPurchasedForms([]);
            setActivities([]);
            setUnlockedAnalysis([]);
        }
    });

    return () => {
        authUnsubscribe();
        listenersRef.current.forEach(unsubscribe => unsubscribe());
    };
  }, []);


  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const runMonthlyFeeCheck = async (student: User) => {
        if (student.role !== 'student') return;

        const sessionKey = `monthly_fee_check_v4_${student.id}`;
        if (sessionStorage.getItem(sessionKey)) return;
        sessionStorage.setItem(sessionKey, 'true');

        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const monthlyFee = systemSettings.platformFees.monthly;

        const userTransactionsQuery = await db.collection('transactions')
            .where('userId', '==', student.id)
            .get();

        const monthlyFeeTransactions = userTransactionsQuery.docs
            .map(doc => doc.data() as Transaction)
            .filter(tx => tx.reason === TransactionReason.MonthlyFee);
        
        monthlyFeeTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const lastFeeTransaction = monthlyFeeTransactions.length > 0 ? monthlyFeeTransactions[0] : null;
        
        let lastFeeDate = lastFeeTransaction ? new Date(lastFeeTransaction.createdAt) : new Date(student.createdAt);
        
        const now = new Date();
        let nextDueDate = new Date(lastFeeDate.getTime() + thirtyDaysInMs);

        const missedPayments: Date[] = [];
        while (nextDueDate < now) {
            missedPayments.push(new Date(nextDueDate));
            nextDueDate = new Date(nextDueDate.getTime() + thirtyDaysInMs);
        }

        if (missedPayments.length > 0) {
            const totalDebit = missedPayments.length * monthlyFee;
            const finalBalance = student.coinBalance - totalDebit;

            const batch = db.batch();
            const userRef = db.collection('users').doc(student.id);

            const userUpdates: Partial<User> = { coinBalance: firebase.firestore.FieldValue.increment(-totalDebit) as any };
            if (finalBalance < 0 && student.status === 'active') {
                userUpdates.status = 'suspended_payment';
            }
            batch.update(userRef, userUpdates);

            missedPayments.forEach(dueDate => {
                const newTransaction: Omit<Transaction, 'id'> = {
                    userId: student.id,
                    type: TransactionType.Debit,
                    amount: monthlyFee,
                    reason: TransactionReason.MonthlyFee,
                    details: `Frais mensuels pour la période se terminant le ${dueDate.toLocaleDateString('fr-FR')}.`,
                    createdAt: dueDate.toISOString(),
                };
                const txRef = db.collection('transactions').doc();
                batch.set(txRef, newTransaction);
            });

            const newNotification: Omit<Notification, 'id'> = {
                userId: student.id,
                message: `${missedPayments.length} frais mensuel(s) (total: ${totalDebit} coins) ont été prélevés.`,
                read: false,
                createdAt: now.toISOString(),
            };
            const notifRef = db.collection('notifications').doc();
            batch.set(notifRef, newNotification);

            await batch.commit();

            // Update local state for instant UI change
            const localUpdates: Partial<User> = { coinBalance: finalBalance };
            if (finalBalance < 0 && student.status === 'active') {
              localUpdates.status = 'suspended_payment';
            }
            updateLocalUserState(student.id, localUpdates);
        }
    };

    if (currentUser && currentUser.role === 'student') {
        runMonthlyFeeCheck(currentUser);
    }
  }, [currentUser, systemSettings]);

  const handleAddActivity = async (type: ActivityType, userId: string, details: string, targetId?: string) => {
    const newActivity: any = {
      userId,
      type,
      details,
      createdAt: new Date().toISOString(),
    };
    // Ensure undefined is not passed to Firestore
    if (targetId) {
        newActivity.targetId = targetId;
    }
    await db.collection('activities').add(newActivity);
  };

  const handleToggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleLogin = (user: User) => {
    setCurrentPage('tableau-de-bord');
  };

  const handleLogout = async () => {
    await auth.signOut();
  };

  const handleNavigate = (page: string, context: any = null) => {
    setCurrentPage(page);
    setAnalysisContext(context);
  };
  
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

    switch(reason) {
      case TransactionReason.FormValidation:
        cost = context?.form?.origin === 'purchased' ? systemSettings.coinCosts.validatePurchasedForm : systemSettings.coinCosts.validateForm;
        details = `Validation du formulaire : "${context?.form?.title || 'N/A'}"`;
        break;
      case TransactionReason.FormResponse:
        cost = systemSettings.coinCosts.addResponse;
        details = `Ajout de réponse au formulaire : "${context?.form?.title || 'N/A'}"`;
        break;
      case TransactionReason.AiRequest:
        if (!context?.formIds || context.formIds.length === 0) return false;
        formsToUnlock = context.formIds.filter(formId => !unlockedAnalysis.some(ua => ua.userId === userId && ua.formId === formId));
        if (formsToUnlock.length === 0) return true;
        cost = formsToUnlock.length * systemSettings.coinCosts.aiAnalysis;
        const formTitlesToUnlock = context.formTitles?.filter((_, index) => formsToUnlock.includes(context.formIds![index]));
        details = `Déblocage de l'analyse IA pour ${formsToUnlock.length} formulaire(s): "${formTitlesToUnlock?.join('", "')}"`;
        break;
      default: return true; 
    }
    
    if (user.coinBalance < cost) {
      setInsufficientFundsInfo({ required: cost, balance: user.coinBalance });
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
    updateLocalUserState(userId, { coinBalance: user.coinBalance - cost });
    return true;
  };

  const handleAddFormResponse = async (formId: string, data: Record<string, any>) => {
      if(!currentUser) return;
      const form = forms.find(f => f.id === formId);
      if (!form) return;
      if (!await handleTransaction(currentUser.id, TransactionReason.FormResponse, { form })) return;

      const newResponse: Omit<FormResponse, 'id'> = {
          userId: currentUser.id, formId, data, createdAt: new Date().toISOString()
      };
      await db.collection('responses').add(newResponse);
      await handleAddActivity(ActivityType.RESPONSE_ADDED, currentUser.id, `Nouvelle réponse ajoutée au formulaire "${form.title}".`, form.id);
      alert("Réponse soumise avec succès !");
  };
  
  const handleDeleteFormResponse = async (responseId: string) => {
    await db.collection('responses').doc(responseId).delete();
    alert("Réponse supprimée avec succès !");
  };

  const handleCreateForm = async (newForm: Form) => {
    const { id, ...formData } = newForm;
    await db.collection('forms').doc(id).set(formData);
    await handleAddActivity(ActivityType.FORM_CREATED, newForm.userId, `Le formulaire "${newForm.title}" a été créé en tant que brouillon.`, newForm.id);
  };

  const handleUpdateForm = async (updatedForm: Form) => {
      const { id, ...formData } = updatedForm;
      await db.collection('forms').doc(id).update(formData);
  };

  const handleDeleteForm = async (formId: string) => {
    if (!currentUser) return;
    const formToDelete = forms.find(f => f.id === formId);
    if (!formToDelete) {
        console.error("Form to delete not found");
        alert("Erreur: formulaire introuvable.");
        return;
    }

    if (formToDelete.status !== 'draft') {
        alert("Impossible de supprimer un formulaire qui n'est pas en brouillon.");
        return;
    }

    try {
        await db.collection('forms').doc(formId).delete();
        await handleAddActivity(ActivityType.FORM_DELETED, currentUser.id, `Le formulaire en brouillon "${formToDelete.title}" a été supprimé.`, formId);
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

    await handleAddActivity(ActivityType.FORM_VALIDATED, currentUser.id, `Le formulaire "${formToValidate.title}" a été validé${isFree ? ' gratuitement' : ''}.`, formToValidate.id);
  };
  
  const handlePublishForm = async (formId: string, price: number, pricePerResponse: number) => {
    const formToPublish = forms.find(f => f.id === formId);
    if (!formToPublish) return;

    await db.collection('forms').doc(formId).update({ isPublic: true, price, pricePerResponse });
    await handleSendNotification(formToPublish.userId, `Votre formulaire "${formToPublish.title}" a été publié dans la bibliothèque !`, false);
    await handleAddActivity(ActivityType.FORM_PUBLISHED, formToPublish.userId, `Le formulaire "${formToPublish.title}" a été publié dans la bibliothèque.`, formId);
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
        setInsufficientFundsInfo({ required: totalCost, balance: currentUser.coinBalance });
        return false;
    }

    const creatorFormCommission = formCost * systemSettings.commissionRates.creatorFormSale;
    const creatorResponsesCommission = responsesCost * systemSettings.commissionRates.creatorResponseSale;
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

        updateLocalUserState(currentUser.id, { coinBalance: currentUser.coinBalance - totalCost });
        updateLocalUserState(seller.id, { coinBalance: seller.coinBalance + creatorTotalCommission });

        await handleAddActivity(ActivityType.FORM_PURCHASED, currentUser.id, `Le formulaire "${formToBuy.title}" a été acheté pour ${totalCost} coins.`, formToBuy.id);
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
        if(student) {
             const message = `Votre demande de modification pour "${formToUpdate.title}" a été approuvée.\n\n` +
                             `⚠️ Attention : Les modifications ne doivent pas être majeures, sinon votre formulaire risque d'être supprimé pour éviter toute fraude.\n\n` +
                             `Vous devrez choisir de conserver ou supprimer les réponses existantes avant de pouvoir le modifier à nouveau.`;
             await handleSendNotification(student.id, message, false);
        }

        await handleAddActivity(ActivityType.FORM_VALIDATION_CANCELLED, currentUser.id, `A annulé la validation du formulaire "${formToUpdate.title}" pour l'étudiant ${student?.name || 'inconnu'}.`, formId);
        
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
    await handleAddActivity(ActivityType.USER_STATUS_CHANGED, currentUser!.id, `Le compte de ${user.name} a été ${statusText}.`, userId);
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
      await handleAddActivity(ActivityType.ADMIN_COIN_ADJUSTMENT, currentUser.id, details, userId);

      const finalBalance = user.coinBalance + increment;
      updateLocalUserState(userId, { coinBalance: finalBalance });

      alert("Ajustement des coins effectué !");
  };

  const handleSendComplaint = async (message: string) => {
    const admin = users.find(u => u.role === 'admin');
    if (!admin || !currentUser) return;

    const fullMessage = `Réclamation de ${currentUser.name} (${currentUser.email}):\n\n${message}`;
    await handleSendNotification(admin.id, fullMessage, false);
    
    alert('Votre réclamation a été envoyée avec succès.');
    setIsComplaintModalOpen(false);
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
    await handleAddActivity(ActivityType.AI_ANALYSIS_PERFORMED, currentUser.id, details, formIds.join(','));
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

      updateLocalUserState(currentUser.id, { coinBalance: currentUser.coinBalance - amount });
      updateLocalUserState(recipient.id, { coinBalance: recipient.coinBalance + amount });

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
          ActivityType.COIN_TRANSFER, currentUser.id,
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

  const handleUpdateSettings = async (newSettings: SystemSettings) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    try {
        await db.collection('settings').doc('general').update(newSettings);
        setSystemSettings(newSettings);
        await handleAddActivity(ActivityType.SYSTEM_SETTINGS_UPDATED, currentUser.id, "Mise à jour de la configuration système.");
        alert("Configuration mise à jour avec succès !");
    } catch (error) {
        console.error("Failed to update settings:", error);
        alert("Erreur lors de la mise à jour de la configuration.");
    }
  };

  const handleCreditAllUsers = async (amount: number, message: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    const students = users.filter(u => u.role === 'student');
    const batchSize = 450; // Firestore limit is 500
    
    try {
        const timestamp = new Date().toISOString();
        const chunks = [];
        for (let i = 0; i < students.length; i += batchSize) {
            chunks.push(students.slice(i, i + batchSize));
        }

        for (const chunk of chunks) {
            const batch = db.batch();
            chunk.forEach(student => {
                const userRef = db.collection('users').doc(student.id);
                batch.update(userRef, { coinBalance: firebase.firestore.FieldValue.increment(amount) });
                
                const txRef = db.collection('transactions').doc();
                batch.set(txRef, {
                    userId: student.id,
                    type: TransactionType.Credit,
                    amount: amount,
                    reason: TransactionReason.PROMOTIONAL_GIFT,
                    details: message,
                    createdAt: timestamp
                });

                const notifRef = db.collection('notifications').doc();
                batch.set(notifRef, {
                    userId: student.id,
                    message: `CADEAU : ${message}. Vous avez reçu ${amount} coins !`,
                    read: false,
                    createdAt: timestamp
                });
            });
            await batch.commit();
        }
        
        await handleAddActivity(ActivityType.PROMOTIONAL_CAMPAIGN, currentUser.id, `Campagne promo : ${amount} coins offerts à ${students.length} étudiants.`);
        alert("Promotion envoyée à tous les étudiants !");
        
    } catch (error) {
        console.error("Failed to credit all users:", error);
        alert("Une erreur est survenue lors de l'envoi de la promotion.");
    }
  };

  const renderPage = () => {
    if (!currentUser) return null;

    const userForms = currentUser.role === 'admin' ? forms : forms.filter(f => f.userId === currentUser.id);
    const userResponses = currentUser.role === 'admin' ? responses : responses.filter(r => userForms.map(f => f.id).includes(r.formId));
    const userTransactions = currentUser.role === 'admin' ? transactions : transactions.filter(t => t.userId === currentUser.id);
    const userNotifications = notifications.filter(n => n.userId === currentUser.id);
    const userAnalysisHistory = currentUser.role === 'admin' ? analysisHistory : analysisHistory.filter(h => h.userId === currentUser.id);
    const userPurchasedForms = purchasedForms.filter(p => p.userId === currentUser.id);

    switch (currentPage) {
      case 'tableau-de-bord':
        return <Dashboard 
                  user={currentUser} forms={userForms} responses={userResponses}
                  users={users} transactions={transactions} onNavigate={handleNavigate}
                  activities={activities} // Pass activities here
               />;
      case 'formulaires':
        return <Forms 
                  user={currentUser} forms={userForms} allForms={forms}
                  responses={responses} purchasedForms={userPurchasedForms}
                  addFormResponse={handleAddFormResponse} deleteFormResponse={handleDeleteFormResponse}
                  createForm={handleCreateForm} updateForm={handleUpdateForm}
                  deleteForm={handleDeleteForm} saveAndValidateForm={handleSaveAndValidateForm}
                  publishForm={handlePublishForm} users={users} onNavigate={handleNavigate}
                  handleRequestFormModification={handleRequestFormModification}
                  onModificationDecision={handleModificationDecision}
                  systemSettings={systemSettings}
               />;
      case 'bibliotheque':
        return <Library
                  currentUser={currentUser} publicForms={forms.filter(f => f.isPublic)}
                  purchasedForms={userPurchasedForms} responses={responses}
                  users={users} onPurchase={handlePurchaseForm}
                  systemSettings={systemSettings}
                />;
      case 'analyse':
        const purchasedFormObjects = userPurchasedForms
            .map(p => forms.find(f => f.id === p.formId))
            .filter((f): f is Form => f !== undefined);
        
        const analyzableForms = [...new Map([...userForms, ...purchasedFormObjects].map(item => [item['id'], item])).values()];

        return <Analysis 
                  user={currentUser} forms={analyzableForms} responses={responses} 
                  onTransaction={handleTransaction} analysisContext={analysisContext} 
                  onNavigate={handleNavigate} analysisHistory={userAnalysisHistory}
                  saveAnalysisToHistory={handleSaveAnalysisToHistory}
                  deleteAnalysisHistory={handleDeleteAnalysisHistory}
                  unlockedAnalysis={unlockedAnalysis}
                  systemSettings={systemSettings}
                />;
      case 'portefeuille':
        return <Wallet 
                    user={currentUser} transactions={userTransactions}
                    users={users} onCoinTransfer={handleCoinTransfer}
                />;
      case 'profil':
        return <Profile 
                  user={currentUser} onUpdateProfile={handleUpdateProfile}
               />;
      case 'notifications':
        return <NotificationsPage notifications={userNotifications} />;
      // Admin pages
      case 'etudiants':
        return <Students 
          users={users} forms={forms} responses={responses}
          onSendNotification={handleSendNotification} onUpdateUserStatus={handleUpdateUserStatus}
          onAdminCoinAdjustment={handleAdminCoinAdjustment} onUnvalidateForm={handleUnvalidateForm}
        />;
      case 'finances':
        return <Finance transactions={transactions} users={users}/>;
      case 'activite':
        return <ActivityPage activities={activities} users={users} />;
      case 'configuration':
        return <AdminConfiguration settings={systemSettings} users={users} onUpdateSettings={handleUpdateSettings} onCreditAllUsers={handleCreditAllUsers} />;
      default:
        return <Dashboard user={currentUser} forms={userForms} responses={userResponses} activities={activities} />;
    }
  };
  
  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900">
            <Spinner className="w-16 h-16 text-primary-600" />
        </div>
    );
  }

  if (!currentUser) {
    return <AuthPage onLogin={handleLogin} />;
  }
  
  const userNotifications = notifications.filter(n => n.userId === currentUser.id);

  return (
    <div className="relative min-h-screen bg-slate-100 dark:bg-slate-900 font-sans lg:flex">
      <Sidebar
        user={currentUser}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenComplaintModal={() => setIsComplaintModalOpen(true)}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Header 
          user={currentUser} onLogout={handleLogout} currentPage={currentPage}
          notifications={userNotifications} onMarkNotificationsRead={() => handleMarkNotificationsRead(currentUser.id)}
          theme={theme} onToggleTheme={handleToggleTheme}
          onNavigate={handleNavigate} setIsSidebarOpen={setIsSidebarOpen}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 pb-24 lg:pb-6">
          {renderPage()}
        </main>
      </div>
      <Chatbot user={currentUser} onNavigate={handleNavigate} />
      <ComplaintModal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        onSubmit={handleSendComplaint}
      />
      <InsufficientFundsModal
        isOpen={insufficientFundsInfo !== null}
        onClose={() => setInsufficientFundsInfo(null)}
        onNavigateToWallet={() => {
          handleNavigate('portefeuille');
          setInsufficientFundsInfo(null);
        }}
        requiredAmount={insufficientFundsInfo?.required || 0}
        currentBalance={insufficientFundsInfo?.balance || 0}
      />
    </div>
  );
};

export default App;
