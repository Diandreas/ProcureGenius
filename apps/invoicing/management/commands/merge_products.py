"""
Management command: merge_products
Fusionne un produit doublon dans un produit cible sans casser les factures existantes.

Usage:
  python manage.py merge_products --keep <UUID_cible> --merge <UUID_doublon> [--stock 487]

Exemple:
  python manage.py merge_products \\
      --keep  "aaaaaaaa-0000-0000-0000-000000000001" \\
      --merge "bbbbbbbb-0000-0000-0000-000000000002" \\
      --stock 487

Ce que la commande fait (dans une transaction atomique) :
  1. Vérifie que les deux produits existent dans la même organisation
  2. Réassigne tous les InvoiceItem du doublon vers le produit cible
  3. Réassigne tous les StockMovement du doublon vers le produit cible
  4. Réassigne tous les ProductBatch du doublon vers le produit cible
  5. Réassigne toute FK product sur SubcontractorLabTest si elle existe
  6. Met à jour stock_quantity du produit cible avec la valeur --stock
  7. Désactive le doublon (is_active=False) sans le supprimer
     → les factures restent valides (FK toujours là, mais produit inactif)
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


class Command(BaseCommand):
    help = "Fusionne deux produits (conserve l'historique des factures)"

    def add_arguments(self, parser):
        parser.add_argument('--keep',  required=True, help='UUID du produit à CONSERVER')
        parser.add_argument('--merge', required=True, help='UUID du produit DOUBLON à fusionner')
        parser.add_argument('--stock', type=int, default=None, help='Nouveau stock_quantity du produit conservé après fusion')
        parser.add_argument('--dry-run', action='store_true', help='Simule sans sauvegarder')

    def handle(self, *args, **options):
        from apps.invoicing.models import Product, InvoiceItem, StockMovement, ProductBatch

        keep_id  = options['keep']
        merge_id = options['merge']
        new_stock = options['stock']
        dry_run   = options['dry_run']

        if keep_id == merge_id:
            raise CommandError('--keep et --merge doivent être différents.')

        try:
            keep_product  = Product.objects.get(pk=keep_id)
        except Product.DoesNotExist:
            raise CommandError(f'Produit --keep introuvable : {keep_id}')

        try:
            merge_product = Product.objects.get(pk=merge_id)
        except Product.DoesNotExist:
            raise CommandError(f'Produit --merge introuvable : {merge_id}')

        if keep_product.organization_id != merge_product.organization_id:
            raise CommandError('Les deux produits n\'appartiennent pas à la même organisation.')

        # Prévisualisation
        invoice_items   = InvoiceItem.objects.filter(product=merge_product)
        stock_movements = StockMovement.objects.filter(product=merge_product)
        batches         = ProductBatch.objects.filter(product=merge_product)

        self.stdout.write(self.style.WARNING(f'\n═══ FUSION PRODUITS ═══'))
        self.stdout.write(f'  Conserver : {keep_product.name!r} ({keep_product.pk})')
        self.stdout.write(f'  Fusionner : {merge_product.name!r} ({merge_product.pk})')
        self.stdout.write(f'  InvoiceItem réassignés   : {invoice_items.count()}')
        self.stdout.write(f'  StockMovement réassignés : {stock_movements.count()}')
        self.stdout.write(f'  Lots (ProductBatch) réassignés : {batches.count()}')
        if new_stock is not None:
            self.stdout.write(f'  Nouveau stock_quantity   : {new_stock}')
        self.stdout.write(f'  Mode : {"SIMULATION (--dry-run)" if dry_run else "ÉCRITURE RÉELLE"}')
        self.stdout.write('')

        if dry_run:
            self.stdout.write(self.style.SUCCESS('Simulation terminée — aucune modification.'))
            return

        with transaction.atomic():
            # 1. Réassigner InvoiceItem
            updated_items = invoice_items.update(product=keep_product)

            # 2. Réassigner StockMovement
            updated_mvt = stock_movements.update(product=keep_product)

            # 3. Réassigner ProductBatch
            updated_batches = batches.update(product=keep_product)

            # 4. Sous-traitance : si SubcontractorLabTest référence product (optionnel)
            try:
                from apps.laboratory.models import SubcontractorLabTest
                if hasattr(SubcontractorLabTest, 'product'):
                    SubcontractorLabTest.objects.filter(product=merge_product).update(product=keep_product)
            except Exception:
                pass  # Modèle inexistant ou sans FK product — ignoré

            # 5. Mise à jour stock et désactivation du doublon
            if new_stock is not None:
                keep_product.stock_quantity = new_stock
                keep_product.save(update_fields=['stock_quantity', 'updated_at'])

            merge_product.is_active = False
            # Rename pour éviter confusion dans l'interface
            merge_product.name = f'[FUSIONNÉ] {merge_product.name}'
            merge_product.save(update_fields=['is_active', 'name', 'updated_at'])

        self.stdout.write(self.style.SUCCESS(
            f'✓ Fusion terminée :\n'
            f'  {updated_items} ligne(s) de facture réassignées\n'
            f'  {updated_mvt} mouvement(s) de stock réassignés\n'
            f'  {updated_batches} lot(s) réassignés\n'
            f'  Produit doublon désactivé : {merge_product.name!r}\n'
            f'  Stock produit cible : {keep_product.stock_quantity}'
        ))
