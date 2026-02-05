@echo off
REM ============================================================
REM COMMANDES DE DÉPLOIEMENT WINDOWS - CENTRE DE SANTÉ JULIANNA
REM ============================================================
REM Script de référence rapide pour le déploiement sur Windows
REM NE PAS EXÉCUTER CE SCRIPT DIRECTEMENT - Copier/coller les commandes nécessaires

echo ============================================================
echo GUIDE DE DÉPLOIEMENT WINDOWS - CENTRE DE SANTÉ JULIANNA
echo ============================================================
echo.
echo Ce fichier contient les commandes de référence pour le déploiement.
echo Consultez DEPLOYMENT_JULIANNA.md pour la documentation complète.
echo.
pause

REM ============================================================
REM 1. PRÉREQUIS (À installer manuellement)
REM ============================================================
REM - Python 3.9+ : https://www.python.org/downloads/
REM - PostgreSQL 12+ : https://www.postgresql.org/download/windows/
REM - Redis : https://github.com/microsoftarchive/redis/releases (ou WSL2)
REM - Git : https://git-scm.com/download/win

REM ============================================================
REM 2. VÉRIFIER LES INSTALLATIONS
REM ============================================================

python --version
REM Doit afficher Python 3.9+

pip --version
git --version

REM ============================================================
REM 3. CLONER LE PROJET
REM ============================================================

cd C:\inetpub\wwwroot
REM ou
cd C:\Projects

REM git clone <URL_DU_REPO> procuregenius
cd procuregenius

REM ============================================================
REM 4. CRÉER L'ENVIRONNEMENT VIRTUEL
REM ============================================================

python -m venv venv

REM Activer le venv
venv\Scripts\activate

REM Vous devriez voir (venv) dans votre prompt

REM ============================================================
REM 5. INSTALLER LES DÉPENDANCES
REM ============================================================

python -m pip install --upgrade pip
pip install -r requirements.txt

REM ============================================================
REM 6. CONFIGURATION ENVIRONNEMENT
REM ============================================================

REM Copier le fichier .env
copy .env.example .env

REM Générer une clé secrète
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

REM Éditer le fichier .env avec Notepad
notepad .env

REM Configuration minimale dans .env:
REM SECRET_KEY=<clé_générée_ci-dessus>
REM DEBUG=False
REM ALLOWED_HOSTS=localhost,127.0.0.1,votre-domaine.com
REM DATABASE_URL=postgres://julianna_user:MOT_DE_PASSE@localhost:5432/julianna_db
REM REDIS_URL=redis://localhost:6379/0

REM ============================================================
REM 7. CONFIGURATION POSTGRESQL (Windows PowerShell en Admin)
REM ============================================================

REM Ouvrir PowerShell en tant qu'administrateur
REM psql -U postgres

REM Dans le shell PostgreSQL:
REM CREATE DATABASE julianna_db;
REM CREATE USER julianna_user WITH PASSWORD 'CHANGEZ_MOT_DE_PASSE';
REM ALTER ROLE julianna_user SET client_encoding TO 'utf8';
REM ALTER ROLE julianna_user SET default_transaction_isolation TO 'read committed';
REM ALTER ROLE julianna_user SET timezone TO 'Africa/Douala';
REM GRANT ALL PRIVILEGES ON DATABASE julianna_db TO julianna_user;
REM \q

REM ============================================================
REM 8. MIGRATIONS ET FICHIERS STATIQUES
REM ============================================================

REM S'assurer que le venv est activé
venv\Scripts\activate

REM Exécuter les migrations
python manage.py migrate

REM Collecter les fichiers statiques
python manage.py collectstatic --noinput

REM Créer les dossiers
mkdir media\invoices
mkdir media\prescriptions
mkdir media\lab_reports
mkdir logs

REM ============================================================
REM 9. CHARGER LES DONNÉES DE PRODUCTION
REM ============================================================

REM OPTION 1: Données complètes de production (RECOMMANDÉ)
python manage.py create_julianna_production_data

REM Avec reset:
python manage.py create_julianna_production_data --reset

REM Avec simulations:
python manage.py create_julianna_production_data --reset --with-simulations

REM OPTION 2: Données healthcare avec interactions
python manage.py create_julianna_healthcare

REM Avec reset:
python manage.py create_julianna_healthcare --reset

REM ============================================================
REM 10. CRÉER UN SUPERUTILISATEUR (OPTIONNEL)
REM ============================================================

python manage.py createsuperuser

REM ============================================================
REM 11. DÉMARRER L'APPLICATION (DÉVELOPPEMENT)
REM ============================================================

REM Démarrer le serveur de développement
python manage.py runserver 0.0.0.0:8000

REM Accéder à l'application:
REM http://localhost:8000

REM ============================================================
REM 12. DÉMARRER L'APPLICATION (PRODUCTION - Gunicorn)
REM ============================================================

REM Installer Gunicorn (si pas déjà fait)
pip install gunicorn

REM Démarrer avec Gunicorn
gunicorn saas_procurement.wsgi:application --config gunicorn_config.py

REM ============================================================
REM 13. DÉMARRER COMME SERVICE WINDOWS (PRODUCTION)
REM ============================================================

REM Option 1: Utiliser NSSM (Non-Sucking Service Manager)
REM Télécharger: https://nssm.cc/download

REM Installer le service
REM nssm install JuliannaApp "C:\Projects\procuregenius\venv\Scripts\python.exe"
REM nssm set JuliannaApp AppDirectory "C:\Projects\procuregenius"
REM nssm set JuliannaApp AppParameters "C:\Projects\procuregenius\venv\Scripts\gunicorn.exe saas_procurement.wsgi:application --config gunicorn_config.py"
REM nssm start JuliannaApp

REM Option 2: Utiliser Task Scheduler pour démarrer automatiquement

REM ============================================================
REM 14. COMMANDES DE MAINTENANCE
REM ============================================================

REM Voir les logs
type logs\django.log
type logs\gunicorn_access.log

REM Sauvegarde de la base de données
mkdir backups

REM Avec PostgreSQL (pg_dump doit être dans le PATH)
pg_dump -U julianna_user -h localhost julianna_db > backups\julianna_%date:~-4,4%%date:~-7,2%%date:~-10,2%.sql

REM Avec Django
python manage.py dumpdata --natural-foreign --natural-primary --indent 2 > backups\data_%date:~-4,4%%date:~-7,2%%date:~-10,2%.json

REM Restaurer une sauvegarde PostgreSQL
REM psql -U julianna_user -h localhost -d julianna_db < backups\julianna_YYYYMMDD.sql

REM Restaurer une sauvegarde Django JSON
REM python manage.py loaddata backups\data_YYYYMMDD.json

REM ============================================================
REM 15. MISE À JOUR DE L'APPLICATION
REM ============================================================

REM Se placer dans le dossier
cd C:\Projects\procuregenius

REM Activer le venv
venv\Scripts\activate

REM Récupérer les modifications
git pull origin main

REM Installer les nouvelles dépendances
pip install -r requirements.txt --upgrade

REM Exécuter les migrations
python manage.py migrate

REM Collecter les fichiers statiques
python manage.py collectstatic --noinput

REM Redémarrer le service
REM net stop JuliannaApp
REM net start JuliannaApp

REM ============================================================
REM 16. VÉRIFICATIONS
REM ============================================================

REM Vérifier la configuration
python manage.py check

REM Vérifier les migrations
python manage.py showmigrations

REM Tester la connexion
curl http://localhost:8000
REM ou ouvrir un navigateur: http://localhost:8000

REM ============================================================
REM 17. COMPTES UTILISATEURS CRÉÉS
REM ============================================================

echo.
echo ============================================================
echo COMPTES UTILISATEURS (après create_julianna_production_data)
echo ============================================================
echo.
echo Username: julianna_admin      Email: admin@csj.cm      Password: julianna2025
echo Username: julianna_reception  Email: reception@csj.cm  Password: julianna2025
echo Username: julianna_doctor     Email: docteur@csj.cm    Password: julianna2025
echo Username: julianna_lab        Email: labo@csj.cm       Password: julianna2025
echo Username: julianna_pharmacist Email: pharma@csj.cm     Password: julianna2025
echo.
echo IMPORTANT: Changez tous les mots de passe après le déploiement!
echo.

REM Changer un mot de passe
REM python manage.py changepassword julianna_admin

REM ============================================================
REM 18. STATISTIQUES
REM ============================================================

REM Accéder au shell Django
python manage.py shell

REM Dans le shell Python:
REM >>> from apps.accounts.models import Organization, CustomUser
REM >>> from apps.laboratory.models import LabTest
REM >>> from apps.invoicing.models import Product
REM >>> org = Organization.objects.first()
REM >>> print(f"Organisation: {org.name}")
REM >>> print(f"Utilisateurs: {CustomUser.objects.filter(organization=org).count()}")
REM >>> print(f"Tests labo: {LabTest.objects.filter(organization=org).count()}")
REM >>> print(f"Produits: {Product.objects.filter(organization=org).count()}")
REM >>> exit()

REM ============================================================
REM 19. DÉMARRAGE RAPIDE POUR DÉVELOPPEMENT
REM ============================================================

REM Créer un fichier start_dev.bat avec le contenu suivant:

REM @echo off
REM cd C:\Projects\procuregenius
REM call venv\Scripts\activate
REM python manage.py runserver 0.0.0.0:8000

REM ============================================================
REM 20. ARRÊT ET REDÉMARRAGE
REM ============================================================

REM Arrêter le serveur de développement
REM Ctrl+C dans le terminal

REM Arrêter le service Windows
REM net stop JuliannaApp

REM Démarrer le service Windows
REM net start JuliannaApp

REM Redémarrer le service Windows
REM net stop JuliannaApp && net start JuliannaApp

REM ============================================================
REM FIN DU GUIDE
REM ============================================================

echo.
echo ============================================================
echo Pour plus d'informations, consultez:
echo - DEPLOYMENT_JULIANNA.md (Documentation complète)
echo - DEPLOYMENT_COMMANDS.sh (Commandes Linux)
echo ============================================================
echo.

pause
