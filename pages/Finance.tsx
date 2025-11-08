import React, { useMemo } from 'react';
import { User, Transaction, TransactionType, TransactionReason } from '../types';
import Card from '../components/Card';
import CoinIcon from '../components/icons/CoinIcon';

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
  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'Utilisateur inconnu';

  const totalDebit = transactions.filter(tx => tx.type === TransactionType.Debit).reduce((sum, tx) => sum + tx.amount, 0);
  const totalCredit = transactions.filter(tx => tx.type === TransactionType.Credit).reduce((sum, tx) => sum + tx.amount, 0);

  const incomeSummary = useMemo(() => {
    const summary: Partial<Record<TransactionReason, number>> = {};
    const admin = users.find(u => u.role === 'admin');
    
    if (!admin) return {};

    transactions.forEach(tx => {
        // Direct income sources are DEBITs from users for platform services.
        const directDebitIncomeReasons: TransactionReason[] = [
            TransactionReason.FormValidation,
            TransactionReason.AiRequest,
            TransactionReason.MonthlyFee,
        ];

        if (tx.type === TransactionType.Debit && directDebitIncomeReasons.includes(tx.reason)) {
            summary[tx.reason] = (summary[tx.reason] || 0) + tx.amount;
        }

        // Commission income is a CREDIT to the platform's admin account.
        if (tx.type === TransactionType.Credit && tx.userId === admin.id && tx.reason === TransactionReason.PlatformCommission) {
            summary[TransactionReason.PlatformCommission] = (summary[TransactionReason.PlatformCommission] || 0) + tx.amount;
        }
    });

    return summary;
  }, [transactions, users]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Finances</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Total Dépensé (Débit)">
          <p className="text-3xl font-bold text-red-500">{totalDebit.toLocaleString()} Coins</p>
        </Card>
        <Card title="Total Ajouté (Crédit)">
          <p className="text-3xl font-bold text-green-500">{totalCredit.toLocaleString()} Coins</p>
        </Card>
      </div>

      <Card title="Revenus par Type de Transaction">
        {Object.keys(incomeSummary).length > 0 ? (
            <div className="space-y-3">
            {Object.entries(incomeSummary)
                // FIX: The values from `Object.entries` on a `Partial` record can be `number | undefined`.
                // An arithmetic operation on `undefined` would cause a type error.
                // Coalescing to 0 ensures both sides of the subtraction are always numbers.
                .sort(([, totalA], [, totalB]) => (totalB ?? 0) - (totalA ?? 0))
                .map(([reason, total]) => (
                <div key={reason} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <span className="text-slate-600 dark:text-slate-300">{translateTransactionReason(reason as TransactionReason)}</span>
                    <span className="font-semibold text-slate-900 dark:text-white flex items-center">
                        <CoinIcon className="w-4 h-4 mr-2 text-yellow-500" />
                        {total?.toLocaleString()}
                    </span>
                </div>
                ))
            }
            </div>
        ) : (
            <p className="text-center text-slate-500 dark:text-slate-400 py-4">Aucun revenu généré pour le moment.</p>
        )}
      </Card>


      <Card title="Historique de toutes les Transactions">
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
              {transactions.map(tx => (
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
        </div>
      </Card>
    </div>
  );
};

export default Finance;