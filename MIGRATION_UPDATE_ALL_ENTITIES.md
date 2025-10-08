# Mise à jour du Module d'Import - Support Complet

## Résumé des changements
Le module d'import de données supporte maintenant **TOUS les types d'entités** :
- ✅ Fournisseurs (Suppliers)
- ✅ Produits (Products)
- ✅ **Clients (Clients)** - NOUVEAU
- ✅ **Bons de commande (Purchase Orders)** - NOUVEAU
- ✅ **Factures (Invoices)** - NOUVEAU

## Modifications Backend

### 1. Fichier: `apps/data_migration/importers.py`

**Imports ajoutés:**
```python
from apps.accounts.models import Client
from apps.purchase_orders.models import PurchaseOrder, PurchaseOrderItem
from apps.invoicing.models import Invoice, InvoiceItem
```

**Champs disponibles pour mapping:**

#### Clients
- name, email, phone, address, contact_person, tax_id

#### Bons de commande
- po_number, supplier, order_date, delivery_date
- status, priority, notes, shipping_address

#### Factures
- invoice_number, supplier, client, invoice_date
- due_date, status, notes, payment_terms

**Fonctions d'import ajoutées:**

1. `import_clients(df: pd.DataFrame)` - Ligne 216
   - Détection doublons par email
   - Gestion update/skip
   - Logging détaillé

2. `import_purchase_orders(df: pd.DataFrame)` - Ligne 268
   - Résolution relation fournisseur par nom
   - Détection doublons par po_number
   - Validation fournisseur requis

3. `import_invoices(df: pd.DataFrame)` - Ligne 320
   - Résolution relations fournisseur et client
   - Détection doublons par invoice_number
   - Support fournisseur optionnel

**Logique run_import() mise à jour:**
```python
elif self.job.entity_type == 'clients':
    self.import_clients(df)
elif self.job.entity_type == 'purchase_orders':
    self.import_purchase_orders(df)
elif self.job.entity_type == 'invoices':
    self.import_invoices(df)
```

## Modifications Frontend

### 1. Fichier: `frontend/src/pages/migration/MigrationWizard.jsx`

**Fonction helper ajoutée:**
```javascript
const getEntityTypeLabel = (type) => {
  const labels = {
    suppliers: 'Fournisseurs',
    products: 'Produits',
    clients: 'Clients',
    purchase_orders: 'Bons de commande',
    invoices: 'Factures',
  };
  return labels[type] || type;
};
```

**Select Type d'entité (ligne 190-194):**
```jsx
<MenuItem value="suppliers">Fournisseurs</MenuItem>
<MenuItem value="products">Produits</MenuItem>
<MenuItem value="clients">Clients</MenuItem>
<MenuItem value="purchase_orders">Bons de commande</MenuItem>
<MenuItem value="invoices">Factures</MenuItem>
```

**Résumé Step 3 (ligne 405):**
```jsx
• Type: {getEntityTypeLabel(formData.entity_type)}
```

### 2. Fichier: `frontend/src/pages/migration/MigrationJobs.jsx`

**Fonction getEntityTypeLabel mise à jour (ligne 96-105):**
- Ajout purchase_orders et invoices

**Filtre Type d'entité (ligne 167-172):**
- Ajout options pour tous les types

## Fonctionnalités par type d'entité

### Clients
- **Détection doublons**: Par email
- **Champs obligatoires**: name, email
- **Relations**: Aucune
- **Use case**: Migration base clients depuis ancien système

### Bons de commande
- **Détection doublons**: Par po_number
- **Champs obligatoires**: po_number, supplier
- **Relations**:
  - Fournisseur (résolu par nom)
  - Validation: Fournisseur doit exister
- **Use case**: Import historique commandes depuis Excel

### Factures
- **Détection doublons**: Par invoice_number
- **Champs obligatoires**: invoice_number
- **Relations**:
  - Fournisseur (optionnel, résolu par nom)
  - Client (optionnel, résolu par nom)
- **Use case**: Migration factures depuis comptabilité externe

## Gestion des relations

### Fournisseurs (pour PO et Factures)
```python
supplier_name = mapped_data.pop('supplier', None)
if supplier_name:
    supplier = Supplier.objects.filter(name=supplier_name).first()
    if supplier:
        mapped_data['supplier'] = supplier
```

### Clients (pour Factures)
```python
client_name = mapped_data.pop('client', None)
if client_name:
    client = Client.objects.filter(name=client_name).first()
    if client:
        mapped_data['client'] = client
```

## Ordre d'import recommandé

Pour une migration complète, suivre cet ordre:

1. **Fournisseurs** - Créer la base fournisseurs
2. **Clients** - Créer la base clients
3. **Produits** - Avec relations aux fournisseurs
4. **Bons de commande** - Avec relations aux fournisseurs
5. **Factures** - Avec relations fournisseurs et clients

## Exemples de fichiers Excel/CSV

### Clients.csv
```csv
name,email,phone,address,contact_person,tax_id
Acme Corp,contact@acme.com,514-555-0100,123 Main St,John Doe,TPS123456
Global Inc,info@global.com,514-555-0200,456 Oak Ave,Jane Smith,TPS789012
```

### BonsCommande.csv
```csv
po_number,supplier,order_date,delivery_date,status,notes
PO-2024-001,Fournisseur A,2024-01-15,2024-02-01,approved,Commande urgente
PO-2024-002,Fournisseur B,2024-01-20,2024-02-15,sent,Livraison standard
```

### Factures.csv
```csv
invoice_number,supplier,client,invoice_date,due_date,status
INV-2024-001,Fournisseur A,Acme Corp,2024-01-15,2024-02-15,paid
INV-2024-002,Fournisseur B,Global Inc,2024-01-20,2024-03-20,sent
```

## Tests effectués

### Backend
✅ Import Client activé (apps.accounts.models.Client)
✅ Import PurchaseOrder avec validation fournisseur
✅ Import Invoice avec relations optionnelles
✅ Serveur Django rechargé sans erreur

### Frontend
✅ Wizard: Tous les types disponibles
✅ MigrationJobs: Filtres et labels complets
✅ getEntityTypeLabel() pour affichage uniforme
✅ Vite dev server fonctionne (port 3001)

## URLs de test

- **Backend API**: http://localhost:8000/api/v1/migration/jobs/
- **Frontend Wizard**: http://localhost:3001/migration/wizard
- **Frontend Jobs**: http://localhost:3001/migration/jobs

## Prochaines améliorations possibles

1. **Items de ligne** (PO Items, Invoice Items)
   - Import des lignes de facture/commande
   - Relation avec produits

2. **Validation avancée**
   - Vérifier dates (due_date > invoice_date)
   - Valider formats (emails, numéros)
   - Contraintes métier

3. **Mapping intelligent**
   - Auto-détection champs par similarité
   - Templates sauvegardés
   - Suggestions basées sur historique

4. **Support multi-feuilles Excel**
   - Importer plusieurs onglets
   - Relations entre feuilles
   - Validation croisée

---

✅ **Module complet et opérationnel pour TOUS les types d'entités!**

L'utilisateur peut maintenant importer:
- Fournisseurs, Produits, Clients
- Bons de commande, Factures
- Avec gestion complète des doublons
- Mapping interactif des champs
- Suivi en temps réel
