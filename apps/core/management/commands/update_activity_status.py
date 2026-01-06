"""
Commande de management pour mettre à jour les statuts d'activité des clients et fournisseurs
"""
from django.core.management.base import BaseCommand
from apps.accounts.models import Client
from apps.suppliers.models import Supplier


class Command(BaseCommand):
    help = 'Met à jour automatiquement les statuts actif/inactif des clients et fournisseurs'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clients-only',
            action='store_true',
            help='Mettre à jour uniquement les clients',
        )
        parser.add_argument(
            '--suppliers-only',
            action='store_true',
            help='Mettre à jour uniquement les fournisseurs',
        )
        parser.add_argument(
            '--inactivity-days',
            type=int,
            default=180,
            help='Nombre de jours sans activité pour considérer comme inactif (défaut: 180)',
        )

    def handle(self, *args, **options):
        inactivity_days = options['inactivity_days']
        clients_only = options['clients_only']
        suppliers_only = options['suppliers_only']

        if not suppliers_only:
            self.stdout.write('Mise à jour des statuts des clients...')
            clients = Client.objects.filter(is_manually_active=False)
            updated_count = 0
            
            for client in clients:
                if client.update_activity_status(inactivity_days):
                    updated_count += 1
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ {updated_count} clients mis à jour sur {clients.count()} traités'
                )
            )

        if not clients_only:
            self.stdout.write('Mise à jour des statuts des fournisseurs...')
            suppliers = Supplier.objects.filter(is_manually_active=False)
            updated_count = 0
            
            for supplier in suppliers:
                if supplier.update_activity_status(inactivity_days):
                    updated_count += 1
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ {updated_count} fournisseurs mis à jour sur {suppliers.count()} traités'
                )
            )

        self.stdout.write(self.style.SUCCESS('Terminé!'))

