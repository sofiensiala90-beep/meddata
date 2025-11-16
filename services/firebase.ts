import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// ====================================================================================
// ====================================================================================
//
//   ACTION REQUISE : VEUILLEZ COLLER VOTRE CONFIGURATION FIREBASE CI-DESSOUS
//
//   Vous devez remplacer les lignes ci-dessous (celles qui commencent par "REMPLACEZ...")
//   par l'objet `firebaseConfig` que vous avez obtenu sur le site de Firebase.
//
//   L'application ne peut pas fonctionner sans ces clés.
//
//   Une fois que vous l'aurez collé, le problème sera résolu.
//
// ====================================================================================
// ====================================================================================
const firebaseConfig = {
  apiKey: "REMPLACEZ_PAR_VOTRE_API_KEY",
  authDomain: "REMPLACEZ_PAR_VOTRE_AUTH_DOMAIN",
  projectId: "REMPLACEZ_PAR_VOTRE_PROJECT_ID",
  storageBucket: "REMPLACEZ_PAR_VOTRE_STORAGE_BUCKET",
  messagingSenderId: "REMPLACEZ_PAR_VOTRE_MESSAGING_SENDER_ID",
  appId: "REMPLACEZ_PAR_VOTRE_APP_ID",
};


// Le reste du code ne doit pas être modifié
// ------------------------------------------------------------------------------------

let app: firebase.app.App | null = null;

// Initialiser Firebase
if (!firebase.apps.length) {
  // Vérification pour s'assurer que les valeurs ont été changées
  if (firebaseConfig.apiKey.startsWith("REMPLACEZ_PAR")) {
    // Ne rien faire, l'erreur sera lancée plus bas.
    console.error("ERREUR : La configuration Firebase est manquante dans le fichier 'services/firebase.ts'. Veuillez suivre les instructions dans ce fichier pour ajouter vos clés.");
  } else {
    app = firebase.initializeApp(firebaseConfig);
  }
} else {
    app = firebase.app();
}

if (!app) {
  // L'application ne peut pas continuer sans Firebase.
  // Ceci bloque l'application et montre une erreur claire à l'écran et dans la console.
  document.body.innerHTML = `<div style="font-family: sans-serif; padding: 2rem; text-align: center; background-color: #FFFBEB; color: #92400E; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box;"><h1 style="font-size: 1.5rem; font-weight: bold;">Erreur de Configuration Firebase</h1><p style="margin-top: 1rem;">L'application n'a pas pu démarrer.</p><p style="margin-top: 0.5rem;">Veuillez fournir votre objet de configuration Firebase dans le fichier <strong>services/firebase.ts</strong>.</p></div>`;
  throw new Error("Firebase n'a pas pu être initialisé. Assurez-vous d'avoir bien collé votre `firebaseConfig` dans le fichier `services/firebase.ts`.");
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export const googleProvider = new firebase.auth.GoogleAuthProvider();
