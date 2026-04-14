"""
Management command: backfill_lab_stock_deductions
Rattrapage des deductions de stock pour les prelevements deja effectues
avant l'introduction de LabTestConsumable.

Logique :
  - Pour chaque LabOrder deja preleve (status != pending/cancelled)
  - Pour chaque item dont le lab_test a des consommables (LabTestConsumable)
  - Si aucun mouvement de stock "labo" n'existe deja pour cet ordre+produit
  - Deduit la quantite du stock (StockMovement type=sale + product.stock_quantity)

Usage:
  python manage.py backfill_lab_stock_deductions --dry-run   # Voir sans toucher
  python manage.py backfill_lab_stock_deductions             # Appliquer
"""
from django.core.management.base import BaseCommand
from django.db import transaction


PROCESSED_STATUSES = [
    'sample_collected',
    'in_progress',
    'completed',
    'results_ready',
    'results_delivered',
]


class Command(BaseCommand):
    help = 'Rattrapage deductions stock labo pour prelevements anterieurs'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Simulation sans modifications')

    def handle(self, *args, **options):
        from apps.laboratory.models import LabOrder, LabOrderItem, LabTestConsumable
        from apps.invoicing.models import StockMovement

        dry_run = options['dry_run']
        mode = 'SIMULATION' if dry_run else 'ECRITURE'

        self.stdout.write(f'\n{"=" * 65}')
        self.stdout.write(f'  BACKFILL STOCK LABO -- Mode: {mode}')
        self.stdout.write(f'{"=" * 65}\n')

        # Tous les ordres deja preleves
        orders = LabOrder.objects.filter(
            status__in=PROCESSED_STATUSES
        ).prefetch_related('items__lab_test__consumables__product').order_by('created_at')

        total_deductions = 0
        total_skipped = 0
        total_orders_touched = 0
        errors = []

        for order in orders:
            order_had_deduction = False

            for item in order.items.all():
                lab_test = item.lab_test
                consumables = list(lab_test.consumables.select_related('product').all())

                if not consumables:
                    continue  # Ce test n'a pas de consommables lies

                for consumable in consumables:
                    product = consumable.product
                    qty = consumable.quantity_per_test

                    # Verifier si une deduction existe deja pour cet ordre+produit
                    already_deducted = StockMovement.objects.filter(
                        product=product,
                        reference_id=order.id,
                        movement_type='sale',
                    ).exists()

                    if already_deducted:
                        total_skipped += 1
                        self.stdout.write(
                            f'  [=SKIP] {order.order_number} | [{lab_test.test_code}] '
                            f'"{product.name[:35]}" deja deduit'
                        )
                        continue

                    # Stock actuel
                    current_stock = product.total_stock if hasattr(product, 'total_stock') else product.stock_quantity
                    new_stock = current_stock - qty

                    self.stdout.write(
                        f'  [{"DRY" if dry_run else "OK "}] {order.order_number} '
                        f'({str(order.created_at.date())}) | '
                        f'[{lab_test.test_code}] "{product.name[:30]}" '
                        f'stock {current_stock} -> {new_stock}'
                    )

                    if not dry_run:
                        try:
                            with transaction.atomic():
                                # Creer le mouvement
                                StockMovement.objects.create(
                                    product=product,
                                    movement_type='sale',
                                    quantity=-qty,
                                    quantity_before=current_stock,
                                    quantity_after=new_stock,
                                    reference_type='manual',
                                    reference_id=order.id,
                                    reference_number=order.order_number,
                                    notes=f'[RATTRAPAGE] Labo {order.order_number} - {lab_test.test_code}',
                                )
                                # Mettre a jour le stock produit
                                # Si le produit a des lots, ajuster le lot actif
                                active_batches = product.batches.filter(
                                    status__in=['available', 'opened']
                                ).order_by('expiry_date')

                                if active_batches.exists():
                                    batch = active_batches.first()
                                    batch.quantity_remaining = max(0, batch.quantity_remaining - qty)
                                    batch.update_status()
                                    batch.save(update_fields=['quantity_remaining', 'status'])
                                else:
                                    product.stock_quantity = max(0, product.stock_quantity - qty)
                                    product.save(update_fields=['stock_quantity', 'updated_at'])

                        except Exception as e:
                            errors.append(f'{order.order_number} / {lab_test.test_code}: {e}')
                            self.stdout.write(self.style.ERROR(f'    ERREUR: {e}'))
                            continue

                    total_deductions += 1
                    order_had_deduction = True

            if order_had_deduction:
                total_orders_touched += 1

        # Resume
        self.stdout.write(f'\n{"=" * 65}')
        self.stdout.write(f'  Ordres traites   : {total_orders_touched} / {orders.count()}')
        self.stdout.write(f'  Deductions       : {total_deductions}')
        self.stdout.write(f'  Deja faites      : {total_skipped}')
        if errors:
            self.stdout.write(self.style.ERROR(f'  Erreurs          : {len(errors)}'))
            for e in errors:
                self.stdout.write(self.style.ERROR(f'    {e}'))
        self.stdout.write(f'{"=" * 65}\n')

        if dry_run:
            self.stdout.write('  DRY-RUN -- Aucune modification.\n')
        else:
            self.stdout.write(self.style.SUCCESS('  Rattrapage termine !\n'))
