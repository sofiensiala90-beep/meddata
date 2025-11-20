import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// ====================================================================================
// !! ATTENTION SÉCURITÉ !!
// ====================================================================================
//
//   VOTRE CONFIGURATION EST MAINTENANT DANS CE FICHIER POUR QUE L'APPLICATION
//   FONCTIONNE IMMÉDIATEMENT DANS CET APERÇU.
//
//   NE PARTAGEZ PAS CE FICHIER ET NE L'AJOUTEZ PAS À UN DÉPÔT GIT PUBLIC.
//
//   LORS DU DÉPLOIEMENT SUR VERCEL, LA MEILLEURE PRATIQUE EST D'UTILISER LES
//   VARIABLES D'ENVIRONNEMENT COMME EXPLIQUÉ PRÉCÉDEMMENT.
//
// ====================================================================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};


// Le reste du code ne doit pas être modifié
// ------------------------------------------------------------------------------------

let app: firebase.app.App;

// Initialiser Firebase
if (!firebase.apps.length) {
  app = firebase.initializeApp(firebaseConfig);
} else {
  app = firebase.app();
}

if (!app) {
  throw new Error("Firebase n'a pas pu être initialisé.");
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export const googleProvider = new firebase.auth.GoogleAuthProvider();
