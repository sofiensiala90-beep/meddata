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
  // Updated prop type to handle async function returning a Promise.
  onCoinTransfer: (recipientEmail: string, amount: number) => Promise<boolean>;
}

const translateTransactionReason = (reason: TransactionReason): string => {
  switch (reason) {
    case TransactionReason.FormValidation:
      return 'Validation de formulaire';
    case TransactionReason.FormResponse:
      return 'Réponse au formulaire';
    case TransactionReason.AiRequest:
      return 'Requête IA';
    case TransactionReason.MonthlyFee:
      return 'Frais mensuels';
    case TransactionReason.ManualTopup:
      return 'Recharge manuelle';
    case TransactionReason.AdminAdjustment:
      return 'Ajustement Admin';
    case TransactionReason.FormPurchase:
        return "Achat de formulaire";
    case TransactionReason.ResponseBundlePurchase:
        return "Achat de réponses";
    case TransactionReason.FormSaleCommission:
        return "Commission sur vente (reçue)";
    case TransactionReason.PlatformCommission:
        return "Commission plateforme";
    case TransactionReason.COIN_TRANSFER_SENT:
        return "Transfert de coins (envoyé)";
    case TransactionReason.COIN_TRANSFER_RECEIVED:
        return "Transfert de coins (reçu)";
    case TransactionReason.PROMOTIONAL_GIFT:
        return "Cadeau Promotionnel";
    default:
      return (reason as string).replace(/_/g, ' ');
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
    
    // Use a delay to avoid checking on every keystroke and to allow DB query time
    const handler = setTimeout(async () => {
        const emailToFind = recipientEmail.toLowerCase().trim();
        
        if (emailToFind === user.email.toLowerCase()) {
             setRecipientName(null);
             setIsCheckingUser(false);
             return; 
        }

        // 1. Try finding in local list first (Fastest - works for Admins who have all users loaded)
        let recipient = users.find(u => u.email.toLowerCase() === emailToFind);

        // 2. If not found locally, Query Firestore (Necessary for Students who don't have the full user list)
        if (!recipient) {
            try {
                const snapshot = await db.collection('users')
                    .where('email', '==', emailToFind)
                    .limit(1)
                    .get();
                
                if (!snapshot.empty) {
                    recipient = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
                }
            } catch (err) {
                console.error("Error searching for user in wallet:", err);
            }
        }

        // 3. Verify eligibility (Must be a student and not self)
        if (recipient && recipient.id !== user.id) {
            setRecipientName(recipient.name);
            setError(''); // Clear previous errors if found
        } else {
            setRecipientName(null);
        }
        setIsCheckingUser(false);
    }, 600);

    return () => {
        clearTimeout(handler);
    };
  }, [recipientEmail, users, user.id, user.email]);

  const handleTransfer = () => {
    setError('');
    const transferAmount = parseInt(amount, 10);

    // Basic client-side validation
    if (!recipientEmail.trim() || !amount.trim()) {
      setError("Veuillez remplir l'e-mail du destinataire et le montant.");
      return;
    }
    if (isNaN(transferAmount) || transferAmount <= 0) {
      setError("Veuillez entrer un montant valide.");
      return;
    }
    if (transferAmount > user.coinBalance) {
        setError("Solde insuffisant.");
        return;
    }
    
    if (isCheckingUser) {
        setError("Veuillez patienter, recherche du destinataire...");
        return;
    }
    
    // Use the state populated by the effect
    if (!recipientName) {
      setError("Aucun étudiant trouvé avec cette adresse e-mail (ou c'est vous-même).");
      return;
    }

    // Show confirmation modal
    setConfirmation({
      isOpen: true,
      title: "Confirmer le transfert",
      message: (
        <p>
          Êtes-vous sûr de vouloir transférer <strong className="font-bold">{transferAmount} coins</strong> à <strong className="font-bold">{recipientName}</strong> ({recipientEmail}) ?
        </p>
      ),
      onConfirm: async () => {
        // The core logic is in App.tsx
        const success = await onCoinTransfer(recipientEmail.trim(), transferAmount);
        if (success) {
          setRecipientEmail('');
          setAmount('');
          setRecipientName(null);
        }
        setConfirmation(null);
      },
      onClose: () => setConfirmation(null),
      variant: 'primary',
      confirmText: 'Confirmer et transférer'
    });
  };

  return (
    <>
      <div className="space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Mon Portefeuille</h2>
        
        <Card>
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-6">
              <CoinIcon className="w-16 h-16 text-yellow-400 dark:text-yellow-300" />
              <div>
                <p className="text-slate-500 dark:text-slate-400">Solde Actuel</p>
                <p className={`text-5xl font-bold ${user.coinBalance < 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                  {user.role === 'admin' ? '∞' : user.coinBalance.toLocaleString()} Coins
                </p>
              </div>
            </div>
            <Button onClick={() => alert('La fonctionnalité d\'achat sera bientôt disponible !')}>Acheter des Coins</Button>
          </div>
        </Card>

        {user.role === 'student' && (
          <Card title="Transférer des Coins">
            <div className="space-y-4">
              <div>
                <label htmlFor="recipientEmail" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  E-mail du destinataire
                </label>
                <input
                  type="email"
                  id="recipientEmail"
                  value={recipientEmail}
                  onChange={(e) => {
                    setRecipientEmail(e.target.value)
                    if (error) setError('');
                  }}
                  placeholder="exemple@email.com"
                  className="mt-1 block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
                {isCheckingUser && (
                    <div className="mt-2 text-sm text-slate-500 italic">Recherche du destinataire...</div>
                )}
                {!isCheckingUser && recipientName && (
                  <div className="mt-2 text-sm text-green-700 dark:text-green-300 p-2 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-700">
                    Destinataire trouvé : <span className="font-semibold">{recipientName}</span>
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Montant à transférer
                </label>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    if (error) setError('');
                  }}
                  placeholder="100"
                  min="10"
                  className="mt-1 block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Le montant minimum pour un transfert est de 10 coins.
                </p>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="text-right">
                <Button onClick={handleTransfer} disabled={isCheckingUser || (!!recipientEmail && !recipientName && !isCheckingUser)}>
                  Transférer
                </Button>
              </div>
            </div>
          </Card>
        )}

        <Card title="Historique des Transactions">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Description</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Montant</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {[...transactions].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(tx => (
                  <tr key={tx.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(tx.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      <div className="font-medium text-slate-900 dark:text-white">{translateTransactionReason(tx.reason)}</div>
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
      {confirmation && <ConfirmationModal {...confirmation} />}
    </>
  );
};

export default Wallet;