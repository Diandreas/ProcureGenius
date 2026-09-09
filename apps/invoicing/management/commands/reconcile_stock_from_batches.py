"""
Management command: reconcile_stock_from_batches

Corrige product.stock_quantity pour tous les produits geres par lots
(ProductBatch) dont le compteur est desynchronise de la somme des lots
actifs -- bug constate en prod le 09/09/2026 (ex: load_pharmacy_batches
avait cree des lots avec les vraies quantites d'inventaire sans jamais
mettre a jour stock_quantity, reste bloque a une vieille valeur, souvent 0,
pour des dizaines de produits -- la liste des produits et la fiche produit
affichaient alors deux nombres differents pour le meme produit).

Cible = somme des lots 'available'/'opened' (meme formule que
Product.total_stock / sync_stock_from_batches()). Chaque correction cree un
StockMovement de type 'adjustment' pour tracabilite, meme convention que
fix_stock_april2026.py.

Les produits sans aucun lot ne sont pas touches (stock_quantity classique,
mode adjust_stock() seul, non concerne par ce bug).

Usage:
  python manage.py reconcile_stock_from_batches            # dry-run (apercu)
  python manage.py reconcile_stock_from_batches --execute  # applique
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Sum


class Command(BaseCommand):
    help = "Recale stock_quantity sur la somme des lots actifs pour tous les produits geres par lots"

    def add_arguments(self, parser):
        parser.add_argument('--execute', action='store_true',
                            help='Applique reellement les corrections (sinon : dry-run)')

    def handle(self, *args, **options):
        from apps.invoicing.models import Product, StockMovement

        execute = options['execute']

        if not execute:
            self.stdout.write(self.style.WARNING(
                "\n[DRY-RUN] Aucune modification ne sera enregistree. Ajoutez --execute pour appliquer.\n"
            ))

        products = Product.objects.filter(
            product_type='physical', is_active=True, batches__isnull=False
        ).distinct()

        self.stdout.write(f"Produits geres par lots : {products.count()}\n")

        fixed = 0
        already_ok = 0

        with transaction.atomic():
            for product in products:
                batch_total = product.batches.filter(
                    status__in=['available', 'opened']
                ).aggregate(total=Sum('quantity_remaining'))['total'] or 0

                current = product.stock_quantity
                if current == batch_total:
                    already_ok += 1
                    continue

                delta = batch_total - current
                sign = '+' if delta >= 0 else ''
                self.stdout.write(
                    f"  [{'DRY-RUN' if not execute else 'OK'}] {product.name!r} : "
                    f"stock_quantity={current} -> {batch_total} (delta {sign}{delta})"
                )

                if execute:
                    StockMovement.objects.create(
                        product=product,
                        movement_type='adjustment',
                        quantity=delta,
                        quantity_before=current,
                        quantity_after=batch_total,
                        reference_type='manual',
                        reference_number='RECONCILE-09092026',
                        notes="Reconciliation automatique stock_quantity <- somme des lots actifs "
                              "(bug: stock_quantity desynchronise des lots reels)",
                    )
                    product.stock_quantity = batch_total
                    product.save(update_fields=['stock_quantity', 'updated_at'])

                fixed += 1

            if not execute:
                transaction.set_rollback(True)

        self.stdout.write("\n" + "=" * 60)
        if execute:
            self.stdout.write(self.style.SUCCESS(f"OK - {fixed} produit(s) corrige(s), {already_ok} deja corrects."))
        else:
            self.stdout.write(self.style.WARNING(
                f"Simulation : {fixed} produit(s) seraient corriges, {already_ok} deja corrects.\n"
                "Lancez avec --execute pour appliquer."
            ))
