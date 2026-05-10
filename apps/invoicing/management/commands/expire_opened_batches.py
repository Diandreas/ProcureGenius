"""
Commande : expire_opened_batches
- Détecte les lots ouverts dont la date de validité après ouverture est dépassée
- Les passe en statut 'expired'
- Crée un mouvement de stock 'loss' (raison: expired) pour la quantité restante
- Met stock_quantity à jour
- S'exécute idéalement en cron quotidien (celery-beat ou crontab)
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from apps.invoicing.models import ProductBatch, StockMovement, Product


class Command(BaseCommand):
    help = "Expire les lots ouverts périmés et crée les mouvements de stock correspondants"

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help="Simuler sans modifier la BDD")

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        today = timezone.now().date()

        # Lots ouverts dont la péremption effective est passée
        candidates = ProductBatch.objects.filter(
            status='opened'
        ).select_related('product', 'organization')

        expired_batches = [b for b in candidates if b.is_expired and b.quantity_remaining > 0]

        self.stdout.write(f"Lots ouverts périmés avec stock restant : {len(expired_batches)}")

        if dry_run:
            for b in expired_batches:
                self.stdout.write(
                    f"  [DRY-RUN] {b.product.name} | lot {b.batch_number} | "
                    f"périmé le {b.effective_expiry} | restant : {b.quantity_remaining}"
                )
            return

        processed = 0
        for batch in expired_batches:
            with transaction.atomic():
                qty = batch.quantity_remaining
                stock_before = batch.product.stock_quantity or 0

                # 1. Créer le mouvement de perte
                StockMovement.objects.create(
                    product=batch.product,
                    batch=batch,
                    movement_type='loss',
                    loss_reason='expired',
                    quantity=-qty,
                    quantity_before=stock_before,
                    quantity_after=max(0, stock_before - qty),
                    notes=(
                        f"Lot {batch.batch_number} périmé automatiquement — "
                        f"ouvert le {batch.opened_at.strftime('%d/%m/%Y') if batch.opened_at else '?'}, "
                        f"validité {batch.shelf_life_after_opening_days}j après ouverture, "
                        f"péremption effective : {batch.effective_expiry}"
                    ),
                    reference_type='loss_report',
                )

                # 2. Vider et expirer le lot
                batch.quantity_remaining = 0
                batch.status = 'expired'
                batch.save(update_fields=['quantity_remaining', 'status'])

                # 3. Sync stock_quantity du produit
                product = batch.product
                from django.db.models import Sum, Q
                new_stock = ProductBatch.objects.filter(
                    product=product,
                    status__in=['available', 'opened']
                ).aggregate(t=Sum('quantity_remaining'))['t'] or 0
                product.stock_quantity = new_stock
                product.save(update_fields=['stock_quantity'])

                processed += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  ✅ {batch.product.name} | lot {batch.batch_number} | "
                        f"{qty} unité(s) défalquée(s) (périmé le {batch.effective_expiry})"
                    )
                )

        self.stdout.write(self.style.SUCCESS(f"\n{processed} lot(s) traité(s)."))
