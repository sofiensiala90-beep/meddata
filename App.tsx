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

      // My Forms (Private & Purchased)
      listeners.push(db.collection('forms').where('userId', '==', currentUser.id).onSnapshot((snap: any) => {
          setForms(prev => {
              const myForms = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
              // Important: Keep forms that are NOT mine (i.e., public forms loaded by the other listener)
              const othersForms = prev.filter(f => f.userId !== currentUser.id);
              return [...othersForms, ...myForms];
          });
      }));
      
      // Public Forms (Library)
      listeners.push(db.collection('forms').where('isPublic', '==', true).onSnapshot((snap: any) => {
          setForms(prev => {
              const publicForms = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Form));
              // Important: Keep forms that ARE mine (loaded by the other listener)
              const myForms = prev.filter(f => f.userId === currentUser.id);
              
              const combined = [...myForms];
              publicForms.forEach(pf => {
                  // Add public form only if it's not already in the list (e.g. if I am the creator, it's already in myForms)
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

      // Unlocked Analysis (Updated to use UnlockedAnalysis type)
      listeners.push(db.collection('unlockedAnalysis').where('userId', '==', currentUser.id).onSnapshot((snap: any) => {
          setUnlockedAnalysis(snap.docs.map((d: any) => d.data() as UnlockedAnalysis));
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

    if (!uid) {
        console.error("Transaction Error: userId is undefined");
        return false;
    }

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
            
            // Clean data to remove any potential undefined values that Firestore hates
            const cleanFormData = JSON.parse(JSON.stringify(formToDelete));
            
            // Ensure strict types for critical fields
            const deletedItem: Omit<DeletedItem, 'id'> = {
                originalId: formToDelete.id,
                type: 'form',
                data: cleanFormData,
                deletedAt: new Date().toISOString(),
                deletedBy: currentUser!.id,
                ownerId: formToDelete.userId || currentUser!.id, // Fallback if missing
                ownerName: users.find(u => u.id === formToDelete.userId)?.name || 'Inconnu',
                title: formToDelete.title
            };
            batch.set(trashRef, deletedItem);
        }

        // Delete from main forms collection (always)
        const formRef = db.collection('forms').doc(formId);
        batch.delete(formRef);

        await batch.commit();

        // Log Activity after successful commit
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

        const rawUpdatedForm = { 
            ...form, 
            status: newStatus,
            // On préserve backupVersion s'il existe déjà
            backupVersion: existingForm?.backupVersion || form.backupVersion,
            // On préserve le motif de la demande
            modificationRequestReason: existingForm?.modificationRequestReason || form.modificationRequestReason
        };

        // Nettoyage des valeurs undefined pour Firestore
        const updatedForm = JSON.parse(JSON.stringify(rawUpdatedForm));
        
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
              status: 'validated' // Ensure it stays validated
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
  
  const handleUnvalidateForm = async (formId: string) => {
      const form = forms.find(f => f.id === formId);
      if (!form) return;

      try {
          const batch = db.batch();

          // 1. Mise à jour du formulaire
          const formRef = db.collection('forms').doc(formId);
          batch.update(formRef, {
              status: 'draft',
              revalidationFree: true
          });

          // 2. Notification à l'étudiant avec l'avertissement spécifique
          const notifRef = db.collection('notifications').doc();
          batch.set(notifRef, {
              userId: form.userId,
              message: `✅ Votre demande de modification pour "${form.title}" a été acceptée.\n\n⚠️ IMPORTANT : Seules des modifications mineures sont acceptées (ajout ou suppression d'une question ou d'un choix de réponse, faute de frappe). Si l'administration juge que votre modification est trop importante (changement structurel majeur), vous risquez la suppression définitive de votre formulaire.`,
              read: false,
              createdAt: new Date().toISOString(),
              metadata: { type: 'info' } // Simple info notification
          });

          // 3. Log d'activité
          const activityRef = db.collection('activities').doc();
          batch.set(activityRef, {
              userId: currentUser!.id,
              type: ActivityType.FORM_VALIDATION_CANCELLED,
              details: `Annulation validation pour "${form.title}"`,
              createdAt: new Date().toISOString(),
              targetId: formId
          });

          await batch.commit();
          showToast('Validation annulée. L\'étudiant a été notifié des conditions.');
      } catch (error) {
          console.error(error);
          showToast("Erreur lors de l'annulation.", 'error');
      }
  };

  const handleRequestFormModification = async (form: Form, reason: string) => {
      try {
          const admins = users.filter(u => u.role === 'admin');
          const batch = db.batch();
          
          const formRef = db.collection('forms').doc(form.id);
          
          // Sanitize form before storing as backup
          const sanitizedBackup = JSON.parse(JSON.stringify(form));

          batch.update(formRef, {
              status: 'awaiting_modification_decision',
              modificationRequestReason: reason,
              backupVersion: sanitizedBackup // Save current state
          });

          admins.forEach(admin => {
              const notifRef = db.collection('notifications').doc();
              batch.set(notifRef, {
                  userId: admin.id,
                  message: `Demande de modification pour "${form.title}" par ${currentUser?.name}.\nRaison: ${reason}`,
                  read: false,
                  createdAt: new Date().toISOString(),
                  metadata: { type: 'modification_request', studentId: currentUser?.id, formId: form.id }
              });
          });
          await batch.commit();
          showToast('Demande envoyée aux administrateurs.');
      } catch (error) {
          console.error(error);
          showToast("Erreur lors de l'envoi de la demande.", 'error');
      }
  };

  const handleModificationDecision = async (formId: string, keepResponses: boolean) => {
      // Deprecated flow but keeping logic if needed
      if (!keepResponses) {
          // Delete responses logic
          const batch = db.batch();
          const resps = await db.collection('responses').where('formId', '==', formId).get();
          resps.forEach((doc: any) => batch.delete(doc.ref));
          await batch.commit();
      }
      
      await db.collection('forms').doc(formId).update({
          status: 'draft',
          revalidationFree: true
      });
      showToast(`Modification approuvée. Formulaire en brouillon.`);
  };
  
  // Admin Refuses Modification Request
  const handleRefuseModification = async (form: Form, reason: string) => {
      try {
          const batch = db.batch();
          
          // Revert status to validated
          const formRef = db.collection('forms').doc(form.id);
          batch.update(formRef, {
              status: 'validated',
              modificationRequestReason: firebase.firestore.FieldValue.delete(), // Clear reason
              backupVersion: firebase.firestore.FieldValue.delete()
          });

          // Notify Student
          const notifRef = db.collection('notifications').doc();
          batch.set(notifRef, {
              userId: form.userId,
              message: `❌ Votre demande de modification pour "${form.title}" a été refusée.\n\nMotif : ${reason}`,
              read: false,
              createdAt: new Date().toISOString()
          });

          await batch.commit();
          showToast('Demande refusée. L\'étudiant a été notifié.');
      } catch (error) {
          console.error(error);
          showToast("Erreur lors du refus.", 'error');
      }
  };
  
  // Admin Decisions on Re-validation (Pending Revalidation)
  const handleRevalidationDecision = async (form: Form, approved: boolean) => {
      try {
          const batch = db.batch();
          const formRef = db.collection('forms').doc(form.id);

          if (approved) {
              // Approve: Set to validated, clear backup/reason
              batch.update(formRef, {
                  status: 'validated',
                  modificationRequestReason: firebase.firestore.FieldValue.delete(),
                  backupVersion: firebase.firestore.FieldValue.delete(),
                  revalidationFree: false // Reset flag
              });
              
              // Notify Student
              const notifRef = db.collection('notifications').doc();
              batch.set(notifRef, {
                  userId: form.userId,
                  message: `✅ Vos modifications sur "${form.title}" ont été approuvées et publiées.`,
                  read: false,
                  createdAt: new Date().toISOString()
              });
              
              showToast("Modifications approuvées.");
          } else {
              // Reject: Revert to backupVersion
              if (form.backupVersion) {
                  // Restore original fields and status
                  batch.set(formRef, {
                      ...form.backupVersion,
                      status: 'validated', // Ensure it is validated
                      // Ensure these are cleared
                      modificationRequestReason: firebase.firestore.FieldValue.delete(),
                      backupVersion: firebase.firestore.FieldValue.delete(),
                      revalidationFree: false
                  });
              } else {
                  // Fallback if no backup (should not happen in this flow)
                  batch.update(formRef, { status: 'validated' });
              }

              // Notify Student
              const notifRef = db.collection('notifications').doc();
              batch.set(notifRef, {
                  userId: form.userId,
                  message: `❌ Vos modifications sur "${form.title}" ont été refusées car elles ne correspondaient pas aux critères (modifications mineures uniquement). Le formulaire a été restauré à sa version précédente.`,
                  read: false,
                  createdAt: new Date().toISOString()
              });
              
              showToast("Modifications refusées et formulaire restauré.");
          }

          await batch.commit();
      } catch (error) {
          console.error(error);
          showToast("Erreur lors de la décision.", 'error');
      }
  };

  // --- Response Operations ---

  const handleAddResponse = async (formId: string, data: Record<string, any>) => {
      const form = forms.find(f => f.id === formId);
      if (!form || !currentUser) return;

      const cost = systemSettings.coinCosts.addResponse;
      
      try {
          if (currentUser.role === 'student') {
              const success = await processTransaction(cost, TransactionType.Debit, TransactionReason.FormResponse, `Réponse à "${form.title}"`);
              if (!success) return;
          }

          const responseId = await db.collection('responses').add({
              userId: currentUser.id,
              formId,
              data,
              createdAt: new Date().toISOString()
          });

           // Update form response count (Atomic increment if possible, or simple update)
           // Firestore doesn't support easy count on document without cloud functions usually,
           // but we can update a field 'responseCount' on the form for UI speed.
           await db.collection('forms').doc(formId).update({
               responseCount: firebase.firestore.FieldValue.increment(1)
           });
           
           await db.collection('activities').add({
              userId: currentUser.id,
              type: ActivityType.RESPONSE_ADDED,
              details: `Réponse ajoutée au formulaire "${form.title}"`,
              createdAt: new Date().toISOString(),
              targetId: form.id
           });

           // Handle commissions if it's a purchased form/response
           // (Logic simplified: if form creator is different, pay them commission)
           if (form.userId !== currentUser.id) {
               const commission = Math.round(systemSettings.libraryPrices.defaultPricePerResponse * systemSettings.commissionRates.creatorResponseSale);
               if (commission > 0) {
                    await db.runTransaction(async (t: any) => {
                        const creatorRef = db.collection('users').doc(form.userId);
                        const creatorDoc = await t.get(creatorRef);
                        if (creatorDoc.exists) {
                            const newBalance = (creatorDoc.data().coinBalance || 0) + commission;
                            t.update(creatorRef, { coinBalance: newBalance });
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
          showToast('Erreur lors de l\'ajout de la réponse.', 'error');
      }
  };
  
  const handleDeleteResponse = async (responseId: string) => {
      // Fetch response to log activity correctly (optional but good)
      // For now just delete
      try {
          const respDoc = await db.collection('responses').doc(responseId).get();
          const respData = respDoc.data();
          
          if (respData) {
              const batch = db.batch();
              
              // Soft delete response
              const trashRef = db.collection('deletedItems').doc();
              // Clean data
              const cleanRespData = JSON.parse(JSON.stringify(respData));

              const deletedItem: Omit<DeletedItem, 'id'> = {
                  originalId: responseId,
                  type: 'response',
                  data: cleanRespData,
                  deletedAt: new Date().toISOString(),
                  deletedBy: currentUser!.id,
                  ownerId: respData.userId,
                  ownerName: users.find(u => u.id === respData.userId)?.name || 'Inconnu',
                  title: forms.find(f => f.id === respData.formId)?.title || 'Réponse'
              };
              batch.set(trashRef, deletedItem);
              
              batch.delete(db.collection('responses').doc(responseId));
              
              // Decrement count - Only if I own the form
              // If not owner, we can't update. We'll skip updating count if not owner to prevent permission errors.
              // Note: This means counts might desync for purchased data but safe for now.
              if (forms.some(f => f.id === respData.formId && f.userId === currentUser!.id)) {
                  const formRef = db.collection('forms').doc(respData.formId);
                  batch.update(formRef, { responseCount: firebase.firestore.FieldValue.increment(-1) });
              }

              await batch.commit();
              showToast('Réponse déplacée dans la corbeille admin.');
          }
      } catch (error) {
          console.error(error);
          showToast('Erreur lors de la suppression.', 'error');
      }
  };

  // --- Wallet & Purchase Operations ---

  const handlePurchaseForm = async (form: Form, withResponses: boolean): Promise<boolean | void> => {
      if (!currentUser) return false;
      
      const price = withResponses 
        ? (form.price + (form.responseCount || 0) * form.pricePerResponse) 
        : form.price;

      if (currentUser.coinBalance < price) {
          showToast('Solde insuffisant.', 'error');
          return false;
      }

      try {
          const success = await processTransaction(price, TransactionType.Debit, withResponses ? TransactionReason.ResponseBundlePurchase : TransactionReason.FormPurchase, `Achat "${form.title}"`);
          if (!success) return false;

          const batch = db.batch();

          // 1. Add to purchased forms receipt
          const purchaseRef = db.collection('purchasedForms').doc();
          batch.set(purchaseRef, {
              userId: currentUser.id,
              formId: form.id,
              purchasedAt: new Date().toISOString(),
              withResponses,
              purchasePrice: price
          });

          // 2. Create a copy for the user (Origin: purchased)
          // IF withResponses = true -> Status: Validated
          // IF withResponses = false -> Status: Draft (User needs to add responses)
          const newFormId = `form-${Date.now()}`;
          const newForm: Form = {
              ...form,
              id: newFormId,
              userId: currentUser.id,
              status: withResponses ? 'validated' : 'draft', // Key change here
              isPublic: false,
              origin: 'purchased',
              responseCount: withResponses ? (form.responseCount || 0) : 0,
              createdAt: new Date().toISOString(),
              sourceFormId: form.id, // Link to original form
          };
          
          const newFormRef = db.collection('forms').doc(newFormId);
          batch.set(newFormRef, newForm);

          // 3. If withResponses, copy the responses too
          if (withResponses) {
              const originalResponsesSnap = await db.collection('responses').where('formId', '==', form.id).get();
              originalResponsesSnap.docs.forEach((doc: any) => {
                  const originalData = doc.data();
                  const newRespRef = db.collection('responses').doc();
                  batch.set(newRespRef, {
                      ...originalData,
                      userId: currentUser.id, // Buyer owns the copy
                      formId: newFormId, // Link to the new copied form
                      createdAt: new Date().toISOString() // Or keep original date? Resetting implies acquisition time.
                  });
              });
          }

          // 4. Pay Commission to Creator (Handled separately via transaction to ensure balance update is atomic)
          // We commit the batch first (Form + Responses creation)
          await batch.commit();

          // 5. Commission Transaction (Separate from batch due to race conditions on balance)
           const commission = Math.round(form.price * systemSettings.commissionRates.creatorFormSale);
           if (commission > 0) {
               await db.runTransaction(async (t: any) => {
                    const creatorRef = db.collection('users').doc(form.userId);
                    const creatorDoc = await t.get(creatorRef);
                    if (creatorDoc.exists) {
                        t.update(creatorRef, { coinBalance: firebase.firestore.FieldValue.increment(commission) });
                        const txRef = db.collection('transactions').doc();
                        t.set(txRef, {
                            userId: form.userId,
                            type: TransactionType.Credit,
                            amount: commission,
                            reason: TransactionReason.FormSaleCommission,
                            details: `Vente "${form.title}"`,
                            createdAt: new Date().toISOString()
                        });
                    }
               });
           }
           
           await db.collection('activities').add({
              userId: currentUser.id,
              type: ActivityType.FORM_PURCHASED,
              details: `Achat du formulaire "${form.title}"`,
              createdAt: new Date().toISOString(),
              targetId: form.id
           });

          showToast('Achat effectué avec succès ! Vous pouvez maintenant utiliser ce formulaire.');
          return true;
      } catch (error) {
          console.error(error);
          showToast("Erreur lors de l'achat.", 'error');
          return false;
      }
  };

  const handleCoinTransfer = async (recipientEmail: string, amount: number): Promise<boolean> => {
      if (!currentUser) return false;
      
      // Find recipient by email
      try {
          const snap = await db.collection('users').where('email', '==', recipientEmail.toLowerCase()).limit(1).get();
          if (snap.empty) {
              showToast("Utilisateur introuvable.", 'error');
              return false;
          }
          const recipient = snap.docs[0].data() as User;
          
          if (recipient.id === currentUser.id) {
               showToast("Vous ne pouvez pas vous envoyer des coins.", 'error');
               return false;
          }

          if (currentUser.coinBalance < amount) {
              showToast("Solde insuffisant.", 'error');
              return false;
          }

          // Execute Transfer
          await db.runTransaction(async (t: any) => {
              // Deduct
              const senderRef = db.collection('users').doc(currentUser.id);
              t.update(senderRef, { coinBalance: firebase.firestore.FieldValue.increment(-amount) });
              const txDebitRef = db.collection('transactions').doc();
              t.set(txDebitRef, {
                  userId: currentUser.id,
                  type: TransactionType.Debit,
                  amount,
                  reason: TransactionReason.COIN_TRANSFER_SENT,
                  details: `Transfert vers ${recipient.name}`,
                  createdAt: new Date().toISOString()
              });

              // Add
              const recipientRef = db.collection('users').doc(recipient.id);
              t.update(recipientRef, { coinBalance: firebase.firestore.FieldValue.increment(amount) });
              const txCreditRef = db.collection('transactions').doc();
              t.set(txCreditRef, {
                  userId: recipient.id,
                  type: TransactionType.Credit,
                  amount,
                  reason: TransactionReason.COIN_TRANSFER_RECEIVED,
                  details: `Reçu de ${currentUser.name}`,
                  createdAt: new Date().toISOString()
              });

              // Notify recipient
              const notifRef = db.collection('notifications').doc();
              t.set(notifRef, {
                  userId: recipient.id,
                  message: `Vous avez reçu ${amount} coins de ${currentUser.name}.`,
                  read: false,
                  createdAt: new Date().toISOString()
              });
          });
          
          await db.collection('activities').add({
              userId: currentUser.id,
              type: ActivityType.COIN_TRANSFER,
              details: `Transfert de ${amount} coins à ${recipient.name}`,
              createdAt: new Date().toISOString()
          });

          showToast("Transfert effectué.");
          return true;

      } catch (error) {
          console.error(error);
          showToast("Erreur lors du transfert.", 'error');
          return false;
      }
  };

  // --- Admin Operations ---

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
  
  // --- Admin Trash Operations ---
  const handleRestoreItem = async (item: DeletedItem) => {
      try {
          const batch = db.batch();
          
          if (item.type === 'form') {
              // Restore Form
              await db.collection('forms').doc(item.originalId).set(item.data);
          } else {
              // Restore Response
              await db.collection('responses').doc(item.originalId).set(item.data);
              // Increment count on form if possible
              const formRef = db.collection('forms').doc(item.data.formId);
              batch.update(formRef, { responseCount: firebase.firestore.FieldValue.increment(1) });
          }
          
          // Remove from deletedItems
          batch.delete(db.collection('deletedItems').doc(item.id));
          
          await db.collection('activities').add({
              userId: currentUser!.id,
              type: ActivityType.ITEM_RESTORED,
              details: `Restauration de ${item.type === 'form' ? 'formulaire' : 'réponse'} "${item.title || item.originalId}"`,
              createdAt: new Date().toISOString()
          });

          await batch.commit();
          showToast("Élément restauré avec succès.");
      } catch (error) {
          console.error(error);
          showToast("Erreur lors de la restauration.", 'error');
      }
  };
  
  const handlePurgeTrash = async (filters: { startDate: string, endDate: string, type: string, userId: string }) => {
      try {
          let query: any = db.collection('deletedItems');
          
          // Fetch all docs to filter (simplest for Admin tool with reasonable size)
          const snapshot = await query.get();
          const batch = db.batch();
          let count = 0;
          
          snapshot.docs.forEach((doc: any) => {
              const item = doc.data() as DeletedItem;
              // Apply filters logic
              let match = true;
              if (filters.type !== 'all' && item.type !== filters.type) match = false;
              if (filters.userId && item.ownerId !== filters.userId) match = false;
              
              const itemDate = new Date(item.deletedAt);
              if (filters.startDate) {
                  const start = new Date(filters.startDate);
                  start.setHours(0,0,0,0);
                  if (itemDate < start) match = false;
              }
              if (filters.endDate) {
                  const end = new Date(filters.endDate);
                  end.setHours(23,59,59,999);
                  if (itemDate > end) match = false;
              }
              
              if (match) {
                  batch.delete(doc.ref);
                  count++;
              }
          });
          
          if (count > 0) {
              await batch.commit();
              await db.collection('activities').add({
                  userId: currentUser!.id,
                  type: ActivityType.TRASH_PURGED,
                  details: `Purge de la corbeille (${count} éléments supprimés)`,
                  createdAt: new Date().toISOString()
              });
              showToast(`${count} éléments supprimés définitivement.`);
          } else {
              showToast("Aucun élément à supprimer avec ces filtres.");
          }
      } catch (error) {
          console.error(error);
          showToast("Erreur lors de la purge.", 'error');
      }
  };

  // --- Other ---
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
  
  const handleAnalysisTransaction = async (userId: string, reason: TransactionReason, context?: { formIds?: string[] }): Promise<boolean> => {
      const cost = systemSettings.coinCosts.aiAnalysis;
      if (currentUser && currentUser.coinBalance < cost && currentUser.role !== 'admin') {
          showToast("Solde insuffisant pour l'analyse.", 'error');
          return false;
      }

      const success = await processTransaction(cost, TransactionType.Debit, reason, "Analyse IA Avancée");
      if (success) {
          if (context && context.formIds) {
              const batch = db.batch();
              context.formIds.forEach(fid => {
                   const ref = db.collection('unlockedAnalysis').doc();
                   batch.set(ref, { userId: currentUser!.id, formId: fid });
              });
              await batch.commit();
          }
      }
      return success;
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
                    allForms={forms} // Actually passed 'forms' contains all loaded forms suitable for context
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
                    unpublishForm={handleUnvalidateForm}
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
                    userForms={forms.filter(f => f.userId === currentUser.id)} // NEW: Pass user forms
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
                 <NotificationsPage notifications={notifications} onNotificationClick={handleNotificationClick} />
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
                    onRefuseModification={handleRefuseModification}
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
                    onRestore={handleRestoreItem}
                    onPurge={handlePurgeTrash}
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