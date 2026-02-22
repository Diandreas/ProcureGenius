"""
Django Management Command: Mise à jour des prix des services médicaux du Centre de Santé JULIANNA

Usage:
    python manage.py update_julianna_services
    python manage.py update_julianna_services --dry-run
    python manage.py update_julianna_services --org-name "Centre de Santé JULIANNA"
"""

import os
import sys
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

sys.path.append(os.path.dirname(__file__))
from julianna_tests_config import MEDICAL_SERVICES

from apps.accounts.models import Organization
from apps.inventory.models import Product


class Command(BaseCommand):
    help = 'Met à jour les prix des services médicaux du Centre de Santé JULIANNA (tarifs 2026)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Afficher les changements sans les appliquer en base',
        )
        parser.add_argument(
            '--org-name',
            type=str,
            default='',
            help="Nom de l'organisation (cherche JULIANNA par défaut)",
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        org_name = options['org_name']

        self.stdout.write('=' * 70)
        self.stdout.write(self.style.SUCCESS('  MISE À JOUR SERVICES MÉDICAUX - CENTRE DE SANTÉ JULIANNA'))
        self.stdout.write(f'  Tarifs 2026 - {"[DRY RUN]" if dry_run else "[MODE RÉEL]"}')
        self.stdout.write('=' * 70)

        org = self._find_organization(org_name)
        self.stdout.write(f'\n✓ Organisation : {org.name}')

        stats = {'updated': 0, 'unchanged': 0, 'not_found': 0}

        try:
            with transaction.atomic():
                self.stdout.write('\n── Mise à jour des services ───────────────────────────────────')
                for svc in MEDICAL_SERVICES:
                    self._process_service(org, svc, stats, dry_run)

                if dry_run:
                    raise transaction.TransactionManagementError('DRY RUN - Rollback')

        except transaction.TransactionManagementError:
            pass
        except Exception as e:
            raise CommandError(f'Erreur : {e}')

        self._print_summary(stats, dry_run)

    def _find_organization(self, org_name):
        if org_name:
            try:
                return Organization.objects.get(name__iexact=org_name)
            except Organization.DoesNotExist:
                raise CommandError(f'Organisation introuvable : "{org_name}"')
        orgs = Organization.objects.filter(name__icontains='julianna')
        if not orgs.exists():
            raise CommandError('Organisation JULIANNA introuvable.')
        if orgs.count() > 1:
            names = ', '.join(orgs.values_list('name', flat=True))
            raise CommandError(f'Plusieurs organisations : {names}. Utilisez --org-name.')
        return orgs.first()

    def _process_service(self, org, svc_data, stats, dry_run):
        name = svc_data['name']
        new_price = svc_data['price']

        try:
            product = Product.objects.get(
                organization=org,
                name__iexact=name,
                product_type='service',
            )
            old_price = int(product.price)
            if old_price != new_price:
                if not dry_run:
                    product.price = new_price
                    product.save(update_fields=['price'])
                self.stdout.write(
                    f'  ✎ {name[:50]:<50} {old_price:>7,} → {new_price:>7,} FCFA'
                )
                stats['updated'] += 1
            else:
                stats['unchanged'] += 1

        except Product.DoesNotExist:
            self.stdout.write(self.style.WARNING(
                f'  ? {name[:50]:<50} — NON TROUVÉ en base'
            ))
            stats['not_found'] += 1
        except Product.MultipleObjectsReturned:
            products = Product.objects.filter(
                organization=org,
                name__iexact=name,
                product_type='service',
            )
            for product in products:
                if not dry_run:
                    product.price = new_price
                    product.save(update_fields=['price'])
            self.stdout.write(
                f'  ✎ {name[:50]:<50} → {new_price:>7,} FCFA (doublon mis à jour)'
            )
            stats['updated'] += 1

    def _print_summary(self, stats, dry_run):
        prefix = '[DRY RUN] ' if dry_run else ''
        self.stdout.write('\n' + '=' * 70)
        self.stdout.write(self.style.SUCCESS(f'  {prefix}RÉSUMÉ'))
        self.stdout.write('=' * 70)
        self.stdout.write(f'  ✎ Services mis à jour  : {stats["updated"]}')
        self.stdout.write(f'  = Services inchangés   : {stats["unchanged"]}')
        self.stdout.write(f'  ? Non trouvés en base  : {stats["not_found"]}')
        self.stdout.write('')
        if dry_run:
            self.stdout.write(self.style.WARNING('  Mode DRY RUN : aucune modification enregistrée.'))
            self.stdout.write('  Relancez sans --dry-run pour appliquer.')
        else:
            self.stdout.write(self.style.SUCCESS('  ✓ Services mis à jour avec succès !'))
        self.stdout.write('=' * 70)
