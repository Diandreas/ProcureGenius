module.exports = {
  apps: [{
    name: 'procura-backend',
    script: '/home/mirlab-procura/htdocs/procura.mirlab.cloud/venv/bin/gunicorn',
    args: 'saas_procurement.wsgi:application --bind 127.0.0.1:8000 --workers 3 --timeout 120',
    cwd: '/home/mirlab-procura/htdocs/procura.mirlab.cloud',
    interpreter: 'none',
    env: {
      DJANGO_SETTINGS_MODULE: 'saas_procurement.settings',
      PATH: '/home/mirlab-procura/htdocs/procura.mirlab.cloud/venv/bin:/usr/bin:/bin',
      PYTHONPATH: '/home/mirlab-procura/htdocs/procura.mirlab.cloud',
    }
  }]
}
