# DateNavigator Component

## Description

Le composant `DateNavigator` est un filtre de date intuitif avec des boutons de navigation rapide et un sélecteur de date. Il permet aux utilisateurs de naviguer facilement entre les dates et de sélectionner une date spécifique.

## Fonctionnalités

- Bouton "Jour précédent" (←) pour naviguer vers le jour précédent
- Bouton "Aujourd'hui" pour revenir à la date du jour
- Bouton "Jour suivant" (→) pour naviguer vers le jour suivant
- Sélecteur de date pour choisir une date spécifique
- Design moderne et intuitif avec les icônes Material-UI
- Support complet de l'internationalisation (i18n)
- Responsive et accessible

## Utilisation

### Import

```jsx
import DateNavigator from '../../components/common/DateNavigator';
```

### Props

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `value` | string | Oui | La date actuelle au format YYYY-MM-DD |
| `onChange` | function | Oui | Callback appelé quand la date change, reçoit la nouvelle date (YYYY-MM-DD) |
| `disabled` | boolean | Non | Si true, désactive tous les contrôles (défaut: false) |

### Exemple de base

```jsx
import React, { useState } from 'react';
import DateNavigator from '../../components/common/DateNavigator';

function MyComponent() {
  const [selectedDate, setSelectedDate] = useState('');

  return (
    <DateNavigator
      value={selectedDate}
      onChange={setSelectedDate}
    />
  );
}
```

### Exemple avec filtre

```jsx
import React, { useState } from 'react';
import DateNavigator from '../../components/common/DateNavigator';

function InvoicesList() {
  const [selectedDate, setSelectedDate] = useState('');

  const filteredInvoices = invoices.filter(invoice => {
    if (!selectedDate) return true;

    const invoiceDate = invoice.issue_date ? invoice.issue_date.split('T')[0] : null;
    return invoiceDate === selectedDate;
  });

  return (
    <div>
      <DateNavigator
        value={selectedDate}
        onChange={setSelectedDate}
      />
      {/* Afficher les factures filtrées */}
    </div>
  );
}
```

## Intégration

Le composant DateNavigator a été intégré dans:

1. **Page des Factures** (`frontend/src/pages/invoices/Invoices.jsx`)
   - Filtre les factures par date d'émission (issue_date) ou date d'échéance (due_date)

2. **Page des Bons de Commande** (`frontend/src/pages/purchase-orders/PurchaseOrders.jsx`)
   - Filtre les bons de commande par date de commande (order_date) ou date de livraison (delivery_date)

## Traductions

Les traductions sont disponibles dans les fichiers suivants:

- `frontend/src/locales/fr/common.json` (français)
- `frontend/src/locales/en/common.json` (anglais)

### Clés de traduction

```json
{
  "dateNavigator": {
    "previousDay": "Jour précédent",
    "today": "Aujourd'hui",
    "nextDay": "Jour suivant"
  }
}
```

## Styling

Le composant utilise les styles Material-UI avec le système de thème. Il est entièrement responsive et s'adapte automatiquement aux différentes tailles d'écran.

## Accessibilité

- Tous les boutons ont des tooltips descriptifs
- Les icônes sont enveloppées dans des balises `<span>` pour éviter les problèmes avec les tooltips sur les boutons désactivés
- Support complet du clavier
- Respect des standards WCAG

## Notes techniques

- Le composant utilise le format de date YYYY-MM-DD (ISO 8601)
- La manipulation des dates utilise l'objet JavaScript `Date` natif
- Aucune dépendance externe (moment.js, date-fns, etc.) n'est requise
