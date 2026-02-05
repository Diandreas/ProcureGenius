# 📚 Documentation de Déploiement - Centre de Santé JULIANNA

## 📂 Fichiers de déploiement créés

Ce dossier contient tous les fichiers nécessaires pour déployer l'application ProcureGenius en production pour le Centre de Santé JULIANNA.

### 📄 Fichiers disponibles

| Fichier | Description | Plateforme |
|---------|-------------|------------|
| **DEPLOYMENT_JULIANNA.md** | 📖 Documentation complète de déploiement | Tous |
| **DEPLOYMENT_COMMANDS.sh** | 🐧 Commandes de référence rapide | Linux/Mac |
| **DEPLOYMENT_WINDOWS.bat** | 🪟 Commandes de référence rapide | Windows |
| **start_dev.sh** | 🚀 Script de démarrage rapide | Linux/Mac |
| **start_dev.bat** | 🚀 Script de démarrage rapide | Windows |

---

## 🚀 Démarrage rapide

### Pour développement local (Windows):

```cmd
# Double-cliquer sur le fichier
start_dev.bat

# Ou dans le terminal
start_dev.bat
```

### Pour développement local (Linux/Mac):

```bash
# Rendre le script exécutable (une seule fois)
chmod +x start_dev.sh

# Lancer le script
./start_dev.sh
```

Le serveur démarre sur: **http://localhost:8000**

---

## 📖 Guide de déploiement complet

### Étape 1: Lire la documentation

Consultez le fichier **[DEPLOYMENT_JULIANNA.md](DEPLOYMENT_JULIANNA.md)** pour la documentation complète avec:
- ✅ Prérequis système
- ✅ Installation pas à pas
- ✅ Configuration de la base de données
- ✅ Variables d'environnement
- ✅ Déploiement en production
- ✅ Configuration Nginx/Gunicorn
- ✅ Certificat SSL
- ✅ Maintenance et sauvegardes

### Étape 2: Installation de base

#### Sur Linux/Mac:

```bash
# 1. Créer l'environnement virtuel
python3 -m venv venv
source venv/bin/activate

# 2. Installer les dépendances
pip install -r requirements.txt

# 3. Configurer l'environnement
cp .env.example .env
nano .env  # Éditer avec vos valeurs

# 4. Créer la base de données PostgreSQL
sudo -u postgres psql
# CREATE DATABASE julianna_db;
# CREATE USER julianna_user WITH PASSWORD 'votre_mot_de_passe';
# GRANT ALL PRIVILEGES ON DATABASE julianna_db TO julianna_user;
# \q

# 5. Exécuter les migrations
python manage.py migrate

# 6. Charger les données de production
python manage.py create_julianna_production_data

# 7. Démarrer le serveur
./start_dev.sh
```

#### Sur Windows:

```cmd
# 1. Créer l'environnement virtuel
python -m venv venv
venv\Scripts\activate

# 2. Installer les dépendances
pip install -r requirements.txt

# 3. Configurer l'environnement
copy .env.example .env
notepad .env  # Éditer avec vos valeurs

# 4. Créer la base de données PostgreSQL
# Ouvrir pgAdmin ou psql
# CREATE DATABASE julianna_db;
# CREATE USER julianna_user WITH PASSWORD 'votre_mot_de_passe';
# GRANT ALL PRIVILEGES ON DATABASE julianna_db TO julianna_user;

# 5. Exécuter les migrations
python manage.py migrate

# 6. Charger les données de production
python manage.py create_julianna_production_data

# 7. Démarrer le serveur
start_dev.bat
```

---

## 🏥 Chargement des données de production

### Option 1: Données complètes (RECOMMANDÉ)

Crée l'organisation complète avec tous les catalogues:
- ✅ 5 utilisateurs (admin, réception, docteur, labo, pharmacie)
- ✅ 82 tests de laboratoire avec valeurs de référence
- ✅ 145 médicaments avec stocks
- ✅ 44 services médicaux

```bash
# Sans patients (production pure)
python manage.py create_julianna_production_data

# Avec reset des données existantes
python manage.py create_julianna_production_data --reset

# Avec patients et scénarios de démonstration
python manage.py create_julianna_production_data --reset --with-simulations
```

### Option 2: Données healthcare avec interactions

Crée l'organisation + 2 patients avec parcours cliniques complets:

```bash
python manage.py create_julianna_healthcare

# Avec reset
python manage.py create_julianna_healthcare --reset
```

---

## 👥 Comptes utilisateurs créés

Après l'exécution des commandes de chargement de données:

| Utilisateur | Email | Mot de passe | Rôle |
|------------|-------|--------------|------|
| **julianna_admin** | admin@csj.cm | julianna2025 | Administrateur |
| **julianna_reception** | reception@csj.cm | julianna2025 | Réceptionniste |
| **julianna_doctor** | docteur@csj.cm | julianna2025 | Médecin |
| **julianna_lab** | labo@csj.cm | julianna2025 | Technicien labo |
| **julianna_pharmacist** | pharma@csj.cm | julianna2025 | Pharmacien |

### ⚠️ IMPORTANT:

**Changez tous les mots de passe après le premier déploiement!**

```bash
# Changer un mot de passe
python manage.py changepassword julianna_admin
```

---

## 🔧 Configuration de l'environnement (.env)

Variables minimales requises dans le fichier `.env`:

```env
# Django
SECRET_KEY=votre_cle_secrete_tres_longue_et_aleatoire
DEBUG=False
ALLOWED_HOSTS=votre-domaine.com,localhost

# Database
DATABASE_URL=postgres://julianna_user:mot_de_passe@localhost:5432/julianna_db

# Redis
REDIS_URL=redis://localhost:6379/0

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=noreply@csj.cm
EMAIL_HOST_PASSWORD=votre_mot_de_passe_app

# Mistral AI
MISTRAL_API_KEY=votre_cle_mistral
```

### Générer une clé secrète:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## 📊 Vérifications post-installation

### 1. Vérifier l'installation:

```bash
# Activer le venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# Vérifier la configuration
python manage.py check

# Vérifier les migrations
python manage.py showmigrations

# Vérifier les données
python manage.py shell
>>> from apps.accounts.models import Organization
>>> print(Organization.objects.first().name)
>>> exit()
```

### 2. Accéder à l'application:

- **Application**: http://localhost:8000
- **Admin Django**: http://localhost:8000/admin
- **API**: http://localhost:8000/api/v1

---

## 🔄 Maintenance courante

### Sauvegarder la base de données:

```bash
# PostgreSQL
pg_dump -U julianna_user -h localhost julianna_db > backup_$(date +%Y%m%d).sql

# Django JSON
python manage.py dumpdata --indent 2 > backup_$(date +%Y%m%d).json
```

### Restaurer une sauvegarde:

```bash
# PostgreSQL
psql -U julianna_user -h localhost -d julianna_db < backup_YYYYMMDD.sql

# Django JSON
python manage.py loaddata backup_YYYYMMDD.json
```

### Mettre à jour l'application:

```bash
# Récupérer les modifications
git pull origin main

# Installer les nouvelles dépendances
pip install -r requirements.txt --upgrade

# Exécuter les migrations
python manage.py migrate

# Redémarrer le serveur
```

---

## 📞 Support et aide

### En cas de problème:

1. **Consultez d'abord**: [DEPLOYMENT_JULIANNA.md](DEPLOYMENT_JULIANNA.md) - Section "Dépannage"
2. **Vérifiez les logs**:
   - `logs/django.log`
   - `logs/gunicorn_access.log`
   - `logs/gunicorn_error.log`
3. **Vérifiez les services**:
   ```bash
   # PostgreSQL
   sudo systemctl status postgresql

   # Redis
   sudo systemctl status redis-server
   ```

### Commandes de diagnostic:

```bash
# Vérifier Python
python --version

# Vérifier les packages installés
pip list

# Vérifier la base de données
python manage.py dbshell

# Tester la connexion HTTP
curl http://localhost:8000
```

---

## 📝 Checklist de déploiement

- [ ] Python 3.9+ installé
- [ ] PostgreSQL installé et configuré
- [ ] Redis installé et démarré
- [ ] Environnement virtuel créé (`python -m venv venv`)
- [ ] Dépendances installées (`pip install -r requirements.txt`)
- [ ] Fichier `.env` configuré
- [ ] Base de données créée
- [ ] Migrations exécutées (`python manage.py migrate`)
- [ ] Données de production chargées (`create_julianna_production_data`)
- [ ] Fichiers statiques collectés (`collectstatic`)
- [ ] Serveur démarré et accessible
- [ ] Comptes utilisateurs testés
- [ ] Mots de passe par défaut changés

---

## 🎯 Résumé des commandes essentielles

### Développement:

```bash
# Démarrer rapidement
./start_dev.sh          # Linux/Mac
start_dev.bat           # Windows
```

### Production:

```bash
# Charger les données
python manage.py create_julianna_production_data --reset

# Démarrer avec Gunicorn
gunicorn saas_procurement.wsgi:application --config gunicorn_config.py

# Sauvegarder
pg_dump julianna_db > backup.sql
```

---

## 📚 Documentation complète

Pour tous les détails, consultez:

- **[DEPLOYMENT_JULIANNA.md](DEPLOYMENT_JULIANNA.md)** - Documentation complète
- **[DEPLOYMENT_COMMANDS.sh](DEPLOYMENT_COMMANDS.sh)** - Référence commandes Linux
- **[DEPLOYMENT_WINDOWS.bat](DEPLOYMENT_WINDOWS.bat)** - Référence commandes Windows

---

## 🏥 Informations Centre de Santé JULIANNA

- **Nom**: Centre de Santé JULIANNA
- **Localisation**: Makepe, Douala, Cameroun
- **Email**: contact@centrejulianna.com
- **Type**: Centre de santé avec services:
  - Consultations médicales
  - Laboratoire (82 tests disponibles)
  - Pharmacie (145 médicaments)
  - Services d'imagerie et soins

---

**Date de création**: 2025-02-05
**Version**: 1.0
**Application**: ProcureGenius Healthcare

---

## 🎉 Bon déploiement!

N'hésitez pas à consulter la documentation complète en cas de besoin.
