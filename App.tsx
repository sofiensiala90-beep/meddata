
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Forms from './pages/Forms';
import Library from './pages/Library';
import Analysis from './pages/Analysis';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import NotificationsPage from './pages/NotificationsPage';
import Students from './pages/Students';
import Finance from './pages/Finance';
import ActivityPage from './pages/Activity';
import AdminConfiguration from './pages/AdminConfiguration';
import AdminTrash from './pages/AdminTrash';
import AuthPage from './pages/AuthPage';
import Chatbot from './components/Chatbot';
import Toast from './components/Toast';
import ComplaintModal from './components/ComplaintModal';
import { auth, db, firebase } from './services/firebase';
import { 
  User, Form, FormResponse, Notification, Transaction, TransactionType, 
  TransactionReason, Activity, ActivityType, AnalysisHistory, PurchasedForm, 
  SystemSettings, DeletedItem, UnlockedAnalysis
} from './types';
import { DEFAULT_SETTINGS } from './constants';

export const App: React.FC = () => {
  // --- Auth & User State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // --- UI State ---
  const [currentPage, setCurrentPage] = useState('tableau-de-bord');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);

  // --- Data State ---
  const [users, setUsers] = useState<User[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [purchasedForms, setPurchasedForms] = useState<PurchasedForm[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistory[]>([]);
  const [unlockedAnalysis, setUnlockedAnalysis] = useState<UnlockedAnalysis[]>([]);
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]); // Admin only
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  // --- Navigation Context (e.g., for Analysis) ---
  const [analysisContext, setAnalysisContext] = useState<{ formIds: string[] } | null>(null);
  const [studentContext, setStudentContext] = useState<{ studentId: string; initialTab?: string } | null>(null);

  // --- Theme Initialization ---
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser: any) => {
      if (firebaseUser) {
        try {
          const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
          if (userDoc.exists) {
            setCurrentUser({ id: userDoc.id, ...userDoc.data() } as User);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setCurrentUser(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Real-time Data Listeners
  useEffect(() => {
    if (!currentUser) return;

    const listeners: (() => void)[] = [];

    listeners.push(db.collection('settings').doc('general').onSnapshot((doc: any) => {
      if (doc.exists) setSystemSettings(doc.data() as SystemSettings);
      else setSystemSettings(DEFAULT_SETTINGS);
    }));

    listeners.push(db.collection('notifications')
      .where('userId', '==', currentUser.id)
      .onSnapshot((snapshot: any) => {
        setNotifications(snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      }));

    if (currentUser.role === 'admin') {
      listeners.push(db.collection('users').onSnapshot((snap: any) => setUsers(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })))));
      listeners.push(db.collection('forms').onSnapshot((snap: any) => setForms(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })))));
      listeners.push(db.collection('responses').onSnapshot((snap: any) => setResponses(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })))));
      listeners.push(db.collection('transactions').onSnapshot((snap: any) => setTransactions(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })))));
      listeners.push(db.collection('activities').orderBy('createdAt', 'desc').limit(200).onSnapshot((snap: any) => setActivities(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })))));
      listeners.push(db.collection('purchasedForms').onSnapshot((snap: any) => setPurchasedForms(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })))));
      listeners.push(db.collection('analysisHistory').orderBy('createdAt', 'desc').limit(100).onSnapshot((snap: any) => setAnalysisHistory(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })))));
      listeners.push(db.collection('deletedItems').onSnapshot((snap: any) => setDeletedItems(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })))));
    } else {
      listeners.push(db.collection('users').doc(currentUser.id).onSnapshot((doc: any) => {
        if (doc.exists) setCurrentUser({ id: doc.id, ...doc.data() } as User);
      }));

      listeners.push(db.collection('forms').where('userId', '==', currentUser.id).onSnapshot((snap: any) => {
          setForms(prev => {
              const myForms = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
              const othersForms = prev.filter(f => f.userId !== currentUser.id);
              return [...othersForms, ...myForms];
          });
      }));
      
      listeners.push(db.collection('forms').where('isPublic', '==', true).onSnapshot((snap: any) => {
          setForms(prev => {
              const publicForms = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Form));
              const myForms = prev.filter(f => f.userId === currentUser.id);
              const combined = [...myForms];
              publicForms.forEach(pf => {
                  if (!combined.find(existing => existing.id === pf.id)) combined.push(pf);
              });
              return combined;
          });
      }));

      listeners.push(db.collection('purchasedForms').where('userId', '==', currentUser.id).onSnapshot((snap: any) => {
          setPurchasedForms(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      }));

      listeners.push(db.collection('transactions').where('userId', '==', currentUser.id).onSnapshot((snap: any) => {
          setTransactions(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      }));

      listeners.push(db.collection('activities').where('userId', '==', currentUser.id).limit(100).onSnapshot((snap: any) => {
          const items = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
          items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setActivities(items);
      }));

      listeners.push(db.collection('analysisHistory').where('userId', '==', currentUser.id).onSnapshot((snap: any) => {
          const items = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
          items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setAnalysisHistory(items);
      }));

      listeners.push(db.collection('unlockedAnalysis').where('userId', '==', currentUser.id).onSnapshot((snap: any) => {
          setUnlockedAnalysis(snap.docs.map((d: any) => d.data() as UnlockedAnalysis));
      }));

      listeners.push(db.collection('responses').where('userId', '==', currentUser.id).onSnapshot((snap: any) => {
         setResponses(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      }));
      
      db.collection('users').get().then((snap: any) => {
          setUsers(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as User)));
      });
    }

    return () => listeners.forEach(unsub => unsub());
  }, [currentUser?.id, currentUser?.role]);

  // --- Handlers ---

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const handleNavigate = (page: string, context?: any) => {
    setCurrentPage(page);
    setIsSidebarOpen(false);
    setAnalysisContext(null);
    setStudentContext(null);

    if (page === 'analyse' && context) setAnalysisContext(context);
    if (page === 'etudiants' && context) setStudentContext(context);
  };

  const handleNotificationClick = (notification: Notification) => {
      if (!notification.read) db.collection('notifications').doc(notification.id).update({ read: true });
      if (currentUser?.role === 'admin' && (notification.metadata?.type === 'modification_request' || notification.metadata?.type === 'revalidation_request')) {
          const { studentId } = notification.metadata;
          if (studentId) handleNavigate('etudiants', { studentId, initialTab: 'forms' });
      } else {
          handleNavigate('notifications');
      }
  };

  const handleLogout = async () => {
    await auth.signOut();
    setCurrentPage('tableau-de-bord');
  };

  const handleComplaintSubmit = async (message: string) => {
    if (!currentUser) return;
    try {
        const adminsQuery = await db.collection('users').where('role', '==', 'admin').get();
        const batch = db.batch();
        const complaintRef = db.collection('complaints').doc();
        batch.set(complaintRef, {
            id: complaintRef.id,
            userId: currentUser.id,
            userEmail: currentUser.email,
            userName: currentUser.name,
            message: message,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        if (!adminsQuery.empty) {
            adminsQuery.docs.forEach((doc: any) => {
                const adminId = doc.id;
                const newNotification: Omit<Notification, 'id'> = {
                    userId: adminId,
                    message: `📢 RÉCLAMATION de ${currentUser.name} :\n"${message}"`,
                    read: false,
                    createdAt: new Date().toISOString(),
                };
                const notifRef = db.collection('notifications').doc();
                batch.set(notifRef, newNotification);
            });
        }
        await db.collection('activities').add({
             userId: currentUser.id,
             type: ActivityType.COMPLAINT_FILED,
             details: "Réclamation envoyée à l'administration",
             createdAt: new Date().toISOString(),
             targetId: complaintRef.id
        });
        await batch.commit();
        showToast('Votre réclamation a été envoyée à l\'administration.');
        setIsComplaintModalOpen(false);
    } catch (error) {
        console.error("Erreur réclamation:", error);
        showToast("Erreur technique lors de l'envoi.", 'error');
    }
  };

  const processTransaction = async (amount: number, type: TransactionType, reason: TransactionReason, details?: string, targetUserId?: string): Promise<boolean> => {
    if (!currentUser) return false;
    const uid = targetUserId || currentUser.id;
    if (type === TransactionType.Debit && (currentUser.coinBalance < amount) && currentUser.role !== 'admin') {
      showToast("Solde insuffisant.", "error");
      return false;
    }
    try {
      await db.runTransaction(async (t: any) => {
        const userRef = db.collection('users').doc(uid);
        const userDoc = await t.get(userRef);
        if (!userDoc.exists) throw "User does not exist!";
        const userData = userDoc.data();
        const currentBalance = userData.coinBalance || 0;
        const newBalance = type === TransactionType.Credit ? currentBalance + amount : currentBalance - amount;
        t.update(userRef, { coinBalance: newBalance });
        const newTxRef = db.collection('transactions').doc();
        t.set(newTxRef, {
          id: newTxRef.id,
          userId: uid,
          type,
          amount,
          reason,
          createdAt: new Date().toISOString(),
          details: details || ''
        });
      });
      return true;
    } catch (error) {
      console.error("Transaction failed", error);
      showToast("Erreur de transaction.", "error");
      return false;
    }
  };

  const handleCreateForm = async (form: Form) => {
    try {
      await db.collection('forms').doc(form.id).set(form);
      await db.collection('activities').add({
        userId: currentUser!.id,
        type: ActivityType.FORM_CREATED,
        details: `Création du formulaire "${form.title}"`,
        createdAt: new Date().toISOString(),
        targetId: form.id
      });
      showToast('Formulaire créé avec succès.');
    } catch (error) {
      console.error(error);
      showToast('Erreur lors de la création.', 'error');
    }
  };

  const handleUpdateForm = async (form: Form) => {
    try {
      await db.collection('forms').doc(form.id).update(form);
      showToast('Formulaire mis à jour.');
    } catch (error) {
      console.error(error);
      showToast('Erreur lors de la mise à jour.', 'error');
    }
  };

  const handleDeleteForm = async (formId: string) => {
    const formToDelete = forms.find(f => f.id === formId);
    if (!formToDelete) return;
    try {
        const batch = db.batch();
        const shouldSoftDelete = formToDelete.status === 'validated' || formToDelete.origin === 'purchased';
        if (shouldSoftDelete) {
            const trashRef = db.collection('deletedItems').doc();
            const cleanFormData = JSON.parse(JSON.stringify(formToDelete));
            const deletedItem: Omit<DeletedItem, 'id'> = {
                originalId: formToDelete.id,
                type: 'form',
                data: cleanFormData,
                deletedAt: new Date().toISOString(),
                deletedBy: currentUser!.id,
                ownerId: formToDelete.userId || currentUser!.id,
                ownerName: users.find(u => u.id === formToDelete.userId)?.name || 'Inconnu',
                title: formToDelete.title
            };
            batch.set(trashRef, deletedItem);
        }
        const formRef = db.collection('forms').doc(formId);
        batch.delete(formRef);
        await batch.commit();
        await db.collection('activities').add({
            userId: currentUser!.id,
            type: ActivityType.FORM_DELETED,
            details: `Suppression formulaire "${formToDelete.title}"${shouldSoftDelete ? ' (Mis à la corbeille)' : ''}`,
            createdAt: new Date().toISOString(),
            targetId: formId
        });
        showToast(shouldSoftDelete ? 'Formulaire déplacé dans la corbeille admin.' : 'Formulaire supprimé définitivement.');
    } catch (error) {
       console.error("Error handleDeleteForm:", error);
      showToast('Erreur lors de la suppression.', 'error');
    }
  };
  
  const handleDeletePurchasedForm = async (purchaseId: string) => {
      try {
          await db.collection('purchasedForms').doc(purchaseId).delete();
          showToast('Achat supprimé de votre bibliothèque.');
      } catch (error) {
          console.error(error);
          showToast("Erreur lors de la suppression de l'achat.", 'error');
      }
  };

  const handleSaveAndValidateForm = async (form: Form) => {
    if (!currentUser) return;
    const cost = form.revalidationFree ? 0 : (form.origin === 'purchased' ? systemSettings.coinCosts.validatePurchasedForm : systemSettings.coinCosts.validateForm);
    const isRevalidation = form.revalidationFree === true;

    if (currentUser.role === 'student' && cost > 0) {
        if (currentUser.coinBalance < cost) {
            showToast(`Solde insuffisant. Il vous faut ${cost} coins.`, 'error');
            return;
        }
    }

    try {
        if (cost > 0) {
            const success = await processTransaction(cost, TransactionType.Debit, TransactionReason.FormValidation, `Validation de "${form.title}"`);
            if (!success) return;
        }

        const newStatus = isRevalidation ? 'pending_revalidation' : 'validated';
        const existingForm = forms.find(f => f.id === form.id);
        const rawUpdatedForm = { 
            ...form, 
            status: newStatus,
            backupVersion: existingForm?.backupVersion || form.backupVersion,
            modificationRequestReason: existingForm?.modificationRequestReason || form.modificationRequestReason
        };
        const updatedForm = JSON.parse(JSON.stringify(rawUpdatedForm));
        const batch = db.batch();
        const formRef = db.collection('forms').doc(form.id);
        batch.set(formRef, updatedForm);

        if (isRevalidation) {
            const admins = users.filter(u => u.role === 'admin');
            admins.forEach(admin => {
                const notifRef = db.collection('notifications').doc();
                batch.set(notifRef, {
                    userId: admin.id,
                    message: `📢 MODIFICATION EN ATTENTE : ${currentUser.name} a soumis des modifications pour "${form.title}".`,
                    read: false,
                    createdAt: new Date().toISOString(),
                    metadata: { type: 'revalidation_request', studentId: currentUser.id, formId: form.id }
                });
            });
        }
        await db.collection('activities').add({
            userId: currentUser.id,
            type: ActivityType.FORM_VALIDATED,
            details: isRevalidation ? `Soumission modifications pour "${form.title}"` : `Validation du formulaire "${form.title}"`,
            createdAt: new Date().toISOString(),
            targetId: form.id
        });
        await batch.commit();
        showToast(isRevalidation ? 'Modifications soumises à l\'admin pour examen.' : 'Formulaire validé avec succès !');
    } catch (error) {
        console.error(error);
        showToast('Erreur lors de la validation.', 'error');
    }
  };

  const handlePublishForm = async (formId: string, price: number, pricePerResponse: number) => {
      try {
          await db.collection('forms').doc(formId).update({ isPublic: true, price, pricePerResponse, status: 'validated' });
          await db.collection('activities').add({
            userId: currentUser!.id,
            type: ActivityType.FORM_PUBLISHED,
            details: `Publication du formulaire (Prix: ${price})`,
            createdAt: new Date().toISOString(),
            targetId: formId
          });
          showToast('Formulaire publié dans la bibliothèque.');
      } catch (error) {
          console.error(error);
          showToast('Erreur lors de la publication.', 'error');
      }
  };
  
  const handleUnvalidateForm = async (formId: string) => {
      const form = forms.find(f => f.id === formId);
      if (!form) return;
      try {
          const batch = db.batch();
          batch.update(db.collection('forms').doc(formId), { status: 'draft', revalidationFree: true });
          batch.set(db.collection('notifications').doc(), {
              userId: form.userId,
              message: `✅ Votre demande de modification pour "${form.title}" a été acceptée.\n\n⚠️ IMPORTANT : Seules des modifications mineures sont acceptées.`,
              read: false,
              createdAt: new Date().toISOString()
          });
          batch.set(db.collection('activities').doc(), {
              userId: currentUser!.id,
              type: ActivityType.FORM_VALIDATION_CANCELLED,
              details: `Annulation validation pour "${form.title}"`,
              createdAt: new Date().toISOString(),
              targetId: formId
          });
          await batch.commit();
          showToast('Validation annulée.');
      } catch (error) {
          console.error(error);
          showToast("Erreur lors de l'annulation.", 'error');
      }
  };

  // --- NOVEL LOGIC: Instant unlocking of forms for modification ---
  const handleRequestFormModification = async (form: Form, reason: string) => {
      try {
          const batch = db.batch();
          const formRef = db.collection('forms').doc(form.id);
          const sanitizedBackup = JSON.parse(JSON.stringify(form));

          // Déblocage immédiat : statut draft, revalidation gratuite, sauvegarde du backup
          batch.update(formRef, {
              status: 'draft',
              modificationRequestReason: reason,
              backupVersion: sanitizedBackup,
              revalidationFree: true
          });

          await batch.commit();
          
          await db.collection('activities').add({
              userId: currentUser!.id,
              type: ActivityType.FORM_VALIDATION_CANCELLED,
              details: `Déblocage pour modification de "${form.title}" (Déblocage instantané)`,
              createdAt: new Date().toISOString(),
              targetId: form.id
          });

          showToast('Formulaire débloqué. Vous pouvez maintenant le modifier gratuitement.');
      } catch (error) {
          console.error(error);
          showToast("Erreur lors du déblocage.", 'error');
      }
  };

  const handleModificationDecision = async (formId: string, keepResponses: boolean) => {
      if (!keepResponses) {
          const batch = db.batch();
          const resps = await db.collection('responses').where('formId', '==', formId).get();
          resps.forEach((doc: any) => batch.delete(doc.ref));
          await batch.commit();
      }
      await db.collection('forms').doc(formId).update({ status: 'draft', revalidationFree: true });
      showToast(`Prêt pour modification.`);
  };
  
  const handleRefuseModification = async (form: Form, reason: string) => {
      try {
          const batch = db.batch();
          batch.update(db.collection('forms').doc(form.id), {
              status: 'validated',
              modificationRequestReason: firebase.firestore.FieldValue.delete(),
              backupVersion: firebase.firestore.FieldValue.delete()
          });
          batch.set(db.collection('notifications').doc(), {
              userId: form.userId,
              message: `❌ Vos modifications pour "${form.title}" ont été refusées.\n\nMotif : ${reason}`,
              read: false,
              createdAt: new Date().toISOString()
          });
          await batch.commit();
          showToast('Modifications refusées.');
      } catch (error) {
          console.error(error);
          showToast("Erreur lors du refus.", 'error');
      }
  };
  
  const handleRevalidationDecision = async (form: Form, approved: boolean) => {
      try {
          const batch = db.batch();
          const formRef = db.collection('forms').doc(form.id);
          if (approved) {
              batch.update(formRef, {
                  status: 'validated',
                  modificationRequestReason: firebase.firestore.FieldValue.delete(),
                  backupVersion: firebase.firestore.FieldValue.delete(),
                  revalidationFree: false
              });
              batch.set(db.collection('notifications').doc(), {
                  userId: form.userId,
                  message: `✅ Vos modifications sur "${form.title}" ont été approuvées.`,
                  read: false,
                  createdAt: new Date().toISOString()
              });
              showToast("Approuvé.");
          } else {
              if (form.backupVersion) {
                  batch.set(formRef, {
                      ...form.backupVersion,
                      status: 'validated',
                      modificationRequestReason: firebase.firestore.FieldValue.delete(),
                      backupVersion: firebase.firestore.FieldValue.delete(),
                      revalidationFree: false
                  });
              } else {
                  batch.update(formRef, { status: 'validated' });
              }
              batch.set(db.collection('notifications').doc(), {
                  userId: form.userId,
                  message: `❌ Vos modifications sur "${form.title}" ont été refusées. Le formulaire a été restauré.`,
                  read: false,
                  createdAt: new Date().toISOString()
              });
              showToast("Refusé et restauré.");
          }
          await batch.commit();
      } catch (error) {
          console.error(error);
          showToast("Erreur lors de la décision.", 'error');
      }
  };

  const handleAddResponse = async (formId: string, data: Record<string, any>) => {
      const form = forms.find(f => f.id === formId);
      if (!form || !currentUser) return;
      const cost = systemSettings.coinCosts.addResponse;
      try {
          if (currentUser.role === 'student') {
              const success = await processTransaction(cost, TransactionType.Debit, TransactionReason.FormResponse, `Réponse à "${form.title}"`);
              if (!success) return;
          }
          await db.collection('responses').add({ userId: currentUser.id, formId, data, createdAt: new Date().toISOString() });
          await db.collection('forms').doc(formId).update({ responseCount: firebase.firestore.FieldValue.increment(1) });
          await db.collection('activities').add({
              userId: currentUser.id,
              type: ActivityType.RESPONSE_ADDED,
              details: `Réponse ajoutée au formulaire "${form.title}"`,
              createdAt: new Date().toISOString(),
              targetId: form.id
          });
          if (form.userId !== currentUser.id) {
               const commission = Math.round(systemSettings.libraryPrices.defaultPricePerResponse * systemSettings.commissionRates.creatorResponseSale);
               if (commission > 0) {
                    await db.runTransaction(async (t: any) => {
                        const creatorRef = db.collection('users').doc(form.userId);
                        const creatorDoc = await t.get(creatorRef);
                        if (creatorDoc.exists) {
                            t.update(creatorRef, { coinBalance: (creatorDoc.data().coinBalance || 0) + commission });
                            t.set(db.collection('transactions').doc(), {
                                userId: form.userId,
                                type: TransactionType.Credit,
                                amount: commission,
                                reason: TransactionReason.FormSaleCommission,
                                details: `Commission réponse "${form.title}"`,
                                createdAt: new Date().toISOString()
                            });
                        }
                    });
               }
          }
          showToast('Réponse ajoutée.');
      } catch (error) {
          console.error(error);
          showToast('Erreur lors de l\'ajout.', 'error');
      }
  };
  
  const handleDeleteResponse = async (responseId: string) => {
      try {
          const respDoc = await db.collection('responses').doc(responseId).get();
          const respData = respDoc.data();
          if (respData) {
              const batch = db.batch();
              const trashRef = db.collection('deletedItems').doc();
              batch.set(trashRef, {
                  originalId: responseId,
                  type: 'response',
                  data: JSON.parse(JSON.stringify(respData)),
                  deletedAt: new Date().toISOString(),
                  deletedBy: currentUser!.id,
                  ownerId: respData.userId,
                  ownerName: users.find(u => u.id === respData.userId)?.name || 'Inconnu',
                  title: forms.find(f => f.id === respData.formId)?.title || 'Réponse'
              });
              batch.delete(db.collection('responses').doc(responseId));
              if (forms.some(f => f.id === respData.formId && f.userId === currentUser!.id)) {
                  batch.update(db.collection('forms').doc(respData.formId), { responseCount: firebase.firestore.FieldValue.increment(-1) });
              }
              await batch.commit();
              showToast('Réponse archivée.');
          }
      } catch (error) {
          console.error(error);
          showToast('Erreur.', 'error');
      }
  };

  const handlePurchaseForm = async (form: Form, withResponses: boolean): Promise<boolean | void> => {
      if (!currentUser) return false;
      const price = withResponses ? (form.price + (form.responseCount || 0) * form.pricePerResponse) : form.price;
      if (currentUser.coinBalance < price) {
          showToast('Solde insuffisant.', 'error');
          return false;
      }
      try {
          const success = await processTransaction(price, TransactionType.Debit, withResponses ? TransactionReason.ResponseBundlePurchase : TransactionReason.FormPurchase, `Achat "${form.title}"`);
          if (!success) return false;
          const batch = db.batch();
          batch.set(db.collection('purchasedForms').doc(), { userId: currentUser.id, formId: form.id, purchasedAt: new Date().toISOString(), withResponses, purchasePrice: price });
          const newFormId = `form-${Date.now()}`;
          batch.set(db.collection('forms').doc(newFormId), {
              ...form,
              id: newFormId,
              userId: currentUser.id,
              status: withResponses ? 'validated' : 'draft',
              isPublic: false,
              origin: 'purchased',
              responseCount: withResponses ? (form.responseCount || 0) : 0,
              createdAt: new Date().toISOString(),
              sourceFormId: form.id,
          });
          if (withResponses) {
              const originalResponsesSnap = await db.collection('responses').where('formId', '==', form.id).get();
              originalResponsesSnap.docs.forEach((doc: any) => {
                  batch.set(db.collection('responses').doc(), { ...doc.data(), userId: currentUser.id, formId: newFormId, createdAt: new Date().toISOString() });
              });
          }
          await batch.commit();
          const commission = Math.round(form.price * systemSettings.commissionRates.creatorFormSale);
          if (commission > 0) {
               await db.runTransaction(async (t: any) => {
                    const creatorRef = db.collection('users').doc(form.userId);
                    const creatorDoc = await t.get(creatorRef);
                    if (creatorDoc.exists) {
                        t.update(creatorRef, { coinBalance: firebase.firestore.FieldValue.increment(commission) });
                        t.set(db.collection('transactions').doc(), { userId: form.userId, type: TransactionType.Credit, amount: commission, reason: TransactionReason.FormSaleCommission, details: `Vente "${form.title}"`, createdAt: new Date().toISOString() });
                    }
               });
          }
          await db.collection('activities').add({ userId: currentUser.id, type: ActivityType.FORM_PURCHASED, details: `Achat "${form.title}"`, createdAt: new Date().toISOString(), targetId: form.id });
          showToast('Achat réussi !');
          return true;
      } catch (error) {
          console.error(error);
          showToast("Erreur.", 'error');
          return false;
      }
  };

  const handleCoinTransfer = async (recipientEmail: string, amount: number): Promise<boolean> => {
      if (!currentUser) return false;
      try {
          const snap = await db.collection('users').where('email', '==', recipientEmail.toLowerCase().trim()).limit(1).get();
          if (snap.empty) { showToast("Utilisateur introuvable.", 'error'); return false; }
          const recipientDoc = snap.docs[0];
          const recipientId = recipientDoc.id;
          if (recipientId === currentUser.id) { showToast("Action impossible.", 'error'); return false; }
          await db.runTransaction(async (t: any) => {
              const senderRef = db.collection('users').doc(currentUser.id);
              const senderSnapshot = await t.get(senderRef);
              if ((senderSnapshot.data().coinBalance || 0) < amount) throw "Solde insuffisant";
              t.update(senderRef, { coinBalance: firebase.firestore.FieldValue.increment(-amount) });
              t.update(db.collection('users').doc(recipientId), { coinBalance: firebase.firestore.FieldValue.increment(amount) });
              t.set(db.collection('transactions').doc(), { userId: currentUser.id, type: TransactionType.Debit, amount, reason: TransactionReason.COIN_TRANSFER_SENT, details: `Vers ${recipientDoc.data().name}`, createdAt: new Date().toISOString() });
              t.set(db.collection('transactions').doc(), { userId: recipientId, type: TransactionType.Credit, amount, reason: TransactionReason.COIN_TRANSFER_RECEIVED, details: `De ${currentUser.name}`, createdAt: new Date().toISOString() });
              t.set(db.collection('notifications').doc(), { userId: recipientId, message: `Vous avez reçu ${amount} coins de ${currentUser.name}.`, read: false, createdAt: new Date().toISOString() });
          });
          await db.collection('activities').add({ userId: currentUser.id, type: ActivityType.COIN_TRANSFER, details: `Transfert de ${amount} coins à ${recipientDoc.data().name}`, createdAt: new Date().toISOString() });
          showToast("Transfert réussi.");
          return true;
      } catch (error: any) {
          showToast(error === "Solde insuffisant" ? "Solde insuffisant." : "Erreur technique.", 'error');
          return false;
      }
  };

  const handleUpdateSettings = async (newSettings: SystemSettings) => {
      try {
          await db.collection('settings').doc('general').set(newSettings);
          await db.collection('activities').add({ userId: currentUser!.id, type: ActivityType.SYSTEM_SETTINGS_UPDATED, details: "Mise à jour paramètres", createdAt: new Date().toISOString() });
          showToast("Paramètres mis à jour.");
      } catch (error) { showToast("Erreur.", 'error'); }
  };

  const handleCreditAllUsers = async (amount: number, message: string) => {
      try {
          const batch = db.batch();
          const students = users.filter(u => u.role === 'student');
          students.forEach(student => {
              batch.update(db.collection('users').doc(student.id), { coinBalance: firebase.firestore.FieldValue.increment(amount) });
              batch.set(db.collection('notifications').doc(), { userId: student.id, message: `🎁 CADEAU : ${message}`, read: false, createdAt: new Date().toISOString() });
              batch.set(db.collection('transactions').doc(), { userId: student.id, type: TransactionType.Credit, amount, reason: TransactionReason.PROMOTIONAL_GIFT, details: "Cadeau", createdAt: new Date().toISOString() });
          });
          await db.collection('activities').add({ userId: currentUser!.id, type: ActivityType.PROMOTIONAL_CAMPAIGN, details: `Envoi de ${amount} coins à ${students.length} étudiants`, createdAt: new Date().toISOString() });
          await batch.commit();
          showToast("Campagne terminée.");
      } catch (error) { showToast("Erreur.", 'error'); }
  };
  
  const handleUpdateUserStatus = async (userId: string, status: User['status']) => {
      try {
          await db.collection('users').doc(userId).update({ status });
          showToast(`Statut mis à jour.`);
      } catch (error) { showToast("Erreur.", 'error'); }
  };

  const handleAdminCoinAdjustment = async (userId: string, amount: number, type: TransactionType) => {
      try {
          await db.runTransaction(async (t: any) => {
              const change = type === TransactionType.Credit ? amount : -amount;
              t.update(db.collection('users').doc(userId), { coinBalance: firebase.firestore.FieldValue.increment(change) });
              t.set(db.collection('transactions').doc(), { userId, type, amount, reason: TransactionReason.AdminAdjustment, details: "Ajustement Admin", createdAt: new Date().toISOString() });
              t.set(db.collection('notifications').doc(), { userId, message: `Ajustement de ${change > 0 ? '+' : ''}${change} coins par l'administration.`, read: false, createdAt: new Date().toISOString() });
          });
          showToast("Ajustement effectué.");
      } catch (error) { showToast("Erreur.", 'error'); }
  };

  const handleSendNotification = async (userId: string, message: string) => {
      try {
          await db.collection('notifications').add({ userId, message, read: false, createdAt: new Date().toISOString() });
          showToast("Notification envoyée.");
      } catch (error) { showToast("Erreur.", 'error'); }
  };
  
  const handleRestoreItem = async (item: DeletedItem) => {
      try {
          const batch = db.batch();
          if (item.type === 'form') await db.collection('forms').doc(item.originalId).set(item.data);
          else {
              await db.collection('responses').doc(item.originalId).set(item.data);
              batch.update(db.collection('forms').doc(item.data.formId), { responseCount: firebase.firestore.FieldValue.increment(1) });
          }
          batch.delete(db.collection('deletedItems').doc(item.id));
          await db.collection('activities').add({ userId: currentUser!.id, type: ActivityType.ITEM_RESTORED, details: `Restauration "${item.title || item.originalId}"`, createdAt: new Date().toISOString() });
          await batch.commit();
          showToast("Restauration réussie.");
      } catch (error) { showToast("Erreur.", 'error'); }
  };
  
  const handlePurgeTrash = async (filters: { startDate: string, endDate: string, type: string, userId: string }) => {
      try {
          const snapshot = await db.collection('deletedItems').get();
          const batch = db.batch();
          let count = 0;
          snapshot.docs.forEach((doc: any) => {
              const item = doc.data() as DeletedItem;
              let match = true;
              if (filters.type !== 'all' && item.type !== filters.type) match = false;
              if (filters.userId && item.ownerId !== filters.userId) match = false;
              const itemDate = new Date(item.deletedAt);
              if (filters.startDate && itemDate < new Date(filters.startDate)) match = false;
              if (filters.endDate && itemDate > new Date(filters.endDate)) match = false;
              if (match) { batch.delete(doc.ref); count++; }
          });
          if (count > 0) {
              await batch.commit();
              await db.collection('activities').add({ userId: currentUser!.id, type: ActivityType.TRASH_PURGED, details: `Purge (${count} éléments)`, createdAt: new Date().toISOString() });
              showToast(`${count} éléments supprimés.`);
          } else showToast("Rien à supprimer.");
      } catch (error) { showToast("Erreur.", 'error'); }
  };

  const handleUpdateProfile = async (updatedUser: User) => {
      try {
          await db.collection('users').doc(updatedUser.id).update(updatedUser);
          setCurrentUser(updatedUser);
          showToast("Profil mis à jour.");
      } catch (error) { showToast("Erreur.", 'error'); }
  };

  const handleMarkNotificationsRead = async () => {
      if (!currentUser) return;
      const unread = notifications.filter(n => !n.read);
      if (unread.length === 0) return;
      const batch = db.batch();
      unread.forEach(n => batch.update(db.collection('notifications').doc(n.id), { read: true }));
      await batch.commit();
  };
  
  const handleSaveAnalysisToHistory = async (formIds: string[], formTitles: string[], userPrompt: string, analysisResult: any) => {
      if (!currentUser) return;
      try {
          await db.collection('analysisHistory').add({ userId: currentUser.id, formIds, formTitles, userPrompt, analysisResult, createdAt: new Date().toISOString() });
          await db.collection('activities').add({ userId: currentUser.id, type: ActivityType.AI_ANALYSIS_PERFORMED, details: `Analyse IA sur : ${formTitles.join(', ')}`, createdAt: new Date().toISOString() });
      } catch (error) { console.error(error); }
  };
  
  const handleDeleteAnalysisHistory = async (id: string) => {
      try {
          await db.collection('analysisHistory').doc(id).delete();
          showToast("Historique supprimé.");
      } catch (error) { showToast("Erreur.", 'error'); }
  };
  
  const handleAnalysisTransaction = async (userId: string, reason: TransactionReason, context?: { formIds?: string[] }): Promise<boolean> => {
      const cost = systemSettings.coinCosts.aiAnalysis;
      if (currentUser && currentUser.coinBalance < cost && currentUser.role !== 'admin') {
          showToast("Solde insuffisant.", 'error');
          return false;
      }
      const success = await processTransaction(cost, TransactionType.Debit, reason, "Analyse IA Avancée");
      if (success && context && context.formIds) {
          const batch = db.batch();
          context.formIds.forEach(fid => batch.set(db.collection('unlockedAnalysis').doc(), { userId: currentUser!.id, formId: fid }));
          await batch.commit();
      }
      return success;
  };

  if (loadingAuth) return <div className="flex h-screen w-full items-center justify-center bg-slate-100 dark:bg-slate-900"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-600"></div></div>;
  if (!currentUser) return <AuthPage onLogin={() => {}} />;

  return (
    <div className={`flex h-screen bg-slate-100 dark:bg-slate-900 font-sans ${theme}`}>
       <Sidebar user={currentUser} currentPage={currentPage} onNavigate={handleNavigate} onOpenComplaintModal={() => setIsComplaintModalOpen(true)} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
       <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300 lg:ml-80">
          <Header user={currentUser} onLogout={handleLogout} currentPage={currentPage} notifications={notifications} onMarkNotificationsRead={handleMarkNotificationsRead} theme={theme} onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')} onNavigate={handleNavigate} setIsSidebarOpen={setIsSidebarOpen} onNotificationClick={handleNotificationClick} />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 dark:bg-slate-900 p-4 lg:p-6 scroll-smooth">
             {currentPage === 'tableau-de-bord' && <Dashboard user={currentUser} forms={forms} responses={responses} users={users} transactions={transactions} activities={activities} onNavigate={handleNavigate} />}
             {currentPage === 'formulaires' && <Forms user={currentUser} forms={forms} allForms={forms} responses={responses} purchasedForms={purchasedForms} addFormResponse={handleAddResponse} deleteFormResponse={handleDeleteResponse} createForm={handleCreateForm} updateForm={handleUpdateForm} deleteForm={handleDeleteForm} deletePurchasedForm={handleDeletePurchasedForm} saveAndValidateForm={handleSaveAndValidateForm} publishForm={handlePublishForm} unpublishForm={handleUnvalidateForm} users={users} onNavigate={handleNavigate} handleRequestFormModification={handleRequestFormModification} onModificationDecision={handleModificationDecision} systemSettings={systemSettings} />}
             {currentPage === 'bibliotheque' && <Library currentUser={currentUser} publicForms={forms.filter(f => f.isPublic)} purchasedForms={purchasedForms} responses={responses} users={users} onPurchase={handlePurchaseForm} systemSettings={systemSettings} userForms={forms.filter(f => f.userId === currentUser.id)} />}
             {currentPage === 'analyse' && <Analysis user={currentUser} forms={forms} responses={responses} onTransaction={handleAnalysisTransaction} analysisContext={analysisContext} onNavigate={handleNavigate} analysisHistory={analysisHistory} saveAnalysisToHistory={handleSaveAnalysisToHistory} deleteAnalysisHistory={handleDeleteAnalysisHistory} unlockedAnalysis={unlockedAnalysis} systemSettings={systemSettings} />}
             {currentPage === 'portefeuille' && <Wallet user={currentUser} transactions={transactions} users={users} onCoinTransfer={handleCoinTransfer} />}
             {currentPage === 'profil' && <Profile user={currentUser} onUpdateProfile={handleUpdateProfile} />}
             {currentPage === 'notifications' && <NotificationsPage notifications={notifications} onNotificationClick={handleNotificationClick} />}
             {currentUser.role === 'admin' && currentPage === 'etudiants' && <Students users={users} forms={forms} responses={responses} onSendNotification={handleSendNotification} onUpdateUserStatus={handleUpdateUserStatus} onAdminCoinAdjustment={handleAdminCoinAdjustment} onUnvalidateForm={handleUnvalidateForm} onRefuseModification={handleRefuseModification} onRevalidationDecision={handleRevalidationDecision} context={studentContext} />}
             {currentUser.role === 'admin' && currentPage === 'finances' && <Finance transactions={transactions} users={users} />}
             {currentUser.role === 'admin' && currentPage === 'activite' && <ActivityPage activities={activities} users={users} />}
             {currentUser.role === 'admin' && currentPage === 'corbeille' && <AdminTrash deletedItems={deletedItems} users={users} onRestore={handleRestoreItem} onPurge={handlePurgeTrash} />}
             {currentUser.role === 'admin' && currentPage === 'configuration' && <AdminConfiguration settings={systemSettings} users={users} onUpdateSettings={handleUpdateSettings} onCreditAllUsers={handleCreditAllUsers} />}
          </main>
       </div>
       <Chatbot user={currentUser} onNavigate={handleNavigate} systemSettings={systemSettings} />
       {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
       <ComplaintModal isOpen={isComplaintModalOpen} onClose={() => setIsComplaintModalOpen(false)} onSubmit={handleComplaintSubmit} />
    </div>
  );
};
