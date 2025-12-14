# Guide Rapide - Système de Rapport Amélioré sur Tous les Modules

## ✅ Statut d'Implémentation

### Module Factures (Invoices)
✅ **TERMINÉ** - Sélection avancée + 3 boutons d'action implémentés

### Modules Restants
Les modules suivants utilisent le même code que Invoices, avec ces adaptations :

## 📦 Purchase Orders (Bons de Commande)

**Fichier**: `frontend/src/pages/purchase-orders/PurchaseOrders.jsx`

### Adaptations nécessaires:
- État: `selectedPOs` au lieu de `selectedInvoices`
- Service: `generatePurchaseOrdersBulkReport`
- Labels: `po_number`, `supplier_name`
- Traductions: `purchaseOrders:*`
- Nom fichier: `rapport-bons-commande-[timestamp].pdf`

### Champs spécifiques dans le dialogue:
```javascript
{filteredPurchaseOrders.map((po) => (
  <FormControlLabel
    key={po.id}
    control={<Checkbox ... />}
    label={
      <Box>
        <Typography variant="body2">{po.po_number}</Typography>
        <Typography variant="caption" color="text.secondary">
          {po.supplier_name || '-'} • {formatCurrency(po.total_amount)}
        </Typography>
      </Box>
    }
  />
))}
```

---

## 👥 Clients

**Fichier**: `frontend/src/pages/clients/Clients.jsx`

### Adaptations nécessaires:
- État: `selectedClients`
- Service: `generateClientsBulkReport`
- Labels: `name`, `email`, `total_invoiced`
- Traductions: `clients:*`
- Nom fichier: `rapport-clients-[timestamp].pdf`

### Champs spécifiques:
```javascript
{filteredClients.map((client) => (
  <FormControlLabel
    key={client.id}
    control={<Checkbox ... />}
    label={
      <Box>
        <Typography variant="body2">{client.name}</Typography>
        <Typography variant="caption" color="text.secondary">
          {client.email || '-'} • {formatCurrency(client.total_invoiced || 0)}
        </Typography>
      </Box>
    }
  />
))}
```

---

## 📦 Products (Produits)

**Fichier**: `frontend/src/pages/products/Products.jsx`

### Adaptations nécessaires:
- État: `selectedProducts`
- Service: `generateProductsBulkReport`
- Labels: `name`, `reference`, `category`
- Traductions: `products:*`
- Nom fichier: `rapport-produits-[timestamp].pdf`

### Champs spécifiques:
```javascript
{filteredProducts.map((product) => (
  <FormControlLabel
    key={product.id}
    control={<Checkbox ... />}
    label={
      <Box>
        <Typography variant="body2">{product.name}</Typography>
        <Typography variant="caption" color="text.secondary">
          {product.reference} • {product.category || '-'}
        </Typography>
      </Box>
    }
  />
))}
```

---

## 🏢 Suppliers (Fournisseurs)

**Fichier**: `frontend/src/pages/suppliers/Suppliers.jsx`

### Adaptations nécessaires:
- État: `selectedSuppliers`
- Service: Backend à vérifier (peut ne pas exister)
- Labels: `name`, `email`, `total_purchased`
- Traductions: `suppliers:*`
- Nom fichier: `rapport-fournisseurs-[timestamp].pdf`

### Champs spécifiques:
```javascript
{filteredSuppliers.map((supplier) => (
  <FormControlLabel
    key={supplier.id}
    control={<Checkbox ... />}
    label={
      <Box>
        <Typography variant="body2">{supplier.name}</Typography>
        <Typography variant="caption" color="text.secondary">
          {supplier.email || '-'} • {formatCurrency(supplier.total_purchased || 0)}
        </Typography>
      </Box>
    }
  />
))}
```

---

## 🔄 Processus d'Application

### Pour Chaque Module:

#### 1. Imports
```javascript
// REMPLACER
import ReportGenerationDialog from '../../components/common/ReportGenerationDialog';

// PAR
// (Supprimé - on utilise Dialog standard de MUI)

// AJOUTER aux imports MUI
FormGroup, FormControlLabel, Checkbox, Divider
```

#### 2. États
```javascript
// AJOUTER
const [reportConfigOpen, setReportConfigOpen] = useState(false);
const [reportFilters, setReportFilters] = useState({
  dateStart: '',
  dateEnd: '',
  selected[Items]: [],
});
```

#### 3. Fonctions
- Copier `handleGenerateReportClick` de Invoices
- Copier `handleConfigureReport` et adapter le nom du service
- Copier `handleCloseDialog`
- Copier/mettre à jour `handlePdfAction`

#### 4. Dialogues
- Remplacer `<ReportGenerationDialog ... />` par le nouveau dialogue de configuration
- Mettre à jour le dialogue d'actions PDF

---

## 🎯 Code Source de Référence

**Fichier maître**: `frontend/src/pages/invoices/Invoices.jsx`

Tous les modules doivent suivre le même pattern que ce fichier, avec les adaptations listées ci-dessus.

---

## 📝 Traductions Nécessaires

### Pour chaque module dans `locales/fr/[module].json`:

```json
{
  "actions": {
    "generateReport": "Rapport PDF"
  },
  "report": {
    "title": "Générer un Rapport de [Module]",
    "itemLabel": "[item]",
    "itemsLabel": "[items]"
  },
  "messages": {
    "reportError": "Erreur lors de la génération du rapport",
    "reportGenerated": "Rapport généré avec succès ! Choisissez une action ci-dessous.",
    "pdfGenerationHelpText": "Vous pouvez prévisualiser, télécharger ou imprimer directement le rapport.",
    "pdfDownloadedSuccess": "PDF téléchargé avec succès",
    "printWindowOpened": "Fenêtre d'impression ouverte"
  },
  "labels": {
    "generatingLabel": "Génération..."
  },
  "buttons": {
    "preview": "Aperçu",
    "print": "Imprimer",
    "download": "Télécharger",
    "cancel": "Annuler"
  }
}
```

---

## ⚡ Implémentation Rapide

### Ordre Recommandé:
1. ✅ Invoices (FAIT)
2. ⏳ Purchase Orders (EN COURS)
3. ⏳ Clients
4. ⏳ Products
5. ⏳ Suppliers

### Temps Estimé par Module:
- 15-20 minutes par module
- Total: ~1h30 pour les 4 modules restants

---

## 🧪 Tests à Effectuer

Pour chaque module:
1. ✅ Clic sur "Rapport PDF" ouvre le dialogue de config
2. ✅ Sélection de période fonctionne
3. ✅ Sélection d'items fonctionne
4. ✅ Boutons "Tout sélectionner/désélectionner" fonctionnent
5. ✅ Génération du PDF réussit
6. ✅ Les 3 actions (Aperçu, Imprimer, Télécharger) fonctionnent
7. ✅ Messages de confirmation s'affichent
8. ✅ Gestion d'erreurs fonctionne

---

**Prochaine étape**: Continuer l'implémentation sur Purchase Orders, puis passer aux autres modules.

