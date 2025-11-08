import React, { useState } from 'react';
import { User } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import LogoIcon from '../components/icons/LogoIcon';

interface AuthPageProps {
  onLogin: (user: User) => void;
  users: User[];
}

const getStatusInfo = (status: User['status']) => {
    switch (status) {
        case 'active':
            return { text: 'Actif', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
        case 'suspended_payment':
            return { text: 'Suspendu (Paiement)', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
        case 'suspended_manual':
            return { text: 'Suspendu (Admin)', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
        default:
            return { text: 'Inconnu', className: 'bg-slate-100 text-slate-800' };
    }
};

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, users }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const demoStudentUsers = users.filter(u => ['user-1', 'user-5', 'user-4'].includes(u.id));
  const demoAdminUser = users.find(u => u.id === 'user-2');

  // --- LocalStorage helpers to remember who accepted the terms ---
  const getAcceptedUsers = (): string[] => {
    const accepted = localStorage.getItem('termsAcceptedUsers');
    return accepted ? JSON.parse(accepted) : [];
  };

  const addAcceptedUser = (userId: string) => {
    const accepted = getAcceptedUsers();
    if (!accepted.includes(userId)) {
      localStorage.setItem('termsAcceptedUsers', JSON.stringify([...accepted, userId]));
    }
  };
  // ---

  const handleSelectUser = (user: User) => {
    // If user has accepted terms before, log in directly
    if (getAcceptedUsers().includes(user.id)) {
      onLogin(user);
    } else {
      // Otherwise, show the terms page
      setSelectedUser(user);
      setTermsAccepted(false);
    }
  };

  const handleLogin = () => {
    if (selectedUser) {
      addAcceptedUser(selectedUser.id);
      onLogin(selectedUser);
    }
  };
  
  const UserSelectionCard: React.FC<{user: User}> = ({ user }) => {
    const statusInfo = user.role === 'student' ? getStatusInfo(user.status) : {text: 'Admin', className: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'};
    return (
        <button onClick={() => handleSelectUser(user)} className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
             <div className="flex justify-between items-center">
                 <p className="font-semibold text-slate-900 dark:text-white">{user.name}</p>
                 <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.className}`}>
                  {statusInfo.text}
                </span>
             </div>
             <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
        </button>
    );
  };

  const renderUserSelection = () => (
    <Card>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Bienvenue sur MedataAI</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Sélectionnez un profil pour commencer.
        </p>
      </div>
      <div className="mt-8 space-y-3">
          {demoStudentUsers.map(user => <UserSelectionCard key={user.id} user={user} />)}
          {demoAdminUser && <UserSelectionCard user={demoAdminUser} />}
      </div>
    </Card>
  );

  const renderTerms = () => {
    if (!selectedUser) return null;
    return (
      <Card>
        <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white">Conditions d'Utilisation</h2>
        <div className="mt-4 p-4 h-64 overflow-y-auto bg-slate-100 dark:bg-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 space-y-3">
            <p><strong>1. Utilisation responsable</strong><br/>Vous vous engagez à utiliser MedataAI uniquement à des fins pédagogiques et scientifiques. Toute utilisation abusive, frauduleuse ou contraire à l’éthique médicale est strictement interdite.</p>
            <p><strong>2. Propriété intellectuelle</strong><br/>Les formulaires, analyses et contenus générés par l’IA sont protégés par les droits de propriété intellectuelle. Vous ne pouvez pas revendre, redistribuer ou reproduire tout ou partie du contenu de MedataAI sans autorisation écrite préalable.</p>
            <p><strong>3. Monnaie virtuelle (Coins)</strong><br/>Les actions payantes (création, publication, analyse, etc.) sont déduites de votre solde de coins. Un frais mensuel fixe de 50 coins est automatiquement prélevé tous les 30 jours à partir de la date de création du compte. Ce frais permet de maintenir votre accès aux services et au stockage de vos formulaires. Toutes les transactions de coins sont définitives et non remboursables.</p>
            <p><strong>4. Comportement et respect</strong><br/>Tout comportement inapproprié, contenu offensant ou tentative de piratage entraînera la suspension immédiate du compte, sans préavis.</p>
            <p><strong>5. Protection et utilisation des données</strong><br/>Les informations saisies dans vos formulaires ou partagées sur la plateforme sont stockées de manière sécurisée et chiffrée.<br/><br/>MedataAI peut utiliser les données des formulaires à des fins statistiques, de recherche, d’amélioration des services ou de développement scientifique.<br/><br/>Toutes les données utilisées à ces fins sont entièrement anonymisées : aucune information ne permet d’identifier un utilisateur, un patient ou une institution.<br/><br/>MedataAI peut regrouper, analyser et commercialiser ces données statistiques anonymisées auprès de partenaires académiques, industriels ou institutionnels, dans le strict respect de l’anonymat et des réglementations en vigueur.<br/><br/>Les analyses générées par les utilisateurs à partir de leurs propres formulaires restent leur propriété exclusive et ne seront jamais exploitées par MedataAI sans accord explicite.</p>
            <p><strong>6. Évolution du service</strong><br/>MedataAI se réserve le droit de modifier ses fonctionnalités, ses tarifs ou ses conditions d’utilisation à tout moment. Les utilisateurs seront notifiés de tout changement majeur affectant leurs droits ou leur expérience.</p>
            <p><strong>7. Acceptation des conditions</strong><br/>L’inscription et l’utilisation de la plateforme impliquent l’acceptation pleine et entière des présentes conditions d’utilisation.</p>
        </div>
        <div className="mt-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="h-4 w-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
            />
            <span className="ml-2 text-slate-700 dark:text-slate-200">En cochant cette case, je reconnais avoir lu et accepté les règles d’utilisation de MedataAI.</span>
          </label>
        </div>
        <div className="mt-6 flex justify-between">
          <Button variant="secondary" onClick={() => setSelectedUser(null)}>Retour</Button>
          <Button onClick={handleLogin} disabled={!termsAccepted}>
            Se connecter en tant que {selectedUser.name.split(' ')[0]}
          </Button>
        </div>
      </Card>
    );
  };
  
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-center mb-6">
          <LogoIcon className="h-24 w-auto" />
        </div>
        {selectedUser ? renderTerms() : renderUserSelection()}
      </div>
    </div>
  );
};

export default AuthPage;