"""
normalize_smart.py - Normalisation intelligente avec gestion des lots par péremption

L'Excel liste les lots individuellement (1 ligne = 1 lot avec date de péremption).
Ce script :
  1. Charge le fichier médicaments le plus récent
  2. Groupe les lignes par produit (fuzzy matching pour les noms légèrement différents)
  3. Mappe les produits DB vers les produits Excel (renomme, fusionne les doublons)
  4. Crée 1 ProductBatch par ligne Excel avec la VRAIE date de péremption et quantité
  5. Crée 1 StockMovement 'initial' par batch comme historique d'arrivage
  6. Déduit les ventes en FIFO (lot à péremption la plus proche en premier)
  7. Met à jour le stock total du produit

USAGE :
  python normalize_smart.py            → Exécute
  python normalize_smart.py --dry-run  → Aperçu sans aucune modification
"""

import os
import sys
import django
import glob
import openpyxl
import unicodedata
import difflib
import re
from datetime import date as date_type, timedelta
from django.db import transaction, models
from django.utils import timezone

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "saas_procurement.settings")
django.setup()

from apps.invoicing.models import Product, InvoiceItem, StockMovement, ProductBatch
from apps.purchase_orders.models import PurchaseOrderItem
from apps.suppliers.models import SupplierProduct
from apps.consultations.models import PrescriptionItem
try:
    from apps.pharmacy.models import DispensingItem
    HAS_DISPENSING = True
except ImportError:
    HAS_DISPENSING = False

DRY_RUN = "--dry-run" in sys.argv


# ── Normalisation des noms ─────────────────────────────────────────────────────

def norm(name):
    """Supprime accents, met en minuscule, garde alphanum + espaces."""
    nfkd = unicodedata.normalize('NFKD', str(name))
    no_acc = ''.join(c for c in nfkd if not unicodedata.combining(c))
    clean = re.sub(r'[^a-z0-9 ]', ' ', no_acc.lower())
    return ' '.join(clean.split())


def fuzzy_best_match(db_name, excel_names, threshold=0.72):
    """Retourne (meilleur_nom_excel, ratio) si ratio >= seuil, sinon (None, ratio)."""
    db_norm = norm(db_name)
    best_name = None
    best_ratio = 0.0
    for excel_name in excel_names:
        ratio = difflib.SequenceMatcher(None, db_norm, norm(excel_name)).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_name = excel_name
    if best_ratio >= threshold:
        return best_name, best_ratio
    return None, best_ratio


# ── Mappings manuels ───────────────────────────────────────────────────────────
# Clé = norm(nom_en_DB), Valeur = nom_exact_dans_Excel (accents compris)
# Pour les cas où fuzzy ratio < 72%

MANUAL_MAPPING = {
    # Doliprane effervescent → Doliprane 1000 mg comprimés (même molécule)
    norm("DOLIPRANE Paracétamol effervescent 1000mg"):
        "Doliprane 1000 mg - 8 comprimés",

    # Alginate : 3 noms de marque + 1 ancien générique → 1 nom générique Excel
    norm("ALGINATE DE SODIUM / BICARBONATE Arrow"):
        "Alginate de sodium (générique Gaviscon) 500mg/267 mg 24 - sachets de 10 ml",
    norm("ALGINATE DE SODIUM / BICARBONATE Cristers"):
        "Alginate de sodium (générique Gaviscon) 500mg/267 mg 24 - sachets de 10 ml",
    norm("ALGINATE DE SODIUM / BICARBONATE Viatris"):
        "Alginate de sodium (générique Gaviscon) 500mg/267 mg 24 - sachets de 10 ml",
    norm("Alginate de sodium (Gaviscon) 500mg/267mg - sachets de 10 ml"):
        "Alginate de sodium (générique Gaviscon) 500mg/267 mg 24 - sachets de 10 ml",

    # Diclofénac marque → générique Excel
    norm("DICLOFÉNAC SANDOZ 1% gel"):
        "Diclofénac Gel en flacon pressurisé",

    # Compresses génériques → pas d'équivalent exact, garder si référencé
    norm("COMPRESSES NON TISSÉES STÉRILES"):
        None,
}


# ── Gestion des FK protégées ───────────────────────────────────────────────────

def reassign_protected_refs(old_product, new_product, dry=False):
    """Réassigne PrescriptionItem.medication et DispensingItem.medication."""
    pi_qs = PrescriptionItem.objects.filter(medication=old_product)
    pi_count = pi_qs.count()
    if pi_count:
        if new_product:
            if not dry:
                pi_qs.update(medication=new_product)
            print(f"      → {pi_count} PrescriptionItem(s) réassigné(s) vers '{new_product.name}'")
        else:
            if not dry:
                for item in pi_qs:
                    if not item.medication_name:
                        item.medication_name = old_product.name
                    item.medication = None
                    item.is_external_medication = True
                    item.save(update_fields=['medication', 'medication_name', 'is_external_medication'])
            print(f"      → {pi_count} PrescriptionItem(s) dé-liés (nom texte conservé)")

    if HAS_DISPENSING:
        di_qs = DispensingItem.objects.filter(medication=old_product)
        di_count = di_qs.count()
        if di_count:
            if new_product:
                if not dry:
                    di_qs.update(medication=new_product)
                print(f"      → {di_count} DispensingItem(s) réassigné(s)")
            else:
                if not dry:
                    di_qs.update(medication=None)
                print(f"      → {di_count} DispensingItem(s) dé-liés")


def merge_into_master(dup, master, dry=False):
    """Transfère toutes les FK de 'dup' vers 'master', puis supprime 'dup'."""
    if not dry:
        InvoiceItem.objects.filter(product=dup).update(product=master)
        StockMovement.objects.filter(product=dup).update(product=master)
        ProductBatch.objects.filter(product=dup).update(product=master)
        PurchaseOrderItem.objects.filter(product=dup).update(product=master)
        SupplierProduct.objects.filter(product=dup).update(product=master)
        reassign_protected_refs(dup, master, dry=False)
        dup.delete()
    else:
        reassign_protected_refs(dup, master, dry=True)


def safe_delete(product, replacement=None, dry=False):
    """Réassigne les refs protégées, puis supprime."""
    reassign_protected_refs(product, replacement, dry=dry)
    if not dry:
        try:
            product.delete()
            return True
        except Exception as e:
            print(f"      ERREUR suppression '{product.name}': {e}")
            return False
    return True


# ── Script principal ───────────────────────────────────────────────────────────

def normalize_smart():
    tag = "[DRY-RUN] " if DRY_RUN else ""
    print("=" * 70)
    print(f"{tag}NORMALISATION INTELLIGENTE - Lots par péremption")
    print("=" * 70)
    if DRY_RUN:
        print("MODE APERÇU - Aucune modification ne sera appliquée.\n")

    def run():
        today = timezone.now().date()

        # ── ÉTAPE 1 : Chargement Excel ─────────────────────────────────────
        all_xlsx = glob.glob("Liste des*.xlsx")
        med_files = [f for f in all_xlsx if "soins" not in f.lower()]
        if not med_files:
            med_files = all_xlsx
        if not med_files:
            print("ERREUR : Aucun fichier Excel trouvé.")
            return

        # Prendre le plus récent (date de modification)
        med_file = max(med_files, key=os.path.getmtime)
        print(f"Fichier chargé : {med_file}\n")

        wb = openpyxl.load_workbook(med_file, data_only=True)
        sheet = wb.active

        # excel_batches : canonical_name → liste de lots
        # chaque lot = {'qty': int, 'expiry': date|None, 'price': Decimal, 'unit': str}
        excel_batches = {}

        for i, row in enumerate(sheet.iter_rows(values_only=True)):
            if i == 0:
                continue  # en-tête
            name = row[0]
            if not name or not str(name).strip():
                continue

            original_name = str(name).strip()
            qty = int(row[1]) if row[1] is not None else 0
            unit = str(row[2]).strip() if row[2] else ""
            price = row[3] if row[3] is not None else 0
            expiry_raw = row[4] if row[4] else None

            # Normaliser la date de péremption
            expiry = None
            if expiry_raw:
                if hasattr(expiry_raw, 'date'):
                    expiry = expiry_raw.date()
                elif isinstance(expiry_raw, date_type):
                    expiry = expiry_raw
                else:
                    try:
                        from datetime import datetime
                        expiry = datetime.strptime(str(expiry_raw), "%Y-%m-%d").date()
                    except Exception:
                        expiry = None

            excel_batches.setdefault(original_name, []).append({
                'qty': qty,
                'expiry': expiry,
                'price': price,
                'unit': unit,
            })

        excel_canonical_names = list(excel_batches.keys())
        total_products = len(excel_canonical_names)
        total_lots = sum(len(v) for v in excel_batches.values())
        print(f"Excel : {total_products} produits uniques, {total_lots} lots au total\n")

        # ── ÉTAPE 2 : Matching produits DB → Excel ─────────────────────────
        print("─" * 70)
        print("PHASE 1 : Mapping produits DB → Excel")
        print("─" * 70)

        db_products = list(Product.objects.filter(product_type='physical').order_by('name'))
        mapping = {}  # product.pk → excel canonical name ou None

        for p in db_products:
            p_norm = norm(p.name)
            if p_norm in MANUAL_MAPPING:
                target = MANUAL_MAPPING[p_norm]
                mapping[p.pk] = target
                if target:
                    print(f"  [MANUEL]        '{p.name}'  ➜  '{target}'")
                else:
                    print(f"  [MANUEL/VIDE]   '{p.name}'  → pas d'équivalent Excel")
            else:
                matched, ratio = fuzzy_best_match(p.name, excel_canonical_names, threshold=0.72)
                mapping[p.pk] = matched
                if matched:
                    if norm(matched) == p_norm:
                        print(f"  [EXACT]         '{p.name}'")
                    else:
                        print(f"  [FUZZY {ratio:.0%}]     '{p.name}'  ➜  '{matched}'")
                else:
                    print(f"  [PAS DE MATCH {ratio:.0%}]  '{p.name}'")

        # ── ÉTAPE 3 : Fusion des doublons DB ──────────────────────────────
        print("\n" + "─" * 70)
        print("PHASE 2 : Fusion des doublons (plusieurs DB → 1 produit Excel)")
        print("─" * 70)

        excel_to_db = {}
        no_match_products = []

        for p in db_products:
            target = mapping.get(p.pk)
            if target:
                excel_to_db.setdefault(target, []).append(p)
            else:
                no_match_products.append(p)

        for excel_name, products in sorted(excel_to_db.items()):
            if len(products) == 1:
                p = products[0]
                if p.name != excel_name:
                    print(f"  [RENOMMER]  '{p.name}'  ➜  '{excel_name}'")
                    if not DRY_RUN:
                        p.name = excel_name
                        p.save(update_fields=['name'])
                continue

            print(f"\n  [FUSION x{len(products)}]  ➜  '{excel_name}'")
            products_sorted = sorted(products, key=lambda x: x.created_at)
            master = products_sorted[0]
            print(f"    Maître : '{master.name}'")
            for dup in products_sorted[1:]:
                print(f"    Absorber : '{dup.name}'")
                merge_into_master(dup, master, dry=DRY_RUN)
                if not DRY_RUN:
                    print(f"      ✓ Supprimé")
            if master.name != excel_name:
                print(f"    Renommer maître → '{excel_name}'")
                if not DRY_RUN:
                    master.name = excel_name
                    master.save(update_fields=['name'])

        # ── ÉTAPE 4 : Produits absents de l'Excel ─────────────────────────
        print("\n" + "─" * 70)
        print("PHASE 3 : Produits ABSENTS de l'Excel")
        print("─" * 70)

        deleted_count = 0
        kept_count = 0

        for p in no_match_products:
            has_pi  = PrescriptionItem.objects.filter(medication=p).exists()
            has_di  = HAS_DISPENSING and DispensingItem.objects.filter(medication=p).exists()
            has_inv = InvoiceItem.objects.filter(product=p).exists()
            refs = (["PrescriptionItem"] if has_pi else []) + \
                   (["DispensingItem"]   if has_di else []) + \
                   (["InvoiceItem"]      if has_inv else [])

            if refs:
                print(f"  [GARDER]    '{p.name}'  — {', '.join(refs)}")
                kept_count += 1
            else:
                print(f"  [SUPPRIMER] '{p.name}'")
                if safe_delete(p, dry=DRY_RUN):
                    deleted_count += 1

        print(f"\n  Supprimés : {deleted_count} | Gardés (références) : {kept_count}")

        # ── ÉTAPE 5 : Création des lots + déduction FIFO ───────────────────
        print("\n" + "─" * 70)
        print("PHASE 4 : Lots par péremption + déduction ventes FIFO")
        print("─" * 70)

        for p in Product.objects.filter(product_type='physical').order_by('name'):
            # Chercher les données Excel (exact d'abord, puis norm)
            lots_excel = excel_batches.get(p.name)
            if not lots_excel:
                for exc_name, exc_lots in excel_batches.items():
                    if norm(p.name) == norm(exc_name):
                        lots_excel = exc_lots
                        break

            if not lots_excel:
                print(f"\n  [SKIP]  '{p.name}' — pas de données Excel")
                continue

            # Total vendu via le système
            total_sold = InvoiceItem.objects.filter(
                product=p,
                invoice__status__in=['paid', 'sent', 'overdue']
            ).aggregate(models.Sum('quantity'))['quantity__sum'] or 0

            if 'thermometre' in norm(p.name):
                total_sold = 11

            # Trier lots par date de péremption (FIFO : on déduit les plus proches d'abord)
            sorted_lots = sorted(
                lots_excel,
                key=lambda b: b['expiry'] if b['expiry'] else date_type(9999, 12, 31)
            )
            total_initial = sum(lot['qty'] for lot in sorted_lots)
            correct_stock = max(0, total_initial - total_sold)

            print(f"\n  '{p.name}'")
            print(f"    {len(sorted_lots)} lot(s) | Initial: {total_initial} | Vendu: {total_sold} | Final: {correct_stock}")

            if not DRY_RUN:
                # Supprimer anciens batches et mouvements initiaux/ventes
                p.batches.all().delete()
                StockMovement.objects.filter(
                    product=p,
                    movement_type__in=['initial', 'sale']
                ).delete()

            remaining_to_deduct = total_sold
            running_stock = 0

            for j, lot in enumerate(sorted_lots):
                initial_qty = lot['qty']
                deduct = min(initial_qty, remaining_to_deduct)
                qty_remaining = initial_qty - deduct
                remaining_to_deduct -= deduct

                if lot['expiry'] and lot['expiry'] < today:
                    status = 'expired'
                elif qty_remaining == 0:
                    status = 'depleted'
                else:
                    status = 'available'

                exp_str = lot['expiry'].strftime('%m/%Y') if lot['expiry'] else '?'
                print(f"    LOT {j+1:02d} | Péremption: {exp_str:<7} | Reçu: {initial_qty:<4} | "
                      f"Déduit: {deduct:<4} | Reste: {qty_remaining:<4} | {status}")

                if not DRY_RUN:
                    expiry_date = lot['expiry'] if lot['expiry'] else today + timedelta(days=365)
                    batch_number = f"INIT-{today.strftime('%Y%m')}-{j+1:02d}"

                    batch = ProductBatch.objects.create(
                        organization=p.organization,
                        product=p,
                        batch_number=batch_number,
                        quantity=initial_qty,
                        quantity_remaining=qty_remaining,
                        expiry_date=expiry_date,
                        status=status,
                        notes=f"Arrivage initial {today} — lot {j+1}/{len(sorted_lots)}",
                    )

                    # Mouvement d'arrivage initial
                    StockMovement.objects.create(
                        product=p,
                        batch=batch,
                        movement_type='initial',
                        quantity=initial_qty,
                        quantity_before=running_stock,
                        quantity_after=running_stock + initial_qty,
                        reference_type='manual',
                        reference_number=f"INIT-SYNC-{today}",
                        notes=f"Arrivage initial — péremption {exp_str}",
                    )

                running_stock += initial_qty

            # Mettre à jour le prix depuis l'Excel (premier lot)
            if sorted_lots and sorted_lots[0].get('price'):
                new_price = sorted_lots[0]['price']
            else:
                new_price = None

            if not DRY_RUN:
                p.stock_quantity = correct_stock
                if new_price:
                    p.price = new_price
                p.save(update_fields=['stock_quantity', 'price'])

    # Wrapper transaction
    if DRY_RUN:
        with transaction.atomic():
            sid = transaction.savepoint()
            run()
            transaction.savepoint_rollback(sid)
        print("\n" + "─" * 70)
        print("[DRY-RUN] Aucun changement appliqué. Relancer sans --dry-run pour exécuter.")
    else:
        with transaction.atomic():
            run()
        print("\n" + "=" * 70)
        print("NORMALISATION TERMINÉE — Base de données synchronisée avec l'Excel")
        print("=" * 70)


if __name__ == "__main__":
    normalize_smart()
