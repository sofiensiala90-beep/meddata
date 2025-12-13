import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Form, FormResponse, FormField, PurchasedForm, SystemSettings } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import FormBuilder from '../components/FormBuilder';
import ConfirmationModal, { ConfirmationModalProps } from '../components/ConfirmationModal';
import PlusIcon from '../components/icons/PlusIcon';
import CoinIcon from '../components/icons/CoinIcon';
import TrashIcon from '../components/icons/TrashIcon';
import ArrowUpIcon from '../components/icons/ArrowUpIcon';
import ArrowDownIcon from '../components/icons/ArrowDownIcon';

interface FormsProps {
  user: User;
  forms: Form[]; // User's own forms (created + purchased copies)
  allForms: Form[]; // All forms in the app, needed for purchases lookups
  responses: FormResponse[];
  purchasedForms: PurchasedForm[];
  addFormResponse: (formId: string, data: Record<string, any>) => void;
  deleteFormResponse: (responseId: string) => void;
  createForm: (form: Form) => void;
  updateForm: (form: Form) => void;
  deleteForm: (formId: string) => void;
  deletePurchasedForm: (purchaseId: string) => void;
  saveAndValidateForm: (form: Form) => void;
  publishForm: (formId: string, price: number, pricePerResponse: number) => void;
  unpublishForm: (formId: string) => void;
  users: User[];
  onNavigate: (page: string, context?: any) => void;
  handleRequestFormModification: (form: Form, reason: string) => void;
  onModificationDecision: (formId: string, keepResponses: boolean) => void;
  systemSettings: SystemSettings;
}

const PublishModal: React.FC<{
  form: Form;
  onClose: () => void;
  onConfirm: (formId: string, price: number, pricePerResponse: number) => void;
  settings: SystemSettings;
}> = ({ form, onClose, onConfirm, settings }) => {

  const handleConfirm = () => {
    onConfirm(form.id, settings.libraryPrices.defaultFormPrice, settings.libraryPrices.defaultPricePerResponse);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Publier "{form.title}"</h3>
        </header>
        <main className="p-6 space-y-4 overflow-y-auto">
            <p className="text-sm text-slate-600 dark:text-slate-400">En publiant votre formulaire dans la bibliothèque, vous acceptez de céder à MedataAI le droit non exclusif de le diffuser à d’autres utilisateurs. Vous restez le propriétaire intellectuel du contenu et percevrez une rémunération pour chaque achat.</p>
            
            <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-800 dark:text-slate-200">Prix de vente du formulaire</span>
                    <span className="font-semibold text-slate-900 dark:text-white flex items-center"><CoinIcon className="w-4 h-4 mr-1 text-yellow-500" />{settings.libraryPrices.defaultFormPrice}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-green-600 dark:text-green-400">
                    <span>Votre gain par vente</span>
                    <span className="font-semibold flex items-center"><CoinIcon className="w-4 h-4 mr-1" />{Math.round(settings.libraryPrices.defaultFormPrice * settings.commissionRates.creatorFormSale)}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-600 !my-2"></div>
                 <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-800 dark:text-slate-200">Prix de vente par réponse</span>
                    <span className="font-semibold text-slate-900 dark:text-white flex items-center"><CoinIcon className="w-4 h-4 mr-1 text-yellow-500" />{settings.libraryPrices.defaultPricePerResponse}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-green-600 dark:text-green-400">
                    <span>Votre gain par réponse</span>
                    <span className="font-semibold flex items-center"><CoinIcon className="w-4 h-4 mr-1" />{Math.round(settings.libraryPrices.defaultPricePerResponse * settings.commissionRates.creatorResponseSale)}</span>
                </div>
            </div>

            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-300 rounded-r-lg text-sm">
                <p>La publication est gratuite. Une fois publié, vous ne pourrez plus modifier le formulaire ni y ajouter de réponses. Les prix sont fermes et gérés par la plateforme.</p>
            </div>
        </main>
        <footer className="flex justify-end space-x-3 p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 rounded-b-lg">
            <Button onClick={onClose} variant="secondary">Annuler</Button>
            <Button onClick={handleConfirm}>Confirmer et Publier</Button>
        </footer>
      </div>
    </div>
  );
};

const ModificationRequestModal: React.FC<{
  form: Form;
  onClose: () => void;
  onSubmit: (form: Form, reason: string) => void;
}> = ({ form, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!reason.trim()) {
      alert("Veuillez fournir une raison pour votre demande.");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
        onSubmit(form, reason);
        setIsSubmitting(false);
        onClose(); 
    }, 500);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Demande de modification pour "{form.title}"</h3>
        </header>
        <main className="p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Expliquez à l'administrateur pourquoi vous devez modifier ce formulaire.
          </p>
          
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-300 rounded-r-lg text-sm">
            <p className="font-bold flex items-center mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                Règles de modification
            </p>
            <ul className="list-disc list-inside space-y-1 ml-1">
                <li>Seules les <strong>modifications mineures</strong> sont acceptées (fautes de frappe, option oubliée).</li>
                <li>Si vous souhaitez une refonte complète, veuillez créer un nouveau formulaire.</li>
                <li>La re-validation sera gratuite si la demande est acceptée.</li>
            </ul>
          </div>

          <textarea
            rows={5}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: J'ai oublié d'ajouter une option importante dans la question X..."
            className="w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            disabled={isSubmitting}
          />
        </main>
        <footer className="flex justify-end space-x-3 p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 rounded-b-lg">
          <Button onClick={onClose} variant="secondary" disabled={isSubmitting}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !reason.trim()}>
            {isSubmitting ? 'Envoi...' : 'Envoyer la demande'}
          </Button>
        </footer>
      </div>
    </div>
  );
};

// Deprecated for user flow but kept for type safety if needed elsewhere
const ModificationDecisionModal: React.FC<{
  form: Form;
  responseCount: number;
  onClose: () => void;
  onDecision: (formId: string, keepResponses: boolean) => void;
}> = ({ form, responseCount, onClose, onDecision }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Modifier le formulaire "{form.title}"</h3>
        </header>
        <main className="p-6 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Votre demande de modification a été approuvée. Ce formulaire a <strong className="font-semibold">{responseCount}</strong> réponse(s) existante(s).
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Que souhaitez-vous faire de ces réponses avant de commencer vos modifications ?
          </p>
          <div className="space-y-3 pt-2">
            <Button onClick={() => onDecision(form.id, true)} className="w-full !justify-start !p-4 !text-left">
              <h4 className="font-bold">Conserver les réponses</h4>
              <p className="text-xs font-normal mt-1">Idéal pour des corrections mineures (fautes de frappe, clarifications).</p>
            </Button>
            <Button onClick={() => onDecision(form.id, false)} variant="secondary" className="w-full !justify-start !p-4 !text-left">
              <h4 className="font-bold">Supprimer les réponses</h4>
              <p className="text-xs font-normal mt-1">Recommandé si vos modifications rendent les anciennes données incompatibles. <strong className="text-red-500">Cette action est irréversible.</strong></p>
            </Button>
          </div>
        </main>
        <footer className="flex justify-end p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 rounded-b-lg">
          <Button onClick={onClose} variant="secondary">Annuler</Button>
        </footer>
      </div>
    </div>
  );
};

const Forms: React.FC<FormsProps> = ({ user, forms, allForms, responses, purchasedForms, addFormResponse, deleteFormResponse, createForm, updateForm, deleteForm, deletePurchasedForm, saveAndValidateForm, publishForm, unpublishForm, users, onNavigate, handleRequestFormModification, onModificationDecision, systemSettings }) => {
  const [view, setView] = useState<'list' | 'filling' | 'building' | 'viewing_responses_list' | 'viewing_single_response'>('list');
  const [activeTab, setActiveTab] = useState<'my_creations' | 'purchased_models' | 'purchased_data'>(user.role === 'admin' ? 'my_creations' : 'my_creations');
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchasedForm | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [confirmation, setConfirmation] = useState<ConfirmationModalProps | null>(null);
  const [filters, setFilters] = useState({ studentId: '', searchTerm: '', publicationStatus: 'all' });
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [formToPublish, setFormToPublish] = useState<Form | null>(null);
  const [formToUnpublish, setFormToUnpublish] = useState<Form | null>(null);
  const [formToAction, setFormToAction] = useState<Form | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const actionMenuRef = useRef<Record<string, HTMLDivElement | null>>({});
  
  // Reordering State
  const [isReordering, setIsReordering] = useState(false);

  const isSuspended = user.role === 'student' && user.status.startsWith('suspended');
  
  // 3 Distinct Data Sources
  const myCreatedForms = useMemo(() => forms.filter(f => f.userId === user.id && f.origin !== 'purchased'), [forms, user.id]);
  const myPurchasedModels = useMemo(() => forms.filter(f => f.userId === user.id && f.origin === 'purchased'), [forms, user.id]);
  const myPurchasedData = useMemo(() => purchasedForms.filter(p => p.withResponses), [purchasedForms]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openActionMenu && actionMenuRef.current[openActionMenu] && !actionMenuRef.current[openActionMenu]!.contains(event.target as Node)) {
        setOpenActionMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openActionMenu]);

  const highlightMatch = (text: string, term: string) => {
    if (!term.trim()) {
      return text;
    }
    const regex = new RegExp(`(${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) && part.length > 0 ? (
            <span key={i} className="bg-yellow-200 dark:bg-yellow-700/50 text-slate-900 dark:text-yellow-200 rounded-sm px-0.5">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Determine which list to display based on active tab
  const formsToDisplay = useMemo(() => {
    if (user.role === 'admin') {
      return forms.filter(form => {
        const studentMatch = filters.studentId ? form.userId === filters.studentId : true;
        const term = filters.searchTerm.toLowerCase().trim();
        const searchTermMatch = term ?
          form.title.toLowerCase().includes(term) ||
          form.description.toLowerCase().includes(term) ||
          form.schema.some(q => q.label.toLowerCase().includes(term))
          : true;
        const publicationStatusMatch =
          filters.publicationStatus === 'all' ? true
          : filters.publicationStatus === 'public' ? form.isPublic
          : !form.isPublic;

        return studentMatch && searchTermMatch && publicationStatusMatch;
      });
    }
    
    if (activeTab === 'my_creations') return myCreatedForms;
    if (activeTab === 'purchased_models') return myPurchasedModels;
    return []; // For purchased_data, we render differently
  }, [forms, filters, user.role, activeTab, myCreatedForms, myPurchasedModels]);

  const handleStartFilling = (form: Form) => {
    setSelectedForm(form);
    setFormData({});
    setView('filling');
  };

  const handleStartCreating = () => {
    setSelectedForm(null);
    setView('building');
  };

  const handleStartEditing = (form: Form) => {
    setSelectedForm(form);
    setView('building');
  };

  const handleBackToList = () => {
    setSelectedForm(null);
    setSelectedResponse(null);
    setSelectedPurchase(null);
    setView('list');
  };

  const handleViewResponses = (form: Form) => {
    setSelectedForm(form);
    setView('viewing_responses_list');
  };

  const handleViewPurchasedFormResponses = (purchase: PurchasedForm) => {
    const form = allForms.find(f => f.id === purchase.formId);
    if (form) {
      setSelectedForm(form);
      setSelectedPurchase(purchase);
      setView('viewing_responses_list');
    }
  };

  const handleViewSingleResponse = (response: FormResponse) => {
    setSelectedResponse(response);
    setView('viewing_single_response');
  };

  const handleBackToResponseList = () => {
    setSelectedResponse(null);
    setView('viewing_responses_list');
  };
  
  const handleSaveForm = (form: Form) => {
    if (selectedForm || forms.find(f => f.id === form.id)) { // It's an update
      updateForm(form);
    } else { // It's a create
      createForm(form);
    }
    setView('list');
  };

  const handleValidateAndSaveFormWrapper = (form: Form) => {
    saveAndValidateForm(form);
    setView('list');
  };

  const handleDeleteFormClick = (form: Form) => {
    // Si le formulaire est validé OU ACHETÉ, on demande une DOUBLE confirmation
    const isProtected = form.status === 'validated' || form.origin === 'purchased';

    if (isProtected) {
        setConfirmation({
            isOpen: true,
            title: form.origin === 'purchased' ? "Suppression d'un formulaire acheté" : "Suppression d'un formulaire validé",
            message: (
                <div className="space-y-2">
                    <p>Attention : Ce formulaire est {form.origin === 'purchased' ? 'acheté' : 'validé'}. Le supprimer entraînera la <strong>perte définitive</strong> de toutes les réponses associées.</p>
                    <p className="text-sm text-red-600 font-semibold">Cette action est irréversible et les coins dépensés ne seront pas remboursés.</p>
                </div>
            ),
            confirmText: "Continuer...",
            variant: 'danger',
            onConfirm: () => {
                // Deuxième niveau de confirmation
                setConfirmation({
                    isOpen: true,
                    title: "CONFIRMATION DÉFINITIVE",
                    message: "Êtes-vous ABSOLUMENT sûr ? Tapez 'OUI' dans votre tête et cliquez sur le bouton rouge.",
                    confirmText: "OUI, TOUT SUPPRIMER",
                    variant: 'danger',
                    onConfirm: () => {
                        deleteForm(form.id);
                        setConfirmation(null);
                    },
                    onClose: () => setConfirmation(null)
                });
            },
            onClose: () => setConfirmation(null)
        });
    } else {
        // Suppression simple pour les brouillons (ou statuts inconnus)
        setConfirmation({
            isOpen: true,
            title: "Confirmer la suppression",
            message: `Êtes-vous sûr de vouloir supprimer le formulaire "${form.title}" ? Cette action est irréversible.`,
            onConfirm: () => {
                deleteForm(form.id);
                setConfirmation(null);
            },
            onClose: () => setConfirmation(null),
            variant: 'danger',
            confirmText: 'Supprimer',
            cancelText: 'Annuler'
        });
    }
  };

  const handleDeletePurchaseClick = (purchase: PurchasedForm, formTitle: string) => {
      setConfirmation({
            isOpen: true,
            title: "Suppression de l'achat",
            message: (
                <div className="space-y-2">
                    <p>Vous êtes sur le point de supprimer l'accès au formulaire <strong>"{formTitle}"</strong> et à ses données.</p>
                    <p className="text-sm text-red-600 font-semibold">Cette action est irréversible. Vous perdrez l'accès aux réponses achetées.</p>
                </div>
            ),
            confirmText: "Continuer...",
            variant: 'danger',
            onConfirm: () => {
                setConfirmation({
                    isOpen: true,
                    title: "CONFIRMATION DÉFINITIVE",
                    message: "Êtes-vous sûr ? L'achat sera perdu définitivement.",
                    confirmText: "OUI, SUPPRIMER L'ACHAT",
                    variant: 'danger',
                    onConfirm: () => {
                        deletePurchasedForm(purchase.id);
                        setConfirmation(null);
                    },
                    onClose: () => setConfirmation(null)
                });
            },
            onClose: () => setConfirmation(null)
        });
  };

  const isFieldVisible = (field: FormField, currentData: Record<string, any>): boolean => {
    if (!field.condition) {
      return true;
    }
    const { sourceFieldId, sourceFieldValue } = field.condition;
    const sourceFieldValueFromData = currentData[sourceFieldId];

    if (Array.isArray(sourceFieldValueFromData)) {
      return sourceFieldValueFromData.includes(sourceFieldValue);
    }
    return sourceFieldValueFromData === sourceFieldValue;
  };

  const handleSubmitResponse = () => {
    if (!selectedForm) return;

    const visibleFields = selectedForm.schema.filter(field => isFieldVisible(field, formData));

    for (const field of visibleFields) {
      if (field.type !== 'note' && !formData[field.id]) {
        if (field.type === 'range') {
          formData[field.id] = field.min != null ? field.min : 0;
        } else {
          alert(`Veuillez remplir le champ : "${field.label}"`);
          return;
        }
      }
    }
    
    addFormResponse(selectedForm.id, formData);
    handleBackToList();
  };
  
    const handleDeleteResponse = (responseId: string) => {
        setConfirmation({
            isOpen: true,
            title: "Confirmer la suppression",
            message: "Êtes-vous sûr de vouloir supprimer cette réponse ? Cette action est irréversible.",
            onConfirm: () => {
                deleteFormResponse(responseId);
                handleBackToResponseList();
                setConfirmation(null);
            },
            onClose: () => setConfirmation(null),
            variant: 'danger',
            confirmText: 'Supprimer'
        });
    };

  const updateFormData = (newData: Record<string, any>) => {
    if (!selectedForm) {
      setFormData(newData);
      return;
    }
  
    const cleanedData = { ...newData };
  
    for (const field of selectedForm.schema) {
      if (!isFieldVisible(field, cleanedData)) {
        delete cleanedData[field.id];
      }
    }
  
    setFormData(cleanedData);
  };

  const handleInputChange = (fieldId: string, value: any) => {
    updateFormData({ ...formData, [fieldId]: value });
  };

  const handleCheckboxChange = (fieldId: string, option: string, isChecked: boolean) => {
    const existingValues: string[] = formData[fieldId] || [];
    let newValues: string[];
    if (isChecked) {
        newValues = [...existingValues, option];
    } else {
        newValues = existingValues.filter(v => v !== option);
    }
    updateFormData({ ...formData, [fieldId]: newValues });
  };
  
  const handleToggleFormSelection = (formId: string) => {
    setSelectedFormIds(prev => 
      prev.includes(formId) 
        ? prev.filter(id => id !== formId) 
        : [...prev, formId]
    );
  };
  
  const handleStartMultiFormAnalysis = () => {
    onNavigate('analyse', { formIds: selectedFormIds });
  };

  const handleConfirmPublish = (formId: string, price: number, pricePerResponse: number) => {
    publishForm(formId, price, pricePerResponse);
    setIsPublishModalOpen(false);
  };

  const handleMoveForm = async (index: number, direction: 'prev' | 'next') => {
    if (direction === 'prev' && index === 0) return;
    if (direction === 'next' && index === formsToDisplay.length - 1) return;

    const formA = formsToDisplay[index];
    const formB = formsToDisplay[index + (direction === 'next' ? 1 : -1)];

    // Si orderIndex n'existe pas, on utilise l'index actuel comme fallback
    // Cela permet de démarrer le tri même sur des données anciennes
    let indexA = formA.orderIndex;
    let indexB = formB.orderIndex;

    if (indexA === undefined || indexA === null) indexA = index;
    if (indexB === undefined || indexB === null) indexB = index + (direction === 'next' ? 1 : -1);

    // Si collision (mêmes index), on force un décalage
    if (indexA === indexB) {
        if (direction === 'next') {
            indexB = indexA + 1;
        } else {
            indexB = indexA - 1;
        }
    }

    // Échange des positions : On assigne à A la position cible (B) et à B la position actuelle de A.
    // Cela permet un échange "sur place" sans envoyer au début ou à la fin.
    await updateForm({ ...formA, orderIndex: indexB });
    await updateForm({ ...formB, orderIndex: indexA });
  };

  const renderFormField = (field: FormField, data: Record<string, any>, isReadOnly = false) => {
    const commonClasses = "mt-1 block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-70 disabled:bg-slate-200 dark:disabled:bg-slate-600 disabled:text-slate-700 dark:disabled:text-slate-300";
    const radioCheckboxClasses = "focus:ring-primary-500 h-4 w-4 text-primary-600 border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700 disabled:opacity-70";
    
    switch (field.type) {
      case 'text':
        return <input type="text" id={field.id} value={data[field.id] || ''} onChange={(e) => !isReadOnly && handleInputChange(field.id, e.target.value)} disabled={isReadOnly} className={commonClasses}/>;
      case 'textarea':
        return <textarea id={field.id} rows={4} value={data[field.id] || ''} onChange={(e) => !isReadOnly && handleInputChange(field.id, e.target.value)} disabled={isReadOnly} className={commonClasses}/>;
      case 'number':
        return <input type="number" id={field.id} value={data[field.id] || ''} onChange={(e) => !isReadOnly && handleInputChange(field.id, e.target.valueAsNumber)} disabled={isReadOnly} className={commonClasses}/>;
      case 'choice':
        if (isReadOnly) {
          return (
            <div className="mt-2 space-y-2">
              {field.options?.map(option => {
                const isSelected = data[field.id] === option;
                return (
                  <div key={option} className={`p-3 rounded-md transition-colors ${isSelected ? 'bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700' : 'bg-slate-100 dark:bg-slate-700/50'}`}>
                    <div className="flex items-center">
                       <div className={`w-4 h-4 rounded-full flex items-center justify-center border mr-3 ${isSelected ? 'border-primary-600 dark:border-primary-400 bg-transparent' : 'border-slate-400 dark:border-slate-500'}`}>
                        {isSelected && <div className="w-2 h-2 bg-primary-600 dark:bg-primary-400 rounded-full"></div>}
                      </div>
                      <span className={`block text-sm ${isSelected ? 'font-semibold text-primary-800 dark:text-primary-200' : 'text-slate-700 dark:text-slate-300'}`}>{option}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }
        return (
          <div className="mt-2 space-y-2">
            {field.options?.map(option => (
              <div key={option} className="flex items-center">
                <input id={`${field.id}-${option}`} name={field.id} type="radio" value={option} checked={data[field.id] === option} onChange={(e) => !isReadOnly && handleInputChange(field.id, e.target.value)} disabled={isReadOnly} className={radioCheckboxClasses}/>
                <label htmlFor={`${field.id}-${option}`} className="ml-3 block text-sm font-medium text-slate-700 dark:text-slate-300">{option}</label>
              </div>
            ))}
          </div>
        );
       case 'checkbox':
        if (isReadOnly) {
          return (
            <div className="mt-2 space-y-2">
              {field.options?.map(option => {
                const isSelected = (data[field.id] || []).includes(option);
                return (
                  <div key={option} className={`p-3 rounded-md transition-colors ${isSelected ? 'bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700' : 'bg-slate-100 dark:bg-slate-700/50'}`}>
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded flex items-center justify-center border mr-3 ${isSelected ? 'border-primary-600 dark:border-primary-400 bg-primary-600 dark:bg-primary-400' : 'border-slate-400 dark:border-slate-500'}`}>
                        {isSelected && <svg className="w-3 h-3 text-white dark:text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className={`block text-sm ${isSelected ? 'font-semibold text-primary-800 dark:text-primary-200' : 'text-slate-700 dark:text-slate-300'}`}>{option}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }
        return (
          <div className="mt-2 space-y-2">
            {field.options?.map(option => (
              <div key={option} className="flex items-center">
                <input id={`${field.id}-${option}`} name={`${field.id}-${option}`} type="checkbox" checked={(data[field.id] || []).includes(option)} onChange={(e) => !isReadOnly && handleCheckboxChange(field.id, option, e.target.checked)} disabled={isReadOnly} className={`${radioCheckboxClasses} rounded`}/>
                <label htmlFor={`${field.id}-${option}`} className="ml-3 block text-sm font-medium text-slate-700 dark:text-slate-300">{option}</label>
              </div>
            ))}
          </div>
        );
      case 'date':
        return <input type="date" id={field.id} value={data[field.id] || ''} onChange={(e) => !isReadOnly && handleInputChange(field.id, e.target.value)} disabled={isReadOnly} className={commonClasses}/>;
      case 'range':
        const currentValue = data[field.id] != null ? data[field.id] : (field.min != null ? field.min : 0);
        return (
          <div className="mt-2 space-y-3">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400 w-8 text-center">{field.min != null ? field.min : 0}</span>
              <input
                type="range"
                id={field.id}
                min={field.min != null ? field.min : 0}
                max={field.max != null ? field.max : 100}
                value={currentValue}
                onChange={(e) => !isReadOnly && handleInputChange(field.id, e.target.valueAsNumber)}
                disabled={isReadOnly}
                className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-primary-600 dark:accent-primary-400 disabled:opacity-70 disabled:cursor-not-allowed"
              />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400 w-8 text-center">{field.max != null ? field.max : 100}</span>
            </div>
            <div className="text-center">
              <output htmlFor={field.id} className="font-semibold text-lg text-slate-800 dark:text-slate-200 px-3 py-1 bg-slate-100 dark:bg-slate-700/50 rounded-md">
                {currentValue}
              </output>
            </div>
          </div>
        );
      case 'note':
        return (
          <div className="mt-6 mb-2 pt-2 border-b border-slate-300 dark:border-slate-600">
            <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-300">{field.label}</h3>
          </div>
        );
      default:
        return <p className="text-red-500 text-sm mt-1">Type de champ non supporté: {field.type}</p>;
    }
  };

  const getResponseCountForForm = (form: Form) => {
    const realCount = responses.filter(r => r.formId === form.id).length;
    return Math.max(realCount, form.responseCount || 0);
  };
  
  const getStatusBadge = (status: Form['status']) => {
    switch (status) {
        case 'draft': return { text: 'Brouillon', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
        case 'validated': return { text: 'Validé', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
        case 'awaiting_modification_decision': return { text: 'En attente de décision', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
        case 'pending_revalidation': return { text: 'En attente de validation', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' };
        default: return { text: 'Statut Inconnu', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
    }
  };

  const renderResponseListView = () => {
    if (!selectedForm) return null;
    const formResponses = responses
      .filter(r => {
        if (r.formId !== selectedForm.id) return false;
        if (selectedPurchase) {
          if (!selectedPurchase.withResponses) {
            return r.userId === user.id;
          }
          return true;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Button onClick={handleBackToList} variant="secondary">← Retour à la liste des formulaires</Button>
        <Card title={`Réponses pour : ${selectedForm.title}`}>
          {formResponses.length > 0 ? (
            <div className="space-y-2">
              {formResponses.map(response => {
                const firstAnswerableQuestion = selectedForm.schema.find(q => q.type !== 'note');
                let firstAnswer: any = null;
                if (firstAnswerableQuestion) {
                    firstAnswer = response.data[firstAnswerableQuestion.id];
                }

                const displayAnswer = Array.isArray(firstAnswer) 
                  ? firstAnswer.join(', ') 
                  : (firstAnswer || '');

                return (
                  <button
                    key={response.id}
                    onClick={() => handleViewSingleResponse(response)}
                    className="w-full text-left p-3 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    <div className="flex justify-between items-center space-x-4">
                        <div className="flex-grow min-w-0">
                            <p className="font-medium text-slate-800 dark:text-slate-200 truncate" title={String(displayAnswer)}>
                                {displayAnswer ? String(displayAnswer) : `Soumission #${response.id.slice(-5)}`}
                            </p>
                            {firstAnswerableQuestion && displayAnswer && (
                               <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {firstAnswerableQuestion.label}
                               </p>
                            )}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-300 flex-shrink-0 text-right">
                            <div>{new Date(response.createdAt).toLocaleDateString()}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(response.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">
              Aucune réponse pour ce formulaire.
            </p>
          )}
        </Card>
      </div>
    );
  };

  const renderSingleResponseView = () => {
    if (!selectedForm || !selectedResponse) return null;

    const visibleFields = selectedForm.schema.filter(field => isFieldVisible(field, selectedResponse.data));

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
            <Button onClick={handleBackToResponseList} variant="secondary">← Retour aux réponses</Button>
            {user.role === 'student' && selectedResponse.userId === user.id && (
                <Button onClick={() => handleDeleteResponse(selectedResponse.id)} variant="danger">Supprimer cette réponse</Button>
            )}
        </div>
        <Card title={`Réponse du ${new Date(selectedResponse.createdAt).toLocaleString()}`}>
          <p className="mb-6 text-slate-600 dark:text-slate-400">{selectedForm.description}</p>
          <div className="space-y-6">
            {visibleFields.map(field => (
              <div key={field.id}>
                {field.type !== 'note' && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{field.label}</label>}
                {renderFormField(field, selectedResponse.data, true)}
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  if (view === 'building') {
    return <FormBuilder
      initialForm={selectedForm}
      onSave={handleSaveForm}
      onValidate={handleValidateAndSaveFormWrapper}
      onCancel={handleBackToList}
      userId={user.id}
      systemSettings={systemSettings}
    />
  }

  if (view === 'filling' && selectedForm) {
    const visibleFields = selectedForm.schema.filter(field => isFieldVisible(field, formData));
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Button onClick={handleBackToList} variant="secondary">← Retour à la liste</Button>
        <Card title={`Remplir : ${selectedForm.title}`}>
          <p className="mb-6 text-slate-600 dark:text-slate-400">{selectedForm.description}</p>
          <div className="space-y-6">
            {visibleFields.map(field => 
              (
                <div key={field.id}>
                  {field.type !== 'note' && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{field.label}</label>}
                  {renderFormField(field, formData)}
                </div>
              )
            )}
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={handleSubmitResponse}>
                Soumettre la réponse {user.role !== 'admin' && `(${systemSettings.coinCosts.addResponse} Coins)`}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (view === 'viewing_responses_list') {
    return renderResponseListView();
  }

  if (view === 'viewing_single_response') {
     return (
        <>
            {renderSingleResponseView()}
            {confirmation && <ConfirmationModal {...confirmation} />}
        </>
     );
  }

  return ( // view === 'list'
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{user.role === 'admin' ? 'Tous les formulaires' : 'Gestion des Formulaires'}</h2>
            {user.role === 'student' && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Gérez vos formulaires créés, vos modèles achetés, et vos données acquises.</p>
            )}
          </div>
          {user.role === 'student' && activeTab === 'my_creations' && (
            <div className="flex space-x-2 w-full sm:w-auto">
              {formsToDisplay.length > 1 && (
                <Button 
                  onClick={() => setIsReordering(!isReordering)} 
                  variant={isReordering ? "primary" : "secondary"}
                  disabled={isSuspended || filters.searchTerm.trim() !== ''}
                  className="w-full sm:w-auto"
                  title={filters.searchTerm.trim() !== '' ? "Impossible de réorganiser pendant une recherche" : "Changer l'ordre d'affichage"}
                >
                  {isReordering ? 'Terminer' : 'Organiser'}
                </Button>
              )}
              <Button onClick={handleStartCreating} disabled={isSuspended || isReordering} className="w-full sm:w-auto">+ Créer un formulaire</Button>
            </div>
          )}
          {user.role === 'admin' && (
             <Button onClick={handleStartMultiFormAnalysis} disabled={selectedFormIds.length === 0} className="w-full sm:w-auto">
                Analyse IA ({selectedFormIds.length})
             </Button>
          )}
        </div>

        {user.role === 'student' && (
            <div className="border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
                <nav className="-mb-px flex space-x-6 min-w-max" aria-label="Tabs">
                    <button onClick={() => { setActiveTab('my_creations'); setIsReordering(false); }} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'my_creations' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}>Mes Créations</button>
                    <button onClick={() => { setActiveTab('purchased_models'); setIsReordering(false); }} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'purchased_models' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}>Modèles Achetés (Vierges)</button>
                    <button onClick={() => { setActiveTab('purchased_data'); setIsReordering(false); }} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'purchased_data' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}>Formulaires avec Réponses</button>
                </nav>
            </div>
        )}

        {isSuspended && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-300 rounded-r-lg">
                <h4 className="font-bold">Fonctionnalités limitées</h4>
                {user.status === 'suspended_manual' ? (
                    <p className="text-sm">Votre compte a été suspendu par un administrateur. Vous ne pouvez pas créer de nouveaux formulaires ni ajouter de réponses. Veuillez contacter le support.</p>
                ) : (
                    <p className="text-sm">Votre compte est suspendu. Vous ne pouvez pas créer de nouveaux formulaires ni ajouter de réponses. Veuillez recharger votre portefeuille.</p>
                )}
            </div>
        )}
        
        {/* TAB 1: MY CREATIONS & TAB 2: PURCHASED MODELS (Common logic, filtered lists) */}
        {(activeTab === 'my_creations' || activeTab === 'purchased_models' || user.role === 'admin') && (
            <>
                {user.role === 'admin' && (
                <Card title="Filtres">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input name="searchTerm" value={filters.searchTerm} onChange={handleFilterChange} placeholder="Rechercher par mot-clé (diabète, symptôme...)" className="block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500"/>
                    <select name="studentId" value={filters.studentId} onChange={handleFilterChange} className="block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                        <option value="">Tous les étudiants</option>
                        {users.filter(u => u.role === 'student').sort((a,b) => a.name.localeCompare(b.name)).map(student => (<option key={student.id} value={student.id}>{student.name}</option>))}
                    </select>
                    <select name="publicationStatus" value={filters.publicationStatus} onChange={handleFilterChange} className="block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                        <option value="all">Tous les statuts</option>
                        <option value="public">Publiés uniquement</option>
                        <option value="private">Non publiés</option>
                    </select>
                    </div>
                </Card>
                )}

                {formsToDisplay.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {formsToDisplay.map((form, index) => {
                    const creator = users.find(u => u.id === form.userId);
                    const responseCount = getResponseCountForForm(form);
                    const matchingQuestions = form.schema.filter(q => filters.searchTerm.trim() && q.label.toLowerCase().includes(filters.searchTerm.trim().toLowerCase())).map(q => q.label);
                    const statusInfo = getStatusBadge(form.status);

                    return (
                        <Card key={form.id} className={`flex flex-col relative transition-all ${isReordering ? 'border-dashed border-2 border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-slate-800/80' : ''}`}>
                        {user.role === 'admin' && (<div className="absolute top-4 right-4 z-10 bg-white dark:bg-slate-800 p-1 rounded-full"><input type="checkbox" checked={selectedFormIds.includes(form.id)} onChange={() => handleToggleFormSelection(form.id)} className="h-5 w-5 rounded-full border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700 text-primary-600 focus:ring-primary-500" aria-label={`Sélectionner le formulaire ${form.title}`}/></div>)}
                        <div className="flex-grow p-4 sm:p-6">
                            <div className="flex justify-between items-start">
                            <div className="pr-12">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{highlightMatch(form.title, filters.searchTerm)}</h3>
                                <p className="text-slate-600 dark:text-slate-400 mt-1">{highlightMatch(form.description, filters.searchTerm)}</p>
                            </div>
                            <div className="flex flex-col items-end space-y-2 flex-shrink-0 ml-4">
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusInfo.className}`}>{statusInfo.text}</span>
                                {form.isPublic && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setFormToUnpublish(form); }}
                                        className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors cursor-pointer border border-transparent hover:border-blue-300 dark:hover:border-blue-700"
                                        title="Cliquez pour annuler la publication"
                                    >
                                        Publié
                                    </button>
                                )}
                                {form.origin === 'purchased' && <span className="mt-2 px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Modèle Acheté</span>}
                            </div>
                            </div>

                            {user.role === 'admin' && creator && (<p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Créé par : <span className="font-medium">{creator.name}</span></p>)}
                            {matchingQuestions.length > 0 && (<div className="mt-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-2"><p className="font-semibold">Correspondance dans les questions :</p><ul className="list-disc list-inside ml-2 mt-1">{matchingQuestions.map((label, index) => (<li key={index} className="truncate" title={label}>{highlightMatch(label, filters.searchTerm)}</li>))}</ul></div>)}
                            <div className="mt-4 flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
                            <span>Créé le : {new Date(form.createdAt).toLocaleDateString()}</span>
                            {user.role === 'student' && form.status === 'validated' ? (<button onClick={() => responseCount > 0 && !isReordering && handleViewResponses(form)} disabled={responseCount === 0 || isReordering} className="font-medium text-primary-600 hover:underline dark:text-primary-400 disabled:text-slate-400 disabled:no-underline disabled:cursor-default">{responseCount} {responseCount !== 1 ? 'réponses' : 'réponse'}</button>) : (<span>{responseCount} {responseCount !== 1 ? 'réponses' : 'réponse'}</span>)}
                            </div>
                        </div>
                        <div className="p-4 sm:p-6 mt-auto border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-3">
                            {isReordering ? (
                                <div className="w-full flex justify-center items-center space-x-4">
                                    <Button 
                                        onClick={() => handleMoveForm(index, 'prev')} 
                                        disabled={index === 0}
                                        variant="secondary"
                                        className="!px-3 sm:!px-4 flex items-center gap-2"
                                        title="Reculer (Déplacer vers la position précédente)"
                                    >
                                        <ArrowUpIcon className="w-5 h-5 transform -rotate-90" />
                                        <span className="hidden sm:inline">Reculer</span>
                                    </Button>
                                    <span className="font-mono font-bold text-slate-400 text-lg w-8 text-center">#{index + 1}</span>
                                    <Button 
                                        onClick={() => handleMoveForm(index, 'next')} 
                                        disabled={index === formsToDisplay.length - 1}
                                        variant="secondary"
                                        className="!px-3 sm:!px-4 flex items-center gap-2"
                                        title="Avancer (Déplacer vers la position suivante)"
                                    >
                                        <span className="hidden sm:inline">Avancer</span>
                                        <ArrowDownIcon className="w-5 h-5 transform -rotate-90" />
                                    </Button>
                                </div>
                            ) : (
                                <>
                                {user.role === 'student' && (
                                    <>
                                        {form.status === 'draft' && (
                                            <div className="w-full flex items-center space-x-3">
                                                <Button onClick={() => handleStartEditing(form)} variant="secondary" className="flex-grow" disabled={isSuspended}>Modifier</Button>
                                                <Button 
                                                    onClick={() => handleDeleteFormClick(form)} 
                                                    variant="danger"
                                                    className="!px-3 !py-2 text-sm !bg-transparent hover:!bg-red-100 dark:hover:!bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700"
                                                    title="Supprimer le formulaire"
                                                    disabled={isSuspended}
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        )}
                                        {form.status === 'validated' && !form.isPublic && (
                                            <div className="w-full flex items-center space-x-2">
                                                <Button onClick={() => handleStartFilling(form)} className="flex-grow" disabled={isSuspended}>
                                                    <PlusIcon className="w-4 h-4 mr-2 inline-block" />
                                                    <span className="hidden sm:inline">Ajouter une réponse</span>
                                                    <span className="sm:hidden">Ajouter</span>
                                                </Button>
                                                
                                                {/* Bouton de suppression rouge */}
                                                <Button 
                                                    onClick={() => handleDeleteFormClick(form)} 
                                                    variant="danger"
                                                    className="!px-3 !py-2 text-sm !bg-transparent hover:!bg-red-100 dark:hover:!bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700"
                                                    title="Supprimer le formulaire"
                                                    disabled={isSuspended}
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </Button>

                                                <div className="relative flex-shrink-0" ref={(el) => { actionMenuRef.current[form.id] = el; }}>
                                                    <Button 
                                                        onClick={() => setOpenActionMenu(openActionMenu === form.id ? null : form.id)}
                                                        variant="secondary"
                                                        className="!px-3 !py-2 text-sm flex items-center"
                                                        disabled={isSuspended}
                                                    >
                                                        Actions
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                                    </Button>
                                                    <div className={`absolute right-0 bottom-full mb-2 w-56 bg-white dark:bg-slate-800 rounded-md shadow-lg border dark:border-slate-700 z-20 transition-opacity ${openActionMenu === form.id ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                                                        <div className="py-1">
                                                            <button onClick={() => { setFormToPublish(form); setIsPublishModalOpen(true); setOpenActionMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700" disabled={isSuspended}>Publier</button>
                                                            <button onClick={() => { setFormToAction(form); setOpenActionMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700" disabled={isSuspended}>Demander une modification</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {form.status === 'validated' && form.isPublic && (
                                            <div className="w-full flex items-center space-x-2">
                                                <Button onClick={() => handleViewResponses(form)} className="flex-grow" disabled={responseCount === 0}>Voir les réponses</Button>
                                                <Button 
                                                    onClick={() => handleDeleteFormClick(form)} 
                                                    variant="danger"
                                                    className="!px-3 !py-2 text-sm !bg-transparent hover:!bg-red-100 dark:hover:!bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700"
                                                    title="Supprimer le formulaire"
                                                    disabled={isSuspended}
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        )}
                                        {form.status === 'awaiting_modification_decision' && (
                                            <div className="w-full flex items-center space-x-2">
                                                <div className="flex-grow flex items-center justify-center px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-blue-700 dark:text-blue-300 text-sm font-medium">
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700 dark:text-blue-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    En attente de validation admin
                                                </div>
                                                <Button 
                                                    onClick={() => handleDeleteFormClick(form)} 
                                                    variant="danger"
                                                    className="!px-3 !py-2 text-sm !bg-transparent hover:!bg-red-100 dark:hover:!bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700"
                                                    title="Supprimer le formulaire"
                                                    disabled={isSuspended}
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        )}
                                        {form.status === 'pending_revalidation' && (
                                            <div className="w-full flex items-center space-x-2">
                                                <div className="flex-grow flex items-center justify-center px-4 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md text-orange-700 dark:text-orange-300 text-sm font-medium">
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-orange-700 dark:text-orange-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Modification en cours d'examen
                                                </div>
                                                <Button 
                                                    onClick={() => handleDeleteFormClick(form)} 
                                                    variant="danger"
                                                    className="!px-3 !py-2 text-sm !bg-transparent hover:!bg-red-100 dark:hover:!bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700"
                                                    title="Supprimer le formulaire"
                                                    disabled={isSuspended}
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        )}
                                        {/* HANDLE INVALID/UNKNOWN STATUS (Fallback) */}
                                        {!['draft', 'validated', 'awaiting_modification_decision', 'pending_revalidation'].includes(form.status) && (
                                             <div className="w-full flex items-center justify-between">
                                                <span className="text-sm text-red-500 italic flex items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                    Statut invalide
                                                </span>
                                                <Button 
                                                    onClick={() => handleDeleteFormClick(form)} 
                                                    variant="danger"
                                                    className="!px-3 !py-2 text-sm !bg-transparent hover:!bg-red-100 dark:hover:!bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700"
                                                    title="Supprimer le formulaire corrompu"
                                                    disabled={isSuspended}
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}
                                {user.role === 'admin' && (
                                    form.status === 'draft' ? (
                                        <div className="w-full flex justify-end">
                                            <Button onClick={() => handleDeleteFormClick(form)} variant="danger" className="!px-3 !py-2 text-sm !bg-transparent hover:!bg-red-100 dark:hover:!bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700" title="Supprimer le formulaire"><TrashIcon className="w-5 h-5" /></Button>
                                        </div>
                                    ) : (
                                        <div className="w-full flex items-center space-x-3">
                                            <Button onClick={() => handleViewResponses(form)} className="flex-grow" disabled={responseCount === 0}>Voir les réponses ({responseCount})</Button>
                                            <Button onClick={() => handleDeleteFormClick(form)} variant="danger" className="!px-3 !py-2 text-sm !bg-transparent hover:!bg-red-100 dark:hover:!bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700" title="Supprimer le formulaire"><TrashIcon className="w-5 h-5" /></Button>
                                        </div>
                                    )
                                )}
                                </>
                            )}
                        </div>
                        </Card>
                    );
                    })}
                </div>
                ) : (
                <Card>
                    <div className="text-center py-12">
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Aucun formulaire trouvé</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {user.role === 'admin' 
                                ? 'Aucun formulaire ne correspond à vos critères de recherche.' 
                                : activeTab === 'my_creations' 
                                    ? 'Vous n\'avez pas encore créé de formulaire.' 
                                    : 'Vous n\'avez pas acheté de formulaire vierge.'}
                        </p>
                        {user.role !== 'admin' && activeTab === 'my_creations' && (<div className="mt-6"><Button onClick={handleStartCreating} disabled={isSuspended}>Commencer mon premier formulaire</Button></div>)}
                        {activeTab === 'purchased_models' && (<div className="mt-6"><Button onClick={() => onNavigate('bibliotheque')}>Explorer la Bibliothèque</Button></div>)}
                    </div>
                </Card>
                )}
            </>
        )}

        {/* TAB 3: PURCHASED DATA (Specific logic for purchases with data) */}
        {activeTab === 'purchased_data' && (
            myPurchasedData.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {myPurchasedData.map(purchase => {
                    const form = allForms.find(f => f.id === purchase.formId);
                    if (!form) return null;
                    const creator = users.find(u => u.id === form.userId);
                    const allFormResponses = responses.filter(r => r.formId === form.id);
                    const responsesUserCanSee = allFormResponses.filter(r => purchase.withResponses || r.userId === user.id);
                    
                    return (
                        <Card key={purchase.id} className="flex flex-col !p-0">
                            <div className="flex-grow p-4 sm:p-6">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{form.title}</h3>
                                <p className="text-slate-600 dark:text-slate-400 mt-1">{form.description}</p>
                                {creator && (<p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Par : <span className="font-medium">{creator.name}</span></p>)}
                                <div className="mt-4 flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
                                    <span>Acheté le : {new Date(purchase.purchasedAt).toLocaleDateString()}</span>
                                    <button 
                                        onClick={() => responsesUserCanSee.length > 0 && handleViewPurchasedFormResponses(purchase)} 
                                        disabled={responsesUserCanSee.length === 0} 
                                        className="font-medium text-primary-600 hover:underline dark:text-primary-400 disabled:text-slate-400 disabled:no-underline disabled:cursor-default"
                                    >
                                        {responsesUserCanSee.length} {responsesUserCanSee.length !== 1 ? 'réponses' : 'réponse'}
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 sm:p-6 mt-auto border-t border-slate-200 dark:border-slate-700 flex space-x-2">
                                <Button onClick={() => handleStartFilling(form)} className="flex-grow" disabled={isSuspended}>
                                     <PlusIcon className="w-4 h-4 mr-2 inline-block" />
                                    Ajouter une réponse
                                </Button>
                                <Button 
                                    onClick={() => handleDeletePurchaseClick(purchase, form.title)} 
                                    variant="danger"
                                    className="!px-3 !py-2 text-sm !bg-transparent hover:!bg-red-100 dark:hover:!bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700"
                                    title="Supprimer l'achat"
                                    disabled={isSuspended}
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </Button>
                            </div>
                        </Card>
                    )
                })}
                </div>
            ) : (
                <Card><div className="text-center py-12"><h3 className="text-lg font-medium text-slate-900 dark:text-white">Aucun formulaire avec réponses</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Vous n'avez encore acheté aucun formulaire avec ses réponses. Explorez la bibliothèque !</p><div className="mt-6"><Button onClick={() => onNavigate('bibliotheque')}>Aller à la Bibliothèque</Button></div></div></Card>
            )
        )}

      </div>
      {confirmation && <ConfirmationModal {...confirmation} />}
      {formToUnpublish && (
        <ConfirmationModal
            isOpen={true}
            onClose={() => setFormToUnpublish(null)}
            onConfirm={() => {
                unpublishForm(formToUnpublish.id);
                setFormToUnpublish(null);
            }}
            title="Annuler la publication"
            message={
                <div>
                    <p>Voulez-vous retirer le formulaire <strong>"{formToUnpublish.title}"</strong> de la bibliothèque publique ?</p>
                    <p className="text-sm text-slate-500 mt-2">
                        Note : Les utilisateurs ayant déjà acheté ce formulaire conserveront leur copie et leurs données.
                    </p>
                </div>
            }
            confirmText="Retirer de la bibliothèque"
            variant="danger"
        />
      )}
      {isPublishModalOpen && formToPublish && <PublishModal form={formToPublish} onClose={() => setIsPublishModalOpen(false)} onConfirm={handleConfirmPublish} settings={systemSettings} />}
      {formToAction?.status === 'validated' && <ModificationRequestModal form={formToAction} onClose={() => setFormToAction(null)} onSubmit={handleRequestFormModification} />}
      {formToAction?.status === 'awaiting_modification_decision' && <ModificationDecisionModal form={formToAction} responseCount={getResponseCountForForm(formToAction)} onClose={() => setFormToAction(null)} onDecision={onModificationDecision} />}
    </>
  );
};

export default Forms;