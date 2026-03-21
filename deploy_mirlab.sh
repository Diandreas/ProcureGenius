#!/bin/bash
# ============================================================
# SCRIPT DE DÉPLOIEMENT - procura.mirlab.cloud
# Serveur: /home/mirlab-procura/htdocs/procura.mirlab.cloud
# Usage: bash deploy_mirlab.sh
# ============================================================

set -e  # Arrêter en cas d'erreur

# ---- CONFIGURATION ----
APP_DIR="/home/mirlab-procura/htdocs/procura.mirlab.cloud"
VENV_DIR="$APP_DIR/venv"
PYTHON="$VENV_DIR/bin/python"
PIP="$VENV_DIR/bin/pip"
MANAGE="$PYTHON $APP_DIR/manage.py"
SETTINGS="saas_procurement.settings_production"

echo "============================================================"
echo "  DÉPLOIEMENT PROCUREGENIUS - procura.mirlab.cloud"
echo "  $(date)"
echo "============================================================"

# ---- 1. ALLER DANS LE RÉPERTOIRE DE L'APP ----
cd "$APP_DIR"
echo "[1/9] Répertoire: $APP_DIR"

# ---- 2. CRÉER LE VIRTUALENV SI INEXISTANT ----
if [ ! -d "$VENV_DIR" ]; then
    echo "[2/9] Création du virtualenv..."
    python3 -m venv venv
    echo "      Virtualenv créé."
else
    echo "[2/9] Virtualenv existant: OK"
fi

# ---- 3. ACTIVER LE VIRTUALENV ET METTRE À JOUR PIP ----
echo "[3/9] Activation du virtualenv et mise à jour pip..."
source "$VENV_DIR/bin/activate"
pip install --upgrade pip --quiet

# ---- 4. INSTALLER LES DÉPENDANCES ----
echo "[4/9] Installation des dépendances Python..."
pip install -r requirements.txt --quiet
echo "      Dépendances installées."

# ---- 5. COPIER LE FICHIER .env.production ----
if [ ! -f "$APP_DIR/.env.production" ]; then
    echo ""
    echo "  ATTENTION: .env.production introuvable!"
    echo "  Copiez et configurez le fichier .env.production avant de continuer."
    echo "  Exemple:"
    echo "    cp .env.production.example .env.production"
    echo "    nano .env.production"
    echo ""
    exit 1
fi
echo "[5/9] Fichier .env.production: OK"

# ---- 6. CRÉER LES RÉPERTOIRES NÉCESSAIRES ----
echo "[6/9] Création des répertoires..."
mkdir -p "$APP_DIR/staticfiles"
mkdir -p "$APP_DIR/media"
mkdir -p "$APP_DIR/logs"
echo "      Répertoires créés."

# ---- 7. MIGRATIONS BASE DE DONNÉES ----
echo "[7/9] Application des migrations..."
$MANAGE migrate --settings=$SETTINGS --noinput
echo "      Migrations appliquées."

# ---- 8. COLLECTER LES FICHIERS STATIQUES ----
echo "[8/9] Collecte des fichiers statiques..."
$MANAGE collectstatic --settings=$SETTINGS --noinput --clear
echo "      Fichiers statiques collectés."

# ---- 9. COMPILER LES TRADUCTIONS ----
echo "[9/9] Compilation des traductions..."
$MANAGE compilemessages --settings=$SETTINGS || echo "      (traductions ignorées - pas critique)"

echo ""
echo "============================================================"
echo "  DÉPLOIEMENT TERMINÉ!"
echo "============================================================"
echo ""
echo "Étapes suivantes:"
echo "  1. Configurer Gunicorn (voir section ci-dessous)"
echo "  2. Redémarrer l'application via CloudPanel"
echo ""
echo "Pour démarrer Gunicorn manuellement:"
echo "  $VENV_DIR/bin/gunicorn \\"
echo "    --bind 127.0.0.1:8000 \\"
echo "    --workers 3 \\"
echo "    --timeout 120 \\"
echo "    --daemon \\"
echo "    --pid $APP_DIR/gunicorn.pid \\"
echo "    --access-logfile $APP_DIR/logs/gunicorn-access.log \\"
echo "    --error-logfile $APP_DIR/logs/gunicorn-error.log \\"
echo "    saas_procurement.wsgi:application"
echo ""
