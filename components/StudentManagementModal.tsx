
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
    <button onClick={onClick} className={`px-4 py-2 text-sm font-black border-b-2 transition-colors duration-200 uppercase tracking-tight ${isActive ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}>
        {label}
    </button>
);

const DiffBadge: React.FC<{ type: 'added' | 'removed' | 'modified' | 'unchanged' }> = ({ type }) => {
    switch (type) {
        case 'added': return <span className="text-[9px] bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">+ Nouveau</span>;
        case 'removed': return <span className="text-[9px] bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">- Supprimé</span>;
        case 'modified': return <span className="text-[9px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Δ Modifié</span>;
        default: return <span className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Identique</span>;
    }
};

const FormComparisonView: React.FC<{ 
    currentForm: Form; 
    backupForm: Form | undefined; 
    onApprove: () => void; 
    onReject: () => void; 
    onBack: () => void 
}> = ({ currentForm, backupForm, onApprove, onReject, onBack }) => {
    
    const renderOptions = (options: string[] | undefined, status: 'added' | 'removed' | 'modified' | 'unchanged') => {
        if (!options || options.length === 0) return null;
        return (
            <div className="mt-3 space-y-1.5 pl-3 border-l-2 border-slate-100 dark:border-slate-700/50">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Choix possibles :</p>
                {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                        <span className={`text-xs font-medium ${status === 'removed' ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                            {opt}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    const renderFieldCard = (field: FormField, status: 'added' | 'removed' | 'modified' | 'unchanged', originalField?: FormField) => {
        const isModified = status === 'modified' && originalField;
        
        return (
            <div className={`p-5 rounded-3xl border-2 transition-all shadow-sm ${
                status === 'added' ? 'border-green-400 bg-green-50/10' :
                status === 'removed' ? 'border-red-300 bg-red-50/10 grayscale opacity-70' :
                status === 'modified' ? 'border-blue-400 bg-blue-50/10' :
                'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800'
            }`}>
                <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question</span>
                    <DiffBadge type={status} />
                </div>
                
                {/* Libellé avec mise en avant du changement */}
                <div className="space-y-1">
                    {isModified && originalField.label !== field.label && (
                        <p className="text-[10px] text-red-500 line-through font-bold decoration-2 opacity-60 mb-1">{originalField.label}</p>
                    )}
                    <p className={`font-black text-sm leading-snug ${status === 'removed' ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
                        {field.label}
                    </p>
                </div>

                {/* Type de champ */}
                <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-lg font-bold uppercase tracking-wider text-slate-500">
                        {isModified && originalField.type !== field.type && (
                            <span className="text-red-400 line-through mr-1 decoration-1">{originalField.type} →</span>
                        )}
                        {field.type}
                    </span>
                </div>

                {/* Options de réponse */}
                {renderOptions(field.options, status)}
            </div>
        );
    };

    const originalFields = backupForm?.schema || [];
    const newFields = currentForm.schema;

    return (
        <div className="flex flex-col h-full space-y-6 animate-fade-in">
            {/* Header d'action fixe */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-900/20 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                <button onClick={onBack} className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary-600 flex items-center gap-2 group transition-all">
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> Retour aux formulaires
                </button>
                <div className="flex gap-3">
                    <Button onClick={onReject} variant="danger" className="!py-2 !px-6 text-xs font-black uppercase tracking-widest shadow-xl shadow-red-500/10">Refuser</Button>
                    <Button onClick={onApprove} className="!py-2 !px-6 text-xs font-black uppercase tracking-widest shadow-xl shadow-primary-500/20">Valider ces modifications</Button>
                </div>
            </div>
            
            {/* Motif (Justificatif) */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-400 p-[1.5px] rounded-[2.5rem] shadow-xl shadow-primary-500/5">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.4rem]">
                    <h4 className="text-[10px] font-black text-primary-500 uppercase tracking-[0.3em] mb-2">Justificatif de l'étudiant</h4>
                    <p className="text-slate-700 dark:text-slate-100 italic font-bold text-lg leading-relaxed">
                        "{currentForm.modificationRequestReason || "Aucun motif fourni."}"
                    </p>
                </div>
            </div>

            {/* Zone de comparaison côte à côte */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-hidden min-h-0">
                {/* COLONNE GAUCHE : AVANT (ORIGINAL) */}
                <div className="flex flex-col border-2 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 overflow-hidden shadow-inner">
                    <div className="p-5 font-black text-slate-500 border-b-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-[10px] uppercase tracking-[0.2em] flex justify-between items-center">
                        <span>VERSION ACTUELLE</span>
                        <span className="bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full">{originalFields.length} Q.</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                        {originalFields.map((field) => {
                            const stillExists = newFields.some(f => f.id === field.id);
                            return <div key={field.id}>{renderFieldCard(field, stillExists ? 'unchanged' : 'removed')}</div>;
                        })}
                        {originalFields.length === 0 && <p className="text-center italic text-slate-400 py-20 font-bold uppercase tracking-widest text-xs">Formulaire initial vide</p>}
                    </div>
                </div>

                {/* COLONNE DROITE : APRES (NOUVELLE PROPOSITION) */}
                <div className="flex flex-col border-2 rounded-[2.5rem] bg-primary-50/20 dark:bg-primary-900/10 border-primary-200 dark:border-primary-900/40 overflow-hidden shadow-2xl shadow-primary-500/5">
                    <div className="p-5 font-black text-primary-600 border-b-2 border-primary-100 dark:border-primary-900/30 bg-primary-100/50 dark:bg-primary-900/30 text-[10px] uppercase tracking-[0.2em] flex justify-between items-center">
                        <span>NOUVELLE STRUCTURE</span>
                        <span className="bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full text-primary-600">{newFields.length} Q.</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                        {newFields.map((field) => {
                            const original = originalFields.find(f => f.id === field.id);
                            const status = !original ? 'added' : 
                                           (original.label !== field.label || original.type !== field.type || JSON.stringify(original.options) !== JSON.stringify(field.options)) 
                                           ? 'modified' : 'unchanged';
                            return <div key={field.id}>{renderFieldCard(field, status, original)}</div>;
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StudentManagementModal: React.FC<ModalProps> = ({ student, forms, responses, onClose, onSendNotification, onUpdateUserStatus, onAdminCoinAdjustment, onUnvalidateForm, onRefuseModification, onRevalidationDecision, initialTab = 'info' }) => {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [coinAmount, setCoinAmount] = useState<string>('');
    const [notificationMessage, setNotificationMessage] = useState('');
    const [viewingFormResponses, setViewingFormResponses] = useState<Form | null>(null);
    const [selectedResponseDetail, setSelectedResponseDetail] = useState<FormResponse | null>(null);
    const [viewingFormComparison, setViewingFormComparison] = useState<Form | null>(null);
    const [confirmation, setConfirmation] = useState<ConfirmationModalProps | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        if (activeTab !== 'forms') {
            setViewingFormResponses(null);
            setViewingFormComparison(null);
            setSelectedResponseDetail(null);
        }
    }, [activeTab]);

    const handleCredit = () => {
        const amount = parseFloat(coinAmount);
        if (isNaN(amount) || amount <= 0) return;
        onAdminCoinAdjustment(student.id, amount, TransactionType.Credit);
        setCoinAmount('');
    };
    
    const handleDebit = () => {
        const amount = parseFloat(coinAmount);
        if (isNaN(amount) || amount <= 0) return;
        onAdminCoinAdjustment(student.id, amount, TransactionType.Debit);
        setCoinAmount('');
    };

    const handleSendNotif = () => {
        if (!notificationMessage.trim()) return;
        onSendNotification(student.id, notificationMessage);
        setNotificationMessage('');
    };
    
    const handleAiRefinement = async () => {
        if (!notificationMessage.trim()) return;
        setIsAiLoading(true);
        try {
            const improvedText = await generateNotificationRefinement(notificationMessage);
            setNotificationMessage(improvedText);
        } catch (error) {
            console.error("AI Error:", error);
        } finally {
            setIsAiLoading(false);
        }
    };
    
    const handleUnvalidateClick = (formToUnvalidate: Form) => {
        setConfirmation({
            isOpen: true,
            title: "Accepter la modification",
            message: `Autoriser l'étudiant à modifier "${formToUnvalidate.title}" ?`,
            onConfirm: () => {
                onUnvalidateForm(formToUnvalidate.id);
                setConfirmation(null);
            },
            onClose: () => setConfirmation(null),
            variant: 'primary',
            confirmText: 'Autoriser'
        });
    };

    const openRefuseModal = (form: Form) => {
        let reason = "";
        setConfirmation({
            isOpen: true,
            title: "Refuser la demande",
            message: (
                <textarea 
                    className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold"
                    placeholder="Précisez le motif du refus ici..."
                    rows={4}
                    onChange={(e) => { reason = e.target.value; }}
                />
            ),
            onConfirm: () => {
                if (!reason.trim()) return;
                onRefuseModification(form, reason);
                setConfirmation(null);
            },
            onClose: () => setConfirmation(null),
            variant: 'danger',
            confirmText: 'Confirmer le refus'
        });
    };
    
    const handleRevalidationApprove = (form: Form) => {
        if (onRevalidationDecision) {
            onRevalidationDecision(form, true);
            setViewingFormComparison(null);
        }
    };

    const handleRevalidationReject = (form: Form) => {
        if (onRevalidationDecision) {
            onRevalidationDecision(form, false);
            setViewingFormComparison(null);
        }
    };

    const renderInfoTab = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
                { label: "Nom complet", value: student.name },
                { label: "Email", value: student.email },
                { label: "Université", value: student.university },
                { label: "Filière", value: `${translateField(student.field)} (${student.studyYear}e année)` },
                { label: "Téléphone", value: student.phoneNumber },
                { label: "Inscrit le", value: new Date(student.createdAt).toLocaleDateString() }
            ].map((item, i) => (
                <div key={i} className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white leading-tight">{item.value}</p>
                </div>
            ))}
        </div>
    );

    const renderResponseDetail = (form: Form, response: FormResponse) => (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                <button onClick={() => setSelectedResponseDetail(null)} className="text-xs font-black uppercase text-primary-600 hover:underline">← Revenir aux réponses</button>
                <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">Détail complet</span>
            </div>
            <div className="space-y-4">
                {form.schema.filter(f => f.type !== 'note').map(field => (
                    <div key={field.id} className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">{field.label}</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {Array.isArray(response.data[field.id]) ? response.data[field.id].join(', ') : (String(response.data[field.id] ?? 'Non renseigné'))}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderFormsTab = () => {
        if (viewingFormComparison) {
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
            if (selectedResponseDetail) return renderResponseDetail(viewingFormResponses, selectedResponseDetail);

            const relevantResponses = responses.filter(r => r.formId === viewingFormResponses.id);
            return (
                <div className="space-y-4">
                    <button onClick={() => setViewingFormResponses(null)} className="text-xs font-black uppercase text-primary-600">← Liste des formulaires</button>
                    <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">Réponses pour : {viewingFormResponses.title}</h4>
                    {relevantResponses.length > 0 ? (
                        <div className="overflow-x-auto border-2 border-slate-100 dark:border-slate-700 rounded-[2.5rem]">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-xs">
                                <thead className="bg-slate-100 dark:bg-slate-800">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-black text-slate-500 uppercase tracking-widest">Date de soumission</th>
                                        <th className="px-6 py-4 text-right font-black text-slate-500 uppercase tracking-widest">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                                    {relevantResponses.map(r => (
                                        <tr key={r.id} className="hover:bg-primary-50/30 cursor-pointer transition-colors" onClick={() => setSelectedResponseDetail(r)}>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-bold">{new Date(r.createdAt).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-primary-600 font-black uppercase text-[9px]">Détail de la réponse</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <p className="text-center py-20 text-slate-400 italic font-bold uppercase tracking-widest text-xs">Aucune donnée collectée</p>}
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {forms.map(form => {
                    const isRequest = form.status === 'awaiting_modification_decision';
                    const isReview = form.status === 'pending_revalidation';
                    
                    return (
                        <div key={form.id} className={`p-6 bg-white dark:bg-slate-800 rounded-[2.5rem] border-2 transition-all hover:shadow-2xl group ${
                            isRequest ? 'border-blue-400 bg-blue-50/5 shadow-blue-500/5' : isReview ? 'border-orange-400 bg-orange-50/5 shadow-orange-500/5' : 'border-slate-100 dark:border-slate-700'
                        }`}>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                                <div className="flex-1 min-w-0">
                                    <h5 className="font-black text-slate-800 dark:text-white text-xl truncate group-hover:text-primary-600 transition-colors leading-tight">{form.title}</h5>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border-2 ${
                                            isRequest ? 'bg-blue-100 text-blue-700 border-blue-200' : isReview ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                                        }`}>
                                            {form.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    {isRequest ? (
                                        <>
                                            <Button onClick={() => handleUnvalidateClick(form)} className="!py-2 !px-5 !text-[10px] font-black uppercase tracking-widest !bg-green-600 hover:!bg-green-700 shadow-lg shadow-green-500/20">Accepter</Button>
                                            <Button onClick={() => openRefuseModal(form)} variant="danger" className="!py-2 !px-5 !text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20">Refuser</Button>
                                        </>
                                    ) : isReview ? (
                                        <Button onClick={() => setViewingFormComparison(form)} className="!py-2 !px-6 !text-[10px] font-black uppercase tracking-widest !bg-orange-500 !text-white !border-none shadow-lg shadow-orange-500/20">Examiner</Button>
                                    ) : null}
                                    <Button onClick={() => setViewingFormResponses(form)} variant="secondary" className="!py-2 !px-5 !text-[10px] font-black uppercase tracking-widest">Voir Réponses</Button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {forms.length === 0 && <p className="text-center py-20 text-slate-400 font-bold italic bg-slate-50 dark:bg-slate-900/30 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 uppercase tracking-widest text-xs">Aucun formulaire</p>}
            </div>
        );
    };

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex justify-center items-center z-50 p-4" onClick={onClose}>
                <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden animate-scale-up" onClick={e => e.stopPropagation()}>
                    <header className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/10">
                        <div className="flex items-center space-x-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-primary-600 to-primary-500 text-white rounded-[2rem] flex items-center justify-center font-black text-3xl shadow-xl shadow-primary-600/30 transform -rotate-3">{student.name.charAt(0)}</div>
                            <div>
                                <h3 className="text-3xl font-black text-slate-800 dark:text-white leading-none tracking-tighter">{student.name}</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-3">
                                    <span className="text-primary-600 dark:text-primary-400">{student.coinBalance.toLocaleString()} Coins</span>
                                    <span className="text-slate-300">|</span>
                                    <span className="truncate max-w-[250px]">{student.email}</span>
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-3xl transition-all">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </header>
                    
                    <nav className="flex px-8 bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                        <TabButton label="Profil" isActive={activeTab === 'info'} onClick={() => setActiveTab('info')} />
                        <TabButton label="Formulaires & Réponses" isActive={activeTab === 'forms'} onClick={() => setActiveTab('forms')} />
                        <TabButton label="Coins & Accès" isActive={activeTab === 'manage'} onClick={() => setActiveTab('manage')} />
                        <TabButton label="Notification Directe" isActive={activeTab === 'notify'} onClick={() => setActiveTab('notify')} />
                    </nav>

                    <main className="flex-1 p-8 overflow-y-auto bg-white dark:bg-slate-800 custom-scrollbar min-h-0">
                        {activeTab === 'info' && renderInfoTab()}
                        {activeTab === 'forms' && renderFormsTab()}
                        {activeTab === 'manage' && (
                            <div className="space-y-8">
                                <div className="p-10 bg-slate-50 dark:bg-slate-900 rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 shadow-inner">
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 text-center">Ajustement manuel du portefeuille</h4>
                                    <div className="flex flex-col sm:flex-row gap-6">
                                        <div className="relative flex-1">
                                            <input type="number" value={coinAmount} onChange={(e) => setCoinAmount(e.target.value)} placeholder="Montant..." className="w-full bg-white dark:bg-slate-700 border-2 border-slate-100 dark:border-slate-600 rounded-3xl px-8 py-5 font-black text-xl shadow-sm outline-none focus:ring-4 focus:ring-primary-500/10 transition-all text-center" />
                                        </div>
                                        <div className="flex gap-3">
                                            <Button onClick={handleCredit} className="flex-1 !bg-green-600 hover:!bg-green-700 border-none !px-10 font-black uppercase text-xs tracking-[0.1em] shadow-xl shadow-green-500/20">Créditer</Button>
                                            <Button onClick={handleDebit} variant="secondary" className="flex-1 !text-red-500 !border-red-100 font-black uppercase text-xs tracking-[0.1em] shadow-xl shadow-red-500/10">Débiter</Button>
                                        </div>
                                    </div>
                                </div>
                                <Button onClick={() => onUpdateUserStatus(student.id, student.status === 'active' ? 'suspended_manual' : 'active')} variant={student.status === 'active' ? 'danger' : 'primary'} className="w-full !py-6 font-black uppercase tracking-[0.3em] text-xs shadow-2xl">
                                    {student.status === 'active' ? 'Suspendre définitivement le compte' : 'Réactiver l\'accès étudiant'}
                                </Button>
                            </div>
                        )}
                        {activeTab === 'notify' && (
                            <div className="space-y-8">
                                <div className="relative group">
                                    <textarea value={notificationMessage} onChange={(e) => setNotificationMessage(e.target.value)} placeholder="Rédigez votre message à l'attention de l'étudiant..." className="w-full h-56 bg-slate-50 dark:bg-slate-900 rounded-[3rem] p-10 border-2 border-slate-100 dark:border-slate-800 shadow-inner outline-none focus:ring-4 focus:ring-primary-500/10 transition-all font-bold text-slate-700 dark:text-slate-200 text-lg" />
                                    <div className="absolute top-6 right-10 flex items-center gap-2 text-[10px] font-black text-primary-500 uppercase tracking-widest opacity-50 group-focus-within:opacity-100 transition-opacity">
                                        <span className="w-2.5 h-2.5 bg-primary-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(20,184,166,1)]"></span>
                                        Système IA Prêt
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row justify-between gap-6">
                                    <button onClick={handleAiRefinement} disabled={isAiLoading} className="text-[11px] font-black text-primary-600 uppercase tracking-widest flex items-center gap-3 hover:bg-primary-50 p-4 rounded-3xl transition-all shadow-sm bg-white dark:bg-slate-800 border-2 border-primary-50 dark:border-primary-900/30">
                                        {isAiLoading ? <Spinner className="w-4 h-4"/> : "✨"} <span>Professionnaliser par IA</span>
                                    </button>
                                    <Button onClick={handleSendNotif} disabled={!notificationMessage.trim()} className="!px-14 font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-primary-500/30">Envoyer maintenant</Button>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
            {confirmation && <ConfirmationModal {...confirmation} />}
        </>
    );
};

export default StudentManagementModal;
