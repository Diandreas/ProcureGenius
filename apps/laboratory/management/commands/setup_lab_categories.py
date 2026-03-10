"""
Management command to:
1. Create the "Hémostase" category and move HEM-TP test into it.
2. Move all tests from "Ionogrammes" and "Électrophorèses" categories to "Biochimie".
3. Delete (or deactivate) the empty Ionogrammes and Électrophorèses categories.

Usage:
    python manage.py setup_lab_categories
    python manage.py setup_lab_categories --org-id <uuid>   # specific org only
"""
from django.core.management.base import BaseCommand
from apps.laboratory.models import LabTestCategory, LabTest


class Command(BaseCommand):
    help = 'Set up Hémostase category and migrate Ionogrammes/Électrophorèses to Biochimie'

    def add_arguments(self, parser):
        parser.add_argument(
            '--org-id',
            type=str,
            default=None,
            help='Restrict to a specific organization UUID',
        )

    def handle(self, *args, **options):
        from apps.accounts.models import Organization

        org_id = options.get('org_id')
        if org_id:
            orgs = Organization.objects.filter(id=org_id)
        else:
            orgs = Organization.objects.all()

        for org in orgs:
            self.stdout.write(f'\n=== Organisation: {org.name} ===')
            self._setup_hemostase(org)
            self._migrate_to_biochimie(org)

        self.stdout.write(self.style.SUCCESS('\nTerminé.'))

    def _setup_hemostase(self, org):
        """Create Hémostase category and move coagulation test into it."""
        hemostase_cat, created = LabTestCategory.objects.get_or_create(
            organization=org,
            name='Hémostase',
            defaults={
                'description': 'Examens d\'hémostase et coagulation (TP, TCA, INR, Fibrinogène)',
                'is_active': True,
                'display_order': 30,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  [+] Catégorie "Hémostase" créée'))
        else:
            self.stdout.write(f'  [=] Catégorie "Hémostase" existe déjà')

        # Move HEM-TP from Hématologie to Hémostase
        moved = LabTest.objects.filter(
            organization=org,
            test_code='HEM-TP',
        ).exclude(category=hemostase_cat).update(category=hemostase_cat)

        if moved:
            self.stdout.write(self.style.SUCCESS(f'  [>] HEM-TP déplacé vers "Hémostase" ({moved} test(s))'))
        else:
            self.stdout.write(f'  [=] HEM-TP déjà dans "Hémostase" ou introuvable')

    def _migrate_to_biochimie(self, org):
        """Move Ionogrammes and Électrophorèses tests to Biochimie, then delete empty categories."""
        # Find Biochimie category
        biochimie_cat = LabTestCategory.objects.filter(
            organization=org,
            name__icontains='biochimie',
        ).first()

        if not biochimie_cat:
            self.stdout.write(self.style.WARNING(
                '  [!] Catégorie "Biochimie" introuvable — skipping migration Ionogrammes/Électrophorèses'
            ))
            return

        self.stdout.write(f'  [=] Biochimie trouvée: "{biochimie_cat.name}"')

        categories_to_remove = []

        # Categories to migrate away
        for cat_name_fragment in ['ionogramme', 'électrophorès', 'electrophorès']:
            cats = LabTestCategory.objects.filter(
                organization=org,
                name__icontains=cat_name_fragment,
            ).exclude(id=biochimie_cat.id)

            for cat in cats:
                count = LabTest.objects.filter(organization=org, category=cat).count()
                moved = LabTest.objects.filter(organization=org, category=cat).update(category=biochimie_cat)
                self.stdout.write(self.style.SUCCESS(
                    f'  [>] {moved} test(s) de "{cat.name}" déplacé(s) vers Biochimie'
                ))
                if cat not in categories_to_remove:
                    categories_to_remove.append(cat)

        # Delete now-empty categories
        for cat in categories_to_remove:
            remaining = LabTest.objects.filter(organization=org, category=cat).count()
            if remaining == 0:
                name = cat.name
                cat.delete()
                self.stdout.write(self.style.SUCCESS(f'  [-] Catégorie "{name}" supprimée'))
            else:
                cat.is_active = False
                cat.save(update_fields=['is_active'])
                self.stdout.write(self.style.WARNING(
                    f'  [~] Catégorie "{cat.name}" désactivée ({remaining} test(s) restant)'
                ))
