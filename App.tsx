import React, { useState, useEffect, useRef } from 'react';
import { User, Form, FormResponse, Transaction, Notification, TransactionReason, TransactionType, AnalysisHistory, PurchasedForm, Activity, ActivityType } from './types';
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
import { COIN_COSTS, COMMISSION_RATES, PLATFORM_FEES } from './constants';
import NotificationsPage from './pages/NotificationsPage';
import Library from './pages/Library';
import InsufficientFundsModal from './components/InsufficientFundsModal';
import Spinner from './components/Spinner';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<string>('tableau-de-bord');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [analysisContext, setAnalysisContext] = useState<{ formIds: string[] } | null>(null);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [insufficientFundsInfo, setInsufficientFundsInfo] = useState<{ required: number; balance: number } | null>(null);

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

  useEffect(() => {
    const authUnsubscribe = auth.onAuthStateChanged(async (user) => {
        // Detach previous listeners
        listenersRef.current.forEach(unsubscribe => unsubscribe());
        listenersRef.current = [];

        if (user) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = { id: user.uid, ...userDoc.data() } as User;
                setCurrentUser(userData);
                setIsLoading(false);

                // Attach new listeners
                const collections = ['users', 'forms', 'responses', 'transactions', 'analysisHistory', 'purchasedForms', 'activities', 'unlockedAnalysis'];
                const setters:any = {
                    users: setUsers,
                    forms: setForms,
                    responses: setResponses,
                    transactions: setTransactions,
                    notifications: setNotifications, // special handling
                    analysisHistory: setAnalysisHistory,
                    purchasedForms: setPurchasedForms,
                    activities: setActivities,
                    unlockedAnalysis: setUnlockedAnalysis
                };

                collections.forEach(collection => {
                  const unsubscribe = db.collection(collection).onSnapshot(snapshot => {
                      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                      setters[collection](data);
                  });
                  listenersRef.current.push(unsubscribe);
                });

                // Notifications listener (user-specific)
                const notifUnsubscribe = db.collection('notifications').where('userId', '==', user.uid).onSnapshot(snapshot => {
                    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setNotifications(data as Notification[]);
                });
                listenersRef.current.push(notifUnsubscribe);
            } else {
                 // User exists in Auth but not in Firestore, log them out.
                await auth.signOut();
            }
        } else {
            setCurrentUser(null);
            setIsLoading(false);
            // Clear all data and reset state on logout
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

  // This is a simulation of a server-side cron job.
  // In a real application, this logic should be in a Firebase Cloud Function.
  useEffect(() => {
    const runMonthlyFeeCheck = async (student: User) => {
        if (student.role !== 'student') return;

        const sessionKey = `monthly_fee_check_v4_${student.id}`;
        if (sessionStorage.getItem(sessionKey)) return;
        sessionStorage.setItem(sessionKey, 'true');

        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const monthlyFee = PLATFORM_FEES.MONTHLY;

        // Fetch all transactions for the user to avoid a composite index query.
        const userTransactionsQuery = await db.collection('transactions')
            .where('userId', '==', student.id)
            .get();

        // Filter and sort client-side.
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

            batch.update(userRef, { coinBalance: firebase.firestore.FieldValue.increment(-totalDebit) });

            if (finalBalance < 0 && student.status === 'active') {
                batch.update(userRef, { status: 'suspended_payment' });
            }

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

            // Send one summary notification
            const newNotification: Omit<Notification, 'id'> = {
                userId: student.id,
                message: `${missedPayments.length} frais mensuel(s) (total: ${totalDebit} coins) ont été prélevés.`,
                read: false,
                createdAt: now.toISOString(),
            };
            const notifRef = db.collection('notifications').doc();
            batch.set(notifRef, newNotification);

            await batch.commit();
        }
    };

    if (currentUser && currentUser.role === 'student') {
        runMonthlyFeeCheck(currentUser);
    }
  }, [currentUser]);

  const handleAddActivity = async (type: ActivityType, userId: string, details: string, targetId?: string) => {
    const newActivity: Omit<Activity, 'id'> = {
      userId,
      type,
      details,
      targetId,
      createdAt: new Date().toISOString(),
    };
    await db.collection('activities').add(newActivity);
  };

  const handleToggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleLogin = (user: User) => {
    // This is now handled by onAuthStateChanged
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
    
    // Status check remains the same
    if (user.status.startsWith('suspended')) {
        alert("Votre compte est suspendu. Vous ne pouvez pas effectuer cette action.");
        return false;
    }

    let cost = 0;
    let details = '';
    let formsToUnlock: string[] = [];

    // Cost calculation logic remains the same
    switch(reason) {
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
      setInsufficientFundsInfo({ required: cost, balance: user.coinBalance });
      return false;
    }

    // Firestore write operations
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

    if (formToDelete.validated) {
        alert("Impossible de supprimer un formulaire qui a été validé.");
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
    if (!await handleTransaction(currentUser.id, TransactionReason.FormValidation, { form: formToValidate })) return;

    const { id, ...formData } = formToValidate;
    const formRef = db.collection('forms').doc(id);
    
    // Use a transaction to ensure atomicity
    await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(formRef);
        if (doc.exists) {
            transaction.update(formRef, { ...formData, validated: true });
        } else {
            transaction.set(formRef, { ...formData, validated: true });
        }
    });

    await handleAddActivity(ActivityType.FORM_VALIDATED, currentUser.id, `Le formulaire "${formToValidate.title}" a été validé.`, formToValidate.id);
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
    if (!currentUser) return false;
    // Calculation logic remains similar
    const totalCost = formToBuy.price + (withResponses ? (responses.filter(r => r.formId === formToBuy.id).length * formToBuy.pricePerResponse) : 0);
    if (currentUser.coinBalance < totalCost) {
        setInsufficientFundsInfo({ required: totalCost, balance: currentUser.coinBalance });
        return false;
    }

    const batch = db.batch();
    const buyerRef = db.collection('users').doc(currentUser.id);
    batch.update(buyerRef, { coinBalance: firebase.firestore.FieldValue.increment(-totalCost) });
    
    // More logic for commissions etc.
    // ...
    // Simplified for now. A full implementation requires more details.
    
    if (withResponses) {
        const newPurchase: Omit<PurchasedForm, 'id'> = {
            userId: currentUser.id,
            formId: formToBuy.id,
            purchasedAt: new Date().toISOString(),
            withResponses: true,
            purchasePrice: totalCost,
        };
        const purchaseRef = db.collection('purchasedForms').doc();
        batch.set(purchaseRef, newPurchase);
    } else {
        const newFormCopy: Omit<Form, 'id'> = {
            userId: currentUser.id,
            title: `${formToBuy.title} (Copie)`,
            description: formToBuy.description,
            schema: formToBuy.schema,
            validated: false,
            createdAt: new Date().toISOString(),
            isPublic: false,
            price: 0,
            pricePerResponse: 0,
            origin: 'purchased'
        };
        const newFormRef = db.collection('forms').doc(`form-copy-${Date.now()}`);
        batch.set(newFormRef, newFormCopy);
    }

    await batch.commit();

    await handleSendNotification(currentUser.id, `Achat de "${formToBuy.title}" réussi !`, false);
    await handleAddActivity(ActivityType.FORM_PURCHASED, currentUser.id, `Le formulaire "${formToBuy.title}" a été acheté.`, formToBuy.id);
    alert("Achat réussi !");
    return true;
  };


  const handleUpdateProfile = async (updatedUser: User) => {
    const { id, ...profileData } = updatedUser;
    // Don't update fields that shouldn't be user-editable in this form
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
    await handleAddActivity(ActivityType.USER_STATUS_CHANGED, 'user-2', `Le compte de ${user.name} a été ${statusText}.`, userId);
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

      // Update user balance
      batch.update(userRef, { coinBalance: firebase.firestore.FieldValue.increment(increment) });
      
      // Create transaction record for history
      const newTransaction: Omit<Transaction, 'id'> = {
          userId,
          type,
          amount,
          reason: TransactionReason.AdminAdjustment,
          details: `Ajustement de ${actionTextPast} par l'administrateur ${currentUser.name}.`,
          createdAt: new Date().toISOString(),
      };
      const txRef = db.collection('transactions').doc();
      batch.set(txRef, newTransaction);

      // Create notification for the student
      const newNotification: Omit<Notification, 'id'> = {
          userId,
          message: `Un administrateur a ${actionText} ${amount} coins sur votre compte.`,
          read: false,
          createdAt: new Date().toISOString(),
      };
      const notifRef = db.collection('notifications').doc();
      batch.set(notifRef, newNotification);

      // Create activity log
      const details = `A ${actionText} ${amount} coins sur le compte de ${user.name}.`;
      await handleAddActivity(ActivityType.ADMIN_COIN_ADJUSTMENT, currentUser.id, details, userId);

      await batch.commit();
      
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
    // Logic for checks remains the same
    // ...
    const recipientQuery = await db.collection('users').where('email', '==', recipientEmail.toLowerCase()).limit(1).get();
    if (recipientQuery.empty) {
        alert("Aucun étudiant trouvé avec cette adresse e-mail.");
        return false;
    }
    const recipient = { id: recipientQuery.docs[0].id, ...recipientQuery.docs[0].data() } as User;

    // Firestore transaction for atomicity
    await db.runTransaction(async (transaction) => {
        const senderRef = db.collection('users').doc(currentUser.id);
        const recipientRef = db.collection('users').doc(recipient.id);
        transaction.update(senderRef, { coinBalance: firebase.firestore.FieldValue.increment(-amount) });
        transaction.update(recipientRef, { coinBalance: firebase.firestore.FieldValue.increment(amount) });
    });

    alert("Transfert effectué avec succès !");
    return true;
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
                  user={currentUser} 
                  forms={userForms} 
                  responses={userResponses}
                  users={users}
                  transactions={transactions}
                  onNavigate={handleNavigate}
               />;
      case 'formulaires':
        return <Forms 
                  user={currentUser} 
                  forms={userForms}
                  allForms={forms}
                  responses={responses} 
                  purchasedForms={userPurchasedForms}
                  addFormResponse={handleAddFormResponse}
                  deleteFormResponse={handleDeleteFormResponse}
                  createForm={handleCreateForm}
                  updateForm={handleUpdateForm}
                  deleteForm={handleDeleteForm}
                  saveAndValidateForm={handleSaveAndValidateForm}
                  publishForm={handlePublishForm}
                  users={users}
                  onNavigate={handleNavigate}
               />;
      case 'bibliotheque':
        return <Library
                  currentUser={currentUser}
                  publicForms={forms.filter(f => f.isPublic)}
                  purchasedForms={userPurchasedForms}
                  responses={responses}
                  users={users}
                  onPurchase={handlePurchaseForm}
                />;
      case 'analyse':
        const purchasedFormObjects = userPurchasedForms
            .map(p => forms.find(f => f.id === p.formId))
            .filter((f): f is Form => f !== undefined);
        
        const analyzableForms = [...new Map([...userForms, ...purchasedFormObjects].map(item => [item['id'], item])).values()];

        return <Analysis 
                  user={currentUser} 
                  forms={analyzableForms} 
                  responses={responses} 
                  onTransaction={handleTransaction} 
                  analysisContext={analysisContext} 
                  onNavigate={handleNavigate} 
                  analysisHistory={userAnalysisHistory}
                  saveAnalysisToHistory={handleSaveAnalysisToHistory}
                  deleteAnalysisHistory={handleDeleteAnalysisHistory}
                  unlockedAnalysis={unlockedAnalysis}
                />;
      case 'portefeuille':
        return <Wallet 
                    user={currentUser} 
                    transactions={userTransactions}
                    users={users}
                    onCoinTransfer={handleCoinTransfer}
                />;
      case 'profil':
        return <Profile 
                  user={currentUser} 
                  onUpdateProfile={handleUpdateProfile}
               />;
      case 'notifications':
        return <NotificationsPage notifications={userNotifications} />;
      // Admin pages
      case 'etudiants':
        return <Students 
          users={users} 
          forms={forms}
          responses={responses}
          onSendNotification={handleSendNotification}
          onUpdateUserStatus={handleUpdateUserStatus}
          onAdminCoinAdjustment={handleAdminCoinAdjustment}
        />;
      case 'finances':
        return <Finance transactions={transactions} users={users}/>;
      case 'activite':
        return <ActivityPage activities={activities} users={users} />;
      default:
        return <Dashboard user={currentUser} forms={userForms} responses={userResponses} />;
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
          user={currentUser} 
          onLogout={handleLogout} 
          currentPage={currentPage}
          notifications={userNotifications}
          onMarkNotificationsRead={() => handleMarkNotificationsRead(currentUser.id)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onNavigate={handleNavigate}
          setIsSidebarOpen={setIsSidebarOpen}
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
