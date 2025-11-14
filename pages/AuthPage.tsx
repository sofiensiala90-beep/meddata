import React, { useState } from 'react';
import { User, MedicalField } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import LogoIcon from '../components/icons/LogoIcon';
import TermsOfUseModal from '../components/TermsOfUseModal';

interface AuthPageProps {
  onLogin: (user: User) => void;
  onCreateUser: (user: Omit<User, 'id' | 'createdAt' | 'role' | 'coinBalance' | 'status'>) => void;
  users: User[];
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onCreateUser, users }) => {
  const [view, setView] = useState<'login' | 'signup'>('login');
  
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Signup state
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    university: '',
    field: MedicalField.Medicine,
    studyYear: 1,
    phoneNumber: '',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const user = users.find(u => u.email.toLowerCase() === loginEmail.toLowerCase().trim());
    if (user && user.password === loginPassword) {
      onLogin(user);
    } else {
      setLoginError('Adresse e-mail ou mot de passe incorrect.');
    }
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');

    // Validation
    if (Object.values(signupData).some(value => value === '' || value === null)) {
        setSignupError('Tous les champs sont obligatoires.');
        return;
    }
    if (users.some(u => u.email.toLowerCase() === signupData.email.toLowerCase().trim())) {
        setSignupError('Cette adresse e-mail est déjà utilisée.');
        return;
    }
    if (signupData.password.length < 8) {
        setSignupError('Le mot de passe doit contenir au moins 8 caractères.');
        return;
    }
    if (!termsAccepted) {
        setSignupError("Vous devez accepter les conditions d'utilisation.");
        return;
    }

    onCreateUser({
      ...signupData,
      email: signupData.email.trim(),
      studyYear: Number(signupData.studyYear)
    });
  };

  const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSignupData({
        ...signupData,
        [e.target.name]: e.target.value
    });
  };

  const renderLogin = () => (
    <Card>
        <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Connexion</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Nouveau ici ?{' '}
                <button onClick={() => setView('signup')} className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
                    Créer un compte
                </button>
            </p>
        </div>
        <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Adresse e-mail</label>
                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Mot de passe</label>
                <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md" />
            </div>
            {loginError && <p className="text-sm text-red-500">{loginError}</p>}
            <Button type="submit" className="w-full">Se connecter</Button>
        </form>
    </Card>
  );

  const renderSignup = () => (
    <Card>
        <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Créer un compte</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Déjà un compte ?{' '}
                <button onClick={() => setView('login')} className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
                    Se connecter
                </button>
            </p>
        </div>
        <form onSubmit={handleSignupSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nom complet</label>
                    <input type="text" name="name" value={signupData.name} onChange={handleSignupChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Adresse e-mail</label>
                    <input type="email" name="email" value={signupData.email} onChange={handleSignupChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md" />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Mot de passe</label>
                <input type="password" name="password" value={signupData.password} onChange={handleSignupChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md" />
                 <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">8 caractères minimum.</p>
            </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Université (Faculté)</label>
                <input type="text" name="university" value={signupData.university} onChange={handleSignupChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Filière</label>
                     <select name="field" value={signupData.field} onChange={handleSignupChange} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md">
                        <option value={MedicalField.Medicine}>Médecine</option>
                        <option value={MedicalField.Pharmacy}>Pharmacie</option>
                        <option value={MedicalField.Dentistry}>Dentaire</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Année d'étude</label>
                    <input type="number" name="studyYear" value={signupData.studyYear} onChange={handleSignupChange} min="1" max="10" required className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md" />
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Numéro de téléphone</label>
                <input type="tel" name="phoneNumber" value={signupData.phoneNumber} onChange={handleSignupChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md" />
            </div>
            <div className="pt-2">
              <label className="flex items-start">
                <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1 h-4 w-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500" />
                <span className="ml-2 text-sm text-slate-700 dark:text-slate-200">En créant un compte, je reconnais avoir lu et accepté les <a href="#" onClick={(e) => { e.preventDefault(); setIsTermsModalOpen(true); }} className="font-medium text-primary-600 hover:underline dark:text-primary-400">conditions d'utilisation</a> de MedataAI.</span>
              </label>
            </div>
            {signupError && <p className="text-sm text-red-500">{signupError}</p>}
            <Button type="submit" className="w-full !mt-5" disabled={!termsAccepted}>Créer mon compte</Button>
        </form>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-center mb-6">
          <LogoIcon className="h-24 w-auto" />
        </div>
        {view === 'login' ? renderLogin() : renderSignup()}
      </div>
      <TermsOfUseModal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} />
    </div>
  );
};

export default AuthPage;