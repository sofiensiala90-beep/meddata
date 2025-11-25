import React, { useState, useEffect } from 'react';
import { User, Form, FormResponse, TransactionType, MedicalField } from '../types';
import Button from './Button';
import ConfirmationModal, { ConfirmationModalProps } from './ConfirmationModal';


// --- Main Student Management Modal ---
interface ModalProps {
    student: User;
    forms: Form[];
    responses: FormResponse[];
    onClose: () => void;
    onSendNotification: (userId: string, message: string) => void;
    onUpdateUserStatus: (userId: string, status: User['status']) => void;
    onAdminCoinAdjustment: (userId: string, amount: number, type: TransactionType) => void;
    onUnvalidateForm: (formId: string) => void;
}

const translateField = (field: MedicalField) => {
  switch (field) {
    case MedicalField.Medicine: return 'Médecine';
    case MedicalField.Pharmacy: return 'Pharmacie';
    case MedicalField.Dentistry: return 'Dentaire';
    case MedicalField.Other: return 'Autre';
    default: return field;
  }
};

const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 ${isActive ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
        {label}
    </button>
);

const StudentManagementModal: React.FC<ModalProps> = ({ student, forms, responses, onClose, onSendNotification, onUpdateUserStatus, onAdminCoinAdjustment, onUnvalidateForm }) => {
    const [activeTab, setActiveTab] = useState('info');
    const [coinAmount, setCoinAmount] = useState<string>('');
    const [notificationMessage, setNotificationMessage] = useState('');
    const [viewingFormResponses, setViewingFormResponses] = useState<Form | null>(null);
    const [confirmation, setConfirmation] = useState<ConfirmationModalProps | null>(null);

    useEffect(() => {
        if (activeTab !== 'forms') {
            setViewingFormResponses(null);
        }
    }, [activeTab]);

    const handleCredit = () => {
        const amount = parseFloat(coinAmount);
        if (isNaN(amount) || amount <= 0) {
            alert("Veuillez entrer un montant positif valide pour créditer.");
            return;
        }

        setConfirmation({
            isOpen: true,
            title: "Confirmation de crédit",
            message: <p>Êtes-vous sûr de vouloir <strong>CRÉDITER {amount} coins</strong> à {student.name} ?</p>,
            onConfirm: () => {
                onAdminCoinAdjustment(student.id, amount, TransactionType.Credit);
                setCoinAmount('');
                setConfirmation(null);
            },
            onClose: () => setConfirmation(null),
            variant: 'primary',
            confirmText: 'Créditer',
        });
    };
    
    const handleDebit = () => {
        const amount = parseFloat(coinAmount);
        if (isNaN(amount) || amount <= 0) {
           alert("Veuillez entrer un montant positif valide pour débiter.");
           return;
       }

       setConfirmation({
            isOpen: true,
            title: "Confirmation de débit",
            message: (
                <>
                    <p>Êtes-vous sûr de vouloir <strong>DÉBITER {amount} coins</strong> du compte de {student.name} ?</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        Nouveau solde potentiel : <span className="font-semibold">{student.coinBalance - amount}</span>
                    </p>
                </>
            ),
            onConfirm: () => {
                onAdminCoinAdjustment(student.id, amount, TransactionType.Debit);
                setCoinAmount('');
                setConfirmation(null);
            },
            onClose: () => setConfirmation(null),
            variant: 'danger',
            confirmText: 'Débiter',
        });
    };

    const handleSuspend = () => {
        setConfirmation({
            isOpen: true,
            title: 'Confirmation de Suspension',
            message: `Êtes-vous sûr de vouloir suspendre le compte de ${student.name} ? Cette action est réversible.`,
            onConfirm: () => {
                onUpdateUserStatus(student.id, 'suspended_manual');
                setConfirmation(null);
            },
            onClose: () => setConfirmation(null),
            variant: 'danger',
            confirmText: 'Suspendre',
        });
    };
    
    const handleReactivate = () => {
        setConfirmation({
            isOpen: true,
            title: 'Confirmation de Réactivation',
            message: `Êtes-vous sûr de vouloir réactiver le compte de ${student.name} ?`,
            onConfirm: () => {
                onUpdateUserStatus(student.id, 'active');
                setConfirmation(null);
            },
            onClose: () => setConfirmation(null),
            variant: 'primary',
            confirmText: 'Réactiver',
        });
    };


    const handleSendNotif = () => {
        if (!notificationMessage.trim()) {
            alert("Le message ne peut pas être vide.");
            return;
        }
        onSendNotification(student.id, notificationMessage);
        setNotificationMessage('');
    };
    
    const handleUnvalidateClick = (formToUnvalidate: Form) => {
        setConfirmation({
            isOpen: true,
            title: "Annuler la validation",
            message: `Êtes-vous sûr de vouloir annuler la validation du formulaire "${formToUnvalidate.title}" ? L'étudiant pourra le modifier à nouveau, et une re-validation gratuite sera accordée. Les réponses existantes seront conservées pour le moment.`,
            onConfirm: () => {
                onUnvalidateForm(formToUnvalidate.id);
                setConfirmation(null);
            },
            onClose: () => setConfirmation(null),
            variant: 'danger',
            confirmText: 'Oui, annuler la validation',
            cancelText: 'Non'
        });
    };

    const renderInfoTab = () => (
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div><dt className="font-medium text-slate-500 dark:text-slate-400">Nom</dt><dd className="mt-1 text-sm text-slate-900 dark:text-white">{student.name}</dd></div>
            <div><dt className="font-medium text-slate-500 dark:text-slate-400">Email</dt><dd className="mt-1 text-sm text-slate-900 dark:text-white">{student.email}</dd></div>
            <div><dt className="font-medium text-slate-500 dark:text-slate-400">Université</dt><dd className="mt-1 text-sm text-slate-900 dark:text-white">{student.university}</dd></div>
            <div><dt className="font-medium text-slate-500 dark:text-slate-400">Filière</dt><dd className="mt-1 text-sm text-slate-900 dark:text-white">{translateField(student.field)} ({student.studyYear}e année)</dd></div>
            <div><dt className="font-medium text-slate-500 dark:text-slate-400">Téléphone</dt><dd className="mt-1 text-sm text-slate-900 dark:text-white">{student.phoneNumber}</dd></div>
            <div><dt className="font-medium text-slate-500 dark:text-slate-400">Membre depuis</dt><dd className="mt-1 text-sm text-slate-900 dark:text-white">{new Date(student.createdAt).toLocaleDateString()}</dd></div>
        </dl>
    );

    const renderFormResponsesView = (form: Form) => {
        const relevantResponses = responses.filter(r => r.formId === form.id);
        return (
            <div className="space-y-4">
                <Button onClick={() => setViewingFormResponses(null)} variant="secondary" className="!py-1 !px-3">← Retour aux formulaires</Button>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Réponses pour : "{form.title}"</h4>
                {relevantResponses.length > 0 ? (
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-700">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Date</th>
                                    {form.schema.map(field => <th key={field.id} className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">{field.label}</th>)}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                {relevantResponses.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(resp => (
                                    <tr key={resp.id}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(resp.createdAt).toLocaleString()}</td>
                                        {form.schema.map(field => <td key={field.id} className="px-4 py-2 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200">{String(resp.data[field.id] ?? 'N/A')}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-8">Aucune réponse n'a été soumise pour ce formulaire.</p>
                )}
            </div>
        );
    };

    const renderFormsTab = () => {
        if (viewingFormResponses) {
            return renderFormResponsesView(viewingFormResponses);
        }
        
        const getStatusText = (status: Form['status']) => {
            switch (status) {
                case 'draft': return 'Brouillon';
                case 'validated': return 'Validé';
                case 'awaiting_modification_decision': return 'En attente de décision';
                default: return 'Inconnu';
            }
        };

        return (
            <div className="space-y-4 max-h-96 overflow-y-auto">
                {forms.length > 0 ? forms.map(form => {
                    const responseCount = responses.filter(r => r.formId === form.id).length;
                    return (
                        <div key={form.id} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                            <div className="flex justify-between items-start">
                                <div className="flex-grow">
                                    <p className="font-semibold text-slate-900 dark:text-white">{form.title}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Statut: {getStatusText(form.status)}</p>
                                </div>
                                <div className="text-right ml-4 flex-shrink-0">
                                    <p className="font-bold text-lg text-slate-900 dark:text-white">{responseCount}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Réponses</p>
                                </div>
                            </div>
                             <div className="mt-2 text-right flex items-center justify-end space-x-2">
                                {form.status === 'validated' && !form.isPublic && (
                                    <Button 
                                        onClick={() => handleUnvalidateClick(form)}
                                        variant="danger"
                                        className="!py-1 !px-3 !text-xs !bg-yellow-500 hover:!bg-yellow-600 !text-white"
                                    >
                                        Annuler la validation
                                    </Button>
                                )}
                                <Button onClick={() => setViewingFormResponses(form)} variant="secondary" className="!py-1 !px-3 !text-xs">Voir les réponses</Button>
                            </div>
                        </div>
                    )
                }) : <p className="text-center text-slate-500 dark:text-slate-400 py-8">Cet étudiant n'a créé aucun formulaire.</p>}
            </div>
        );
    };

    const renderManageTab = () => (
        <div className="space-y-6">
            <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Ajuster les Coins</h4>
                <div className="flex items-center space-x-2">
                    <input 
                        type="number" 
                        value={coinAmount}
                        onChange={(e) => setCoinAmount(e.target.value)}
                        placeholder="Montant" 
                        className="flex-grow shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />
                    <Button onClick={handleCredit}>Créditer</Button>
                    <Button onClick={handleDebit} variant="secondary">Débiter</Button>
                </div>
            </div>
            <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Gérer le compte</h4>
                 
                 {student.status === 'active' && (
                    <>
                        <Button onClick={handleSuspend} variant="danger" className="w-full">
                            Suspendre le compte (Manuel)
                        </Button>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                           La suspension limitera l'accès de l'utilisateur aux fonctionnalités principales.
                        </p>
                    </>
                 )}
                 {student.status === 'suspended_manual' && (
                     <Button onClick={handleReactivate} className="w-full">
                        Réactiver le compte
                    </Button>
                 )}
                 {student.status === 'suspended_payment' && (
                    <div className="text-center p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">Compte suspendu pour non-paiement</p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                            Pour réactiver ce compte, créditez des coins pour couvrir les frais impayés. La réactivation est automatique.
                        </p>
                    </div>
                 )}
            </div>
        </div>
    );

    const renderNotifyTab = () => (
         <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 dark:text-white">Envoyer une notification</h4>
             <textarea 
                rows={4}
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder={`Message pour ${student.name}...`}
                className="w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
             />
             <div className="text-right">
                <Button onClick={handleSendNotif}>Envoyer</Button>
             </div>
        </div>
    );

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <header className="flex-shrink-0 flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{student.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{student.email}</p>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:ring-offset-slate-800">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </header>
                    
                    <nav className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 px-4">
                        <div className="flex space-x-4 overflow-x-auto">
                            <TabButton label="Infos" isActive={activeTab === 'info'} onClick={() => setActiveTab('info')} />
                            <TabButton label="Formulaires" isActive={activeTab === 'forms'} onClick={() => setActiveTab('forms')} />
                            <TabButton label="Gérer" isActive={activeTab === 'manage'} onClick={() => setActiveTab('manage')} />
                            <TabButton label="Notifier" isActive={activeTab === 'notify'} onClick={() => setActiveTab('notify')} />
                        </div>
                    </nav>

                    <main className="p-6 overflow-y-auto">
                        {activeTab === 'info' && renderInfoTab()}
                        {activeTab === 'forms' && renderFormsTab()}
                        {activeTab === 'manage' && renderManageTab()}
                        {activeTab === 'notify' && renderNotifyTab()}
                    </main>
                </div>
            </div>
            {confirmation && <ConfirmationModal {...confirmation} />}
        </>
    );
};

export default StudentManagementModal;