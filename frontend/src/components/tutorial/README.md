# 🎓 Système de Tutoriel et Actions Guidées

Ce module fournit un système complet d'onboarding et de tutoriel interactif pour les nouveaux utilisateurs de ProcureGenius.

## 📦 Composants

### 1. `GettingStartedWidget`

Widget affiché sur le dashboard qui montre les actions recommandées pour démarrer.

**Fonctionnalités :**
- ✅ Affiche les actions en fonction des modules activés de l'utilisateur
- ✅ Vérifie automatiquement quelles actions sont complétées
- ✅ Barre de progression visuelle
- ✅ Peut être masqué/réaffiché
- ✅ Affiche un message de félicitations une fois tout complété

**Actions disponibles :**
- Compléter le profil entreprise (logo)
- Ajouter le premier fournisseur
- Ajouter le premier client
- Créer un bon de commande
- Créer une facture
- Ajouter un produit
- Lancer un appel d'offres
- Créer un contrat

**Usage :**
```jsx
import GettingStartedWidget from '../components/dashboard/GettingStartedWidget';

<GettingStartedWidget 
  onStartTutorial={() => window.dispatchEvent(new CustomEvent('start-tutorial'))}
/>
```

### 2. `SimpleTutorial`

Système de tutoriel walkthrough interactif qui guide l'utilisateur à travers l'interface.

**Fonctionnalités :**
- ✅ Navigation étape par étape
- ✅ Highlight des éléments de l'interface
- ✅ Filtre automatique des étapes selon les modules activés
- ✅ Mascotte animée pour certaines étapes
- ✅ Progression visuelle

**Étapes du tutoriel :**
1. Bienvenue
2. Tableau de bord
3. Fournisseurs (si module activé)
4. Bons de commande (si module activé)
5. Factures (si module activé)
6. Clients (si module activé)
7. Produits (si module activé)
8. Paramètres
9. Aide & Support
10. Terminé

**Déclenchement :**
```javascript
// Lancer le tutoriel
window.dispatchEvent(new CustomEvent('start-tutorial'));
```

### 3. `TutorialButton`

Bouton d'aide qui permet de lancer le tutoriel et d'accéder au support.

**Variantes :**
- `icon` : Bouton icône avec menu déroulant (défaut)
- `button` : Bouton texte avec menu
- `menu-item` : Élément de menu simple

**Usage :**
```jsx
import TutorialButton from '../components/tutorial/TutorialButton';

// Variante icône
<TutorialButton variant="icon" />

// Variante bouton
<TutorialButton variant="button" />

// Dans un menu
<TutorialButton variant="menu-item" />
```

## 🔧 Intégration

### Dans le MainLayout

Le système est déjà intégré dans `MainLayout.jsx` :

```jsx
import SimpleTutorial from '../components/tutorial/SimpleTutorial';
import TutorialButton from '../components/tutorial/TutorialButton';

// Dans la Toolbar
<TutorialButton variant="icon" size="small" />

// À la fin du composant
<SimpleTutorial />
```

### Dans le Dashboard

Le widget est intégré dans `CustomizableDashboard.jsx` :

```jsx
import GettingStartedWidget from '../components/dashboard/GettingStartedWidget';

// Avant le grid layout
<GettingStartedWidget 
  onStartTutorial={() => window.dispatchEvent(new CustomEvent('start-tutorial'))}
/>
```

## 🎯 Attributs data-tutorial

Pour que le tutoriel puisse cibler les éléments de l'interface, ajoutez les attributs `data-tutorial` :

```jsx
// Menu items
<ListItemButton data-tutorial="menu-suppliers">

// Sidebar
<Box data-tutorial="sidebar">

// Dashboard
<div data-tutorial="dashboard">

// Widget Getting Started
<Card data-tutorial="getting-started">

// Bouton d'aide
<IconButton data-tutorial="help-button">
```

## 💾 LocalStorage

Le système utilise les clés suivantes :

| Clé | Description |
|-----|-------------|
| `tutorial_completed` | `'true'` si le tutoriel a été complété |
| `getting_started_dismissed` | JSON avec `{ dismissed: true, timestamp: Date }` |

## 🔄 API Utilisées

Le système utilise les endpoints suivants :

- `GET /api/v1/accounts/profile/` - Récupérer les modules activés
- `GET /api/v1/suppliers/` - Vérifier si fournisseurs existent
- `GET /api/v1/clients/` - Vérifier si clients existent
- `GET /api/v1/purchase-orders/` - Vérifier si bons de commande existent
- `GET /api/v1/invoicing/` - Vérifier si factures existent
- `GET /api/v1/products/` - Vérifier si produits existent
- `GET /api/v1/settings/all/` - Vérifier si profil entreprise complet

## 🎨 Personnalisation

### Ajouter une nouvelle action guidée

Dans `GettingStartedWidget.jsx`, ajoutez à `GUIDED_ACTIONS` :

```javascript
const GUIDED_ACTIONS = {
  // ...
  'mon-module': [
    {
      id: 'action_unique_id',
      title: 'Titre de l\'action',
      description: 'Description de ce que l\'utilisateur doit faire',
      icon: <MonIcon />,
      route: '/ma-route',
      color: '#HEX',
      priority: 1, // Plus petit = plus prioritaire
      checkEndpoint: '/api/endpoint/',
      checkField: 'count',
      minValue: 1,
      requires: ['autre_action_id'], // Optionnel
      optional: false, // Si true, ne compte pas dans le pourcentage
    },
  ],
};
```

### Ajouter une étape au tutoriel

Dans `SimpleTutorial.jsx`, ajoutez à `TUTORIAL_STEPS` :

```javascript
const TUTORIAL_STEPS = [
  // ...
  {
    id: 'etape_unique',
    title: 'Titre de l\'étape',
    description: 'Explication détaillée...',
    target: '[data-tutorial="mon-element"]', // Sélecteur CSS
    route: '/dashboard', // Route où naviguer
    module: 'mon-module', // Optionnel - filtre si module activé
    showMascot: false, // Optionnel - affiche la mascotte
  },
];
```

## 📝 Notes

- Le tutoriel est automatiquement filtré selon les modules activés
- Les actions complétées sont vérifiées en temps réel via les APIs
- Le widget se réaffiche après 7 jours si l'utilisateur n'a pas tout complété
- Le bouton d'aide affiche un badge "Nouveau" si le tutoriel n'a pas été fait

