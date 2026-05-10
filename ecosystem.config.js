// ============================================================
// Configuration PM2 - Centre de Santé Julianna
// Production: gunicorn (Linux server)
// Dev: manage.py runserver (Windows local)
// ============================================================

const os = require('os');
const path = require('path');

const isWindows = os.platform() === 'win32';
const pythonPath = isWindows
  ? path.join(__dirname, 'venv', 'Scripts', 'python.exe')
  : path.join(__dirname, 'venv', 'bin', 'python');

const gunicornPath = isWindows
  ? path.join(__dirname, 'venv', 'Scripts', 'gunicorn.exe')
  : path.join(__dirname, 'venv', 'bin', 'gunicorn');

module.exports = {
  apps: [
    {
      name: 'backend-django',
      // Production (Linux): gunicorn ; Dev (Windows): manage.py runserver
      script: isWindows ? 'manage.py' : gunicornPath,
      args: isWindows
        ? 'runserver 0.0.0.0:8090'
        : 'saas_procurement.wsgi:application --bind 127.0.0.1:8090 --workers 2 --timeout 120',
      interpreter: pythonPath,
      exec_mode: 'fork',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      env: {
        DJANGO_SETTINGS_MODULE: 'saas_procurement.settings',
        PYTHONUNBUFFERED: '1'
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      time: true,
    }
  ]
};
