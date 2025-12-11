import React, { useState, useMemo, useEffect } from 'react';
import { User, Form, FormResponse, PurchasedForm, FormField, SystemSettings } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import CoinIcon from '../components/icons/CoinIcon';
import CheckSquareIcon from '../components/icons/CheckSquareIcon';
import FormsIcon from '../components/icons/FormsIcon';
import Spinner from '../components/Spinner';
import { db } from '../services/firebase';

// --- COMPONENTS ---

interface PurchaseModalProps {
    form: Form;
    realCount: number; 
    currentUser: User;
    onClose: () => void;
    onPurchase: (form: Form, withResponses: boolean) => Promise<boolean | void>;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ form, realCount, currentUser, onClose, onPurchase }) => {
    const [purchaseOption, setPurchaseOption] = useState<'form_only' | 'form_with_responses' | null>(null);
    
    // Use the count passed from parent which comes from the live listener
    const countToUse = realCount; 
    
    const formPrice = form.price || 0;
    const pricePerResponse = form.pricePerResponse || 0;

    const formOnlyCost = formPrice;
    const formWithResponsesCost = formPrice + (countToUse * pricePerResponse);

    const totalCost = purchaseOption === 'form_with_responses' ? formWithResponsesCost : (purchaseOption === 'form_only' ? formOnlyCost : 0);
    const canAfford = currentUser.coinBalance >= totalCost;

    const handleConfirmPurchase = async () => {
        if (!purchaseOption) return;
        
        // CRITICAL: Create a copy of the form with the CORRECT response count.
        // This ensures App.tsx calculates the transaction amount correctly based on the real count.
        const updatedForm = { ...form, responseCount: countToUse };
        
        const success = await onPurchase(updatedForm, purchaseOption === 'form_with_responses');
        if (success) {
            onClose();
        }
    }

    const OptionCard: React.FC<{
        title: string;
        description: string;
        cost: number;
        icon: React.ReactNode;
        isSelected: boolean;
        isRecommended?: boolean;
        onClick: () => void;
        disabled?: boolean;
    }> = ({ title, description, cost, icon, isSelected, isRecommended = false, onClick, disabled = false }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-full text-left p-4 border-2 rounded-lg transition-all duration-200 relative ${
                isSelected 
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md' 
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 hover:border-primary-400 dark:hover:border-primary-500'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {isRecommended && (
                 <span className="absolute -top-2.5 right-3 text-xs font-semibold bg-primary-600 text-white px-2 py-0.5 rounded-full">Recommandé</span>
            )}
            <div className="flex items-start space-x-4">
                <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg ${isSelected ? 'bg-primary-100 dark:bg-primary-900/50' : 'bg-slate-100 dark:bg-slate-700'}`}>
                    <span className={`w-7 h-7 ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {icon}
                    </span>
                </div>
                <div className="flex-grow">
                    <h4 className={`font-bold ${isSelected ? 'text-primary-800 dark:text-primary-200' : 'text-slate-800 dark:text-slate-200'}`}>{title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{description}</p>
                </div>
                <div className="font-bold text-lg text-slate-900 dark:text-white flex items-center">
                    <CoinIcon className="w-5 h-5 mr-1 text-yellow-500" />
                    {cost}
                </div>
            </div>
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Acheter: {form.title}</h3>
                </header>
                <main className="p-6 space-y-4 overflow-y-auto">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Choisissez une option d'achat :</p>
                    
                    <div className="space-y-3">
                        <OptionCard
                            title="Formulaire Seul"
                            description="Obtenez la structure pour y ajouter vos propres réponses."
                            cost={formOnlyCost}
                            icon={<FormsIcon />}
                            isSelected={purchaseOption === 'form_only'}
                            onClick={() => setPurchaseOption('form_only')}
                        />
                         <OptionCard
                            title={`Formulaire + ${countToUse} Réponses`}
                            description="Obtenez la structure ET toutes les réponses pour une analyse IA plus riche."
                            cost={formWithResponsesCost}
                            icon={<CheckSquareIcon />}
                            isSelected={purchaseOption === 'form_with_responses'}
                            onClick={() => setPurchaseOption('form_with_responses')}
                            isRecommended={true}
                            disabled={countToUse === 0}
                        />
                    </div>

                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-300 rounded-r-lg text-xs">
                        L'usage des données achetées est strictement réservé à un but pédagogique. Les réponses sont anonymisées pour protéger la confidentialité.
                    </div>
                </main>
                <footer className="flex flex-col sm:flex-row justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 rounded-b-lg gap-4">
                    <div className="text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Total : </span>
                        {purchaseOption ? (
                             <span className={`font-bold text-lg ml-2 ${canAfford ? 'text-primary-600 dark:text-primary-400' : 'text-red-500'}`}>
                                {totalCost} Coins
                            </span>
                        ) : (
                            <span className="text-slate-500 dark:text-slate-400 italic">Sélectionnez une option</span>
                        )}
                    </div>
                    <div className="flex space-x-3">
                        <Button onClick={onClose} variant="secondary">Annuler</Button>
                        <Button onClick={handleConfirmPurchase} disabled={!canAfford || !purchaseOption}>
                            {canAfford ? 'Confirmer' : 'Solde Insuffisant'}
                        </Button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

const renderFormFieldPreview = (field: FormField, value?: any) => {
    const commonClasses = "mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md disabled:opacity-70 disabled:cursor-not-allowed";
    const radioCheckboxClasses = "h-4 w-4 text-primary-600 border-slate-300 dark:border-slate-500 bg-slate-200 dark:bg-slate-700 disabled:opacity-70 disabled:cursor-not-allowed";
    
    switch (field.type) {
      case 'text': return <input type="text" disabled className={commonClasses} value={value || ''} />;
      case 'textarea': return <textarea rows={2} disabled className={commonClasses} value={value || ''} />;
      case 'number': return <input type="number" disabled className={commonClasses} value={value || ''} />;
      case 'choice':
        return <div className="mt-2 space-y-2">{field.options?.map(option => (<div key={option} className="flex items-center"><input type="radio" checked={value === option} disabled className={radioCheckboxClasses}/><label className="ml-3 block text-sm font-medium text-slate-700 dark:text-slate-300">{option}</label></div>))}</div>;
       case 'checkbox':
        return <div className="mt-2 space-y-2">{field.options?.map(option => (<div key={option} className="flex items-center"><input type="checkbox" checked={Array.isArray(value) && value.includes(option)} disabled className={`${radioCheckboxClasses} rounded`}/><label className="ml-3 block text-sm font-medium text-slate-700 dark:text-slate-300">{option}</label></div>))}</div>;
      case 'date': return <input type="date" disabled className={commonClasses} value={value || ''} />;
      case 'range':
        return <div className="mt-2 flex items-center space-x-4"><span className="text-sm font-medium">{field.min ?? 0}</span><input type="range" min={field.min ?? 0} max={field.max ?? 100} value={value ?? field.min ?? 0} disabled className="w-full h-2 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-not-allowed" /><span className="text-sm font-medium">{field.max ?? 100}</span><span className="ml-2 text-sm font-bold bg-slate-300 dark:bg-slate-600 px-2 py-0.5 rounded">{value ?? '-'}</span></div>;
      case 'note':
        return (
          <div className="mt-6 mb-2 pt-2 border-b border-slate-300 dark:border-slate-600">
            <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-300">{field.label}</h3>
          </div>
        );
      default: return null;
    }
};

const PreviewModal: React.FC<{form: Form; initialTab: 'structure' | 'responses'; onClose: () => void; onPurchaseClick: () => void}> = ({ form, initialTab, onClose, onPurchaseClick }) => {
    const [activeTab, setActiveTab] = useState<'structure' | 'responses'>(initialTab);
    const [sampleResponses, setSampleResponses] = useState<any[]>([]);
    const [selectedResponse, setSelectedResponse] = useState<any | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [previewError, setPreviewError] = useState('');

    useEffect(() => {
        let isMounted = true;
        const fetchPreview = async () => {
            setLoadingPreview(true);
            setPreviewError('');
            try {
                // Fetch up to 3 responses
                const snapshot = await db.collection('responses')
                    .where('formId', '==', form.id)
                    .limit(3)
                    .get();
                
                if (isMounted) {
                    const data = snapshot.docs.map(doc => doc.data());
                    setSampleResponses(data);
                }
            } catch (err) {
                console.error("Failed to load preview responses:", err);
                if (isMounted) setPreviewError("Impossible de charger l'aperçu des réponses.");
            } finally {
                if (isMounted) setLoadingPreview(false);
            }
        };
        fetchPreview();
        return () => { isMounted = false; };
    }, [form.id]);

    return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Aperçu : {form.title}</h3>
        </header>
        
        {/* Navigation Tabs (Only if not viewing a single response detail) */}
        {!selectedResponse && (
            <div className="flex border-b border-slate-200 dark:border-slate-700">
                <button 
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'structure' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50 dark:bg-primary-900/10' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    onClick={() => setActiveTab('structure')}
                >
                    Structure du Formulaire
                </button>
                <button 
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'responses' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50 dark:bg-primary-900/10' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    onClick={() => setActiveTab('responses')}
                >
                    Exemples de Réponses
                </button>
            </div>
        )}

        <main className="p-6 space-y-6 overflow-y-auto">
            {/* VIEW: SINGLE RESPONSE DETAIL */}
            {selectedResponse ? (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <button 
                            onClick={() => setSelectedResponse(null)}
                            className="text-sm text-primary-600 hover:underline flex items-center font-medium"
                        >
                            ← Retour à la liste
                        </button>
                        <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">Aperçu lecture seule</span>
                    </div>
                    <h4 className="text-md font-semibold text-slate-900 dark:text-white mb-4">Détail de la réponse</h4>
                    <div className="space-y-6 border border-slate-200 dark:border-slate-700 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                        {form.schema.map(field => (
                            <div key={field.id}>
                                {field.type !== 'note' && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{field.label}</label>}
                                {renderFormFieldPreview(field, selectedResponse.data[field.id])}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    {/* VIEW: FORM STRUCTURE */}
                    {activeTab === 'structure' && (
                        <>
                            <div>
                                <h4 className="text-md font-semibold text-slate-900 dark:text-white mb-2">Description</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{form.description}</p>
                            </div>
                            <div className="space-y-4 border border-slate-200 dark:border-slate-700 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                {form.schema.map(field => (
                                <div key={field.id}>
                                    {field.type !== 'note' && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{field.label}</label>}
                                    {renderFormFieldPreview(field)}
                                </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* VIEW: RESPONSE LIST */}
                    {activeTab === 'responses' && (
                        <div>
                            {loadingPreview ? (
                                <div className="flex items-center justify-center space-x-2 text-sm text-slate-500 italic p-8">
                                    <Spinner className="w-5 h-5" />
                                    <span>Chargement des exemples...</span>
                                </div>
                            ) : previewError ? (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm rounded-md border border-red-200 dark:border-red-800">
                                    {previewError}
                                </div>
                            ) : sampleResponses.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Cliquez sur une réponse pour voir le formulaire rempli :</p>
                                    {sampleResponses.map((response, idx) => {
                                        const firstAnswerableQuestion = form.schema.find(q => q.type !== 'note');
                                        let firstAnswer: any = null;
                                        if (firstAnswerableQuestion) {
                                            firstAnswer = response.data[firstAnswerableQuestion.id];
                                        }

                                        const displayAnswer = Array.isArray(firstAnswer) 
                                        ? firstAnswer.join(', ') 
                                        : (firstAnswer || '');

                                        return (
                                            <button 
                                                key={idx} 
                                                onClick={() => setSelectedResponse(response)}
                                                className="w-full text-left p-3 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border border-transparent hover:border-primary-300 dark:hover:border-primary-600 transition-all group"
                                            >
                                                <div className="flex justify-between items-center space-x-4">
                                                    <div className="flex-grow min-w-0">
                                                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" title={String(displayAnswer)}>
                                                            {displayAnswer ? String(displayAnswer) : `Exemple #${idx + 1}`}
                                                        </p>
                                                        {firstAnswerableQuestion && displayAnswer && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                            {firstAnswerableQuestion.label}
                                                        </p>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-slate-600 dark:text-slate-300 flex-shrink-0 text-right opacity-70 flex items-center">
                                                        <span>Exemple {idx + 1}</span>
                                                        <svg className="w-4 h-4 ml-2 text-slate-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                    <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded mt-4 border border-dashed border-slate-300 dark:border-slate-700">
                                        (Aperçu limité aux 3 premières réponses. Achetez le formulaire pour tout voir.)
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <p className="text-sm text-slate-500">Aucune réponse trouvée pour le moment.</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </main>
        <footer className="flex justify-end space-x-3 p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 rounded-b-lg">
            <Button onClick={onClose} variant="secondary">Fermer</Button>
            <Button onClick={onPurchaseClick}>Acheter ce formulaire</Button>
        </footer>
      </div>
    </div>
    );
};

// --- Library Form Card (Individual Live Listener) ---

const LibraryFormCard: React.FC<{
    form: Form;
    creator?: User;
    isPurchased: boolean;
    onPreview: (form: Form, tab: 'structure' | 'responses') => void;
    onBuy: (form: Form, realCount: number) => void;
}> = ({ form, creator, isPurchased, onPreview, onBuy }) => {
    const [responseCount, setResponseCount] = useState<number | null>(null);

    // Use a real-time listener for the count.
    useEffect(() => {
        const unsubscribe = db.collection('responses')
            .where('formId', '==', form.id)
            .onSnapshot((snapshot: any) => {
                setResponseCount(snapshot.size);
            }, (error: any) => {
                console.error(`Error fetching count for form ${form.id}`, error);
                setResponseCount(form.responseCount || 0); // Fallback to stale metadata on error
            });

        return () => unsubscribe();
    }, [form.id]);

    const displayCount = responseCount !== null ? responseCount : null;

    return (
        <Card className="flex flex-col !p-0">
            <div className="flex-grow p-4 sm:p-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{form.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 mt-1">{form.description}</p>
                {creator && (<p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Par : <span className="font-medium">{creator.name}</span></p>)}
                <div className="mt-4 flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
                    <button
                        onClick={() => {
                            if (displayCount && displayCount > 0) onPreview(form, 'responses');
                        }}
                        disabled={displayCount === null || displayCount === 0}
                        className={`flex items-center transition-colors duration-200 ${
                            displayCount && displayCount > 0 
                            ? 'text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline cursor-pointer' 
                            : ''
                        }`}
                        title={displayCount && displayCount > 0 ? "Voir un aperçu des réponses" : ""}
                    >
                        {displayCount === null ? (
                            <>
                                <Spinner className="w-3 h-3 mr-2 text-primary-500" />
                                <span className="italic opacity-70">Chargement...</span>
                            </>
                        ) : (
                            `${displayCount} réponses disponibles`
                        )}
                    </button>
                    <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center">
                        <CoinIcon className="w-4 h-4 mr-1 text-yellow-500"/> {form.price}
                    </span>
                </div>
            </div>
            <div className="p-4 sm:p-6 mt-auto border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <Button onClick={() => onPreview(form, 'structure')} variant="secondary" className="w-full" disabled={isPurchased}>
                    {isPurchased ? 'Acheté' : 'Aperçu'}
                </Button>
                <Button 
                    onClick={() => onBuy(form, displayCount || 0)} 
                    className="w-full" 
                    disabled={isPurchased || displayCount === null}
                >
                    Acheter
                </Button>
            </div>
        </Card>
    );
};


// --- Main Library Page ---

interface LibraryProps {
    currentUser: User;
    publicForms: Form[];
    purchasedForms: PurchasedForm[];
    responses: FormResponse[];
    users: User[];
    onPurchase: (form: Form, withResponses: boolean) => Promise<boolean | void>;
    systemSettings: SystemSettings;
}

const Library: React.FC<LibraryProps> = ({ currentUser, publicForms, purchasedForms, responses, users, onPurchase, systemSettings }) => {
    const [filters, setFilters] = useState({ searchTerm: '' });
    const [formToBuy, setFormToBuy] = useState<Form | null>(null);
    const [buyCount, setBuyCount] = useState<number>(0);
    
    // Split preview state for better control
    const [formToPreview, setFormToPreview] = useState<Form | null>(null);
    const [previewTab, setPreviewTab] = useState<'structure' | 'responses'>('structure');

    const purchasedFormIds = useMemo(() => new Set(purchasedForms.map(p => p.formId)), [purchasedForms]);

    const formsForDisplay = useMemo(() => {
        return publicForms
            .filter(form => form.userId !== currentUser.id)
            .filter(form => {
                const term = filters.searchTerm.toLowerCase().trim();
                if (!term) return true;
                const creator = users.find(u => u.id === form.userId);
                return (
                    form.title.toLowerCase().includes(term) ||
                    form.description.toLowerCase().includes(term) ||
                    (creator && creator.name.toLowerCase().includes(term))
                );
            });
    }, [publicForms, filters, currentUser, users]);

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Bibliothèque Publique</h2>
            </div>
            <Card>
                <input
                    name="searchTerm"
                    value={filters.searchTerm}
                    onChange={(e) => setFilters({ searchTerm: e.target.value })}
                    placeholder="Rechercher un formulaire par titre, description, créateur..."
                    className="block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md"
                />
            </Card>

            {formsForDisplay.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {formsForDisplay.map(form => {
                        const creator = users.find(u => u.id === form.userId);
                        return (
                            <LibraryFormCard 
                                key={form.id}
                                form={form}
                                creator={creator}
                                isPurchased={purchasedFormIds.has(form.id)}
                                onPreview={(f, tab) => { setFormToPreview(f); setPreviewTab(tab); }}
                                onBuy={(f, count) => { setFormToBuy(f); setBuyCount(count); }}
                            />
                        )
                    })}
                </div>
            ) : (
                <Card>
                    <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">Aucun formulaire public trouvé</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Aucun formulaire ne correspond à votre recherche, ou aucun étudiant n'a encore publié de formulaire.
                    </p>
                    </div>
                </Card>
            )}

            {formToPreview && (
                <PreviewModal 
                    form={formToPreview} 
                    initialTab={previewTab}
                    onClose={() => setFormToPreview(null)} 
                    onPurchaseClick={() => { 
                        setFormToBuy(formToPreview); 
                        setBuyCount(formToPreview.responseCount || 0); 
                        setFormToPreview(null); 
                    }} 
                />
            )}
            
            {formToBuy && (
                <PurchaseModal 
                    form={formToBuy} 
                    realCount={buyCount}
                    currentUser={currentUser} 
                    onClose={() => setFormToBuy(null)} 
                    onPurchase={onPurchase} 
                />
            )}
        </div>
    );
};

export default Library;