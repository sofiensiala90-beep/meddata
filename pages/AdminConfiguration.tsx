import React, { useState } from 'react';
import { SystemSettings, User } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import CoinIcon from '../components/icons/CoinIcon';
import ConfirmationModal, { ConfirmationModalProps } from '../components/ConfirmationModal';

interface AdminConfigurationProps {
  settings: SystemSettings;
  users: User[];
  onUpdateSettings: (newSettings: SystemSettings) => Promise<void>;
  onCreditAllUsers: (amount: number, message: string) => Promise<void>;
}

const AdminConfiguration: React.FC<AdminConfigurationProps> = ({ settings, users, onUpdateSettings, onCreditAllUsers }) => {
  const [localSettings, setLocalSettings] = useState<SystemSettings>(JSON.parse(JSON.stringify(settings)));
  const [hasChanges, setHasChanges] = useState(false);
  
  // Promo states
  const [promoAmount, setPromoAmount] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationModalProps | null>(null);

  const handleSettingChange = (category: keyof SystemSettings, key: string, value: number) => {
    setLocalSettings(prev => {
      const newState = { ...prev };
      if (typeof newState[category] === 'object' && newState[category] !== null) {
        (newState[category] as any)[key] = value;
      } else {
        (newState as any)[category] = value;
      }
      return newState;
    });
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    await onUpdateSettings(localSettings);
    setHasChanges(false);
  };

  const handlePromoSubmit = () => {
    const amount = parseInt(promoAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      alert("Montant invalide.");
      return;
    }
    if (!promoMessage.trim()) {
      alert("Veuillez ajouter un message pour la notification.");
      return;
    }

    const studentCount = users.filter(u => u.role === 'student').length;

    setConfirmation({
      isOpen: true,
      title: "Confirmer la promotion de masse",
      message: (
        <div>
          <p>Vous êtes sur le point de créditer <strong>{amount} coins</strong> à <strong>{studentCount} étudiants</strong>.</p>
          <p className="mt-2 text-sm text-slate-500">Coût total généré : {(amount * studentCount).toLocaleString()} coins.</p>
          <p className="mt-2 font-semibold">Message envoyé :</p>
          <p className="italic text-slate-600">"{promoMessage}"</p>
        </div>
      ),
      onConfirm: async () => {
        await onCreditAllUsers(amount, promoMessage);
        setPromoAmount('');
        setPromoMessage('');
        setConfirmation(null);
      },
      onClose: () => setConfirmation(null),
      variant: 'primary',
      confirmText: 'Lancer la promotion'
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Configuration Admin</h2>
      <p className="text-slate-600 dark:text-slate-400">Gérez la tarification de la plateforme et lancez des campagnes promotionnelles.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tarification */}
        <div className="space-y-6">
           <Card title="Tarification Actions Étudiants">
              <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Coût Validation Formulaire</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                        <input type="number" value={localSettings.coinCosts.validateForm} onChange={(e) => handleSettingChange('coinCosts', 'validateForm', parseInt(e.target.value))} className="focus:ring-primary-500 focus:border-primary-500 flex-1 block w-full rounded-l-md sm:text-sm border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                        <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-slate-300 bg-slate-50 dark:bg-slate-600 text-slate-500 dark:text-slate-300 text-sm">Coins</span>
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Coût Ajout Réponse</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                        <input type="number" value={localSettings.coinCosts.addResponse} onChange={(e) => handleSettingChange('coinCosts', 'addResponse', parseInt(e.target.value))} className="focus:ring-primary-500 focus:border-primary-500 flex-1 block w-full rounded-l-md sm:text-sm border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                        <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-slate-300 bg-slate-50 dark:bg-slate-600 text-slate-500 dark:text-slate-300 text-sm">Coins</span>
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Coût Analyse IA</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                        <input type="number" value={localSettings.coinCosts.aiAnalysis} onChange={(e) => handleSettingChange('coinCosts', 'aiAnalysis', parseInt(e.target.value))} className="focus:ring-primary-500 focus:border-primary-500 flex-1 block w-full rounded-l-md sm:text-sm border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                        <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-slate-300 bg-slate-50 dark:bg-slate-600 text-slate-500 dark:text-slate-300 text-sm">Coins</span>
                    </div>
                 </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Frais Mensuels</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                        <input type="number" value={localSettings.platformFees.monthly} onChange={(e) => handleSettingChange('platformFees', 'monthly', parseInt(e.target.value))} className="focus:ring-primary-500 focus:border-primary-500 flex-1 block w-full rounded-l-md sm:text-sm border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                        <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-slate-300 bg-slate-50 dark:bg-slate-600 text-slate-500 dark:text-slate-300 text-sm">Coins/Mois</span>
                    </div>
                 </div>
              </div>
           </Card>

           <Card title="Prix Bibliothèque & Bonus">
               <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Prix Vente Formulaire (Défaut)</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                        <input type="number" value={localSettings.libraryPrices.defaultFormPrice} onChange={(e) => handleSettingChange('libraryPrices', 'defaultFormPrice', parseInt(e.target.value))} className="focus:ring-primary-500 focus:border-primary-500 flex-1 block w-full rounded-l-md sm:text-sm border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                        <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-slate-300 bg-slate-50 dark:bg-slate-600 text-slate-500 dark:text-slate-300 text-sm">Coins</span>
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Prix Vente Réponse (Défaut)</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                        <input type="number" value={localSettings.libraryPrices.defaultPricePerResponse} onChange={(e) => handleSettingChange('libraryPrices', 'defaultPricePerResponse', parseInt(e.target.value))} className="focus:ring-primary-500 focus:border-primary-500 flex-1 block w-full rounded-l-md sm:text-sm border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                        <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-slate-300 bg-slate-50 dark:bg-slate-600 text-slate-500 dark:text-slate-300 text-sm">Coins</span>
                    </div>
                 </div>
                 <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <label className="block text-sm font-bold text-green-700 dark:text-green-400">Bonus de Bienvenue (Nouveaux Inscrits)</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                        <input type="number" value={localSettings.welcomeBonus} onChange={(e) => handleSettingChange('welcomeBonus', 'welcomeBonus', parseInt(e.target.value))} className="focus:ring-primary-500 focus:border-primary-500 flex-1 block w-full rounded-l-md sm:text-sm border-green-300 dark:bg-slate-700 dark:border-green-800 dark:text-white" />
                        <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-green-300 bg-green-50 dark:bg-slate-600 text-green-700 dark:text-green-300 text-sm">Coins</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Ce montant sera crédité automatiquement à la création de tout nouveau compte étudiant.</p>
                 </div>
              </div>
           </Card>

           <div className="flex justify-end">
              <Button onClick={handleSaveSettings} disabled={!hasChanges}>
                 Enregistrer les tarifs
              </Button>
           </div>
        </div>

        {/* Promotions */}
        <div className="space-y-6">
            <Card title="Cadeau Promo (Tous les utilisateurs)" className="border-2 border-primary-100 dark:border-primary-900">
                <div className="bg-primary-50 dark:bg-primary-900/30 p-4 rounded-lg mb-4">
                    <p className="text-sm text-primary-800 dark:text-primary-200">
                        Utilisez cette section pour envoyer des coins à <strong>tous les étudiants inscrits</strong> (ex: promotion de rentrée, dédommagement, fête...).
                    </p>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Montant du cadeau</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <CoinIcon className="h-5 w-5 text-yellow-500" />
                            </div>
                            <input type="number" value={promoAmount} onChange={(e) => setPromoAmount(e.target.value)} placeholder="Ex: 100" className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white rounded-md" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Message de notification</label>
                        <textarea rows={3} value={promoMessage} onChange={(e) => setPromoMessage(e.target.value)} placeholder="Ex: C'est la rentrée ! Profitez de 100 coins offerts pour créer vos formulaires." className="shadow-sm focus:ring-primary-500 focus:border-primary-500 mt-1 block w-full sm:text-sm border border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white rounded-md" />
                    </div>
                    <Button onClick={handlePromoSubmit} className="w-full justify-center">
                        Envoyer le cadeau à tous
                    </Button>
                </div>
            </Card>
        </div>
      </div>
      {confirmation && <ConfirmationModal {...confirmation} />}
    </div>
  );
};

export default AdminConfiguration;