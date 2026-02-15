# Guide des Composants Safe MUI

## 🎯 Objectif

Les composants Safe sont des wrappers autour des composants Material-UI qui **préviennent les erreurs PropTypes** courantes en nettoyant et validant les props avant de les passer aux composants MUI.

## 🚀 Composants Disponibles

### SafeButton
Wrapper pour `Button` qui gère les props `startIcon` et `endIcon` de manière robuste.

```jsx
import { SafeButton } from '@/components/safe';

// ✅ Correct - même si icon est undefined
<SafeButton startIcon={maybeUndefinedIcon}>
  Cliquez ici
</SafeButton>

// ❌ Sans SafeButton - peut causer une erreur PropTypes si icon est null/undefined
<Button startIcon={icon}>Cliquez ici</Button>
```

### SafeTab
Wrapper pour `Tab` qui valide les props `icon` et `label`.

```jsx
import { SafeTab } from '@/components/safe';

// ✅ Correct
<Tabs value={value}>
  <SafeTab icon={<HomeIcon />} label="Accueil" />
  <SafeTab icon={maybeUndefined} label={dynamicLabel} />
</Tabs>
```

### SafeBottomNavigationAction
Wrapper pour `BottomNavigationAction` qui valide `icon` et `label`.

```jsx
import { SafeBottomNavigationAction } from '@/components/safe';

// ✅ Correct
<BottomNavigation value={value}>
  <SafeBottomNavigationAction
    icon={<HomeIcon />}
    label="Accueil"
  />
</BottomNavigation>
```

### SafeListItemText
Wrapper pour `ListItemText` qui valide `primary`, `secondary` et `children`.

```jsx
import { SafeListItemText } from '@/components/safe';

// ✅ Correct - même si secondary est null
<ListItem>
  <SafeListItemText
    primary="Titre"
    secondary={maybeNullDescription}
  />
</ListItem>
```

## 🛠️ Utilitaires Props (propHelpers.js)

### cleanProps
Nettoie un objet de props en retirant les valeurs undefined/null/false.

```jsx
import { cleanProps } from '@/utils/propHelpers';

const props = { startIcon: undefined, color: 'primary', disabled: false };
<Button {...cleanProps(props)} />
// Résultat: <Button color="primary" />
```

### safeIcon
Valide qu'une icône est un ReactNode valide ou retourne undefined.

```jsx
import { safeIcon } from '@/utils/propHelpers';

<Button startIcon={safeIcon(maybeInvalidIcon)} />
```

### safeLabel
Convertit n'importe quelle valeur en string valide ou retourne ''.

```jsx
import { safeLabel } from '@/utils/propHelpers';

<Tab label={safeLabel(dynamicValue)} />
```

### iconProp
Helper pour créer des props conditionnelles pour les icônes.

```jsx
import { iconProp } from '@/utils/propHelpers';

<Button {...iconProp('startIcon', maybeUndefined)} />
// Équivalent à: <Button startIcon={icon} /> si icon existe, <Button /> sinon
```

## 📋 Migration d'un Composant Existant

### Étape 1: Identifier les composants à migrer
Cherchez les composants qui utilisent des props dynamiques:
- `Button` avec `startIcon` ou `endIcon`
- `Tab` avec `icon` ou `label`
- `BottomNavigationAction` avec `icon` ou `label`
- `ListItemText` avec `secondary`

### Étape 2: Importer le composant Safe

```jsx
// Avant
import { Button, Tab } from '@mui/material';

// Après
import { Button } from '@mui/material';
import { SafeTab } from '@/components/safe';
```

### Étape 3: Remplacer dans le JSX

```jsx
// Avant
<Tab icon={<HomeIcon />} label="Accueil" />

// Après
<SafeTab icon={<HomeIcon />} label="Accueil" />
```

## ⚠️ Quand Utiliser les Composants Safe?

### ✅ Utilisez Safe quand:
- Les props (icon, label, etc.) peuvent être undefined/null
- Les valeurs viennent d'une API ou d'un state dynamique
- Vous voyez des erreurs PropTypes dans la console
- Vous mappez des données et certains champs peuvent manquer

### ❌ Pas nécessaire quand:
- Les props sont toujours définis (valeurs en dur)
- Vous contrôlez 100% des données
- Le composant MUI n'accepte pas de props optionnelles

## 🔧 Exemples Complets

### Exemple 1: Menu dynamique avec icônes optionnelles

```jsx
import { SafeBottomNavigationAction } from '@/components/safe';

const menuItems = [
  { label: 'Home', icon: <HomeIcon />, value: '/' },
  { label: 'About', icon: undefined, value: '/about' }, // Pas d'icône
  { label: 'Contact', icon: <ContactIcon />, value: '/contact' }
];

<BottomNavigation value={value}>
  {menuItems.map(item => (
    <SafeBottomNavigationAction
      key={item.value}
      label={item.label}
      icon={item.icon}
      value={item.value}
    />
  ))}
</BottomNavigation>
```

### Exemple 2: Boutons avec actions conditionnelles

```jsx
import { SafeButton } from '@/components/safe';

const actions = [
  { label: 'Save', icon: <SaveIcon />, onClick: handleSave },
  { label: 'Cancel', icon: null, onClick: handleCancel }
];

{actions.map(action => (
  <SafeButton
    key={action.label}
    startIcon={action.icon}
    onClick={action.onClick}
  >
    {action.label}
  </SafeButton>
))}
```

## 🐛 Dépannage

### Problème: "Warning: Failed prop type: Invalid prop `icon`"
**Solution**: Utilisez `SafeTab` ou `SafeBottomNavigationAction`

### Problème: "Warning: Failed prop type: Invalid prop `startIcon`"
**Solution**: Utilisez `SafeButton` ou `{...iconProp('startIcon', icon)}`

### Problème: Composant Safe non trouvé
**Solution**: Vérifiez le chemin d'import:
```jsx
// Depuis pages/
import { SafeTab } from '../components/safe';

// Depuis components/
import { SafeTab } from './safe';

// Avec alias @
import { SafeTab } from '@/components/safe';
```

## 📚 Ressources

- Code source: `frontend/src/components/safe/`
- Utilitaires: `frontend/src/utils/propHelpers.js`
- Script de migration: `frontend/migrate-to-safe-components.py`

## 🎨 Bonnes Pratiques

1. **Toujours valider les props dynamiques**: Si une prop vient d'une API, utilisez Safe
2. **Préférer Safe dans les map()**: Lors du mapping de données, utilisez toujours Safe
3. **Centraliser les validations**: Utilisez propHelpers pour créer vos propres validations
4. **Documenter les cas limites**: Si vous passez null intentionnellement, ajoutez un commentaire

## 🔄 Mise à Jour

Pour migrer automatiquement tous les fichiers:

```bash
python frontend/migrate-to-safe-components.py
```

Ce script remplace automatiquement `Tab` par `SafeTab` dans tous les fichiers identifiés.

---

**Dernière mise à jour**: 2026-02-15
**Auteur**: Équipe Dev ProcureGenius
