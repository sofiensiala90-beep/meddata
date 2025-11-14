import React, { useState, useEffect } from 'react';
import { User, Form, FormResponse, Transaction, Notification, TransactionReason, TransactionType, AnalysisHistory, PurchasedForm, Activity, ActivityType } from './types';
import { mockUsers, mockForms, mockFormResponses, mockTransactions, mockNotifications, mockAnalysisHistory, mockPurchasedForms, mockActivities } from './data/mockData';

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

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('tableau-de-bord');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [analysisContext, setAnalysisContext] = useState<{ formIds: string[] } | null>(null);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [insufficientFundsInfo, setInsufficientFundsInfo] = useState<{ required: number; balance: number } | null>(null);


  // App-wide state
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [forms, setForms] = useState<Form[]>(mockForms);
  const [responses, setResponses] = useState<FormResponse[]>(mockFormResponses);
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistory[]>(mockAnalysisHistory);
  const [purchasedForms, setPurchasedForms] = useState<PurchasedForm[]>(mockPurchasedForms);
  const [activities, setActivities] = useState<Activity[]>(mockActivities);
  const [unlockedAnalysis, setUnlockedAnalysis] = useState<{userId: string; formId: string}[]>([]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // Effect to apply monthly fees
  useEffect(() => {
    const today = new Date();
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const monthlyFee = PLATFORM_FEES.MONTHLY;

    let tempUsers = [...users];
    let tempTransactions = [...transactions];
    let tempNotifications = [...notifications];
    let hasChanges = false;

    const students = tempUsers.filter(u => u.role === 'student');

    for (const student of students) {
        if (student.status !== 'active') continue;

        const firstBillDueDate = new Date(new Date(student.createdAt).getTime() + thirtyDaysInMs);
        if (today < firstBillDueDate) continue;

        const lastFeeTx = tempTransactions
            .filter(t => t.userId === student.id && t.reason === TransactionReason.MonthlyFee)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        let lastBillDate = lastFeeTx ? new Date(lastFeeTx.createdAt) : new Date(student.createdAt);
        let nextDueDate = new Date(lastBillDate.getTime() + thirtyDaysInMs);

        while (nextDueDate <= today) {
            hasChanges = true;
            const studentIndex = tempUsers.findIndex(u => u.id === student.id);
            const details = `Période du ${lastBillDate.toLocaleDateString('fr-FR')} au ${nextDueDate.toLocaleDateString('fr-FR')}`;

            if (tempUsers[studentIndex].coinBalance >= monthlyFee) {
                tempUsers[studentIndex].coinBalance -= monthlyFee;

                tempTransactions.unshift({
                    id: `tx-${Date.now()}-${student.id}`,
                    userId: student.id,
                    type: TransactionType.Debit,
                    amount: monthlyFee,
                    reason: TransactionReason.MonthlyFee,
                    createdAt: nextDueDate.toISOString(),
                    details: details,
                });

                tempNotifications.unshift({
                    id: `notif-${Date.now()}-${student.id}`,
                    userId: student.id,
                    message: `Les frais mensuels de ${monthlyFee} coins ont été prélevés. ${details}.`,
                    read: false,
                    createdAt: new Date().toISOString()
                });
            } else {
                tempUsers[studentIndex].status = 'suspended_payment';
                tempNotifications.unshift({
                    id: `notif-${Date.now()}-${student.id}`,
                    userId: student.id,
                    message: `Votre compte a été suspendu car le prélèvement des frais mensuels de ${monthlyFee} coins a échoué.`,
                    read: false,
                    createdAt: new Date().toISOString()
                });
                break; // Stop charging this user
            }

            lastBillDate = nextDueDate;
            nextDueDate = new Date(lastBillDate.getTime() + thirtyDaysInMs);
        }
    }

    if (hasChanges) {
        setUsers(tempUsers);
        setTransactions(tempTransactions);
        setNotifications(tempNotifications);
    }
  }, []); // Run only once on mount to simulate a cron job

  // Effect to update current user or log them out if their status changes
  useEffect(() => {
    if (currentUser) {
      const freshCurrentUser = users.find(u => u.id === currentUser.id);
      
      if (freshCurrentUser && JSON.stringify(freshCurrentUser) !== JSON.stringify(currentUser)) {
        setCurrentUser(freshCurrentUser);
      }
    }
  }, [users, currentUser]);

  const processOverdueFeesAndReactivate = (userToProcess: User, currentTransactions: Transaction[], currentNotifications: Notification[]) => {
    let updatedUser = { ...userToProcess };
    let tempTransactions = [...currentTransactions];
    let tempNotifications = [...currentNotifications];

    if (updatedUser.status !== 'suspended_payment') {
        return { updatedUser, tempTransactions, tempNotifications, wasReactivated: false };
    }

    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const monthlyFee = PLATFORM_FEES.MONTHLY;
    const today = new Date();
    
    const lastFeeTx = tempTransactions
        .filter(t => t.userId === updatedUser.id && t.reason === TransactionReason.MonthlyFee)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        
    let lastBillDate = lastFeeTx ? new Date(lastFeeTx.createdAt) : new Date(updatedUser.createdAt);
    let nextDueDate = new Date(lastBillDate.getTime() + thirtyDaysInMs);

    let feesPaid = false;
    while (nextDueDate <= today && updatedUser.coinBalance >= monthlyFee) {
        const details = `Période du ${lastBillDate.toLocaleDateString('fr-FR')} au ${nextDueDate.toLocaleDateString('fr-FR')}`;
        updatedUser.coinBalance -= monthlyFee;
        tempTransactions.unshift({
            id: `tx-${Date.now()}-${updatedUser.id}-fee`,
            userId: updatedUser.id,
            type: TransactionType.Debit,
            amount: monthlyFee,
            reason: TransactionReason.MonthlyFee,
            createdAt: nextDueDate.toISOString(),
            details: details,
        });
         tempNotifications.unshift({
            id: `notif-${Date.now()}-${updatedUser.id}-fee`,
            userId: updatedUser.id,
            message: `Les frais mensuels de ${monthlyFee} coins ont été prélevés. ${details}.`,
            read: false,
            createdAt: new Date().toISOString()
        });
        feesPaid = true;
        lastBillDate = nextDueDate;
        nextDueDate = new Date(lastBillDate.getTime() + thirtyDaysInMs);
    }
    
    // After paying fees, we check if there are any more due dates in the past.
    // If nextDueDate is in the future, it means all past fees are paid.
    let wasReactivated = false;
    if (feesPaid && nextDueDate > today) {
        updatedUser.status = 'active';
        tempNotifications.unshift({
            id: `notif-${Date.now()}-${updatedUser.id}-reactivate`,
            userId: updatedUser.id,
            message: "Votre compte a été réactivé avec succès suite au paiement de vos frais.",
            read: false,
            createdAt: new Date().toISOString()
        });
        wasReactivated = true;
    }

    return { updatedUser, tempTransactions, tempNotifications, wasReactivated };
  };

  const handleAddActivity = (type: ActivityType, userId: string, details: string, targetId?: string) => {
    const newActivity: Activity = {
      id: `activity-${Date.now()}`,
      userId,
      type,
      details,
      targetId,
      createdAt: new Date().toISOString(),
    };
    setActivities(prev => [newActivity, ...prev]);
  };


  const handleToggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentPage('tableau-de-bord');
  };

  const handleCreateUser = (newUserData: Omit<User, 'id' | 'createdAt' | 'role' | 'coinBalance' | 'status'>) => {
    const newUser: User = {
      ...newUserData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
      role: 'student',
      coinBalance: 500, // Starting balance
      status: 'active',
    };
    
    setUsers(prev => [...prev, newUser]);
    
    const welcomeNotification: Notification = {
      id: `notif-${Date.now()}`,
      userId: newUser.id,
      message: 'Bienvenue sur MedataAI ! Votre solde de départ est de 500 coins.',
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [welcomeNotification, ...prev]);

    handleAddActivity(ActivityType.ACCOUNT_CREATED, newUser.id, `Le compte de ${newUser.name} a été créé.`);

    handleLogin(newUser); // Automatically log in the new user
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleNavigate = (page: string, context: any = null) => {
    setCurrentPage(page);
    setAnalysisContext(context);
  };
  
  const handleTransaction = (userId: string, reason: TransactionReason, context?: { form?: Form, formIds?: string[], formTitles?: string[] }): boolean => {
    const user = users.find(u => u.id === userId);
    if (!user || user.role === 'admin') return true; // Admins have infinite coins
    
    if (user.status.startsWith('suspended')) {
        if (user.status === 'suspended_manual') {
            alert("Votre compte a été suspendu par un administrateur. Vous ne pouvez pas effectuer cette action. Veuillez contacter le support.");
        } else { // suspended_payment
            alert("Votre compte est suspendu. Vous ne pouvez pas effectuer cette action. Veuillez recharger votre portefeuille.");
        }
        return false;
    }

    let cost = 0;
    let details = '';
    let formsToUnlock: string[] = [];

    switch(reason) {
      case TransactionReason.FormValidation:
        cost = context?.form?.origin === 'purchased' 
            ? COIN_COSTS.VALIDATE_PURCHASED_FORM 
            : COIN_COSTS.VALIDATE_FORM;
        details = `Validation du formulaire : "${context?.form?.title || 'N/A'}"`;
        break;
      case TransactionReason.FormResponse:
        cost = COIN_COSTS.ADD_RESPONSE;
        details = `Ajout de réponse au formulaire : "${context?.form?.title || 'N/A'}"`;
        break;
      case TransactionReason.AiRequest:
        if (!context?.formIds || context.formIds.length === 0) return false;
        formsToUnlock = context.formIds.filter(formId => !unlockedAnalysis.some(ua => ua.userId === userId && ua.formId === formId));
        
        if (formsToUnlock.length === 0) {
            return true; // All forms already unlocked, no cost.
        }
        
        cost = formsToUnlock.length * COIN_COSTS.AI_ANALYSIS;
        const formTitlesToUnlock = context.formTitles?.filter((title, index) => formsToUnlock.includes(context.formIds![index]));
        details = `Déblocage de l'analyse IA pour ${formsToUnlock.length} formulaire(s): "${formTitlesToUnlock?.join('", "')}"`;
        break;
      default:
        return true; 
    }
    
    if (user.coinBalance < cost) {
      setInsufficientFundsInfo({ required: cost, balance: user.coinBalance });
      return false;
    }

    const newTransaction: Transaction = {
      id: `tx-${Date.now()}`,
      userId,
      type: TransactionType.Debit,
      amount: cost,
      reason,
      details,
      createdAt: new Date().toISOString()
    };
    
    const newNotification: Notification = {
        id: `notif-${Date.now()}-${userId}`,
        userId,
        message: `Transaction : ${details}. Montant : -${cost} coins.`,
        read: false,
        createdAt: new Date().toISOString()
    };
    
    setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, coinBalance: u.coinBalance - cost } : u));
    setTransactions(prev => [newTransaction, ...prev]);
    setNotifications(prev => [newNotification, ...prev]);

    if (reason === TransactionReason.AiRequest && formsToUnlock.length > 0) {
        const newUnlocks = formsToUnlock.map(formId => ({ userId, formId }));
        setUnlockedAnalysis(prev => [...prev, ...newUnlocks]);
    }
    
    if (currentUser?.id === userId) {
        setCurrentUser(prev => prev ? { ...prev, coinBalance: prev.coinBalance - cost } : null);
    }
    
    return true;
  };

  const handleAddFormResponse = (formId: string, data: Record<string, any>) => {
      if(!currentUser) return;
      const form = forms.find(f => f.id === formId);
      if (!form) {
          alert("Erreur: Formulaire introuvable.");
          return;
      }
      if (!handleTransaction(currentUser.id, TransactionReason.FormResponse, { form: form })) return;

      const newResponse: FormResponse = {
          id: `resp-${Date.now()}`,
          userId: currentUser.id,
          formId,
          data,
          createdAt: new Date().toISOString()
      };
      setResponses(prev => [...prev, newResponse]);
      handleAddActivity(ActivityType.RESPONSE_ADDED, currentUser.id, `Nouvelle réponse ajoutée au formulaire "${form.title}".`, form.id);
      alert("Réponse soumise avec succès !");
  };
  
  const handleDeleteFormResponse = (responseId: string) => {
    setResponses(prev => prev.filter(r => r.id !== responseId));
    alert("Réponse supprimée avec succès !");
  };

  const handleCreateForm = (newForm: Form) => {
    setForms(prev => [newForm, ...prev]);
    handleAddActivity(ActivityType.FORM_CREATED, newForm.userId, `Le formulaire "${newForm.title}" a été créé en tant que brouillon.`, newForm.id);
  };

  const handleUpdateForm = (updatedForm: Form) => {
      setForms(prevForms => prevForms.map(f => f.id === updatedForm.id ? updatedForm : f));
  };

  const handleSaveAndValidateForm = (formToValidate: Form) => {
    if (!currentUser) return;
    
    // The form object is passed directly from the builder, so it's up-to-date.
    if (!handleTransaction(currentUser.id, TransactionReason.FormValidation, { form: formToValidate })) {
        return; // Transaction failed (e.g., insufficient funds), so we stop.
    }

    const formExistsInState = forms.some(f => f.id === formToValidate.id);

    if (formExistsInState) {
        // Update existing form and validate it
        setForms(prevForms => prevForms.map(f => f.id === formToValidate.id ? { ...formToValidate, validated: true } : f));
        handleAddActivity(ActivityType.FORM_VALIDATED, currentUser.id, `Le formulaire "${formToValidate.title}" a été validé.`, formToValidate.id);
    } else {
        // Create new form and validate it
        setForms(prevForms => [{ ...formToValidate, validated: true }, ...prevForms]);
        handleAddActivity(ActivityType.FORM_CREATED, currentUser.id, `Le formulaire "${formToValidate.title}" a été créé.`, formToValidate.id);
        handleAddActivity(ActivityType.FORM_VALIDATED, currentUser.id, `Le formulaire "${formToValidate.title}" a été validé.`, formToValidate.id);
    }
  };
  
  const handlePublishForm = (formId: string, price: number, pricePerResponse: number) => {
    const formToPublish = forms.find(f => f.id === formId);
    if (!formToPublish || !formToPublish.validated) {
        alert("Seuls les formulaires validés peuvent être publiés.");
        return;
    }

    setForms(prev => prev.map(f => f.id === formId ? { ...f, isPublic: true, price, pricePerResponse } : f));
    handleSendNotification(formToPublish.userId, `Votre formulaire "${formToPublish.title}" a été publié dans la bibliothèque !`, false);
    handleAddActivity(ActivityType.FORM_PUBLISHED, formToPublish.userId, `Le formulaire "${formToPublish.title}" a été publié dans la bibliothèque.`, formId);
    alert("Formulaire publié avec succès !");
};

const handlePurchaseForm = (formToBuy: Form, withResponses: boolean) => {
    if (!currentUser) return;

    if (formToBuy.userId === currentUser.id) {
        alert("Vous ne pouvez pas acheter votre propre formulaire.");
        return;
    }
    const creator = users.find(u => u.id === formToBuy.userId);
    const platformAdmin = users.find(u => u.role === 'admin');
    if (!creator || !platformAdmin) {
        alert("Erreur : Créateur ou administrateur introuvable.");
        return;
    }

    const availableResponseCount = responses.filter(r => r.formId === formToBuy.id).length;
    const formCost = formToBuy.price;
    const responsesCost = withResponses ? (availableResponseCount * formToBuy.pricePerResponse) : 0;
    const totalCost = formCost + responsesCost;

    if (currentUser.coinBalance < totalCost) {
        setInsufficientFundsInfo({ required: totalCost, balance: currentUser.coinBalance });
        return;
    }

    const creatorFormCommission = formCost * COMMISSION_RATES.CREATOR_FORM_SALE;
    const creatorResponsesCommission = responsesCost * COMMISSION_RATES.CREATOR_RESPONSE_SALE;
    const totalCreatorCommission = creatorFormCommission + creatorResponsesCommission;
    const platformCommission = totalCost - totalCreatorCommission;
    const purchaseTimestamp = new Date().toISOString();
    
    // --- Transactions and state updates ---
    const newTransactions: Transaction[] = [];

    setUsers(prevUsers => prevUsers.map(u => {
        if (u.id === currentUser.id) return { ...u, coinBalance: u.coinBalance - totalCost };
        if (u.id === creator.id) return { ...u, coinBalance: u.coinBalance + totalCreatorCommission };
        return u;
    }));

    newTransactions.push({ id: `tx-buy-form-${Date.now()}`, userId: currentUser.id, type: TransactionType.Debit, amount: formCost, reason: TransactionReason.FormPurchase, createdAt: purchaseTimestamp, details: `Achat du formulaire : "${formToBuy.title}"` });
    if (withResponses && responsesCost > 0) {
        newTransactions.push({ id: `tx-buy-resp-${Date.now()}`, userId: currentUser.id, type: TransactionType.Debit, amount: responsesCost, reason: TransactionReason.ResponseBundlePurchase, createdAt: purchaseTimestamp, details: `Achat de ${availableResponseCount} réponses pour : "${formToBuy.title}"` });
    }
    newTransactions.push({ id: `tx-sale-${Date.now()}`, userId: creator.id, type: TransactionType.Credit, amount: totalCreatorCommission, reason: TransactionReason.FormSaleCommission, createdAt: purchaseTimestamp, details: `Vente de votre formulaire : "${formToBuy.title}"` });
    if (platformCommission > 0) {
        newTransactions.push({id: `tx-platform-fee-${Date.now()}`, userId: platformAdmin.id, type: TransactionType.Credit, amount: platformCommission, reason: TransactionReason.PlatformCommission, createdAt: purchaseTimestamp, details: `Commission sur la vente de : "${formToBuy.title}"`})
    }
    setTransactions(prev => [...newTransactions, ...prev]);

    // --- Logic for what the user receives ---
    if (withResponses) {
        // User buys the form AND responses (for analysis)
        const newPurchase: PurchasedForm = {
            id: `purch-${Date.now()}`,
            userId: currentUser.id,
            formId: formToBuy.id,
            purchasedAt: purchaseTimestamp,
            withResponses: true,
            purchasePrice: totalCost,
        };
        setPurchasedForms(prev => [...prev, newPurchase]);
        handleSendNotification(currentUser.id, `Vous avez acheté le formulaire "${formToBuy.title}" et ses réponses pour ${totalCost} coins. Retrouvez-le dans "Mes Achats".`, false);
    } else {
        // User buys the form WITHOUT responses (as a template)
        const newFormCopy: Form = {
            id: `form-copy-${Date.now()}`,
            userId: currentUser.id,
            title: `${formToBuy.title} (Copie)`,
            description: formToBuy.description,
            schema: JSON.parse(JSON.stringify(formToBuy.schema)), // Deep copy
            validated: false,
            createdAt: purchaseTimestamp,
            isPublic: false,
            price: 0,
            pricePerResponse: 0,
            origin: 'purchased'
        };
        setForms(prev => [newFormCopy, ...prev]);
        handleSendNotification(currentUser.id, `Vous avez acheté le modèle "${formToBuy.title}" pour ${totalCost} coins. Vous pouvez le modifier dans "Mes Formulaires".`, false);
    }

    handleSendNotification(creator.id, `Votre formulaire "${formToBuy.title}" a été acheté ! Vous avez gagné ${totalCreatorCommission} coins.`, false);
    
    const purchaseDetails = `Le formulaire "${formToBuy.title}" a été acheté par ${currentUser.name}` + (withResponses ? ' avec les réponses.' : '.');
    handleAddActivity(ActivityType.FORM_PURCHASED, currentUser.id, purchaseDetails, formToBuy.id);
    
    alert("Achat réussi !");
    return true; 
};

  const handleUpdateProfile = (updatedUser: User) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser?.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
    alert("Profil mis à jour !");
  };

  const handleUpdatePassword = (userId: string, currentPass: string, newPass: string): { success: boolean; message: string } => {
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return { success: false, message: 'Utilisateur non trouvé.' };
    }
    
    const user = users[userIndex];
    if (user.password !== currentPass) {
      return { success: false, message: 'Le mot de passe actuel est incorrect.' };
    }

    const updatedUsers = [...users];
    updatedUsers[userIndex] = { ...user, password: newPass };
    setUsers(updatedUsers);

    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, password: newPass } : null);
    }
    
    return { success: true, message: 'Mot de passe mis à jour avec succès !' };
  };

  const handleSendNotification = (userId: string, message: string, showAlert = true) => {
    const newNotification: Notification = {
      id: `notif-${Date.now()}`,
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [newNotification, ...prev]);
    if (showAlert) {
      alert('Notification envoyée !');
    }
  };

  const handleMarkNotificationsRead = (userId: string) => {
    setTimeout(() => {
        setNotifications(prev =>
        prev.map(n => (n.userId === userId && !n.read ? { ...n, read: true } : n))
      );
    }, 1000); // Delay to allow user to see the notification
  };

  const handleUpdateUserStatus = (userId: string, status: User['status']) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, status } : u)));
    const statusText = status.startsWith('suspended') ? 'suspendu' : 'réactivé';
    handleAddActivity(ActivityType.USER_STATUS_CHANGED, 'user-2', `Le compte de ${user.name} a été ${statusText}.`, userId);
  };

  const handleAdminCoinAdjustment = (userId: string, amount: number, type: TransactionType) => {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const parsedAmount = Math.abs(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        alert("Veuillez entrer un montant valide.");
        return;
      }

      const newBalance = type === TransactionType.Credit ? user.coinBalance + parsedAmount : user.coinBalance - parsedAmount;
      if (newBalance < 0) {
          alert("L'ajustement rendrait le solde négatif.");
          return;
      }

      const newTransaction: Transaction = {
          id: `tx-${Date.now()}`,
          userId,
          type,
          amount: parsedAmount,
          reason: TransactionReason.AdminAdjustment,
          createdAt: new Date().toISOString(),
          details: `Ajustement de ${parsedAmount} coins par un administrateur`,
      };
      
      let tempUsers = [...users];
      const userIndex = tempUsers.findIndex(u => u.id === userId);
      let updatedUser = { ...tempUsers[userIndex], coinBalance: newBalance };
      let tempTransactions = [newTransaction, ...transactions];
      let tempNotifications = [...notifications];

      // If we credited a user suspended for payment, try to pay their debts and reactivate
      if (type === TransactionType.Credit && updatedUser.status === 'suspended_payment') {
          const reactivationResult = processOverdueFeesAndReactivate(updatedUser, tempTransactions, tempNotifications);
          updatedUser = reactivationResult.updatedUser;
          tempTransactions = reactivationResult.tempTransactions;
          tempNotifications = reactivationResult.tempNotifications;
      }

      tempUsers[userIndex] = updatedUser;

       const notificationMessage = `Un administrateur a ${type === TransactionType.Credit ? 'crédité' : 'débité'} ${parsedAmount} coins sur votre compte. Votre nouveau solde est de ${newBalance} coins.`;
        tempNotifications.unshift({
            id: `notif-admin-adj-${Date.now()}`,
            userId,
            message: notificationMessage,
            read: false,
            createdAt: new Date().toISOString(),
        });
      
      const actionText = type === TransactionType.Credit ? 'crédité de' : 'débité de';
      handleAddActivity(ActivityType.ADMIN_COIN_ADJUSTMENT, 'user-2', `Le compte de ${user.name} a été ${actionText} ${parsedAmount} coins.`, userId);

      setUsers(tempUsers);
      setTransactions(tempTransactions);
      setNotifications(tempNotifications);
      alert("Ajustement des coins effectué !");
  };

  const handleSendComplaint = (message: string) => {
    const admin = users.find(u => u.role === 'admin');
    if (!admin || !currentUser) {
        alert("Erreur: Impossible de trouver un destinataire administrateur.");
        return;
    }

    const fullMessage = `Réclamation de ${currentUser.name} (${currentUser.email}):\n\n${message}`;
    handleSendNotification(admin.id, fullMessage, false);
    
    alert('Votre réclamation a été envoyée avec succès.');
    setIsComplaintModalOpen(false);
  };

  const handleSaveAnalysisToHistory = (formIds: string[], formTitles: string[], userPrompt: string, analysisResult: any) => {
    if (!currentUser) return;
    const newHistoryItem: AnalysisHistory = {
      id: `hist-${Date.now()}`,
      userId: currentUser.id,
      formIds,
      formTitles,
      userPrompt,
      analysisResult,
      createdAt: new Date().toISOString()
    };
    setAnalysisHistory(prev => [newHistoryItem, ...prev]);
    const details = `Analyse IA effectuée sur le(s) formulaire(s) : "${formTitles.join('", "')}".`;
    handleAddActivity(ActivityType.AI_ANALYSIS_PERFORMED, currentUser.id, details, formIds.join(','));
  };

  const handleDeleteAnalysisHistory = (historyId: string) => {
    setAnalysisHistory(prev => prev.filter(item => item.id !== historyId));
  };

  const handleCoinTransfer = (recipientEmail: string, amount: number): boolean => {
    if (!currentUser) return false;

    if (currentUser.status.startsWith('suspended')) {
      alert("Votre compte est suspendu. Vous ne pouvez pas transférer de coins.");
      return false;
    }

    const recipient = users.find(u => u.email.toLowerCase() === recipientEmail.toLowerCase() && u.role === 'student');

    if (!recipient) {
      alert("Aucun étudiant trouvé avec cette adresse e-mail.");
      return false;
    }

    if (recipient.id === currentUser.id) {
      alert("Vous ne pouvez pas vous transférer des coins à vous-même.");
      return false;
    }
    
    if (amount < 100) {
        alert("Le montant minimum pour un transfert est de 100 coins.");
        return false;
    }

    if (currentUser.coinBalance < amount) {
      setInsufficientFundsInfo({ required: amount, balance: currentUser.coinBalance });
      return false;
    }

    const transferTimestamp = new Date().toISOString();
    
    const senderTransaction: Transaction = {
      id: `tx-transfer-sent-${Date.now()}`,
      userId: currentUser.id,
      type: TransactionType.Debit,
      amount,
      reason: TransactionReason.COIN_TRANSFER_SENT,
      createdAt: transferTimestamp,
      details: `Transfert à ${recipient.name} (${recipient.email})`,
    };
    
    const recipientTransaction: Transaction = {
      id: `tx-transfer-received-${Date.now()}`,
      userId: recipient.id,
      type: TransactionType.Credit,
      amount,
      reason: TransactionReason.COIN_TRANSFER_RECEIVED,
      createdAt: transferTimestamp,
      details: `Reçu de ${currentUser.name} (${currentUser.email})`,
    };
    
    let newTransactions = [senderTransaction, recipientTransaction, ...transactions];
    let newNotifications = [...notifications];
    let tempUsers = [...users];

    const senderIndex = tempUsers.findIndex(u => u.id === currentUser.id);
    if(senderIndex !== -1) {
        tempUsers[senderIndex] = { ...tempUsers[senderIndex], coinBalance: tempUsers[senderIndex].coinBalance - amount };
    }

    const recipientIndex = tempUsers.findIndex(u => u.id === recipient.id);
    let wasReactivated = false;

    if(recipientIndex !== -1) {
        let updatedRecipient = { ...tempUsers[recipientIndex], coinBalance: tempUsers[recipientIndex].coinBalance + amount };
        
        if (updatedRecipient.status === 'suspended_payment') {
            const reactivationResult = processOverdueFeesAndReactivate(updatedRecipient, newTransactions, newNotifications);
            updatedRecipient = reactivationResult.updatedUser;
            newTransactions = reactivationResult.tempTransactions;
            newNotifications = reactivationResult.tempNotifications;
            wasReactivated = reactivationResult.wasReactivated;
        }

        tempUsers[recipientIndex] = updatedRecipient;
    }
    
    if (wasReactivated) {
        newNotifications.unshift({
            id: `notif-sent-${Date.now()}`,
            userId: currentUser.id,
            message: `Votre transfert de ${amount} coins à ${recipient.name} a été effectué. Ces fonds ont permis de réactiver son compte.`,
            read: false,
            createdAt: transferTimestamp,
        });
        newNotifications.unshift({
            id: `notif-received-${Date.now()}`,
            userId: recipient.id,
            message: `Vous avez reçu ${amount} coins de la part de ${currentUser.name}. Ces fonds ont été utilisés pour régler vos frais en attente.`,
            read: false,
            createdAt: transferTimestamp,
        });
    } else {
        newNotifications.unshift({
            id: `notif-sent-${Date.now()}`,
            userId: currentUser.id,
            message: `Votre transfert de ${amount} coins à ${recipient.name} a été effectué.`,
            read: false,
            createdAt: transferTimestamp,
        });
        newNotifications.unshift({
            id: `notif-received-${Date.now()}`,
            userId: recipient.id,
            message: `Vous avez reçu ${amount} coins de la part de ${currentUser.name}.`,
            read: false,
            createdAt: transferTimestamp,
        });
    }

    setTransactions(newTransactions);
    setUsers(tempUsers);
    setNotifications(newNotifications);
    
    const transferDetails = `Transfert de ${amount} coins de ${currentUser.name} à ${recipient.name}.`;
    handleAddActivity(ActivityType.COIN_TRANSFER, currentUser.id, transferDetails, recipient.id);

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
                  onUpdatePassword={handleUpdatePassword}
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

  if (!currentUser) {
    return <AuthPage onLogin={handleLogin} onCreateUser={handleCreateUser} users={users} />;
  }
  
  const userNotifications = notifications.filter(n => n.userId === currentUser.id);

  return (
    <div className="relative min-h-screen bg-slate-100 dark:bg-slate-900 font-sans lg:flex">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
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
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
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