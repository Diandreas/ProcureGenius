# 📁 Structure du Projet ProcureGenius

Ce document explique l'utilité de chaque dossier et fichier principal à la racine du projet.

## 📂 Dossiers Principaux

### `apps/`
**Utilité** : Contient toutes les applications Django du backend.

**Description** : C'est le cœur du backend. Chaque sous-dossier représente un module fonctionnel de l'application (comptes utilisateurs, factures, bons de commande, IA, etc.).

---

### `frontend/`
**Utilité** : Application React (frontend) de ProcureGenius.

**Description** : Contient toute l'interface utilisateur moderne construite avec React, Material-UI, et Vite. Inclut les composants, pages, services API, et la gestion d'état Redux.

---

### `saas_procurement/`
**Utilité** : Configuration principale du projet Django.

**Description** : Contient les fichiers de configuration Django essentiels :
- `settings.py` : Configuration principale de l'application
- `urls.py` : Routage des URLs
- `wsgi.py` / `asgi.py` : Points d'entrée pour le serveur web
- Fichiers de settings alternatifs pour différents environnements

---

### `templates/`
**Utilité** : Templates HTML Django pour le rendu côté serveur.

**Description** : Templates HTML utilisés pour générer les pages web, les emails, et les PDFs. Inclut les templates pour les factures, bons de commande, rapports, etc.

---

### `static/`
**Utilité** : Fichiers statiques (CSS, JavaScript, images) pour Django.

**Description** : Contient les fichiers CSS et JavaScript qui complètent les templates Django. Sert aussi pour les fichiers statiques non gérés par le frontend React.

---

### `staticfiles/`
**Utilité** : Fichiers statiques collectés pour la production.

**Description** : Dossier généré automatiquement par Django lors de la commande `collectstatic`. Contient tous les fichiers statiques rassemblés pour le déploiement en production.

---

### `media/`
**Utilité** : Fichiers uploadés par les utilisateurs.

**Description** : Stocke tous les fichiers téléchargés par les utilisateurs (logos, documents, images, etc.). Généré dynamiquement en développement.

---

### `locale/`
**Utilité** : Fichiers de traduction Django (i18n).

**Description** : Contient les fichiers de traduction (.po, .mo) pour l'internationalisation de l'application backend Django.

---

### `logs/`
**Utilité** : Fichiers de logs de l'application.

**Description** : Dossier où sont stockés les fichiers de logs générés par l'application Django en production.

---

~~### `contracts/`~~ ❌ **SUPPRIMÉ**
**Ancien dossier obsolète** : Ce dossier a été supprimé car il était vide et non utilisé. Le vrai module de gestion des contrats se trouve dans `apps/contracts/`.

~~### `e_sourcing/`~~ ❌ **SUPPRIMÉ**
**Ancien dossier obsolète** : Ce dossier a été supprimé car il était vide et non utilisé. Le vrai module d'e-sourcing se trouve dans `apps/e_sourcing/`.

~~### `data_migration/`~~ ❌ **SUPPRIMÉ**
**Ancien dossier obsolète** : Ce dossier a été supprimé car il était vide et non utilisé. Le vrai module de migration de données se trouve dans `apps/data_migration/`.

---

### `google_credentials/`
**Utilité** : Credentials Google pour les intégrations (OAuth, APIs).

**Description** : Stocke les fichiers de credentials JSON pour les intégrations Google (OAuth, Google Cloud APIs, etc.). **⚠️ Ne pas commiter dans Git !**

---

## 📄 Fichiers Principaux à la Racine

### `manage.py`
**Utilité** : Point d'entrée pour les commandes Django.

**Description** : Script Python permettant d'exécuter les commandes de gestion Django (migrations, serveur de développement, shell, etc.).

---

### `requirements.txt`
**Utilité** : Liste des dépendances Python du projet.

**Description** : Fichier pip contenant toutes les bibliothèques Python nécessaires au projet. Utilisé pour installer les dépendances avec `pip install -r requirements.txt`.

---

### `requirements_dev.txt`
**Utilité** : Dépendances supplémentaires pour le développement.

**Description** : Outils et bibliothèques nécessaires uniquement en environnement de développement (tests, debugging, etc.).

---

### `requirements_simple.txt`
**Utilité** : Version simplifiée des dépendances.

**Description** : Version allégée des dépendances pour des environnements spécifiques ou des installations minimales.

---

### `requirements-test.txt`
**Utilité** : Dépendances pour les tests.

**Description** : Bibliothèques spécifiques pour l'exécution des tests (pytest, coverage, etc.).

---

### `pytest.ini`
**Utilité** : Configuration de pytest pour les tests.

**Description** : Fichier de configuration pour pytest, définissant comment exécuter les tests Python.

---

### `celery_config.py`
**Utilité** : Configuration de Celery pour les tâches asynchrones.

**Description** : Configuration pour Celery, utilisé pour exécuter des tâches en arrière-plan (génération de rapports, envoi d'emails, etc.).

---

### `docker-compose.yml`
**Utilité** : Configuration Docker Compose pour le déploiement.

**Description** : Définit les services Docker (base de données, backend, frontend) et leur configuration pour un déploiement avec Docker.

---

### `Dockerfile`
**Utilité** : Configuration pour créer une image Docker du backend.

**Description** : Instructions pour construire une image Docker contenant l'application Django.

---

### `README.md`
**Utilité** : Documentation principale du projet.

**Description** : Fichier de documentation expliquant le projet, son installation, son utilisation, et son architecture.

---

### `cron_jobs.txt`
**Utilité** : Configuration des tâches cron pour le serveur.

**Description** : Documentation et exemples de configuration cron pour automatiser certaines tâches (génération de suggestions IA, nettoyage, etc.).

---

### `db.sqlite3`
**Utilité** : Base de données SQLite de développement.

**Description** : Base de données SQLite utilisée en développement local. **⚠️ Généralement ignorée par Git.**

---

## 🔧 Scripts Utilitaires

### `*.bat` (Windows)
**Utilité** : Scripts batch pour Windows.

**Description** :
- `start_backend.bat` : Démarre le serveur Django
- `start_frontend.bat` : Démarre le serveur de développement React
- `apply_migrations.bat` : Applique les migrations Django
- `fix_migrations.bat` : Corrige les problèmes de migrations
- `seed_data.bat` : Remplit la base de données avec des données de test

---

### `*.sh` (Linux/Mac)
**Utilité** : Scripts shell pour Linux/Mac.

**Description** :
- `deploy.sh` : Script de déploiement
- `setup_profiles_quickstart.sh` : Configuration rapide des profils

---

## 📝 Notes Importantes

1. **Fichiers à ne pas modifier directement** :
   - `staticfiles/` : Généré automatiquement
   - `media/` : Généré dynamiquement
   - `__pycache__/` : Cache Python (ignoré par Git)

2. **Fichiers sensibles** :
   - `google_credentials/` : Contient des secrets, ne pas commiter
   - `.env` : Variables d'environnement (ignoré par Git)

3. **Structure modulaire** :
   - Chaque module dans `apps/` est indépendant
   - Le frontend dans `frontend/` communique avec le backend via l'API REST

4. **Développement** :
   - Backend : `python manage.py runserver`
   - Frontend : `cd frontend && npm run dev`

---

## 🔄 Workflow Typique

1. **Développement Backend** : Modifier les fichiers dans `apps/`
2. **Développement Frontend** : Modifier les fichiers dans `frontend/src/`
3. **Templates** : Modifier les templates HTML dans `templates/`
4. **Statiques** : Ajouter CSS/JS dans `static/` ou `frontend/src/`
5. **Migrations** : Créer avec `python manage.py makemigrations`, appliquer avec `python manage.py migrate`

---

*Dernière mise à jour : Après nettoyage du projet*

