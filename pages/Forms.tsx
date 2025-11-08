import React, { useState, useMemo } from 'react';
import { User, Form, FormResponse, FormField, PurchasedForm } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import FormBuilder from '../components/FormBuilder';
import ConfirmationModal, { ConfirmationModalProps } from '../components/ConfirmationModal';
import { COIN_COSTS, LIBRARY_PRICES, COMMISSION_RATES } from '../constants';
import PlusIcon from '../components/icons/PlusIcon';
import CoinIcon from '../components/icons/CoinIcon';

interface FormsProps {
  user: User;
  forms: Form[]; // User's own forms
  allForms: Form[]; // All forms in the app, needed for purchases
  responses: FormResponse[];
  purchasedForms: PurchasedForm[];
  addFormResponse: (formId: string, data: Record<string, any>) => void;
  deleteFormResponse: (responseId: string) => void;
  createForm: (form: Form) => void;
  updateForm: (form: Form) => void;
  validateForm: (formId: string) => void;
  publishForm: (formId: string, price: number, pricePerResponse: number) => void;
  users: User[];
  onNavigate: (page: string, context?: any) => void;
}

const PublishModal: React.FC<{
  form: Form;
  onClose: () => void;
  onConfirm: (formId: string, price: number, pricePerResponse: number) => void;
}> = ({ form, onClose, onConfirm }) => {

  const handleConfirm = () => {
    onConfirm(form.id, LIBRARY_PRICES.DEFAULT_FORM_PRICE, LIBRARY_PRICES.DEFAULT_PRICE_PER_RESPONSE);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Publier "{form.title}"</h3>
        </header>
        <main className="p-6 space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">En publiant votre formulaire dans la bibliothèque, vous acceptez de céder à MedataAI le droit non exclusif de le diffuser à d’autres utilisateurs. Vous restez le propriétaire intellectuel du contenu et percevrez une rémunération pour chaque achat.</p>
            
            <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-800 dark:text-slate-200">Prix de vente du formulaire</span>
                    <span className="font-semibold text-slate-900 dark:text-white flex items-center"><CoinIcon className="w-4 h-4 mr-1 text-yellow-500" />{LIBRARY_PRICES.DEFAULT_FORM_PRICE}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-green-600 dark:text-green-400">
                    <span>Votre gain par vente (60%)</span>
                    <span className="font-semibold flex items-center"><CoinIcon className="w-4 h-4 mr-1" />{LIBRARY_PRICES.DEFAULT_FORM_PRICE * COMMISSION_RATES.CREATOR_FORM_SALE}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-600 !my-2"></div>
                 <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-800 dark:text-slate-200">Prix de vente par réponse</span>
                    <span className="font-semibold text-slate-900 dark:text-white flex items-center"><CoinIcon className="w-4 h-4 mr-1 text-yellow-500" />{LIBRARY_PRICES.DEFAULT_PRICE_PER_RESPONSE}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-green-600 dark:text-green-400">
                    <span>Votre gain par réponse (50%)</span>
                    <span className="font-semibold flex items-center"><CoinIcon className="w-4 h-4 mr-1" />{LIBRARY_PRICES.DEFAULT_PRICE_PER_RESPONSE * COMMISSION_RATES.CREATOR_RESPONSE_SALE}</span>
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


const Forms: React.FC<FormsProps> = ({ user, forms, allForms, responses, purchasedForms, addFormResponse, deleteFormResponse, createForm, updateForm, validateForm, publishForm, users, onNavigate }) => {
  const [view, setView] = useState<'list' | 'filling' | 'building' | 'viewing_responses_list' | 'viewing_single_response'>('list');
  const [activeTab, setActiveTab] = useState<'my_forms' | 'my_purchases'>(user.role === 'admin' ? 'my_forms' : 'my_forms');
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchasedForm | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [confirmation, setConfirmation] = useState<ConfirmationModalProps | null>(null);
  const [filters, setFilters] = useState({ studentId: '', searchTerm: '', publicationStatus: 'all' });
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [formToPublish, setFormToPublish] = useState<Form | null>(null);

  const isSuspended = user.role === 'student' && user.status.startsWith('suspended');
  
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

  const filteredForms = useMemo(() => {
    if (user.role !== 'admin') {
      return forms;
    }
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
  }, [forms, filters, user.role]);

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

  const handleValidateAndSaveForm = (form: Form) => {
    if (selectedForm || forms.find(f => f.id === form.id)) { // Update existing form
      updateForm(form);
    } else { // Create new form
      createForm(form);
    }
    // The validation function will handle the 'validated' flag and transaction
    validateForm(form.id);
    setView('list');
  };

  const isFieldVisible = (field: FormField, currentData: Record<string, any>): boolean => {
    if (!field.condition) {
      return true;
    }
    const { sourceFieldId, sourceFieldValue } = field.condition;
    const sourceFieldValueFromData = currentData[sourceFieldId];

    if (Array.isArray(sourceFieldValueFromData)) {
      // Checkbox case
      return sourceFieldValueFromData.includes(sourceFieldValue);
    }
    // Radio or other types
    return sourceFieldValueFromData === sourceFieldValue;
  };

  const handleSubmitResponse = () => {
    if (!selectedForm) return;

    const visibleFields = selectedForm.schema.filter(field => isFieldVisible(field, formData));

    for (const field of visibleFields) {
      if (field.type !== 'note' && !formData[field.id]) {
         // For range, if no value is set, default it to min value
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
  
    // Check all fields in the schema
    for (const field of selectedForm.schema) {
      // If a field is not visible with the new data, remove its value
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

  const renderFormField = (field: FormField, data: Record<string, any>, isReadOnly = false) => {
    const commonClasses = "mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md disabled:opacity-70 disabled:bg-slate-200 dark:disabled:bg-slate-600 disabled:text-slate-700 dark:disabled:text-slate-300";
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

  const getResponseCountForForm = (formId: string) => responses.filter(r => r.formId === formId).length;

  // New render functions for viewing responses
  const renderResponseListView = () => {
    if (!selectedForm) return null;
    const formResponses = responses
      .filter(r => {
        if (r.formId !== selectedForm.id) return false;
        // If viewing a purchased form
        if (selectedPurchase) {
          // If responses were NOT purchased, only show user's own.
          if (!selectedPurchase.withResponses) {
            return r.userId === user.id;
          }
          // Otherwise, show all (purchased + user's own).
          return true;
        }
        // If viewing one of their own forms, show all.
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

                // Handle different data types for display
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
      onValidate={handleValidateAndSaveForm}
      onCancel={handleBackToList}
      userId={user.id}
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
                Soumettre la réponse {user.role !== 'admin' && `(${COIN_COSTS.ADD_RESPONSE} Coins)`}
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
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{user.role === 'admin' ? 'Tous les formulaires' : 'Gestion des Formulaires'}</h2>
          {user.role === 'student' && activeTab === 'my_forms' && <Button onClick={handleStartCreating} disabled={isSuspended}>+ Créer un formulaire</Button>}
          {user.role === 'admin' && (
             <Button onClick={handleStartMultiFormAnalysis} disabled={selectedFormIds.length === 0}>
                Analyse IA ({selectedFormIds.length})
             </Button>
          )}
        </div>

        {user.role === 'student' && (
            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('my_forms')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'my_forms' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}>Mes Formulaires</button>
                    <button onClick={() => setActiveTab('my_purchases')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'my_purchases' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}>Mes Achats</button>
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
        
        {activeTab === 'my_forms' && (
            <>
                {user.role === 'admin' && (
                <Card title="Filtres">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input name="searchTerm" value={filters.searchTerm} onChange={handleFilterChange} placeholder="Rechercher par mot-clé (diabète, symptôme...)" className="block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md"/>
                    <select name="studentId" value={filters.studentId} onChange={handleFilterChange} className="block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md">
                        <option value="">Tous les étudiants</option>
                        {users.filter(u => u.role === 'student').sort((a,b) => a.name.localeCompare(b.name)).map(student => (<option key={student.id} value={student.id}>{student.name}</option>))}
                    </select>
                    <select name="publicationStatus" value={filters.publicationStatus} onChange={handleFilterChange} className="block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md">
                        <option value="all">Tous les statuts</option>
                        <option value="public">Publiés uniquement</option>
                        <option value="private">Non publiés</option>
                    </select>
                    </div>
                </Card>
                )}

                {filteredForms.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredForms.map(form => {
                    const creator = users.find(u => u.id === form.userId);
                    const responseCount = getResponseCountForForm(form.id);
                    const matchingQuestions = form.schema.filter(q => filters.searchTerm.trim() && q.label.toLowerCase().includes(filters.searchTerm.trim().toLowerCase())).map(q => q.label);

                    return (
                        <Card key={form.id} className="flex flex-col relative">
                        {user.role === 'admin' && (<div className="absolute top-4 right-4 z-10 bg-white dark:bg-slate-800 p-1 rounded-full"><input type="checkbox" checked={selectedFormIds.includes(form.id)} onChange={() => handleToggleFormSelection(form.id)} className="h-5 w-5 rounded-full border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700 text-primary-600 focus:ring-primary-500" aria-label={`Sélectionner le formulaire ${form.title}`}/></div>)}
                        <div className="flex-grow">
                            <div className="flex justify-between items-start">
                            <div className="pr-12">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{highlightMatch(form.title, filters.searchTerm)}</h3>
                                <p className="text-slate-600 dark:text-slate-400 mt-1">{highlightMatch(form.description, filters.searchTerm)}</p>
                            </div>
                            <div className="flex flex-col items-end space-y-2 flex-shrink-0 ml-4">
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${form.validated ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>{form.validated ? 'Validé' : 'Brouillon'}</span>
                                {form.isPublic && <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Publié</span>}
                            </div>
                            </div>

                            {user.role === 'admin' && creator && (<p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Créé par : <span className="font-medium">{creator.name}</span></p>)}
                            {matchingQuestions.length > 0 && (<div className="mt-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-2"><p className="font-semibold">Correspondance dans les questions :</p><ul className="list-disc list-inside ml-2 mt-1">{matchingQuestions.map((label, index) => (<li key={index} className="truncate" title={label}>{highlightMatch(label, filters.searchTerm)}</li>))}</ul></div>)}
                            <div className="mt-4 flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
                            <span>Créé le : {new Date(form.createdAt).toLocaleDateString()}</span>
                            {user.role === 'student' && form.validated ? (<button onClick={() => responseCount > 0 && handleViewResponses(form)} disabled={responseCount === 0} className="font-medium text-primary-600 hover:underline dark:text-primary-400 disabled:text-slate-400 disabled:no-underline disabled:cursor-default">{responseCount} {responseCount > 1 ? 'réponses' : 'réponse'}</button>) : (<span>{responseCount} {responseCount > 1 ? 'réponses' : 'réponse'}</span>)}
                            </div>
                        </div>
                        <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4 flex space-x-3">
                            {user.role === 'student' && (
                                <>
                                    {!form.validated ? (
                                        <Button onClick={() => handleStartEditing(form)} variant="secondary" className="w-full" disabled={isSuspended}>Modifier</Button>
                                    ) : form.isPublic ? (
                                        <Button onClick={() => handleViewResponses(form)} className="w-full" disabled={responseCount === 0}>Voir les réponses</Button>
                                    ) : (
                                        <div className="w-full flex items-center space-x-3">
                                            <Button onClick={() => handleStartFilling(form)} className="flex-grow" disabled={isSuspended}>
                                                <PlusIcon className="w-4 h-4 mr-2 inline-block" />
                                                Ajouter une réponse
                                            </Button>
                                            <Button 
                                                onClick={() => { setFormToPublish(form); setIsPublishModalOpen(true); }} 
                                                variant="secondary"
                                                className="!px-3 !py-2 text-sm"
                                                title="Publier le formulaire"
                                                disabled={isSuspended}
                                            >
                                                Publier
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                            {user.role === 'admin' && (<Button onClick={() => handleViewResponses(form)} className="w-full" disabled={responseCount === 0}>Voir les réponses ({responseCount})</Button>)}
                        </div>
                        </Card>
                    );
                    })}
                </div>
                ) : (
                <Card><div className="text-center py-12"><h3 className="text-lg font-medium text-slate-900 dark:text-white">Aucun formulaire trouvé</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user.role === 'admin' ? 'Aucun formulaire ne correspond à vos critères de recherche.' : 'Cliquez sur "+ Créer un formulaire" pour commencer.'}</p>{user.role !== 'admin' && (<div className="mt-6"><Button onClick={handleStartCreating} disabled={isSuspended}>Commencer mon premier formulaire</Button></div>)}</div></Card>
                )}
            </>
        )}

        {activeTab === 'my_purchases' && (
            purchasedForms.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {purchasedForms.map(purchase => {
                    const form = allForms.find(f => f.id === purchase.formId);
                    if (!form) return null;
                    const creator = users.find(u => u.id === form.userId);
                    const allFormResponses = responses.filter(r => r.formId === form.id);
                    const responsesUserCanSee = allFormResponses.filter(r => purchase.withResponses || r.userId === user.id);
                    
                    return (
                        <Card key={purchase.id} className="flex flex-col">
                            <div className="flex-grow">
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
                            <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
                                <Button 
                                    onClick={() => handleStartFilling(form)} 
                                    className="w-full"
                                    disabled={isSuspended}
                                >
                                     <PlusIcon className="w-4 h-4 mr-2 inline-block" />
                                    Ajouter une réponse
                                </Button>
                            </div>
                        </Card>
                    )
                })}
                </div>
            ) : (
                <Card><div className="text-center py-12"><h3 className="text-lg font-medium text-slate-900 dark:text-white">Aucun achat</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Vous n'avez encore acheté aucun formulaire. Explorez la bibliothèque !</p><div className="mt-6"><Button onClick={() => onNavigate('bibliotheque')}>Aller à la Bibliothèque</Button></div></div></Card>
            )
        )}

      </div>
      {confirmation && <ConfirmationModal {...confirmation} />}
      {isPublishModalOpen && formToPublish && <PublishModal form={formToPublish} onClose={() => setIsPublishModalOpen(false)} onConfirm={handleConfirmPublish} />}
    </>
  );
};

export default Forms;