import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement, y compris celles de Vercel (API_KEY)
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Injection sécurisée de la clé API. 
      // Vite remplacera 'process.env.API_KEY' par la valeur réelle lors du build.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
    },
    build: {
      chunkSizeWarningLimit: 1000, // Augmente la limite de warning
      rollupOptions: {
        output: {
          // Découpage manuel des bibliothèques lourdes pour optimiser le chargement et éviter le "Large chunk" warning
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-firebase': ['firebase/compat/app', 'firebase/compat/auth', 'firebase/compat/firestore'],
            'vendor-genai': ['@google/genai'],
            'vendor-ui': ['react-markdown'], 
          },
        },
      },
    },
  };
});