import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Configuration de l'URL du backend
  // En production: URL du backend Django
  // En développement: localhost pour le serveur de développement
  const BACKEND_URL = mode === 'production'
    ? 'https://procura.srv696182.hstgr.cloud'  // URL du backend en production
    : 'http://localhost:8000';  // URL du backend en développement

  // #region agent log
  console.log('[Vite Config] Mode:', mode, 'Backend URL:', BACKEND_URL);
  // #endregion

  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: 'localhost',
      strictPort: true,
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 3000,
        clientPort: 3000,
      },
      proxy: {
        '/api': {
          target: BACKEND_URL,
          changeOrigin: true,
          secure: mode === 'production',
          // No rewrite needed - keep the /api prefix
        }
      },
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      }
    },
    // Définir l'URL du backend comme variable d'environnement pour le build
    define: {
      'import.meta.env.VITE_BACKEND_URL': JSON.stringify(BACKEND_URL),
    },
    build: {
      outDir: 'build',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: undefined,
          format: 'es',  // Format ES modules explicite
        }
      },
      assetsDir: 'assets',
      manifest: true,
      minify: 'esbuild',
      target: 'esnext',  // Cible moderne pour les modules ES
    },
    resolve: {
      dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled']
    },
    optimizeDeps: {
      include: ['react', 'react-dom', '@emotion/react', '@emotion/styled']
    }
  };
})