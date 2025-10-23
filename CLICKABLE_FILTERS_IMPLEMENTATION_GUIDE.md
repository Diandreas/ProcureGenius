# 📊 Guide d'Implémentation - Cartes Statistiques Cliquables

## ✅ Modules Complétés

### 1. **Module Produits** (`frontend/src/pages/products/Products.jsx`) ✓
**Filtres implémentés:**
- 🟢 En stock (OK) - `product_type === 'physical' && stock > threshold`
- 🟠 Stock bas - `product_type === 'physical' && stock <= threshold && stock > 0`
- 🔴 Rupture de stock - `product_type === 'physical' && stock === 0`
- 🔵 Services/Digital - `product_type !== 'physical'`
- 🔵 Tous - Reset filter

### 2. **Module Fournisseurs** (`frontend/src/pages/suppliers/Suppliers.jsx`) ✓
**Filtres implémentés:**
- 🟢 Actifs - `status === 'active'`
- 🔴 Inactifs - `status === 'inactive'`
- 🟠 Locaux - `is_local === true`
- 🔵 Internationaux - `is_local === false`
- 🟣 Top Rated - `rating >= 4`

---

## 📋 Modules À Implémenter

### 3. **Module Clients** (`frontend/src/pages/clients/Clients.jsx`)

**Filtres recommandés:**
```jsx
// États à ajouter
const [quickFilter, setQuickFilter] = useState('');

// Statistiques à calculer
const totalClients = clients.length;
const activeClients = clients.filter(c => c.is_active).length;
const inactiveClients = clients.filter(c => !c.is_active).length;
const vipClients = clients.filter(c => c.total_purchases > 10000).length; // VIP basé sur montant
const newClients = clients.filter(c => {
  const created = new Date(c.created_at);
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  return created > monthAgo;
}).length;

// Cartes à créer:
// 1. 🟢 Actifs - success.50
// 2. 🔴 Inactifs - error.50
// 3. 🟣 VIP - secondary.50
// 4. 🔵 Nouveaux (30j) - info.50
// 5. 🔵 Tous - primary.50

// Logique de filtrage
const matchesQuick = !quickFilter || (() => {
  if (quickFilter === 'active') return client.is_active;
  if (quickFilter === 'inactive') return !client.is_active;
  if (quickFilter === 'vip') return client.total_purchases > 10000;
  if (quickFilter === 'new') {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return new Date(client.created_at) > monthAgo;
  }
  return true;
})();
```

**Icônes à importer:**
```jsx
import {
  CheckCircle, Block, Star, FiberNew, People
} from '@mui/icons-material';
```

---

### 4. **Module Factures** (`frontend/src/pages/invoices/Invoices.jsx`)

**Filtres recommandés:**
```jsx
// Statistiques
const totalInvoices = invoices.length;
const paidInvoices = invoices.filter(i => i.status === 'paid').length;
const unpaidInvoices = invoices.filter(i => i.status === 'unpaid' || i.status === 'pending').length;
const overdueInvoices = invoices.filter(i => {
  return i.status !== 'paid' && new Date(i.due_date) < new Date();
}).length;
const draftInvoices = invoices.filter(i => i.status === 'draft').length;

// Cartes:
// 1. 🟢 Payées - success.50
// 2. 🟠 Impayées - warning.50
// 3. 🔴 En retard - error.50
// 4. ⚪ Brouillons - grey.50
// 5. 🔵 Toutes - primary.50

// Logique de filtrage
if (quickFilter === 'paid') return invoice.status === 'paid';
if (quickFilter === 'unpaid') return invoice.status === 'unpaid' || invoice.status === 'pending';
if (quickFilter === 'overdue') return invoice.status !== 'paid' && new Date(invoice.due_date) < new Date();
if (quickFilter === 'draft') return invoice.status === 'draft';
```

**Icônes:**
```jsx
import {
  CheckCircle, Warning, Error, Description, Receipt
} from '@mui/icons-material';
```

---

### 5. **Module Bons de Commande** (`frontend/src/pages/purchase-orders/PurchaseOrders.jsx`)

**Filtres recommandés:**
```jsx
// Statistiques
const totalPOs = purchaseOrders.length;
const draftPOs = purchaseOrders.filter(po => po.status === 'draft').length;
const approvedPOs = purchaseOrders.filter(po => po.status === 'approved').length;
const receivedPOs = purchaseOrders.filter(po => po.status === 'received').length;
const pendingPOs = purchaseOrders.filter(po => po.status === 'pending').length;

// Cartes:
// 1. ⚪ Brouillons - grey.50
// 2. 🟠 En attente - warning.50
// 3. 🟢 Approuvés - success.50
// 4. 🔵 Reçus - info.50
// 5. 🔵 Tous - primary.50

// Logique de filtrage
if (quickFilter === 'draft') return po.status === 'draft';
if (quickFilter === 'pending') return po.status === 'pending';
if (quickFilter === 'approved') return po.status === 'approved';
if (quickFilter === 'received') return po.status === 'received';
```

**Icônes:**
```jsx
import {
  Description, HourglassEmpty, CheckCircle, LocalShipping, ShoppingCart
} from '@mui/icons-material';
```

---

### 6. **Module E-Sourcing** (`frontend/src/pages/e-sourcing/SourcingEvents.jsx`)

**Filtres recommandés:**
```jsx
// Statistiques
const totalEvents = events.length;
const draftEvents = events.filter(e => e.status === 'draft').length;
const publishedEvents = events.filter(e => e.status === 'published').length;
const closedEvents = events.filter(e => e.status === 'closed').length;
const activeEvents = events.filter(e => {
  return e.status === 'published' && new Date(e.deadline) > new Date();
}).length;

// Cartes:
// 1. ⚪ Brouillons - grey.50
// 2. 🔵 Publiés - info.50
// 3. 🟢 Actifs - success.50
// 4. 🔴 Clôturés - error.50
// 5. 🔵 Tous - primary.50

// Logique de filtrage
if (quickFilter === 'draft') return event.status === 'draft';
if (quickFilter === 'published') return event.status === 'published';
if (quickFilter === 'active') {
  return event.status === 'published' && new Date(event.deadline) > new Date();
}
if (quickFilter === 'closed') return event.status === 'closed';
```

**Icônes:**
```jsx
import {
  Description, Public, TrendingUp, CheckCircle, Gavel
} from '@mui/icons-material';
```

---

## 🎨 Template de Code Réutilisable

### Pattern complet à copier-coller:

```jsx
// 1. Imports nécessaires
import {
  CheckCircle, Error, Warning, Info, Inventory // Adapter selon besoin
} from '@mui/icons-material';

// 2. États
const [quickFilter, setQuickFilter] = useState('');

// 3. Handler
const handleQuickFilterClick = (filterValue) => {
  if (quickFilter === filterValue) {
    setQuickFilter('');
  } else {
    setQuickFilter(filterValue);
  }
};

// 4. Logique de filtrage (ajouter dans la fonction filter existante)
const matchesQuick = !quickFilter || (() => {
  if (quickFilter === 'VALUE1') return CONDITION1;
  if (quickFilter === 'VALUE2') return CONDITION2;
  // ... etc
  return true;
})();

return matchesSearch && matchesOtherFilters && matchesQuick;

// 5. Template de carte (répéter pour chaque filtre)
<Grid item xs={6} sm={2.4}>
  <Card
    onClick={() => handleQuickFilterClick('FILTER_VALUE')}
    sx={{
      borderRadius: 2,
      bgcolor: 'COLOR.50', // success.50, error.50, warning.50, info.50, etc.
      cursor: 'pointer',
      border: '2px solid',
      borderColor: quickFilter === 'FILTER_VALUE' ? 'COLOR.main' : 'transparent',
      transition: 'all 0.3s',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: 3,
        borderColor: 'COLOR.main'
      }
    }}
  >
    <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconComponent sx={{ fontSize: isMobile ? 20 : 24, color: 'COLOR.main' }} />
        <Box>
          <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="COLOR.main">
            {count}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
            Label
          </Typography>
        </Box>
      </Stack>
    </CardContent>
  </Card>
</Grid>

// 6. Indicateur de filtre actif (après le Grid)
{quickFilter && (
  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
    <Typography variant="body2" color="text.secondary">Filtre actif:</Typography>
    <Chip
      label={FILTER_LABEL}
      onDelete={() => setQuickFilter('')}
      color={FILTER_COLOR}
      size="small"
    />
  </Box>
)}
```

---

## 🎯 Checklist d'Implémentation

Pour chaque module:

- [ ] Ajouter import des icônes Material-UI
- [ ] Créer state `quickFilter`
- [ ] Créer fonction `handleQuickFilterClick`
- [ ] Calculer les statistiques pertinentes
- [ ] Modifier la fonction de filtrage (ajouter `matchesQuick`)
- [ ] Remplacer les cartes statistiques statiques par des cartes cliquables
- [ ] Ajouter l'indicateur de filtre actif (Chip)
- [ ] Tester hover, clic, toggle
- [ ] Vérifier responsive (mobile et desktop)
- [ ] Commit avec message descriptif

---

## 🚀 Bénéfices UX

✅ **Navigation Rapide** - Un clic pour filtrer au lieu de 3 clics (ouvrir menu → sélectionner → valider)
✅ **Feedback Visuel** - Bordure colorée montre le filtre actif
✅ **Dashboard Intuitif** - Les stats deviennent interactives
✅ **Cohérence** - Même pattern dans tous les modules
✅ **Responsive** - Fonctionne parfaitement mobile et desktop
✅ **Accessible** - Hover states et visual feedback

---

## 📝 Notes Techniques

### Grid Layout
- `xs={6}` - 2 cartes par ligne sur mobile
- `sm={2.4}` - 5 cartes par ligne sur desktop (12 / 5 = 2.4)

### Couleurs Material-UI
- `success` = Vert (🟢) - Positif, actif, OK
- `error` = Rouge (🔴) - Négatif, inactif, problème
- `warning` = Orange (🟠) - Attention, stock bas, en attente
- `info` = Bleu (🔵) - Informatif, neutre
- `secondary` = Violet (🟣) - Spécial, premium, VIP
- `primary` = Bleu principal - Total, tous

### Transitions
- `0.3s` - Animation fluide mais rapide
- `translateY(-4px)` - Lift effect au hover
- `boxShadow: 3` - Ombre au hover

---

## 🎨 Exemple Visuel

```
Avant:
[📊 Total] [✓ Actifs] [📦 Stock bas] [❌ Rupture]
(Cartes statiques, pas cliquables)

Après:
[📊 Total]  [✓ Actifs]  [📦 Stock bas]  [❌ Rupture]  [🔧 Services]
    ↓           ↓            ↓               ↓             ↓
 Cliquable   Cliquable    Cliquable       Cliquable     Cliquable
 + Hover     + Hover      + Hover         + Hover       + Hover
 + Toggle    + Toggle     + Toggle        + Toggle      + Toggle
```

---

**Créé par Claude Code** 🤖
