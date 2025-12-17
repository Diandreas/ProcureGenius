#!/bin/bash

# Déploiement simple de ProcureGenius sur Linux
# Utilisation: ./deploy_linux_simple.sh

set -e

echo "🚀 Déploiement de ProcureGenius sur Linux"

# 1. Mise à jour du système
echo "📦 Mise à jour du système..."
sudo apt update && sudo apt upgrade -y

# 2. Installation des dépendances
echo "🛠️ Installation des dépendances..."
sudo apt install -y python3 python3-pip python3-venv postgresql postgresql-contrib nginx redis-server git curl

# 3. Configuration PostgreSQL
echo "🐘 Configuration PostgreSQL..."
sudo -u postgres createuser --createdb procuregenius || true
sudo -u postgres createdb -O procuregenius procuregenius_db || true
sudo -u postgres psql -c "ALTER USER procuregenius PASSWORD 'procuregenius123';" || true

# 4. Configuration Redis
echo "🔴 Démarrage de Redis..."
sudo systemctl enable redis-server
sudo systemctl start redis-server

# 5. Configuration de l'environnement Python
echo "🐍 Configuration Python..."
python3 -m venv ~/procuregenius_env
source ~/procuregenius_env/bin/activate

# 6. Clonage du projet
echo "📥 Installation du projet..."
if [ ! -d "~/procuregenius" ]; then
    # Remplacer par votre repo Git
    git clone https://github.com/your-username/procuregenius.git ~/procuregenius
fi

cd ~/procuregenius

# 7. Installation des dépendances Python
echo "📦 Installation des dépendances Python..."
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn psycopg2-binary

# 8. Configuration Django
echo "⚙️ Configuration Django..."
cp .env.example .env 2>/dev/null || touch .env

cat > .env << EOF
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
DEBUG=False
DB_NAME=procuregenius_db
DB_USER=procuregenius
DB_PASSWORD=procuregenius123
DB_HOST=localhost
DB_PORT=5432
REDIS_URL=redis://localhost:6379
ALLOWED_HOSTS=localhost,127.0.0.1
EOF

# 9. Configuration de la base de données
echo "🗄️ Configuration de la base de données..."
python manage.py migrate
python manage.py collectstatic --noinput

# 10. Création d'un superutilisateur
echo "👤 Création du superutilisateur..."
echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser('admin', 'admin@procuregenius.com', 'admin123') if not User.objects.filter(username='admin').exists() else print('Superuser already exists')" | python manage.py shell

# 11. Test du serveur de développement
echo "🧪 Test du serveur..."
python manage.py runserver 0.0.0.0:8000 &
SERVER_PID=$!
sleep 5

if curl -s http://localhost:8000 > /dev/null; then
    echo "✅ Serveur de développement fonctionnel"
    kill $SERVER_PID
else
    echo "❌ Problème avec le serveur"
    kill $SERVER_PID
    exit 1
fi

# 12. Configuration de Gunicorn pour la production
echo "🦄 Configuration de Gunicorn..."
sudo tee /etc/systemd/system/procuregenius.service > /dev/null <<EOF
[Unit]
Description=ProcureGenius Django Application
After=network.target

[Service]
User=$USER
Group=$USER
WorkingDirectory=/home/$USER/procuregenius
Environment="PATH=/home/$USER/procuregenius_env/bin"
Environment="DJANGO_SETTINGS_MODULE=saas_procurement.settings"
ExecStart=/home/$USER/procuregenius_env/bin/gunicorn --workers 3 --bind 127.0.0.1:8000 saas_procurement.wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable procuregenius
sudo systemctl start procuregenius

# 13. Configuration de Nginx
echo "🌐 Configuration de Nginx..."
sudo tee /etc/nginx/sites-available/procuregenius > /dev/null <<EOF
server {
    listen 80;
    server_name localhost;

    location /static/ {
        alias /home/$USER/procuregenius/staticfiles/;
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/procuregenius /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# 14. Configuration du firewall
echo "🔥 Configuration du firewall..."
sudo ufw allow 80/tcp
sudo ufw allow 22/tcp
echo "y" | sudo ufw enable

# 15. Test final
echo "🧪 Test final..."
sleep 3

if curl -s http://localhost > /dev/null; then
    echo ""
    echo "🎉 DÉPLOIEMENT RÉUSSI !"
    echo ""
    echo "🌐 Application accessible sur: http://localhost"
    echo "🔐 Identifiants admin: admin / admin123"
    echo ""
    echo "📋 Commandes utiles:"
    echo "  Redémarrer l'app: sudo systemctl restart procuregenius"
    echo "  Voir les logs: sudo journalctl -u procuregenius -f"
    echo "  Redémarrer Nginx: sudo systemctl restart nginx"
else
    echo "❌ Problème de déploiement"
    exit 1
fi
