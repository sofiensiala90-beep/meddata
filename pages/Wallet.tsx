import React, { useState, useEffect } from 'react';
import { User, Transaction, TransactionType, TransactionReason } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import CoinIcon from '../components/icons/CoinIcon';
import ConfirmationModal, { ConfirmationModalProps } from '../components/ConfirmationModal';
import { db } from '../services/firebase';


interface WalletProps {
  user: User;
  transactions: Transaction[];
  users: User[];
  onCoinTransfer: (recipientEmail: string, amount: number) => Promise<boolean>;
}

const translateTransactionReason = (reason: TransactionReason): string => {
  switch (reason) {
    case TransactionReason.FormValidation: return 'Validation de formulaire';
    case TransactionReason.FormResponse: return 'Réponse au formulaire';
    case TransactionReason.AiRequest: return 'Analyse IA';
    case TransactionReason.MonthlyFee: return 'Frais mensuels';
    case TransactionReason.ManualTopup: return 'Recharge manuelle';
    case TransactionReason.AdminAdjustment: return 'Ajustement Admin';
    case TransactionReason.FormPurchase: return "Achat de formulaire";
    case TransactionReason.ResponseBundlePurchase: return "Achat de réponses";
    case TransactionReason.FormSaleCommission: return "Commission reçue";
    case TransactionReason.PlatformCommission: return "Commission plateforme";
    case TransactionReason.COIN_TRANSFER_SENT: return "Transfert envoyé";
    case TransactionReason.COIN_TRANSFER_RECEIVED: return "Transfert reçu";
    case TransactionReason.PROMOTIONAL_GIFT: return "Cadeau Promotionnel";
    default: return (reason as string).replace(/_/g, ' ');
  }
};

const Wallet: React.FC<WalletProps> = ({ user, transactions, users, onCoinTransfer }) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationModalProps | null>(null);
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [isCheckingUser, setIsCheckingUser] = useState(false);

  useEffect(() => {
    if (recipientEmail.trim() === '') {
        setRecipientName(null);
        setIsCheckingUser(false);
        return;
    }
    setIsCheckingUser(true);
    const handler = setTimeout(async () => {
        const emailToFind = recipientEmail.toLowerCase().trim();
        if (emailToFind === user.email.toLowerCase()) {
             setRecipientName(null);
             setIsCheckingUser(false);
             return; 
        }
        let recipient = users.find(u => u.email.toLowerCase() === emailToFind);
        if (!recipient) {
            try {
                const snapshot = await db.collection('users').where('email', '==', emailToFind).limit(1).get();
                if (!snapshot.empty) recipient = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
            } catch (err) { console.error(err); }
        }
        if (recipient && recipient.id !== user.id) {
            setRecipientName(recipient.name);
            setError('');
        } else {
            setRecipientName(null);
        }
        setIsCheckingUser(false);
    }, 600);
    return () => clearTimeout(handler);
  }, [recipientEmail, users, user.id, user.email]);

  const handleTransfer = () => {
    setError('');
    const transferAmount = parseInt(amount, 10);
    if (!recipientEmail.trim() || !amount.trim()) { setError("Remplissez tous les champs."); return; }
    if (isNaN(transferAmount) || transferAmount <= 0) { setError("Entrez un montant valide."); return; }
    if (transferAmount > user.coinBalance) { setError("Solde insuffisant."); return; }
    if (!recipientName) { setError("Étudiant introuvable."); return; }

    setConfirmation({
      isOpen: true,
      title: "Confirmer le transfert",
      message: <p>Transférer <strong className="font-bold">{transferAmount} coins</strong> à <strong className="font-bold">{recipientName}</strong> ?</p>,
      onConfirm: async () => {
        const success = await onCoinTransfer(recipientEmail.trim(), transferAmount);
        if (success) { setRecipientEmail(''); setAmount(''); setRecipientName(null); }
        setConfirmation(null);
      },
      onClose: () => setConfirmation(null),
      variant: 'primary',
      confirmText: 'Confirmer'
    });
  };

  const sortedTransactions = [...transactions].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <>
      <div className="space-y-6 max-w-5xl mx-auto pb-10">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Mon Portefeuille</h2>
        
        <Card className="!bg-gradient-to-br from-primary-600 to-primary-800 text-white border-none shadow-glow">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center space-x-5 w-full sm:w-auto">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                <CoinIcon className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-300" />
              </div>
              <div>
                <p className="text-primary-100 font-bold uppercase text-[10px] tracking-widest opacity-80">Solde Actuel</p>
                <p className="text-3xl sm:text-5xl font-black tracking-tighter leading-none">
                  {user.role === 'admin' ? '∞' : user.coinBalance.toLocaleString()} <span className="text-sm uppercase font-black opacity-60">Coins</span>
                </p>
              </div>
            </div>
            <Button 
                onClick={() => alert('Bientôt disponible !')} 
                className="w-full sm:w-auto !bg-white !text-primary-700 hover:!bg-primary-50 !py-4 sm:!py-2.5 shadow-xl font-black uppercase text-xs tracking-widest"
            >
                Acheter des Coins
            </Button>
          </div>
        </Card>

        {user.role === 'student' && (
          <Card title="Transférer des Coins">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">E-mail du destinataire</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="exemple@email.com"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary-500 font-medium"
                />
                {isCheckingUser && <div className="mt-2 text-xs text-slate-400 italic">Recherche...</div>}
                {!isCheckingUser && recipientName && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800 flex items-center">
                    <span className="text-green-600 mr-2">✅</span>
                    <span className="text-sm font-bold text-green-800 dark:text-green-300">Destinataire : {recipientName}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Montant</label>
                <div className="relative">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="100"
                        className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary-500 font-black text-lg"
                    />
                    <CoinIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-500" />
                </div>
              </div>
              {error && <p className="text-xs font-bold text-red-500 uppercase">{error}</p>}
              <Button onClick={handleTransfer} disabled={isCheckingUser || (!!recipientEmail && !recipientName)} className="w-full !py-4 font-black uppercase tracking-widest text-xs">
                Valider le transfert
              </Button>
            </div>
          </Card>
        )}

        <Card title="Historique des Transactions">
          {/* Table for Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
              <thead>
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {sortedTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-500 dark:text-slate-400">
                      {new Date(tx.createdAt).toLocaleDateString()} <span className="opacity-50 ml-1">{new Date(tx.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{translateTransactionReason(tx.reason)}</div>
                      {tx.details && <div className="text-[10px] font-bold text-slate-400 mt-0.5">{tx.details}</div>}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right text-base font-black ${tx.type === TransactionType.Credit ? 'text-green-500' : 'text-red-500'}`}>
                      {tx.type === TransactionType.Credit ? '+' : '-'}{tx.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* List for Mobile */}
          <div className="sm:hidden space-y-3">
             {sortedTransactions.length > 0 ? sortedTransactions.map(tx => (
                <div key={tx.id} className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                    <div className="min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{new Date(tx.createdAt).toLocaleString()}</p>
                        <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight truncate">{translateTransactionReason(tx.reason)}</p>
                        {tx.details && <p className="text-[9px] font-bold text-slate-400 truncate italic">"{tx.details}"</p>}
                    </div>
                    <div className={`text-sm font-black shrink-0 ml-3 ${tx.type === TransactionType.Credit ? 'text-green-500' : 'text-red-500'}`}>
                        {tx.type === TransactionType.Credit ? '+' : '-'}{tx.amount}
                    </div>
                </div>
             )) : (
                <p className="text-center py-6 text-sm text-slate-400 italic">Aucune transaction.</p>
             )}
          </div>
        </Card>
      </div>
      {confirmation && <ConfirmationModal {...confirmation} />}
    </>
  );
};

export default Wallet;