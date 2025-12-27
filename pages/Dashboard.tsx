import React from 'react';
import { User, Form, FormResponse, Transaction, TransactionType, Activity, ActivityType } from '../types';
import Card from '../components/Card';
import StudentsIcon from '../components/icons/StudentsIcon';
import FormsIcon from '../components/icons/FormsIcon';
import CoinIcon from '../components/icons/CoinIcon';
import Button from '../components/Button';
import { ActivityIcon } from './Activity';

interface DashboardProps {
  user: User;
  forms: Form[];
  responses: FormResponse[];
  users?: User[];
  transactions?: Transaction[];
  activities?: Activity[];
  onNavigate?: (page: string) => void;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-700 shadow-soft flex items-center transition-all hover:scale-[1.02]">
        <div className="p-3 sm:p-4 rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mr-4 shrink-0">
            {icon}
        </div>
        <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">{title}</p>
            <p className="text-xl sm:text-3xl font-black text-slate-800 dark:text-white truncate tracking-tighter leading-tight">{value}</p>
        </div>
    </div>
);

const QuickAccessButton: React.FC<{title: string; description: string; onClick: () => void;}> = ({title, description, onClick}) => (
     <button onClick={onClick} className="text-left w-full p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-transparent hover:border-primary-200 dark:hover:border-primary-900 transition-all group">
        <h4 className="font-black text-sm sm:text-base text-slate-800 dark:text-white uppercase tracking-tight group-hover:text-primary-600 transition-colors">{title}</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{description}</p>
        <div className="mt-4 text-[10px] font-black uppercase text-primary-600 tracking-widest flex items-center">
            Commencer <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
        </div>
    </button>
);

const RecentActivityList: React.FC<{ activities: Activity[]; users?: User[] }> = ({ activities, users }) => {
    const getUserName = (userId: string) => {
        if (!users) return 'Utilisateur';
        const u = users.find(u => u.id === userId);
        if (u?.role === 'admin') return 'DASS';
        return u?.name || 'Inconnu';
    };

    if (!activities || activities.length === 0) {
        return <p className="text-slate-400 dark:text-slate-500 text-sm italic py-4 text-center">Aucune activité.</p>;
    }

    return (
        <div className="space-y-3">
            {activities.slice(0, 6).map(activity => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <div className="shrink-0 mt-0.5">
                        <ActivityIcon type={activity.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-800 dark:text-slate-200 leading-snug">
                            {users ? <span className="font-black uppercase text-[10px] text-primary-600 dark:text-primary-400 block mb-0.5">{getUserName(activity.userId)}</span> : null}
                            {activity.details}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                            {new Date(activity.createdAt).toLocaleDateString()} • {new Date(activity.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ user, forms, responses, users, transactions, activities, onNavigate }) => {
    const sortedActivities = activities ? [...activities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

    if (user.role === 'admin' && users && transactions) {
        const studentCount = users.filter(u => u.role === 'student').length;
        const totalDebit = transactions.filter(tx => tx.type === TransactionType.Debit).reduce((sum, tx) => sum + tx.amount, 0);

        return (
            <div className="space-y-6 max-w-7xl mx-auto pb-10">
                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Administration</h2>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                    <StatCard title="Étudiants" value={studentCount} icon={<StudentsIcon className="h-6 w-6 sm:h-8 sm:w-8" />} />
                    <StatCard title="Formulaires" value={forms.length} icon={<FormsIcon className="h-6 w-6 sm:h-8 sm:w-8" />} />
                    <StatCard title="Réponses" value={responses.length} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2-0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>} />
                    <StatCard title="Transactions" value={totalDebit.toLocaleString()} icon={<CoinIcon className="h-6 w-6 sm:h-8 sm:w-8" />} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card title="Gestion Plateforme" className="lg:col-span-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                            <QuickAccessButton title="Étudiants" description="Gérer les comptes et statuts." onClick={() => onNavigate && onNavigate('etudiants')} />
                            <QuickAccessButton title="Finances" description="Suivre les flux de coins." onClick={() => onNavigate && onNavigate('finances')} />
                            <QuickAccessButton title="Journal" description="Historique complet des actions." onClick={() => onNavigate && onNavigate('activite')} />
                        </div>
                    </Card>
                    <Card title="Activité Récente">
                        <RecentActivityList activities={sortedActivities} users={users} />
                        <button onClick={() => onNavigate && onNavigate('activite')} className="w-full mt-4 text-[10px] font-black uppercase text-primary-600 hover:underline tracking-widest text-center">Historique complet →</button>
                    </Card>
                </div>
            </div>
        );
    }

    const totalResponses = responses.length;
    const validatedForms = forms.filter(f => f.status === 'validated').length;
    const draftForms = forms.filter(f => f.status === 'draft').length;
    const isSuspended = user.status.startsWith('suspended');
    const studentActivities = sortedActivities.filter(a => a.userId === user.id);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <div className="flex flex-col gap-1">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">MedataAI System</p>
                <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Bonjour, {user.name.split(' ')[0]}</h2>
            </div>

            {isSuspended && (
                 <Card className="!bg-red-50 dark:!bg-red-900/10 border-2 border-red-200 dark:border-red-900">
                    <div className="flex items-center gap-4">
                         <div className="bg-red-100 dark:bg-red-900/40 p-3 rounded-2xl shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                         </div>
                        <div>
                            <h3 className="text-base font-black uppercase text-red-800 dark:text-red-300">Compte Suspendu</h3>
                            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">Votre accès est limité. Veuillez recharger pour réactiver.</p>
                            <Button variant="danger" className="mt-3 !py-2 !px-4 !text-[10px] font-black uppercase tracking-widest" onClick={() => onNavigate && onNavigate('portefeuille')}>Aller au Portefeuille</Button>
                        </div>
                    </div>
                </Card>
            )}
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <StatCard title="Coins" value={user.coinBalance.toLocaleString()} icon={<CoinIcon className="h-6 w-6 sm:h-8 sm:w-8" />} />
                <StatCard title="Validés" value={validatedForms} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                <StatCard title="Brouillons" value={draftForms} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>} />
                <StatCard title="Réponses" value={totalResponses} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2-2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="Accès Rapide" className="lg:col-span-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <QuickAccessButton title="Créer" description="Nouveau formulaire d'étude." onClick={() => onNavigate && onNavigate('formulaires')} />
                        <QuickAccessButton title="Analyser" description="Insights IA sur vos données." onClick={() => onNavigate && onNavigate('analyse')} />
                        <QuickAccessButton title="Wallet" description="Gérer vos transactions." onClick={() => onNavigate && onNavigate('portefeuille')} />
                    </div>
                </Card>
                <Card title="Mon Activité">
                    <RecentActivityList activities={studentActivities} />
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;