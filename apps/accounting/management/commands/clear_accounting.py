"""
Vide complètement le plan comptable et les écritures d'une organisation.
Usage: python manage.py clear_accounting
       python manage.py clear_accounting --org-id <uuid>
       python manage.py clear_accounting --entries-only   (écritures seulement, garde les comptes)
       python manage.py clear_accounting --accounts-only  (comptes seulement, supprime les écritures d'abord)
"""
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = 'Vide le plan comptable et/ou les écritures comptables'

    def add_arguments(self, parser):
        parser.add_argument('--org-id', type=str, help='UUID de l\'organisation (défaut: première org)')
        parser.add_argument('--entries-only', action='store_true', help='Supprimer seulement les écritures')
        parser.add_argument('--accounts-only', action='store_true', help='Supprimer seulement les comptes (et leurs écritures)')
        parser.add_argument('--force', action='store_true', help='Ne pas demander confirmation')

    def handle(self, *args, **options):
        from apps.accounting.models import Account, AccountingJournal, JournalEntry, JournalEntryLine
        from apps.accounts.models import Organization

        # Trouver l'organisation
        org_id = options.get('org_id')
        if org_id:
            try:
                org = Organization.objects.get(pk=org_id)
            except Organization.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Organisation {org_id} introuvable'))
                return
        else:
            org = Organization.objects.first()
            if not org:
                self.stdout.write(self.style.ERROR('Aucune organisation trouvée'))
                return

        self.stdout.write(f'Organisation : {org.name}')

        entries_only = options['entries_only']
        accounts_only = options['accounts_only']

        # Compter avant
        n_entries = JournalEntry.objects.filter(organization=org).count()
        n_accounts = Account.objects.filter(organization=org).count()
        n_journals = AccountingJournal.objects.filter(organization=org).count()

        self.stdout.write(f'  Écritures    : {n_entries}')
        self.stdout.write(f'  Comptes      : {n_accounts}')
        self.stdout.write(f'  Journaux     : {n_journals}')

        if not options['force']:
            if entries_only:
                msg = f'\nSupprimer les {n_entries} écritures ? (oui/non) : '
            elif accounts_only:
                msg = f'\nSupprimer les {n_accounts} comptes et {n_entries} écritures ? (oui/non) : '
            else:
                msg = f'\nTOUT supprimer ({n_accounts} comptes, {n_journals} journaux, {n_entries} écritures) ? (oui/non) : '
            confirm = input(msg)
            if confirm.strip().lower() not in ('oui', 'o', 'yes', 'y'):
                self.stdout.write('Annulé.')
                return

        with transaction.atomic():
            # Toujours supprimer les écritures en premier (FK)
            deleted_lines = JournalEntryLine.objects.filter(entry__organization=org).delete()[0]
            deleted_entries = JournalEntry.objects.filter(organization=org).delete()[0]
            self.stdout.write(self.style.SUCCESS(f'  ✓ {deleted_entries} écritures supprimées ({deleted_lines} lignes)'))

            if not entries_only:
                deleted_accounts = Account.objects.filter(organization=org).delete()[0]
                self.stdout.write(self.style.SUCCESS(f'  ✓ {deleted_accounts} comptes supprimés'))

                if not accounts_only:
                    deleted_journals = AccountingJournal.objects.filter(organization=org).delete()[0]
                    self.stdout.write(self.style.SUCCESS(f'  ✓ {deleted_journals} journaux supprimés'))

        self.stdout.write(self.style.SUCCESS('\nTerminé. Relancez setup_accounting pour recréer le plan de base.'))
        self.stdout.write('  python manage.py setup_accounting')
