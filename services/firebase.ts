import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// ====================================================================================
//   !!! ACTION REQUISE : Configurez vos identifiants Firebase ici !!!
// ====================================================================================
//
//   Remplacez les valeurs ci-dessous par les identifiants de VOTRE projet Firebase.
//   Vous pouvez les trouver dans la console Firebase, dans les paramètres de votre projet.
//   (Project Settings > General > Your apps > Web app)
//
//   Le passage à cette configuration directe est nécessaire pour corriger l'erreur
//   "auth/invalid-api-key", car l'environnement d'exécution actuel ne prend pas
//   en charge les variables d'environnement pour la configuration de Firebase.
//
// ====================================================================================
const firebaseConfig = {
  apiKey: "VOTRE_CLE_API_FIREBASE",
  authDomain: "VOTRE-PROJET.firebaseapp.com",
  projectId: "VOTRE-ID-DE-PROJET",
  storageBucket: "VOTRE-PROJET.appspot.com",
  messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
  appId: "VOTRE_APP_ID"
};


// Le reste du code ne doit pas être modifié
// ------------------------------------------------------------------------------------

let app: firebase.app.App;

// Initialiser Firebase
if (!firebase.apps.length) {
  // Vérification simple pour s'assurer que les clés ont été remplacées
  if (firebaseConfig.apiKey.startsWith("VOTRE_")) {
      console.error("ERREUR: Veuillez configurer vos identifiants Firebase dans le fichier services/firebase.ts");
      // Affiche une erreur visible pour l'utilisateur
      const root = document.getElementById('root');
      if (root) {
        root.innerHTML = `
          <div style="padding: 2rem; text-align: center; font-family: sans-serif; background-color: #FFFBEB; border: 1px solid #FBBF24; border-radius: 0.5rem; margin: 2rem;">
            <h1 style="color: #92400E; font-size: 1.5rem;">Configuration Firebase Requise</h1>
            <p style="color: #B45309; margin-top: 1rem;">L'application ne peut pas démarrer. Veuillez configurer vos identifiants Firebase dans le fichier <strong>services/firebase.ts</strong>.</p>
          </div>
        `;
      }
  } else {
    app = firebase.initializeApp(firebaseConfig);
  }
} else {
  app = firebase.app();
}

if (!app) {
  throw new Error("Firebase n'a pas pu être initialisé. Veuillez vérifier votre firebaseConfig dans services/firebase.ts.");
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export const googleProvider = new firebase.auth.GoogleAuthProvider();