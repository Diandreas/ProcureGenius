"""
Django Management Command: Mise à jour du catalogue d'analyses du Centre de Santé JULIANNA

Usage:
    python manage.py update_julianna_lab_catalog
    python manage.py update_julianna_lab_catalog --dry-run
    python manage.py update_julianna_lab_catalog --deactivate-removed

Ce script :
  - Met à jour les prix 2026 de tous les tests existants
  - Crée les nouveaux tests absents du catalogue actuel
  - (optionnel) Désactive les tests retirés du catalogue officiel

Source: Liste Analyses Médicales - CSJ version finale (tarifs 2026)
"""

import os
import sys
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

sys.path.append(os.path.dirname(__file__))
from julianna_tests_config import LAB_TESTS, LAB_CATEGORIES, DEACTIVATED_TEST_CODES

from apps.accounts.models import Organization
from apps.laboratory.models import LabTest, LabTestCategory


# Mapping container depuis le config vers les choix du modèle
CONTAINER_MAP = {
    'serum': 'serum',
    'edta': 'edta',
    'citrate': 'citrate',
    'heparin': 'heparin',
    'fluoride': 'fluoride',
    'urine_cup': 'urine_cup',
    'urine_24h': 'urine_cup',
    'stool_cup': 'stool_cup',
    'sterile': 'other',
    'swab_kit': 'swab_kit',
    'other': 'other',
    'multiple': 'other',
}


class Command(BaseCommand):
    help = 'Met à jour le catalogue d\'analyses médicales du Centre de Santé JULIANNA (tarifs 2026)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Afficher les changements sans les appliquer en base',
        )
        parser.add_argument(
            '--deactivate-removed',
            action='store_true',
            help='Désactiver les tests retirés du catalogue officiel 2026',
        )
        parser.add_argument(
            '--org-name',
            type=str,
            default='',
            help='Nom de l\'organisation (cherche JULIANNA par défaut)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        deactivate_removed = options['deactivate_removed']
        org_name = options['org_name']

        self.stdout.write('=' * 70)
        self.stdout.write(self.style.SUCCESS('  MISE À JOUR CATALOGUE ANALYSES - CENTRE DE SANTÉ JULIANNA'))
        self.stdout.write(f'  Tarifs 2026 - {"[DRY RUN - Aucune modification]" if dry_run else "[MODE RÉEL]"}')
        self.stdout.write('=' * 70)

        # Trouver l'organisation
        org = self._find_organization(org_name)
        self.stdout.write(f'\n✓ Organisation trouvée : {org.name}')

        # Statistiques
        stats = {
            'updated': 0,
            'created': 0,
            'unchanged': 0,
            'deactivated': 0,
            'errors': 0,
        }

        try:
            with transaction.atomic():
                # 1. S'assurer que les catégories existent
                categories = self._ensure_categories(org, dry_run)

                # 2. Traiter chaque test du catalogue
                self.stdout.write('\n── Mise à jour des analyses ──────────────────────────────────')
                for test_data in LAB_TESTS:
                    try:
                        self._process_test(org, test_data, categories, stats, dry_run)
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f'  ✗ ERREUR [{test_data["code"]}]: {e}'))
                        stats['errors'] += 1

                # 3. Désactiver les tests retirés si demandé
                if deactivate_removed:
                    self.stdout.write('\n── Désactivation des tests retirés ───────────────────────────')
                    for code in DEACTIVATED_TEST_CODES:
                        self._deactivate_test(org, code, stats, dry_run)

                if dry_run:
                    raise transaction.TransactionManagementError('DRY RUN - Rollback')

        except transaction.TransactionManagementError:
            pass  # Rollback intentionnel en dry-run
        except Exception as e:
            raise CommandError(f'Erreur inattendue : {e}')

        # Résumé
        self._print_summary(stats, dry_run, deactivate_removed)

    def _find_organization(self, org_name):
        """Cherche l'organisation JULIANNA."""
        if org_name:
            try:
                return Organization.objects.get(name__iexact=org_name)
            except Organization.DoesNotExist:
                raise CommandError(f'Organisation introuvable : "{org_name}"')

        # Cherche par JULIANNA
        orgs = Organization.objects.filter(name__icontains='JULIANNA')
        if not orgs.exists():
            orgs = Organization.objects.filter(name__icontains='julianna')
        if not orgs.exists():
            raise CommandError(
                'Organisation JULIANNA introuvable. '
                'Utilisez --org-name pour spécifier le nom exact.'
            )
        if orgs.count() > 1:
            names = ', '.join(orgs.values_list('name', flat=True))
            raise CommandError(
                f'Plusieurs organisations trouvées : {names}. '
                f'Utilisez --org-name pour préciser.'
            )
        return orgs.first()

    def _ensure_categories(self, org, dry_run):
        """Crée les catégories manquantes et retourne un dict slug→instance."""
        categories = {}
        for cat_data in LAB_CATEGORIES:
            if not dry_run:
                cat, created = LabTestCategory.objects.get_or_create(
                    organization=org,
                    slug=cat_data['slug'],
                    defaults={
                        'name': cat_data['name'],
                        'display_order': cat_data['order'],
                        'is_active': True,
                    }
                )
                if created:
                    self.stdout.write(f'  + Catégorie créée : {cat.name}')
                categories[cat_data['slug']] = cat
            else:
                # En dry-run : utiliser ce qui existe ou créer un objet fictif
                try:
                    cat = LabTestCategory.objects.get(organization=org, slug=cat_data['slug'])
                except LabTestCategory.DoesNotExist:
                    # Créer temporairement pour dry-run (sera rollbacké)
                    cat = LabTestCategory(
                        organization=org,
                        name=cat_data['name'],
                        slug=cat_data['slug'],
                        display_order=cat_data['order'],
                    )
                categories[cat_data['slug']] = cat
        return categories

    def _process_test(self, org, test_data, categories, stats, dry_run):
        """Met à jour ou crée un test. Retourne True si modifié."""
        code = test_data['code']
        category_slug = test_data.get('category', '')
        category = categories.get(category_slug)

        container = CONTAINER_MAP.get(test_data.get('container', 'other'), 'other')

        defaults = {
            'name': test_data['name'],
            'short_name': test_data.get('short_name', test_data['name'][:50]),
            'category': category,
            'price': test_data['price'],
            'sample_type': test_data.get('sample_type', 'blood'),
            'container_type': container,
            'sample_volume': test_data.get('sample_volume', ''),
            'fasting_required': test_data.get('fasting', False),
            'fasting_hours': test_data.get('fasting_hours') or None,
            'estimated_turnaround_hours': test_data.get('turnaround', 24),
            'unit_of_measurement': test_data.get('unit', ''),
            'normal_range_male': test_data.get('normal_male', ''),
            'normal_range_female': test_data.get('normal_female', ''),
            'normal_range_child': test_data.get('normal_child', ''),
            'normal_range_general': test_data.get('normal_general', ''),
            'methodology': test_data.get('methodology', ''),
            'is_active': True,
        }

        try:
            existing = LabTest.objects.get(organization=org, test_code=code)

            # Comparer prix (changement le plus important)
            old_price = int(existing.price)
            new_price = int(defaults['price'])
            price_changed = old_price != new_price

            changes = []
            if price_changed:
                changes.append(f'prix {old_price:,} → {new_price:,} FCFA')
            if existing.name != defaults['name']:
                changes.append('nom')
            if not existing.is_active:
                changes.append('réactivé')

            if changes:
                if not dry_run:
                    for field, value in defaults.items():
                        setattr(existing, field, value)
                    existing.save()
                change_str = ', '.join(changes)
                self.stdout.write(f'  ✎ [{code}] {existing.name[:45]:<45} — {change_str}')
                stats['updated'] += 1
            else:
                stats['unchanged'] += 1

        except LabTest.DoesNotExist:
            if not dry_run:
                LabTest.objects.create(
                    organization=org,
                    test_code=code,
                    **defaults
                )
            self.stdout.write(self.style.SUCCESS(
                f'  + [{code}] {defaults["name"][:45]:<45} — NOUVEAU ({defaults["price"]:,} FCFA)'
            ))
            stats['created'] += 1

    def _deactivate_test(self, org, code, stats, dry_run):
        """Désactive un test retiré du catalogue."""
        try:
            test = LabTest.objects.get(organization=org, test_code=code, is_active=True)
            if not dry_run:
                test.is_active = False
                test.save()
            self.stdout.write(self.style.WARNING(
                f'  ✗ [{code}] {test.name[:50]:<50} — DÉSACTIVÉ'
            ))
            stats['deactivated'] += 1
        except LabTest.DoesNotExist:
            pass  # Déjà inactif ou inexistant

    def _print_summary(self, stats, dry_run, deactivate_removed):
        prefix = '[DRY RUN] ' if dry_run else ''
        self.stdout.write('\n' + '=' * 70)
        self.stdout.write(self.style.SUCCESS(f'  {prefix}RÉSUMÉ'))
        self.stdout.write('=' * 70)
        self.stdout.write(f'  ✎ Tests mis à jour    : {stats["updated"]}')
        self.stdout.write(f'  + Tests créés         : {stats["created"]}')
        self.stdout.write(f'  = Tests inchangés     : {stats["unchanged"]}')
        if deactivate_removed:
            self.stdout.write(f'  ✗ Tests désactivés    : {stats["deactivated"]}')
        if stats['errors']:
            self.stdout.write(self.style.ERROR(f'  ✗ Erreurs             : {stats["errors"]}'))
        self.stdout.write('')
        if dry_run:
            self.stdout.write(self.style.WARNING(
                '  Mode DRY RUN : aucune modification enregistrée en base.'
            ))
            self.stdout.write('  Relancez sans --dry-run pour appliquer les changements.')
        else:
            self.stdout.write(self.style.SUCCESS('  ✓ Catalogue mis à jour avec succès !'))
        self.stdout.write('=' * 70)
