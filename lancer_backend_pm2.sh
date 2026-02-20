#!/bin/bash
# ============================================================
# LANCER BACKEND UNIQUEMENT AVEC PM2 - CENTRE JULIANNA
# Port 8090
# ============================================================

cd /home/centrejulianna-appback/htdocs/appback.centrejulianna.com

echo "🛑 Arrêt des processus PM2 existants..."
pm2 delete all 2>/dev/null || true

echo "🐍 Activation du venv..."
source venv/bin/activate

echo "📦 Mise à jour des dépendances..."
pip install -r requirements.txt -q

echo "🗄️  Migrations..."
python manage.py migrate --noinput

echo "📁 Fichiers statiques..."
python manage.py collectstatic --noinput

echo "🚀 Démarrage du backend avec PM2..."
pm2 start ecosystem.config.js --only backend-django
pm2 save

echo ""
echo "=========================================="
echo "  ✅ BACKEND DÉMARRÉ !"
echo "=========================================="
echo ""
echo "Backend : http://appback.centrejulianna.com:8090"
echo "Admin   : http://appback.centrejulianna.com:8090/admin"
echo ""
pm2 status
echo ""
echo "📝 Voir les logs : pm2 logs backend-django"
echo ""
