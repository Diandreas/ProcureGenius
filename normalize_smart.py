"""
normalize_smart.py - Normalisation intelligente de la base de données par rapport à l'Excel

USAGE:
  python normalize_smart.py            → Execute la normalisation
  python normalize_smart.py --dry-run  → Aperçu uniquement (aucune modification)

CORRECTIONS vs final_normalize.py:
  - Charge UNIQUEMENT le fichier médicaments (ignore "soins médicaux")
  - Normalisation des accents (é→e, è→e, etc.) pour le matching
  - Fuzzy matching avec seuil 72% (difflib.SequenceMatcher)
  - Mappings manuels pour les cas ambigus connus
  - Réassigne PrescriptionItem.medication et DispensingItem.medication avant suppression
  - Produits avec références gardés en DB si aucun match Excel trouvé
  - Fix typo StockMovement.update(product=master)
"""

import os
import sys
import django
import glob
import openpyxl
import unicodedata
import difflib
import re
from django.db import transaction, models
from django.utils import timezone
from datetime import timedelta

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


# ── Normalisation ──────────────────────────────────────────────────────────────

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
# Clé = norm(nom_en_DB), Valeur = nom_exact_dans_Excel (ou None = pas de match)
# Ajouter ici les cas que le fuzzy ne détecte pas (ratio < 72%)

MANUAL_MAPPING = {
    # Doliprane effervescent → Doliprane 1000 mg comprimés (même molécule)
    norm("DOLIPRANE Paracétamol effervescent 1000mg"):
        "Doliprane 1000 mg - 8 comprimes",

    # Alginate: 3 marques + 1 ancien générique → 1 nouveau générique dans Excel
    norm("ALGINATE DE SODIUM / BICARBONATE Arrow"):
        "Alginate de sodium (generique Gaviscon) 500mg/267mg 24 sachets",
    norm("ALGINATE DE SODIUM / BICARBONATE Cristers"):
        "Alginate de sodium (generique Gaviscon) 500mg/267mg 24 sachets",
    norm("ALGINATE DE SODIUM / BICARBONATE Viatris"):
        "Alginate de sodium (generique Gaviscon) 500mg/267mg 24 sachets",
    norm("Alginate de sodium (Gaviscon) 500mg/267mg - sachets de 10 ml"):
        "Alginate de sodium (generique Gaviscon) 500mg/267mg 24 sachets",

    # Diclofénac marque → générique Excel
    norm("DICLOFÉNAC SANDOZ 1% gel"):
        "Diclofenac Gel en flacon pressurise",

    # Compresses non tissées → pas d'équivalent dans Excel (à garder si références)
    norm("COMPRESSES NON TISSÉES STÉRILES"):
        None,
}


# ── Opérations DB (annulées en dry-run) ───────────────────────────────────────

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
                    # Garde le nom texte, met FK à null
                    if not item.medication_name:
                        item.medication_name = old_product.name
                    item.medication = None
                    item.is_external_medication = True
                    item.save(update_fields=['medication', 'medication_name', 'is_external_medication'])
            print(f"      → {pi_count} PrescriptionItem(s) dé-liés (medication_name conservé)")

    if HAS_DISPENSING:
        di_qs = DispensingItem.objects.filter(medication=old_product)
        di_count = di_qs.count()
        if di_count:
            if new_product:
                if not dry:
                    di_qs.update(medication=new_product)
                print(f"      → {di_count} DispensingItem(s) réassigné(s) vers '{new_product.name}'")
            else:
                if not dry:
                    di_qs.update(medication=None)
                print(f"      → {di_count} DispensingItem(s) dé-liés")


def merge_duplicate_into_master(dup, master, dry=False):
    """Transfère toutes les FK de 'dup' vers 'master', puis supprime 'dup'."""
    if not dry:
        InvoiceItem.objects.filter(product=dup).update(product=master)
        StockMovement.objects.filter(product=dup).update(product=master)   # FIX: était .update(master)
        ProductBatch.objects.filter(product=dup).update(product=master)
        PurchaseOrderItem.objects.filter(product=dup).update(product=master)
        SupplierProduct.objects.filter(product=dup).update(product=master)
        reassign_protected_refs(dup, master, dry=False)
        dup.delete()
    else:
        reassign_protected_refs(dup, master, dry=True)


def safe_delete(product, replacement=None, dry=False):
    """Réassigne les refs protégées puis supprime."""
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
    print(f"{tag}NORMALISATION INTELLIGENTE - Cas par cas")
    print("=" * 70)
    if DRY_RUN:
        print("MODE APERÇU - Aucune modification ne sera appliquée.\n")

    def run():
        # ── ÉTAPE 1 : Chargement Excel ─────────────────────────────────────
        all_xlsx = glob.glob("Liste des*.xlsx")
        # Choisir UNIQUEMENT le fichier médicaments (pas "soins médicaux")
        med_files = [f for f in all_xlsx if "soins" not in f.lower()]
        if not med_files:
            med_files = all_xlsx
        if not med_files:
            print("ERREUR : Aucun fichier Excel trouvé. Placer 'Liste des médicaments*.xlsx' ici.")
            return

        # Prendre le fichier le plus récent (par date de modification)
        med_file = max(med_files, key=os.path.getmtime)
        print(f"Fichier médicaments chargé : {med_file}")

        wb = openpyxl.load_workbook(med_file, data_only=True)
        sheet = wb.active

        excel_products = {}   # nom_original → {'stock': int}
        for i, row in enumerate(sheet.iter_rows(values_only=True)):
            if i == 0:
                continue  # ligne d'en-tête
            name = row[0]
            stock = row[1]
            if not name or not str(name).strip():
                continue
            original_name = str(name).strip()
            qty = int(stock) if stock is not None else 0
            if original_name in excel_products:
                excel_products[original_name]['stock'] += qty   # cumule les lignes dupliquées
            else:
                excel_products[original_name] = {'stock': qty}

        excel_names = list(excel_products.keys())
        print(f"Produits uniques dans Excel : {len(excel_names)}\n")

        # ── ÉTAPE 2 : Matching DB → Excel ─────────────────────────────────
        print("─" * 70)
        print("PHASE 1 : Mapping de chaque produit DB vers Excel")
        print("─" * 70)

        db_products = list(Product.objects.filter(product_type='physical').order_by('name'))
        mapping = {}   # product.pk → excel_original_name ou None

        for p in db_products:
            p_norm = norm(p.name)

            if p_norm in MANUAL_MAPPING:
                target = MANUAL_MAPPING[p_norm]
                mapping[p.pk] = target
                if target:
                    print(f"  [MANUEL]       '{p.name}'")
                    print(f"              ➜  '{target}'")
                else:
                    print(f"  [MANUEL/VIDE]  '{p.name}' → Pas d'équivalent Excel")
            else:
                matched, ratio = fuzzy_best_match(p.name, excel_names, threshold=0.72)
                mapping[p.pk] = matched
                if matched:
                    label = "EXACT" if norm(matched) == p_norm else f"FUZZY {ratio:.0%}"
                    print(f"  [{label}]  '{p.name}'")
                    if norm(matched) != p_norm:
                        print(f"              ➜  '{matched}'")
                else:
                    print(f"  [PAS DE MATCH {ratio:.0%}]  '{p.name}' ← ABSENT de l'Excel")

        # ── ÉTAPE 3 : Fusion des doublons ─────────────────────────────────
        print("\n" + "─" * 70)
        print("PHASE 2 : Fusion des doublons (plusieurs DB → 1 Excel)")
        print("─" * 70)

        # excel_name → liste de produits DB correspondants
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
                    print(f"  [RENOMMER] '{p.name}'")
                    print(f"          ➜  '{excel_name}'")
                    if not DRY_RUN:
                        p.name = excel_name
                        p.save(update_fields=['name'])
                continue

            print(f"\n  [FUSION x{len(products)}] ➜ '{excel_name}'")
            products_sorted = sorted(products, key=lambda x: x.created_at)
            master = products_sorted[0]
            duplicates = products_sorted[1:]
            print(f"    Maître : '{master.name}'")

            for dup in duplicates:
                print(f"    Fusionner : '{dup.name}' dans maître")
                merge_duplicate_into_master(dup, master, dry=DRY_RUN)
                if not DRY_RUN:
                    print(f"      ✓ Supprimé")

            if master.name != excel_name:
                print(f"    Renommer maître : '{master.name}' ➜ '{excel_name}'")
                if not DRY_RUN:
                    master.name = excel_name
                    master.save(update_fields=['name'])

        # ── ÉTAPE 4 : Produits sans match Excel ───────────────────────────
        print("\n" + "─" * 70)
        print("PHASE 3 : Produits ABSENTS de l'Excel")
        print("─" * 70)

        deleted_count = 0
        kept_count = 0

        for p in no_match_products:
            has_pi = PrescriptionItem.objects.filter(medication=p).exists()
            has_di = HAS_DISPENSING and DispensingItem.objects.filter(medication=p).exists()
            has_inv = InvoiceItem.objects.filter(product=p).exists()

            refs = (["PrescriptionItem"] if has_pi else []) + \
                   (["DispensingItem"] if has_di else []) + \
                   (["InvoiceItem"] if has_inv else [])

            if refs:
                print(f"  [GARDER - REFS] '{p.name}'")
                print(f"    Références : {', '.join(refs)} → NE PAS SUPPRIMER")
                print(f"    Action requise : renommer manuellement si besoin")
                kept_count += 1
            else:
                print(f"  [SUPPRIMER] '{p.name}' (aucune référence)")
                if safe_delete(p, replacement=None, dry=DRY_RUN):
                    deleted_count += 1

        print(f"\n  Résumé phase 3 : {deleted_count} supprimés | {kept_count} gardés (ont des refs)")

        # ── ÉTAPE 5 : Synchronisation des stocks ──────────────────────────
        print("\n" + "─" * 70)
        print("PHASE 4 : Synchronisation des stocks depuis Excel")
        print("─" * 70)

        for p in Product.objects.filter(product_type='physical').order_by('name'):
            # Chercher l'entrée Excel par nom exact
            excel_data = excel_products.get(p.name)
            if not excel_data:
                # Fallback: cherche par norm
                for exc_name, exc_data in excel_products.items():
                    if norm(p.name) == norm(exc_name):
                        excel_data = exc_data
                        break

            if not excel_data:
                print(f"  [SKIP]  '{p.name}' – pas de données Excel")
                continue

            initial_stock = excel_data['stock']

            total_sold = InvoiceItem.objects.filter(
                product=p,
                invoice__status__in=['paid', 'sent', 'overdue']
            ).aggregate(models.Sum('quantity'))['quantity__sum'] or 0

            # Cas spécial thermomètre
            if 'thermometre' in norm(p.name):
                total_sold = 11
                if initial_stock < total_sold:
                    initial_stock = 100

            correct_stock = max(0, int(initial_stock) - int(total_sold))

            if not DRY_RUN:
                p.batches.all().delete()
                StockMovement.objects.filter(product=p, movement_type='sale').delete()
                ProductBatch.objects.create(
                    organization=p.organization,
                    product=p,
                    batch_number="INIT-SYNC",
                    quantity=initial_stock,
                    quantity_remaining=correct_stock,
                    expiry_date=timezone.now().date() + timedelta(days=365),
                    status='available' if correct_stock > 0 else 'depleted'
                )
                p.stock_quantity = correct_stock
                p.save(update_fields=['stock_quantity'])

            print(f"  {p.name[:40]:<40} | Excel:{initial_stock:<4} | Vendu:{total_sold:<4} | Final:{correct_stock}")

    # Wrapper transaction (rollback si dry-run)
    if DRY_RUN:
        # Utilise un savepoint qu'on rollback ensuite
        from django.db import connection
        with transaction.atomic():
            sid = transaction.savepoint()
            run()
            transaction.savepoint_rollback(sid)
        print("\n[DRY-RUN] Aucun changement appliqué. Relancer sans --dry-run pour exécuter.")
    else:
        with transaction.atomic():
            run()
        print("\n" + "=" * 70)
        print("NORMALISATION TERMINÉE - Base de données synchronisée avec l'Excel")
        print("=" * 70)


if __name__ == "__main__":
    normalize_smart()
