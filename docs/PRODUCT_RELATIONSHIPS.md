# Documentation des Relations Product

## Vue d'ensemble

Le modèle `Product` (dans `apps/invoicing/models.py`) est au centre de plusieurs relations inter-modules dans ProcureGenius.

## Schéma des Relations

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRODUCT                                  │
│                  (apps/invoicing/models.py)                     │
│                                                                  │
│  Champs:                                                        │
│  - id, name, reference, description, barcode                    │
│  - product_type, source_type                                     │
│  - price, cost_price                                            │
│  - stock_quantity, low_stock_threshold                          │
│  - is_active                                                    │
└─────────────────────────────────────────────────────────────────┘
         ↑                ↑              ↑              ↑
         │                │              │              │
    ┌────┴────┐     ┌────┴────┐   ┌────┴────┐    ┌───┴────┐
    │Warehouse│     │Category │   │Supplier │    │Organization│
    │ (FK)    │     │  (FK)   │   │  (FK)   │    │    (FK)    │
    └─────────┘     └─────────┘   └─────────┘    └────────────┘

         ↓                ↓              ↓              ↓
    ┌────┴─────┐    ┌────┴──────┐  ┌───┴────┐    ┌───┴─────┐
    │Invoice   │    │Purchase   │  │Bid     │    │Contract │
    │Item (FK) │    │OrderItem  │  │Item    │    │Item (FK)│
    │          │    │    (FK)   │  │  (FK)  │    │         │
    └──────────┘    └───────────┘  └────────┘    └─────────┘
```

## Relations Détaillées

### 1. Product → Organization (ForeignKey)
**Relation**: Many-to-One  
**Champ**: `organization` (null=True, blank=True)  
**Related name**: `products`

Chaque produit appartient à une organisation spécifique.

### 2. Product → Warehouse (ForeignKey)
**Relation**: Many-to-One  
**Champ**: `warehouse` (null=True, blank=True)  
**Related name**: `products`  
**Ajouté**: Migration 0011

L'entrepôt principal où le produit est stocké.

```python
# Accéder aux produits d'un entrepôt
warehouse = Warehouse.objects.get(code='MTL')
products = warehouse.products.all()

# Accéder à l'entrepôt d'un produit
product = Product.objects.get(reference='PRD0001')
warehouse_location = f"{product.warehouse.city}, {product.warehouse.province}"
```

### 3. Product → ProductCategory (ForeignKey)
**Relation**: Many-to-One  
**Champ**: `category` (null=True, blank=True)  
**Related name**: `products`

Classification hiérarchique des produits.

### 4. Product → Supplier (ForeignKey)
**Relation**: Many-to-One  
**Champ**: `supplier` (null=True, blank=True)  
**Related name**: `products`

Fournisseur principal du produit.

### 5. InvoiceItem → Product (ForeignKey)
**Relation**: Many-to-One  
**Champ**: `product` (null=True, blank=True)  
**Related name**: `invoice_items`  
**Ajouté**: Migration 0011

Lie les lignes de facture aux produits du catalogue.

```python
# Statistiques de vente
product = Product.objects.get(reference='PRD0001')
total_invoices = product.invoice_items.values('invoice').distinct().count()
total_sales = product.invoice_items.aggregate(Sum('total_price'))['total_price__sum']
unique_clients = product.invoice_items.values('invoice__client').distinct().count()

# Factures récentes
recent_invoices = product.invoice_items.select_related('invoice').order_by('-created_at')[:10]
```

**Synchronisation automatique**: Si `product` est défini dans InvoiceItem, `product_reference` est automatiquement synchronisé lors du save().

### 6. PurchaseOrderItem → Product (ForeignKey)
**Relation**: Many-to-One  
**Champ**: `product` (null=True, blank=True)  
**Related name**: `purchase_order_items`  
**Ajouté**: Migration 0004 (purchase_orders)

Lie les lignes de bon de commande aux produits.

```python
# Statistiques d'achat
product = Product.objects.get(reference='PRD0001')
total_pos = product.purchase_order_items.values('purchase_order').distinct().count()
total_purchased = product.purchase_order_items.aggregate(Sum('quantity'))['quantity__sum']
avg_price = product.purchase_order_items.aggregate(Avg('unit_price'))['unit_price__avg']
```

**Synchronisation automatique**: Si `product` est défini, `product_reference`, `description` et `unit_price` sont synchronisés.

### 7. BidItem → Product (ForeignKey)
**Relation**: Many-to-One  
**Champ**: `product` (null=True, blank=True)  
**Related name**: `bid_items`  
**Ajouté**: Migration 0004 (e_sourcing)

Lie les soumissions RFQ aux produits du catalogue.

```python
# Statistiques e-sourcing
product = Product.objects.get(reference='PRD0001')
total_bids = product.bid_items.count()
awarded_bids = product.bid_items.filter(bid__status='awarded').count()
```

**Synchronisation automatique**: Si `product` est défini, `product_reference`, `description` et `unit_price` sont synchronisés.

### 8. ContractItem → Product (ForeignKey)
**Relation**: Many-to-One  
**Champ**: `product` (NOT NULL)  
**Related name**: `contract_items`  
**Ajouté**: Migration 0002 (contracts)

Nouveau modèle pour lier les contrats aux produits couverts.

```python
# Produits sous contrat
product = Product.objects.get(reference='PRD0001')
active_contracts = product.contract_items.filter(contract__status='active')
contracted_prices = active_contracts.values_list('contracted_price', flat=True)

# Vérifier si prix actuel respecte contrat
if active_contracts.exists():
    max_contracted = active_contracts.aggregate(Max('contracted_price'))['contracted_price__max']
    if product.price > max_contracted:
        print("⚠️ Prix catalogue supérieur au prix contractuel!")
```

### 9. StockMovement → Product (ForeignKey)
**Relation**: Many-to-One  
**Champ**: `product` (NOT NULL)  
**Related name**: `stock_movements`  
**Existant**: Déjà présent

Historique complet des mouvements de stock.

## API Endpoints

### GET /api/products/{id}/statistics/

Retourne des statistiques complètes inter-modules:

```json
{
  "product_id": "uuid",
  "product_name": "string",
  "sales_summary": {
    "total_invoices": 12,
    "total_quantity_sold": 150,
    "total_sales_amount": 12500.00,
    "unique_clients": 8
  },
  "purchase_summary": {
    "total_purchase_orders": 5,
    "total_quantity_purchased": 200,
    "average_purchase_price": 75.00
  },
  "contract_summary": {
    "active_contracts": 2,
    "contracted_price_min": 70.00,
    "contracted_price_max": 85.00
  },
  "sourcing_summary": {
    "total_bids": 3,
    "awarded_bids": 1
  },
  "warehouse_info": {
    "warehouse_name": "Entrepôt Montréal",
    "warehouse_code": "MTL",
    "location": "Montréal, Québec",
    "current_stock": 50,
    "stock_status": "good"
  },
  "top_clients": [...],
  "recent_invoices": [...],
  "sales_trend": {
    "last_30_days": 5000.00,
    "previous_30_days": 4500.00,
    "trend_percent": 11.11
  }
}
```

## Migration des Données

Pour lier les données existantes, utilisez:

```bash
python manage.py migrate_product_relationships
```

Ce script:
1. Lie tous les InvoiceItems aux Products via product_reference
2. Lie tous les PurchaseOrderItems aux Products
3. Lie tous les BidItems aux Products
4. Assigne un warehouse par défaut aux produits sans warehouse

## Bonnes Pratiques

### 1. Création d'un InvoiceItem avec Product

```python
invoice_item = InvoiceItem.objects.create(
    invoice=invoice,
    product=product,  # FK - Recommandé
    quantity=10,
    unit_price=product.price
)
# product_reference et description seront automatiquement remplis
```

### 2. Création d'un PurchaseOrderItem avec Product

```python
po_item = PurchaseOrderItem.objects.create(
    purchase_order=po,
    product=product,  # FK - Recommandé
    quantity=50,
    # unit_price sera automatiquement = product.cost_price ou product.price
)
```

### 3. Réception de stock

```python
# La méthode receive_items() utilise maintenant le FK directement
purchase_order.receive_items(user=request.user)
# Ajuste automatiquement product.stock_quantity via product.adjust_stock()
```

### 4. Vérification Prix Contrat

```python
# Vérifier si un produit a un prix contractuel
active_contract_items = product.contract_items.filter(
    contract__status='active',
    contract__end_date__gte=timezone.now().date()
)

if active_contract_items.exists():
    # Utiliser le prix contractuel
    price = active_contract_items.first().contracted_price
else:
    # Utiliser le prix catalogue
    price = product.price
```

## Modifications Apportées

### Backend
1. ✅ Ajout `Product.warehouse` (FK)
2. ✅ Ajout `InvoiceItem.product` (FK)
3. ✅ Ajout `PurchaseOrderItem.product` (FK)
4. ✅ Ajout `BidItem.product` (FK)
5. ✅ Création modèle `ContractItem`
6. ✅ Enrichissement `ProductSerializer` avec statistiques
7. ✅ Création endpoint `/api/products/{id}/statistics/`
8. ✅ Amélioration méthode `receive_items()` pour utiliser FK

### Frontend
1. ✅ Ajout `productsAPI.getStatistics()`
2. ✅ Composant `ProductStatisticsCard`
3. ✅ Composant `ProductInvoicesTable`
4. ✅ Composant `ProductClientsTable`
5. ✅ Amélioration `ProductDetail.jsx` avec tabs et statistiques
6. ✅ Amélioration `Products.jsx` avec filtre warehouse
7. ✅ Amélioration `ProductForm.jsx` avec sélection warehouse

## Tests

Exécuter le script de test:
```bash
python test_product_enhancements.py
```

Vérifier les migrations:
```bash
python manage.py showmigrations
```

## Support

Pour toute question, consulter le code ou contacter l'équipe de développement.

**Date de mise à jour**: 2025-10-12  
**Version**: 1.0

