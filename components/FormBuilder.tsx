import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Form, FormField, SystemSettings } from '../types';
import Button from './Button';
import Card from './Card';
import TrashIcon from './icons/TrashIcon';
import ArrowUpIcon from './icons/ArrowUpIcon';
import ArrowDownIcon from './icons/ArrowDownIcon';
import PlusIcon from './icons/PlusIcon';
import LinkIcon from './icons/LinkIcon';
import TextIcon from './icons/TextIcon';
import NumberIcon from './icons/NumberIcon';
import ChoiceIcon from './icons/ChoiceIcon';
import CheckSquareIcon from './icons/CheckSquareIcon';
import CalendarIcon from './icons/CalendarIcon';
import NoteIcon from './icons/NoteIcon';
import ConfirmationModal, { ConfirmationModalProps } from './ConfirmationModal';
import RangeIcon from './icons/RangeIcon';
import UndoIcon from './icons/UndoIcon';
import EyeIcon from './icons/EyeIcon';

interface FormBuilderProps {
  initialForm?: Form | null;
  onSave: (form: Form) => void;
  onValidate: (form: Form) => void;
  onCancel: () => void;
  userId: string;
  systemSettings: SystemSettings;
}

const newFormTemplate = (userId: string): Form => ({
  id: `form-${Date.now()}`,
  userId: userId,
  title: 'Nouveau Formulaire',
  description: '',
  schema: [],
  status: 'draft',
  createdAt: new Date().toISOString(),
  isPublic: false,
  price: 0,
  pricePerResponse: 0,
  origin: 'created',
});

const fieldTypes: { type: FormField['type']; label: string; icon: React.ReactNode; description: string; }[] = [
    { type: 'text', label: 'Texte court', icon: <TextIcon className="w-8 h-8" />, description: "Pour une réponse courte sur une seule ligne." },
    { type: 'textarea', label: 'Texte long', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>, description: "Pour une réponse longue sur plusieurs lignes." },
    { type: 'number', label: 'Nombre', icon: <NumberIcon className="w-8 h-8" />, description: "Pour une entrée numérique (âge, quantité, etc.)." },
    { type: 'choice', label: 'Choix unique', icon: <ChoiceIcon className="w-8 h-8" />, description: "L'utilisateur choisit une seule option (boutons radio)." },
    { type: 'checkbox', label: 'Choix multiples', icon: <CheckSquareIcon className="w-8 h-8" />, description: "L'utilisateur peut sélectionner plusieurs options." },
    { type: 'date', label: 'Date', icon: <CalendarIcon className="w-8 h-8" />, description: "Pour sélectionner une date dans un calendrier." },
    { type: 'range', label: 'Échelle numérique', icon: <RangeIcon className="w-8 h-8" />, description: "L'utilisateur choisit un nombre sur une échelle définie (curseur)." },
    { type: 'note', label: 'Note', icon: <NoteIcon className="w-8 h-8" />, description: "Pour afficher du texte informatif, sans champ de réponse." },
];

const FieldTypeChanger: React.FC<{
  currentType: FormField['type'];
  onChange: (newType: FormField['type']) => void;
}> = ({ currentType, onChange }) => {
  return (
    <div className="relative">
      <select 
        value={currentType}
        onChange={(e) => onChange(e.target.value as FormField['type'])}
        className="text-xs appearance-none font-semibold bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md pl-3 pr-8 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        {fieldTypes.map(ft => (
          <option key={ft.type} value={ft.type}>{ft.label}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700 dark:text-slate-200">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
      </div>
    </div>
  );
};

interface FieldCardProps {
  field: FormField;
  index: number;
  total: number;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
  moveField: (fieldId: string, direction: 'up' | 'down') => void;
  removeField: (fieldId: string) => void;
  updateOption: (fieldId: string, optionIndex: number, value: string) => void;
  addOption: (fieldId: string) => void;
  removeOption: (fieldId: string, optionIndex: number) => void;
  moveOption: (fieldId: string, optionIndex: number, direction: 'up' | 'down') => void;
  onTypeChange: (fieldId: string, newType: FormField['type']) => void;
  possibleSources: FormField[];
}

const FieldCard: React.FC<FieldCardProps> = ({ field, index, total, updateField, moveField, removeField, updateOption, addOption, removeOption, moveOption, onTypeChange, possibleSources }) => {
    const [isConditionEditorOpen, setIsConditionEditorOpen] = useState(!!field.condition);

    const sourceField = useMemo(() => {
        if (!field.condition) return null;
        return possibleSources.find(f => f.id === field.condition?.sourceFieldId);
    }, [field.condition, possibleSources]);

    const handleConditionChange = (sourceFieldId: string) => {
        const selectedSource = possibleSources.find(f => f.id === sourceFieldId);
        if (selectedSource && selectedSource.options && selectedSource.options.length > 0) {
            updateField(field.id, { condition: { sourceFieldId, sourceFieldValue: selectedSource.options[0] } });
        }
    };
    
    const removeCondition = () => {
        const { condition, ...rest } = field;
        const newField = { ...rest };
        updateField(field.id, { ...newField, condition: undefined });
        setIsConditionEditorOpen(false);
    };

    return (
        <Card className="!p-0 !overflow-visible">
          <div className="p-4">
            <div className="flex justify-between items-start">
                <div className="flex-grow pr-4">
                     <input
                        id={`field-label-${field.id}`}
                        type="text"
                        value={field.label}
                        placeholder="Entrez votre question ici"
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                        className="w-full text-lg font-semibold bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 p-2 rounded-md transition-colors shadow"
                    />
                </div>
                <div className="flex items-center space-x-1">
                     <button onClick={() => moveField(field.id, 'up')} disabled={index === 0} className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed dark:hover:text-slate-200"><ArrowUpIcon className="w-5 h-5"/></button>
                    <button onClick={() => moveField(field.id, 'down')} disabled={index === total - 1} className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed dark:hover:text-slate-200"><ArrowDownIcon className="w-5 h-5"/></button>
                    <button onClick={() => removeField(field.id)} className="p-2 text-red-400 hover:text-red-600"><TrashIcon className="w-5 h-5"/></button>
                </div>
            </div>
            {(field.type === 'choice' || field.type === 'checkbox') && (
                <div className="mt-4 pl-2 space-y-2">
                    {field.options?.map((opt, i) => (
                        <div key={i} className="flex items-center space-x-2">
                            <input
                                type="text"
                                value={opt}
                                onChange={e => updateOption(field.id, i, e.target.value)}
                                className="flex-grow bg-white dark:bg-slate-700/50 border-slate-300 dark:border-slate-600 focus:ring-primary-500 focus:border-primary-500 rounded-md shadow sm:text-sm text-slate-900 dark:text-slate-200"
                            />
                            <div className="flex items-center shrink-0">
                                <button onClick={() => moveOption(field.id, i, 'up')} disabled={i === 0} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed dark:hover:text-slate-200" title="Monter l'option"><ArrowUpIcon className="w-4 h-4"/></button>
                                <button onClick={() => moveOption(field.id, i, 'down')} disabled={i === field.options!.length - 1} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed dark:hover:text-slate-200" title="Descendre l'option"><ArrowDownIcon className="w-4 h-4"/></button>
                                <button onClick={() => removeOption(field.id, i)} disabled={field.options!.length <= 1} className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed" title="Supprimer l'option"><TrashIcon className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))}
                     <Button onClick={() => addOption(field.id)} variant="secondary" className="!text-xs !py-1 !px-2"><PlusIcon className="w-4 h-4 mr-1 inline"/> Ajouter une option</Button>
                </div>
            )}
            {(field.type === 'range') && (
                <div className="mt-4 pl-2 flex items-center space-x-4">
                    <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Minimum</label>
                        <input
                            type="number"
                            value={field.min != null ? field.min : 0}
                            onChange={e => updateField(field.id, { min: e.target.valueAsNumber })}
                            className="w-24 mt-1 bg-white dark:bg-slate-700/50 border-slate-300 dark:border-slate-600 focus:ring-primary-500 focus:border-primary-500 rounded-md shadow sm:text-sm text-slate-900 dark:text-slate-200"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Maximum</label>
                        <input
                            type="number"
                            value={field.max != null ? field.max : 100}
                            onChange={e => updateField(field.id, { max: e.target.valueAsNumber })}
                            className="w-24 mt-1 bg-white dark:bg-slate-700/50 border-slate-300 dark:border-slate-600 focus:ring-primary-500 focus:border-primary-500 rounded-md shadow sm:text-sm text-slate-900 dark:text-slate-200"
                        />
                    </div>
                </div>
            )}
            {isConditionEditorOpen && (
                <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg space-y-2">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Afficher cette question si :</p>
                    <div className="flex items-center space-x-2">
                        <select
                            value={field.condition?.sourceFieldId || ''}
                            onChange={(e) => handleConditionChange(e.target.value)}
                            className="flex-grow bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow sm:text-sm text-slate-900 dark:text-slate-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        >
                            <option value="" disabled>Choisir une question...</option>
                            {possibleSources.map(src => <option key={src.id} value={src.id}>{src.label}</option>)}
                        </select>
                        {sourceField && <span className="text-sm text-slate-700 dark:text-slate-300">est</span>}
                        {sourceField && sourceField.options && (
                            <select
                                value={field.condition?.sourceFieldValue || ''}
                                onChange={(e) => updateField(field.id, { condition: { ...field.condition!, sourceFieldValue: e.target.value } })}
                                className="flex-grow bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow sm:text-sm text-slate-900 dark:text-slate-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                            >
                                {sourceField.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        )}
                        <button onClick={removeCondition} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
            )}
          </div>
           <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <FieldTypeChanger 
                    currentType={field.type} 
                    onChange={(newType) => onTypeChange(field.id, newType)} 
                />
             {index > 0 && field.type !== 'note' && (
                <button
                    onClick={() => setIsConditionEditorOpen(!isConditionEditorOpen)}
                    className="flex items-center text-xs text-primary-600 dark:text-primary-400 hover:underline"
                    title="Ajouter une condition d'affichage"
                >
                    <LinkIcon className="w-4 h-4 mr-1" />
                    {field.condition ? 'Modifier la condition' : 'Ajouter une condition'}
                </button>
             )}
          </div>
        </Card>
    );
};

const Inserter: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
    <div className="relative h-8 flex items-center justify-center group my-2">
        <hr className="w-full border-t border-dashed border-slate-300 dark:border-slate-600 group-hover:border-primary-400 transition-colors" />
        <button
            onClick={onAdd}
            className="absolute w-8 h-8 bg-white dark:bg-slate-800 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-primary-500 group-hover:text-white group-hover:border-primary-500 transition-all transform group-hover:scale-110 shadow-sm"
            title="Ajouter une question ici"
        >
            <PlusIcon className="w-5 h-5" />
        </button>
    </div>
);

const renderFormFieldPreview = (field: FormField) => {
    const commonClasses = "mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md disabled:opacity-70 disabled:cursor-not-allowed";
    const radioCheckboxClasses = "h-4 w-4 text-primary-600 border-slate-300 dark:border-slate-500 bg-slate-200 dark:bg-slate-700 disabled:opacity-70 disabled:cursor-not-allowed";
    
    switch (field.type) {
      case 'text': return <input type="text" disabled className={commonClasses}/>;
      case 'textarea': return <textarea rows={2} disabled className={commonClasses}/>;
      case 'number': return <input type="number" disabled className={commonClasses}/>;
      case 'choice':
        return <div className="mt-2 space-y-2">{field.options?.map(option => (<div key={option} className="flex items-center"><input type="radio" disabled className={radioCheckboxClasses}/><label className="ml-3 block text-sm font-medium text-slate-700 dark:text-slate-300">{option}</label></div>))}</div>;
       case 'checkbox':
        return <div className="mt-2 space-y-2">{field.options?.map(option => (<div key={option} className="flex items-center"><input type="checkbox" disabled className={`${radioCheckboxClasses} rounded`}/><label className="ml-3 block text-sm font-medium text-slate-700 dark:text-slate-300">{option}</label></div>))}</div>;
      case 'date': return <input type="date" disabled className={commonClasses}/>;
      case 'range':
        return <div className="mt-2 flex items-center space-x-4"><span className="text-sm font-medium">{field.min ?? 0}</span><input type="range" min={field.min ?? 0} max={field.max ?? 100} disabled className="w-full h-2 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-not-allowed" /><span className="text-sm font-medium">{field.max ?? 100}</span></div>;
      case 'note':
        return (
          <div className="mt-6 mb-2 pt-2 border-b border-slate-300 dark:border-slate-600">
            <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-300">{field.label}</h3>
          </div>
        );
      default: return null;
    }
};

const PreviewModal: React.FC<{
    form: Form;
    onClose: () => void;
}> = ({ form, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Aperçu : {form.title}</h3>
                </header>
                <main className="p-6 space-y-4 overflow-y-auto">
                    <p className="mb-4 text-slate-600 dark:text-slate-400">{form.description}</p>
                    <div className="space-y-6">
                        {form.schema.map(field => {
                            const sourceField = field.condition ? form.schema.find(f => f.id === field.condition?.sourceFieldId) : null;
                            return (
                                <div key={field.id}>
                                    {field.type !== 'note' && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{field.label}</label>}
                                    {renderFormFieldPreview(field)}
                                    {sourceField && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pl-1">
                                            S'affiche si '{sourceField.label}' est '{field.condition?.sourceFieldValue}'
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </main>
                <footer className="flex justify-end p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 rounded-b-lg">
                    <Button onClick={onClose} variant="secondary">Fermer</Button>
                </footer>
            </div>
        </div>
    );
};


const FormBuilder: React.FC<FormBuilderProps> = ({ initialForm, onSave, onValidate, onCancel, userId, systemSettings }) => {
  const [form, setForm] = useState<Form>(initialForm ? JSON.parse(JSON.stringify(initialForm)) : newFormTemplate(userId));
  const [history, setHistory] = useState<Form[]>([]);
  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);
  const newlyAddedFieldId = useRef<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationModalProps | null>(null);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (newlyAddedFieldId.current) {
      const fieldId = newlyAddedFieldId.current;
      setTimeout(() => {
        const inputElement = document.getElementById(`field-label-${fieldId}`) as HTMLInputElement;
        if (inputElement) {
          inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          inputElement.focus();
          inputElement.select();
        }
      }, 100);
      newlyAddedFieldId.current = null;
    }
  }, [form.schema.length]);
  
  const updateFormAndHistory = (updater: (currentForm: Form) => Form) => {
    setForm(currentForm => {
      setHistory(prevHistory => [...prevHistory, currentForm]);
      return updater(currentForm);
    });
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    setForm(lastState);
    setHistory(newHistory);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    updateFormAndHistory(prev => ({
      ...prev,
      schema: prev.schema.map(f => f.id === fieldId ? { ...f, ...updates } : f)
    }));
  };

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      label: type === 'note' ? 'Ceci est une note informative pour les répondants.' : '',
      type: type,
      ...( (type === 'choice' || type === 'checkbox') && { options: ['Option 1'] } ),
      ...( type === 'range' && { min: 0, max: 100 } ),
    };
    newlyAddedFieldId.current = newField.id;
    
    updateFormAndHistory(prev => {
        const newSchema = [...prev.schema];
        if (insertionIndex !== null) {
            newSchema.splice(insertionIndex, 0, newField);
        } else {
            newSchema.push(newField);
        }
        return { ...prev, schema: newSchema };
    });

    setInsertionIndex(null);
    setIsTypePickerOpen(false);
  };

  const removeField = (fieldId: string) => {
    const dependentFields = form.schema.filter(f => f.condition?.sourceFieldId === fieldId);

    let message: React.ReactNode = "Êtes-vous sûr de vouloir supprimer cette question ?";
    if (dependentFields.length > 0) {
        message = (
            <>
                <p>Êtes-vous sûr de vouloir supprimer cette question ?</p>
                <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                    <strong>Attention :</strong> {dependentFields.length} autre(s) question(s) dépendent de celle-ci. Leurs conditions d'affichage seront supprimées.
                </p>
            </>
        );
    }
    
    setConfirmation({
        isOpen: true,
        title: "Confirmer la suppression",
        message: message,
        onConfirm: () => {
             updateFormAndHistory(currentForm => {
                const newSchema = currentForm.schema
                  .filter(field => field.id !== fieldId)
                  .map(field => {
                    if (field.condition?.sourceFieldId === fieldId) {
                      const { condition, ...restOfField } = field;
                      return restOfField;
                    }
                    return field;
                  });
                
                return {
                  ...currentForm,
                  schema: newSchema
                };
            });
            setConfirmation(null);
        },
        onClose: () => setConfirmation(null),
        variant: 'danger',
        confirmText: 'Supprimer'
    });
  };
  
  const handleFieldTypeChange = (fieldId: string, newType: FormField['type']) => {
    updateFormAndHistory(prev => {
        const schema = prev.schema;
        const fieldIndex = schema.findIndex(f => f.id === fieldId);
        if (fieldIndex === -1) return prev;

        const originalField = schema[fieldIndex];
        if (originalField.type === newType) return prev;

        const isSwitchingBetweenChoiceTypes =
            (originalField.type === 'choice' && newType === 'checkbox') ||
            (originalField.type === 'checkbox' && newType === 'choice');

        let updatedField: Partial<FormField> & { id: string, type: FormField['type'], label: string } = {
            id: originalField.id,
            label: isSwitchingBetweenChoiceTypes ? originalField.label : '',
            type: newType,
        };

        if (isSwitchingBetweenChoiceTypes) {
            updatedField.options = originalField.options;
        }

        if ((newType === 'choice' || newType === 'checkbox') && !updatedField.options) {
            updatedField.options = ['Option 1'];
        }
        if (newType === 'range') {
            updatedField.min = 0;
            updatedField.max = 100;
        }
        
        if(originalField.condition) {
            updatedField.condition = originalField.condition;
        }

        const newSchema = [...schema];
        newSchema[fieldIndex] = updatedField as FormField;

        const wasChoiceType = originalField.type === 'choice' || originalField.type === 'checkbox';
        const isNowNotChoiceType = newType !== 'choice' && newType !== 'checkbox';

        if (wasChoiceType && isNowNotChoiceType) {
            const finalSchema = newSchema.map(f => {
                if (f.condition?.sourceFieldId === fieldId) {
                    const { condition, ...rest } = f;
                    return rest;
                }
                return f;
            });
            return { ...prev, schema: finalSchema };
        }
        
        return { ...prev, schema: newSchema };
    });
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    updateFormAndHistory(prev => {
        const newSchema = [...prev.schema];
        const index = newSchema.findIndex(f => f.id === fieldId);
        if (direction === 'up' && index > 0) {
        [newSchema[index - 1], newSchema[index]] = [newSchema[index], newSchema[index - 1]];
        }
        if (direction === 'down' && index < newSchema.length - 1) {
        [newSchema[index + 1], newSchema[index]] = [newSchema[index], newSchema[index + 1]];
        }
        return { ...prev, schema: newSchema };
    });
  };

  const updateOption = (fieldId: string, optionIndex: number, value: string) => {
    updateFormAndHistory(prev => {
        const field = prev.schema.find(f => f.id === fieldId);
        if (!field || !field.options) return prev;
        
        const oldOptionValue = field.options[optionIndex];
        const newOptions = [...field.options];
        newOptions[optionIndex] = value;
        
        return {
            ...prev,
            schema: prev.schema.map(f => {
                if (f.id === fieldId) {
                    return { ...f, options: newOptions };
                }
                if (f.condition?.sourceFieldId === fieldId && f.condition.sourceFieldValue === oldOptionValue) {
                    return { ...f, condition: { ...f.condition, sourceFieldValue: value } };
                }
                return f;
            })
        };
    });
  };

  const addOption = (fieldId: string) => {
    updateFormAndHistory(prev => {
        return {
            ...prev,
            schema: prev.schema.map(f => {
                if (f.id === fieldId && f.options) {
                    return { ...f, options: [...f.options, `Option ${f.options.length + 1}`] };
                }
                return f;
            })
        };
    });
  };

  const removeOption = (fieldId: string, optionIndex: number) => {
    updateFormAndHistory(prev => {
        const field = prev.schema.find(f => f.id === fieldId);
        if (!field || !field.options || field.options.length <= 1) return prev;
        
        const removedOption = field.options[optionIndex];
        const newOptions = field.options.filter((_, i) => i !== optionIndex);

        return {
            ...prev,
            schema: prev.schema.map(f => {
                if (f.id === fieldId) {
                    return { ...f, options: newOptions };
                }
                if (f.condition?.sourceFieldId === fieldId && f.condition.sourceFieldValue === removedOption) {
                    const { condition, ...rest } = f;
                    return rest;
                }
                return f;
            })
        };
    });
  };
  
  const moveOption = (fieldId: string, optionIndex: number, direction: 'up' | 'down') => {
    updateFormAndHistory(prev => {
        const newSchema = [...prev.schema];
        const fieldIndex = newSchema.findIndex(f => f.id === fieldId);
        if (fieldIndex === -1) return prev;

        const field = newSchema[fieldIndex];
        if (!field.options) return prev;

        const newOptions = [...field.options];
        if (direction === 'up' && optionIndex > 0) {
            [newOptions[optionIndex - 1], newOptions[optionIndex]] = [newOptions[optionIndex], newOptions[optionIndex - 1]];
        } else if (direction === 'down' && optionIndex < newOptions.length - 1) {
            [newOptions[optionIndex + 1], newOptions[optionIndex]] = [newOptions[optionIndex], newOptions[optionIndex + 1]];
        } else {
            return prev; // No change
        }

        newSchema[fieldIndex] = { ...field, options: newOptions };
        return { ...prev, schema: newSchema };
    });
  };

  const validationCost = form.origin === 'purchased' ? systemSettings.coinCosts.validatePurchasedForm : systemSettings.coinCosts.validateForm;
  const isFreeValidation = form.revalidationFree === true;

  const handleValidateClick = () => {
    if (!form.title.trim()) {
      setConfirmation({
        isOpen: true,
        title: "Titre Manquant",
        message: "Le formulaire doit avoir un titre avant de pouvoir être validé.",
        onConfirm: () => setConfirmation(null),
        onClose: () => setConfirmation(null),
        confirmText: 'Compris',
        variant: 'primary',
      });
      return;
    }
    if (form.schema.length === 0) {
      setConfirmation({
        isOpen: true,
        title: "Formulaire Vide",
        message: "Veuillez ajouter au moins une question avant de valider le formulaire.",
        onConfirm: () => setConfirmation(null),
        onClose: () => setConfirmation(null),
        confirmText: 'Compris',
        variant: 'primary',
      });
      return;
    }
    if (form.schema.some(f => f.type !== 'note' && !f.label.trim())) {
      setConfirmation({
        isOpen: true,
        title: "Question(s) Incomplète(s)",
        message: "Toutes les questions doivent avoir un libellé (un titre). Veuillez vérifier chaque question avant de valider le formulaire.",
        onConfirm: () => setConfirmation(null),
        onClose: () => setConfirmation(null),
        confirmText: 'Compris',
        variant: 'primary',
      });
      return;
    }

    setConfirmation({
      isOpen: true,
      title: "Confirmer la validation",
      message: (
        <div className="space-y-3 text-left">
            <p>Vous êtes sur le point de valider ce formulaire.</p>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-300 rounded-r-lg">
                <p>• Vous ne pourrez <strong>plus le modifier</strong>.</p>
                {isFreeValidation ? (
                    <p className="font-semibold text-green-700 dark:text-green-300">• Cette re-validation est gratuite.</p>
                ) : (
                    <p>• Un frais de <strong>{validationCost} coins</strong> sera facturé.</p>
                )}
            </div>
            <p className="text-slate-600 dark:text-slate-400">
                Vous pouvez l'enregistrer en tant que <strong>brouillon gratuitement</strong> pour le modifier plus tard.
            </p>
        </div>
      ),
      onConfirm: () => {
        onValidate(form);
        setConfirmation(null);
      },
      onClose: () => setConfirmation(null),
      variant: 'primary',
      confirmText: isFreeValidation ? 'Valider Gratuitement' : 'Valider et Payer',
      cancelText: 'Retourner à l\'édition'
    });
  };
  
  const handleOpenTypePicker = (index: number) => {
    setInsertionIndex(index);
    setIsTypePickerOpen(true);
  };

  return (
    <>
      <div className="space-y-6 max-w-4xl mx-auto pb-24">
        <div className="pt-3">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
            {initialForm ? 'Modifier le formulaire' : 'Créer un formulaire'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {initialForm ? 'Ajustez les détails de votre formulaire.' : 'Commencez à construire votre nouvelle étude.'}
          </p>
        </div>

        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Titre du formulaire</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateFormAndHistory(prev => ({ ...prev, title: e.target.value }))}
                className="mt-1 block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => updateFormAndHistory(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
        </Card>
        
         <div className="space-y-4">
          {form.schema.length === 0 && <Inserter onAdd={() => handleOpenTypePicker(0)} />}
          {form.schema.map((field, index) => {
              const possibleSources = form.schema.slice(0, index).filter(f => f.type === 'choice' || f.type === 'checkbox');
              return (
                   <React.Fragment key={field.id}>
                    <FieldCard 
                      field={field} 
                      index={index} 
                      total={form.schema.length}
                      updateField={updateField}
                      moveField={moveField}
                      removeField={removeField}
                      updateOption={updateOption}
                      addOption={addOption}
                      removeOption={removeOption}
                      moveOption={moveOption}
                      onTypeChange={handleFieldTypeChange}
                      possibleSources={possibleSources}
                    />
                    <Inserter onAdd={() => handleOpenTypePicker(index + 1)} />
                   </React.Fragment>
              )
          })}
        </div>
        
         {isTypePickerOpen && (
           <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={() => setIsTypePickerOpen(false)}>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                  <header className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Ajouter un type de question</h3>
                      <button onClick={() => setIsTypePickerOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                  </header>
                  <main className="p-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {fieldTypes.map(ft => (
                          <button 
                            key={ft.type} 
                            onClick={() => addField(ft.type)}
                            className="text-left p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700 border border-transparent transition-all transform hover:-translate-y-1"
                          >
                            <div className="text-primary-600 dark:text-primary-400">{ft.icon}</div>
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mt-2">{ft.label}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{ft.description}</p>
                          </button>
                        ))}
                      </div>
                  </main>
              </div>
           </div>
        )}
        
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-30 flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.1)]">
            <Button onClick={onCancel} variant="secondary">Annuler</Button>
            <div className="flex items-center space-x-2 pr-20">
                <Button
                    onClick={handleUndo}
                    disabled={history.length === 0}
                    variant="secondary"
                    className="flex items-center"
                    title="Annuler la dernière action"
                >
                    <UndoIcon className="w-5 h-5" />
                    <span className="hidden sm:inline sm:ml-2">Défaire</span>
                </Button>
                <Button onClick={() => onSave(form)} variant="secondary">Enregistrer le brouillon</Button>
                <Button onClick={handleValidateClick}>
                    {isFreeValidation ? "Valider (Gratuit)" : `Valider (${validationCost} Coins)`}
                </Button>
            </div>
        </div>
      </div>
      
      <button
        onClick={() => setIsPreviewOpen(true)}
        className="fixed bottom-24 right-6 z-40 bg-primary-600 text-white rounded-full p-4 shadow-lg hover:bg-primary-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        title="Aperçu du formulaire"
      >
        <EyeIcon className="w-8 h-8" />
      </button>

      {isPreviewOpen && <PreviewModal form={form} onClose={() => setIsPreviewOpen(false)} />}
      {confirmation && <ConfirmationModal {...confirmation} />}
    </>
  );
};

export default FormBuilder;