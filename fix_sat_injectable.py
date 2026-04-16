"""
Script : Réassociation facture SAT injectable + suppression doublon
===================================================================
- Réassocie FAC202603-4919F27B-0057 vers le bon produit SAT (stock=10)
- Supprime le produit doublon SAT (stock=0, 19 en lots)

Lancer avec :
  python manage.py shell -c "exec(open('fix_sat_injectable.py').read())"
"""

from django.db import transaction
from apps.invoicing.models import Product, ProductBatch, InvoiceItem

# IDs
ID_SAT_DOUBLON  = '3a76a998-f8eb-470e-80dd-13712d99390c'  # stock=0, à supprimer
ID_SAT_BON      = '6c203ed4-c677-4967-a166-c46c2fec17db'  # stock=10, le bon
ID_LOT_BON      = '6b02ec84-8e44-435f-aacf-2a3ea847c354'  # lot 10 unités du bon
ID_ITEM_FAC     = 'e2aa6371-5df6-4976-891f-44d669e49027'  # item de la facture

with transaction.atomic():

    # 1. Réassocier l'item de facture vers le bon produit/lot
    print("[1] Réassociation de la facture FAC202603-4919F27B-0057 ...")
    item = InvoiceItem.objects.get(id=ID_ITEM_FAC)
    prod_bon = Product.objects.get(id=ID_SAT_BON)
    lot_bon  = ProductBatch.objects.get(id=ID_LOT_BON)

    item.product = prod_bon
    item.batch   = lot_bon
    item.save(update_fields=['product', 'batch'])
    print(f"   → Item réassocié vers '{prod_bon.name}' lot {lot_bon.batch_number}")

    # 2. Supprimer les lots du doublon puis le produit
    print("\n[2] Suppression du produit doublon SAT injectable (stock=0) ...")
    prod_doublon = Product.objects.get(id=ID_SAT_DOUBLON)
    lots_deleted, _ = ProductBatch.objects.filter(product=prod_doublon).delete()
    print(f"   → {lots_deleted} lot(s) supprimé(s)")
    prod_doublon.delete()
    print("   → Produit doublon supprimé")

print("\n✓ Terminé.")
print(f"\nVérification :")
prod_bon.refresh_from_db()
lot_bon.refresh_from_db()
print(f"  SAT injectable stock : {prod_bon.stock_quantity}")
print(f"  Lot {lot_bon.batch_number} qty : {lot_bon.quantity} | status : {lot_bon.status}")
item.refresh_from_db()
print(f"  Facture item produit : {item.product.name} | lot : {item.batch.batch_number}")
