import React from 'react';
import { User, Form, FormResponse, Transaction, TransactionType } from '../types';
import Card from '../components/Card';
import StudentsIcon from '../components/icons/StudentsIcon';
import FormsIcon from '../components/icons/FormsIcon';
import CoinIcon from '../components/icons/CoinIcon';
import Button from '../components/Button';

interface DashboardProps {
  user: User;
  forms: Form[];
  responses: FormResponse[];
  users?: User[];
  transactions?: Transaction[];
  onNavigate?: (page: string) => void;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <Card className="flex items-center p-4">
        <div className="p-3 rounded-full bg-primary-100 dark:bg-primary-900/50 mr-4">
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
            <p className="text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
        </div>
    </Card>
);

const QuickAccessButton: React.FC<{title: string; description: string; onClick: () => void;}> = ({title, description, onClick}) => (
     <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg transition-colors hover:bg-slate-200 dark:hover:bg-slate-600">
        <h4 className="font-semibold text-slate-900 dark:text-white">{title}</h4>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description}</p>
        <button onClick={onClick} className="mt-4 text-sm font-semibold text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200">Commencer →</button>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ user, forms, responses, users, transactions, onNavigate }) => {

    if (user.role === 'admin' && users && transactions) {
        const studentCount = users.filter(u => u.role === 'student').length;
        const totalDebit = transactions.filter(tx => tx.type === TransactionType.Debit).reduce((sum, tx) => sum + tx.amount, 0);

        return (
            <div className="space-y-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Vue d'ensemble de la plateforme</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                        title="Nombre d'étudiants" 
                        value={studentCount}
                        icon={<StudentsIcon className="h-6 w-6 text-primary-600 dark:text-primary-300" />}
                    />
                     <StatCard 
                        title="Formulaires créés" 
                        value={forms.length}
                        icon={<FormsIcon className="h-6 w-6 text-primary-600 dark:text-primary-300" />}
                    />
                     <StatCard 
                        title="Réponses collectées" 
                        value={responses.length}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600 dark:text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
                    />
                    <StatCard 
                        title="Total Coins Dépensés" 
                        value={totalDebit.toLocaleString()}
                        icon={<CoinIcon className="h-6 w-6 text-yellow-500 dark:text-yellow-400" />}
                    />
                </div>

                <Card title="Actions Administrateur">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <QuickAccessButton 
                            title="Gérer les étudiants"
                            description="Consultez, gérez et communiquez avec les utilisateurs."
                            onClick={() => onNavigate && onNavigate('etudiants')}
                        />
                        <QuickAccessButton 
                            title="Consulter les finances"
                            description="Suivez toutes les transactions de coins sur la plateforme."
                            onClick={() => onNavigate && onNavigate('finances')}
                        />
                         <QuickAccessButton 
                            title="Voir tous les formulaires"
                            description="Visualisez tous les formulaires soumis par les étudiants."
                            onClick={() => onNavigate && onNavigate('formulaires')}
                        />
                    </div>
                </Card>
                 <Card title="Activité de la plateforme">
                    <p className="text-slate-500 dark:text-slate-400">L'activité globale de la plateforme sera affichée ici.</p>
                </Card>
            </div>
        );
    }

    // Student Dashboard
    const totalResponses = responses.length;
    const validatedForms = forms.filter(f => f.validated).length;
    const draftForms = forms.length - validatedForms;
    const isSuspended = user.status.startsWith('suspended');

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Bonjour, {user.name.split(' ')[0]} !</h2>

            {isSuspended && (
                 <Card className="!bg-red-50 dark:!bg-red-900/20 border border-red-200 dark:border-red-800">
                    <div className="flex items-center">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500 dark:text-red-400 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <div>
                            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Compte Suspendu</h3>
                            {user.status === 'suspended_manual' ? (
                                <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                                    Votre compte a été suspendu par un administrateur. Pour plus d'informations, veuillez contacter le support via le bouton "Faire une réclamation".
                                </p>
                            ) : (
                                <>
                                    <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                                        Votre compte est suspendu. 
                                        Certaines fonctionnalités sont limitées. Veuillez recharger votre portefeuille pour réactiver votre compte.
                                    </p>
                                     <Button variant="danger" className="!bg-red-500 hover:!bg-red-600 mt-3 !py-1.5 !px-3 !text-sm" onClick={() => onNavigate && onNavigate('portefeuille')}>
                                        Aller au Portefeuille
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </Card>
            )}
            
            {!isSuspended && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard 
                            title="Solde de Coins" 
                            value={user.coinBalance.toLocaleString()}
                            icon={<CoinIcon className="h-6 w-6 text-yellow-500 dark:text-yellow-400" />}
                        />
                         <StatCard 
                            title="Formulaires Validés" 
                            value={validatedForms}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600 dark:text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        />
                         <StatCard 
                            title="Brouillons" 
                            value={draftForms}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600 dark:text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
                        />
                         <StatCard 
                            title="Réponses Collectées" 
                            value={totalResponses}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600 dark:text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
                        />
                    </div>

                    <Card title="Accès Rapide">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <QuickAccessButton 
                                title="Créer un formulaire"
                                description="Commencez à collecter des données pour vos recherches."
                                onClick={() => onNavigate && onNavigate('formulaires')}
                            />
                             <QuickAccessButton 
                                title="Lancer une analyse IA"
                                description="Obtenez des insights précieux à partir de vos données."
                                onClick={() => onNavigate && onNavigate('analyse')}
                            />
                             <QuickAccessButton 
                                title="Consulter le portefeuille"
                                description="Vérifiez votre solde et l'historique de vos transactions."
                                onClick={() => onNavigate && onNavigate('portefeuille')}
                            />
                        </div>
                    </Card>

                    <Card title="Activité Récente">
                        <p className="text-slate-500 dark:text-slate-400">La liste des activités récentes sera affichée ici.</p>
                    </Card>
                </>
            )}
        </div>
    );
};

export default Dashboard;