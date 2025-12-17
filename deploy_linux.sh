#!/bin/bash

# Script de déploiement ProcureGenius sur Linux
# Utilisation: ./deploy_linux.sh

set -e  # Arrêter en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
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

# Vérifier les privilèges root
if [[ $EUID -eq 0 ]]; then
   log_error "Ne pas exécuter ce script en tant que root"
   exit 1
fi

log_info "🚀 Démarrage du déploiement de ProcureGenius sur Linux"

# Étape 1: Mise à jour du système
log_info "📦 Mise à jour du système..."
sudo apt update && sudo apt upgrade -y
log_success "Système mis à jour"

# Étape 2: Installation des dépendances système
log_info "🛠️ Installation des dépendances système..."
sudo apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    postgresql \
    postgresql-contrib \
    nginx \
    redis-server \
    supervisor \
    git \
    curl \
    build-essential \
    python3-dev \
    libpq-dev \
    libjpeg-dev \
    zlib1g-dev \
    wkhtmltopdf \
    gettext \
    sqlite3

log_success "Dépendances système installées"

# Étape 3: Configuration PostgreSQL
log_info "🐘 Configuration de PostgreSQL..."
sudo -u postgres createuser --createdb --createrole procuregenius || true
sudo -u postgres createdb -O procuregenius procuregenius_db || true
sudo -u postgres psql -c "ALTER USER procuregenius PASSWORD 'change_this_password';" || true
log_success "PostgreSQL configuré"

# Étape 4: Configuration Redis
log_info "🔴 Configuration de Redis..."
sudo systemctl enable redis-server
sudo systemctl start redis-server
log_success "Redis configuré"

# Étape 5: Configuration de l'environnement virtuel Python
log_info "🐍 Configuration de l'environnement Python..."
python3 -m venv ~/procuregenius_env
source ~/procuregenius_env/bin/activate

# Cloner ou mettre à jour le projet (adapter selon votre repo)
if [ ! -d "~/procuregenius" ]; then
    log_info "📥 Clonage du projet..."
    git clone https://votre-repo.git ~/procuregenius
else
    log_info "📦 Mise à jour du projet..."
    cd ~/procuregenius
    git pull origin main
fi

cd ~/procuregenius

# Installation des dépendances Python
log_info "📦 Installation des dépendances Python..."
pip install --upgrade pip
pip install -r requirements.txt

# Étape 6: Configuration Django
log_info "⚙️ Configuration de Django..."
cp .env.example .env 2>/dev/null || echo "# Créer votre fichier .env"

# Générer une clé secrète Django
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
echo "SECRET_KEY=$SECRET_KEY" >> .env
echo "DEBUG=False" >> .env
echo "DB_NAME=procuregenius_db" >> .env
echo "DB_USER=procuregenius" >> .env
echo "DB_PASSWORD=change_this_password" >> .env
echo "DB_HOST=localhost" >> .env
echo "DB_PORT=5432" >> .env
echo "REDIS_URL=redis://localhost:6379" >> .env
echo "ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com" >> .env

log_warning "⚠️  Pensez à modifier le mot de passe PostgreSQL dans .env"

# Appliquer les migrations
log_info "🗄️ Application des migrations..."
python manage.py migrate

# Collecter les fichiers statiques
log_info "📁 Collecte des fichiers statiques..."
python manage.py collectstatic --noinput

# Créer un superutilisateur (optionnel)
log_info "👤 Création d'un superutilisateur..."
echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser('admin', 'admin@procuregenius.com', 'admin123') if not User.objects.filter(username='admin').exists() else None" | python manage.py shell

# Étape 7: Configuration de Gunicorn
log_info "🦄 Configuration de Gunicorn..."
sudo mkdir -p /etc/gunicorn
sudo tee /etc/gunicorn/procuregenius.conf.py > /dev/null <<EOF
import os
import multiprocessing

# Configuration Gunicorn pour ProcureGenius
bind = "127.0.0.1:8000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
timeout = 30
keepalive = 2

# Chemins
user = "$(whoami)"
group = "$(whoami)"
tmp_upload_dir = None

# Logging
loglevel = "info"
accesslog = "/var/log/gunicorn/procuregenius_access.log"
errorlog = "/var/log/gunicorn/procuregenius_error.log"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Application Django
pythonpath = "/home/$(whoami)/procuregenius"
chdir = "/home/$(whoami)/procuregenius"
wsgi_module = "saas_procurement.wsgi:application"

# Variables d'environnement
raw_env = [
    "DJANGO_SETTINGS_MODULE=saas_procurement.settings",
    "PATH=/home/$(whoami)/procuregenius_env/bin",
]
EOF

# Créer le répertoire de logs
sudo mkdir -p /var/log/gunicorn
sudo chown $(whoami):$(whoami) /var/log/gunicorn

# Étape 8: Configuration de Supervisor
log_info "👔 Configuration de Supervisor..."
sudo tee /etc/supervisor/conf.d/procuregenius.conf > /dev/null <<EOF
[program:procuregenius]
directory=/home/$(whoami)/procuregenius
command=/home/$(whoami)/procuregenius_env/bin/gunicorn --config /etc/gunicorn/procuregenius.conf.py
user=$(whoami)
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/supervisor/procuregenius.log
environment=PATH="/home/$(whoami)/procuregenius_env/bin"

[program:celery_worker]
directory=/home/$(whoami)/procuregenius
command=/home/$(whoami)/procuregenius_env/bin/celery -A saas_procurement worker -l info
user=$(whoami)
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/supervisor/celery_worker.log
environment=PATH="/home/$(whoami)/procuregenius_env/bin"

[program:celery_beat]
directory=/home/$(whoami)/procuregenius
command=/home/$(whoami)/procuregenius_env/bin/celery -A saas_procurement beat -l info
user=$(whoami)
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/supervisor/celery_beat.log
environment=PATH="/home/$(whoami)/procuregenius_env/bin"
EOF

# Étape 9: Configuration de Nginx
log_info "🌐 Configuration de Nginx..."
sudo tee /etc/nginx/sites-available/procuregenius > /dev/null <<EOF
# Configuration Nginx pour ProcureGenius
upstream procuregenius_app {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name localhost;

    # Logs
    access_log /var/log/nginx/procuregenius_access.log;
    error_log /var/log/nginx/procuregenius_error.log;

    # Sécurité
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Fichiers statiques
    location /static/ {
        alias /home/$(whoami)/procuregenius/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Fichiers médias
    location /media/ {
        alias /home/$(whoami)/procuregenius/media/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # Application Django
    location / {
        proxy_pass http://procuregenius_app;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Host \$http_host;
        proxy_redirect off;
        proxy_buffering off;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket pour Django Channels (si utilisé)
    location /ws/ {
        proxy_pass http://procuregenius_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_cache off;
    }
}
EOF

# Activer le site
sudo ln -sf /etc/nginx/sites-available/procuregenius /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Tester la configuration Nginx
sudo nginx -t

# Étape 10: Démarrage des services
log_info "🚀 Démarrage des services..."

# Supervisor
sudo systemctl enable supervisor
sudo systemctl start supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl restart all

# Nginx
sudo systemctl enable nginx
sudo systemctl restart nginx

# Étape 11: Configuration du firewall
log_info "🔥 Configuration du firewall..."
sudo ufw allow 80/tcp
sudo ufw allow 22/tcp
echo "y" | sudo ufw enable

# Étape 12: Tests finaux
log_info "🧪 Tests finaux..."

# Tester la connectivité
sleep 5
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200\|302"; then
    log_success "✅ Application accessible sur http://localhost"
else
    log_error "❌ Application non accessible"
fi

# Vérifier les processus
if pgrep -f gunicorn > /dev/null; then
    log_success "✅ Gunicorn fonctionne"
else
    log_error "❌ Gunicorn ne fonctionne pas"
fi

if pgrep -f celery > /dev/null; then
    log_success "✅ Celery fonctionne"
else
    log_warning "⚠️ Celery ne fonctionne pas (optionnel)"
fi

# Étape 13: Instructions finales
log_success "🎉 Déploiement terminé !"
echo ""
echo "========================================"
echo "📋 INSTRUCTIONS FINALES:"
echo "========================================"
echo ""
echo "1. 🌐 Votre application est accessible sur: http://localhost"
echo "2. 🔐 Connectez-vous avec: admin / admin123"
echo "3. ⚙️ Modifiez le mot de passe admin dans l'interface"
echo "4. 🔑 Configurez vos variables d'environnement dans ~/procuregenius/.env"
echo "5. 📧 Configurez l'email dans les paramètres Django"
echo "6. 🤖 Configurez votre clé Mistral AI dans .env"
echo ""
echo "========================================"
echo "🔧 COMMANDES UTILES:"
echo "========================================"
echo ""
echo "# Redémarrer l'application:"
echo "sudo supervisorctl restart procuregenius"
echo ""
echo "# Voir les logs:"
echo "sudo supervisorctl tail procuregenius"
echo "tail -f /var/log/nginx/procuregenius_access.log"
echo ""
echo "# Mettre à jour l'application:"
echo "cd ~/procuregenius && git pull && python manage.py migrate && python manage.py collectstatic --noinput"
echo "sudo supervisorctl restart procuregenius"
echo ""
echo "========================================"
