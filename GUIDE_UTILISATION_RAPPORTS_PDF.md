# 📄 Guide d'Utilisation - Rapports PDF Imprimables

## 🎯 Vue d'ensemble

Système complet de rapports PDF pour tous les modules, identique au fonctionnement des factures.

## ✅ Modules Implémentés

### 1. **Suppliers** (Fournisseurs) ✅
- **Bouton**: Icône PDF verte sur page détail
- **URL Backend**: `GET /api/v1/suppliers/{id}/pdf-report/`
- **Contenu**: Stats, commandes, top produits, historique

### 2. **Clients** ✅
- **Bouton**: Icône PDF verte sur page détail  
- **URL Backend**: `GET /api/v1/clients/{id}/pdf-report/`
- **Contenu**: Stats, factures, analyse relation

### 3. **Products** (Produits) ✅
- **Bouton**: Icône PDF verte sur page détail
- **URL Backend**: `GET /api/v1/products/{id}/pdf-report/`
- **Contenu**: Stats ventes/achats, fournisseurs, transactions

### 4. **Invoices** (Factures groupées) ✅ Backend | ⏳ Frontend
- **URL Backend**: `POST /api/v1/invoices/bulk-pdf-report/`
- **Filtres**: IDs, période, statut, client
- **À faire**: Ajouter bouton sur page index

### 5. **Purchase Orders** (Bons de commande groupés) ✅ Backend | ⏳ Frontend
- **URL Backend**: `POST /api/v1/purchase-orders/bulk-pdf-report/`
- **Filtres**: IDs, période, statut, fournisseur
- **À faire**: Ajouter bouton sur page index

## 🔧 Comment ça fonctionne

### Pattern Identique aux Factures

```javascript
// 1. Fetch avec Authorization Token
const token = localStorage.getItem('authToken');
const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const response = await fetch(`${baseUrl}/suppliers/${id}/pdf-report/`, {
  method: 'GET',
  headers: {
    'Authorization': `Token ${token}`,
  },
});

// 2. Créer blob et télécharger
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = `rapport-${Date.now()}.pdf`;
link.click();
```

### Service Unifié

`frontend/src/services/pdfReportService.js` - Utilise le même pattern que `pdfService.js`

## 🎨 Interface Utilisateur

### Pages de Détail (Clients, Suppliers, Products)

**Bouton IconButton**:
- Couleur: Vert (success)
- Icône: `PictureAsPdf`
- Placement: Avant Edit/Delete
- Loading: CircularProgress pendant génération
- Messages: Toast success/error

**Code exemple** (ClientDetail.jsx):
```jsx
<Tooltip title="Télécharger le rapport PDF">
  <IconButton
    onClick={handleDownloadPdfReport}
    disabled={downloadingPdf}
    sx={{
      color: 'success.main',
      '&:hover': {
        bgcolor: 'success.light',
        color: 'white',
      }
    }}
  >
    {downloadingPdf ? <CircularProgress size={24} /> : <PictureAsPdf />}
  </IconButton>
</Tooltip>
```

### Pages Index (Invoices, PurchaseOrders)  

**À implémenter**:

1. **Bouton dans le header**:
```jsx
<Button
  variant="outlined"
  color="success"
  startIcon={<PictureAsPdf />}
  onClick={() => setReportDialogOpen(true)}
>
  Générer Rapport PDF
</Button>
```

2. **Dialogue de sélection**:
```jsx
<ReportGenerationDialog
  open={reportDialogOpen}
  onClose={() => setReportDialogOpen(false)}
  onGenerate={handleGenerateReport}
  items={invoices.map(inv => ({
    id: inv.id,
    label: inv.invoice_number,
    sublabel: `${inv.client_name} - ${formatCurrency(inv.total_amount)}`
  }))}
  title="Générer un Rapport de Factures"
  itemLabel="facture"
  itemsLabel="factures"
  showDateFilter={true}
  showItemSelection={true}
/>
```

3. **Handler de génération**:
```jsx
const handleGenerateReport = async (filters) => {
  try {
    await pdfReportService.downloadInvoicesBulkReport({
      itemIds: filters.itemIds,
      dateStart: filters.dateStart,
      dateEnd: filters.dateEnd,
    });
    enqueueSnackbar('Rapport généré avec succès', { variant: 'success' });
  } catch (error) {
    enqueueSnackbar('Erreur lors de la génération', { variant: 'error' });
  }
};
```

## 🐛 Résolution de l'Erreur 500

### Diagnostic

L'erreur `500 Internal Server Error` sur `/api/v1/products/{id}/pdf-report/` peut venir de:

1. **WeasyPrint non installé ou mal configuré**
2. **GTK3 manquant sur Windows**
3. **Données manquantes (relations NULL)**
4. **Template introuvable**

### Solutions

#### 1. Vérifier WeasyPrint

```bash
python manage.py shell
>>> from apps.api.services.report_generator_weasy import report_generator
>>> print(report_generator.weasyprint_available)
True  # Doit être True
```

Si False:
```bash
pip install weasyprint
pip install qrcode[pil]
```

#### 2. Windows: Installer GTK3

Voir `INSTALL_GTK3_WINDOWS.md`

#### 3. Vérifier les logs Django

```bash
# Dans la console serveur Django
# L'erreur exacte sera affichée
```

#### 4. Tester manuellement

```python
python manage.py shell

from apps.invoicing.models import Product
from apps.api.services.report_generator_weasy import generate_product_report_pdf

product = Product.objects.first()
print(f"Testing with product: {product.name}")

try:
    pdf = generate_product_report_pdf(product)
    print("✅ Success!")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
```

## 📦 Fichiers Importants

### Backend

**Service principal**:
- `apps/api/services/report_generator_weasy.py` - Générateur PDF

**Endpoints API**:
- `apps/api/views.py` - SupplierViewSet, ClientViewSet, ProductViewSet
- Méthode: `@action(detail=True, methods=['get'], url_path='pdf-report')`

**Templates HTML**:
- `templates/reports/pdf/base_report.html` - Template de base
- `templates/reports/pdf/supplier_report.html`
- `templates/reports/pdf/client_report.html`  
- `templates/reports/pdf/product_report.html`
- `templates/reports/pdf/invoices_report.html`
- `templates/reports/pdf/purchase_orders_report.html`

### Frontend

**Services**:
- `frontend/src/services/pdfReportService.js` - Service unifié
- Pattern identique à `pdfService.js`

**Composants**:
- `frontend/src/components/common/ReportGenerationDialog.jsx` - Dialogue sélection

**Pages modifiées**:
- `frontend/src/pages/clients/ClientDetail.jsx` ✅
- `frontend/src/pages/suppliers/SupplierDetail.jsx` ✅
- `frontend/src/pages/products/ProductDetail.jsx` ✅
- `frontend/src/pages/invoices/Invoices.jsx` ⏳ (à compléter)
- `frontend/src/pages/purchase-orders/PurchaseOrders.jsx` ⏳ (à compléter)

## 🚀 Prochaines Étapes

### 1. Ajouter boutons sur pages index

**Invoices.jsx**:
```jsx
// Dans le header après les filtres
<Button
  variant="outlined"
  color="success"
  startIcon={<PictureAsPdf />}
  onClick={() => setReportDialogOpen(true)}
  sx={{ ml: 1 }}
>
  Rapport PDF
</Button>

// Ajouter le dialogue
<ReportGenerationDialog
  open={reportDialogOpen}
  onClose={() => setReportDialogOpen(false)}
  onGenerate={handleGenerateInvoicesReport}
  items={filteredInvoices.map(inv => ({
    id: inv.id,
    label: inv.invoice_number,
    sublabel: `${inv.client_name} - ${formatCurrency(inv.total_amount)}`
  }))}
  title="Générer un Rapport de Factures"
  itemLabel="facture"
  itemsLabel="factures"
/>
```

**PurchaseOrders.jsx**: Même pattern

### 2. Tester tous les rapports

```bash
# Tester chaque endpoint
curl -H "Authorization: Token YOUR_TOKEN" \
  http://localhost:8000/api/v1/suppliers/ID/pdf-report/ \
  -o test-supplier.pdf

curl -H "Authorization: Token YOUR_TOKEN" \
  http://localhost:8000/api/v1/clients/ID/pdf-report/ \
  -o test-client.pdf

curl -H "Authorization: Token YOUR_TOKEN" \
  http://localhost:8000/api/v1/products/ID/pdf-report/ \
  -o test-product.pdf
```

### 3. Vérifier les données

S'assurer que:
- Tous les produits ont un SKU ou reference
- Les relations (supplier, client, product) existent
- Les attributs optionnels ont des valeurs par défaut

## 📚 Documentation Complète

Voir `IMPLEMENTATION_RAPPORTS_PDF_COMPLETE.md` pour:
- Architecture détaillée
- Tous les endpoints
- Exemples de code
- Guide de déploiement

## ⚡ Quick Start

### Test Rapide

1. **Backend**: Assurez-vous que Django tourne sur `localhost:8000`

2. **Frontend**: Lancez React sur `localhost:5173` ou `localhost:3000`

3. **Test simple**:
   - Allez sur un client → Cliquez bouton PDF vert
   - Allez sur un fournisseur → Cliquez bouton PDF vert
   - Allez sur un produit → Cliquez bouton PDF vert

4. **Si erreur 500**:
   - Vérifiez les logs Django
   - Installez WeasyPrint: `pip install weasyprint`
   - Windows: Installez GTK3

## 💡 Tips

1. **Les boutons ressemblent aux boutons de factures** - Design cohérent
2. **Même pattern de code** - Facile à maintenir
3. **Gestion d'erreurs robuste** - Try/catch partout
4. **Messages utilisateur clairs** - Toast notifications
5. **Loading states** - UX fluide

---

**Statut**: ✅ Fonctionnel (sauf pages index à compléter)
**Version**: 2.0.0
**Date**: Décembre 2025

