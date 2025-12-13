import React, { useState, useMemo } from 'react';
import { User, DeletedItem } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import TrashIcon from '../components/icons/TrashIcon';
import RestoreIcon from '../components/icons/RestoreIcon';
import FormsIcon from '../components/icons/FormsIcon';
import ConfirmationModal, { ConfirmationModalProps } from '../components/ConfirmationModal';

interface AdminTrashProps {
  deletedItems: DeletedItem[];
  users: User[];
  onRestore: (item: DeletedItem) => Promise<void>;
  onPurge: (filters: { startDate: string, endDate: string, type: string, userId: string }) => Promise<void>;
}

const AdminTrash: React.FC<AdminTrashProps> = ({ deletedItems, users, onRestore, onPurge }) => {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: 'all', // 'all', 'form', 'response'
    userId: '',
  });
  const [confirmation, setConfirmation] = useState<ConfirmationModalProps | null>(null);

  const studentUsers = useMemo(() => users.filter(u => u.role === 'student').sort((a, b) => a.name.localeCompare(b.name)), [users]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const filteredItems = useMemo(() => {
    return deletedItems.filter(item => {
      // Date Filter
      const itemDate = new Date(item.deletedAt);
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        if (itemDate < start) return false;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (itemDate > end) return false;
      }

      // Type Filter
      if (filters.type !== 'all' && item.type !== filters.type) return false;

      // User Filter
      if (filters.userId && item.ownerId !== filters.userId) return false;

      return true;
    }).sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  }, [deletedItems, filters]);

  const handleRestoreClick = (item: DeletedItem) => {
    setConfirmation({
        isOpen: true,
        title: "Restaurer l'élément",
        message: `Voulez-vous restaurer cet élément (${item.type === 'form' ? 'Formulaire' : 'Réponse'}) pour l'utilisateur ${item.ownerName} ?`,
        confirmText: "Restaurer",
        variant: "primary",
        onConfirm: async () => {
            await onRestore(item);
            setConfirmation(null);
        },
        onClose: () => setConfirmation(null)
    });
  };

  const handlePurgeClick = () => {
    const count = filteredItems.length;
    if (count === 0) return;

    if (!filters.startDate && !filters.endDate && filters.type === 'all' && !filters.userId) {
       // Safety check to prevent accidental full wipe without thinking
       if (!window.confirm("Attention : Aucun filtre n'est sélectionné. Cela supprimera TOUT le contenu de la corbeille. Continuer ?")) {
           return;
       }
    }

    setConfirmation({
        isOpen: true,
        title: "Vider la corbeille (Sélection)",
        message: (
            <div className="space-y-2">
                <p>Vous êtes sur le point de supprimer <strong>définitivement</strong> {count} élément(s) correspondant aux filtres actuels.</p>
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
                    <strong>Attention :</strong> Cette action est irréversible. Les données ne pourront plus être restaurées.
                </div>
            </div>
        ),
        confirmText: "Supprimer Définitivement",
        variant: "danger",
        onConfirm: async () => {
            await onPurge(filters);
            setConfirmation(null);
        },
        onClose: () => setConfirmation(null)
    });
  };

  const inputClasses = "block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Corbeille Admin</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Gérez les éléments supprimés et restaurez-les en cas de réclamation.</p>
        </div>
        <Button 
            onClick={handlePurgeClick} 
            variant="danger" 
            disabled={filteredItems.length === 0}
            className="w-full sm:w-auto flex items-center"
        >
            <TrashIcon className="w-5 h-5 mr-2" />
            Vider la sélection ({filteredItems.length})
        </Button>
      </div>

      <Card title="Filtres">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Date de début (Suppression)</label>
                <input name="startDate" type="date" value={filters.startDate} onChange={handleFilterChange} className={inputClasses} />
            </div>
            <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Date de fin (Suppression)</label>
                <input name="endDate" type="date" value={filters.endDate} onChange={handleFilterChange} className={inputClasses} />
            </div>
            <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Type d'élément</label>
                <select name="type" value={filters.type} onChange={handleFilterChange} className={inputClasses}>
                    <option value="all">Tout</option>
                    <option value="form">Formulaires</option>
                    <option value="response">Réponses</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Utilisateur (Propriétaire)</label>
                <select name="userId" value={filters.userId} onChange={handleFilterChange} className={inputClasses}>
                    <option value="">Tous les utilisateurs</option>
                    {studentUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                </select>
            </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Date Suppr.</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Type</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Propriétaire</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Titre / Info</th>
                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredItems.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                {new Date(item.deletedAt).toLocaleDateString()} <span className="text-xs">{new Date(item.deletedAt).toLocaleTimeString()}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.type === 'form' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}`}>
                                    {item.type === 'form' ? 'Formulaire' : 'Réponse'}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                                {item.ownerName || 'Inconnu'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                                <div className="flex items-center">
                                    {item.type === 'form' ? <FormsIcon className="w-4 h-4 mr-2 text-slate-400"/> : <span className="mr-2 text-lg">📝</span>}
                                    <span className="truncate max-w-xs" title={item.title}>
                                        {item.title || (item.type === 'response' ? 'Réponse sans titre' : 'Formulaire sans titre')}
                                    </span>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Button onClick={() => handleRestoreClick(item)} variant="secondary" className="!py-1 !px-2 flex items-center">
                                    <RestoreIcon className="w-4 h-4 mr-1"/> Restaurer
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {filteredItems.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-slate-500 dark:text-slate-400">La corbeille est vide pour cette sélection.</p>
                </div>
            )}
        </div>
      </Card>

      {confirmation && <ConfirmationModal {...confirmation} />}
    </div>
  );
};

export default AdminTrash;