"""
Commande Django pour corriger les clients/fournisseurs/produits importés
qui n'ont pas d'organisation associée.

Usage:
    python manage.py fix_imported_organization
    python manage.py fix_imported_organization --dry-run
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from apps.accounts.models import Client, Organization
from apps.suppliers.models import Supplier
from apps.invoicing.models import Product
from apps.data_migration.models import MigrationJob, MigrationLog
import uuid


class Command(BaseCommand):
    help = 'Corrige les objets importés qui n\'ont pas d\'organisation en les associant à l\'organisation de l\'utilisateur qui a créé le job d\'import'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche ce qui serait fait sans faire de modifications',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('Mode DRY-RUN - Aucune modification ne sera effectuée'))
        
        # Récupérer tous les jobs de migration complétés
        jobs = MigrationJob.objects.filter(
            status='completed'
        ).select_related('created_by', 'created_by__organization')
        
        total_fixed = 0
        
        for job in jobs:
            if not job.created_by or not job.created_by.organization:
                self.stdout.write(
                    self.style.WARNING(
                        f'⚠ Job "{job.name}" ignoré: utilisateur sans organisation'
                    )
                )
                continue
            
            organization = job.created_by.organization
            fixed_count = 0
            
            # Utiliser les logs pour trouver les objets créés
            success_logs = MigrationLog.objects.filter(
                job=job,
                level='success',
                created_object_id__isnull=False,
                created_object_type__isnull=False
            )
            
            for log in success_logs:
                try:
                    object_id = uuid.UUID(log.created_object_id)
                    object_type = log.created_object_type
                    
                    # Corriger selon le type
                    if object_type == 'Client' and job.entity_type == 'clients':
                        try:
                            client = Client.objects.get(id=object_id)
                            if not client.organization:
                                if not dry_run:
                                    client.organization = organization
                                    client.save(update_fields=['organization'])
                                fixed_count += 1
                                self.stdout.write(
                                    f'  ✓ Client "{client.name}" → Organisation "{organization.name}"'
                                )
                        except Client.DoesNotExist:
                            continue
                    
                    elif object_type == 'Supplier' and job.entity_type == 'suppliers':
                        try:
                            supplier = Supplier.objects.get(id=object_id)
                            if not supplier.organization:
                                if not dry_run:
                                    supplier.organization = organization
                                    supplier.save(update_fields=['organization'])
                                fixed_count += 1
                                self.stdout.write(
                                    f'  ✓ Fournisseur "{supplier.name}" → Organisation "{organization.name}"'
                                )
                        except Supplier.DoesNotExist:
                            continue
                    
                    elif object_type == 'Product' and job.entity_type == 'products':
                        try:
                            product = Product.objects.get(id=object_id)
                            if not product.organization:
                                if not dry_run:
                                    product.organization = organization
                                    product.save(update_fields=['organization'])
                                fixed_count += 1
                                self.stdout.write(
                                    f'  ✓ Produit "{product.name}" → Organisation "{organization.name}"'
                                )
                        except Product.DoesNotExist:
                            continue
                
                except (ValueError, TypeError) as e:
                    # ID invalide, ignorer
                    continue
            
            if fixed_count > 0:
                total_fixed += fixed_count
                self.stdout.write(
                    self.style.SUCCESS(
                        f'\nJob "{job.name}" ({job.entity_type}): {fixed_count} objet(s) corrigé(s)'
                    )
                )
        
        if total_fixed == 0:
            self.stdout.write(self.style.SUCCESS('Aucun objet à corriger.'))
        else:
            if dry_run:
                self.stdout.write(
                    self.style.WARNING(
                        f'\n{total_fixed} objet(s) seraient corrigés en mode réel.'
                    )
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'\n✅ {total_fixed} objet(s) corrigé(s) avec succès!'
                    )
                )

