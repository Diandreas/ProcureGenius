#!/bin/bash
# ============================================================
# SCRIPT DE DÉPLOIEMENT AUTOMATIQUE VPS
# Centre de Santé Julianna
# ============================================================

set -e  # Arrêter en cas d'erreur

echo ""
echo "=========================================="
echo "  DÉPLOIEMENT VPS - CENTRE JULIANNA"
echo "=========================================="
echo ""

# Variables (à modifier selon votre configuration)
APP_DIR="/var/www/julianna"
VENV_DIR="$APP_DIR/venv"
BACKEND_PORT=8090
FRONTEND_PORT=3000

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "manage.py" ]; then
    echo "❌ Erreur : manage.py non trouvé"
    echo "   Exécutez ce script depuis la racine du projet"
    exit 1
fi

# 1. Mise à jour du code
echo "📥 [1/8] Mise à jour du code Git..."
if [ -d ".git" ]; then
    git pull origin main || git pull origin master
    echo "  ✅ Code mis à jour"
else
    echo "  ⚠️  Pas de dépôt Git détecté (normal si upload manuel)"
fi

# 2. Backend - Environnement virtuel
echo "🐍 [2/8] Configuration de l'environnement Python..."
if [ ! -d "$VENV_DIR" ]; then
    echo "  Création du venv..."
    python3 -m venv venv
fi
source venv/bin/activate
echo "  ✅ Environnement virtuel activé"

# 3. Installation des dépendances Python
echo "📦 [3/8] Installation des dépendances Python..."
pip install --upgrade pip -q
pip install -r requirements_production.txt -q
echo "  ✅ Dépendances Python installées"

# 4. Installation des dépendances npm
echo "📦 [4/8] Installation des dépendances npm..."
if [ ! -d "node_modules" ]; then
    npm install
fi
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ..
echo "  ✅ Dépendances npm installées"

# 5. Vérifier le fichier .env
echo "⚙️  [5/8] Vérification de la configuration..."
if [ ! -f ".env" ]; then
    echo "  ⚠️  Fichier .env non trouvé"
    echo "  📝 Création d'un fichier .env d'exemple..."
    cat > .env << 'EOF'
DEBUG=False
SECRET_KEY=CHANGEZ_CETTE_CLE_SUPER_SECRETE_EN_PRODUCTION
ALLOWED_HOSTS=localhost,127.0.0.1,votre-ip-vps
DATABASE_ENGINE=django.db.backends.postgresql
DATABASE_NAME=julianna_db
DATABASE_USER=julianna_user
DATABASE_PASSWORD=VotreMotDePasse
DATABASE_HOST=localhost
DATABASE_PORT=5432
BACKEND_PORT=8090
FRONTEND_PORT=3000
EOF
    echo "  ⚠️  IMPORTANT : Éditez le fichier .env avant de continuer !"
    echo "     nano .env"
    exit 1
fi

if [ ! -f "frontend/.env" ]; then
    echo "  📝 Création de frontend/.env..."
    echo "VITE_BACKEND_URL=http://localhost:8090" > frontend/.env
fi
echo "  ✅ Configuration vérifiée"

# 6. Migrations et fichiers statiques
echo "🗄️  [6/8] Migrations de la base de données..."
python manage.py migrate --noinput
echo "  ✅ Migrations appliquées"

echo "📁 [7/8] Collecte des fichiers statiques..."
python manage.py collectstatic --noinput
echo "  ✅ Fichiers statiques collectés"

# 7. PM2 - Vérifier installation
echo "🚀 [8/8] Démarrage de l'application avec PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "  ⚠️  PM2 n'est pas installé"
    echo "     Installation de PM2..."
    sudo npm install -g pm2
fi

# Arrêter les processus existants
pm2 delete all || true

# Démarrer l'application
pm2 start ecosystem.config.js

# Sauvegarder la configuration
pm2 save

echo ""
echo "=========================================="
echo "  ✅ DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !"
echo "=========================================="
echo ""
echo "🌐 URLs de l'application :"
echo "   Frontend : http://localhost:$FRONTEND_PORT"
echo "   Backend  : http://localhost:$BACKEND_PORT"
echo "   Admin    : http://localhost:$BACKEND_PORT/admin"
echo ""
echo "📊 Commandes utiles :"
echo "   pm2 status      # Voir le statut"
echo "   pm2 logs        # Voir les logs"
echo "   pm2 monit       # Monitoring"
echo "   pm2 restart all # Redémarrer"
echo ""
echo "📖 Documentation complète : DEPLOIEMENT_VPS.md"
echo ""
