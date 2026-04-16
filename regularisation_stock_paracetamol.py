"""
Script de régularisation du stock paracétamol/doliprane
========================================================
Actions :
  1. Supprime DOLIPRANE Paracétamol effervescent 1000mg (ID:401de032)
  2. Régularise les lots de Doliprane 1000mg - 8 comprimés (ID:37560069)
  3. Régularise les lots de Doliprane 300mg (ID:32c3c1b3)
  4. Régularise les lots de Doliprane 200mg (ID:bfe1c67b)
  5. Régularise les lots de Paracetamol/codéine 500mg (ID:fe3d18b9)  [= Paracodine]
  6. Crée le produit Paracétamol 500mg avec ses lots

Lancer avec :
  python manage.py shell < regularisation_stock_paracetamol.py
ou :
  python manage.py shell -c "exec(open('regularisation_stock_paracetamol.py').read())"
"""

import uuid
import random
import string
from datetime import date, datetime, timezone
from django.db import transaction
from apps.invoicing.models import Product, ProductBatch, ProductCategory, StockMovement

ORG_ID     = '4919f27b-c5b5-4526-b452-097e0b4ccbf5'
CAT_ID     = 'eda05b4c-935f-4914-836b-d12e79661ca7'   # Medicaments
NOW        = datetime.now(timezone.utc)

def gen_batch_num():
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"INV-20260416-{suffix}"

def make_batch(product, qty, expiry, batch_num=None):
    """Crée un lot disponible."""
    return ProductBatch(
        id=uuid.uuid4(),
        organization_id=ORG_ID,
        product=product,
        batch_number=batch_num or gen_batch_num(),
        quantity=qty,
        quantity_remaining=qty,
        expiry_date=expiry,
        status='available',
        received_at=NOW,
    )

def clear_batches(product):
    """Supprime tous les lots existants du produit."""
    deleted, _ = ProductBatch.objects.filter(product=product).delete()
    print(f"   → {deleted} lot(s) supprimé(s)")

def set_stock(product, qty):
    product.stock_quantity = qty
    product.save(update_fields=['stock_quantity'])

def log_adjustment(product, qty_before, qty_after):
    StockMovement.objects.create(
        id=uuid.uuid4(),
        product=product,
        movement_type='adjustment',
        quantity=qty_after - qty_before,
        quantity_before=qty_before,
        quantity_after=qty_after,
        notes='Régularisation inventaire physique 16/04/2026',
    )

# ─────────────────────────────────────────────────────────────────────────────
with transaction.atomic():

    # =========================================================================
    # 1. DÉSACTIVATION : DOLIPRANE effervescent 1000mg
    #    (suppression impossible car lié à des PrescriptionItems existants)
    # =========================================================================
    print("\n[1] Désactivation DOLIPRANE Paracétamol effervescent 1000mg ...")
    try:
        prod_eff = Product.objects.get(id='401de032-e271-49c3-94d1-6857fd205686')
        prod_eff.is_active = False
        prod_eff.stock_quantity = 0
        prod_eff.save(update_fields=['is_active', 'stock_quantity'])
        ProductBatch.objects.filter(product=prod_eff).update(quantity=0, quantity_remaining=0, status='depleted')
        print("   → Désactivé (lié à des ordonnances existantes, suppression impossible)")
    except Product.DoesNotExist:
        print("   → Déjà supprimé, ignoré")

    # =========================================================================
    # 2. DOLIPRANE 1000 mg - 8 comprimés  (ID:37560069)
    #    Inventaire physique :
    #      01 (12/2026), 01 (12/2027), 01 (03/2028), 04 (02/2028),
    #      08+02 (05/2028)=10, 01+14+02 (07/2028)+... voir ci-dessous
    #    Regroupement par date de péremption :
    #      12/2026 → 01
    #      12/2027 → 01
    #      03/2028 → 01
    #      02/2028 → 04
    #      05/2028 → 10  (08+02)
    #      07/2028 → 01
    #      08/2028 → 16  (14+02)
    #      10/2028 → 06
    # =========================================================================
    print("\n[2] Régularisation Doliprane 1000mg - 8 comprimés ...")
    prod_doli1000 = Product.objects.get(id='37560069-359f-4e27-89c9-3099016a006c')
    qty_before = prod_doli1000.stock_quantity
    clear_batches(prod_doli1000)

    lots_doli1000 = [
        (1,  date(2026, 12, 31)),
        (1,  date(2027, 12, 31)),
        (1,  date(2028,  3, 31)),
        (4,  date(2028,  2, 29)),
        (10, date(2028,  5, 31)),
        (1,  date(2028,  7, 31)),
        (16, date(2028,  8, 31)),
        (6,  date(2028, 10, 31)),
    ]
    total = sum(q for q, _ in lots_doli1000)
    batches = [make_batch(prod_doli1000, q, exp) for q, exp in lots_doli1000]
    ProductBatch.objects.bulk_create(batches)
    set_stock(prod_doli1000, total)
    log_adjustment(prod_doli1000, qty_before, total)
    print(f"   → {len(batches)} lots créés, stock = {total}")

    # =========================================================================
    # 3. DOLIPRANE 300 mg - 12 sachets  (ID:32c3c1b3)
    #    Inventaire physique :
    #      02 (09/2026), 01 (11/2026)
    # =========================================================================
    print("\n[3] Régularisation Doliprane 300mg ...")
    prod_doli300 = Product.objects.get(id='32c3c1b3-6e6a-4ea4-b28c-1a84fd4748b9')
    qty_before = prod_doli300.stock_quantity
    clear_batches(prod_doli300)

    lots_doli300 = [
        (2, date(2026,  9, 30)),
        (1, date(2026, 11, 30)),
    ]
    total = sum(q for q, _ in lots_doli300)
    batches = [make_batch(prod_doli300, q, exp) for q, exp in lots_doli300]
    ProductBatch.objects.bulk_create(batches)
    set_stock(prod_doli300, total)
    log_adjustment(prod_doli300, qty_before, total)
    print(f"   → {len(batches)} lots créés, stock = {total}")

    # =========================================================================
    # 4. DOLIPRANE 200 mg - 12 sachets  (ID:bfe1c67b)
    #    Inventaire physique :
    #      01 (05/2026)
    # =========================================================================
    print("\n[4] Régularisation Doliprane 200mg ...")
    prod_doli200 = Product.objects.get(id='bfe1c67b-8fc5-48b8-9db0-50ee4d2ff526')
    qty_before = prod_doli200.stock_quantity
    clear_batches(prod_doli200)

    lots_doli200 = [
        (1, date(2026, 5, 31)),
    ]
    total = sum(q for q, _ in lots_doli200)
    batches = [make_batch(prod_doli200, q, exp) for q, exp in lots_doli200]
    ProductBatch.objects.bulk_create(batches)
    set_stock(prod_doli200, total)
    log_adjustment(prod_doli200, qty_before, total)
    print(f"   → {len(batches)} lots créés, stock = {total}")

    # =========================================================================
    # 5. Paracetamol/codéine 500mg/30mg  (ID:fe3d18b9)  = Paracodine
    #    Inventaire physique :
    #      02 (01/2027), 01 (07/2027), 29 (01/2029)
    # =========================================================================
    print("\n[5] Régularisation Paracetamol/codéine (Paracodine) 500mg ...")
    prod_para_cod = Product.objects.get(id='fe3d18b9-2e5b-4302-9af8-ef24a2ae0533')
    qty_before = prod_para_cod.stock_quantity
    clear_batches(prod_para_cod)

    lots_para_cod = [
        (2,  date(2027,  1, 31)),
        (1,  date(2027,  7, 31)),
        (29, date(2029,  1, 31)),
    ]
    total = sum(q for q, _ in lots_para_cod)
    batches = [make_batch(prod_para_cod, q, exp) for q, exp in lots_para_cod]
    ProductBatch.objects.bulk_create(batches)
    set_stock(prod_para_cod, total)
    log_adjustment(prod_para_cod, qty_before, total)
    print(f"   → {len(batches)} lots créés, stock = {total}")

    # =========================================================================
    # 6. CRÉATION : Paracétamol 500 mg (nouveau produit)
    #    Inventaire physique :
    #      01 (08/2026), 02 (02/2027), 06 (03/2027)
    #    Regroupement par date :
    #      08/2026 → 01
    #      02/2027 → 02
    #      03/2027 → 06
    # =========================================================================
    print("\n[6] Création Paracétamol 500mg ...")
    prod_para500, created = Product.objects.get_or_create(
        name='Paracétamol 500 mg - comprimés',
        organization_id=ORG_ID,
        defaults=dict(
            id=uuid.uuid4(),
            category_id=CAT_ID,
            product_type='physical',
            source_type='purchased',
            base_unit='piece',
            sell_unit='piece',
            stock_quantity=0,
            price=0,
            cost_price=0,
            is_active=True,
        )
    )
    if created:
        print("   → Produit créé")
    else:
        print("   → Produit existant, mise à jour des lots")
        clear_batches(prod_para500)

    lots_para500 = [
        (1, date(2026,  8, 31)),
        (2, date(2027,  2, 28)),
        (6, date(2027,  3, 31)),
    ]
    total = sum(q for q, _ in lots_para500)
    batches = [make_batch(prod_para500, q, exp) for q, exp in lots_para500]
    ProductBatch.objects.bulk_create(batches)
    set_stock(prod_para500, total)
    log_adjustment(prod_para500, 0, total)
    print(f"   → {len(batches)} lots créés, stock = {total}")

    # =========================================================================
    # 7. PARACETAMOL VIATRIS 1000mg  (ID:3f75613f)  = Paracétamol 1g
    #    Inventaire physique regroupé par date :
    #      09/2026 → 02
    #      11/2026 → 01
    #      03/2027 → 27
    #      04/2027 → 02+07 = 09
    #      07/2027 → 01+03+01+07 = 12
    #      09/2027 → 04
    #      01/2028 → 06
    #      02/2028 → 09
    #      03/2028 → 03
    #    Total = 73
    # =========================================================================
    print("\n[7] Régularisation Paracétamol 1g (VIATRIS 1000mg) ...")
    prod_para1g = Product.objects.get(id='3f75613f-1aef-437a-b5cf-98895408c48f')
    qty_before = prod_para1g.stock_quantity
    clear_batches(prod_para1g)

    lots_para1g = [
        (2,  date(2026,  9, 30)),
        (1,  date(2026, 11, 30)),
        (27, date(2027,  3, 31)),
        (9,  date(2027,  4, 30)),
        (12, date(2027,  7, 31)),
        (4,  date(2027,  9, 30)),
        (6,  date(2028,  1, 31)),
        (9,  date(2028,  2, 29)),
        (3,  date(2028,  3, 31)),
    ]
    total = sum(q for q, _ in lots_para1g)
    batches = [make_batch(prod_para1g, q, exp) for q, exp in lots_para1g]
    ProductBatch.objects.bulk_create(batches)
    set_stock(prod_para1g, total)
    log_adjustment(prod_para1g, qty_before, total)
    print(f"   → {len(batches)} lots créés, stock = {total}")

# ─────────────────────────────────────────────────────────────────────────────
print("\n✓ Régularisation terminée avec succès.\n")
print("Récapitulatif final :")
for pid, nom in [
    ('37560069-359f-4e27-89c9-3099016a006c', 'Doliprane 1000mg'),
    ('32c3c1b3-6e6a-4ea4-b28c-1a84fd4748b9', 'Doliprane 300mg'),
    ('bfe1c67b-8fc5-48b8-9db0-50ee4d2ff526', 'Doliprane 200mg'),
    ('fe3d18b9-2e5b-4302-9af8-ef24a2ae0533', 'Paracodine 500mg'),
    ('3f75613f-1aef-437a-b5cf-98895408c48f', 'Paracétamol 1g (VIATRIS)'),
]:
    p = Product.objects.get(id=pid)
    lots = ProductBatch.objects.filter(product=p).order_by('expiry_date')
    print(f"\n  {nom} — stock: {p.stock_quantity}")
    for b in lots:
        print(f"    {b.quantity} unités → péremption {b.expiry_date}")

# Paracétamol 500mg (chercher par nom)
try:
    p = Product.objects.get(name='Paracétamol 500 mg - comprimés', organization_id=ORG_ID)
    lots = ProductBatch.objects.filter(product=p).order_by('expiry_date')
    print(f"\n  Paracétamol 500mg (NOUVEAU) — stock: {p.stock_quantity}")
    for b in lots:
        print(f"    {b.quantity} unités → péremption {b.expiry_date}")
except Product.DoesNotExist:
    pass
