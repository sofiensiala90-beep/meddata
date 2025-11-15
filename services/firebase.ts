import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCyNzR9hjwJrEAX0NI-wLNUVZ6mXvvKA08",
  authDomain: "medata-ai.firebaseapp.com",
  projectId: "medata-ai",
  storageBucket: "medata-ai.appspot.com",
  messagingSenderId: "409435781520",
  appId: "1:409435781520:web:9437bb293545955d585b15",
  measurementId: "G-X84MFJ24TQ"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export const googleProvider = new firebase.auth.GoogleAuthProvider();