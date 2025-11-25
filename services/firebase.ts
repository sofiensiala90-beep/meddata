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
  apiKey: "AIzaSyB2JSL4iJUd2yvMPkpZUfCSeB0NVBcm1Hg",
  authDomain: "medata-ai-2.firebaseapp.com",
  projectId: "medata-ai-2",
  storageBucket: "medata-ai-2.firebasestorage.app",
  messagingSenderId: "856896532990",
  appId: "1:856896532990:web:893e09a978a57779a510af"
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
