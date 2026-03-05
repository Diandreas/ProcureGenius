"""
Management command to seed NFS (Numération Formule Sanguine / Complete Blood Count)
parameters for all active LabTest objects whose test_code or name matches "NFS" / "CBC".

Usage:
    python manage.py seed_nfs_parameters
    python manage.py seed_nfs_parameters --test-code NFS-001
    python manage.py seed_nfs_parameters --overwrite   # Replace existing parameters
"""
from django.core.management.base import BaseCommand
from apps.laboratory.models import LabTest, LabTestParameter


# Full NFS parameter definitions with adult M/F reference ranges
NFS_PARAMETERS = [
    # (code, name, group, unit, ord, min_M, max_M, min_F, max_F, crit_low, crit_high)
    ("WBC",  "WBC",  "Hématologie – Numération formule sanguine", "10^9/L", 1,  4.00,  10.00,  4.00,  10.00, 2.0,   30.0),
    ("LYM#", "LYM#", "Hématologie – Numération formule sanguine", "10^9/L", 2,  1.00,   5.00,  1.00,   5.00, None,  None),
    ("MID#", "MID#", "Hématologie – Numération formule sanguine", "10^9/L", 3,  0.10,   1.00,  0.10,   1.00, None,  None),
    ("GRA#", "GRA#", "Hématologie – Numération formule sanguine", "10^9/L", 4,  2.00,   7.00,  2.00,   7.00, None,  None),
    ("LYM%", "LYM%", "Hématologie – Numération formule sanguine", "%",      5, 20.0,   50.0,  20.0,   50.0, None,  None),
    ("MID%", "MID%", "Hématologie – Numération formule sanguine", "%",      6,  3.0,   10.0,   3.0,   10.0, None,  None),
    ("GRA%", "GRA%", "Hématologie – Numération formule sanguine", "%",      7, 40.0,   70.0,  40.0,   70.0, None,  None),

    ("RBC",  "RBC",  "Globules rouges", "10^12/L", 8,  4.00,   6.00,  4.00,   6.00, 2.0,   7.0),
    ("HGB",  "HGB",  "Globules rouges", "g/L",    9, 130.0,  175.0, 130.0,  175.0, 70.0, 200.0),
    ("HCT",  "HCT",  "Globules rouges", "%",      10, 40.0,  50.0,  40.0,  50.0, None,  None),
    ("MCV",  "MCV",  "Globules rouges", "fL",     11, 80.0, 100.0,  80.0, 100.0, None,  None),
    ("MCH",  "MCH",  "Globules rouges", "pg",     12, 26.0,  34.0,  26.0,  34.0, None,  None),
    ("MCHC", "MCHC", "Globules rouges", "g/L",    13, 310.0, 550.0, 310.0, 550.0, None,  None),
    ("RDWc", "RDW-CV", "Globules rouges", "%",    14, 11.6,  14.4,  11.6,  14.4, None,  None),
    ("RDWs", "RDW-SD", "Globules rouges", "fL",   15, 35.1,  43.9,  35.1,  43.9, None,  None),

    ("PLT",  "PLT",  "Plaquettes", "10^9/L", 16, 150.0, 400.0, 150.0, 400.0, 50.0, 1000.0),
    ("MPV",  "MPV",  "Plaquettes", "fL",     17,  7.6,  13.2,   7.6,  13.2, None,  None),
    ("PDW",  "PDW",  "Plaquettes", "%",      18,  9.0,  17.0,   9.0,  17.0, None,  None),
    ("PCT",  "PCT",  "Plaquettes", "%",      19,  0.120, 0.212, 0.120, 0.212, None, None),
    ("PLCC", "PLCC", "Plaquettes", "10^9/L", 20, 30.0,  90.0,  30.0,  90.0, None,  None),
    ("PLCR", "PLCR", "Plaquettes", "%",      21, 13.0,  43.0,  13.0,  43.0, None,  None),
]


class Command(BaseCommand):
    help = (
        "Seed or Update NFS (CBC) sub-parameters for LabTest objects matching 'NFS' or 'CBC'. "
        "Use --test-code to target a specific test."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--test-code',
            type=str,
            default=None,
            help="Target a specific LabTest by test_code (e.g. NFS-001). "
                 "If omitted, all tests whose code or name contains 'NFS' or 'CBC' are updated.",
        )
        parser.add_argument(
            '--overwrite',
            action='store_true',
            default=False,
            help="Delete existing parameters before re-creating them (Warning: breaks existing results).",
        )

    def handle(self, *args, **options):
        test_code = options['test_code']
        overwrite = options['overwrite']

        if test_code:
            tests = LabTest.objects.filter(test_code__iexact=test_code)
        else:
            from django.db.models import Q
            tests = LabTest.objects.filter(
                Q(test_code__icontains='NFS') | Q(test_code__icontains='CBC') |
                Q(name__icontains='NFS') | Q(name__icontains='Numération')
            )

        if not tests.exists():
            self.stdout.write(self.style.WARNING("No matching LabTest found. Use --test-code to target a specific test."))
            return

        for test in tests:
            self.stdout.write(f"\nProcessing: {test.test_code} — {test.name} (org: {test.organization})")

            if overwrite:
                deleted_count, _ = test.parameters.all().delete()
                self.stdout.write(f"  Deleted {deleted_count} existing parameters.")

            created_count = 0
            updated_count = 0
            for (code, name, group, unit, order, min_m, max_m, min_f, max_f, crit_low, crit_high) in NFS_PARAMETERS:
                obj, was_created = LabTestParameter.objects.update_or_create(
                    test=test,
                    code=code,
                    defaults={
                        'name': name,
                        'group_name': group,
                        'unit': unit,
                        'display_order': order,
                        'value_type': 'numeric',
                        'decimal_places': 3 if code in ('PCT',) else 2,
                        'is_required': True,
                        'adult_ref_min_male': min_m,
                        'adult_ref_max_male': max_m,
                        'adult_ref_min_female': min_f,
                        'adult_ref_max_female': max_f,
                        'critical_low': crit_low,
                        'critical_high': crit_high,
                    }
                )
                if was_created:
                    created_count += 1
                else:
                    updated_count += 1

            self.stdout.write(self.style.SUCCESS(
                f"  OK: {created_count} parameter(s) created, {updated_count} updated."
            ))

        self.stdout.write(self.style.SUCCESS("\nDone. Parameters have been synchronized."))

