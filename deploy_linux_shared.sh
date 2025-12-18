#!/bin/bash

# Script de déploiement pour hébergement partagé Linux (sans sudo)
# Utilisation: ./deploy_linux_shared.sh

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier si on est sur Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    log_error "Ce script est fait pour Linux uniquement"
   exit 1
fi

log_info "🚀 Déploiement de ProcureGenius sur Hébergement Partagé Linux"

# Détection de l'hébergement
if [[ -d "/home/procura" && -f "/home/procura/htdocs/procura.srv696182.hstgr.cloud/deploy_linux_shared.sh" ]]; then
    log_info "🔍 Détection d'un hébergement Hostinger"
    IS_HOSTINGER=true
else
    IS_HOSTINGER=false
fi

# Variables de configuration
PROJECT_DIR="$(pwd)"
VENV_DIR="$PROJECT_DIR/venv"
PYTHON_CMD="python3"

# Vérifier Python
if ! command -v python3 &> /dev/null; then
    log_error "Python3 n'est pas installé ou pas dans le PATH"
    exit 1
fi

log_info "🐍 Python3 trouvé: $(python3 --version)"

# Étape 1: Créer l'environnement virtuel
log_info "📦 Création de l'environnement virtuel..."
if [ ! -d "$VENV_DIR" ]; then
    $PYTHON_CMD -m venv "$VENV_DIR"
    log_success "Environnement virtuel créé"
else
    log_info "Environnement virtuel déjà existant"
fi

# Activer l'environnement virtuel
source "$VENV_DIR/bin/activate"
log_info "Environnement virtuel activé: $VENV_DIR"

# Étape 2: Installer les dépendances Python
log_info "📦 Installation des dépendances Python..."
pip install --upgrade pip
pip install -r requirements_production.txt
log_success "Dépendances Python installées"

# Étape 3: Configuration Django
log_info "⚙️ Configuration de Django..."

# Créer le fichier .env si inexistant
if [ ! -f ".env" ]; then
    log_info "Création du fichier .env..."

    # Générer une clé secrète
    SECRET_KEY=$($PYTHON_CMD -c "import secrets; print(secrets.token_urlsafe(50))")

    cat > .env << EOF
# Configuration ProcureGenius
SECRET_KEY=$SECRET_KEY
DEBUG=False

# Base de données (SQLite pour hébergement partagé)
DB_ENGINE=django.db.backends.sqlite3
DB_NAME=db.sqlite3

# Redis (optionnel - commenté si pas disponible)
# REDIS_URL=redis://localhost:6379

# Hôtes autorisés
ALLOWED_HOSTS=procura.srv696182.hstgr.cloud,localhost,127.0.0.1

# Email (à configurer selon votre hébergeur)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=localhost
EMAIL_PORT=587
EMAIL_USE_TLS=True
# EMAIL_HOST_USER=
# EMAIL_HOST_PASSWORD=
# DEFAULT_FROM_EMAIL=noreply@procura.srv696182.hstgr.cloud

# API Keys (à configurer)
# MISTRAL_API_KEY=votre_cle_mistral
# PAYPAL_CLIENT_ID=votre_client_id
# PAYPAL_CLIENT_SECRET=votre_secret
EOF

    log_success "Fichier .env créé - Pensez à configurer vos API keys"
else
    log_info "Fichier .env déjà existant"
fi

# Étape 4: Configuration de la base de données
log_info "🗄️ Configuration de la base de données..."
$PYTHON_CMD manage.py migrate
log_success "Migrations appliquées"

# Étape 5: Collecte des fichiers statiques
log_info "📁 Collecte des fichiers statiques..."
$PYTHON_CMD manage.py collectstatic --noinput
log_success "Fichiers statiques collectés"

# Étape 6: Création d'un superutilisateur
log_info "👤 Création du superutilisateur..."
echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser('admin', 'admin@procura.srv696182.hstgr.cloud', 'admin123') if not User.objects.filter(username='admin').exists() else print('Superuser already exists')" | $PYTHON_CMD manage.py shell
log_success "Superutilisateur créé (admin/admin123)"

# Étape 7: Test du serveur
log_info "🧪 Test du serveur Django..."
timeout 10s $PYTHON_CMD manage.py runserver 0.0.0.0:8000 &
SERVER_PID=$!
sleep 3

if kill -0 $SERVER_PID 2>/dev/null; then
    log_success "✅ Serveur Django fonctionnel"
    kill $SERVER_PID
else
    log_error "❌ Problème avec le serveur Django"
    exit 1
fi

# Étape 8: Configuration pour hébergement partagé
log_info "🌐 Configuration pour hébergement partagé..."

# Créer un script de démarrage personnalisé
cat > start_server.sh << 'EOF'
#!/bin/bash
# Script de démarrage pour hébergement partagé

# Aller dans le répertoire du projet
cd "$(dirname "$0")"

# Activer l'environnement virtuel
source venv/bin/activate

# Variables d'environnement
export PYTHONPATH="$(pwd)"
export DJANGO_SETTINGS_MODULE=saas_procurement.settings

# Démarrer le serveur sur le port fourni par l'hébergeur
PORT=${PORT:-8000}
HOST=${HOST:-0.0.0.0}

echo "🚀 Démarrage de ProcureGenius sur $HOST:$PORT"
exec python manage.py runserver $HOST:$PORT
EOF

chmod +x start_server.sh

# Créer un fichier .htaccess si nécessaire (pour certains hébergeurs)
if [ "$IS_HOSTINGER" = true ]; then
    cat > .htaccess << 'EOF'
# Configuration pour Hostinger
RewriteEngine On
RewriteBase /

# Rediriger tout vers l'application Django
RewriteRule ^(.*)$ start_server.sh [L]
EOF
    log_info "Fichier .htaccess créé pour Hostinger"
fi

# Étape 9: Instructions finales
log_success "🎉 Déploiement terminé !"

echo ""
echo "========================================"
echo "📋 INSTRUCTIONS POUR HÉBERGEMENT PARTAGÉ:"
echo "========================================"
echo ""
echo "1. 🌐 Configurez votre domaine pour pointer vers ce répertoire"
echo "2. 🔐 Identifiants admin: admin / admin123"
echo "3. ⚙️ Modifiez le mot de passe admin après la première connexion"
echo "4. 🔑 Configurez vos API keys dans le fichier .env"
echo ""
echo "========================================"
echo "🚀 COMMANDES DE DÉMARRAGE:"
echo "========================================"
echo ""
echo "# Démarrage manuel:"
echo "./start_server.sh"
echo ""
echo "# Ou directement:"
echo "source venv/bin/activate && python manage.py runserver 0.0.0.0:8000"
echo ""
echo "# Test:"
echo "curl http://localhost:8000"
echo ""
echo "========================================"
echo "📁 STRUCTURE APRÈS DÉPLOIEMENT:"
echo "========================================"
echo ""
echo "procura.srv696182.hstgr.cloud/"
echo "├── venv/                    # Environnement virtuel"
echo "├── staticfiles/            # Fichiers statiques"
echo "├── db.sqlite3              # Base de données"
echo "├── .env                    # Configuration"
echo "├── start_server.sh        # Script de démarrage"
echo "└── .htaccess              # Configuration Apache"
echo ""
echo "========================================"

# Désactiver l'environnement virtuel
deactivate

log_info "✅ Configuration terminée. Votre application est prête !"