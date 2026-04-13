"""
Management command: cleanup_lab_stock_duplicates
Supprime les produits crees par inadvertance par l'ancien link_lab_stock.py
(ceux avec des refs type H111-23U, SYP-W23, DR002-1, etc.)

Ces produits etaient des doublons des produits existants en DB
(ex: PRD-20260302-0001 HCV Rapid Test Cassette).

Usage:
  python manage.py cleanup_lab_stock_duplicates --dry-run   # Voir ce qui sera supprime
  python manage.py cleanup_lab_stock_duplicates             # Supprimer pour de vrai
"""
from django.core.management.base import BaseCommand
from django.db import transaction


# Refs creees par erreur par l'ancien link_lab_stock.py
REFS_TO_DELETE = [
    'SAFE-AQ-STRIPS',
    'SAFE-AQ-LANCETS',
    'HBsAg-W23',
    'HCV-W23',
    'HIV-W23',
    'SYP-W23',
    'H111-23U',
    'H112-23U',
    'H121-23W',
    'H122-43W',
    'H123-23W',
    'H124-23W',
    'H125-23W',
    'H126-23W',
    'H127-23W',
    'H129-23W',
    'H132-23W',
    'H134-23S',
    'H135-23S',
    'H136-23P',
    'H144-23W',
    'H145-23F',
    'H146-23W',
    'H147-23W',
    'H148-23W',
    'H181-23WM',
    'H181-23WG',
    'H184-23WM',
    'H184-23WG',
    'H185-23WM',
    'H185-23WG',
    'BH-14H',
    'DR002-1',
    'DR004-1',
    'DR018-2',
    'DR020-2',
    'DR019-2',
    'DR024-2',
    'DR022-2',
    'DR063-2',
    'DR064-2',
    'DR016-1',
    'DR061-2',
    'DR062-2',
    'DR077-2',
    'DR021-2',
    'DR023-2',
    'DR057-4',
    'VIT-B-COMPR-001',
    'Safe AQ pro I strips',
]


class Command(BaseCommand):
    help = 'Supprime les produits crees par erreur par l\'ancien link_lab_stock.py'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Simulation sans suppression')

    def handle(self, *args, **options):
        from apps.invoicing.models import Product, StockMovement
        from apps.laboratory.models import LabTest

        dry_run = options['dry_run']
        mode = 'SIMULATION' if dry_run else 'SUPPRESSION REELLE'

        self.stdout.write(f'\n{"=" * 60}')
        self.stdout.write(f'  CLEANUP DOUBLONS LABO -- Mode: {mode}')
        self.stdout.write(f'{"=" * 60}\n')

        to_delete = []
        skipped = []

        for ref in REFS_TO_DELETE:
            p = Product.objects.filter(reference=ref).first()
            if not p:
                continue

            # Verifier si ce produit est lie a des labtests
            linked_tests = list(LabTest.objects.filter(linked_product=p).values_list('test_code', flat=True))

            # Verifier si ce produit a des mouvements de stock non-initiaux
            real_movements = StockMovement.objects.filter(
                product=p
            ).exclude(movement_type='initial').count()

            # Verifier si ce produit a des lots
            batch_count = p.batches.count()

            # Verifier si ce produit est dans des lignes de facture
            invoice_items = p.invoice_items.count() if hasattr(p, 'invoice_items') else 0

            flag = ''
            if real_movements > 0:
                flag += f' [!{real_movements} mouvements]'
            if batch_count > 0:
                flag += f' [!{batch_count} lots]'
            if invoice_items > 0:
                flag += f' [!{invoice_items} factures]'

            self.stdout.write(
                f'  {"[DRY-RUN]" if dry_run else "[SUPPR]  "} '
                f'ref={ref:20s} | {p.name[:45]:45s} | stock={p.stock_quantity:5d} '
                f'| tests={linked_tests}{flag}'
            )

            if real_movements > 0 or invoice_items > 0:
                self.stdout.write(
                    self.style.WARNING(
                        f'    -> IGNORE (a des mouvements/factures reels, suppression manuelle requise)'
                    )
                )
                skipped.append(ref)
                continue

            to_delete.append((p, linked_tests))

        self.stdout.write(f'\n  {len(to_delete)} produit(s) a supprimer, {len(skipped)} ignore(s) (avec donnees)\n')

        if dry_run:
            self.stdout.write('  DRY-RUN -- Aucune suppression effectuee.\n')
            return

        if not to_delete:
            self.stdout.write('  Rien a supprimer.\n')
            return

        with transaction.atomic():
            deleted = 0
            unlinked = 0
            for product, linked_tests in to_delete:
                # Delier les LabTests d'abord
                if linked_tests:
                    LabTest.objects.filter(linked_product=product).update(linked_product=None)
                    unlinked += len(linked_tests)
                    self.stdout.write(f'  [DELIE] {linked_tests} -> linked_product=None')

                # Supprimer les mouvements initiaux
                StockMovement.objects.filter(product=product, movement_type='initial').delete()

                # Supprimer le produit
                name = product.name
                product.delete()
                deleted += 1
                self.stdout.write(f'  [OK] "{name}" supprime')

        self.stdout.write(self.style.SUCCESS(
            f'\n  Termine : {deleted} produit(s) supprimes, {unlinked} LabTest(s) delies.\n'
        ))
