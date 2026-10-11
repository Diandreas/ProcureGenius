import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

// Injecte dans build/service-worker.js la liste des fichiers JS/CSS du build et
// un identifiant de version : l'app entiere s'ouvre hors ligne, et chaque
// deploiement installe la nouvelle version du service worker.
// Exclus : les gros modules rarement utilises hors ligne (lecteur PDF, landing).
const PRECACHE_SKIP = /^assets\/(pdf\.worker|Landing|Help|Blog)[-.]/;
function precacheServiceWorker() {
  let outDir = 'build';
  return {
    name: 'procura-precache',
    apply: 'build',
    configResolved(config) { outDir = config.build.outDir; },
    writeBundle(_options, bundle) {
      const files = Object.keys(bundle)
        .filter((f) => /\.(js|css)$/.test(f) && !PRECACHE_SKIP.test(f))
        .map((f) => `/${f}`)
        .sort();
      const buildId = crypto.createHash('sha1').update(files.join('|')).digest('hex').slice(0, 10);
      const swPath = path.resolve(outDir, 'service-worker.js');
      if (!fs.existsSync(swPath)) return;
      const sw = fs.readFileSync(swPath, 'utf-8')
        .replace("const BUILD_ID = 'dev';", `const BUILD_ID = '${buildId}';`)
        .replace('const PRECACHE = [];', `const PRECACHE = ${JSON.stringify(files)};`);
      fs.writeFileSync(swPath, sw);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Configuration de l'URL du backend
  // En production: URL du backend Django
  // En développement: localhost pour le serveur de développement
  const BACKEND_URL = mode === 'production'
    ? ''  // URL relative - Nginx proxifie /api/ vers Django sur 127.0.0.1:8000
    : 'http://localhost:8000';  // URL du backend en développement

  // #region agent log
  console.log('[Vite Config] Mode:', mode, 'Backend URL:', BACKEND_URL);
  // #endregion

  return {
    plugins: [react(), precacheServiceWorker()],
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
      dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled'],
      alias: {
        react: 'react',
        'react-dom': 'react-dom'
      }
    },
    optimizeDeps: {
      include: ['react', 'react-dom', '@emotion/react', '@emotion/styled'],
      force: true
    }
  };
})