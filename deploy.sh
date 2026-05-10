#!/bin/bash
# deploy.sh — Déploiement unifié backend + frontend
# Usage: ./deploy.sh [--no-build] [--no-migrate]
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

NO_BUILD=false
NO_MIGRATE=false
for arg in "$@"; do
  case $arg in
    --no-build) NO_BUILD=true ;;
    --no-migrate) NO_MIGRATE=true ;;
  esac
done

echo "=== [1/5] Git fetch + reset hard ==="
git fetch origin
git reset --hard origin/boris

if [ "$NO_MIGRATE" = false ]; then
  echo "=== [2/5] Migrations Django ==="
  venv/bin/python manage.py migrate --noinput
  venv/bin/python manage.py collectstatic --noinput --clear
else
  echo "=== [2/5] Migrations skipped ==="
fi

if [ "$NO_BUILD" = false ]; then
  echo "=== [3/5] Build frontend ==="
  cd frontend
  npm ci --prefer-offline
  VITE_BACKEND_URL="" npm run build
  cd "$SCRIPT_DIR"
else
  echo "=== [3/5] Frontend build skipped ==="
fi

echo "=== [4/5] Redémarrage gunicorn ==="
pm2 restart backend-django

echo "=== [5/5] Statut PM2 ==="
pm2 status

echo ""
echo "Déploiement terminé. Frontend: /frontend/build  Backend: 127.0.0.1:8090"
