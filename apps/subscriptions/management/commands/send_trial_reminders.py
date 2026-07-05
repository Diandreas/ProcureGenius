"""
Commande planifiée : relances email avant fin d'essai gratuit (J-7 et J-1).

À exécuter quotidiennement (cron) :
    python manage.py send_trial_reminders
    python manage.py send_trial_reminders --dry-run

Sans carte enregistrée, un essai qui arrive à échéance bascule
silencieusement vers le plan gratuit (cf. expire_trials) — sans email de
relance, l'utilisateur n'a aucun signal avant de perdre l'accès aux
fonctionnalités payantes. C'est la fenêtre de conversion la plus rentable
du parcours (utilisateur déjà actif, juste avant la coupure).

Idempotence : deux booléens dédiés (trial_reminder_7d_sent/1d_sent) évitent
tout doublon si le cron est rejoué le même jour.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.subscriptions.models import Subscription


class Command(BaseCommand):
    help = "Envoie les relances email J-7/J-1 avant fin d'essai gratuit."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help="Affiche ce qui serait envoyé sans rien envoyer.")

    def handle(self, *args, **options):
        from apps.core.email_utils import send_trial_ending_email

        dry_run = options['dry_run']
        today = timezone.localdate()
        sent_7d = 0
        sent_1d = 0
        skipped_no_admin = 0

        trials = Subscription.objects.filter(
            status='trial', trial_ends_at__isnull=False,
        ).select_related('organization', 'plan')

        for sub in trials:
            days_left = (sub.trial_ends_at.date() - today).days

            if days_left == 7 and not sub.trial_reminder_7d_sent:
                level, flag = 7, 'trial_reminder_7d_sent'
            elif days_left == 1 and not sub.trial_reminder_1d_sent:
                level, flag = 1, 'trial_reminder_1d_sent'
            else:
                continue

            admin = sub.organization.users.filter(role='admin', is_active=True).first()
            if not admin or not admin.email:
                skipped_no_admin += 1
                self.stdout.write(self.style.WARNING(
                    f"  {sub.organization.name} : aucun admin avec email, relance J-{level} ignorée"
                ))
                continue

            if dry_run:
                self.stdout.write(f"[dry-run] J-{level} -> {admin.email} ({sub.organization.name})")
            else:
                ok = send_trial_ending_email(admin, sub.organization, sub.plan.name, level)
                if ok:
                    setattr(sub, flag, True)
                    sub.save(update_fields=[flag])

            if level == 7:
                sent_7d += 1
            else:
                sent_1d += 1

        action = "seraient envoyée(s)" if dry_run else "envoyée(s)"
        self.stdout.write(self.style.SUCCESS(
            f"\n{sent_7d} relance(s) J-7 {action}, {sent_1d} relance(s) J-1 {action}, "
            f"{skipped_no_admin} ignorée(s) (pas d'admin)."
        ))
