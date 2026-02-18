// ============================================================
// Configuration PM2 - Centre de Santé Julianna
// Détection automatique du système d'exploitation
// ============================================================

const os = require('os');
const path = require('path');

// Détection automatique du chemin Python selon l'OS
const isWindows = os.platform() === 'win32';
const pythonPath = isWindows
  ? path.join(__dirname, 'venv', 'Scripts', 'python.exe')
  : path.join(__dirname, 'venv', 'bin', 'python');

console.log(`[PM2 Config] Système détecté: ${os.platform()}`);
console.log(`[PM2 Config] Interpréteur Python: ${pythonPath}`);

module.exports = {
  apps: [
    {
      name: 'backend-django',
      script: 'manage.py',
      args: 'runserver 0.0.0.0:8090',
      interpreter: pythonPath,
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        DJANGO_SETTINGS_MODULE: 'saas_procurement.settings',
        PYTHONUNBUFFERED: '1'
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'frontend-react',
      script: 'npm',
      args: 'start',
      cwd: path.join(__dirname, 'frontend'),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        FORCE_COLOR: '1'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
