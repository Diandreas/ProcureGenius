"""
Commande planifiée : réinitialise les compteurs d'utilisation mensuels.

À exécuter le 1er de chaque mois (cron / tâche planifiée) :
    python manage.py reset_monthly_quotas

Sans cette remise à zéro, les quotas mensuels (factures, bons de commande,
requêtes IA) ne repartent jamais et les organisations restent bloquées
définitivement une fois la limite atteinte.
"""
from django.core.management.base import BaseCommand

from apps.subscriptions.models import Subscription


class Command(BaseCommand):
    help = "Réinitialise les compteurs mensuels (factures, BC, requêtes IA) de tous les abonnements."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Affiche ce qui serait fait sans modifier la base.",
        )

    def handle(self, *args, **options):
        qs = Subscription.objects.all()
        count = qs.count()

        if options['dry_run']:
            self.stdout.write(f"[dry-run] {count} abonnement(s) seraient réinitialisés.")
            return

        # Remise à zéro en une seule requête (atomique, pas de boucle Python).
        updated = qs.update(
            invoices_this_month=0,
            purchase_orders_this_month=0,
            ai_requests_this_month=0,
        )
        self.stdout.write(self.style.SUCCESS(
            f"{updated} abonnement(s) : compteurs mensuels réinitialisés."
        ))
