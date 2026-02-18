# 🚀 Déploiement VPS - Centre de Santé Julianna

Guide complet pour déployer l'application sur votre VPS avec les données de production.

---

## 📋 Prérequis VPS

Assurez-vous que votre VPS a :
- Ubuntu/Debian Linux
- Accès SSH root ou sudo
- Connexion internet

---

## 🔧 Installation Initiale VPS

### 1. Connexion au VPS
```bash
ssh root@votre-ip-vps
# ou
ssh votre-utilisateur@votre-ip-vps
```

### 2. Mise à jour du système
```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Installation des dépendances système
```bash
# Node.js et npm (version 18 LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Python 3 et pip
sudo apt install -y python3 python3-pip python3-venv

# PostgreSQL (recommandé pour production)
sudo apt install -y postgresql postgresql-contrib

# Git
sudo apt install -y git

# Autres dépendances
sudo apt install -y build-essential libpq-dev
```

### 4. Vérification des installations
```bash
node --version    # Devrait afficher v18.x.x
npm --version     # Devrait afficher 9.x.x ou plus
python3 --version # Devrait afficher 3.8+
psql --version    # Devrait afficher PostgreSQL
```

---

## 📂 Déploiement du Code

### 1. Créer le répertoire de l'application
```bash
sudo mkdir -p /var/www/julianna
sudo chown -R $USER:$USER /var/www/julianna
cd /var/www/julianna
```

### 2. Cloner le projet
```bash
git clone <URL_DE_VOTRE_REPO> .
# ou uploadez les fichiers via SFTP/SCP
```

### 3. Installer les dépendances Node.js
```bash
# Racine du projet
npm install

# Frontend
cd frontend
npm install
cd ..
```

---

## 🗄️ Configuration de la Base de Données

### 1. Créer la base de données PostgreSQL
```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Dans psql, exécutez :
CREATE DATABASE julianna_db;
CREATE USER julianna_user WITH PASSWORD 'VotreMotDePasseSecurise123!';
ALTER ROLE julianna_user SET client_encoding TO 'utf8';
ALTER ROLE julianna_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE julianna_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE julianna_db TO julianna_user;
\q
```

### 2. Configurer les variables d'environnement
```bash
# Créer le fichier .env à la racine
nano .env
```

Contenu du fichier `.env` :
```env
# Django Settings
DEBUG=False
SECRET_KEY=VotreCleSuperSecreteAChangerAbsolument123456789
ALLOWED_HOSTS=votre-domaine.com,votre-ip-vps,localhost,127.0.0.1

# Database (PostgreSQL)
DATABASE_ENGINE=django.db.backends.postgresql
DATABASE_NAME=julianna_db
DATABASE_USER=julianna_user
DATABASE_PASSWORD=VotreMotDePasseSecurise123!
DATABASE_HOST=localhost
DATABASE_PORT=5432

# Ports
BACKEND_PORT=8090
FRONTEND_PORT=3000

# URLs
BACKEND_URL=http://votre-ip-vps:8090
FRONTEND_URL=http://votre-ip-vps:3000
```

Sauvegarder : `Ctrl+O`, puis `Enter`, puis `Ctrl+X`

### 3. Configurer le frontend
```bash
cd frontend
nano .env
```

Contenu du fichier `frontend/.env` :
```env
VITE_BACKEND_URL=http://votre-ip-vps:8090
```

Sauvegarder et quitter.

---

## 🐍 Configuration Python Backend

### 1. Créer l'environnement virtuel
```bash
cd /var/www/julianna
python3 -m venv venv
source venv/bin/activate
```

### 2. Installer les dépendances Python
```bash
pip install --upgrade pip
pip install -r requirements_production.txt
```

### 3. Configurer Django pour PostgreSQL
Modifiez `saas_procurement/settings.py` pour utiliser les variables d'environnement :

```bash
nano saas_procurement/settings.py
```

Assurez-vous que la section DATABASES utilise les variables d'environnement :
```python
import os
from pathlib import Path

# ...

DATABASES = {
    'default': {
        'ENGINE': os.getenv('DATABASE_ENGINE', 'django.db.backends.sqlite3'),
        'NAME': os.getenv('DATABASE_NAME', BASE_DIR / 'db.sqlite3'),
        'USER': os.getenv('DATABASE_USER', ''),
        'PASSWORD': os.getenv('DATABASE_PASSWORD', ''),
        'HOST': os.getenv('DATABASE_HOST', ''),
        'PORT': os.getenv('DATABASE_PORT', ''),
    }
}

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost').split(',')
DEBUG = os.getenv('DEBUG', 'False') == 'True'
SECRET_KEY = os.getenv('SECRET_KEY', 'change-me-in-production')
```

### 4. Appliquer les migrations (base vierge)
```bash
source venv/bin/activate
python manage.py migrate
```

### 5. Créer le superutilisateur
```bash
python manage.py createsuperuser
# Suivez les instructions pour créer admin@csj.cm
```

### 6. Collecter les fichiers statiques
```bash
python manage.py collectstatic --noinput
```

---

## 🔄 Restaurer les Données de Production

Si vous avez un backup de votre base de données :

### Option A : Depuis un dump PostgreSQL
```bash
# Si vous avez un fichier backup.sql
psql -U julianna_user -d julianna_db -f backup.sql

# Ou avec pg_restore pour un dump binaire
pg_restore -U julianna_user -d julianna_db backup.dump
```

### Option B : Depuis un fichier JSON Django
```bash
source venv/bin/activate
python manage.py loaddata backup.json
```

### Option C : Migration depuis SQLite existant
Si vous avez votre db.sqlite3 actuel :

```bash
# 1. Faire un backup JSON depuis SQLite
python manage.py dumpdata --natural-foreign --natural-primary \
    --exclude contenttypes --exclude auth.Permission \
    --indent 2 > data_backup.json

# 2. Charger dans PostgreSQL
python manage.py loaddata data_backup.json
```

---

## 🚀 Installation et Configuration PM2

### 1. Installer PM2 globalement
```bash
sudo npm install -g pm2
```

### 2. Vérifier la configuration PM2
Le fichier `ecosystem.config.js` est déjà configuré. Vérifiez-le :
```bash
cat ecosystem.config.js
```

### 3. Démarrer l'application
```bash
cd /var/www/julianna
pm2 start ecosystem.config.js
```

### 4. Vérifier que tout fonctionne
```bash
pm2 status
pm2 logs
```

Vous devriez voir :
```
┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┐
│ id │ name               │ mode     │ ↺    │ status    │ cpu      │
├────┼────────────────────┼──────────┼──────┼───────────┼──────────┤
│ 0  │ backend-django     │ fork     │ 0    │ online    │ 0%       │
│ 1  │ frontend-react     │ fork     │ 0    │ online    │ 0%       │
└────┴────────────────────┴──────────┴──────┴───────────┴──────────┘
```

### 5. Sauvegarder la configuration PM2
```bash
pm2 save
```

### 6. Configurer le démarrage automatique
```bash
pm2 startup systemd
# Copiez et exécutez la commande affichée (elle commence par sudo)
```

---

## 🌐 Ouvrir les Ports du Pare-feu

### 1. Configurer UFW (pare-feu)
```bash
# Autoriser SSH (important !)
sudo ufw allow 22

# Autoriser les ports de l'application
sudo ufw allow 3000    # Frontend
sudo ufw allow 8090    # Backend

# Activer le pare-feu
sudo ufw enable

# Vérifier
sudo ufw status
```

---

## ✅ Vérification Finale

### 1. Tester le backend
```bash
curl http://localhost:8090/admin/
# Devrait retourner du HTML
```

### 2. Tester depuis votre navigateur
Ouvrez dans votre navigateur :
- Frontend : `http://votre-ip-vps:3000`
- Backend Admin : `http://votre-ip-vps:8090/admin`

### 3. Vérifier les logs
```bash
pm2 logs
# Ctrl+C pour quitter

# Logs spécifiques
pm2 logs backend-django
pm2 logs frontend-react

# Logs dans les fichiers
tail -f logs/backend-out.log
tail -f logs/frontend-out.log
```

---

## 🔧 Commandes de Gestion

### Redémarrer l'application
```bash
pm2 restart all
# ou
pm2 restart backend-django
pm2 restart frontend-react
```

### Arrêter l'application
```bash
pm2 stop all
```

### Voir les logs en temps réel
```bash
pm2 logs
```

### Monitoring
```bash
pm2 monit
```

---

## 🔄 Mise à Jour de l'Application

Script de mise à jour automatique :

```bash
cat > /var/www/julianna/update.sh << 'EOF'
#!/bin/bash
set -e

echo "🔄 Mise à jour de l'application..."

# 1. Pull les dernières modifications
git pull origin main

# 2. Backend - Activer venv et mettre à jour
source venv/bin/activate
pip install -r requirements_production.txt

# 3. Frontend - Mettre à jour les dépendances
cd frontend
npm install
cd ..

# 4. Migrations
python manage.py migrate

# 5. Collecter les fichiers statiques
python manage.py collectstatic --noinput

# 6. Redémarrer PM2
pm2 restart all

echo "✅ Mise à jour terminée !"
EOF

chmod +x /var/www/julianna/update.sh
```

**Utilisation :**
```bash
cd /var/www/julianna
./update.sh
```

---

## 🔒 Sécurité Additionnelle

### 1. Changer le propriétaire des fichiers
```bash
sudo chown -R www-data:www-data /var/www/julianna
sudo chmod -R 755 /var/www/julianna
```

### 2. Protéger le fichier .env
```bash
chmod 600 .env
chmod 600 frontend/.env
```

### 3. Désactiver le mode DEBUG
Assurez-vous que dans `.env` :
```env
DEBUG=False
```

---

## 📊 Monitoring et Maintenance

### Logs système
```bash
# Logs PM2
pm2 logs --lines 100

# Logs applicatifs
tail -f logs/*.log

# Espace disque
df -h

# Mémoire
free -h

# Processus
pm2 status
```

### Backup automatique de la base de données
```bash
# Créer un script de backup
cat > /var/www/julianna/backup_db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/julianna"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

pg_dump -U julianna_user julianna_db > $BACKUP_DIR/backup_$DATE.sql

# Garder seulement les 7 derniers backups
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

echo "Backup créé : backup_$DATE.sql"
EOF

chmod +x /var/www/julianna/backup_db.sh

# Ajouter au crontab (backup quotidien à 2h du matin)
crontab -e
# Ajouter la ligne :
0 2 * * * /var/www/julianna/backup_db.sh
```

---

## 🐛 Dépannage

### Les services ne démarrent pas
```bash
# Vérifier les logs détaillés
pm2 logs --lines 50

# Tester le backend manuellement
source venv/bin/activate
python manage.py runserver 0.0.0.0:8090

# Tester le frontend manuellement
cd frontend
npm start
```

### Erreur de connexion base de données
```bash
# Vérifier que PostgreSQL est actif
sudo systemctl status postgresql

# Tester la connexion
psql -U julianna_user -d julianna_db -h localhost

# Vérifier les logs PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Port déjà utilisé
```bash
# Trouver le processus
sudo lsof -i :3000
sudo lsof -i :8090

# Tuer le processus si nécessaire
sudo kill -9 <PID>

# Ou redémarrer PM2
pm2 restart all
```

---

## ✅ Checklist Déploiement

- [ ] VPS accessible via SSH
- [ ] Node.js, Python3, PostgreSQL installés
- [ ] Base de données PostgreSQL créée
- [ ] Fichier .env configuré (backend et frontend)
- [ ] Code déployé dans /var/www/julianna
- [ ] Environnement virtuel Python créé
- [ ] Dépendances Python installées
- [ ] Dépendances npm installées (racine + frontend)
- [ ] Migrations appliquées
- [ ] Données de production restaurées
- [ ] Fichiers statiques collectés
- [ ] PM2 installé globalement
- [ ] Application démarrée avec PM2
- [ ] Configuration PM2 sauvegardée
- [ ] Démarrage automatique configuré
- [ ] Pare-feu configuré (ports 22, 3000, 8090)
- [ ] Frontend accessible (port 3000)
- [ ] Backend accessible (port 8090)
- [ ] Backup automatique configuré

---

## 🎯 Résumé des Commandes Essentielles

```bash
# Démarrer l'application
pm2 start ecosystem.config.js

# Voir le statut
pm2 status

# Voir les logs
pm2 logs

# Redémarrer
pm2 restart all

# Arrêter
pm2 stop all

# Mise à jour
./update.sh

# Backup base de données
./backup_db.sh
```

---

🎉 **Votre application Centre de Santé Julianna est maintenant en production sur votre VPS !**

**URLs :**
- Frontend : http://votre-ip-vps:3000
- Backend : http://votre-ip-vps:8090
- Admin : http://votre-ip-vps:8090/admin
