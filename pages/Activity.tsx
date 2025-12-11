
import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import { Activity, ActivityType, User } from '../types';

interface ActivityProps {
    activities: Activity[];
    users: User[];
}

const translateActivityType = (type: ActivityType): string => {
    const translations: Record<string, string> = {
        [ActivityType.ACCOUNT_CREATED]: 'Création de compte',
        [ActivityType.FORM_CREATED]: 'Création de formulaire',
        [ActivityType.FORM_VALIDATED]: 'Validation de formulaire',
        [ActivityType.FORM_VALIDATION_CANCELLED]: 'Annulation de validation',
        [ActivityType.FORM_DELETED]: 'Suppression de formulaire',
        [ActivityType.FORM_PUBLISHED]: 'Publication de formulaire',
        [ActivityType.FORM_PURCHASED]: 'Achat de formulaire',
        [ActivityType.AI_ANALYSIS_PERFORMED]: 'Analyse IA effectuée',
        [ActivityType.COIN_TRANSFER]: 'Transfert de coins',
        [ActivityType.ADMIN_COIN_ADJUSTMENT]: 'Ajustement de solde',
        [ActivityType.USER_STATUS_CHANGED]: 'Statut utilisateur modifié',
        [ActivityType.RESPONSE_ADDED]: 'Ajout de réponse',
        [ActivityType.SYSTEM_SETTINGS_UPDATED]: 'Configuration système',
        [ActivityType.PROMOTIONAL_CAMPAIGN]: 'Campagne promotionnelle',
    };
    return translations[type] || (type as string);
};

export const ActivityIcon: React.FC<{ type: ActivityType }> = ({ type }) => {
    const iconMap: Record<string, string> = {
        [ActivityType.ACCOUNT_CREATED]: '👤',
        [ActivityType.FORM_CREATED]: '📝',
        [ActivityType.FORM_VALIDATED]: '✅',
        [ActivityType.FORM_VALIDATION_CANCELLED]: '↩️',
        [ActivityType.FORM_DELETED]: '🗑️',
        [ActivityType.FORM_PUBLISHED]: '🌍',
        [ActivityType.FORM_PURCHASED]: '🛒',
        [ActivityType.AI_ANALYSIS_PERFORMED]: '💡',
        [ActivityType.COIN_TRANSFER]: '💸',
        [ActivityType.ADMIN_COIN_ADJUSTMENT]: '⚙️',
        [ActivityType.USER_STATUS_CHANGED]: '🔄',
        [ActivityType.RESPONSE_ADDED]: '📥',
        [ActivityType.SYSTEM_SETTINGS_UPDATED]: '🔧',
        [ActivityType.PROMOTIONAL_CAMPAIGN]: '🎁',
    };
    return <span className="text-xl" title={translateActivityType(type)}>{iconMap[type] || '🔔'}</span>;
};


const ActivityPage: React.FC<ActivityProps> = ({ activities, users }) => {
    const [filters, setFilters] = useState({
        userId: '',
        activityType: '',
        startDate: '',
        endDate: '',
    });

    const studentUsers = useMemo(() => users.filter(u => u.role === 'student').sort((a, b) => a.name.localeCompare(b.name)), [users]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const filteredActivities = useMemo(() => {
        if (!activities) return [];
        
        return activities.filter(activity => {
            if (filters.userId && activity.userId !== filters.userId) return false;
            if (filters.activityType && activity.type !== filters.activityType) return false;
            
            const activityDate = new Date(activity.createdAt);
            if (filters.startDate) {
                const startDate = new Date(filters.startDate);
                startDate.setHours(0, 0, 0, 0);
                if (activityDate < startDate) return false;
            }
            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999);
                if (activityDate > endDate) return false;
            }

            return true;
        })
        // TRI CHRONOLOGIQUE INVERSE STRICT (Le plus récent en haut) avec sécurité pour dates invalides
        .sort((a, b) => {
            let timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            let timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            
            if (isNaN(timeA)) timeA = 0;
            if (isNaN(timeB)) timeB = 0;

            return timeB - timeA;
        });
    }, [activities, filters]);

    const getUserName = (userId: string) => {
        const u = users.find(u => u.id === userId);
        if (u?.role === 'admin') return 'DASS';
        return u?.name || 'Système/Admin';
    };

    const inputClasses = "block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500";

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center space-x-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Journal d'Activité</h2>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md">
                    Total: <strong>{filteredActivities.length}</strong> événements
                </div>
            </div>
            
            <Card title="Filtres">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <select name="userId" value={filters.userId} onChange={handleFilterChange} className={inputClasses}>
                        <option value="">Tous les utilisateurs</option>
                        {studentUsers.map(user => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                    </select>
                    <select name="activityType" value={filters.activityType} onChange={handleFilterChange} className={inputClasses}>
                        <option value="">Tous les types d'activité</option>
                        {Object.values(ActivityType).map(type => (
                            <option key={type} value={type}>{translateActivityType(type)}</option>
                        ))}
                    </select>
                    <input name="startDate" type="date" value={filters.startDate} onChange={handleFilterChange} className={inputClasses} />
                    <input name="endDate" type="date" value={filters.endDate} onChange={handleFilterChange} className={inputClasses} />
                </div>
            </Card>

            <Card>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Heure</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Utilisateur</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Type d'Activité</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Détails</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredActivities.map(activity => (
                                <tr key={activity.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                        <div className="font-medium text-slate-900 dark:text-white">{new Date(activity.createdAt).toLocaleDateString()}</div>
                                        <div className="text-xs">{new Date(activity.createdAt).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{getUserName(activity.userId)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                        <div className="flex items-center space-x-2">
                                            <ActivityIcon type={activity.type} />
                                            <span>{translateActivityType(activity.type)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-normal text-sm text-slate-500 dark:text-slate-400 max-w-md">{activity.details}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredActivities.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-slate-500 dark:text-slate-400">Aucune activité ne correspond aux filtres.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default ActivityPage;