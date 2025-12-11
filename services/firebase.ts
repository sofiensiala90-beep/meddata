
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// Configuration de secours (Fallback)
// Ces valeurs sont utilisées UNIQUEMENT si les variables d'environnement ne sont pas détectées.
// Note : Les clés d'identification Firebase sont conçues pour être publiques dans les applications web.
// La sécurité des données est assurée par les règles de sécurité Firestore (Security Rules).
const fallbackConfig = {
  apiKey: "AIzaSyB2JSL4iJUd2yvMPkpZUfCSeB0NVBcm1Hg",
  authDomain: "medata-ai-2.firebaseapp.com",
  projectId: "medata-ai-2",
  storageBucket: "medata-ai-2.firebasestorage.app",
  messagingSenderId: "856896532990",
  appId: "1:856896532990:web:893e09a978a57779a510af"
};

// Fonction pour récupérer les variables d'environnement de manière sécurisée et compatible Vite
const getEnv = (key: string, viteKey: string, fallbackValue: string) => {
  let value = '';
  
  // 1. Essai via import.meta.env (Vite standard)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const env = (import.meta as any).env;
      if (viteKey === 'VITE_FIREBASE_API_KEY') value = env.VITE_FIREBASE_API_KEY;
      else if (viteKey === 'VITE_FIREBASE_AUTH_DOMAIN') value = env.VITE_FIREBASE_AUTH_DOMAIN;
      else if (viteKey === 'VITE_FIREBASE_PROJECT_ID') value = env.VITE_FIREBASE_PROJECT_ID;
      else if (viteKey === 'VITE_FIREBASE_STORAGE_BUCKET') value = env.VITE_FIREBASE_STORAGE_BUCKET;
      else if (viteKey === 'VITE_FIREBASE_MESSAGING_SENDER_ID') value = env.VITE_FIREBASE_MESSAGING_SENDER_ID;
      else if (viteKey === 'VITE_FIREBASE_APP_ID') value = env.VITE_FIREBASE_APP_ID;
    }
  } catch (e) {
    // Ignorer
  }

  // 2. Fallback sur process.env
  if (!value && typeof process !== 'undefined' && process.env) {
    // @ts-ignore
    value = process.env[viteKey] || process.env[key];
  }

  // 3. Utilisation de la valeur de secours si aucune variable n'est trouvée
  return value || fallbackValue;
};

// Récupération des clés (Env > Fallback)
const apiKey = getEnv('FIREBASE_API_KEY', 'VITE_FIREBASE_API_KEY', fallbackConfig.apiKey);
const authDomain = getEnv('FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_AUTH_DOMAIN', fallbackConfig.authDomain);
const projectId = getEnv('FIREBASE_PROJECT_ID', 'VITE_FIREBASE_PROJECT_ID', fallbackConfig.projectId);
const storageBucket = getEnv('FIREBASE_STORAGE_BUCKET', 'VITE_FIREBASE_STORAGE_BUCKET', fallbackConfig.storageBucket);
const messagingSenderId = getEnv('FIREBASE_MESSAGING_SENDER_ID', 'VITE_FIREBASE_MESSAGING_SENDER_ID', fallbackConfig.messagingSenderId);
const appId = getEnv('FIREBASE_APP_ID', 'VITE_FIREBASE_APP_ID', fallbackConfig.appId);

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId
};

console.log("Firebase Config Loaded.");

let app: firebase.app.App | null = null;

try {
    if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
    } else {
        app = firebase.app();
    }
} catch (error) {
    console.error("Erreur d'initialisation Firebase:", error);
}

// Exports sécurisés
export const auth = app ? app.auth() : {
    onAuthStateChanged: (cb: any) => () => {},
    currentUser: null,
    signInWithEmailAndPassword: () => Promise.reject(new Error("Firebase non configuré")),
    createUserWithEmailAndPassword: () => Promise.reject(new Error("Firebase non configuré")),
    sendPasswordResetEmail: () => Promise.reject(new Error("Firebase non configuré")),
    signOut: () => Promise.resolve(),
} as any;

export const db = app ? app.firestore() : {
    collection: () => ({
        doc: () => ({
            get: () => Promise.reject(new Error("Firebase non configuré")),
            set: () => Promise.reject(new Error("Firebase non configuré")),
            update: () => Promise.reject(new Error("Firebase non configuré")),
            delete: () => Promise.reject(new Error("Firebase non configuré")),
            onSnapshot: () => () => {},
        }),
        add: () => Promise.reject(new Error("Firebase non configuré")),
        where: () => ({
             get: () => Promise.reject(new Error("Firebase non configuré")),
             onSnapshot: () => () => {},
             limit: () => ({ get: () => Promise.reject(new Error("Firebase non configuré")) })
        })
    }),
    batch: () => ({
        set: () => {},
        update: () => {},
        delete: () => {},
        commit: () => Promise.reject(new Error("Firebase non configuré"))
    }),
    runTransaction: () => Promise.reject(new Error("Firebase non configuré"))
} as any;

// Export firebase namespace for FieldValue
export { firebase };
