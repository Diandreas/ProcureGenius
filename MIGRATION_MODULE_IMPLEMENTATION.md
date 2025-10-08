# Module d'Import de Données - Implémentation Complète

## Vue d'ensemble
Le module d'import de données permet une migration facile depuis Excel/CSV et (à venir) QuickBooks vers ProcureGenius.

## Backend (Django)

### Modèles créés (`apps/data_migration/models.py`)
1. **MigrationJob** - Gère les tâches d'import
   - Supporte Excel (.xlsx, .xls) et CSV
   - Types d'entités: Fournisseurs, Produits, (Clients à venir)
   - Statuts: pending, running, completed, failed, cancelled
   - Field mapping et transformation rules (JSON)
   - Statistiques: success_count, error_count, skipped_count

2. **MigrationLog** - Journal détaillé de chaque import
   - Niveau: success, error, warning
   - Source et données transformées
   - Référence vers l'objet créé

3. **QuickBooksConnection** - Pour intégration future
   - OAuth tokens
   - Realm ID et company info

### Services (`apps/data_migration/importers.py`)
**ExcelCSVImporter** - Classe principale d'import
- `read_file()` - Lit Excel/CSV avec pandas
- `preview_data()` - Génère aperçu des 10 premières lignes
- `apply_field_mapping()` - Applique le mapping configuré
- `import_suppliers()` - Import fournisseurs avec gestion doublons
- `import_products()` - Import produits avec relation fournisseur
- Transformations supportées:
  - uppercase, lowercase, capitalize, strip

### API Endpoints (`apps/data_migration/views.py`)
**MigrationJobViewSet** avec actions:
- `POST /api/v1/migration/jobs/` - Créer un job
- `GET /api/v1/migration/jobs/` - Liste des jobs
- `GET /api/v1/migration/jobs/{id}/` - Détails d'un job
- `POST /api/v1/migration/jobs/{id}/preview/` - Générer aperçu
- `POST /api/v1/migration/jobs/{id}/configure/` - Configurer mapping
- `POST /api/v1/migration/jobs/{id}/start/` - Démarrer import
- `POST /api/v1/migration/jobs/{id}/cancel/` - Annuler import
- `GET /api/v1/migration/jobs/{id}/logs/` - Récupérer logs

## Frontend (React)

### Redux State (`frontend/src/store/slices/migrationSlice.js`)
Actions asynchrones:
- fetchMigrationJobs, fetchMigrationJob
- createMigrationJob
- previewMigrationData
- configureMigration
- startMigration, cancelMigration
- fetchMigrationLogs

### Pages créées

#### 1. **MigrationWizard** (`frontend/src/pages/migration/MigrationWizard.jsx`)
Assistant en 4 étapes:

**Étape 1: Téléverser le fichier**
- Sélection du nom d'import
- Choix source (Excel/CSV, QuickBooks)
- Choix type d'entité (Fournisseurs, Produits)
- Upload fichier
- Configuration header/délimiteur

**Étape 2: Aperçu et mapping**
- Affichage aperçu des données (10 lignes)
- Configuration du mapping champs source → destination
- Sélection des transformations par champ
- Tableau interactif des données

**Étape 3: Configuration**
- Option ignorer doublons
- Option mettre à jour existants
- Résumé de l'import

**Étape 4: Import et résultats**
- Barre de progression en temps réel
- Statistiques: Succès, Erreurs, Ignorés
- Journal détaillé avec filtrage par niveau
- Polling automatique toutes les 2 secondes

#### 2. **MigrationJobs** (`frontend/src/pages/migration/MigrationJobs.jsx`)
Liste de tous les imports:
- Tableau avec statuts colorés et icônes
- Filtres: recherche, statut, type d'entité
- Progression visuelle par job
- Compteurs succès/erreurs/ignorés
- Navigation vers détails

### Navigation
**Menu ajouté** dans `MainLayout.jsx`:
- "Import de données" avec icône CloudUpload
- Action contextuelle "Nouvel import" → Lance le wizard

**Routes** dans `App.jsx`:
- `/migration/jobs` → Liste des imports
- `/migration/wizard` → Assistant d'import

### API Service (`frontend/src/services/api.js`)
```javascript
migrationAPI = {
  list, get, create,
  preview, configure, start, cancel, logs
}
```

## Fonctionnalités principales

### Gestion des doublons
- Détection par email (fournisseurs) ou SKU (produits)
- Mode skip ou update

### Transformations de données
- MAJUSCULES
- minuscules
- Capitaliser
- Enlever espaces

### Logging détaillé
- Succès avec ID objet créé
- Erreurs avec message
- Warnings pour doublons ignorés

### Support multi-format
- Excel (.xlsx, .xls)
- CSV avec encodage configurable
- QuickBooks (préparé, non implémenté)

## Workflow utilisateur

1. **Cliquer "Import de données"** dans le menu
2. **Liste vide → "Nouvel import"**
3. **Wizard Étape 1**: Upload fichier Excel/CSV
4. **Wizard Étape 2**: Voir aperçu et mapper les champs
5. **Wizard Étape 3**: Configurer options doublons
6. **Wizard Étape 4**: Voir progression en temps réel
7. **Terminé**: Retour à la liste des imports

## Technologies utilisées

### Backend
- Django REST Framework
- pandas (lecture Excel/CSV)
- openpyxl (format Excel)
- JSONField pour mapping/rules

### Frontend
- React + Redux Toolkit
- Material-UI (Stepper, Tables, Progress)
- Async thunks pour API calls
- Polling pour updates temps réel

## Prochaines étapes (optionnel)

1. **QuickBooks OAuth**
   - Implémenter flux OAuth 2.0
   - Mapper API QuickBooks → modèles Django

2. **Support Clients**
   - Créer modèle Client
   - Ajouter import_clients()

3. **Templates de mapping**
   - Sauvegarder configurations réutilisables
   - Détecter format automatiquement

4. **Validation avancée**
   - Règles métier personnalisées
   - Prévisualisation des erreurs avant import

## Installation et test

### Backend
```bash
py -m pip install pandas openpyxl
py manage.py makemigrations data_migration
py manage.py migrate data_migration
py manage.py runserver
```

### Frontend
```bash
cd frontend
npm start
```

**URLs de test:**
- Backend API: http://localhost:8000/api/v1/migration/jobs/
- Frontend: http://localhost:3000/migration/jobs
- Wizard: http://localhost:3000/migration/wizard

## Fichiers modifiés/créés

### Backend
- ✅ `apps/data_migration/models.py`
- ✅ `apps/data_migration/importers.py`
- ✅ `apps/data_migration/serializers.py`
- ✅ `apps/data_migration/views.py`
- ✅ `apps/data_migration/urls.py`
- ✅ `apps/data_migration/admin.py`
- ✅ `apps/api/urls.py` (ajout route migration)
- ✅ `saas_procurement/settings.py` (ajout à TENANT_APPS)

### Frontend
- ✅ `frontend/src/store/slices/migrationSlice.js`
- ✅ `frontend/src/store/store.js` (ajout reducer)
- ✅ `frontend/src/services/api.js` (ajout migrationAPI)
- ✅ `frontend/src/pages/migration/MigrationWizard.jsx`
- ✅ `frontend/src/pages/migration/MigrationJobs.jsx`
- ✅ `frontend/src/App.jsx` (ajout routes)
- ✅ `frontend/src/layouts/MainLayout.jsx` (ajout menu + actions)

---
**Module complet et fonctionnel!** 🚀

L'utilisateur peut maintenant facilement importer ses fournisseurs et produits depuis Excel/CSV avec mapping interactif et suivi en temps réel.
