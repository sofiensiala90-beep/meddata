import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Charge toutes les variables d'environnement (y compris API_KEY de Vercel)
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Cette ligne est CRUCIALE pour éviter l'écran blanc "process is not defined"
      'process.env': {},
      // Injection spécifique de la clé API
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    build: {
      chunkSizeWarningLimit: 1600,
      target: 'esnext',
    },
  };
});