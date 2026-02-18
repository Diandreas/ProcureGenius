#!/bin/bash
# ============================================================
# SCRIPT DE RELANCE VPS - CENTRE JULIANNA
# À exécuter sur : /home/centrejulianna-appback/htdocs/appback.centrejulianna.com
# ============================================================

set -e

echo ""
echo "=========================================="
echo "  RELANCE APPLICATION - CENTRE JULIANNA"
echo "=========================================="
echo ""

# 1. Vérifier qu'on est dans le bon répertoire
if [ ! -f "manage.py" ]; then
    echo "❌ Erreur : manage.py non trouvé"
    echo "   Allez dans le bon répertoire :"
    echo "   cd /home/centrejulianna-appback/htdocs/appback.centrejulianna.com"
    exit 1
fi

echo "📁 Répertoire : $(pwd)"
echo ""

# 2. Arrêter PM2 si déjà lancé
echo "🛑 [1/7] Arrêt des processus existants..."
pm2 delete all || true
echo "  ✅ Processus arrêtés"

# 3. Backend - Activer venv
echo "🐍 [2/7] Activation environnement Python..."
if [ ! -d "venv" ]; then
    echo "  Création du venv..."
    python3 -m venv venv
fi
source venv/bin/activate
echo "  ✅ venv activé"

# 4. Mise à jour dépendances Python
echo "📦 [3/7] Mise à jour dépendances Python..."
pip install -r requirements.txt -q || pip install -r requirements_production.txt -q
echo "  ✅ Dépendances Python à jour"

# 5. Mise à jour dépendances npm frontend
echo "📦 [4/7] Mise à jour dépendances npm frontend..."
cd frontend
npm install
cd ..
echo "  ✅ Dépendances npm à jour"

# 6. Migrations et fichiers statiques
echo "🗄️  [5/7] Migrations base de données..."
python manage.py migrate --noinput
echo "  ✅ Migrations appliquées"

echo "📁 [6/7] Collecte fichiers statiques..."
python manage.py collectstatic --noinput
echo "  ✅ Fichiers statiques collectés"

# 7. Démarrer avec PM2
echo "🚀 [7/7] Démarrage avec PM2..."
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "=========================================="
echo "  ✅ APPLICATION RELANCÉE !"
echo "=========================================="
echo ""
echo "🌐 URLs :"
echo "   Frontend : http://appback.centrejulianna.com:3000"
echo "   Backend  : http://appback.centrejulianna.com:8090"
echo "   Admin    : http://appback.centrejulianna.com:8090/admin"
echo ""
echo "📊 Vérification :"
pm2 status
echo ""
echo "📝 Voir les logs : pm2 logs"
echo ""
