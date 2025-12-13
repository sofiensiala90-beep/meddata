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
  SystemSettings, DeletedItem
} from './types';
import { DEFAULT_SETTINGS } from './constants';

const App: React.FC = () => {
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
  const [unlockedAnalysis, setUnlockedAnalysis] = useState<{userId: string; formId: string}[]>([]);
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
        // Fetch User Data
        try {
          const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
          if (userDoc.exists) {
            setCurrentUser({ id: userDoc.id, ...userDoc.data() } as User);
          } else {
             // Fallback if user created in Auth but not in Firestore yet (rare race condition)
             console.warn("User document not found in Firestore.");
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

    // 1. Settings (All users need this)
    listeners.push(db.collection('settings').doc('general').onSnapshot((doc: any) => {
      if (doc.exists) setSystemSettings(doc.data() as SystemSettings);
      else setSystemSettings(DEFAULT_SETTINGS);
    }));

    // 2. Notifications (Own)
    listeners.push(db.collection('notifications')
      .where('userId', '==', currentUser.id)
      .onSnapshot((snapshot: any) => {
        setNotifications(snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      }));

    if (currentUser.role === 'admin') {
      // --- ADMIN FETCHING ---
      listeners.push(db.collection('users').onSnapshot((snap: any) => setUsers(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })))));
      listeners.push(db.collection('forms').onSnapshot((snap: any) => setForms(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })))));
      listeners.push(db.collection('responses').onSnapshot((snap: any) => setResponses(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })))));
      listeners.push(db.collection('transactions').onSnapshot((snap: any) => setTransactions(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })))));
      listeners.push(db.collection('activities').orderBy('createdAt', 'desc').limit(200).onSnapshot((snap: any) => setActivities(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })))));
      listeners.push(db.collection('purchasedForms').onSnapshot((snap: any) => setPurchasedForms(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })))));
      listeners.push(db.collection('analysisHistory').orderBy('createdAt', 'desc').limit(100).onSnapshot((snap: any) => setAnalysisHistory(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })))));
      
      // Admin: Fetch Deleted Items
      listeners.push(db.collection('deletedItems').onSnapshot(
        (snap: any) => setDeletedItems(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))),
        (error: any) => console.error("Error fetching deletedItems. Check rules.", error)
      ));
      
    } else {
      // --- STUDENT FETCHING ---
      
      // Sync own profile changes
      listeners.push(db.collection('users').doc(currentUser.id).onSnapshot((doc: any) => {
        if (doc.exists) setCurrentUser({ id: doc.id, ...doc.data() } as User);
      }));

      // My Forms
      listeners.push(db.collection('forms').where('userId', '==', currentUser.id).onSnapshot((snap: any) => {
          setForms(prev => {
              return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
          });
      }));
      
      // Public Forms
      listeners.push(db.collection('forms').where('isPublic', '==', true).onSnapshot((snap: any) => {
          setForms(prev => {
              const myForms = prev.filter(f => f.userId === currentUser.id);
              const publicForms = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Form));
              const combined = [...myForms];
              publicForms.forEach(pf => {
                  if (!combined.find(existing => existing.id === pf.id)) {
                      combined.push(pf);
                  }
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

      // Activities
      listeners.push(db.collection('activities').where('userId', '==', currentUser.id).limit(100).onSnapshot((snap: any) => {
          const items = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
          items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setActivities(items);
      }));

      // Analysis History
      listeners.push(db.collection('analysisHistory').where('userId', '==', currentUser.id).onSnapshot((snap: any) => {
          const items = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
          items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setAnalysisHistory(items);
      }));

      listeners.push(db.collection('unlockedAnalysis').where('userId', '==', currentUser.id).onSnapshot((snap: any) => {
          setUnlockedAnalysis(snap.docs.map((d: any) => ({ userId: d.userId, formId: d.formId })));
      }));

      listeners.push(db.collection('responses').where('userId', '==', currentUser.id).onSnapshot((snap: any) => {
         setResponses(prev => {
             const myResponses = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
             return myResponses;
         });
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

    if (page === 'analyse' && context) {
      setAnalysisContext(context);
    } 
    if (page === 'etudiants' && context) {
        setStudentContext(context);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
      if (!notification.read) {
          db.collection('notifications').doc(notification.id).update({ read: true });
      }
      if (currentUser?.role === 'admin' && (notification.metadata?.type === 'modification_request' || notification.metadata?.type === 'revalidation_request')) {
          const { studentId } = notification.metadata;
          if (studentId) {
              handleNavigate('etudiants', { studentId, initialTab: 'forms' });
          }
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
        
        // Log complaint
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

  // --- Soft Delete Logic for Forms ---
  const handleDeleteForm = async (formId: string) => {
    const formToDelete = forms.find(f => f.id === formId);
    if (!formToDelete) return;

    try {
        const batch = db.batch();
        const shouldSoftDelete = formToDelete.status === 'validated' || formToDelete.origin === 'purchased';

        if (shouldSoftDelete) {
            // Soft delete: Move to deletedItems
            const trashRef = db.collection('deletedItems').doc();
            const deletedItem: Omit<DeletedItem, 'id'> = {
                originalId: formToDelete.id,
                type: 'form',
                data: formToDelete,
                deletedAt: new Date().toISOString(),
                deletedBy: currentUser!.id,
                ownerId: formToDelete.userId,
                ownerName: users.find(u => u.id === formToDelete.userId)?.name || 'Inconnu',
                title: formToDelete.title
            };
            batch.set(trashRef, deletedItem);
        }

        // Delete from main forms collection (always)
        const formRef = db.collection('forms').doc(formId);
        batch.delete(formRef);

        await db.collection('activities').add({
            userId: currentUser!.id,
            type: ActivityType.FORM_DELETED,
            details: `Suppression formulaire "${formToDelete.title}"${shouldSoftDelete ? ' (Mis à la corbeille)' : ''}`,
            createdAt: new Date().toISOString(),
            targetId: formId
        });

        await batch.commit();
        showToast(shouldSoftDelete ? 'Formulaire déplacé dans la corbeille admin.' : 'Formulaire supprimé définitivement.');
    } catch (error) {
       console.error(error);
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
    
    // Check if modifying a previously validated form (Re-validation flow)
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

        // Logic split: Direct Validation vs Pending Review
        const newStatus = isRevalidation ? 'pending_revalidation' : 'validated';
        
        // IMPORTANT: Lors d'une re-validation, on doit s'assurer que les champs 'backupVersion' et 'modificationRequestReason'
        // (qui ont été définis par l'admin lors du déblocage) sont bien conservés lors de la sauvegarde complète (set).
        // On récupère la version en base pour fusionner ces champs si le formulaire UI ne les a pas.
        const existingForm = forms.find(f => f.id === form.id);

        const updatedForm = { 
            ...form, 
            status: newStatus,
            // On préserve backupVersion s'il existe déjà
            backupVersion: existingForm?.backupVersion || form.backupVersion,
            // On préserve le motif de la demande
            modificationRequestReason: existingForm?.modificationRequestReason || form.modificationRequestReason
        };
        
        const batch = db.batch();
        const formRef = db.collection('forms').doc(form.id);
        batch.set(formRef, updatedForm);

        if (isRevalidation) {
            // Notify Admins
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
          await db.collection('forms').doc(formId).update({
              isPublic: true,
              price,
              pricePerResponse,
              status: 'validated'
          });
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
  
  const handleUnpublishForm = async (formId: string) => {
      try {
          await db.collection('forms').doc(formId).update({ isPublic: false });
          showToast('Formulaire retiré de la bibliothèque.');
      } catch (error) {
          console.error(error);
          showToast('Erreur lors de l\'annulation de la publication.', 'error');
      }
  };
  
  const handleUnvalidateForm = async (formId: string) => {
      const form = forms.find(f => f.id === formId);
      if (!form) return;

      try {
          const batch = db.batch();
          const formRef = db.collection('forms').doc(formId);
          
          // Save snapshot BEFORE unvalidating
          batch.update(formRef, { 
              status: 'draft', 
              revalidationFree: true,
              backupVersion: form, // Store current state as backup
              // IMPORTANT: Do NOT delete modificationRequestReason here. 
              // It is needed for the admin to see WHY the student is modifying when it comes back for re-validation.
          });

          const notifRef = db.collection('notifications').doc();
          batch.set(notifRef, {
              userId: form.userId,
              message: `✅ Votre demande de modification pour "${form.title}" a été acceptée.\n\n⚠️ IMPORTANT : Seules des modifications mineures sont acceptées. Vos changements seront examinés par un administrateur avant d'être appliqués.`,
              read: false,
              createdAt: new Date().toISOString()
          });

          const activityRef = db.collection('activities').doc();
          batch.set(activityRef, {
              userId: currentUser!.id,
              type: ActivityType.FORM_VALIDATION_CANCELLED,
              details: `Annulation validation pour "${form.title}"`,
              createdAt: new Date().toISOString(),
              targetId: formId
          });

          await batch.commit();
          showToast('Validation annulée. État original sauvegardé.');
      } catch (error) {
          console.error(error);
          showToast("Erreur lors de l'annulation.", 'error');
      }
  };

  const handleRequestFormModification = async (form: Form, reason: string) => {
      try {
          const admins = users.filter(u => u.role === 'admin');
          const batch = db.batch();
          
          await db.collection('forms').doc(form.id).update({
              status: 'awaiting_modification_decision',
              modificationRequestReason: reason // Save the reason to the form doc
          });

          admins.forEach(admin => {
              const notifRef = db.collection('notifications').doc();
              const notification: Omit<Notification, 'id'> = {
                  userId: admin.id,
                  message: `DEMANDE MODIFICATION\n"${form.title}"\n${reason}`,
                  read: false,
                  createdAt: new Date().toISOString(),
                  metadata: { type: 'modification_request', studentId: currentUser?.id, formId: form.id }
              };
              batch.set(notifRef, notification);
          });
          await batch.commit();
          showToast('Demande envoyée.');
      } catch (error) {
          console.error(error);
          showToast("Erreur lors de l'envoi.", 'error');
      }
  };

  const handleModificationDecision = async (formId: string, keepResponses: boolean) => {
      // OLD Logic - kept for legacy or hard resets logic if needed
      if (!keepResponses) {
          const batch = db.batch();
          const resps = await db.collection('responses').where('formId', '==', formId).get();
          resps.forEach((doc: any) => batch.delete(doc.ref));
          await batch.commit();
      }
      await db.collection('forms').doc(formId).update({ 
          status: 'draft', 
          revalidationFree: true,
          // NOTE: Reason kept here too just in case
      });
      showToast(`Modification approuvée.`);
  };

  const handleRevalidationDecision = async (form: Form, approved: boolean) => {
      const batch = db.batch();
      const formRef = db.collection('forms').doc(form.id);

      if (approved) {
          // Accept changes: status -> validated, remove backup
          batch.update(formRef, {
              status: 'validated',
              backupVersion: firebase.firestore.FieldValue.delete(),
              modificationRequestReason: firebase.firestore.FieldValue.delete() // NOW we delete the reason
          });
          
          const notifRef = db.collection('notifications').doc();
          batch.set(notifRef, {
              userId: form.userId,
              message: `✅ Modifications validées pour "${form.title}". Le formulaire est en ligne.`,
              read: false,
              createdAt: new Date().toISOString()
          });
          
          showToast("Modifications acceptées.");
      } else {
          // Reject changes: Restore backup, status -> validated
          if (form.backupVersion) {
              const restoredForm = { ...form.backupVersion };
              // Ensure we don't save the reason or nested backup or keep request data
              delete restoredForm.modificationRequestReason;
              delete restoredForm.backupVersion;
              restoredForm.status = 'validated';
              
              batch.set(formRef, restoredForm);
          } else {
              // Fallback
              batch.update(formRef, { 
                  status: 'validated',
                  modificationRequestReason: firebase.firestore.FieldValue.delete()
              }); 
          }

          const notifRef = db.collection('notifications').doc();
          batch.set(notifRef, {
              userId: form.userId,
              message: `❌ Modifications refusées pour "${form.title}". Le formulaire a été restauré à sa version précédente.`,
              read: false,
              createdAt: new Date().toISOString()
          });
          
          showToast("Modifications refusées. Formulaire restauré.");
      }
      await batch.commit();
  };

  const handleRefuseModificationRequest = async (form: Form, reason: string) => {
      try {
          await db.collection('forms').doc(form.id).update({ 
              status: 'validated',
              modificationRequestReason: firebase.firestore.FieldValue.delete() // Delete reason as request is closed
          });
          await db.collection('notifications').add({
              userId: form.userId,
              message: `❌ Modification REFUSÉE pour "${form.title}".\nRaison : ${reason}`,
              read: false,
              createdAt: new Date().toISOString()
          });
          showToast("Demande refusée.");
      } catch (error) {
          console.error(error);
          showToast("Erreur lors du refus.", 'error');
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

          await db.collection('responses').add({
              userId: currentUser.id,
              formId,
              data,
              createdAt: new Date().toISOString()
          });

           await db.collection('forms').doc(formId).update({
               responseCount: firebase.firestore.FieldValue.increment(1)
           });

           if (form.userId !== currentUser.id) {
               const commission = Math.round(systemSettings.libraryPrices.defaultPricePerResponse * systemSettings.commissionRates.creatorResponseSale);
               if (commission > 0) {
                    await db.runTransaction(async (t: any) => {
                        const creatorRef = db.collection('users').doc(form.userId);
                        const creatorDoc = await t.get(creatorRef);
                        if (creatorDoc.exists) {
                            t.update(creatorRef, { coinBalance: (creatorDoc.data().coinBalance || 0) + commission });
                            const txRef = db.collection('transactions').doc();
                            t.set(txRef, {
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
  
  // --- Soft Delete Logic for Responses ---
  const handleDeleteResponse = async (responseId: string) => {
      const responseToDelete = responses.find(r => r.id === responseId);
      if (!responseToDelete) return;

      try {
          const batch = db.batch();
          
          // Soft delete: Move to deletedItems
          const trashRef = db.collection('deletedItems').doc();
          const form = forms.find(f => f.id === responseToDelete.formId);
          const deletedItem: Omit<DeletedItem, 'id'> = {
                originalId: responseToDelete.id,
                type: 'response',
                data: responseToDelete,
                deletedAt: new Date().toISOString(),
                deletedBy: currentUser!.id,
                ownerId: responseToDelete.userId,
                ownerName: users.find(u => u.id === responseToDelete.userId)?.name || 'Inconnu',
                title: form ? `Réponse à "${form.title}"` : 'Réponse'
          };
          batch.set(trashRef, deletedItem);

          // Delete from main responses collection
          const respRef = db.collection('responses').doc(responseId);
          batch.delete(respRef);

          await db.collection('activities').add({
              userId: currentUser!.id,
              type: ActivityType.FORM_DELETED, 
              details: `Suppression d'une réponse (Mis à la corbeille)`,
              createdAt: new Date().toISOString(),
              targetId: responseId
          });

          await batch.commit();
          showToast('Réponse déplacée dans la corbeille admin.');
      } catch (error) {
          console.error(error);
          showToast('Erreur lors de la suppression.', 'error');
      }
  };

  // --- Trash Restore & Purge Logic ---
  const handleRestoreDeletedItem = async (item: DeletedItem) => {
      try {
          const batch = db.batch();
          const collectionName = item.type === 'form' ? 'forms' : 'responses';
          
          // Restore to original collection
          const originalRef = db.collection(collectionName).doc(item.originalId);
          batch.set(originalRef, item.data);

          // Delete from trash
          const trashRef = db.collection('deletedItems').doc(item.id);
          batch.delete(trashRef);

          // Log activity
          const activityRef = db.collection('activities').doc();
          batch.set(activityRef, {
              userId: currentUser!.id,
              type: ActivityType.ITEM_RESTORED,
              details: `Restauration de ${item.type} (ID: ${item.originalId})`,
              createdAt: new Date().toISOString()
          });

          await batch.commit();
          showToast('Élément restauré avec succès.');
      } catch (error) {
          console.error(error);
          showToast('Erreur lors de la restauration.', 'error');
      }
  };

  const handlePurgeDeletedItems = async (filters: { startDate: string, endDate: string, type: string, userId: string }) => {
      try {
          // Filter items locally first
          const itemsToPurge = deletedItems.filter(item => {
              const itemDate = new Date(item.deletedAt);
              if (filters.startDate) {
                  const start = new Date(filters.startDate);
                  start.setHours(0, 0, 0, 0);
                  if (itemDate < start) return false;
              }
              if (filters.endDate) {
                  const end = new Date(filters.endDate);
                  end.setHours(23, 59, 59, 999);
                  if (itemDate > end) return false;
              }
              if (filters.type !== 'all' && item.type !== filters.type) return false;
              if (filters.userId && item.ownerId !== filters.userId) return false;
              return true;
          });

          if (itemsToPurge.length === 0) return;

          const batch = db.batch();
          itemsToPurge.forEach(item => {
              const ref = db.collection('deletedItems').doc(item.id);
              batch.delete(ref);
          });

          await db.collection('activities').add({
              userId: currentUser!.id,
              type: ActivityType.TRASH_PURGED,
              details: `Purge de la corbeille (${itemsToPurge.length} éléments)`,
              createdAt: new Date().toISOString()
          });

          await batch.commit();
          showToast(`${itemsToPurge.length} élément(s) supprimé(s) définitivement.`);
      } catch (error) {
          console.error(error);
          showToast('Erreur lors de la purge.', 'error');
      }
  };

  const handlePurchaseForm = async (form: Form, withResponses: boolean): Promise<boolean | void> => {
      if (!currentUser) return false;
      const price = withResponses ? (form.price + (form.responseCount || 0) * form.pricePerResponse) : form.price;
      if (currentUser.coinBalance < price) { showToast('Solde insuffisant.', 'error'); return false; }
      try {
          const success = await processTransaction(price, TransactionType.Debit, withResponses ? TransactionReason.ResponseBundlePurchase : TransactionReason.FormPurchase, `Achat "${form.title}"`);
          if (!success) return false;
          await db.collection('purchasedForms').add({ userId: currentUser.id, formId: form.id, purchasedAt: new Date().toISOString(), withResponses, purchasePrice: price });
          const newForm: Form = { ...form, id: `form-${Date.now()}`, userId: currentUser.id, status: 'draft', isPublic: false, origin: 'purchased', responseCount: 0, createdAt: new Date().toISOString() };
          await db.collection('forms').doc(newForm.id).set(newForm);
          const commission = Math.round(form.price * systemSettings.commissionRates.creatorFormSale);
          if (commission > 0) {
               await db.runTransaction(async (t: any) => {
                    const creatorRef = db.collection('users').doc(form.userId);
                    const creatorDoc = await t.get(creatorRef);
                    if (creatorDoc.exists) {
                        t.update(creatorRef, { coinBalance: firebase.firestore.FieldValue.increment(commission) });
                        const txRef = db.collection('transactions').doc();
                        t.set(txRef, { userId: form.userId, type: TransactionType.Credit, amount: commission, reason: TransactionReason.FormSaleCommission, details: `Vente "${form.title}"`, createdAt: new Date().toISOString() });
                    }
               });
           }
          showToast('Achat effectué !');
          return true;
      } catch (error) { console.error(error); showToast("Erreur achat.", 'error'); return false; }
  };

  const handleCoinTransfer = async (recipientEmail: string, amount: number): Promise<boolean> => {
      if (!currentUser) return false;
      try {
          const snap = await db.collection('users').where('email', '==', recipientEmail.toLowerCase()).limit(1).get();
          if (snap.empty) { showToast("Utilisateur introuvable.", 'error'); return false; }
          const recipient = snap.docs[0].data() as User;
          if (recipient.id === currentUser.id) { showToast("Impossible vers soi-même.", 'error'); return false; }
          if (currentUser.coinBalance < amount) { showToast("Solde insuffisant.", 'error'); return false; }
          await db.runTransaction(async (t: any) => {
              const senderRef = db.collection('users').doc(currentUser.id);
              t.update(senderRef, { coinBalance: firebase.firestore.FieldValue.increment(-amount) });
              const txDebitRef = db.collection('transactions').doc();
              t.set(txDebitRef, { userId: currentUser.id, type: TransactionType.Debit, amount, reason: TransactionReason.COIN_TRANSFER_SENT, details: `Vers ${recipient.name}`, createdAt: new Date().toISOString() });
              const recipientRef = db.collection('users').doc(recipient.id);
              t.update(recipientRef, { coinBalance: firebase.firestore.FieldValue.increment(amount) });
              const txCreditRef = db.collection('transactions').doc();
              t.set(txCreditRef, { userId: recipient.id, type: TransactionType.Credit, amount, reason: TransactionReason.COIN_TRANSFER_RECEIVED, details: `De ${currentUser.name}`, createdAt: new Date().toISOString() });
              const notifRef = db.collection('notifications').doc();
              t.set(notifRef, { userId: recipient.id, message: `Reçu ${amount} coins de ${currentUser.name}.`, read: false, createdAt: new Date().toISOString() });
          });
          showToast("Transfert effectué.");
          return true;
      } catch (error) { console.error(error); showToast("Erreur transfert.", 'error'); return false; }
  };

  const handleAnalysisTransaction = async (userId: string, reason: TransactionReason, context?: { formIds?: string[] }): Promise<boolean> => {
      const count = context?.formIds?.length || 0;
      if (count === 0) return true;
      const cost = systemSettings.coinCosts.aiAnalysis * count;
      if (currentUser && currentUser.coinBalance < cost && currentUser.role !== 'admin') { showToast(`Solde insuffisant (${cost} coins requis).`, 'error'); return false; }
      const success = await processTransaction(cost, TransactionType.Debit, reason, `Déblocage Analyse IA`);
      if (success && context && context.formIds) {
          const batch = db.batch();
          context.formIds.forEach(fid => { const ref = db.collection('unlockedAnalysis').doc(); batch.set(ref, { userId: currentUser!.id, formId: fid, unlockedAt: new Date().toISOString() }); });
          await batch.commit();
      }
      return success;
  };

  const handleUpdateSettings = async (newSettings: SystemSettings) => {
      try {
          await db.collection('settings').doc('general').set(newSettings);
          await db.collection('activities').add({
              userId: currentUser!.id,
              type: ActivityType.SYSTEM_SETTINGS_UPDATED,
              details: "Mise à jour des paramètres système",
              createdAt: new Date().toISOString()
          });
          showToast("Paramètres mis à jour.");
      } catch (error) {
          console.error(error);
          showToast("Erreur sauvegarde paramètres.", 'error');
      }
  };

  const handleCreditAllUsers = async (amount: number, message: string) => {
      try {
          const batch = db.batch();
          const students = users.filter(u => u.role === 'student');
          
          students.forEach(student => {
              const userRef = db.collection('users').doc(student.id);
              batch.update(userRef, { coinBalance: firebase.firestore.FieldValue.increment(amount) });
              
              const notifRef = db.collection('notifications').doc();
              batch.set(notifRef, {
                  userId: student.id,
                  message: `🎁 CADEAU : ${message}`,
                  read: false,
                  createdAt: new Date().toISOString()
              });

              const txRef = db.collection('transactions').doc();
              batch.set(txRef, {
                  userId: student.id,
                  type: TransactionType.Credit,
                  amount,
                  reason: TransactionReason.PROMOTIONAL_GIFT,
                  details: "Campagne Promo",
                  createdAt: new Date().toISOString()
              });
          });
          
          await db.collection('activities').add({
              userId: currentUser!.id,
              type: ActivityType.PROMOTIONAL_CAMPAIGN,
              details: `Envoi de ${amount} coins à ${students.length} étudiants`,
              createdAt: new Date().toISOString()
          });

          await batch.commit();
          showToast("Campagne promotionnelle terminée avec succès.");
      } catch (error) {
           console.error(error);
          showToast("Erreur lors de la promotion.", 'error');
      }
  };
  
  const handleUpdateUserStatus = async (userId: string, status: User['status']) => {
      try {
          await db.collection('users').doc(userId).update({ status });
          showToast(`Statut utilisateur mis à jour : ${status}`);
      } catch (error) {
          console.error(error);
          showToast("Erreur mise à jour statut.", 'error');
      }
  };

  const handleAdminCoinAdjustment = async (userId: string, amount: number, type: TransactionType) => {
      try {
          await db.runTransaction(async (t: any) => {
              const userRef = db.collection('users').doc(userId);
              const change = type === TransactionType.Credit ? amount : -amount;
              t.update(userRef, { coinBalance: firebase.firestore.FieldValue.increment(change) });
              
              const txRef = db.collection('transactions').doc();
              t.set(txRef, {
                  userId,
                  type,
                  amount,
                  reason: TransactionReason.AdminAdjustment,
                  details: "Ajustement manuel par Admin",
                  createdAt: new Date().toISOString()
              });

              // Notification
              const notifRef = db.collection('notifications').doc();
              t.set(notifRef, {
                  userId,
                  message: `Votre solde a été ajusté de ${change > 0 ? '+' : ''}${change} coins par l'administration.`,
                  read: false,
                  createdAt: new Date().toISOString()
              });
          });
          showToast("Ajustement effectué.");
      } catch (error) {
          console.error(error);
          showToast("Erreur ajustement.", 'error');
      }
  };

  const handleSendNotification = async (userId: string, message: string) => {
      try {
          await db.collection('notifications').add({
              userId,
              message,
              read: false,
              createdAt: new Date().toISOString()
          });
          showToast("Notification envoyée.");
      } catch (error) {
          console.error(error);
          showToast("Erreur envoi notification.", 'error');
      }
  };

  const handleUpdateProfile = async (updatedUser: User) => {
      try {
          await db.collection('users').doc(updatedUser.id).update(updatedUser);
          setCurrentUser(updatedUser);
          showToast("Profil mis à jour.");
      } catch (error) {
          console.error(error);
          showToast("Erreur mise à jour profil.", 'error');
      }
  };

  const handleMarkNotificationsRead = async () => {
      if (!currentUser) return;
      const unread = notifications.filter(n => !n.read);
      if (unread.length === 0) return;
      
      const batch = db.batch();
      unread.forEach(n => {
          const ref = db.collection('notifications').doc(n.id);
          batch.update(ref, { read: true });
      });
      await batch.commit();
  };
  
  const handleSaveAnalysisToHistory = async (formIds: string[], formTitles: string[], userPrompt: string, analysisResult: any) => {
      if (!currentUser) return;
      try {
          await db.collection('analysisHistory').add({
              userId: currentUser.id,
              formIds,
              formTitles,
              userPrompt,
              analysisResult,
              createdAt: new Date().toISOString()
          });
          // Also log activity
          await db.collection('activities').add({
              userId: currentUser.id,
              type: ActivityType.AI_ANALYSIS_PERFORMED,
              details: `Analyse IA sur : ${formTitles.join(', ')}`,
              createdAt: new Date().toISOString()
          });
      } catch (error) {
          console.error("Failed to save history", error);
      }
  };
  
  const handleDeleteAnalysisHistory = async (id: string) => {
      try {
          await db.collection('analysisHistory').doc(id).delete();
          showToast("Historique supprimé.");
      } catch (error) {
          console.error(error);
          showToast("Erreur suppression historique.", 'error');
      }
  };


  // --- Render ---

  if (loadingAuth) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-slate-100 dark:bg-slate-900">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-600"></div>
          </div>
      );
  }

  if (!currentUser) {
    return <AuthPage onLogin={() => { /* Handled by auth listener */ }} />;
  }

  return (
    <div className={`flex h-screen bg-slate-100 dark:bg-slate-900 font-sans ${theme}`}>
       <Sidebar 
          user={currentUser} 
          currentPage={currentPage} 
          onNavigate={handleNavigate}
          onOpenComplaintModal={() => setIsComplaintModalOpen(true)}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
       />
       
       <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300 lg:ml-80">
          <Header 
            user={currentUser} 
            onLogout={handleLogout} 
            currentPage={currentPage}
            notifications={notifications}
            onMarkNotificationsRead={handleMarkNotificationsRead}
            theme={theme}
            onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            onNavigate={handleNavigate}
            setIsSidebarOpen={setIsSidebarOpen}
            onNotificationClick={handleNotificationClick}
          />
          
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 dark:bg-slate-900 p-4 lg:p-6 scroll-smooth">
             {currentPage === 'tableau-de-bord' && (
               <Dashboard 
                  user={currentUser}
                  forms={forms}
                  responses={responses}
                  users={users}
                  transactions={transactions}
                  activities={activities}
                  onNavigate={handleNavigate}
               />
             )}
             {currentPage === 'formulaires' && (
                <Forms 
                    user={currentUser}
                    forms={forms}
                    allForms={forms} 
                    responses={responses}
                    purchasedForms={purchasedForms}
                    addFormResponse={handleAddResponse}
                    deleteFormResponse={handleDeleteResponse}
                    createForm={handleCreateForm}
                    updateForm={handleUpdateForm}
                    deleteForm={handleDeleteForm}
                    deletePurchasedForm={handleDeletePurchasedForm}
                    saveAndValidateForm={handleSaveAndValidateForm}
                    publishForm={handlePublishForm}
                    unpublishForm={handleUnpublishForm}
                    users={users}
                    onNavigate={handleNavigate}
                    handleRequestFormModification={handleRequestFormModification}
                    onModificationDecision={handleModificationDecision}
                    systemSettings={systemSettings}
                />
             )}
             {currentPage === 'bibliotheque' && (
                 <Library 
                    currentUser={currentUser}
                    publicForms={forms.filter(f => f.isPublic)}
                    purchasedForms={purchasedForms}
                    responses={responses}
                    users={users}
                    onPurchase={handlePurchaseForm}
                    systemSettings={systemSettings}
                 />
             )}
             {currentPage === 'analyse' && (
                 <Analysis 
                    user={currentUser}
                    forms={forms}
                    responses={responses}
                    onTransaction={handleAnalysisTransaction}
                    analysisContext={analysisContext}
                    onNavigate={handleNavigate}
                    analysisHistory={analysisHistory}
                    saveAnalysisToHistory={handleSaveAnalysisToHistory}
                    deleteAnalysisHistory={handleDeleteAnalysisHistory}
                    unlockedAnalysis={unlockedAnalysis}
                    systemSettings={systemSettings}
                 />
             )}
             {currentPage === 'portefeuille' && (
                 <Wallet 
                    user={currentUser}
                    transactions={transactions}
                    users={users}
                    onCoinTransfer={handleCoinTransfer}
                 />
             )}
             {currentPage === 'profil' && (
                 <Profile 
                    user={currentUser}
                    onUpdateProfile={handleUpdateProfile}
                 />
             )}
             {currentPage === 'notifications' && (
                 <NotificationsPage 
                    notifications={notifications}
                    onNotificationClick={handleNotificationClick} 
                 />
             )}
             
             {/* Admin Pages */}
             {currentUser.role === 'admin' && currentPage === 'etudiants' && (
                 <Students 
                    users={users}
                    forms={forms}
                    responses={responses}
                    onSendNotification={handleSendNotification}
                    onUpdateUserStatus={handleUpdateUserStatus}
                    onAdminCoinAdjustment={handleAdminCoinAdjustment}
                    onUnvalidateForm={handleUnvalidateForm}
                    onRefuseModification={handleRefuseModificationRequest}
                    onRevalidationDecision={handleRevalidationDecision}
                    context={studentContext}
                 />
             )}
             {currentUser.role === 'admin' && currentPage === 'finances' && (
                 <Finance transactions={transactions} users={users} />
             )}
             {currentUser.role === 'admin' && currentPage === 'activite' && (
                 <ActivityPage activities={activities} users={users} />
             )}
             {currentUser.role === 'admin' && currentPage === 'corbeille' && (
                 <AdminTrash 
                    deletedItems={deletedItems} 
                    users={users}
                    onRestore={handleRestoreDeletedItem}
                    onPurge={handlePurgeDeletedItems}
                 />
             )}
             {currentUser.role === 'admin' && currentPage === 'configuration' && (
                 <AdminConfiguration 
                    settings={systemSettings} 
                    users={users}
                    onUpdateSettings={handleUpdateSettings}
                    onCreditAllUsers={handleCreditAllUsers}
                 />
             )}
          </main>
       </div>
       
       <Chatbot user={currentUser} onNavigate={handleNavigate} systemSettings={systemSettings} />
       
       {toast && (
        <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
        />
       )}

       <ComplaintModal 
        isOpen={isComplaintModalOpen} 
        onClose={() => setIsComplaintModalOpen(false)}
        onSubmit={handleComplaintSubmit}
       />

    </div>
  );
};

export default App;