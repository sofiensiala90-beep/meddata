import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Charge toutes les variables d'environnement (y compris API_KEY de Vercel)
  // Le 3ème argument '' permet de charger TOUTES les variables, pas seulement celles commençant par VITE_
  // Fix: Cast process to any to avoid TS error about cwd missing on Process type
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // 1. Polyfill pour 'process.env' : Crée un objet vide pour éviter le crash "process is not defined"
      // utilisé par certaines librairies (comme Firebase compat).
      'process.env': {},
      
      // 2. Definition de process.env.API_KEY pour le client Google GenAI
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
    },
    build: {
      // Augmente la limite d'avertissement pour la taille des fichiers
      chunkSizeWarningLimit: 1600,
      target: 'esnext',
      rollupOptions: {
        output: {
          // Optimisation : Sépare les grosses librairies dans des fichiers distincts
          // Cela permet au navigateur de les charger en parallèle et évite le warning "Large chunks"
          manualChunks: {
            vendor: ['react', 'react-dom'],
            firebase: ['firebase/compat/app', 'firebase/compat/auth', 'firebase/compat/firestore'],
            genai: ['@google/genai'],
            ui: ['react-markdown'], // Exemple d'autre lib UI si utilisée
          },
        },
      },
    },
  };
});