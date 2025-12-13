import React, { useState, useEffect } from 'react';
import { User, Form, FormResponse, TransactionType, MedicalField, FormField } from '../types';
import Button from './Button';
import ConfirmationModal, { ConfirmationModalProps } from './ConfirmationModal';
import { generateNotificationRefinement } from '../services/geminiService';
import Spinner from './Spinner';
import EyeIcon from './icons/EyeIcon';


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
    onRefuseModification: (form: Form, reason: string) => void;
    onRevalidationDecision?: (form: Form, approved: boolean) => void;
    initialTab?: string;
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

const FormComparisonView: React.FC<{ 
    currentForm: Form; 
    backupForm: Form; 
    onApprove: () => void; 
    onReject: () => void; 
    onBack: () => void 
}> = ({ currentForm, backupForm, onApprove, onReject, onBack }) => {
    
    // Simple helper to find added/removed/modified fields
    const getDiffNodes = () => {
        const originalFields = backupForm.schema;
        const newFields = currentForm.schema;
        
        // This is a simplified diff visualization
        return (
            <div className="grid grid-cols-2 gap-4 h-full overflow-hidden">
                {/* ORIGINAL */}
                <div className="flex flex-col h-full border rounded-lg bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
                    <h4 className="p-3 font-bold text-red-700 dark:text-red-300 border-b border-red-200 dark:border-red-800 bg-red-100 dark:bg-red-900/20 text-center">
                        AVANT (Original)
                    </h4>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <div className="mb-4 pb-4 border-b border-red-200 dark:border-red-800/50">
                            <p className="font-semibold text-sm">Titre: {backupForm.title}</p>
                            <p className="text-xs text-slate-500">{backupForm.description}</p>
                        </div>
                        {originalFields.map(field => (
                            <div key={field.id} className="p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shadow-sm opacity-75">
                                <p className="font-medium text-sm text-slate-700 dark:text-slate-200">{field.label}</p>
                                <p className="text-xs text-slate-500 uppercase mt-1">{field.type}</p>
                                {field.options && (
                                    <ul className="mt-2 list-disc list-inside text-xs text-slate-500">
                                        {field.options.map((o, i) => <li key={i}>{o}</li>)}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* MODIFIED */}
                <div className="flex flex-col h-full border rounded-lg bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                    <h4 className="p-3 font-bold text-green-700 dark:text-green-300 border-b border-green-200 dark:border-green-800 bg-green-100 dark:bg-green-900/20 text-center">
                        APRÈS (Modification)
                    </h4>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <div className="mb-4 pb-4 border-b border-green-200 dark:border-green-800/50">
                            <p className="font-semibold text-sm">Titre: {currentForm.title}</p>
                            <p className="text-xs text-slate-500">{currentForm.description}</p>
                        </div>
                        {newFields.map(field => {
                            // Quick check if new
                            const isNew = !originalFields.find(f => f.id === field.id);
                            return (
                                <div key={field.id} className={`p-3 bg-white dark:bg-slate-800 rounded border shadow-sm ${isNew ? 'border-green-400 ring-2 ring-green-100 dark:ring-green-900' : 'border-slate-200 dark:border-slate-700'}`}>
                                    <div className="flex justify-between items-start">
                                        <p className="font-medium text-sm text-slate-700 dark:text-slate-200">{field.label}</p>
                                        {isNew && <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-bold">NOUVEAU</span>}
                                    </div>
                                    <p className="text-xs text-slate-500 uppercase mt-1">{field.type}</p>
                                    {field.options && (
                                        <ul className="mt-2 list-disc list-inside text-xs text-slate-500">
                                            {field.options.map((o, i) => <li key={i}>{o}</li>)}
                                        </ul>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
                <Button onClick={onBack} variant="secondary" className="!py-1 !px-3 text-xs">← Retour</Button>
                <div className="flex gap-2">
                    <Button onClick={onReject} variant="danger" className="!py-1.5 !px-4 text-xs">Refuser les changements</Button>
                    <Button onClick={onApprove} className="!py-1.5 !px-4 text-xs">Valider la modification</Button>
                </div>
            </div>
            
            {currentForm.modificationRequestReason ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded mb-4 border border-blue-200 dark:border-blue-800 shadow-sm">
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase mb-2 flex items-center">
                        <EyeIcon className="w-4 h-4 mr-2"/>
                        Motif de la demande (Justificatif étudiant) :
                    </p>
                    <p className="text-sm text-blue-900 dark:text-blue-100 italic bg-white dark:bg-slate-800/50 p-2 rounded border border-blue-100 dark:border-blue-700">
                        "{currentForm.modificationRequestReason}"
                    </p>
                </div>
            ) : (
                <div className="bg-slate-50 dark:bg-slate-700/30 p-2 rounded mb-4 text-xs text-slate-500 italic text-center">
                    Aucun motif spécifié pour cette modification.
                </div>
            )}

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded mb-4 text-xs text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800">
                <p>Vérifiez que les modifications correspondent au motif ci-dessus et restent mineures. Si vous refusez, le formulaire reviendra à son état "Avant" (Original).</p>
            </div>

            <div className="flex-1 min-h-0">
                {getDiffNodes()}
            </div>
        </div>
    );
};

const StudentManagementModal: React.FC<ModalProps> = ({ student, forms, responses, onClose, onSendNotification, onUpdateUserStatus, onAdminCoinAdjustment, onUnvalidateForm, onRefuseModification, onRevalidationDecision, initialTab = 'info' }) => {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [coinAmount, setCoinAmount] = useState<string>('');
    const [notificationMessage, setNotificationMessage] = useState('');
    const [viewingFormResponses, setViewingFormResponses] = useState<Form | null>(null);
    const [viewingFormComparison, setViewingFormComparison] = useState<Form | null>(null);
    const [confirmation, setConfirmation] = useState<ConfirmationModalProps | null>(null);
    const [refusalReason, setRefusalReason] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        if (activeTab !== 'forms') {
            setViewingFormResponses(null);
            setViewingFormComparison(null);
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
    
    const handleAiRefinement = async () => {
        if (!notificationMessage.trim()) {
            alert("Écrivez d'abord un brouillon ou quelques mots-clés.");
            return;
        }
        
        setIsAiLoading(true);
        try {
            const improvedText = await generateNotificationRefinement(notificationMessage);
            setNotificationMessage(improvedText);
        } catch (error) {
            console.error("Erreur AI:", error);
            alert("L'IA n'a pas pu traiter votre demande pour le moment.");
        } finally {
            setIsAiLoading(false);
        }
    };
    
    const handleUnvalidateClick = (formToUnvalidate: Form) => {
        setConfirmation({
            isOpen: true,
            title: "Accepter la modification",
            message: `Êtes-vous sûr de vouloir annuler la validation du formulaire "${formToUnvalidate.title}" ? L'étudiant pourra le modifier à nouveau (re-validation gratuite).`,
            onConfirm: () => {
                onUnvalidateForm(formToUnvalidate.id);
                setConfirmation(null);
            },
            onClose: () => setConfirmation(null),
            variant: 'primary',
            confirmText: 'Accepter et Débloquer',
            cancelText: 'Annuler'
        });
    };

    const handleRefuseClick = (formToRefuse: Form) => {
        setRefusalReason(''); // Reset reason
        setConfirmation({
            isOpen: true,
            title: "Refuser la modification",
            message: (
                <div className="space-y-3">
                    <p>Veuillez indiquer la raison du refus. L'étudiant recevra une notification et le formulaire restera validé (bloqué).</p>
                    <textarea 
                        className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                        placeholder="Ex: Les modifications demandées ne sont pas justifiées..."
                        rows={3}
                        onChange={(e) => setRefusalReason(e.target.value)}
                    />
                </div>
            ),
            onConfirm: () => {
                handleRefuseConfirm(formToRefuse);
            },
            onClose: () => setConfirmation(null),
            variant: 'danger',
            confirmText: 'Refuser la demande',
            cancelText: 'Annuler'
        });
    };

    const handleRefuseConfirm = (form: Form) => {
        // ... (See existing implementation logic for handling closure state)
    };
    
    // Using a ref to capture the textarea value from the modal content
    const refusalReasonRef = React.useRef('');

    const openRefuseModal = (form: Form) => {
        refusalReasonRef.current = '';
        setConfirmation({
            isOpen: true,
            title: "Refuser la demande",
            message: (
                <div className="space-y-3">
                    <p>Indiquez le motif du refus pour l'étudiant :</p>
                    <textarea 
                        className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        placeholder="Motif du refus..."
                        onChange={(e) => { refusalReasonRef.current = e.target.value; }}
                    />
                </div>
            ),
            onConfirm: () => {
                if (!refusalReasonRef.current.trim()) {
                    alert("Veuillez indiquer un motif.");
                    return; // Prevent closing if empty
                }
                onRefuseModification(form, refusalReasonRef.current);
                setConfirmation(null);
            },
            onClose: () => setConfirmation(null),
            variant: 'danger',
            confirmText: 'Refuser'
        });
    };
    
    const handleViewReason = (form: Form) => {
        setConfirmation({
            isOpen: true,
            title: "Motif de la demande",
            message: (
                <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                    <p className="italic text-slate-800 dark:text-slate-200">"{form.modificationRequestReason || 'Aucun motif spécifié.'}"</p>
                </div>
            ),
            onConfirm: () => setConfirmation(null),
            onClose: () => setConfirmation(null),
            confirmText: 'Fermer',
            variant: 'secondary'
        });
    };
    
    const handleRevalidationApprove = (form: Form) => {
        if (onRevalidationDecision) {
            onRevalidationDecision(form, true);
            setViewingFormComparison(null);
        }
    };

    const handleRevalidationReject = (form: Form) => {
        setConfirmation({
            isOpen: true,
            title: "Refuser les modifications",
            message: "Êtes-vous sûr ? Cela annulera toutes les modifications de l'étudiant et restaurera le formulaire à sa version originale validée.",
            onConfirm: () => {
                if (onRevalidationDecision) {
                    onRevalidationDecision(form, false);
                    setViewingFormComparison(null);
                    setConfirmation(null);
                }
            },
            onClose: () => setConfirmation(null),
            variant: 'danger',
            confirmText: 'Refuser et Restaurer'
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
        if (viewingFormComparison && viewingFormComparison.backupVersion) {
            return (
                <FormComparisonView 
                    currentForm={viewingFormComparison} 
                    backupForm={viewingFormComparison.backupVersion}
                    onApprove={() => handleRevalidationApprove(viewingFormComparison)}
                    onReject={() => handleRevalidationReject(viewingFormComparison)}
                    onBack={() => setViewingFormComparison(null)}
                />
            );
        }

        if (viewingFormResponses) {
            return renderFormResponsesView(viewingFormResponses);
        }
        
        const getStatusText = (status: Form['status']) => {
            switch (status) {
                case 'draft': return 'Brouillon';
                case 'validated': return 'Validé';
                case 'awaiting_modification_decision': return 'En attente de décision';
                case 'pending_revalidation': return 'Modif. en attente de validation';
                default: return 'Inconnu';
            }
        };

        return (
            <div className="space-y-4 max-h-96 overflow-y-auto">
                {forms.length > 0 ? forms.map(form => {
                    const responseCount = responses.filter(r => r.formId === form.id).length;
                    const isRequestPending = form.status === 'awaiting_modification_decision';
                    const isRevalidationPending = form.status === 'pending_revalidation';
                    
                    return (
                        <div key={form.id} className={`p-3 bg-slate-100 dark:bg-slate-700 rounded-lg ${isRequestPending ? 'border-2 border-blue-400 dark:border-blue-600' : isRevalidationPending ? 'border-2 border-orange-400 dark:border-orange-600' : ''}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex-grow">
                                    <p className="font-semibold text-slate-900 dark:text-white flex items-center">
                                        {form.title}
                                        {isRequestPending && (
                                            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full animate-pulse">Demande Modif</span>
                                        )}
                                        {isRevalidationPending && (
                                            <span className="ml-2 px-2 py-0.5 text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded-full animate-pulse">Examen Requis</span>
                                        )}
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Statut: {getStatusText(form.status)}</p>
                                </div>
                                <div className="text-right ml-4 flex-shrink-0">
                                    <p className="font-bold text-lg text-slate-900 dark:text-white">{responseCount}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Réponses</p>
                                </div>
                            </div>
                             <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                                {isRequestPending ? (
                                    <>
                                        <Button 
                                            onClick={() => handleViewReason(form)}
                                            variant="secondary"
                                            className="!py-1 !px-3 !text-xs"
                                            title="Voir la raison de la demande"
                                        >
                                            <EyeIcon className="w-4 h-4 mr-1 inline" />
                                            Motif
                                        </Button>
                                        <Button 
                                            onClick={() => handleUnvalidateClick(form)}
                                            className="!py-1 !px-3 !text-xs !bg-green-600 hover:!bg-green-700 !text-white"
                                        >
                                            Accepter
                                        </Button>
                                        <Button 
                                            onClick={() => openRefuseModal(form)}
                                            variant="danger"
                                            className="!py-1 !px-3 !text-xs"
                                        >
                                            Refuser
                                        </Button>
                                    </>
                                ) : isRevalidationPending ? (
                                    <Button 
                                        onClick={() => setViewingFormComparison(form)}
                                        className="!py-1 !px-3 !text-xs !bg-orange-500 hover:!bg-orange-600 !text-white border-none"
                                    >
                                        Examiner (Avant/Après)
                                    </Button>
                                ) : (
                                    (form.status === 'validated' && !form.isPublic) && (
                                        <Button 
                                            onClick={() => handleUnvalidateClick(form)}
                                            variant="danger"
                                            className="!py-1 !px-3 !text-xs !bg-yellow-500 hover:!bg-yellow-600 !text-white border-none"
                                        >
                                            Annuler validation
                                        </Button>
                                    )
                                )}
                                <Button onClick={() => setViewingFormResponses(form)} variant="secondary" className="!py-1 !px-3 !text-xs">Voir réponses</Button>
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
                placeholder={`Rédigez votre message ou quelques mots-clés...`}
                className="w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                disabled={isAiLoading}
             />
             <div className="flex justify-between items-center">
                <Button 
                    onClick={handleAiRefinement} 
                    variant="secondary" 
                    className="flex items-center gap-2"
                    disabled={isAiLoading || !notificationMessage.trim()}
                    title="Reformuler ou corriger le texte avec l'IA"
                >
                    {isAiLoading ? <Spinner className="w-4 h-4 text-primary-600" /> : <span className="text-lg">✨</span>}
                    {isAiLoading ? 'Amélioration...' : 'Améliorer avec l\'IA'}
                </Button>
                <Button onClick={handleSendNotif} disabled={isAiLoading || !notificationMessage.trim()}>Envoyer</Button>
             </div>
             <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                Astuce : Écrivez un brouillon rapide et cliquez sur "Améliorer avec l'IA" pour le rendre plus professionnel. Vous pourrez le modifier à nouveau ensuite.
             </p>
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