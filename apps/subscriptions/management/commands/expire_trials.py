"""
Commande planifiée : ramène au plan gratuit les essais expirés.

À exécuter quotidiennement (cron / tâche planifiée) :
    python manage.py expire_trials

Modèle « essai sans carte » : pendant l'essai, l'organisation a les
fonctionnalités du plan Pro. Une fois `trial_ends_at` dépassé et sans paiement
Stripe (statut toujours `trial`), on redescend au plan gratuit. L'utilisateur
peut alors souscrire via Stripe pour retrouver les fonctionnalités payantes.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.subscriptions.models import Subscription


class Command(BaseCommand):
    help = "Ramène au plan gratuit les abonnements dont l'essai gratuit a expiré."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Affiche ce qui serait fait sans modifier la base.",
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()

        expired = Subscription.objects.filter(
            status='trial',
            trial_ends_at__lt=now,
        ).select_related('organization', 'plan')

        count = expired.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS("Aucun essai expiré à traiter."))
            return

        for sub in expired:
            label = f"{sub.organization.name} ({sub.plan.code} → free)"
            if dry_run:
                self.stdout.write(f"[dry-run] {label}")
                continue
            if sub.downgrade_to_free():
                self.stdout.write(self.style.WARNING(f"Rétrogradé : {label}"))
            else:
                self.stdout.write(self.style.ERROR(
                    f"Échec (plan gratuit introuvable) : {sub.organization.name}"
                ))

        action = "seraient rétrogradés" if dry_run else "rétrogradés"
        self.stdout.write(self.style.SUCCESS(f"\n{count} essai(s) expiré(s) {action}."))
