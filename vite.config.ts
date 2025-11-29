
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement (comme API_KEY sur Vercel)
  // Le cast (process as any) évite les erreurs TS si @types/node manque
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Remplace process.env.API_KEY par la valeur de la variable d'env lors du build
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Définit process.env comme un objet vide pour les libs qui l'appellent sans vérifier, 
      // SAUF si c'est pour accéder à API_KEY qui est géré au-dessus.
      'process.env': JSON.stringify({}),
    },
    build: {
      // Augmente la limite de taille pour éviter l'avertissement "chunk size limit"
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // Sépare les grosses librairies pour alléger le chargement initial
              if (id.includes('firebase')) return 'firebase';
              if (id.includes('@google/genai')) return 'genai';
              if (id.includes('react')) return 'vendor';
            }
          },
        },
      },
    },
  };
});
