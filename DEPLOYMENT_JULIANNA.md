# 🏥 Guide de Déploiement en Production - Centre de Santé JULIANNA

## 📋 Table des matières
- [Prérequis Système](#prérequis-système)
- [Installation de l'environnement](#installation-de-lenvironnement)
- [Configuration de l'application](#configuration-de-lapplication)
- [Base de données](#base-de-données)
- [Chargement des données de production](#chargement-des-données-de-production)
- [Configuration du serveur web](#configuration-du-serveur-web)
- [Démarrage de l'application](#démarrage-de-lapplication)
- [Maintenance et mises à jour](#maintenance-et-mises-à-jour)
- [Dépannage](#dépannage)

---

## 🖥️ Prérequis Système

### Matériel recommandé
- **CPU**: 2 cœurs minimum (4 recommandés)
- **RAM**: 4 GB minimum (8 GB recommandés)
- **Disque**: 50 GB minimum
- **OS**: Ubuntu 20.04/22.04 LTS, Debian 11+, Windows Server 2019+, ou CentOS 8+

### Logiciels requis
- Python 3.9 ou supérieur
- PostgreSQL 12+ (recommandé) ou SQLite pour tests
- Redis 6.0+ (pour cache et Celery)
- Git (pour cloner le projet)

---

## 📦 Installation de l'environnement

### 1. Installation de Python et pip

#### Sur Ubuntu/Debian:
```bash
# Mettre à jour les paquets
sudo apt update
sudo apt upgrade -y

# Installer Python et outils
sudo apt install -y python3 python3-pip python3-venv python3-dev
sudo apt install -y build-essential libpq-dev

# Vérifier l'installation
python3 --version  # Doit afficher Python 3.9+
```

#### Sur Windows:
```powershell
# Télécharger Python depuis python.org (version 3.9+)
# Ou installer via Chocolatey
choco install python -y

# Vérifier l'installation
python --version
```

### 2. Installation de PostgreSQL

#### Sur Ubuntu/Debian:
```bash
# Installer PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Démarrer le service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Vérifier le statut
sudo systemctl status postgresql
```

#### Sur Windows:
```powershell
# Télécharger depuis postgresql.org et installer
# Ou via Chocolatey
choco install postgresql -y
```

### 3. Installation de Redis

#### Sur Ubuntu/Debian:
```bash
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### Sur Windows:
```powershell
# Télécharger depuis https://github.com/microsoftarchive/redis/releases
# Ou utiliser WSL2 pour Redis
```

---

## 🚀 Installation de l'application

### 1. Cloner le projet

```bash
# Naviguer vers le dossier de déploiement
cd /var/www  # Sur Linux
# ou
cd C:\inetpub\wwwroot  # Sur Windows

# Cloner le projet
git clone <URL_DU_REPO> procuregenius
cd procuregenius
```

### 2. Créer l'environnement virtuel Python (venv)

```bash
# Créer le venv
python3 -m venv venv

# Activer le venv
# Sur Linux/Mac:
source venv/bin/activate

# Sur Windows:
venv\Scripts\activate

# Vous devriez voir (venv) dans votre terminal
```

### 3. Installer les dépendances

```bash
# Mettre à jour pip
pip install --upgrade pip

# Installer toutes les dépendances
pip install -r requirements.txt

# Vérifier l'installation
pip list
```

---

## ⚙️ Configuration de l'application

### 1. Créer le fichier .env

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer le fichier .env
nano .env  # Sur Linux
# ou
notepad .env  # Sur Windows
```

### 2. Configuration du fichier .env pour PRODUCTION

```env
# ============================================================
# CONFIGURATION PRODUCTION - CENTRE DE SANTÉ JULIANNA
# ============================================================

# Django settings
SECRET_KEY=CHANGEZ_CETTE_CLE_SECRETE_TRES_LONGUE_ET_ALEATOIRE_ICI
DEBUG=False
ALLOWED_HOSTS=csj.cm,www.csj.cm,api.csj.cm,localhost

# Database PostgreSQL (RECOMMANDÉ POUR PRODUCTION)
DATABASE_URL=postgres://julianna_user:MOT_DE_PASSE_SECURISE@localhost:5432/julianna_db

# Redis (pour cache et Celery)
REDIS_URL=redis://localhost:6379/0

# Mistral AI (pour l'assistant IA)
MISTRAL_API_KEY=votre_cle_mistral_ici
MISTRAL_MODEL=mistral-large-latest

# Email settings (Gmail ou SMTP local)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=noreply@csj.cm
EMAIL_HOST_PASSWORD=votre_mot_de_passe_app_gmail
DEFAULT_FROM_EMAIL=noreply@csj.cm

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Sécurité (désactiver pour développement local)
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# CORS (ajouter vos domaines)
CORS_ALLOWED_ORIGINS=https://csj.cm,https://www.csj.cm

# Localisation
LANGUAGE_CODE=fr
TIME_ZONE=Africa/Douala
```

### 3. Générer une clé secrète Django

```bash
# Générer une clé aléatoire
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Copier la clé générée dans SECRET_KEY du fichier .env
```

---

## 🗄️ Base de données

### 1. Créer la base de données PostgreSQL

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Dans le shell PostgreSQL, exécuter:
CREATE DATABASE julianna_db;
CREATE USER julianna_user WITH PASSWORD 'root';
ALTER ROLE julianna_user SET client_encoding TO 'utf8';
ALTER ROLE julianna_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE julianna_user SET timezone TO 'Africa/Douala';
GRANT ALL PRIVILEGES ON DATABASE julianna_db TO julianna_user;

# Quitter
\q
```

### 2. Exécuter les migrations

```bash
# S'assurer que le venv est activé
source venv/bin/activate  # Linux
# ou
venv\Scripts\activate  # Windows

# Créer les tables
python manage.py migrate

# Vérifier les migrations
python manage.py showmigrations
```

### 3. Créer les fichiers statiques

```bash
# Collecter les fichiers statiques
python manage.py collectstatic --noinput

# Créer les dossiers média
mkdir -p media/invoices media/prescriptions media/lab_reports
```

---

## 🏥 Chargement des données de production

### Option 1: Données de production complètes (Recommandé)

Cette commande crée l'organisation, les utilisateurs, le catalogue complet (82 tests labo + 145 médicaments + 44 services).

```bash
# Charger les données de production du Centre de Santé JULIANNA
python manage.py create_julianna_production_data

# Avec reset (supprimer les données existantes):
python manage.py create_julianna_production_data --reset

# Avec simulations de scénarios cliniques (optionnel):
python manage.py create_julianna_production_data --reset --with-simulations
```

**Ce qui sera créé:**
- ✅ Organisation: Centre de Santé JULIANNA
- ✅ 5 utilisateurs (admin, réception, docteur, labo, pharmacie)
- ✅ 82 tests de laboratoire avec valeurs de référence médicales
- ✅ 145 médicaments avec stocks et lots
- ✅ 44 services médicaux (consultations, soins, imagerie)
- ✅ Catégories et configuration complète
- ✅ (Optionnel) 15 patients avec scénarios cliniques complets

### Option 2: Données healthcare avec interactions

Cette commande crée l'organisation + 2 patients avec parcours cliniques complets.

```bash
# Créer les données healthcare avec scénarios d'interactions
python manage.py create_julianna_healthcare

# Avec reset:
python manage.py create_julianna_healthcare --reset
```

**Ce qui sera créé:**
- ✅ Organisation + utilisateurs
- ✅ Catalogue de tests (82 tests)
- ✅ Catalogue de médicaments (8 médicaments essentiels)
- ✅ Services médicaux (44 services)
- ✅ 2 patients (Fabrice et Angel)
- ✅ Scénarios cliniques complets:
  - Consultations
  - Ordonnances de laboratoire
  - Résultats d'analyses
  - Prescriptions médicamenteuses
  - Dispensations pharmacie
  - Factures

### 4. Créer un superutilisateur (Admin Django)

```bash
python manage.py createsuperuser
# Suivre les instructions
```

---

## 🔐 Comptes utilisateurs créés

Après l'exécution de `create_julianna_production_data` ou `create_julianna_healthcare`:

| Utilisateur | Email | Mot de passe | Rôle |
|------------|-------|--------------|------|
| julianna_admin | admin@csj.cm | julianna2025 | Administrateur |
| julianna_reception | reception@csj.cm | julianna2025 | Réceptionniste |
| julianna_doctor | docteur@csj.cm | julianna2025 | Médecin |
| julianna_lab | labo@csj.cm | julianna2025 | Technicien labo |
| julianna_pharmacist | pharma@csj.cm | julianna2025 | Pharmacien |

**⚠️ IMPORTANT**: Changez tous les mots de passe après le premier déploiement!

```bash
# Changer le mot de passe d'un utilisateur
python manage.py changepassword julianna_admin
```

---

## 🌐 Configuration du serveur web

### Option 1: Gunicorn (Recommandé pour production)

#### 1. Créer un fichier de configuration Gunicorn

```bash
# Créer le fichier gunicorn_config.py
nano gunicorn_config.py
```

```python
# gunicorn_config.py
import multiprocessing

bind = "0.0.0.0:8000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 120
keepalive = 5
max_requests = 1000
max_requests_jitter = 50

# Logging
accesslog = "logs/gunicorn_access.log"
errorlog = "logs/gunicorn_error.log"
loglevel = "info"

# Security
limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8190
```

#### 2. Créer le dossier logs

```bash
mkdir -p logs
```

#### 3. Tester Gunicorn

```bash
# Avec le venv activé
gunicorn saas_procurement.wsgi:application --config gunicorn_config.py
```

#### 4. Créer un service systemd (Linux)

```bash
# Créer le fichier service
sudo nano /etc/systemd/system/julianna.service
```

```ini
[Unit]
Description=Centre de Santé JULIANNA - Gunicorn
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/procuregenius
Environment="PATH=/var/www/procuregenius/venv/bin"
ExecStart=/var/www/procuregenius/venv/bin/gunicorn saas_procurement.wsgi:application --config gunicorn_config.py
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
# Activer et démarrer le service
sudo systemctl daemon-reload
sudo systemctl enable julianna
sudo systemctl start junicanna
sudo systemctl status julianna
```

### Option 2: Configuration Nginx (Reverse Proxy)

```bash
# Créer la configuration Nginx
sudo nano /etc/nginx/sites-available/julianna
```

```nginx
server {
    listen 80;
    server_name csj.cm www.csj.cm;

    # Redirection HTTPS (à activer après avoir obtenu un certificat SSL)
    # return 301 https://$server_name$request_uri;

    location /static/ {
        alias /var/www/procuregenius/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        alias /var/www/procuregenius/media/;
        expires 30d;
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
        proxy_buffering off;
    }

    client_max_body_size 20M;
}
```

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/julianna /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Option 3: Obtenir un certificat SSL (Let's Encrypt)

```bash
# Installer Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtenir un certificat SSL
sudo certbot --nginx -d csj.cm -d www.csj.cm

# Le renouvellement automatique est configuré par défaut
sudo certbot renew --dry-run
```

---

## 🚀 Démarrage de l'application

### Démarrage manuel (développement/test)

```bash
# Activer le venv
source venv/bin/activate  # Linux
# ou
venv\Scripts\activate  # Windows

# Lancer le serveur de développement
python manage.py runserver 0.0.0.0:8000

# Accéder à l'application
# http://localhost:8000
```

### Démarrage en production (avec Gunicorn)

```bash
# Avec systemd (recommandé):
sudo systemctl start julianna
sudo systemctl status julianna

# Ou manuellement:
gunicorn saas_procurement.wsgi:application --config gunicorn_config.py --daemon

# Arrêter:
sudo systemctl stop julianna
```

### Démarrage de Celery (tâches asynchrones)

```bash
# Worker Celery
celery -A saas_procurement worker --loglevel=info

# Beat (tâches planifiées)
celery -A saas_procurement beat --loglevel=info

# Ou créer des services systemd pour Celery
```

---

## 🔄 Maintenance et mises à jour

### Mise à jour du code

```bash
# Se placer dans le dossier du projet
cd /var/www/procuregenius

# Activer le venv
source venv/bin/activate

# Récupérer les dernières modifications
git pull origin main

# Installer les nouvelles dépendances
pip install -r requirements.txt --upgrade

# Exécuter les migrations
python manage.py migrate

# Collecter les fichiers statiques
python manage.py collectstatic --noinput

# Redémarrer le service
sudo systemctl restart julianna
```

### Sauvegarde de la base de données

```bash
# Créer un dossier de sauvegarde
mkdir -p backups

# Sauvegarder PostgreSQL
pg_dump -U julianna_user -h localhost julianna_db > backups/julianna_$(date +%Y%m%d_%H%M%S).sql

# Ou utiliser la commande Django
python manage.py dumpdata --natural-foreign --natural-primary --indent 2 > backups/data_$(date +%Y%m%d_%H%M%S).json

# Automatiser avec cron (tous les jours à 2h du matin)
# sudo crontab -e
# 0 2 * * * cd /var/www/procuregenius && ./venv/bin/python manage.py dumpdata > backups/data_$(date +\%Y\%m\%d).json
```

### Restauration de la base de données

```bash
# Restaurer depuis un dump SQL
psql -U julianna_user -h localhost julianna_db < backups/julianna_20250205_140000.sql

# Ou depuis un fichier JSON Django
python manage.py loaddata backups/data_20250205_140000.json
```

---

## 📊 Vérifications post-déploiement

### 1. Vérifier les services

```bash
# PostgreSQL
sudo systemctl status postgresql

# Redis
sudo systemctl status redis-server

# Gunicorn
sudo systemctl status julianna

# Nginx
sudo systemctl status nginx
```

### 2. Vérifier les logs

```bash
# Logs application
tail -f logs/django.log
tail -f logs/gunicorn_access.log
tail -f logs/gunicorn_error.log

# Logs système
sudo journalctl -u julianna -f
```

### 3. Tester l'application

```bash
# Vérifier que le serveur répond
curl http://localhost:8000

# Se connecter à l'interface admin
# http://votre-domaine.com/admin
# Login: julianna_admin / julianna2025
```

---

## 🔍 Dépannage

### Problème: "ModuleNotFoundError"

```bash
# Vérifier que le venv est activé
which python  # Doit pointer vers venv/bin/python

# Réinstaller les dépendances
pip install -r requirements.txt
```

### Problème: "Database connection failed"

```bash
# Vérifier que PostgreSQL est démarré
sudo systemctl status postgresql

# Tester la connexion
psql -U julianna_user -h localhost -d julianna_db

# Vérifier les variables dans .env
cat .env | grep DATABASE_URL
```

### Problème: "Static files not found"

```bash
# Collecter à nouveau les fichiers statiques
python manage.py collectstatic --noinput --clear

# Vérifier les permissions
sudo chown -R www-data:www-data staticfiles/
sudo chmod -R 755 staticfiles/
```

### Problème: "Permission denied"

```bash
# Corriger les permissions
sudo chown -R www-data:www-data /var/www/procuregenius
sudo chmod -R 755 /var/www/procuregenius
```

---

## 📞 Support et contacts

### Informations Centre de Santé JULIANNA
- **Nom**: Centre de Santé JULIANNA
- **Localisation**: Makepe, Douala, Cameroun
- **Email**: contact@centrejulianna.com
- **Téléphone**: +237 233 XX XX XX

### Commandes utiles de diagnostic

```bash
# Vérifier la version de Python
python --version

# Vérifier les packages installés
pip list

# Vérifier les migrations
python manage.py showmigrations

# Vérifier la configuration
python manage.py check

# Afficher les statistiques
python manage.py shell
>>> from apps.accounts.models import Organization
>>> org = Organization.objects.first()
>>> print(org.name)
>>> from apps.laboratory.models import LabTest
>>> print(LabTest.objects.count())
>>> exit()
```

---

## ✅ Checklist de déploiement

- [ ] Python 3.9+ installé
- [ ] PostgreSQL configuré et base de données créée
- [ ] Redis installé et démarré
- [ ] Environnement virtuel (venv) créé et activé
- [ ] Dépendances installées (`pip install -r requirements.txt`)
- [ ] Fichier .env configuré avec les bonnes valeurs
- [ ] SECRET_KEY changée en production
- [ ] DEBUG=False dans .env
- [ ] Migrations exécutées (`python manage.py migrate`)
- [ ] Données de production chargées (`create_julianna_production_data`)
- [ ] Superutilisateur créé
- [ ] Fichiers statiques collectés (`collectstatic`)
- [ ] Gunicorn configuré et démarré
- [ ] Nginx configuré (optionnel)
- [ ] SSL/HTTPS activé (optionnel)
- [ ] Sauvegardes automatiques configurées
- [ ] Tous les mots de passe par défaut changés
- [ ] Logs accessibles et surveillés
- [ ] Application testée et fonctionnelle

---

## 🎉 Félicitations!

Le Centre de Santé JULIANNA est maintenant déployé en production!

**Prochaines étapes:**
1. Former le personnel aux différents modules
2. Commencer à enregistrer les patients
3. Configurer les notifications SMS/Email
4. Mettre en place les rapports périodiques
5. Surveiller les performances et logs

---

**Date de création**: 2025-02-05
**Version**: 1.0
**Application**: ProcureGenius Healthcare
