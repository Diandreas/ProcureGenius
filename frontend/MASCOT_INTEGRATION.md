# Guide d'intégration de la mascotte Procura

Ce document explique comment utiliser la mascotte Procura dans l'application ProcureGenius.

## 📦 Composants disponibles

### 1. `<Mascot />` - Composant de base

Le composant de base pour afficher la mascotte avec différentes expressions et animations.

```jsx
import Mascot from '../components/Mascot';

<Mascot
  pose="happy"        // Expression: main, happy, excited, thinking, reading, thumbup, error
  animation="bounce"  // Animation: float, bounce, wave, pulse, none
  size={100}         // Taille en pixels
/>
```

### 2. `<LoadingState />` - État de chargement

Affiche la mascotte pendant le chargement des données.

```jsx
import LoadingState from '../components/LoadingState';

// Dans une page
{loading && <LoadingState message="Chargement des données..." />}

// En plein écran
{loading && <LoadingState message="Initialisation..." fullScreen />}
```

### 3. `<EmptyState />` - État vide

Affiche la mascotte quand il n'y a pas de données.

```jsx
import EmptyState from '../components/EmptyState';

{items.length === 0 && (
  <EmptyState
    title="Aucune donnée"
    description="Commencez par ajouter votre premier élément."
    mascotPose="reading"
    actionLabel="Ajouter"
    onAction={() => navigate('/add')}
  />
)}
```

### 4. `<ErrorState />` - État d'erreur

Affiche la mascotte lors d'une erreur.

```jsx
import ErrorState from '../components/ErrorState';

{error && (
  <ErrorState
    title="Erreur"
    message="Une erreur s'est produite."
    onRetry={handleRetry}
    showHome={true}
  />
)}
```

### 5. `<ContextualMascot />` - Mascotte flottante contextuelle

Mascotte qui apparaît en coin d'écran et change d'expression selon le contexte.

```jsx
import ContextualMascot from '../components/ContextualMascot';

// Dans MainLayout (déjà intégré)
<ContextualMascot 
  showTips={true}
  tips={[
    "💡 Conseil 1",
    "⚡ Conseil 2",
  ]}
/>
```

#### Événements personnalisés pour la mascotte contextuelle

```javascript
// Déclencher une animation de succès
window.dispatchEvent(new CustomEvent('mascot-success'));

// Déclencher une animation d'erreur
window.dispatchEvent(new CustomEvent('mascot-error'));
```

### 6. `<MascotSnackbar />` - Notifications avec mascotte

Affiche des notifications avec la mascotte intégrée.

```jsx
import MascotSnackbar from '../components/MascotSnackbar';

const [open, setOpen] = useState(false);

<MascotSnackbar
  open={open}
  onClose={() => setOpen(false)}
  severity="success"  // success, error, info, warning
  message="Opération réussie !"
  autoHideDuration={4000}
/>
```

#### Provider pour notifications globales (optionnel)

```jsx
import { MascotSnackbarProvider, useEnhancedSnackbar } from '../components/MascotSnackbarProvider';

// Dans App.jsx
<MascotSnackbarProvider>
  <YourApp />
</MascotSnackbarProvider>

// Dans un composant
const { enqueueSnackbar } = useEnhancedSnackbar();
enqueueSnackbar("Message de succès", { severity: 'success' });
```

## 🎨 Expressions disponibles

| Expression | Usage | Animation recommandée |
|-----------|-------|----------------------|
| `main` | Neutre/Défaut | float |
| `happy` | Content/Bienvenue | wave |
| `excited` | Très content/Succès | bounce |
| `thinking` | Réflexion/Chargement | pulse |
| `reading` | Concentration/Liste vide | float |
| `thumbup` | Approbation/Succès | bounce |
| `error` | Erreur/Problème | wave |

## 🎬 Animations disponibles

| Animation | Description | Amplitude | Durée |
|-----------|-------------|-----------|-------|
| `float` | Flottement très doux | translateY(±3px) | 3s |
| `bounce` | Rebond subtil | scale(1.02) | 3s |
| `wave` | Ondulation légère | rotate(±2deg) | 3s |
| `pulse` | Pulsation douce | scale(1.03) + opacity | 3s |
| `none` | Aucune animation | - | - |

**Note** : Toutes les animations sont conçues pour être subtiles et professionnelles, avec des mouvements à peine perceptibles pour ne pas distraire l'utilisateur.

## 📍 Où la mascotte est intégrée

### Pages principales

- ✅ **Dashboard** - Message de bienvenue personnalisé selon l'heure
- ✅ **AIChat** - Écran de bienvenue avec Procura
- ✅ **Login** - Accueil sur la page de connexion
- ✅ **404 (NotFound)** - Page d'erreur avec mascotte

### Pages de liste (états vides)

- ✅ **Suppliers** - Liste vide avec EmptyState
- ✅ **Purchase Orders** - Liste vide avec EmptyState
- ✅ **Invoices** - Liste vide avec EmptyState
- ✅ **Products** - Liste vide avec EmptyState
- ✅ **Clients** - Liste vide avec EmptyState
- ✅ **Contracts** - Liste vide avec EmptyState
- ✅ **E-Sourcing Events** - Liste vide avec EmptyState

### Composants globaux

- ✅ **MainLayout** - Mascotte contextuelle flottante (desktop)
- ✅ **FloatingAIAssistant** - Utilise la mascotte dans l'interface IA
- ✅ **ThinkingAnimation** - Animation de réflexion de l'IA

## 💡 Bonnes pratiques

### 1. Tailles recommandées

- **Notifications**: 40-60px
- **États vides/erreur**: 100-150px
- **Page d'accueil**: 100-200px
- **Mascotte flottante**: 70-80px
- **Bienvenue**: 80-120px

### 2. Choix de l'expression

```jsx
// ✅ Bon
<LoadingState /> // Utilise automatiquement "thinking" avec "pulse"

// ✅ Bon
<EmptyState mascotPose="reading" /> // Pour une liste vide

// ✅ Bon - Succès
<MascotSnackbar severity="success" /> // Utilise "thumbup" automatiquement

// ✅ Bon - Erreur
<ErrorState /> // Utilise "error" avec "wave" automatiquement
```

### 3. Animations subtiles et professionnelles

Toutes les animations ont été optimisées pour être **très discrètes** :

```jsx
// ✅ Excellent - Animation très douce (±3px seulement)
<Mascot pose="happy" animation="float" />

// ✅ Bon - Pour états de succès, mouvement minimal
<Mascot pose="thumbup" animation="bounce" />

// ✅ Parfait - Rotation de ±2deg seulement
<Mascot pose="error" animation="wave" />

// ✅ Idéal pour chargement - Pulsation légère
<Mascot pose="thinking" animation="pulse" />
```

**Amplitudes réduites** :
- Float : ±3px (au lieu de ±10px)
- Bounce : scale 1.02 (au lieu de 1.05)
- Wave : ±2deg (au lieu de ±10deg)
- Pulse : scale 1.03 (au lieu de 1.1)

**Durée augmentée** : 3s (au lieu de 2s) pour plus de fluidité.

### 4. Contexte approprié

```jsx
// ✅ Bon - Expression selon le contexte
const getMascotPose = () => {
  if (isLoading) return 'thinking';
  if (hasError) return 'error';
  if (isSuccess) return 'thumbup';
  return 'happy';
};

<Mascot pose={getMascotPose()} />
```

## 🔧 Personnalisation avancée

### Mascottes conditionnelles selon l'heure

```jsx
const getTimeBasedMascot = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { pose: 'excited', greeting: 'Bonjour' };
  if (hour >= 12 && hour < 18) return { pose: 'reading', greeting: 'Bon après-midi' };
  if (hour >= 18 && hour < 22) return { pose: 'happy', greeting: 'Bonsoir' };
  return { pose: 'thinking', greeting: 'Bonne nuit' };
};

const mascot = getTimeBasedMascot();
<Mascot pose={mascot.pose} animation="wave" />
```

### Événements personnalisés pour interactions

```jsx
// Déclencher des animations sur des événements spécifiques
const handleSuccess = () => {
  // Notifier la mascotte contextuelle
  window.dispatchEvent(new CustomEvent('mascot-success'));
  
  // Afficher notification
  enqueueSnackbar('Succès !', { severity: 'success' });
};

const handleError = () => {
  window.dispatchEvent(new CustomEvent('mascot-error'));
  enqueueSnackbar('Erreur', { severity: 'error' });
};
```

## 📱 Considérations responsive

La mascotte contextuelle n'est affichée que sur desktop pour éviter d'encombrer l'écran mobile :

```jsx
const isMobile = useMediaQuery(theme.breakpoints.down('md'));

{!isMobile && <ContextualMascot />}
```

## 🎯 Exemples d'utilisation complète

### Page de liste avec tous les états

```jsx
import { useState, useEffect } from 'react';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';

function MyListPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);

  if (loading) {
    return <LoadingState message="Chargement..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Erreur de chargement"
        message={error.message}
        onRetry={fetchItems}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Aucun élément"
        description="Commencez par ajouter votre premier élément."
        mascotPose="reading"
        actionLabel="Ajouter"
        onAction={() => navigate('/add')}
      />
    );
  }

  return <div>{/* Liste des items */}</div>;
}
```

## 🚀 Améliorations futures possibles

- [ ] Ajouter plus d'expressions de mascotte
- [ ] Animations personnalisées pour événements spéciaux
- [ ] Mascotte interactive qui répond au clic
- [ ] Sons optionnels pour certaines interactions
- [ ] Thèmes alternatifs de mascotte
- [ ] Mascotte avec bulles de dialogue animées

---

**Note** : La mascotte est conçue pour améliorer l'expérience utilisateur sans être intrusive. Utilisez-la avec parcimonie aux endroits stratégiques pour un effet optimal.

