"""
Commande de management pour recalculer les ratings des fournisseurs
"""
from django.core.management.base import BaseCommand
from apps.suppliers.models import Supplier
from apps.suppliers.services import SupplierRatingService


class Command(BaseCommand):
    help = 'Recalcule automatiquement les ratings de tous les fournisseurs'

    def add_arguments(self, parser):
        parser.add_argument(
            '--supplier-id',
            type=str,
            help='ID d\'un fournisseur spécifique à mettre à jour',
        )
        parser.add_argument(
            '--days-back',
            type=int,
            default=365,
            help='Nombre de jours en arrière pour analyser (défaut: 365)',
        )

    def handle(self, *args, **options):
        supplier_id = options.get('supplier_id')
        days_back = options['days_back']

        if supplier_id:
            try:
                supplier = Supplier.objects.get(id=supplier_id)
                self.stdout.write(f'Recalcul du rating pour {supplier.name}...')
                result = SupplierRatingService.update_supplier_rating(supplier, days_back)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✓ Rating mis à jour: {result["rating"]}/5.0 '
                        f'(Ponctualité: {result["punctuality_score"]}, '
                        f'Qualité: {result["quality_score"]}, '
                        f'Paiement: {result["payment_score"]})'
                    )
                )
            except Supplier.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Fournisseur avec ID {supplier_id} non trouvé')
                )
        else:
            self.stdout.write('Recalcul des ratings de tous les fournisseurs...')
            suppliers = Supplier.objects.all()
            updated_count = 0
            
            for supplier in suppliers:
                try:
                    SupplierRatingService.update_supplier_rating(supplier, days_back)
                    updated_count += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'Erreur pour {supplier.name}: {e}')
                    )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ {updated_count} fournisseurs mis à jour sur {suppliers.count()}'
                )
            )

        self.stdout.write(self.style.SUCCESS('Terminé!'))

