"""
Charge un dump JSON (loaddata) en neutralisant TOUS les signaux post_save/pre_save
et les effets de bord des save() override liés aux signaux.

Indispensable pour une migration SQLite -> PostgreSQL sans perte : certains
signaux (journalisation d'activité, recalculs, accès à des FK pas encore chargées
comme PurchaseOrder.supplier) plantent ou polluent les données pendant un loaddata.

Usage:
    python manage.py loaddata_nosignals backups/dump_pk.XXXX.json
"""
from django.core.management.base import BaseCommand, CommandError
from django.core.management import call_command
from django.db.models.signals import (
    pre_save, post_save, pre_delete, post_delete, m2m_changed,
)


class Command(BaseCommand):
    help = "loaddata avec tous les signaux Django déconnectés (migration sans effets de bord)."

    def add_arguments(self, parser):
        parser.add_argument('fixtures', nargs='+', type=str)

    def handle(self, *args, **options):
        fixtures = options['fixtures']

        signals = [pre_save, post_save, pre_delete, post_delete, m2m_changed]
        saved = {}

        # Sauvegarder puis vider les receivers de chaque signal
        for sig in signals:
            saved[sig] = sig.receivers[:]
            sig.receivers = []
            # Vider aussi le cache de lookup interne
            try:
                sig.sender_receivers_cache.clear()
            except Exception:
                pass

        self.stdout.write("Signaux déconnectés. Chargement en cours...")
        try:
            call_command('loaddata', *fixtures, verbosity=1)
        finally:
            # Reconnecter les receivers d'origine quoi qu'il arrive
            for sig in signals:
                sig.receivers = saved[sig]
                try:
                    sig.sender_receivers_cache.clear()
                except Exception:
                    pass
            self.stdout.write("Signaux reconnectés.")

        self.stdout.write(self.style.SUCCESS("Chargement terminé (sans signaux)."))
