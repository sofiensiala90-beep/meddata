import React, { useState, useMemo } from 'react';
import { User, Form, FormResponse, PurchasedForm, FormField } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import CoinIcon from '../components/icons/CoinIcon';
import CheckSquareIcon from '../components/icons/CheckSquareIcon';
import FormsIcon from '../components/icons/FormsIcon';

interface PurchaseModalProps {
    form: Form;
    responseCount: number;
    currentUser: User;
    onClose: () => void;
    onPurchase: (form: Form, withResponses: boolean) => boolean | void;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ form, responseCount, currentUser, onClose, onPurchase }) => {
    const [purchaseOption, setPurchaseOption] = useState<'form_only' | 'form_with_responses' | null>(null);

    const formOnlyCost = form.price;
    const formWithResponsesCost = form.price + (responseCount * form.pricePerResponse);

    const totalCost = purchaseOption === 'form_with_responses' ? formWithResponsesCost : (purchaseOption === 'form_only' ? formOnlyCost : 0);
    const canAfford = currentUser.coinBalance >= totalCost;

    const handleConfirmPurchase = () => {
        if (!purchaseOption) return;
        const success = onPurchase(form, purchaseOption === 'form_with_responses');
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
                            title={`Formulaire + ${responseCount} Réponses`}
                            description="Obtenez la structure ET toutes les réponses pour une analyse IA plus riche."
                            cost={formWithResponsesCost}
                            icon={<CheckSquareIcon />}
                            isSelected={purchaseOption === 'form_with_responses'}
                            onClick={() => setPurchaseOption('form_with_responses')}
                            isRecommended={true}
                            disabled={responseCount === 0}
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

const PreviewModal: React.FC<{form: Form; onClose: () => void; onPurchaseClick: () => void}> = ({ form, onClose, onPurchaseClick }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Aperçu : {form.title}</h3>
        </header>
        <main className="p-6 space-y-4 overflow-y-auto">
            <p className="mb-4 text-slate-600 dark:text-slate-400">{form.description}</p>
            <div className="space-y-6">
            {form.schema.map(field => (
              <div key={field.id}>
                {field.type !== 'note' && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{field.label}</label>}
                {renderFormFieldPreview(field)}
              </div>
            ))}
          </div>
        </main>
        <footer className="flex justify-end space-x-3 p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 rounded-b-lg">
            <Button onClick={onClose} variant="secondary">Fermer</Button>
            <Button onClick={onPurchaseClick}>Acheter ce formulaire</Button>
        </footer>
      </div>
    </div>
);


interface LibraryProps {
    currentUser: User;
    publicForms: Form[];
    purchasedForms: PurchasedForm[];
    responses: FormResponse[];
    users: User[];
    onPurchase: (form: Form, withResponses: boolean) => boolean | void;
}

const Library: React.FC<LibraryProps> = ({ currentUser, publicForms, purchasedForms, responses, users, onPurchase }) => {
    const [filters, setFilters] = useState({ searchTerm: '' });
    const [formToBuy, setFormToBuy] = useState<Form | null>(null);
    const [formToPreview, setFormToPreview] = useState<Form | null>(null);

    const purchasedFormIds = useMemo(() => new Set(purchasedForms.map(p => p.formId)), [purchasedForms]);

    const formsForDisplay = useMemo(() => {
        return publicForms
            .filter(form => form.userId !== currentUser.id) // Don't show user's own forms
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
                        const responseCount = responses.filter(r => r.formId === form.id).length;
                        const isPurchased = purchasedFormIds.has(form.id);
                        return (
                            <Card key={form.id} className="flex flex-col !p-0">
                                <div className="flex-grow p-4 sm:p-6">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{form.title}</h3>
                                    <p className="text-slate-600 dark:text-slate-400 mt-1">{form.description}</p>
                                    {creator && (<p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Par : <span className="font-medium">{creator.name}</span></p>)}
                                    <div className="mt-4 flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
                                        <span>{responseCount} réponses disponibles</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center">
                                            <CoinIcon className="w-4 h-4 mr-1 text-yellow-500"/> {form.price}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4 sm:p-6 mt-auto border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                                    <Button onClick={() => setFormToPreview(form)} variant="secondary" className="w-full" disabled={isPurchased}>
                                        {isPurchased ? 'Acheté' : 'Aperçu'}
                                    </Button>
                                    <Button onClick={() => setFormToBuy(form)} className="w-full" disabled={isPurchased}>
                                        Acheter
                                    </Button>
                                </div>
                            </Card>
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

            {formToPreview && <PreviewModal form={formToPreview} onClose={() => setFormToPreview(null)} onPurchaseClick={() => { setFormToBuy(formToPreview); setFormToPreview(null); }} />}
            {formToBuy && <PurchaseModal form={formToBuy} responseCount={responses.filter(r => r.formId === formToBuy.id).length} currentUser={currentUser} onClose={() => setFormToBuy(null)} onPurchase={onPurchase} />}
        </div>
    );
};

export default Library;
