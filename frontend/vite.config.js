import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // #region agent log
  const proxyTarget = mode === 'production'
    ? 'https://procura.mirhosty.com'
    : 'http://localhost:8000';
  console.log('[Vite Config] Mode:', mode, 'Proxy target:', proxyTarget);
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
          target: proxyTarget,
          changeOrigin: true,
          secure: mode === 'production',
          // No rewrite needed - keep the /api prefix
        }
      },
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      }
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