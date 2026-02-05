#!/bin/bash
# ============================================================
# COMMANDES DE DÉPLOIEMENT - CENTRE DE SANTÉ JULIANNA
# ============================================================
# Script de référence rapide pour le déploiement
# NE PAS EXÉCUTER CE SCRIPT DIRECTEMENT - Copier/coller les commandes nécessaires

# ============================================================
# 1. INSTALLATION SYSTÈME (Ubuntu/Debian)
# ============================================================

# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer les dépendances système
sudo apt install -y python3 python3-pip python3-venv python3-dev \
    build-essential libpq-dev git \
    postgresql postgresql-contrib \
    redis-server nginx

# Démarrer les services
sudo systemctl start postgresql
sudo systemctl start redis-server
sudo systemctl enable postgresql
sudo systemctl enable redis-server

# ============================================================
# 2. CONFIGURATION BASE DE DONNÉES POSTGRESQL
# ============================================================

# Se connecter à PostgreSQL
sudo -u postgres psql

# Dans le shell PostgreSQL:
# CREATE DATABASE julianna_db;
# CREATE USER julianna_user WITH PASSWORD 'CHANGEZ_MOT_DE_PASSE';
# ALTER ROLE julianna_user SET client_encoding TO 'utf8';
# ALTER ROLE julianna_user SET default_transaction_isolation TO 'read committed';
# ALTER ROLE julianna_user SET timezone TO 'Africa/Douala';
# GRANT ALL PRIVILEGES ON DATABASE julianna_db TO julianna_user;
# \q

# ============================================================
# 3. INSTALLATION APPLICATION
# ============================================================

# Naviguer vers le dossier d'installation
cd /var/www
# sudo git clone <URL_DU_REPO> procuregenius
cd procuregenius

# Créer et activer l'environnement virtuel
python3 -m venv venv
source venv/bin/activate

# Installer les dépendances
pip install --upgrade pip
pip install -r requirements.txt

# ============================================================
# 4. CONFIGURATION ENVIRONNEMENT
# ============================================================

# Copier le fichier .env
cp .env.example .env

# Générer une clé secrète Django
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Éditer le fichier .env avec les bonnes valeurs
# nano .env

# Configuration minimale requise dans .env:
# SECRET_KEY=<clé_générée_ci-dessus>
# DEBUG=False
# ALLOWED_HOSTS=votre-domaine.com,www.votre-domaine.com,localhost
# DATABASE_URL=postgres://julianna_user:MOT_DE_PASSE@localhost:5432/julianna_db
# REDIS_URL=redis://localhost:6379/0

# ============================================================
# 5. MIGRATIONS ET DONNÉES
# ============================================================

# Exécuter les migrations
python manage.py migrate

# Collecter les fichiers statiques
python manage.py collectstatic --noinput

# Créer les dossiers média
mkdir -p media/invoices media/prescriptions media/lab_reports
mkdir -p logs

# ============================================================
# 6. CHARGER LES DONNÉES DE PRODUCTION JULIANNA
# ============================================================

# OPTION 1: Données complètes de production (RECOMMANDÉ)
# Crée: Organisation + 5 utilisateurs + 82 tests labo + 145 médicaments + 44 services
python manage.py create_julianna_production_data

# Avec reset (supprimer données existantes):
python manage.py create_julianna_production_data --reset

# Avec simulations de patients et scénarios cliniques:
python manage.py create_julianna_production_data --reset --with-simulations

# OPTION 2: Données healthcare avec interactions
# Crée: Organisation + utilisateurs + catalogues + 2 patients avec parcours complets
python manage.py create_julianna_healthcare

# Avec reset:
python manage.py create_julianna_healthcare --reset

# ============================================================
# 7. CRÉER UN SUPERUTILISATEUR (OPTIONNEL)
# ============================================================

python manage.py createsuperuser

# ============================================================
# 8. CONFIGURATION GUNICORN
# ============================================================

# Le fichier gunicorn_config.py est déjà créé dans le projet
# Tester Gunicorn manuellement:
gunicorn saas_procurement.wsgi:application --config gunicorn_config.py

# Créer le service systemd
sudo nano /etc/systemd/system/julianna.service

# Contenu du fichier julianna.service:
# [Unit]
# Description=Centre de Santé JULIANNA - Gunicorn
# After=network.target
#
# [Service]
# Type=notify
# User=www-data
# Group=www-data
# WorkingDirectory=/var/www/procuregenius
# Environment="PATH=/var/www/procuregenius/venv/bin"
# ExecStart=/var/www/procuregenius/venv/bin/gunicorn saas_procurement.wsgi:application --config gunicorn_config.py
# ExecReload=/bin/kill -s HUP $MAINPID
# KillMode=mixed
# TimeoutStopSec=5
# PrivateTmp=true
# Restart=on-failure
#
# [Install]
# WantedBy=multi-user.target

# Activer et démarrer le service
sudo systemctl daemon-reload
sudo systemctl enable julianna
sudo systemctl start julianna
sudo systemctl status julianna

# ============================================================
# 9. CONFIGURATION NGINX (OPTIONNEL)
# ============================================================

# Créer la configuration Nginx
sudo nano /etc/nginx/sites-available/julianna

# Contenu du fichier (voir DEPLOYMENT_JULIANNA.md pour la config complète)

# Activer le site
sudo ln -s /etc/nginx/sites-available/julianna /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# ============================================================
# 10. CERTIFICAT SSL (Let's Encrypt)
# ============================================================

# Installer Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtenir un certificat
sudo certbot --nginx -d csj.cm -d www.csj.cm

# Tester le renouvellement automatique
sudo certbot renew --dry-run

# ============================================================
# 11. PERMISSIONS
# ============================================================

# Corriger les permissions
sudo chown -R www-data:www-data /var/www/procuregenius
sudo chmod -R 755 /var/www/procuregenius
sudo chmod -R 755 staticfiles
sudo chmod -R 755 media

# ============================================================
# 12. COMMANDES DE MAINTENANCE
# ============================================================

# Redémarrer l'application
sudo systemctl restart julianna

# Voir les logs
tail -f logs/django.log
tail -f logs/gunicorn_access.log
tail -f logs/gunicorn_error.log
sudo journalctl -u julianna -f

# Sauvegarde de la base de données
mkdir -p backups
pg_dump -U julianna_user -h localhost julianna_db > backups/julianna_$(date +%Y%m%d_%H%M%S).sql

# Ou avec Django
python manage.py dumpdata --natural-foreign --natural-primary --indent 2 > backups/data_$(date +%Y%m%d_%H%M%S).json

# Restaurer une sauvegarde
# PostgreSQL:
psql -U julianna_user -h localhost julianna_db < backups/julianna_YYYYMMDD_HHMMSS.sql

# Django JSON:
python manage.py loaddata backups/data_YYYYMMDD_HHMMSS.json

# ============================================================
# 13. MISE À JOUR DE L'APPLICATION
# ============================================================

# Récupérer les dernières modifications
cd /var/www/procuregenius
source venv/bin/activate
git pull origin main

# Installer les nouvelles dépendances
pip install -r requirements.txt --upgrade

# Exécuter les migrations
python manage.py migrate

# Collecter les fichiers statiques
python manage.py collectstatic --noinput

# Redémarrer
sudo systemctl restart julianna

# ============================================================
# 14. VÉRIFICATIONS
# ============================================================

# Vérifier les services
sudo systemctl status postgresql
sudo systemctl status redis-server
sudo systemctl status julianna
sudo systemctl status nginx

# Vérifier la configuration Django
python manage.py check

# Vérifier les migrations
python manage.py showmigrations

# Tester la connexion HTTP
curl http://localhost:8000

# ============================================================
# 15. COMPTES UTILISATEURS CRÉÉS
# ============================================================

# Après l'exécution de create_julianna_production_data:
#
# julianna_admin      | admin@csj.cm      | julianna2025 | Administrateur
# julianna_reception  | reception@csj.cm  | julianna2025 | Réceptionniste
# julianna_doctor     | docteur@csj.cm    | julianna2025 | Médecin
# julianna_lab        | labo@csj.cm       | julianna2025 | Technicien labo
# julianna_pharmacist | pharma@csj.cm     | julianna2025 | Pharmacien
#
# ⚠️ IMPORTANT: Changer tous les mots de passe après le déploiement!

# Changer un mot de passe:
python manage.py changepassword julianna_admin

# ============================================================
# 16. STATISTIQUES ET INFORMATIONS
# ============================================================

# Accéder au shell Django
python manage.py shell

# Dans le shell:
# >>> from apps.accounts.models import Organization
# >>> from apps.laboratory.models import LabTest
# >>> from apps.invoicing.models import Product
# >>> from apps.accounts.models import CustomUser
# >>>
# >>> org = Organization.objects.first()
# >>> print(f"Organisation: {org.name}")
# >>> print(f"Utilisateurs: {CustomUser.objects.filter(organization=org).count()}")
# >>> print(f"Tests labo: {LabTest.objects.filter(organization=org).count()}")
# >>> print(f"Produits: {Product.objects.filter(organization=org).count()}")
# >>> exit()

# ============================================================
# FIN DU SCRIPT
# ============================================================

echo "Référence des commandes de déploiement pour Centre de Santé JULIANNA"
echo "Consultez DEPLOYMENT_JULIANNA.md pour la documentation complète"
