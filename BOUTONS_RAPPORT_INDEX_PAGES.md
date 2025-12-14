# ✅ Boutons Rapport PDF sur Pages Index

## 🎯 Modifications Appliquées

J'ai ajouté les **boutons "Générer Rapport PDF"** sur les pages index de **Factures** et **Bons de Commande**.

## 📦 Fichiers Modifiés

### 1. Page Invoices (`frontend/src/pages/invoices/Invoices.jsx`)

#### ✅ Imports Ajoutés
```javascript
import { Button } from '@mui/material';
import { PictureAsPdf } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import ReportGenerationDialog from '../../components/common/ReportGenerationDialog';
import { downloadInvoicesBulkReport } from '../../services/pdfReportService';
```

#### ✅ State Ajouté
```javascript
const [reportDialogOpen, setReportDialogOpen] = useState(false);
```

#### ✅ Handler Ajouté
```javascript
const handleGenerateReport = async (filters) => {
  try {
    await downloadInvoicesBulkReport({
      itemIds: filters.itemIds,
      dateStart: filters.dateStart,
      dateEnd: filters.dateEnd,
      status: quickFilter || statusFilter || undefined,
    });
    enqueueSnackbar(t('invoices:messages.reportGenerated', 'Rapport PDF généré avec succès'), {
      variant: 'success',
    });
  } catch (error) {
    console.error('Error generating report:', error);
    enqueueSnackbar(t('invoices:messages.reportError', 'Erreur lors de la génération du rapport'), {
      variant: 'error',
    });
  }
};
```

#### ✅ Header avec Bouton
```jsx
<Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
  <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">
    {t('invoices:title', 'Factures')}
  </Typography>
  <Button
    variant="outlined"
    color="success"
    startIcon={<PictureAsPdf />}
    onClick={() => setReportDialogOpen(true)}
    sx={{ ml: 'auto' }}
  >
    {t('invoices:actions.generateReport', 'Rapport PDF')}
  </Button>
</Box>
```

#### ✅ Dialogue Ajouté
```jsx
<ReportGenerationDialog
  open={reportDialogOpen}
  onClose={() => setReportDialogOpen(false)}
  onGenerate={handleGenerateReport}
  items={filteredInvoices.map(inv => ({
    id: inv.id,
    label: inv.invoice_number,
    sublabel: `${inv.client_name || '-'} - ${formatCurrency(inv.total_amount)}`
  }))}
  title={t('invoices:report.title', 'Générer un Rapport de Factures')}
  itemLabel={t('invoices:report.itemLabel', 'facture')}
  itemsLabel={t('invoices:report.itemsLabel', 'factures')}
  showDateFilter={true}
  showItemSelection={true}
/>
```

### 2. Page PurchaseOrders (`frontend/src/pages/purchase-orders/PurchaseOrders.jsx`)

#### ✅ Imports Ajoutés
```javascript
import { Button } from '@mui/material';
import { PictureAsPdf } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import ReportGenerationDialog from '../../components/common/ReportGenerationDialog';
import { downloadPurchaseOrdersBulkReport } from '../../services/pdfReportService';
```

#### ✅ State Ajouté
```javascript
const [reportDialogOpen, setReportDialogOpen] = useState(false);
```

#### ✅ Handler Ajouté
```javascript
const handleGenerateReport = async (filters) => {
  try {
    await downloadPurchaseOrdersBulkReport({
      itemIds: filters.itemIds,
      dateStart: filters.dateStart,
      dateEnd: filters.dateEnd,
      status: quickFilter || statusFilter || undefined,
    });
    enqueueSnackbar(t('purchaseOrders:messages.reportGenerated', 'Rapport PDF généré avec succès'), {
      variant: 'success',
    });
  } catch (error) {
    console.error('Error generating report:', error);
    enqueueSnackbar(t('purchaseOrders:messages.reportError', 'Erreur lors de la génération du rapport'), {
      variant: 'error',
    });
  }
};
```

#### ✅ Header avec Bouton
```jsx
<Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
  <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">
    {t('purchaseOrders:title', 'Bons de Commande')}
  </Typography>
  <Button
    variant="outlined"
    color="success"
    startIcon={<PictureAsPdf />}
    onClick={() => setReportDialogOpen(true)}
    sx={{ ml: 'auto' }}
  >
    {t('purchaseOrders:actions.generateReport', 'Rapport PDF')}
  </Button>
</Box>
```

#### ✅ Dialogue Ajouté
```jsx
<ReportGenerationDialog
  open={reportDialogOpen}
  onClose={() => setReportDialogOpen(false)}
  onGenerate={handleGenerateReport}
  items={filteredPurchaseOrders.map(po => ({
    id: po.id,
    label: po.po_number,
    sublabel: `${po.supplier_name || '-'} - ${formatCurrency(po.total_amount)}`
  }))}
  title={t('purchaseOrders:report.title', 'Générer un Rapport de Bons de Commande')}
  itemLabel={t('purchaseOrders:report.itemLabel', 'bon de commande')}
  itemsLabel={t('purchaseOrders:report.itemsLabel', 'bons de commande')}
  showDateFilter={true}
  showItemSelection={true}
/>
```

## 🎨 Interface Utilisateur

### Header avec Bouton

```
┌─────────────────────────────────────────────────────┐
│ Factures                    [📄 Rapport PDF]        │
└─────────────────────────────────────────────────────┘
```

### Dialogue de Génération

Le dialogue `ReportGenerationDialog` permet de:
- ✅ **Sélectionner des éléments** spécifiques (checkboxes)
- ✅ **Filtrer par période** (date début/fin)
- ✅ **Générer le rapport** pour les éléments sélectionnés ou tous

## 🔧 Fonctionnalités

### Pour les Factures

**Options disponibles**:
- Sélection de factures spécifiques
- Filtre par période (date début/fin)
- Filtre par statut (déjà appliqué via quickFilter/statusFilter)
- Génération d'un PDF groupé avec toutes les factures sélectionnées

**Endpoint utilisé**: `POST /api/v1/invoices/bulk-pdf-report/`

### Pour les Bons de Commande

**Options disponibles**:
- Sélection de bons de commande spécifiques
- Filtre par période (date début/fin)
- Filtre par statut (déjà appliqué via quickFilter/statusFilter)
- Génération d'un PDF groupé avec tous les bons sélectionnés

**Endpoint utilisé**: `POST /api/v1/purchase-orders/bulk-pdf-report/`

## 📊 Flux Utilisateur

1. **Utilisateur clique sur "Rapport PDF"**
   - Le dialogue `ReportGenerationDialog` s'ouvre

2. **Utilisateur configure le rapport**
   - Option 1: Sélectionner des éléments spécifiques (checkboxes)
   - Option 2: Utiliser les filtres de date
   - Option 3: Les deux

3. **Utilisateur clique sur "Générer"**
   - Le backend génère le PDF groupé
   - Le PDF est automatiquement téléchargé
   - Un message de succès s'affiche

4. **En cas d'erreur**
   - Un message d'erreur s'affiche
   - L'erreur est loggée dans la console

## ✅ Résultat

**Les pages index ont maintenant**:
- ✅ Titre visible en haut
- ✅ Bouton "Rapport PDF" visible et accessible
- ✅ Dialogue de configuration complet
- ✅ Génération de rapports groupés
- ✅ Messages de succès/erreur
- ✅ Design cohérent avec le reste de l'application

**Les utilisateurs peuvent maintenant générer des rapports PDF directement depuis les pages index!** 🎉

---

**Date**: 14 Décembre 2025
**Statut**: ✅ COMPLET
**Pages modifiées**: Invoices.jsx, PurchaseOrders.jsx

