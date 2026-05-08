"""
Management command to merge two patient records.

Usage:
    python manage.py merge_patient --primary <UUID> --secondary <UUID>
    python manage.py merge_patient --primary <UUID> --secondary <UUID> --dry-run
"""
from django.core.management.base import BaseCommand, CommandError
from apps.patients.services import merge_patients


class Command(BaseCommand):
    help = 'Merge two patient records: move all data from secondary into primary, then soft-delete secondary.'

    def add_arguments(self, parser):
        parser.add_argument('--primary', type=str, required=True,
                            help='UUID of the patient to KEEP (primary)')
        parser.add_argument('--secondary', type=str, required=True,
                            help='UUID of the patient to MERGE INTO primary (will be soft-deleted)')
        parser.add_argument('--dry-run', action='store_true', default=False,
                            help='Preview changes without applying them')

    def handle(self, *args, **options):
        primary_id = options['primary']
        secondary_id = options['secondary']
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('=== DRY-RUN MODE — No changes will be saved ===\n'))

        try:
            result = merge_patients(
                primary_id=primary_id,
                secondary_id=secondary_id,
                user=None,
                dry_run=dry_run,
            )
        except Exception as e:
            raise CommandError(f'Merge failed: {e}')

        self.stdout.write(f"\nPrimary (kept):   {result['primary']['name']}  ({result['primary']['id']})")
        self.stdout.write(f"Secondary (merged): {result['secondary']['name']}  ({result['secondary']['id']})\n")

        if result['reassigned']:
            self.stdout.write(self.style.NOTICE('Records reassigned:'))
            for label, count in result['reassigned'].items():
                self.stdout.write(f'  {label}: {count}')
        else:
            self.stdout.write(self.style.WARNING('No records to reassign.'))

        self.stdout.write(f"\nTotal: {result['total_reassigned']} records\n")

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY-RUN complete. Run without --dry-run to apply changes.'))
        else:
            self.stdout.write(self.style.SUCCESS('Merge completed successfully.'))
