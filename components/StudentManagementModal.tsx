import React, { useState, useEffect } from 'react';
import { User, Form, FormResponse, TransactionType, MedicalField, FormField } from '../types';
import Button from './Button';
import ConfirmationModal, { ConfirmationModalProps } from './ConfirmationModal';
import { generateNotificationRefinement } from '../services/geminiService';
import Spinner from './Spinner';
import CoinIcon from './icons/CoinIcon';
import FormsIcon from './icons/FormsIcon';
import ProfileIcon from './icons/ProfileIcon';

const DiffBadge: React.FC<{ type: 'added' | 'removed' | 'modified' | 'unchanged' }> = ({ type }) => {
    switch (type) {
        case 'added': return <span className="text-[9px] bg-green-100 dark:bg-green-900/50 text-green-700 px-2 py-0.5 rounded-full font-black uppercase">+ Nouveau</span>;
        case 'removed': return <span className="text-[9px] bg-red-100 dark:bg-red-900/50 text-red-700 px-2 py-0.5 rounded-full font-black uppercase">- Supprimé</span>;
        case 'modified': return <span className="text-[9px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 px-2 py-0.5 rounded-full font-black uppercase">Δ Modifié</span>;
        default: return null;
    }
};

const getStatusBadge = (status: User['status']) => {
    switch (status) {
        case 'active': return { text: 'ACTIF', className: 'bg-green-100 text-green-700 border-green-200' };
        case 'suspended_payment': return { text: 'SUSPENDU (PAIEMENT)', className: 'bg-amber-100 text-amber-700 border-amber-200' };
        case 'suspended_manual': return { text: 'SUSPENDU (ADMIN)', className: 'bg-red-100 text-red-700 border-red-200' };
        default: return { text: 'INCONNU', className: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
};

const FormComparisonView: React.FC<{ 
    currentForm: Form; 
    backupForm: Form | undefined; 
    onApprove: () => void; 
    onReject: () => void; 
    onBack: () => void 
}> = ({ currentForm, backupForm, onApprove, onReject, onBack }) => {
    
    const renderFieldCard = (field: FormField, status: 'added' | 'removed' | 'modified' | 'unchanged', originalField?: FormField) => (
        <div className={`p-4 rounded-2xl border-2 mb-3 transition-all ${status === 'added' ? 'border-green-100 bg-green-50/30' : status === 'removed' ? 'border-red-100 opacity-50' : status === 'modified' ? 'border-blue-100 bg-blue-50/30' : 'border-slate-50'}`}>
            <div className="flex justify-between mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{field.type}</span>
                <DiffBadge type={status} />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{field.label || "Sans libellé"}</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <button onClick={onBack} className="text-[10px] font-black uppercase text-slate-400 hover:text-primary-600 flex items-center transition-colors">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                    Retour
                </button>
                <div className="flex gap-2">
                    <Button onClick={onReject} variant="danger" className="!py-2 !px-4 !text-[10px] uppercase font-black">Refuser</Button>
                    <Button onClick={onApprove} className="!py-2 !px-4 !text-[10px] uppercase font-black">Approuver</Button>
                </div>
            </div>
            <div className="bg-primary-50/30 dark:bg-primary-900/10 p-4 rounded-2xl border border-primary-100 dark:border-primary-900/30">
                <h4 className="text-[9px] font-black text-primary-500 uppercase tracking-[0.2em] mb-1">Motif de la modification</h4>
                <p className="text-slate-700 dark:text-slate-300 italic text-sm leading-relaxed">"{currentForm.modificationRequestReason || "Aucun motif spécifié."}"</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden flex-1">
                <div className="flex flex-col border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden bg-white dark:bg-slate-900/40">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 font-black text-[9px] uppercase tracking-widest text-slate-500 text-center">Version Actuelle (Backup)</div>
                    <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                        {backupForm?.schema.map(f => <div key={f.id}>{renderFieldCard(f, currentForm.schema.some(sf => sf.id === f.id) ? 'unchanged' : 'removed')}</div>)}
                        {!backupForm && <p className="text-center py-10 text-xs text-slate-400 italic">Aucune donnée de backup.</p>}
                    </div>
                </div>
                <div className="flex flex-col border border-primary-100 dark:border-primary-900 rounded-3xl overflow-hidden bg-white dark:bg-slate-900/40">
                    <div className="p-3 bg-primary-50 dark:bg-primary-900/50 font-black text-[9px] uppercase tracking-widest text-primary-600 text-center">Nouvelle Version Proposée</div>
                    <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                        {currentForm.schema.map(f => {
                            const orig = backupForm?.schema.find(of => of.id === f.id);
                            const status = !orig ? 'added' : (orig.label !== f.label || orig.type !== f.type) ? 'modified' : 'unchanged';
                            return <div key={f.id}>{renderFieldCard(f, status, orig)}</div>;
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

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

const StudentManagementModal: React.FC<ModalProps> = ({ student, forms, responses, onClose, onSendNotification, onUpdateUserStatus, onAdminCoinAdjustment, onUnvalidateForm, onRefuseModification, onRevalidationDecision, initialTab = 'info' }) => {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [coinAmount, setCoinAmount] = useState('');
    const [notificationMessage, setNotificationMessage] = useState('');
    const [viewingFormComparison, setViewingFormComparison] = useState<Form | null>(null);
    const [isRefining, setIsRefining] = useState(false);

    const handleRevalidationApprove = (form: Form) => { if (onRevalidationDecision) onRevalidationDecision(form, true); setViewingFormComparison(null); };
    const handleRevalidationReject = (form: Form) => { if (onRevalidationDecision) onRevalidationDecision(form, false); setViewingFormComparison(null); };

    const handleProfessionalize = async () => {
        if (!notificationMessage.trim() || isRefining) return;
        setIsRefining(true);
        try {
            const refinedText = await generateNotificationRefinement(notificationMessage);
            setNotificationMessage(refinedText);
        } catch (error) {
            console.error("Erreur de professionnalisation IA:", error);
        } finally {
            setIsRefining(false);
        }
    };

    const statusInfo = getStatusBadge(student.status);

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex justify-center items-center z-50 p-2 sm:p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-4xl h-full max-h-[90vh] sm:h-auto flex flex-col overflow-hidden animate-scale-up" onClick={e => e.stopPropagation()}>
                
                {/* Header Section */}
                <header className="px-6 py-6 sm:px-8 sm:py-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 relative shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center space-x-5">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-glow">
                                {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-none tracking-tighter truncate">{student.name}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border tracking-widest ${statusInfo.className}`}>
                                        {statusInfo.text}
                                    </span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest mt-1.5 flex items-center">
                                    <CoinIcon className="w-3 h-3 mr-1 text-yellow-500" />
                                    {student.coinBalance.toLocaleString()} Coins <span className="mx-2 opacity-30">•</span> {student.email}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="absolute top-4 right-4 sm:static p-2 text-slate-300 hover:text-red-500 transition-all hover:rotate-90">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </header>
                
                {/* Navigation Tabs */}
                <nav className="flex px-6 sm:px-8 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-10 overflow-x-auto no-scrollbar shrink-0">
                    {[
                        { id: 'info', label: 'Détails' },
                        { id: 'forms', label: 'Formulaires' },
                        { id: 'manage', label: 'Gestion Compte' },
                        { id: 'notify', label: 'Alerte Directe' }
                    ].map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id)} 
                            className={`px-4 py-4 text-[10px] font-black uppercase tracking-[0.15em] border-b-4 transition-all whitespace-nowrap mr-4 ${activeTab === tab.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                {/* Main Content Area */}
                <main className="flex-1 p-6 sm:p-8 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-800">
                    {activeTab === 'info' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { label: "Université", value: student.university, icon: "🏫" },
                                { label: "Année d'étude", value: `${student.studyYear}${student.studyYear === 1 ? 'ère' : 'ème'} Année`, icon: "🎓" },
                                { label: "Téléphone", value: student.phoneNumber, icon: "📞" },
                                { label: "Inscrit le", value: new Date(student.createdAt).toLocaleDateString(), icon: "📅" },
                                { label: "Filière", value: student.field, icon: "🔬" },
                                { label: "ID Système", value: student.id, icon: "🆔" }
                            ].map((item, i) => (
                                <div key={i} className="p-5 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-700/50 flex items-center space-x-4">
                                    <div className="text-2xl grayscale opacity-50">{item.icon}</div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                                        <p className="font-bold text-slate-800 dark:text-slate-200">{item.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'forms' && (
                        viewingFormComparison ? (
                            <FormComparisonView 
                                currentForm={viewingFormComparison} 
                                backupForm={viewingFormComparison.backupVersion} 
                                onApprove={() => handleRevalidationApprove(viewingFormComparison)} 
                                onReject={() => handleRevalidationReject(viewingFormComparison)} 
                                onBack={() => setViewingFormComparison(null)} 
                            />
                        ) : (
                            <div className="space-y-3">
                                {forms.length > 0 ? forms.map(form => (
                                    <div key={form.id} className="p-4 sm:p-5 bg-white dark:bg-slate-900/20 border border-slate-100 dark:border-slate-700 rounded-3xl flex justify-between items-center group hover:border-primary-200 dark:hover:border-primary-800 transition-all shadow-sm">
                                        <div className="min-w-0 pr-4">
                                            <h5 className="font-black text-slate-800 dark:text-white truncate">{form.title}</h5>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${form.status === 'pending_revalidation' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                                    {form.status.replace(/_/g, ' ')}
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-bold">{new Date(form.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="shrink-0">
                                            {form.status === 'pending_revalidation' ? (
                                                <Button onClick={() => setViewingFormComparison(form)} className="!py-2 !px-4 !text-[9px] font-black uppercase tracking-widest shadow-glow">Examiner</Button>
                                            ) : (
                                                <div className="p-2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-16">
                                        <div className="text-4xl mb-4 opacity-20">📂</div>
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Aucun formulaire trouvé</p>
                                    </div>
                                )}
                            </div>
                        )
                    )}

                    {activeTab === 'manage' && (
                        <div className="space-y-6 max-w-2xl mx-auto">
                            <div className="p-8 bg-slate-50 dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-inner">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 text-center">Ajustement du Solde</h4>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="relative flex-1">
                                        <input 
                                            type="number" 
                                            value={coinAmount} 
                                            onChange={(e) => setCoinAmount(e.target.value)} 
                                            placeholder="Montant (ex: 500)" 
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl px-5 py-4 font-black text-lg outline-none focus:ring-4 focus:ring-primary-500/10 transition-all text-center sm:text-left" 
                                        />
                                        <CoinIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-yellow-400 opacity-50" />
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <Button onClick={() => { onAdminCoinAdjustment(student.id, parseFloat(coinAmount), TransactionType.Credit); setCoinAmount(''); }} className="!bg-green-600 !py-4 flex-1 sm:flex-none px-6 font-black uppercase text-[10px] tracking-widest">Créditer</Button>
                                        <Button onClick={() => { onAdminCoinAdjustment(student.id, parseFloat(coinAmount), TransactionType.Debit); setCoinAmount(''); }} variant="secondary" className="!text-red-500 !border-red-100 !bg-red-50 !py-4 flex-1 sm:flex-none px-6 font-black uppercase text-[10px] tracking-widest">Débiter</Button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100 dark:border-slate-700 justify-center">
                                <div className="p-4 rounded-3xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 w-full sm:max-w-md">
                                    <h5 className="text-[9px] font-black text-red-600 uppercase mb-3 px-1 text-center">Zone de Sécurité</h5>
                                    <Button 
                                        onClick={() => onUpdateUserStatus(student.id, student.status === 'active' ? 'suspended_manual' : 'active')} 
                                        variant={student.status === 'active' ? 'danger' : 'primary'} 
                                        className="w-full !py-4 font-black uppercase text-[10px] tracking-widest"
                                    >
                                        {student.status === 'active' ? 'Suspendre Compte' : 'Réactiver Compte'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notify' && (
                        <div className="space-y-4 max-w-2xl mx-auto">
                            <div className="bg-primary-50/30 dark:bg-primary-900/10 p-4 rounded-2xl mb-2 flex items-start gap-3">
                                <span className="text-xl">💡</span>
                                <p className="text-xs text-primary-700 dark:text-primary-300 leading-relaxed font-medium">Ce message sera affiché dans le centre de notifications de l'étudiant. Soyez clair et professionnel.</p>
                            </div>
                            <div className="relative">
                                <textarea 
                                    value={notificationMessage} 
                                    onChange={(e) => setNotificationMessage(e.target.value)} 
                                    placeholder="Tapez votre message ici..." 
                                    className="w-full h-48 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10 font-medium text-slate-800 dark:text-slate-200 shadow-inner resize-none" 
                                    disabled={isRefining}
                                />
                                {isRefining && (
                                    <div className="absolute inset-0 bg-white/40 dark:bg-slate-800/40 backdrop-blur-[2px] rounded-[2rem] flex items-center justify-center">
                                        <div className="flex flex-col items-center">
                                            <Spinner className="w-8 h-8 text-primary-600" />
                                            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-primary-600">DASS peaufine votre message...</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                                <button 
                                    onClick={handleProfessionalize}
                                    disabled={!notificationMessage.trim() || isRefining}
                                    className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-700 transition-colors disabled:opacity-30"
                                >
                                    <span className="text-base">✨</span>
                                    <span>Professionaliser avec l'IA</span>
                                </button>
                                <Button 
                                    onClick={() => { onSendNotification(student.id, notificationMessage); setNotificationMessage(''); }} 
                                    disabled={!notificationMessage.trim() || isRefining}
                                    className="w-full sm:w-auto !py-4 !px-10 font-black uppercase text-xs tracking-[0.2em] shadow-glow"
                                >
                                    Envoyer l'alerte
                                </Button>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default StudentManagementModal;