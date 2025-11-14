import React from 'react';
import Button from './Button';
import WarningIcon from './icons/WarningIcon';
import CoinIcon from './icons/CoinIcon';

interface InsufficientFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToWallet: () => void;
  requiredAmount: number;
  currentBalance: number;
}

const InsufficientFundsModal: React.FC<InsufficientFundsModalProps> = ({
  isOpen,
  onClose,
  onNavigateToWallet,
  requiredAmount,
  currentBalance,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900/50">
                <WarningIcon className="h-10 w-10 text-yellow-500 dark:text-yellow-400" />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-slate-900 dark:text-white">Solde Insuffisant</h3>
            <div className="mt-3 text-sm text-slate-600 dark:text-slate-300 space-y-3">
              <p>Vous n'avez pas assez de coins pour effectuer cette action.</p>
              <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-left text-sm space-y-2">
                <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Coût de l'action :</span>
                    <span className="font-semibold text-red-500 flex items-center">{requiredAmount} <CoinIcon className="w-4 h-4 ml-1" /></span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Votre solde :</span>
                    <span className="font-semibold text-green-500 flex items-center">{currentBalance} <CoinIcon className="w-4 h-4 ml-1" /></span>
                </div>
              </div>
              <p>Veuillez recharger votre portefeuille pour continuer.</p>
            </div>
            <div className="mt-6 flex justify-center space-x-3">
              <Button onClick={onClose} variant="secondary">Fermer</Button>
              <Button onClick={onNavigateToWallet} variant="primary">Aller au Portefeuille</Button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default InsufficientFundsModal;
