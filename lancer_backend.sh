#!/bin/bash
# ============================================================
# LANCER BACKEND UNIQUEMENT - CENTRE JULIANNA
# Port 8090
# ============================================================

cd /home/centrejulianna-appback/htdocs/appback.centrejulianna.com

echo "🐍 Activation du venv..."
source venv/bin/activate

echo "🚀 Démarrage du backend Django sur le port 8090..."
echo ""
echo "Backend : http://appback.centrejulianna.com:8090"
echo "Admin   : http://appback.centrejulianna.com:8090/admin"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter"
echo ""

python manage.py runserver 0.0.0.0:8090
