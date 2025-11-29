import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement (comme API_KEY sur Vercel)
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Remplace process.env.API_KEY par la vraie valeur lors du build
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Empêche certaines librairies de planter si elles cherchent process.env
      'process.env': JSON.stringify({}),
    },
    build: {
      // Augmente la limite pour éviter le warning "chunk size limit"
      chunkSizeWarningLimit: 1600,
    },
  };
});