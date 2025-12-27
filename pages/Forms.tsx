
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
import { db, firebase } from '../services/firebase';

interface FormsProps {
  user: User;
  forms: Form[]; 
  allForms: Form[]; 
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
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col animate-scale-up" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Publier "{form.title}"</h3>
        </header>
        <main className="p-6 space-y-4 overflow-y-auto">
            <p className="text-sm text-slate-600 dark:text-slate-400">En publiant votre formulaire dans la bibliothèque, vous acceptez de céder à MedataAI le droit non exclusif de le diffuser à d’autres utilisateurs.</p>
            <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg space-y-3">
                <div className="flex justify-between items-center"><span className="font-medium">Prix du formulaire</span><span className="font-semibold flex items-center"><CoinIcon className="w-4 h-4 mr-1 text-yellow-500" />{settings.libraryPrices.defaultFormPrice}</span></div>
                <div className="flex justify-between items-center text-sm text-green-600"><span>Votre gain</span><span className="font-semibold flex items-center"><CoinIcon className="w-4 h-4 mr-1" />{Math.round(settings.libraryPrices.defaultFormPrice * settings.commissionRates.creatorFormSale)}</span></div>
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
    if (!reason.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
        onSubmit(form, reason);
        setIsSubmitting(false);
        onClose(); 
    }, 500);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg animate-scale-up" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Débloquer pour modification</h3>
        </header>
        <main className="p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Le formulaire repassera en mode <strong>brouillon</strong> instantanément pour vous permettre de le modifier.
          </p>
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 text-blue-800 dark:text-blue-300 rounded-r-lg text-sm">
            <p className="font-bold mb-1">Information importante</p>
            <p>Une fois vos corrections terminées, vous devrez soumettre à nouveau le formulaire. L'administration validera alors vos changements définitifs.</p>
          </div>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Pourquoi devez-vous modifier ce formulaire ? (ex: correction faute, option manquante)"
            className="w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            disabled={isSubmitting}
          />
        </main>
        <footer className="flex justify-end space-x-3 p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 rounded-b-lg">
          <Button onClick={onClose} variant="secondary" disabled={isSubmitting}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !reason.trim()}>Débloquer maintenant</Button>
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
  const [filters, setFilters] = useState({ studentId: '', searchTerm: '', status: 'all' });
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [formToPublish, setFormToPublish] = useState<Form | null>(null);
  const [formToUnpublish, setFormToUnpublish] = useState<Form | null>(null);
  const [formToAction, setFormToAction] = useState<Form | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const actionMenuRef = useRef<Record<string, HTMLDivElement | null>>({});
  const [isReordering, setIsReordering] = useState(false);

  const isSuspended = user.role === 'student' && user.status.startsWith('suspended');
  const myCreatedForms = useMemo(() => forms.filter(f => f.userId === user.id && f.origin !== 'purchased'), [forms, user.id]);
  const myPurchasedModels = useMemo(() => forms.filter(f => f.userId === user.id && f.origin === 'purchased' && f.status === 'draft'), [forms, user.id]);
  const myPurchasedData = useMemo(() => forms.filter(f => f.userId === user.id && f.origin === 'purchased' && f.status !== 'draft'), [forms, user.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openActionMenu && actionMenuRef.current[openActionMenu] && !actionMenuRef.current[openActionMenu]!.contains(event.target as Node)) setOpenActionMenu(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openActionMenu]);

  const highlightMatch = (text: string, term: string) => {
    if (!term.trim()) return text;
    const regex = new RegExp(`(${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return <>{parts.map((part, i) => regex.test(part) && part.length > 0 ? <span key={i} className="bg-yellow-200 dark:bg-yellow-700/50 text-slate-900 dark:text-yellow-200 rounded-sm px-0.5">{part}</span> : part)}</>;
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const formsToDisplay = useMemo(() => {
    let result: Form[] = [];
    if (user.role === 'admin') {
      result = forms.filter(form => {
        const studentMatch = filters.studentId ? form.userId === filters.studentId : true;
        const term = filters.searchTerm.toLowerCase().trim();
        const searchTermMatch = term ? form.title.toLowerCase().includes(term) || form.description.toLowerCase().includes(term) || form.schema.some(q => q.label.toLowerCase().includes(term)) : true;
        const statusMatch = filters.status === 'all' ? true : filters.status === 'pending' ? (form.status === 'awaiting_modification_decision' || form.status === 'pending_revalidation') : form.status === filters.status;
        return studentMatch && searchTermMatch && statusMatch;
      });
    } else {
        if (activeTab === 'my_creations') result = myCreatedForms;
        else if (activeTab === 'purchased_models') result = myPurchasedModels;
        else if (activeTab === 'purchased_data') result = myPurchasedData;
    }
    return [...result].sort((a, b) => {
        const indexA = a.orderIndex !== undefined ? a.orderIndex : -1;
        const indexB = b.orderIndex !== undefined ? b.orderIndex : -1;
        if (indexA !== indexB) return indexA - indexB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [forms, filters, user.role, activeTab, myCreatedForms, myPurchasedModels, myPurchasedData]);

  const handleStartFilling = (form: Form) => { setSelectedForm(form); setFormData({}); setView('filling'); };
  const handleStartCreating = () => { setSelectedForm(null); setView('building'); };
  const handleStartEditing = (form: Form) => { setSelectedForm(form); setView('building'); };
  const handleBackToList = () => { setSelectedForm(null); setSelectedResponse(null); setSelectedPurchase(null); setView('list'); };
  const handleViewResponses = (form: Form) => { setSelectedForm(form); setView('viewing_responses_list'); };
  const handleViewSingleResponse = (response: FormResponse) => { setSelectedResponse(response); setView('viewing_single_response'); };
  const handleBackToResponseList = () => { setSelectedResponse(null); setView('viewing_responses_list'); };
  
  const handleSaveForm = (form: Form) => {
    if (selectedForm || forms.find(f => f.id === form.id)) updateForm(form);
    else createForm(form);
    setView('list');
  };

  const handleValidateAndSaveFormWrapper = (form: Form) => { saveAndValidateForm(form); setView('list'); };

  const handleDeleteFormClick = (form: Form) => {
    const isProtected = form.status === 'validated' || form.origin === 'purchased';
    if (isProtected) {
        setConfirmation({
            isOpen: true,
            title: "Suppression protégée",
            message: <p>Attention : Ce formulaire est {form.origin === 'purchased' ? 'acheté' : 'validé'}. Le supprimer entraînera la perte définitive de toutes les réponses associées.</p>,
            confirmText: "Continuer...", variant: 'danger',
            onConfirm: () => {
                setConfirmation({
                    isOpen: true, title: "CONFIRMATION DÉFINITIVE", message: "Êtes-vous ABSOLUMENT sûr ?",
                    confirmText: "OUI, TOUT SUPPRIMER", variant: 'danger',
                    onConfirm: () => { deleteForm(form.id); setConfirmation(null); },
                    onClose: () => setConfirmation(null)
                });
            },
            onClose: () => setConfirmation(null)
        });
    } else {
        setConfirmation({
            isOpen: true, title: "Confirmer la suppression",
            message: `Êtes-vous sûr de vouloir supprimer le formulaire "${form.title}" ?`,
            onConfirm: () => { deleteForm(form.id); setConfirmation(null); },
            onClose: () => setConfirmation(null),
            variant: 'danger', confirmText: 'Supprimer'
        });
    }
  };

  const isFieldVisible = (field: FormField, currentData: Record<string, any>): boolean => {
    if (!field.condition) return true;
    const { sourceFieldId, sourceFieldValue } = field.condition;
    const val = currentData[sourceFieldId];
    return Array.isArray(val) ? val.includes(sourceFieldValue) : val === sourceFieldValue;
  };

  const handleSubmitResponse = () => {
    if (!selectedForm) return;
    const visibleFields = selectedForm.schema.filter(field => isFieldVisible(field, formData));
    for (const field of visibleFields) {
      if (field.type !== 'note' && !formData[field.id]) {
        if (field.type === 'range') formData[field.id] = field.min ?? 0;
        else { alert(`Veuillez remplir le champ : "${field.label}"`); return; }
      }
    }
    addFormResponse(selectedForm.id, formData);
    handleBackToList();
  };
  
  const handleDeleteResponse = (responseId: string) => {
        setConfirmation({
            isOpen: true, title: "Supprimer la réponse", message: "Cette action est irréversible.",
            onConfirm: () => { deleteFormResponse(responseId); handleBackToResponseList(); setConfirmation(null); },
            onClose: () => setConfirmation(null),
            variant: 'danger', confirmText: 'Supprimer'
        });
    };

  const handleInputChange = (fieldId: string, value: any) => {
    const newData = { ...formData, [fieldId]: value };
    if (selectedForm) {
        for (const field of selectedForm.schema) if (!isFieldVisible(field, newData)) delete newData[field.id];
    }
    setFormData(newData);
  };

  const handleMoveForm = async (index: number, direction: 'prev' | 'next') => {
    if (direction === 'prev' && index === 0) return;
    if (direction === 'next' && index === formsToDisplay.length - 1) return;
    const batch = db.batch();
    const reorderedForms = [...formsToDisplay];
    const targetIndex = index + (direction === 'next' ? 1 : -1);
    [reorderedForms[index], reorderedForms[targetIndex]] = [reorderedForms[targetIndex], reorderedForms[index]];
    reorderedForms.forEach((form, newIndex) => {
        batch.update(db.collection('forms').doc(form.id), { orderIndex: newIndex });
    });
    await batch.commit();
  };

  const renderFormField = (field: FormField, data: Record<string, any>, isReadOnly = false) => {
    const commonClasses = "mt-1 block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-70";
    switch (field.type) {
      case 'text': return <input type="text" value={data[field.id] || ''} onChange={(e) => !isReadOnly && handleInputChange(field.id, e.target.value)} disabled={isReadOnly} className={commonClasses}/>;
      case 'textarea': return <textarea rows={4} value={data[field.id] || ''} onChange={(e) => !isReadOnly && handleInputChange(field.id, e.target.value)} disabled={isReadOnly} className={commonClasses}/>;
      case 'number': return <input type="number" value={data[field.id] || ''} onChange={(e) => !isReadOnly && handleInputChange(field.id, e.target.valueAsNumber)} disabled={isReadOnly} className={commonClasses}/>;
      case 'choice':
        return <div className="mt-2 space-y-2">{field.options?.map(option => (<div key={option} className="flex items-center"><input type="radio" value={option} checked={data[field.id] === option} onChange={(e) => !isReadOnly && handleInputChange(field.id, e.target.value)} disabled={isReadOnly} className="h-4 w-4 text-primary-600 border-slate-300"/><label className="ml-3 block text-sm text-slate-700 dark:text-slate-300">{option}</label></div>))}</div>;
      case 'checkbox':
        return <div className="mt-2 space-y-2">{field.options?.map(option => (<div key={option} className="flex items-center"><input type="checkbox" checked={(data[field.id] || []).includes(option)} onChange={(e) => { if (isReadOnly) return; const current = data[field.id] || []; handleInputChange(field.id, e.target.checked ? [...current, option] : current.filter((v: string) => v !== option)); }} disabled={isReadOnly} className="h-4 w-4 text-primary-600 border-slate-300 rounded"/><label className="ml-3 block text-sm text-slate-700 dark:text-slate-300">{option}</label></div>))}</div>;
      case 'date': return <input type="date" value={data[field.id] || ''} onChange={(e) => !isReadOnly && handleInputChange(field.id, e.target.value)} disabled={isReadOnly} className={commonClasses}/>;
      case 'range':
        const cur = data[field.id] ?? field.min ?? 0;
        return <div className="mt-2 space-y-3"><div className="flex items-center space-x-4"><span className="text-xs">{field.min ?? 0}</span><input type="range" min={field.min ?? 0} max={field.max ?? 100} value={cur} onChange={(e) => !isReadOnly && handleInputChange(field.id, e.target.valueAsNumber)} disabled={isReadOnly} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"/><span className="text-xs">{field.max ?? 100}</span></div><div className="text-center font-bold">{cur}</div></div>;
      case 'note': return <div className="mt-6 mb-2 pt-2 border-b border-slate-300"><h3 className="text-lg font-semibold text-primary-700 dark:text-primary-300">{field.label}</h3></div>;
      default: return null;
    }
  };

  if (view === 'building') return <FormBuilder initialForm={selectedForm} onSave={handleSaveForm} onValidate={handleValidateAndSaveFormWrapper} onCancel={handleBackToList} userId={user.id} systemSettings={systemSettings} />;
  if (view === 'filling' && selectedForm) {
    const visibleFields = selectedForm.schema.filter(field => isFieldVisible(field, formData));
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Button onClick={handleBackToList} variant="secondary">← Retour</Button>
        <Card title={selectedForm.title}>
          <p className="mb-6 text-slate-600 dark:text-slate-400">{selectedForm.description}</p>
          <div className="space-y-6">{visibleFields.map(f => (<div key={f.id}>{f.type !== 'note' && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{f.label}</label>}{renderFormField(f, formData)}</div>))}</div>
          <div className="flex justify-end mt-6"><Button onClick={handleSubmitResponse}>Soumettre ({user.role !== 'admin' && `${systemSettings.coinCosts.addResponse} Coins`})</Button></div>
        </Card>
      </div>
    );
  }
  if (view === 'viewing_responses_list' && selectedForm) {
    const formResponses = responses.filter(r => r.formId === selectedForm.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Button onClick={handleBackToList} variant="secondary">← Retour</Button>
        <Card title={`Réponses : ${selectedForm.title}`}>
          {formResponses.length > 0 ? (
            <div className="space-y-2">{formResponses.map(r => (<button key={r.id} onClick={() => handleViewSingleResponse(r)} className="w-full text-left p-3 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition-colors"><div className="flex justify-between items-center"><span className="font-medium truncate">{r.id}</span><span className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleString()}</span></div></button>))}</div>
          ) : <p className="text-center py-8">Aucune réponse.</p>}
        </Card>
      </div>
    );
  }
  if (view === 'viewing_single_response' && selectedForm && selectedResponse) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center"><Button onClick={handleBackToResponseList} variant="secondary">← Retour</Button>{selectedResponse.userId === user.id && <Button onClick={() => handleDeleteResponse(selectedResponse.id)} variant="danger">Supprimer</Button>}</div>
        <Card title={`Détail réponse`}>
          <div className="space-y-6">{selectedForm.schema.filter(f => isFieldVisible(f, selectedResponse.data)).map(f => (<div key={f.id}>{f.type !== 'note' && <label className="block text-sm font-medium">{f.label}</label>}{renderFormField(f, selectedResponse.data, true)}</div>))}</div>
        </Card>
        {confirmation && <ConfirmationModal {...confirmation} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{user.role === 'admin' ? 'Administration Formulaires' : 'Mes Formulaires'}</h2>
          {user.role === 'student' && activeTab === 'my_creations' && (
            <div className="flex space-x-2 w-full sm:w-auto">
              {formsToDisplay.length > 1 && <Button onClick={() => setIsReordering(!isReordering)} variant={isReordering ? "primary" : "secondary"}>{isReordering ? 'Terminer' : 'Organiser'}</Button>}
              <Button onClick={handleStartCreating} disabled={isSuspended || isReordering}>+ Nouveau</Button>
            </div>
          )}
        </div>
        {user.role === 'student' && (
            <div className="border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
                <nav className="-mb-px flex space-x-6 min-w-max">
                    <button onClick={() => { setActiveTab('my_creations'); setIsReordering(false); }} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'my_creations' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500'}`}>Mes Créations</button>
                    <button onClick={() => { setActiveTab('purchased_models'); setIsReordering(false); }} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'purchased_models' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500'}`}>Achetés (Modèles)</button>
                    <button onClick={() => { setActiveTab('purchased_data'); setIsReordering(false); }} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'purchased_data' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500'}`}>Achetés (Données)</button>
                </nav>
            </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {formsToDisplay.map((form, index) => {
                const status = getStatusBadge(form.status);
                const responseCount = responses.filter(r => r.formId === form.id).length;
                return (
                    <Card key={form.id} className={`${isReordering ? 'border-dashed border-2 border-primary-300' : ''}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-xl font-bold truncate">{highlightMatch(form.title, filters.searchTerm)}</h3>
                                    {form.status === 'validated' && (
                                        <button 
                                            onClick={() => handleViewResponses(form)}
                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors border border-primary-200 shadow-sm"
                                            title="Voir les réponses"
                                        >
                                            <span className="mr-1">📊</span>
                                            {responseCount} réponse{responseCount > 1 ? 's' : ''}
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{highlightMatch(form.description, filters.searchTerm)}</p>
                            </div>
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full shrink-0 ${status.className}`}>{status.text}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-6 items-center">
                            {isReordering ? (
                                <div className="flex items-center gap-2 w-full"><Button onClick={() => handleMoveForm(index, 'prev')} disabled={index === 0} variant="secondary"><ArrowUpIcon className="w-4 h-4 transform -rotate-90"/></Button><span className="font-bold flex-1 text-center">#{index+1}</span><Button onClick={() => handleMoveForm(index, 'next')} disabled={index === formsToDisplay.length-1} variant="secondary"><ArrowDownIcon className="w-4 h-4 transform -rotate-90"/></Button></div>
                            ) : (
                                <>
                                    {form.status === 'draft' && <Button onClick={() => handleStartEditing(form)} variant="secondary" className="flex-1">Modifier</Button>}
                                    {form.status === 'validated' && !form.isPublic && <Button onClick={() => handleStartFilling(form)} className="flex-1">Répondre</Button>}
                                    
                                    <Button onClick={() => handleDeleteFormClick(form)} variant="danger" className="shrink-0"><TrashIcon className="w-4 h-4"/></Button>
                                    {form.status === 'validated' && !form.isPublic && user.id === form.userId && (
                                        <div className="relative shrink-0" ref={el => actionMenuRef.current[form.id] = el}>
                                            <Button onClick={() => setOpenActionMenu(openActionMenu === form.id ? null : form.id)} variant="secondary">Actions</Button>
                                            {openActionMenu === form.id && (
                                                <div className="absolute left-0 bottom-full mb-2 w-48 bg-white dark:bg-slate-800 shadow-xl rounded-lg p-2 z-50 border border-slate-100">
                                                    <button onClick={() => { setFormToPublish(form); setIsPublishModalOpen(true); }} className="w-full text-left p-2 text-sm hover:bg-slate-50 rounded">Publier</button>
                                                    <button onClick={() => setFormToAction(form)} className="w-full text-left p-2 text-sm hover:bg-slate-50 rounded">Corriger/Modifier</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </Card>
                );
            })}
        </div>
        {formToAction && <ModificationRequestModal form={formToAction} onClose={() => setFormToAction(null)} onSubmit={handleRequestFormModification} />}
        {isPublishModalOpen && formToPublish && <PublishModal form={formToPublish} onClose={() => setIsPublishModalOpen(false)} onConfirm={publishForm} settings={systemSettings} />}
        {confirmation && <ConfirmationModal {...confirmation} />}
    </div>
  );
};

const getStatusBadge = (status: Form['status']) => {
    switch (status) {
        case 'draft': return { text: 'Brouillon', className: 'bg-yellow-100 text-yellow-800' };
        case 'validated': return { text: 'Validé', className: 'bg-green-100 text-green-800' };
        case 'pending_revalidation': return { text: 'Examen Admin', className: 'bg-orange-100 text-orange-800' };
        default: return { text: 'En attente', className: 'bg-slate-100 text-slate-800' };
    }
};

export default Forms;
