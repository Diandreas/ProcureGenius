# Guide : Factures avec Plusieurs Éléments

## Vue d'ensemble

Votre système de facturation Django fonctionne maintenant exactement comme l'exemple Laravel que vous avez montré ! Les factures peuvent contenir plusieurs éléments avec des calculs automatiques des totaux.

## Architecture

```
Invoice (Facture)
├── InvoiceItem (Élément 1)
├── InvoiceItem (Élément 2)
├── InvoiceItem (Élément 3)
└── ... (autant d'éléments que nécessaire)
```

## Fonctionnalités Clés

### ✅ Calculs Automatiques
- Les totaux sont recalculés automatiquement lors de l'ajout/modification/suppression d'éléments
- Support des remises par élément
- Gestion des taxes par élément

### ✅ Méthodes Utilitaires
- `add_item()` : Ajouter un élément
- `remove_item()` : Supprimer un élément
- `clear_items()` : Vider tous les éléments
- `duplicate_items_from()` : Copier les éléments d'une autre facture
- `clone_with_items()` : Cloner une facture complète

### ✅ Validations
- Une facture doit avoir au moins un élément avant d'être envoyée
- Validation des montants négatifs
- Validation des dates d'échéance

### ✅ Administration Django Améliorée
- Gestion des éléments directement dans l'interface de la facture
- Affichage du nombre d'éléments
- Calculs automatiques dans l'admin

## Exemples d'Utilisation

### 1. Créer une facture avec plusieurs éléments (Méthode recommandée)

```python
from apps.invoicing.models import Invoice
from datetime import date, timedelta

# Définir les éléments
items_data = [
    {
        'service_code': 'WEB-DEV',
        'description': 'Développement site web',
        'quantity': 40,
        'unit_price': 75.00,
        'unit_of_measure': 'heure'
    },
    {
        'service_code': 'DESIGN',
        'description': 'Design UI/UX',
        'quantity': 20,
        'unit_price': 85.00,
        'unit_of_measure': 'heure'
    }
]

# Créer la facture avec tous ses éléments
invoice = Invoice.create_with_items(
    created_by=user,
    title='Facture développement site web',
    due_date=date.today() + timedelta(days=30),
    items_data=items_data,
    client=client,
    currency='CAD'
)
```

### 2. Ajouter des éléments à une facture existante

```python
# Ajouter un élément
invoice.add_item(
    service_code='MAINT',
    description='Maintenance mensuelle',
    quantity=1,
    unit_price=150.00,
    unit_of_measure='forfait'
)

# Les totaux sont recalculés automatiquement
print(f"Nouveau total : {invoice.total_amount}")
```

### 3. Cloner une facture (utile pour factures récurrentes)

```python
# Cloner avec des modifications
nouvelle_facture = invoice.clone_with_items(
    title=f"{invoice.title} - Mois suivant",
    due_date=date.today() + timedelta(days=45)
)
```

### 4. Gérer les éléments

```python
# Vérifier si la facture a des éléments
if invoice.has_items():
    print(f"Nombre d'éléments : {invoice.get_items_count()}")
    
# Obtenir la quantité totale
total_qty = invoice.get_total_quantity()

# Trouver des éléments par service
web_items = invoice.get_items_by_service('WEB-DEV')

# Supprimer un élément
invoice.remove_item(item_id)

# Vider tous les éléments
invoice.clear_items()
```

## Utilisation dans l'Admin Django

1. **Créer une nouvelle facture** :
   - Aller dans Admin > Invoicing > Invoices
   - Cliquer "Ajouter"
   - Remplir les informations de base
   - Ajouter des éléments dans la section "Invoice items" en bas
   - Sauvegarder → Les totaux sont calculés automatiquement

2. **Modifier une facture existante** :
   - Ouvrir la facture
   - Modifier/ajouter/supprimer des éléments
   - Sauvegarder → Recalcul automatique

## Similitudes avec Laravel

Votre système Django a maintenant toutes les fonctionnalités de l'exemple Laravel :

| Laravel (Bill/BillItem) | Django (Invoice/InvoiceItem) |
|-------------------------|------------------------------|
| `Bill::createForBarter()` | `Invoice.create_with_items()` |
| `$bill->products()` | `invoice.items.all()` |
| `$bill->calculateTotals()` | `invoice.recalculate_totals()` |
| `$bill->formatAmount()` | `invoice.format_amount()` |
| BillItem avec pivot | InvoiceItem avec relations directes |

## Avantages par rapport à Laravel

✅ **Signaux Django** : Recalcul automatique des totaux  
✅ **Admin interface** : Gestion graphique des éléments  
✅ **Validations intégrées** : Contraintes au niveau modèle  
✅ **Type safety** : Validation des types avec Django  
✅ **ORM puissant** : Requêtes optimisées automatiquement  

## Tests

Pour tester le système, exécutez :

```bash
python manage.py shell
exec(open('apps/invoicing/example_usage.py').read())
```

## Migration

Si vous avez des données existantes, les améliorations sont rétrocompatibles. Vos factures existantes continueront de fonctionner normalement.

---

🎉 **Votre système de facturation est maintenant aussi puissant que l'exemple Laravel, avec tous les avantages de Django !**
