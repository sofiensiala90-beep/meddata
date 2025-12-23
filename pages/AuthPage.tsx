
import React, { useState } from 'react';
import { User, MedicalField, SystemSettings } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import LogoIcon from '../components/icons/LogoIcon';
import TermsOfUseModal from '../components/TermsOfUseModal';
import { auth, db } from '../services/firebase';
import { mockAdminUser } from '../data/mockData';
import { DEFAULT_SETTINGS } from '../constants';

interface AuthPageProps {
  onLogin: (user: User) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'signup' | 'reset_password'>('login');
  const [isLoading, setIsLoading] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Signup state
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    university: '',
    field: MedicalField.Medicine,
    studyYear: 1,
    phoneNumber: '',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  // Password Reset state
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resetMessage, setResetMessage] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    try {
      await auth.signInWithEmailAndPassword(loginEmail.trim(), loginPassword);
      // Login successful, App.tsx will handle state change via onAuthStateChanged
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setLoginError('Adresse e-mail ou mot de passe incorrect.');
      } else {
        setLoginError(`Une erreur est survenue : ${error.message}`);
      }
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
        setResetMessage('Veuillez entrer votre adresse e-mail.');
        setResetStatus('error');
        return;
    }

    setResetStatus('loading');
    setResetMessage('');

    try {
        await auth.sendPasswordResetEmail(resetEmail.trim());
        setResetStatus('success');
        setResetMessage('Un e-mail de réinitialisation a été envoyé. Vérifiez votre boîte de réception (et vos spams).');
    } catch (error: any) {
        setResetStatus('error');
        if (error.code === 'auth/user-not-found') {
            setResetMessage('Aucun compte ne correspond à cette adresse e-mail.');
        } else if (error.code === 'auth/invalid-email') {
             setResetMessage('Adresse e-mail invalide.');
        } else {
            setResetMessage(`Erreur : ${error.message}`);
        }
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');

    const { name, email, password, confirmPassword, university, studyYear, phoneNumber } = signupData;

    if (!name || !email || !university || !studyYear || !phoneNumber) {
        setSignupError('Tous les champs sont obligatoires.');
        return;
    }

    if (!password || !confirmPassword) {
        setSignupError('Veuillez saisir et confirmer votre mot de passe.');
        return;
    }
    if (password.length < 8) {
        setSignupError('Le mot de passe doit contenir au moins 8 caractères.');
        return;
    }
    if (password !== confirmPassword) {
        setSignupError('Les mots de passe ne correspondent pas.');
        return;
    }

    if (!termsAccepted) {
        setSignupError("Vous devez accepter les conditions d'utilisation.");
        return;
    }

    setIsLoading(true);
    try {
      // Create auth user
      const userCredential = await auth.createUserWithEmailAndPassword(signupData.email.trim(), signupData.password);
      const user = userCredential.user;
      
      if (user) {
          const usersCollection = db.collection('users');
          const isAdmin = signupData.email.trim().toLowerCase() === mockAdminUser.email.toLowerCase();

          // Fetch current system settings to get welcome bonus
          let welcomeBonus = DEFAULT_SETTINGS.welcomeBonus;
          try {
              const settingsDoc = await db.collection('settings').doc('general').get();
              if (settingsDoc.exists) {
                  const settings = settingsDoc.data() as SystemSettings;
                  welcomeBonus = settings.welcomeBonus;
              }
          } catch (err) {
              console.error("Failed to fetch settings for welcome bonus, using default", err);
          }

          const role = isAdmin ? 'admin' : 'student';
          const coinBalance = isAdmin ? Infinity : welcomeBonus;
          const welcomeMessage = isAdmin 
            ? 'Bienvenue, Administrateur !'
            : `Bienvenue sur DASS ! Votre solde de départ est de ${welcomeBonus} coins.`;

          const newUser: Omit<User, 'id' | 'password'> = {
              name: signupData.name,
              email: signupData.email.trim().toLowerCase(),
              university: signupData.university,
              field: signupData.field,
              studyYear: Number(signupData.studyYear),
              phoneNumber: signupData.phoneNumber,
              createdAt: new Date().toISOString(),
              role: role,
              coinBalance: coinBalance,
              status: 'active',
          };

          await usersCollection.doc(user.uid).set(newUser);
          
          await db.collection('notifications').add({
              userId: user.uid,
              message: welcomeMessage,
              read: false,
              createdAt: new Date().toISOString(),
          });
          
           await db.collection('activities').add({
              userId: user.uid,
              type: 'ACCOUNT_CREATED',
              details: `Compte créé pour ${newUser.name} sur la plateforme DASS.`,
              createdAt: new Date().toISOString(),
          });

          // Reload to ensure fresh state in App.tsx
          window.location.reload();
      }
    } catch (error: any) {
        console.error("Erreur création compte:", error);
        if (error.code === 'auth/email-already-in-use') {
            setSignupError('Cette adresse e-mail est déjà utilisée. Essayez de vous connecter.');
        } else if (error.code === 'permission-denied') {
            setSignupError("Erreur de permission. Impossible de créer le profil.");
        } else {
            setSignupError(`Erreur : ${error.message}`);
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSignupData({
        ...signupData,
        [e.target.name]: e.target.value
    });
  };

  const renderResetPassword = () => (
    <Card>
        <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Réinitialisation</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Entrez votre e-mail pour recevoir un lien de réinitialisation.
            </p>
        </div>

        {resetStatus === 'success' ? (
             <div className="space-y-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-green-700 dark:text-green-300 text-sm">
                    {resetMessage}
                </div>
                <Button onClick={() => setView('login')} className="w-full">Retour à la connexion</Button>
            </div>
        ) : (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                {resetStatus === 'error' && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400 text-sm">
                        {resetMessage}
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Adresse e-mail</label>
                    <input 
                        type="email" 
                        value={resetEmail} 
                        onChange={e => { setResetEmail(e.target.value); setResetStatus('idle'); }} 
                        required 
                        className="mt-1 block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500" 
                    />
                </div>
                <Button type="submit" className="w-full" disabled={resetStatus === 'loading'}>
                    {resetStatus === 'loading' ? 'Envoi...' : 'Envoyer le lien'}
                </Button>
                <div className="text-center">
                    <button type="button" onClick={() => setView('login')} className="text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
                        Annuler et retourner à la connexion
                    </button>
                </div>
            </form>
        )}
    </Card>
  );

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
        
        {loginError && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800">
                <p className="font-bold">Erreur de connexion :</p>
                <p className="break-words">{loginError}</p>
            </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Adresse e-mail</label>
                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required className="mt-1 block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Mot de passe</label>
                <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required className="mt-1 block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                <div className="flex justify-end mt-1">
                    <button 
                        type="button" 
                        onClick={() => { setResetEmail(loginEmail); setView('reset_password'); }} 
                        className="text-xs font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
                    >
                        Mot de passe oublié ?
                    </button>
                </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Connexion...' : 'Se connecter'}</Button>
        </form>
    </Card>
  );

  const renderSignup = () => (
    <Card>
        <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Créer un compte
            </h2>
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
                    <input type="text" name="name" value={signupData.name} onChange={handleSignupChange} required className="mt-1 block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Adresse e-mail</label>
                    <input type="email" name="email" value={signupData.email} onChange={handleSignupChange} required className="mt-1 block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Mot de passe</label>
                <input type="password" name="password" value={signupData.password} onChange={handleSignupChange} required className="mt-1 block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">8 caractères minimum.</p>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Confirmez le mot de passe</label>
                <input type="password" name="confirmPassword" value={signupData.confirmPassword} onChange={handleSignupChange} required className="mt-1 block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            </div>
            
             <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Université (Faculté)</label>
                <input type="text" name="university" value={signupData.university} onChange={handleSignupChange} required className="mt-1 block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Filière</label>
                     <select name="field" value={signupData.field} onChange={handleSignupChange} className="mt-1 block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                        <option value={MedicalField.Medicine}>Médecine</option>
                        <option value={MedicalField.Pharmacy}>Pharmacie</option>
                        <option value={MedicalField.Dentistry}>Dentaire</option>
                        <option value={MedicalField.Other}>Autre</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Année d'étude</label>
                    <input type="number" name="studyYear" value={signupData.studyYear} onChange={handleSignupChange} min="1" max="10" required className="mt-1 block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Numéro de téléphone</label>
                <input type="tel" name="phoneNumber" value={signupData.phoneNumber} onChange={handleSignupChange} required className="mt-1 block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div className="pt-2">
              <label className="flex items-start">
                <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1 h-4 w-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500" />
                <span className="ml-2 text-sm text-slate-700 dark:text-slate-200">En créant un compte, je reconnais avoir lu et accepté les <a href="#" onClick={(e) => { e.preventDefault(); setIsTermsModalOpen(true); }} className="font-medium text-primary-600 hover:underline dark:text-primary-400">conditions d'utilisation</a> de DASS.</span>
              </label>
            </div>
            {signupError && <p className="text-sm text-red-500">{signupError}</p>}
            <Button type="submit" className="w-full !mt-5" disabled={!termsAccepted || isLoading}>{isLoading ? 'Création...' : 'Créer mon compte'}</Button>
        </form>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md mx-auto text-center mb-8">
        <div className="flex flex-col items-center justify-center">
          <LogoIcon className="h-28 w-auto drop-shadow-xl" />
          <h1 className="mt-6 text-5xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tighter">DASS</h1>
          <p className="text-base font-medium text-slate-500 dark:text-slate-400 tracking-wide mt-2">Data Analysis Statistical System</p>
          <div className="flex items-center gap-2 mt-4">
             <span className="h-px w-8 bg-primary-300 dark:bg-primary-700"></span>
             <p className="text-xs text-primary-600 dark:text-primary-400 font-bold tracking-widest uppercase">from JS GATE</p>
             <span className="h-px w-8 bg-primary-300 dark:bg-primary-700"></span>
          </div>
        </div>
      </div>
      
      <div className="w-full max-w-md mx-auto relative z-10">
        {view === 'login' && renderLogin()}
        {view === 'signup' && renderSignup()}
        {view === 'reset_password' && renderResetPassword()}
      </div>
      <TermsOfUseModal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} />
    </div>
  );
};

export default AuthPage;
