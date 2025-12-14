# Correction du Filtrage des Quick Actions par Modules

## 🐛 Problème identifié

Les quick actions de l'assistant IA n'étaient **pas correctement filtrées** selon les modules activés pour l'utilisateur.

### Symptômes:
- Un utilisateur voyait des quick actions pour des modules qu'il n'avait pas activés
- Par exemple: voir "Créer un fournisseur" alors que le module "suppliers" est désactivé

## 🔍 Cause du problème

Le code utilisait `UserPreferences.enabled_modules` qui est une table **OBSOLÈTE** ou non utilisée. Le système de modules utilise en réalité:

1. **`Organization.enabled_modules`** - Modules activés au niveau de l'organisation
2. **`UserPermissions.module_access`** - Restrictions individuelles par utilisateur
3. La fonction **`get_user_accessible_modules(user)`** qui fait l'intersection des deux

## ✅ Solution appliquée

### Fichier modifié: `apps/ai_assistant/views.py`

**Ancien code (INCORRECT)**:
```python
if hasattr(user, 'userpreferences') and user.userpreferences:
    prefs = user.userpreferences
    enabled_modules = set(prefs.enabled_modules or [])
else:
    enabled_modules = set(self.CATEGORY_TO_MODULE.values())
```

**Nouveau code (CORRECT)**:
```python
from apps.core.modules import get_user_accessible_modules

# Obtenir les modules accessibles pour l'utilisateur
# Cette fonction gère Organization.enabled_modules ET UserPermissions.module_access
user = request.user
enabled_modules = set(get_user_accessible_modules(user))
```

## 📊 Mapping Catégorie → Module

Le mapping suivant a été défini dans `QuickActionsView.CATEGORY_TO_MODULE`:

| Catégorie Action | Module Requis | Description |
|------------------|---------------|-------------|
| `suppliers` | `suppliers` | Actions liées aux fournisseurs |
| `invoices` | `invoices` | Actions liées aux factures |
| `purchase_orders` | `purchase-orders` | Actions liées aux bons de commande |
| `clients` | `clients` | Actions liées aux clients |
| `products` | `products` | Actions liées aux produits |
| `dashboard` | `None` | Toujours accessible |
| `reports` | `analytics` | Rapports et analyses |
| `stock` | `products` | Gestion de stock |
| `search` | `None` | Recherche générale toujours accessible |

**Note**: Les catégories avec `None` sont toujours accessibles, quel que soit le profil de l'utilisateur.

## 🎯 Comment ça fonctionne maintenant

### 1. Récupération des modules accessibles

```python
enabled_modules = get_user_accessible_modules(user)
# Exemple de retour: ['dashboard', 'clients', 'invoices']
```

Cette fonction retourne l'intersection de:
- Modules activés dans l'organisation (`Organization.enabled_modules`)
- Modules autorisés pour l'utilisateur (`UserPermissions.module_access`)
- Les superusers ont accès à TOUS les modules

### 2. Filtrage des actions

Pour chaque action rapide:
1. On récupère sa catégorie (ex: `'suppliers'`)
2. On cherche le module requis dans le mapping (ex: `'suppliers'`)
3. Si le module est dans `enabled_modules` OU si `required_module` est `None`, l'action est affichée
4. Sinon, l'action est filtrée (cachée)

### 3. Logs ajoutés

Le système log maintenant:
```
User username@example.com accessible modules: {'dashboard', 'clients', 'invoices'}
Total available actions: 35
Action 'Créer un client' included (category: clients, module: clients)
Action 'Créer un fournisseur' filtered out (category: suppliers, module: suppliers)
Filtered actions: 15 out of 35
```

## 🧪 Test de validation

Script de test créé: `test_quick_actions.py`

Exécution:
```bash
python test_quick_actions.py
```

Résultat attendu:
- Affiche les modules activés pour chaque utilisateur
- Montre le nombre d'actions visibles vs total
- Liste les catégories avec leur module requis

## 📝 Exemple de configuration

### Utilisateur avec modules limités:

**Organization.enabled_modules**:
```json
["dashboard", "clients", "invoices"]
```

**UserPermissions.module_access** (vide = hérite de l'org):
```json
[]
```

**Résultat**:
- ✅ Voir: "Créer un client", "Créer une facture", "Afficher les statistiques"
- ❌ Masqué: "Créer un fournisseur", "Créer un bon de commande", "Rechercher des produits"

### Utilisateur avec restriction individuelle:

**Organization.enabled_modules**:
```json
["dashboard", "clients", "invoices", "suppliers"]
```

**UserPermissions.module_access** (restriction):
```json
["dashboard", "clients"]
```

**Résultat** (intersection):
- ✅ Accessible: `dashboard`, `clients`
- ❌ Bloqué: `invoices`, `suppliers`

## 🔄 Où sont gérés les modules?

### Interface utilisateur:
1. **Paramètres Organisation** (`/settings/organization`):
   - Configure `Organization.enabled_modules`
   - Détermine quels modules sont disponibles pour l'organisation

2. **Gestion des utilisateurs** (`/settings/users`):
   - Configure `UserPermissions.module_access`
   - Permet de restreindre l'accès de certains utilisateurs

### API Endpoints:

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/v1/auth/profile/` | GET | Retourne `accessible_modules` calculé |
| `/api/v1/settings/organization/` | GET/PUT | Gère `Organization.enabled_modules` |
| `/api/v1/users/{id}/permissions/` | GET/PUT | Gère `UserPermissions.module_access` |
| `/api/v1/ai/quick-actions/` | GET | **Filtre selon modules accessibles** ✅ |

## 🚀 Déploiement

### Pas besoin de migration!

Cette correction est purement logique, aucune migration de base de données n'est nécessaire.

### Redémarrage requis:

```bash
# Redémarrer le serveur Django
python manage.py runserver
```

Les changements sont appliqués immédiatement après redémarrage.

## ✅ Checklist de vérification

Après déploiement, vérifier:

- [ ] Un admin voit toutes les 35 actions
- [ ] Un utilisateur avec module "clients" uniquement voit uniquement les actions clients + dashboard + search
- [ ] Un utilisateur sans module "suppliers" ne voit PAS "Créer un fournisseur"
- [ ] Les actions avec `None` (dashboard, search) sont toujours visibles
- [ ] Les logs Django montrent correctement les modules accessibles

## 📚 Documentation liée

- **Gestion des modules**: `apps/core/modules.py`
- **Modèles**: `apps/accounts/models.py` (UserPreferences, UserPermissions, Organization)
- **API**: `apps/accounts/api_views.py` (api_profile, api_organization_settings)
- **Frontend**: `frontend/src/utils/moduleConfig.js`

---

**Date de correction**: 14 décembre 2025
**Auteur**: Claude Assistant
**Version**: 1.0
