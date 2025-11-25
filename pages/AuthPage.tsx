import React, { useState, useEffect } from 'react';
import { User, MedicalField } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import LogoIcon from '../components/icons/LogoIcon';
import TermsOfUseModal from '../components/TermsOfUseModal';
import GoogleIcon from '../components/icons/GoogleIcon';
import { auth, db, googleProvider } from '../services/firebase';
import { mockAdminUser } from '../data/mockData';
import firebase from 'firebase/compat/app';

interface AuthPageProps {
  onLogin: (user: User) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
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
  const [isCompletingGoogleSignup, setIsCompletingGoogleSignup] = useState(false);

  // Fonction utilitaire pour traiter un utilisateur Google
  const processGoogleUser = async (user: firebase.User) => {
    // Vérifier si l'utilisateur existe déjà dans Firestore
    const userDoc = await db.collection('users').doc(user.uid).get();

    if (!userDoc.exists) {
      // Nouvel utilisateur : pré-remplir le formulaire
      setSignupData(prev => ({
        ...prev,
        password: '',
        confirmPassword: '',
        name: user.displayName || '',
        email: user.email || '',
      }));
      setIsCompletingGoogleSignup(true);
      setView('signup');
    }
    // Si l'utilisateur existe, onAuthStateChanged dans App.tsx gère la connexion automatiquement.
  };

  // Gérer le retour de la redirection Google
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await auth.getRedirectResult();
        if (result && result.user) {
          setIsGoogleLoading(true);
          await processGoogleUser(result.user);
          setIsGoogleLoading(false);
        }
      } catch (error: any) {
        console.error("Erreur redirection Google:", error);
        setIsGoogleLoading(false);
        
        const currentDomain = window.location.hostname;
        if (error.code === 'auth/unauthorized-domain') {
           setLoginError(`Domaine non autorisé. Ajoutez EXACTEMENT ce domaine dans Firebase : "${currentDomain}"`);
        } else if (error.code === 'auth/account-exists-with-different-credential') {
           setLoginError("Un compte existe déjà avec cet email. Connectez-vous avec votre mot de passe.");
        } else {
           setLoginError(`Erreur de redirection : ${error.message}`);
        }
      }
    };
    checkRedirectResult();
  }, []);

  // Détecter si un utilisateur est déjà authentifié mais n'a pas de profil
  useEffect(() => {
    const timer = setTimeout(() => {
        if (auth.currentUser && !isCompletingGoogleSignup) {
            const user = auth.currentUser;
            setSignupData(prev => ({
                ...prev,
                name: user.displayName || prev.name,
                email: user.email || prev.email,
            }));
            setIsCompletingGoogleSignup(true);
            setView('signup');
        }
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    try {
      await auth.signInWithEmailAndPassword(loginEmail.trim(), loginPassword);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setLoginError('Adresse e-mail ou mot de passe incorrect.');
      } else {
        setLoginError(`Une erreur est survenue : ${error.message}`);
      }
      setIsLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setLoginError('');
    setSignupError('');
    setIsGoogleLoading(true);

    // Récupération des infos de l'environnement actuel pour le débogage
    const currentDomain = window.location.hostname;
    const currentProtocol = window.location.protocol;

    try {
      // Tentative standard via Popup
      const result = await auth.signInWithPopup(googleProvider);
      if (result.user) {
        await processGoogleUser(result.user);
      }
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      
      // Si le popup est bloqué, on essaie automatiquement la redirection
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        try {
             await auth.signInWithRedirect(googleProvider);
             return; // La redirection va recharger la page, on arrête l'exécution ici.
        } catch (redirectError: any) {
             // Si la redirection échoue aussi (souvent à cause du domaine), on affiche l'erreur
             setIsGoogleLoading(false);
             if (redirectError.code === 'auth/unauthorized-domain') {
                setLoginError(`DOMAINE NON AUTORISÉ. Vous devez ajouter "${currentDomain}" dans la console Firebase (Authentication > Settings > Authorized Domains).`);
             } else {
                setLoginError(`Impossible d'établir la connexion Google. Erreur : ${redirectError.message}`);
             }
             return;
        }
      }

      setIsGoogleLoading(false);

      // Gestion des erreurs spécifiques
      if (error.code === 'auth/unauthorized-domain') {
        setLoginError(`DOMAINE NON AUTORISÉ. Veuillez ajouter EXACTEMENT ce domaine : "${currentDomain}" dans la console Firebase (Authentication > Settings > Authorized Domains).`);
      } else if (error.code === 'auth/operation-not-supported-in-this-environment') {
        setLoginError(`Environnement non sécurisé (${currentProtocol}). Google exige HTTPS. Si vous êtes en local, utilisez localhost.`);
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        setLoginError('Un compte existe déjà avec cette adresse e-mail. Veuillez utiliser votre mot de passe.');
      } else {
        setLoginError(`Erreur Google (${error.code}): ${error.message}`);
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

    if (!isCompletingGoogleSignup) {
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
    }

    if (!termsAccepted) {
        setSignupError("Vous devez accepter les conditions d'utilisation.");
        return;
    }

    setIsLoading(true);
    try {
      let user;
      if (isCompletingGoogleSignup) {
        user = auth.currentUser;
        if (!user) throw new Error("Erreur de session. Veuillez réessayer.");
      } else {
        const userCredential = await auth.createUserWithEmailAndPassword(signupData.email.trim(), signupData.password);
        user = userCredential.user;
      }
      
      if (user) {
          const usersCollection = db.collection('users');
          const isAdmin = signupData.email.trim().toLowerCase() === mockAdminUser.email.toLowerCase();

          const role = isAdmin ? 'admin' : 'student';
          const coinBalance = isAdmin ? Infinity : 500;
          const welcomeMessage = isAdmin 
            ? 'Bienvenue, Administrateur !'
            : 'Bienvenue sur MedataAI ! Votre solde de départ est de 500 coins.';

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
              details: `Compte créé pour ${newUser.name}.`,
              createdAt: new Date().toISOString(),
          });

          // Forcer le rechargement pour être sûr que l'état est propre
          window.location.reload();
      }
    } catch (error: any) {
        console.error("Erreur création compte:", error);
        if (error.code === 'auth/email-already-in-use') {
            setSignupError('Cette adresse e-mail est déjà utilisée. Essayez de vous connecter.');
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
                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required className="mt-1 block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Mot de passe</label>
                <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required className="mt-1 block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            {loginError && (
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800 break-words">
                    <span className="font-bold block mb-1">Erreur :</span>
                    {loginError}
                </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>{isLoading ? 'Connexion...' : 'Se connecter'}</Button>
        </form>
        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300 dark:border-slate-600" />
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">OU</span>
            </div>
        </div>
        <Button
            onClick={handleGoogleSignIn}
            variant="secondary"
            className="w-full flex items-center justify-center"
            disabled={isGoogleLoading || isLoading}
        >
            {isGoogleLoading ? (
                'Connexion Google en cours...'
            ) : (
                <>
                    <GoogleIcon className="w-5 h-5 mr-3" />
                    Continuer avec Google
                </>
            )}
        </Button>
    </Card>
  );

  const renderSignup = () => (
    <Card>
        <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isCompletingGoogleSignup ? 'Finaliser votre inscription' : 'Créer un compte'}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {isCompletingGoogleSignup ? (
                  'Veuillez compléter les informations suivantes.'
                ) : (
                  <>
                    Déjà un compte ?{' '}
                    <button onClick={() => setView('login')} className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
                        Se connecter
                    </button>
                  </>
                )}
            </p>
        </div>
        <form onSubmit={handleSignupSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nom complet</label>
                    <input type="text" name="name" value={signupData.name} onChange={handleSignupChange} required className="mt-1 block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500" disabled={isCompletingGoogleSignup} />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Adresse e-mail</label>
                    <input type="email" name="email" value={signupData.email} onChange={handleSignupChange} required className="mt-1 block w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500" disabled={isCompletingGoogleSignup}/>
                </div>
            </div>
            {!isCompletingGoogleSignup && (
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
            )}
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
                <span className="ml-2 text-sm text-slate-700 dark:text-slate-200">En créant un compte, je reconnais avoir lu et accepté les <a href="#" onClick={(e) => { e.preventDefault(); setIsTermsModalOpen(true); }} className="font-medium text-primary-600 hover:underline dark:text-primary-400">conditions d'utilisation</a> de MedataAI.</span>
              </label>
            </div>
            {signupError && <p className="text-sm text-red-500">{signupError}</p>}
            <Button type="submit" className="w-full !mt-5" disabled={!termsAccepted || isLoading}>{isLoading ? 'Création...' : 'Créer mon compte'}</Button>
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