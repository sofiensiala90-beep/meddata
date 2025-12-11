
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { User, Transaction, TransactionType, TransactionReason } from '../types';
import Card from '../components/Card';
import CoinIcon from '../components/icons/CoinIcon';
import Button from '../components/Button';

interface FinanceProps {
  transactions: Transaction[];
  users: User[];
}

const translateTransactionReason = (reason: TransactionReason): string => {
  const translations: Record<string, string> = {
    [TransactionReason.FormValidation]: 'Validation de formulaire',
    [TransactionReason.FormResponse]: 'Ajout de réponse',
    [TransactionReason.AiRequest]: 'Analyse IA',
    [TransactionReason.MonthlyFee]: 'Frais mensuels',
    [TransactionReason.ManualTopup]: 'Recharge manuelle',
    [TransactionReason.AdminAdjustment]: 'Ajustement Admin',
    [TransactionReason.FormPurchase]: 'Achat de formulaire',
    [TransactionReason.ResponseBundlePurchase]: 'Achat de réponses',
    [TransactionReason.FormSaleCommission]: 'Commission sur vente (versée)',
    [TransactionReason.PlatformCommission]: 'Revenu de commission',
    [TransactionReason.COIN_TRANSFER_SENT]: 'Transfert (envoyé)',
    [TransactionReason.COIN_TRANSFER_RECEIVED]: 'Transfert (reçu)',
  };
  return translations[reason] || (reason as string);
};


const Finance: React.FC<FinanceProps> = ({ transactions, users }) => {
  const [showCreditBreakdown, setShowCreditBreakdown] = useState(false);
  const [filters, setFilters] = useState({
    userId: '',
    reason: '',
    minAmount: '',
    maxAmount: '',
    startDate: '',
    endDate: '',
  });
  const [userSearch, setUserSearch] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const userSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (userSearchRef.current && !userSearchRef.current.contains(event.target as Node)) {
            setIsUserDropdownOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (filters.userId) {
        const user = users.find(u => u.id === filters.userId);
        if (user && user.name !== userSearch) {
            setUserSearch(user.name);
        }
    } else {
        setUserSearch('');
    }
  }, [filters.userId, users]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  const handleUserSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setUserSearch(term);
    if (term === '') {
        setFilters(prev => ({ ...prev, userId: '' }));
    }
    setIsUserDropdownOpen(true);
  };
  
  const handleSelectUser = (user: User) => {
    setUserSearch(user.name);
    setFilters(prev => ({ ...prev, userId: user.id }));
    setIsUserDropdownOpen(false);
  };

  const handleResetFilters = () => {
    setFilters({
      userId: '',
      reason: '',
      minAmount: '',
      maxAmount: '',
      startDate: '',
      endDate: '',
    });
    setUserSearch('');
  };

  const getUserName = (userId: string) => {
      const u = users.find(u => u.id === userId);
      if (u?.role === 'admin') return 'DASS';
      return u?.name || 'Utilisateur inconnu';
  };

  const totalDebit = transactions.filter(tx => tx.type === TransactionType.Debit).reduce((sum, tx) => sum + tx.amount, 0);
  const totalCredit = transactions.filter(tx => tx.type === TransactionType.Credit).reduce((sum, tx) => sum + tx.amount, 0);

  // FIX: Explicitly typed `incomeSummary` and its internal `summary` object to ensure
  // values are correctly inferred as numbers, resolving type errors in sort operations.
  const incomeSummary = useMemo((): Record<string, number> => {
    const summary: Record<string, number> = {};
    const admin = users.find(u => u.role === 'admin');
    
    // Return an empty object for a consistent return type if admin is not found.
    if (!admin) return summary;

    transactions.forEach(tx => {
        const directDebitIncomeReasons: TransactionReason[] = [
            TransactionReason.FormValidation,
            TransactionReason.AiRequest,
            TransactionReason.MonthlyFee,
        ];

        if (tx.type === TransactionType.Debit && directDebitIncomeReasons.includes(tx.reason)) {
            summary[tx.reason] = (summary[tx.reason] || 0) + tx.amount;
        }

        if (tx.type === TransactionType.Credit && tx.userId === admin.id && tx.reason === TransactionReason.PlatformCommission) {
            summary[TransactionReason.PlatformCommission] = (summary[TransactionReason.PlatformCommission] || 0) + tx.amount;
        }
    });

    return summary;
  }, [transactions, users]);

  const creditBreakdown = useMemo(() => {
    const studentTopups = transactions
        .filter(tx => tx.type === TransactionType.Credit && tx.reason === TransactionReason.ManualTopup)
        .reduce((sum, tx) => sum + tx.amount, 0);

    const adminCredits = transactions
        .filter(tx => tx.type === TransactionType.Credit && tx.reason === TransactionReason.AdminAdjustment)
        .reduce((sum, tx) => sum + tx.amount, 0);
        
    return { studentTopups, adminCredits };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
        if (filters.userId && tx.userId !== filters.userId) return false;
        if (filters.reason && tx.reason !== filters.reason) return false;
        
        const minAmount = parseFloat(filters.minAmount);
        if (!isNaN(minAmount) && tx.amount < minAmount) return false;

        const maxAmount = parseFloat(filters.maxAmount);
        if (!isNaN(maxAmount) && tx.amount > maxAmount) return false;

        const txDate = new Date(tx.createdAt);
        if (filters.startDate) {
            const startDate = new Date(filters.startDate);
            startDate.setHours(0, 0, 0, 0);
            if (txDate < startDate) return false;
        }
        if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            endDate.setHours(23, 59, 59, 999);
            if (txDate > endDate) return false;
        }

        return true;
    }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [transactions, filters]);
  
  const studentUsers = useMemo(() => users.filter(u => u.role === 'student').sort((a, b) => a.name.localeCompare(b.name)), [users]);

  const matchingUsers = useMemo(() => {
    if (!userSearch) return studentUsers;

    if (studentUsers.some(u => u.name === userSearch && u.id === filters.userId)) {
      return [];
    }
    
    return studentUsers.filter(user =>
        user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [userSearch, studentUsers, filters.userId]);


  const inputClasses = "block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500";

  return (
    <div className="space-y-6">
      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Finances</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Total Dépensé (Débit)">
          <p className="text-3xl font-bold text-red-500">{totalDebit.toLocaleString()} Coins</p>
        </Card>
        <Card 
            title="Total Ajouté (Crédit)" 
            className="cursor-pointer transition-shadow hover:shadow-lg"
            onClick={() => setShowCreditBreakdown(!showCreditBreakdown)}
        >
            {!showCreditBreakdown ? (
                <div>
                    <p className="text-3xl font-bold text-green-500">{totalCredit.toLocaleString()} Coins</p>
                    <p className="text-xs text-slate-400 mt-2 text-right">Cliquez pour voir le détail</p>
                </div>
            ) : (
                <div className="space-y-2 text-lg">
                    <div className="flex justify-between items-baseline">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Recharges (Étudiants)</span>
                        <span className="font-bold text-green-500">{creditBreakdown.studentTopups.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Crédits (Admin)</span>
                        <span className="font-bold text-green-500">{creditBreakdown.adminCredits.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 text-right">Cliquez pour masquer</p>
                </div>
            )}
        </Card>
      </div>

      <Card title="Revenus par Type de Transaction">
        {Object.keys(incomeSummary).length > 0 ? (
            <div className="space-y-3">
            {Object.entries(incomeSummary)
                // FIX: Explicitly cast sorting values to number to handle potential type inference issues.
                .sort(([, totalA], [, totalB]) => (totalB as number) - (totalA as number))
                .map(([reason, total]) => (
                <div key={reason} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <span className="text-slate-600 dark:text-slate-300">{translateTransactionReason(reason as TransactionReason)}</span>
                    <span className="font-semibold text-slate-900 dark:text-white flex items-center">
                        <CoinIcon className="w-4 h-4 mr-2 text-yellow-500" />
                        {total.toLocaleString()}
                    </span>
                </div>
                ))
            }
            </div>
        ) : (
            <p className="text-center text-slate-500 dark:text-slate-400 py-4">Aucun revenu généré pour le moment.</p>
        )}
      </Card>
      
       <Card title="Filtres">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div ref={userSearchRef} className="relative">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Utilisateur</label>
               <input
                type="text"
                name="userSearch"
                value={userSearch}
                onChange={handleUserSearchChange}
                onFocus={() => setIsUserDropdownOpen(true)}
                placeholder="Rechercher un étudiant..."
                className={`${inputClasses} mt-1`}
                autoComplete="off"
              />
              {isUserDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {matchingUsers.length > 0 ? (
                    matchingUsers.map(user => (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        {user.name} <span className="text-slate-400">({user.email})</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-slate-500">Aucun étudiant trouvé.</div>
                  )}
                </div>
              )}
            </div>
             <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Type de transaction</label>
              <select name="reason" value={filters.reason} onChange={handleFilterChange} className={`${inputClasses} mt-1`}>
                <option value="">Tous les types</option>
                {Object.values(TransactionReason).map(reason => (<option key={reason} value={reason}>{translateTransactionReason(reason)}</option>))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Montant</label>
              <div className="flex items-center space-x-2 mt-1">
                <input name="minAmount" type="number" value={filters.minAmount} onChange={handleFilterChange} placeholder="Min" className={inputClasses} />
                <input name="maxAmount" type="number" value={filters.maxAmount} onChange={handleFilterChange} placeholder="Max" className={inputClasses} />
              </div>
            </div>
             <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date de début</label>
              <input name="startDate" type="date" value={filters.startDate} onChange={handleFilterChange} className={`${inputClasses} mt-1`} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date de fin</label>
              <input name="endDate" type="date" value={filters.endDate} onChange={handleFilterChange} className={`${inputClasses} mt-1`} />
            </div>
            <div className="flex justify-end">
                <Button onClick={handleResetFilters} variant="secondary">Réinitialiser les filtres</Button>
            </div>
        </div>
      </Card>


      <Card 
        title="Historique de toutes les Transactions"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Utilisateur</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Description</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Montant</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {filteredTransactions.map(tx => (
                <tr key={tx.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(tx.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{getUserName(tx.userId)}</td>
                   <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{translateTransactionReason(tx.reason)}</div>
                      {tx.details && <div className="text-xs">{tx.details}</div>}
                    </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${tx.type === TransactionType.Credit ? 'text-green-500' : 'text-red-500'}`}>
                    {tx.type === TransactionType.Credit ? '+' : '-'}{tx.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400">Aucune transaction ne correspond aux filtres.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Finance;