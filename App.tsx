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
import Toast from './components/Toast';

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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

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
  
  // Refs to manage response merging for students
  const studentResponsesRef = useRef<{ my: FormResponse[], owned: FormResponse[], purchased: FormResponse[] }>({ my: [], owned: [], purchased: [] });
  const listenersRef = useRef<(() => void)[]>([]);
  // Ref for purchased response listeners to avoid duplication
  const purchasedListenersRef = useRef<(() => void)[]>([]);
  
  const updateLocalUserState = (userId: string, updates: Partial<User>) => {
    setCurrentUser(prev => (prev?.id === userId ? { ...prev, ...updates } : prev));
    setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, ...updates } : u));
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
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
        // Cleanup all main listeners
        listenersRef.current.forEach(unsubscribe => unsubscribe());
        listenersRef.current = [];
        
        // Cleanup purchased listeners
        purchasedListenersRef.current.forEach(unsubscribe => unsubscribe());
        purchasedListenersRef.current = [];
        
        studentResponsesRef.current = { my: [], owned: [], purchased: [] }; // Reset local cache

        if (user) {
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    const userData = { id: user.uid, ...userDoc.data() } as User;
                    setCurrentUser(userData);
                    setIsLoading(false);

                    // Helper to process form data migration
                    const processFormData = (doc: any): Form => {
                        const data = doc.data();
                        if (!data.status && typeof data.validated === 'boolean') {
                            data.status = data.validated ? 'validated' : 'draft';
                        }
                        if (!data.status) {
                            data.status = 'draft';
                        }
                        return { id: doc.id, ...data } as Form;
                    };

                    if (userData.role === 'admin') {
                        // --- ADMIN: Load Everything (EXCEPT AnalysisHistory which is private) ---
                        const genericCollections = ['users', 'responses', 'transactions', 'purchasedForms', 'activities', 'unlockedAnalysis'];
                        const setters:any = {
                            users: setUsers,
                            responses: setResponses,
                            transactions: setTransactions,
                            purchasedForms: setPurchasedForms,
                            activities: setActivities,
                            unlockedAnalysis: setUnlockedAnalysis
                        };

                        genericCollections.forEach(collection => {
                          const unsubscribe = db.collection(collection).onSnapshot(snapshot => {
                              const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                              setters[collection](data);
                          }, error => console.error(`Error fetching ${collection}:`, error));
                          listenersRef.current.push(unsubscribe);
                        });

                        // Fetch Admin's own analysis history separately to respect security rules
                        const historyUnsubscribe = db.collection('analysisHistory')
                            .where('userId', '==', user.uid)
                            .onSnapshot(snapshot => {
                                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                                setAnalysisHistory(data as AnalysisHistory[]);
                            }, error => console.error("Error fetching admin analysisHistory:", error));
                        listenersRef.current.push(historyUnsubscribe);

                        const formsUnsubscribe = db.collection('forms').onSnapshot(snapshot => {
                            const fetchedForms = snapshot.docs.map(processFormData);
                            // Sort forms: orderIndex first (ascending), then createdAt (descending)
                            fetchedForms.sort((a, b) => {
                                const orderA = a.orderIndex !== undefined ? a.orderIndex : 999999;
                                const orderB = b.orderIndex !== undefined ? b.orderIndex : 999999;
                                if (orderA !== orderB) return orderA - orderB;
                                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                            });
                            setForms(fetchedForms);
                        }, error => console.error("Error fetching forms:", error));
                        listenersRef.current.push(formsUnsubscribe);

                    } else {
                        // --- STUDENT: Load Filtered Data ---
                        
                        // 1. Users: ONLY load self.
                        const userUnsub = db.collection('users').doc(user.uid).onSnapshot(doc => {
                            if(doc.exists) setUsers([{ id: doc.id, ...doc.data() } as User]);
                        }, error => console.error("Error fetching self user:", error));
                        listenersRef.current.push(userUnsub);

                        // 2. Private Collections
                        const privateCollections = ['transactions', 'analysisHistory', 'purchasedForms', 'activities', 'unlockedAnalysis'];
                        const privateSetters: any = {
                            transactions: setTransactions,
                            analysisHistory: setAnalysisHistory,
                            purchasedForms: setPurchasedForms,
                            activities: setActivities,
                            unlockedAnalysis: setUnlockedAnalysis
                        };

                        privateCollections.forEach(collection => {
                            const unsubscribe = db.collection(collection).where('userId', '==', user.uid).onSnapshot(snapshot => {
                                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                                privateSetters[collection](data);
                            }, error => console.error(`Error fetching ${collection} (student private):`, error));
                            listenersRef.current.push(unsubscribe);
                        });

                        // 3. Forms (Merged: Public + Owned) AND Responses Logic
                        let publicForms: Form[] = [];
                        let myForms: Form[] = [];

                        // Helper to merge responses from all sources
                        const mergeResponses = () => {
                            const combined = [
                                ...studentResponsesRef.current.my,
                                ...studentResponsesRef.current.owned,
                                ...studentResponsesRef.current.purchased
                            ];
                            // Remove duplicates by ID
                            const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
                            setResponses(unique);
                        };

                        // 3a. Fetch responses I submitted
                        const myResponsesUnsub = db.collection('responses').where('userId', '==', user.uid).onSnapshot(snapshot => {
                            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FormResponse[];
                            studentResponsesRef.current.my = data;
                            mergeResponses();
                        }, error => console.error("Error fetching my responses:", error));
                        listenersRef.current.push(myResponsesUnsub);

                        // 3b. Forms Logic
                        const updateMergedForms = () => {
                            const formMap = new Map<string, Form>();
                            publicForms.forEach(f => formMap.set(f.id, f));
                            myForms.forEach(f => formMap.set(f.id, f));
                            
                            const mergedList = Array.from(formMap.values());
                            mergedList.sort((a, b) => {
                                if (a.userId === user.uid && b.userId === user.uid) {
                                    const orderA = a.orderIndex !== undefined ? a.orderIndex : 999999;
                                    const orderB = b.orderIndex !== undefined ? b.orderIndex : 999999;
                                    if (orderA !== orderB) return orderA - orderB;
                                }
                                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                            });
                            setForms(mergedList);
                        };

                        const publicFormsUnsub = db.collection('forms').where('isPublic', '==', true).onSnapshot(snapshot => {
                            publicForms = snapshot.docs.map(processFormData);
                            updateMergedForms();
                        }, error => console.error("Error fetching public forms:", error));
                        listenersRef.current.push(publicFormsUnsub);

                        // 3c. My Forms
                        const myFormsUnsub = db.collection('forms').where('userId', '==', user.uid).onSnapshot(snapshot => {
                            myForms = snapshot.docs.map(processFormData);
                            updateMergedForms();
                        }, error => console.error("Error fetching my forms:", error));
                        listenersRef.current.push(myFormsUnsub);
                    }

                    // Notifications (Always filtered)
                    const notifUnsubscribe = db.collection('notifications').where('userId', '==', user.uid).onSnapshot(snapshot => {
                        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        setNotifications(data as Notification[]);
                    }, error => console.error("Error fetching notifications:", error));
                    listenersRef.current.push(notifUnsubscribe);

                } else {
                    setCurrentUser(null);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Error loading user data:", error);
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
        purchasedListenersRef.current.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  // --- Dynamic Loading of Purchased Responses ---
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'student') return;

    // Reset old listeners
    purchasedListenersRef.current.forEach(unsubscribe => unsubscribe());
    purchasedListenersRef.current = [];
    studentResponsesRef.current.purchased = [];

    // Identify forms bought WITH responses
    const formsWithResponses = purchasedForms.filter(p => p.withResponses).map(p => p.formId);
    
    if (formsWithResponses.length > 0) {
        // Chunk to avoid "in" query limit (10)
        const chunkSize = 10;
        for (let i = 0; i < formsWithResponses.length; i += chunkSize) {
            const chunk = formsWithResponses.slice(i, i + chunkSize);
            
            const unsubscribe = db.collection('responses')
                .where('formId', 'in', chunk)
                .onSnapshot(snapshot => {
                    const newResponses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FormResponse[];
                    
                    studentResponsesRef.current.purchased = [
                        ...studentResponsesRef.current.purchased.filter(r => !chunk.includes(r.formId)), // Remove old ones for this chunk
                        ...newResponses
                    ];
                    
                    // Trigger UI update
                    const combined = [
                        ...studentResponsesRef.current.my,
                        ...studentResponsesRef.current.owned,
                        ...studentResponsesRef.current.purchased
                    ];
                    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
                    setResponses(unique);

                }, error => console.error("Error fetching purchased responses:", error));
            
            purchasedListenersRef.current.push(unsubscribe);
        }
    }
  }, [purchasedForms, currentUser]);

  // --- ADMIN: Migration / Backfill Response Counts ---
  useEffect(() => {
    if (currentUser?.role === 'admin' && forms.length > 0 && responses.length > 0) {
        const runBackfill = async () => {
            const batch = db.batch();
            let updatesCount = 0;

            forms.forEach(form => {
                if (typeof form.responseCount === 'undefined') {
                    // Calculate count from loaded responses (Admin loads all)
                    const count = responses.filter(r => r.formId === form.id).length;
                    const formRef = db.collection('forms').doc(form.id);
                    batch.update(formRef, { responseCount: count });
                    updatesCount++;
                }
            });

            if (updatesCount > 0) {
                console.log(`Backfilling responseCount for ${updatesCount} forms...`);
                await batch.commit();
                console.log("Backfill complete.");
            }
        };
        // Debounce slightly to ensure data loaded
        const timer = setTimeout(runBackfill, 2000);
        return () => clearTimeout(timer);
    }
  }, [currentUser, forms.length, responses.length]); 


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
        showToast("Votre compte est suspendu. Vous ne pouvez pas effectuer cette action.", 'error');
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

      const batch = db.batch();

      const newResponse: Omit<FormResponse, 'id'> = {
          userId: currentUser.id, formId, data, createdAt: new Date().toISOString()
      };
      
      const responseRef = db.collection('responses').doc();
      batch.set(responseRef, newResponse);

      // Increment responseCount on the form document
      const formRef = db.collection('forms').doc(formId);
      batch.update(formRef, { responseCount: firebase.firestore.FieldValue.increment(1) });

      await batch.commit();

      await handleAddActivity(ActivityType.RESPONSE_ADDED, currentUser.id, `Nouvelle réponse ajoutée au formulaire "${form.title}".`, form.id);
      showToast("Réponse soumise avec succès !");
  };
  
  const handleDeleteFormResponse = async (responseId: string) => {
    const response = responses.find(r => r.id === responseId);
    if (!response) return;

    const batch = db.batch();
    const responseRef = db.collection('responses').doc(responseId);
    batch.delete(responseRef);

    // Decrement responseCount
    const formRef = db.collection('forms').doc(response.formId);
    batch.update(formRef, { responseCount: firebase.firestore.FieldValue.increment(-1) });

    await batch.commit();
    showToast("Réponse supprimée avec succès !");
  };

  const handleCreateForm = async (newForm: Form) => {
    const myExistingForms = forms.filter(f => f.userId === newForm.userId);
    const maxOrder = myExistingForms.length > 0 ? Math.max(...myExistingForms.map(f => f.orderIndex || 0)) : 0;
    
    const { id, ...formData } = newForm;
    const dataToSave = {
        ...formData,
        orderIndex: maxOrder + 1,
        responseCount: 0 // Initialize count
    };

    await db.collection('forms').doc(id).set(dataToSave);
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
        showToast("Erreur: formulaire introuvable.", 'error');
        return;
    }

    try {
        const batch = db.batch();
        
        const formRef = db.collection('forms').doc(formId);
        batch.delete(formRef);

        // Fetch just the IDs if possible, or use existing response data if loaded (Admin)
        // For student, they might not have loaded all responses if they are not the owner of some responses (unlikely for My Forms)
        // Ideally use a Cloud Function, but here:
        const responsesSnapshot = await db.collection('responses').where('formId', '==', formId).get();
        responsesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();

        await handleAddActivity(ActivityType.FORM_DELETED, currentUser.id, `Le formulaire "${formToDelete.title}" a été supprimé.`, formId);
        showToast("Formulaire et réponses associées supprimés avec succès.");
    } catch (error) {
        console.error("Error deleting form: ", error);
        showToast("Une erreur est survenue lors de la suppression du formulaire.", 'error');
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
        revalidationFree: false,
        // Ensure responseCount exists if it was old draft
        responseCount: formData.responseCount ?? 0
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

    // IMPORTANT: Count responses from the database to ensure the field is accurate before publishing
    try {
        const responsesSnap = await db.collection('responses').where('formId', '==', formId).get();
        const actualCount = responsesSnap.size;

        await db.collection('forms').doc(formId).update({ 
            isPublic: true, 
            price, 
            pricePerResponse,
            responseCount: actualCount // Force update with actual count
        });

        await handleSendNotification(formToPublish.userId, `Votre formulaire "${formToPublish.title}" a été publié dans la bibliothèque !`, false);
        await handleAddActivity(ActivityType.FORM_PUBLISHED, formToPublish.userId, `Le formulaire "${formToPublish.title}" a été publié dans la bibliothèque.`, formId);
        showToast("Formulaire publié avec succès !");
    } catch (error) {
        console.error("Error publishing form:", error);
        showToast("Erreur lors de la publication.", 'error');
    }
  };

  const handlePurchaseForm = async (formToBuy: Form, withResponses: boolean): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'student') return false;
    
    // Use the official count from the form document
    const responseCount = formToBuy.responseCount || 0;
    
    const formCost = formToBuy.price;
    const responsesCost = withResponses ? responseCount * formToBuy.pricePerResponse : 0;
    const totalCost = formCost + responsesCost;

    if (currentUser.coinBalance < totalCost) {
        setInsufficientFundsInfo({ required: totalCost, balance: currentUser.coinBalance });
        return false;
    }

    try {
        const batch = db.batch();

        // 1. Debit Buyer (Client side safe)
        const buyerRef = db.collection('users').doc(currentUser.id);
        batch.update(buyerRef, { coinBalance: firebase.firestore.FieldValue.increment(-totalCost) });
        
        // 2. Transaction Record (Buyer side)
        const buyerTx: Omit<Transaction, 'id'> = {
            userId: currentUser.id, type: TransactionType.Debit, amount: totalCost,
            reason: withResponses ? TransactionReason.ResponseBundlePurchase : TransactionReason.FormPurchase,
            details: `Achat du formulaire "${formToBuy.title}"${withResponses ? ' avec réponses' : ''}.`,
            createdAt: new Date().toISOString()
        };
        batch.set(db.collection('transactions').doc(), buyerTx);

        // 3. Grant Access
        if (withResponses) {
            const newPurchase: Omit<PurchasedForm, 'id'> = {
                userId: currentUser.id, formId: formToBuy.id, purchasedAt: new Date().toISOString(),
                withResponses: true, purchasePrice: totalCost,
            };
            batch.set(db.collection('purchasedForms').doc(), newPurchase);
        } else {
            const myExistingForms = forms.filter(f => f.userId === currentUser.id);
            const maxOrder = myExistingForms.length > 0 ? Math.max(...myExistingForms.map(f => f.orderIndex || 0)) : 0;

            const newFormCopy: Omit<Form, 'id'> = {
                userId: currentUser.id, title: `${formToBuy.title} (Copie)`, description: formToBuy.description,
                schema: formToBuy.schema, status: 'draft', createdAt: new Date().toISOString(),
                isPublic: false, price: 0, pricePerResponse: 0, origin: 'purchased',
                orderIndex: maxOrder + 1,
                responseCount: 0
            };
            batch.set(db.collection('forms').doc(), newFormCopy);
        }
        
        // REMOVED: Crediting the Seller/Admin.
        // Reason: Client-side security rules prevent User A from updating User B's document.
        // In a real app, a Cloud Function would listen to the Transaction document and credit the seller securely.
        // For this frontend-only demo, we record the transaction but simply burn the coins from the buyer without crediting the seller to avoid crashing.
        
        await batch.commit();

        await handleSendNotification(currentUser.id, `Achat de "${formToBuy.title}" réussi pour ${totalCost} coins !`, false);
        updateLocalUserState(currentUser.id, { coinBalance: currentUser.coinBalance - totalCost });

        await handleAddActivity(ActivityType.FORM_PURCHASED, currentUser.id, `Le formulaire "${formToBuy.title}" a été acheté pour ${totalCost} coins.`, formToBuy.id);
        showToast("Achat réussi !");
        return true;
    } catch (error) {
        console.error("Form purchase failed:", error);
        showToast("Une erreur est survenue lors de l'achat. (Permissions ou erreur réseau)", 'error');
        return false;
    }
  };

  const handleRequestFormModification = async (form: Form, reason: string) => {
    // Requires backend trigger for real notification to admin
    showToast('Votre demande a été envoyée.');
  };

  const handleUnvalidateForm = async (formId: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast("Action non autorisée.", 'error');
        return;
    }
    const formToUpdate = forms.find(f => f.id === formId);
    if (!formToUpdate) {
        showToast("Erreur: Formulaire introuvable.", 'error');
        return;
    }

    try {
        await db.collection('forms').doc(formId).update({ 
            status: 'awaiting_modification_decision',
            revalidationFree: true 
        });

        const student = users.find(u => u.id === formToUpdate.userId);
        if(student) {
             const message = `Votre demande de modification pour "${formToUpdate.title}" a été approuvée.`;
             await handleSendNotification(student.id, message, false);
        }

        await handleAddActivity(ActivityType.FORM_VALIDATION_CANCELLED, currentUser.id, `A annulé la validation du formulaire "${formToUpdate.title}".`, formId);
        showToast("Validation annulée. L'étudiant a été notifié.");

    } catch (error) {
        console.error("Error un-validating form: ", error);
        showToast("Une erreur est survenue.", 'error');
    }
  };

  const handleModificationDecision = async (formId: string, keepResponses: boolean) => {
    if (!currentUser) return;
    const form = forms.find(f => f.id === formId);
    if (!form || form.status !== 'awaiting_modification_decision') {
      showToast("Action non valide.", 'error');
      return;
    }

    const batch = db.batch();

    if (!keepResponses) {
      const responsesToDelete = await db.collection('responses').where('formId', '==', formId).get();
      responsesToDelete.forEach(doc => {
        batch.delete(doc.ref);
      });
      // Reset counter
      batch.update(db.collection('forms').doc(formId), { responseCount: 0 });
    }

    const formRef = db.collection('forms').doc(formId);
    batch.update(formRef, { status: 'draft' });
    
    await batch.commit();

    const notifMessage = `Vous pouvez maintenant modifier votre formulaire "${form.title}".`;
    await handleSendNotification(currentUser.id, notifMessage, false);

    showToast("Vous pouvez maintenant modifier votre formulaire.");
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
    showToast("Profil mis à jour !");
  };

  const handleSendNotification = async (userId: string, message: string, showAlert = true) => {
    const newNotification: Omit<Notification, 'id'> = {
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    await db.collection('notifications').add(newNotification);
    if (showAlert) showToast('Notification envoyée !');
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
        showToast("Utilisateur introuvable.", 'error');
        return;
      }
      if (!currentUser || currentUser.role !== 'admin') {
        showToast("Action non autorisée.", 'error');
        return;
      }

      const userRef = db.collection('users').doc(userId);
      const increment = type === TransactionType.Credit ? amount : -amount;
      const actionText = type === TransactionType.Credit ? 'crédité' : 'débité';

      const batch = db.batch();

      batch.update(userRef, { coinBalance: firebase.firestore.FieldValue.increment(increment) });
      
      const newTransaction: Omit<Transaction, 'id'> = {
          userId, type, amount, reason: TransactionReason.AdminAdjustment,
          details: `Ajustement de ${type === TransactionType.Credit ? 'crédit' : 'débit'} par l'administrateur ${currentUser.name}.`,
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

      showToast("Ajustement des coins effectué !");
  };

  const handleSendComplaint = async (message: string) => {
    showToast('Votre réclamation a été envoyée.');
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
      showToast("Le montant minimum pour un transfert est de 100 coins.", 'error');
      return false;
    }
    if (currentUser.coinBalance < amount) {
      showToast("Votre solde est insuffisant pour ce transfert.", 'error');
      return false;
    }

    const recipientQuery = await db.collection('users').where('email', '==', recipientEmail.toLowerCase()).limit(1).get();
    if (recipientQuery.empty) {
        showToast("Aucun étudiant trouvé avec cette adresse e-mail.", 'error');
        return false;
    }
    const recipient = { id: recipientQuery.docs[0].id, ...recipientQuery.docs[0].data() } as User;

    if (recipient.id === currentUser.id) {
        showToast("Vous ne pouvez pas vous envoyer de coins à vous-même.", 'error');
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

      showToast("Transfert effectué avec succès !");
      return true;

    } catch (error) {
        console.error("Coin transfer transaction failed: ", error);
        showToast("Une erreur est survenue pendant le transfert.", 'error');
        return false;
    }
  };

  const handleUpdateSettings = async (newSettings: SystemSettings) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    try {
        await db.collection('settings').doc('general').update(newSettings);
        setSystemSettings(newSettings);
        await handleAddActivity(ActivityType.SYSTEM_SETTINGS_UPDATED, currentUser.id, "Mise à jour de la configuration système.");
        showToast("Configuration mise à jour avec succès !");
    } catch (error) {
        console.error("Failed to update settings:", error);
        showToast("Erreur lors de la mise à jour de la configuration.", 'error');
    }
  };

  const handleCreditAllUsers = async (amount: number, message: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    const students = users.filter(u => u.role === 'student');
    const batchSize = 450; 
    
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
        showToast("Promotion envoyée à tous les étudiants !");
        
    } catch (error) {
        console.error("Failed to credit all users:", error);
        showToast("Une erreur est survenue lors de l'envoi de la promotion.", 'error');
    }
  };

  const renderPage = () => {
    if (!currentUser) return null;

    const userForms = currentUser.role === 'admin' ? forms : forms.filter(f => f.userId === currentUser.id);
    const userResponses = currentUser.role === 'admin' ? responses : responses.filter(r => userForms.map(f => f.id).includes(r.formId) || r.userId === currentUser.id || purchasedForms.some(p => p.formId === r.formId && p.withResponses));
    const userTransactions = currentUser.role === 'admin' ? transactions : transactions.filter(t => t.userId === currentUser.id);
    const userNotifications = notifications.filter(n => n.userId === currentUser.id);
    const userAnalysisHistory = currentUser.role === 'admin' ? analysisHistory : analysisHistory.filter(h => h.userId === currentUser.id);
    const userPurchasedForms = purchasedForms.filter(p => p.userId === currentUser.id);

    switch (currentPage) {
      case 'tableau-de-bord':
        return <Dashboard 
                  user={currentUser} forms={userForms} responses={userResponses}
                  users={users} transactions={transactions} onNavigate={handleNavigate}
                  activities={activities} 
               />;
      case 'formulaires':
        return <Forms 
                  user={currentUser} forms={userForms} allForms={forms}
                  responses={userResponses} purchasedForms={userPurchasedForms}
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
                  user={currentUser} forms={analyzableForms} responses={userResponses} 
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
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
            <Spinner className="w-16 h-16 text-primary-500" />
        </div>
    );
  }

  if (!currentUser) {
    return <AuthPage onLogin={handleLogin} />;
  }
  
  const userNotifications = notifications.filter(n => n.userId === currentUser.id);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-primary-50 dark:from-slate-900 dark:to-slate-800 font-sans text-slate-800 dark:text-slate-100 selection:bg-primary-200 selection:text-primary-900 lg:flex">
      <Sidebar
        user={currentUser}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenComplaintModal={() => setIsComplaintModalOpen(true)}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-72 transition-all duration-300">
        <Header 
          user={currentUser} onLogout={handleLogout} currentPage={currentPage}
          notifications={userNotifications} onMarkNotificationsRead={() => handleMarkNotificationsRead(currentUser.id)}
          theme={theme} onToggleTheme={handleToggleTheme}
          onNavigate={handleNavigate} setIsSidebarOpen={setIsSidebarOpen}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-8 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            {renderPage()}
          </div>
        </main>
      </div>
      <Chatbot user={currentUser} onNavigate={handleNavigate} systemSettings={systemSettings} />
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
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default App;