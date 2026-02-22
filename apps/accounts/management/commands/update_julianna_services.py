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
from apps.invoicing.models import Product


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

    # Variantes de noms pour les services dont le nom a changé en base
    NAME_ALIASES = {
        'Consultation Infirmière':        ['Consultation Infirmier', 'Consultation infirmier'],
        'KIT Drap pour lit':              ['Drap pour lit', 'Kit drap pour lit'],
        'Forfait concentrateur par heure':['Forfait concentrateur / Heure', 'Concentrateur/Heure', 'Forfait concentrateur/Heure'],
        'Ponction pleurale':              ['Ponction pleural', 'Ponction Pleural'],
        'Nébulisation':                   ['Nebulisation', 'Nébulisation'],
        "Ponction d'ascite":              ["Ponction d'ascite", 'Ponction ascite'],
        'Petite chéloïdectomie':          ['Petite cheloïdectomie', 'Petite cheloidectomie', 'Petite Cheloïdectomie'],
        'Circoncision':                   ['Circonsition', 'Circoncision'],
        'Injection simple externe':       ['Injection simple', 'Injection Simple'],
        'Hospitalisation par jour':       ['Hospitalisation/jour', 'Hospitalisation jour'],
    }

    def _find_product(self, org, name):
        """Cherche un service par nom exact ou par alias."""
        # 1. Essai exact
        qs = Product.objects.filter(organization=org, name__iexact=name, product_type='service')
        if qs.exists():
            return qs

        # 2. Essai avec les alias
        for alias in self.NAME_ALIASES.get(name, []):
            qs = Product.objects.filter(organization=org, name__iexact=alias, product_type='service')
            if qs.exists():
                return qs

        # 3. Recherche partielle (mots-clés du nom)
        keywords = [w for w in name.split() if len(w) > 4]
        if keywords:
            qs = Product.objects.filter(organization=org, product_type='service')
            for kw in keywords[:2]:
                qs = qs.filter(name__icontains=kw)
            if qs.count() == 1:
                return qs

        return Product.objects.none()

    def _process_service(self, org, svc_data, stats, dry_run):
        name = svc_data['name']
        new_price = svc_data['price']

        products = self._find_product(org, name)

        if not products.exists():
            self.stdout.write(self.style.WARNING(
                f'  ? {name[:50]:<50} — NON TROUVE en base'
            ))
            stats['not_found'] += 1
            return

        for product in products:
            old_price = int(product.price)
            old_name = product.name
            if old_price != new_price or old_name != name:
                if not dry_run:
                    product.price = new_price
                    product.name = name
                    product.save(update_fields=['price', 'name'])
                label = f'{old_name[:40]} → {name[:40]}' if old_name != name else name[:50]
                self.stdout.write(
                    f'  [OK] {label:<55} {old_price:>7,} → {new_price:>7,} FCFA'
                )
                stats['updated'] += 1
            else:
                stats['unchanged'] += 1

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
