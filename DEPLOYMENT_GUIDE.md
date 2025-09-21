# Guide de Déploiement - Application de Gestion avec IA Chatbot

## Prérequis

- Python 3.8+
- Node.js 16+
- PostgreSQL 12+ (production)
- Redis 6+
- Nginx
- SSL/TLS certificat

## Développement Local

### Backend Django

```bash
# 1. Créer un environnement virtuel
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# 2. Installer les dépendances
pip install -r requirements.txt

# 3. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# 4. Appliquer les migrations
python manage.py makemigrations
python manage.py migrate

# 5. Créer un superutilisateur
python manage.py createsuperuser

# 6. Collecter les fichiers statiques
python manage.py collectstatic

# 7. Lancer le serveur de développement
python manage.py runserver
```

### Frontend React

```bash
# 1. Installer les dépendances
cd frontend
npm install

# 2. Configurer l'environnement
echo "REACT_APP_API_URL=http://localhost:8000/api/v1" > .env

# 3. Lancer le serveur de développement
npm run dev
```

## Production

### 1. Préparation du serveur

```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation des dépendances
sudo apt install -y python3-pip python3-venv postgresql postgresql-contrib nginx redis-server git

# Installation de Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Installation de PM2 pour Node.js
sudo npm install -g pm2
```

### 2. Configuration PostgreSQL

```sql
sudo -u postgres psql

CREATE DATABASE gestion_app;
CREATE USER gestion_user WITH PASSWORD 'votre_mot_de_passe';
ALTER ROLE gestion_user SET client_encoding TO 'utf8';
ALTER ROLE gestion_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE gestion_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE gestion_app TO gestion_user;
\q
```

### 3. Configuration de l'application

```bash
# Cloner le repository
git clone https://github.com/votre-repo/gestion-app.git
cd gestion-app

# Backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn psycopg2-binary

# Configurer .env pour la production
cp .env.example .env
nano .env  # Éditer avec les valeurs de production

# Migrations et collecte des statiques
python manage.py migrate
python manage.py collectstatic --noinput

# Frontend
cd frontend
npm install
npm run build
```

### 4. Configuration Gunicorn

Créer `/etc/systemd/system/gunicorn.service`:

```ini
[Unit]
Description=gunicorn daemon for gestion app
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/gestion-app
ExecStart=/var/www/gestion-app/venv/bin/gunicorn \
          --access-logfile - \
          --workers 3 \
          --bind unix:/var/www/gestion-app/gunicorn.sock \
          saas_procurement.wsgi:application

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl start gunicorn
sudo systemctl enable gunicorn
```

### 5. Configuration Nginx

Créer `/etc/nginx/sites-available/gestion-app`:

```nginx
server {
    listen 80;
    server_name votre-domaine.com;
    
    # Redirection HTTP vers HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name votre-domaine.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Frontend React
    location / {
        root /var/www/gestion-app/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # PWA headers
        add_header Cache-Control "public, max-age=3600";
    }
    
    # API Django
    location /api {
        include proxy_params;
        proxy_pass http://unix:/var/www/gestion-app/gunicorn.sock;
    }
    
    # Django Admin
    location /admin {
        include proxy_params;
        proxy_pass http://unix:/var/www/gestion-app/gunicorn.sock;
    }
    
    # Static files
    location /static/ {
        alias /var/www/gestion-app/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Media files
    location /media/ {
        alias /var/www/gestion-app/media/;
        expires 7d;
        add_header Cache-Control "public";
    }
    
    # Service Worker
    location /service-worker.js {
        root /var/www/gestion-app/frontend/build;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # Manifest
    location /manifest.json {
        root /var/www/gestion-app/frontend/build;
        add_header Cache-Control "public, max-age=3600";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/gestion-app /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL avec Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
```

### 7. Configuration Celery (pour les tâches asynchrones)

Créer `/etc/systemd/system/celery.service`:

```ini
[Unit]
Description=Celery Service
After=network.target

[Service]
Type=forking
User=www-data
Group=www-data
WorkingDirectory=/var/www/gestion-app
Environment="PATH=/var/www/gestion-app/venv/bin"
ExecStart=/var/www/gestion-app/venv/bin/celery -A saas_procurement multi start worker1 \
  --pidfile=/var/run/celery/%n.pid \
  --logfile=/var/log/celery/%n%I.log --loglevel=info

[Install]
WantedBy=multi-user.target
```

### 8. Monitoring et Logs

```bash
# Logs Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logs Gunicorn
sudo journalctl -u gunicorn -f

# Logs Celery
sudo tail -f /var/log/celery/worker1.log
```

### 9. Backup

Script de backup `/home/backup/backup.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/backup"
DB_NAME="gestion_app"
DB_USER="gestion_user"

# Backup database
pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Backup media files
tar -czf $BACKUP_DIR/media_backup_$DATE.tar.gz /var/www/gestion-app/media

# Backup de l'application
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /var/www/gestion-app --exclude='venv' --exclude='node_modules'

# Nettoyer les vieux backups (garder 7 jours)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

Cron job:
```bash
0 2 * * * /home/backup/backup.sh
```

## Variables d'environnement Production

```env
# Django
SECRET_KEY=votre-secret-key-tres-longue
DEBUG=False
ALLOWED_HOSTS=votre-domaine.com,www.votre-domaine.com

# Database
DATABASE_URL=postgres://gestion_user:password@localhost:5432/gestion_app

# Redis
REDIS_URL=redis://localhost:6379/0

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=votre-email@gmail.com
EMAIL_HOST_PASSWORD=votre-mot-de-passe-app

# Mistral AI
MISTRAL_API_KEY=votre-cle-api-mistral

# Security
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
```

## Maintenance

### Mise à jour de l'application

```bash
cd /var/www/gestion-app
git pull origin main

# Backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput

# Frontend
cd frontend
npm install
npm run build

# Redémarrer les services
sudo systemctl restart gunicorn
sudo systemctl restart celery
sudo systemctl reload nginx
```

### Monitoring de performance

- Installer et configurer **Prometheus** + **Grafana**
- Utiliser **Sentry** pour le tracking des erreurs
- Configurer **New Relic** ou **DataDog** pour l'APM

## Sécurité

1. **Firewall** : Configurer UFW
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

2. **Fail2Ban** : Protection contre les attaques brute-force
   ```bash
   sudo apt install fail2ban
   ```

3. **Mises à jour** : Automatiser avec unattended-upgrades
   ```bash
   sudo apt install unattended-upgrades
   sudo dpkg-reconfigure --priority=low unattended-upgrades
   ```

## Support

Pour toute question ou problème :
- Documentation : /workspace/ARCHITECTURE.md
- API : /workspace/API_DOCUMENTATION.md
- Issues : GitHub Issues