import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement (comme API_KEY définie sur Vercel)
  // Le 3ème argument '' permet de charger toutes les variables, pas seulement celles commençant par VITE_
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Remplace 'process.env.API_KEY' dans le code par la valeur réelle de la clé lors du build
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    build: {
      // Augmente la limite pour éviter l'avertissement "Chunk size limit" dans les logs Vercel
      chunkSizeWarningLimit: 1600,
    },
  };
});