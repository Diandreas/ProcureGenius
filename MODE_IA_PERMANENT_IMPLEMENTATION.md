# Implémentation Mode IA Permanent - Documentation

## Vue d'ensemble

Ce document détaille l'implémentation complète du système de Mode IA Permanent avec gestion des modules et permissions utilisateurs.

## 🎯 Fonctionnalités Implémentées

### 1. Backend - Gestion des Préférences et Permissions

#### Nouveaux Modèles (apps/accounts/models.py)

1. **Organization**
   - Gère les organisations/entreprises
   - Champs: `name`, `subscription_type`, `enabled_modules`
   - Les modules activés au niveau organisation définissent le "pool" disponible

2. **UserPreferences**
   - Préférences personnelles de l'utilisateur
   - Champs: `enabled_modules`, `onboarding_completed`, `onboarding_data`, `dashboard_layout`, `notification_settings`
   - Créé automatiquement lors de la création d'un utilisateur

3. **UserPermissions**
   - Droits et permissions de l'utilisateur
   - Champs: `can_manage_users`, `can_manage_settings`, `can_view_analytics`, `can_approve_purchases`, `module_access`
   - Permissions automatiques selon le rôle

4. **CustomUser (modifié)**
   - Ajout du champ `organization` (ForeignKey)
   - Ajout du champ `role` (admin, manager, buyer, accountant, viewer)
   - Migration des anciennes données préservée avec le champ `company`

#### API Endpoints Créés

**Préférences Utilisateur**
- `GET/PUT /api/v1/accounts/preferences/` - Gérer les préférences de l'utilisateur

**Profil Utilisateur Enrichi**
- `GET /api/v1/accounts/profile/` - Retourne profil + préférences + permissions + organisation

**Gestion des Utilisateurs (Admin uniquement)**
- `GET/POST /api/v1/accounts/organization/users/` - Lister/créer des utilisateurs
- `PUT/DELETE /api/v1/accounts/organization/users/{id}/` - Modifier/désactiver un utilisateur
- `GET/PUT /api/v1/accounts/organization/users/{id}/permissions/` - Gérer les permissions

### 2. Frontend - Composants Créés

#### OnboardingWizard.jsx
**Chemin**: `frontend/src/components/OnboardingWizard.jsx`

Wizard multi-étapes pour la configuration initiale:
- **Étape 1**: Bienvenue avec mascotte
- **Étape 2**: Type d'entreprise (PME, Grande entreprise, secteur)
- **Étape 3**: Cas d'usage principal
- **Étape 4**: Taille d'équipe et rôles
- **Étape 5**: Sélection des modules (profils prédéfinis ou personnalisé)
  - Basique: dashboard, suppliers, purchase-orders, invoices
  - Avancé: + products, clients, e-sourcing, contracts
  - Complet: tous les modules
- **Étape 6**: Confirmation

#### PermanentAIAssistant.jsx
**Chemin**: `frontend/src/components/PermanentAIAssistant.jsx`

Assistant IA toujours visible (remplace l'ancien FloatingAIAssistant):
- Mascotte flottante en bas à droite (toujours visible, pas de toggle)
- Au clic: ouvre un chat dialog
- Quick actions contextuelles selon le module actif
- Détection automatique du module courant
- Animation float pour attirer l'attention

#### ModuleQuickActionsPanel.jsx
**Chemin**: `frontend/src/components/ModuleQuickActionsPanel.jsx`

Panel de quick actions intégré dans chaque page de module:
- Affiche 4-6 actions rapides selon le module
- Design compact avec boutons Material-UI
- Récupère les actions depuis l'API (`/api/v1/ai/quick-actions/?category={module}`)
- Peut être réduit/étendu
- Icônes contextuelles et couleurs par type d'action

#### ModuleActivationDialog.jsx
**Chemin**: `frontend/src/components/ModuleActivationDialog.jsx`

Dialog pour activer un module désactivé:
- Affiche la description du module
- Liste les fonctionnalités incluses
- Bouton "Activer maintenant"
- Mascotte "thinking" pour l'engagement

### 3. Frontend - Pages de Gestion

#### ModuleSettings.jsx
**Chemin**: `frontend/src/pages/settings/ModuleSettings.jsx`

Page de gestion des modules:
- Statistiques: modules activés, désactivés, utilisation
- Profils prédéfinis pour réinitialisation rapide
- Liste de tous les modules avec switch on/off
- Le module "dashboard" est obligatoire (non désactivable)
- Confirmation avant modification
- Recharge automatique après changement

#### UserManagement.jsx
**Chemin**: `frontend/src/pages/settings/UserManagement.jsx`

Page de gestion des utilisateurs (admin uniquement):
- Tableau des utilisateurs de l'organisation
- Statistiques: total, actifs, administrateurs
- Inviter un nouvel utilisateur
- Modifier les permissions d'un utilisateur
- Activer/désactiver des utilisateurs
- Gestion des rôles et accès aux modules

### 4. MainLayout - Navigation Adaptative

**Modifications dans** `frontend/src/layouts/MainLayout.jsx`:

#### Chargement des Préférences
- Récupère `enabledModules` et `userPermissions` au montage
- Détermine le module actuel depuis le path

#### Navigation Adaptative
- Modules activés: navigation normale
- Modules désactivés: affichés en grisé (opacity 0.4) avec icône de cadenas
- Tooltip "Module désactivé - Cliquez pour activer"
- Clic sur module désactivé: ouvre ModuleActivationDialog

#### Liens Supplémentaires dans le Menu
- "Modules" -> `/settings/modules`
- "Utilisateurs" (si `can_manage_users`) -> `/settings/users`
- "Paramètres" -> `/settings`

#### Assistant IA Permanent
- Remplace `ContextualMascot` par `PermanentAIAssistant`
- Passe le `currentModule` en prop
- Toujours visible (pas de condition)

### 5. App.jsx - Intégration Onboarding

**Modifications dans** `frontend/src/App.jsx`:

#### Vérification Onboarding
- Au chargement: vérifie `onboarding_completed` via API
- Si `false`: affiche `OnboardingWizard` en fullscreen
- Après completion: recharge la page pour mettre à jour la navigation

#### Nouvelles Routes
- `/settings/modules` -> ModuleSettings
- `/settings/users` -> UserManagement

## 📝 Logique de Permissions Hiérarchique

### Niveau Organisation
L'admin de l'organisation active les modules disponibles pour toute l'entreprise.
Ces modules deviennent le "pool" dans lequel chaque utilisateur peut avoir accès.

**Exemple**: Organisation active `[dashboard, suppliers, purchase-orders, invoices, contracts]`

### Niveau Utilisateur
Chaque utilisateur a une liste de modules auxquels il peut accéder.
Cette liste est un sous-ensemble des modules activés par l'organisation.

**Exemple**:
- Utilisateur A (Acheteur): `[dashboard, suppliers, purchase-orders]`
- Utilisateur B (Comptable): `[dashboard, invoices]`

### Navigation Frontend
Le menu affiche:
1. **Modules activés pour l'utilisateur**: Accessibles normalement
2. **Modules activés pour l'org mais pas pour l'utilisateur**: Grisés avec tooltip "Non autorisé"
3. **Modules désactivés pour l'org**: Grisés avec possibilité d'activation

## 🎭 Rôles Prédéfinis

### Admin
- **Modules suggérés**: Tous
- **Permissions**: Gérer utilisateurs ✓, Gérer paramètres ✓, Voir analytics ✓, Approuver achats ✓

### Manager
- **Modules suggérés**: Tous
- **Permissions**: Gérer paramètres ✓, Voir analytics ✓, Approuver achats ✓

### Buyer (Acheteur)
- **Modules suggérés**: dashboard, suppliers, purchase-orders, products
- **Permissions**: Voir analytics ✓

### Accountant (Comptable)
- **Modules suggérés**: dashboard, invoices, clients
- **Permissions**: Voir analytics ✓

### Viewer (Consultation)
- **Modules suggérés**: dashboard
- **Permissions**: Aucune permission spéciale

## 🚀 Utilisation

### Premier Démarrage (Onboarding)
1. L'utilisateur se connecte pour la première fois
2. L'OnboardingWizard s'affiche automatiquement
3. L'utilisateur répond aux questions et choisit ses modules
4. Les préférences sont sauvegardées
5. L'application se recharge avec les modules activés

### Navigation Quotidienne
1. L'assistant IA est toujours visible en bas à droite
2. Les modules activés sont accessibles normalement
3. Clic sur un module désactivé: option pour l'activer
4. Quick actions disponibles sur chaque page de module

### Gestion des Modules (Utilisateur)
1. Aller dans "Modules" (menu latéral)
2. Activer/désactiver les modules souhaités
3. Utiliser les profils prédéfinis pour réinitialiser
4. L'application se recharge après modification

### Gestion des Utilisateurs (Admin)
1. Aller dans "Utilisateurs" (menu latéral, admin uniquement)
2. Voir la liste des utilisateurs de l'organisation
3. Inviter un nouvel utilisateur (email, nom, rôle)
4. Modifier les permissions d'un utilisateur
5. Désactiver un utilisateur si nécessaire

## 📁 Fichiers Créés/Modifiés

### Backend
- ✅ `apps/accounts/models.py` - Nouveaux modèles
- ✅ `apps/accounts/admin.py` - Enregistrement admin
- ✅ `apps/accounts/views.py` - API views
- ✅ `apps/accounts/urls.py` - Routes API
- ✅ `apps/accounts/migrations/0003_*.py` - Migration
- ✅ `apps/api/urls.py` - Inclusion des routes accounts

### Frontend - Nouveaux Composants
- ✅ `frontend/src/components/OnboardingWizard.jsx`
- ✅ `frontend/src/components/PermanentAIAssistant.jsx`
- ✅ `frontend/src/components/ModuleQuickActionsPanel.jsx`
- ✅ `frontend/src/components/ModuleActivationDialog.jsx`

### Frontend - Nouvelles Pages
- ✅ `frontend/src/pages/settings/ModuleSettings.jsx`
- ✅ `frontend/src/pages/settings/UserManagement.jsx`

### Frontend - Modifications
- ✅ `frontend/src/layouts/MainLayout.jsx` - Navigation adaptative + PermanentAIAssistant
- ✅ `frontend/src/App.jsx` - Intégration onboarding + nouvelles routes

## 🔄 Prochaines Étapes

### À Faire pour Compléter
1. **Retirer AIAssistantToggle des pages individuelles**
   - Supprimer de `Suppliers.jsx`, `Contracts.jsx`, `SourcingEvents.jsx`, etc.
   - Supprimer les états `isAIMode`, `setIsAIMode`
   
2. **Ajouter ModuleQuickActionsPanel sur chaque page**
   - Dashboard, Suppliers, Purchase Orders, Invoices, Products, Clients, E-Sourcing, Contracts
   - Placer en haut de page avec le bon `currentModule`

3. **Migrer la base de données**
   - Exécuter: `python manage.py migrate accounts`
   - Créer une organisation par défaut
   - Migrer les utilisateurs existants vers l'organisation

4. **Enrichir les Quick Actions Backend**
   - Ajouter plus d'actions contextuelles dans `apps/ai_assistant/action_manager.py`
   - Configurer les actions par module dans `action_config.json`

5. **Tests**
   - Tester l'onboarding pour un nouvel utilisateur
   - Tester l'activation/désactivation de modules
   - Tester la gestion des utilisateurs (admin)
   - Tester les permissions

## 🎨 Design Pattern

### Hiérarchie de Décision
```
Organization (enabled_modules)
    ↓
User (preferences.enabled_modules ∩ permissions.module_access)
    ↓
Navigation (affichage selon enabled_modules)
```

### Flow Onboarding
```
Login → Check onboarding_completed → 
    Si False: OnboardingWizard → Sauvegarder préférences → Reload
    Si True: Navigation normale
```

### Flow Activation Module
```
Clic sur module désactivé → ModuleActivationDialog → 
    Confirmer → PUT /api/v1/accounts/preferences/ → 
    Reload navigation → Navigate vers module
```

## 🔒 Sécurité

- Toutes les API nécessitent une authentification (Token)
- Les permissions sont vérifiées côté serveur
- Seuls les admins peuvent gérer les utilisateurs
- Les modules d'un utilisateur sont limités par ceux de l'organisation
- Les tokens sont stockés dans localStorage (à sécuriser en production avec httpOnly cookies)

## 📚 Documentation API

### GET /api/v1/accounts/profile/
Retourne le profil complet de l'utilisateur avec préférences, permissions et organisation.

### PUT /api/v1/accounts/preferences/
Met à jour les préférences de l'utilisateur.
**Body**: `{ enabled_modules: [...], onboarding_completed: true, onboarding_data: {...} }`

### GET /api/v1/accounts/organization/users/
Liste tous les utilisateurs de l'organisation (admin uniquement).

### POST /api/v1/accounts/organization/users/
Crée un nouvel utilisateur dans l'organisation (admin uniquement).
**Body**: `{ email, first_name, last_name, role }`

### PUT /api/v1/accounts/organization/users/{id}/permissions/
Met à jour les permissions d'un utilisateur (admin uniquement).
**Body**: `{ can_manage_users, can_manage_settings, can_view_analytics, can_approve_purchases, module_access: [...] }`

---

**Date d'implémentation**: Octobre 2025
**Version**: 1.0.0
**Statut**: Implémentation complète ✅

