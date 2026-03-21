# Guide de Déploiement - procura.mirlab.cloud

Serveur: `/home/mirlab-procura/htdocs/procura.mirlab.cloud`

---

## Étape 1 — Préparer le serveur (une seule fois)

### 1.1 Installer les dépendances système

```bash
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv \
    postgresql postgresql-client libpq-dev \
    redis-server \
    build-essential gettext \
    libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev
```

### 1.2 Créer la base de données PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE procura_db;
CREATE USER procura_user WITH PASSWORD 'votre_mot_de_passe_fort';
ALTER ROLE procura_user SET client_encoding TO 'utf8';
ALTER ROLE procura_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE procura_user SET timezone TO 'America/Toronto';
GRANT ALL PRIVILEGES ON DATABASE procura_db TO procura_user;
\q
```

---

## Étape 2 — Déployer le code

### 2.1 Uploader le projet sur le serveur

Depuis votre machine locale (Git recommandé) :

```bash
# Sur le serveur
cd /home/mirlab-procura/htdocs/procura.mirlab.cloud
git clone https://github.com/votre-repo/procura.git .
# OU via SFTP/rsync
```

### 2.2 Configurer le fichier .env.production

```bash
cp .env.production /home/mirlab-procura/htdocs/procura.mirlab.cloud/.env.production
nano .env.production
```

**Valeurs obligatoires à remplacer :**

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Générer: `python3 -c "import secrets; print(secrets.token_hex(50))"` |
| `DATABASE_URL` | `postgres://procura_user:MOT_DE_PASSE@localhost:5432/procura_db` |
| `MISTRAL_API_KEY` | Votre clé API Mistral AI |
| `EMAIL_HOST_USER` | Votre adresse Gmail |
| `EMAIL_HOST_PASSWORD` | Mot de passe d'application Gmail |

### 2.3 Lancer le script de déploiement

```bash
cd /home/mirlab-procura/htdocs/procura.mirlab.cloud
bash deploy_mirlab.sh
```

---

## Étape 3 — Configurer Gunicorn

### 3.1 Créer le service systemd

```bash
sudo nano /etc/systemd/system/procura.service
```

Contenu :
```ini
[Unit]
Description=Procura Gunicorn Daemon
After=network.target postgresql.service redis.service

[Service]
User=mirlab-procura
Group=mirlab-procura
WorkingDirectory=/home/mirlab-procura/htdocs/procura.mirlab.cloud
ExecStart=/home/mirlab-procura/htdocs/procura.mirlab.cloud/venv/bin/gunicorn \
    --bind 127.0.0.1:8000 \
    --workers 3 \
    --timeout 120 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --access-logfile /home/mirlab-procura/htdocs/procura.mirlab.cloud/logs/gunicorn-access.log \
    --error-logfile /home/mirlab-procura/htdocs/procura.mirlab.cloud/logs/gunicorn-error.log \
    saas_procurement.wsgi:application
EnvironmentFile=/home/mirlab-procura/htdocs/procura.mirlab.cloud/.env.production
Environment=DJANGO_SETTINGS_MODULE=saas_procurement.settings_production
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable procura
sudo systemctl start procura
sudo systemctl status procura
```

---

## Étape 4 — Configurer Nginx dans CloudPanel

Dans CloudPanel, aller dans **Vhosts** du domaine `procura.mirlab.cloud` et coller cette configuration :

```nginx
# Redirection HTTP → HTTPS
if ($scheme != "https") {
    rewrite ^ https://$host$request_uri permanent;
}

# Fichiers statiques Django
location /static/ {
    alias /home/mirlab-procura/htdocs/procura.mirlab.cloud/staticfiles/;
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
}

# Fichiers médias (uploads)
location /media/ {
    alias /home/mirlab-procura/htdocs/procura.mirlab.cloud/media/;
    expires 30d;
    add_header Cache-Control "public";
    access_log off;
}

# Proxy vers Gunicorn (Django)
location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 60s;
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;
}
```

---

## Étape 5 — Frontend React (si séparé)

Si le frontend React est buildé séparément :

```bash
cd /home/mirlab-procura/htdocs/procura.mirlab.cloud/frontend
npm install
npm run build
```

Puis dans Nginx, servir `frontend/dist` pour `/` et proxifier `/api/`, `/admin/`, `/static/`, `/media/` vers Gunicorn.

---

## Commandes utiles

```bash
# Redémarrer l'application
sudo systemctl restart procura

# Voir les logs
sudo journalctl -u procura -f
tail -f logs/gunicorn-error.log

# Appliquer des migrations après mise à jour du code
source venv/bin/activate
python manage.py migrate --settings=saas_procurement.settings_production

# Créer un superuser
python manage.py createsuperuser --settings=saas_procurement.settings_production
```

---

## Vérification du déploiement

```bash
# Tester que Gunicorn répond
curl -I http://127.0.0.1:8000/admin/login/

# Vérifier les logs Django
tail -50 logs/django.log
```
