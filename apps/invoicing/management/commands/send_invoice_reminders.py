"""
Commande planifiée : relances automatiques des factures impayées (dunning).

À exécuter quotidiennement (cron) :
    python manage.py send_invoice_reminders
    python manage.py send_invoice_reminders --dry-run   # simulation, aucun envoi
    python manage.py send_invoice_reminders --limit 200  # borne le nb d'envois

Principe : pour chaque organisation ayant activé `auto_reminders_enabled`
(désactivé par défaut — opt-in explicite), on relance les factures échues et
non soldées selon 3 paliers configurables (`reminder_delay_1/2/3`, en jours
après échéance), jusqu'à `reminder_max_count` relances.

Garde-fous :
  - opt-in par organisation ET opt-out par facture (`reminders_disabled`) ;
  - idempotence : pas de relance si la dernière date d'il y a moins de 48h
    (protège d'un double run du cron) ;
  - un échec d'envoi n'incrémente PAS le compteur (retenté le lendemain) et
    ne bloque pas les autres factures (try/except par facture) ;
  - facture sans email client : ignorée et journalisée en échec.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.core.models import OrganizationSettings
from apps.invoicing.models import Invoice, InvoiceReminderLog

# Statuts éligibles à une relance (jamais les devis/brouillons/annulées/payées).
REMINDABLE_STATUSES = ['sent', 'pending', 'overdue']

# Textes par niveau de relance (courtois -> ferme), repris de l'esprit des
# gabarits historiques de forms.py (InvoiceReminderForm, jamais branché).
_REMINDER_TEMPLATES = {
    1: (
        "Nous vous rappelons que la facture {number} d'un montant de {balance} "
        "{currency} est arrivée à échéance le {due_date}.\n\n"
        "Merci de bien vouloir procéder au règlement dans les meilleurs délais."
    ),
    2: (
        "Malgré notre précédent rappel, la facture {number} d'un montant de "
        "{balance} {currency}, échue le {due_date}, demeure impayée.\n\n"
        "Merci de régulariser votre situation rapidement."
    ),
    3: (
        "Sauf erreur de notre part, la facture {number} d'un montant de "
        "{balance} {currency} reste impayée malgré plusieurs relances "
        "(échéance initiale : {due_date}).\n\n"
        "Nous vous remercions de procéder au règlement sans délai."
    ),
}


class Command(BaseCommand):
    help = "Envoie les relances automatiques des factures impayées (dunning), par organisation opt-in."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help="Affiche ce qui serait envoyé sans rien envoyer.")
        parser.add_argument('--limit', type=int, default=500,
                            help="Nombre maximum de relances envoyées sur ce run (défaut: 500).")

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limit = options['limit']
        today = timezone.localdate()
        now = timezone.now()
        sent = 0
        skipped_no_email = 0
        failed = 0

        # Factures échues à l'échéance passée -> overdue (transition sûre, ne
        # touche ni le stock ni la comptabilité).
        overdue_qs = Invoice.objects.filter(status='sent', due_date__lt=today)
        if not dry_run:
            overdue_count = overdue_qs.update(status='overdue')
        else:
            overdue_count = overdue_qs.count()
        if overdue_count:
            self.stdout.write(f"{overdue_count} facture(s) passée(s) en retard.")

        org_settings_qs = OrganizationSettings.objects.filter(
            auto_reminders_enabled=True
        ).select_related('organization')

        for org_settings in org_settings_qs:
            organization = org_settings.organization
            delays = {
                1: org_settings.reminder_delay_1,
                2: org_settings.reminder_delay_2,
                3: org_settings.reminder_delay_3,
            }
            max_count = org_settings.reminder_max_count

            invoices = (
                Invoice.objects.filter(
                    organization=organization,
                    status__in=REMINDABLE_STATUSES,
                    reminders_disabled=False,
                    due_date__lt=today,
                    reminder_count__lt=max_count,
                )
                .select_related('client')
                .prefetch_related('payments')
            )

            for invoice in invoices:
                if sent >= limit:
                    self.stdout.write(self.style.WARNING(f"Limite de {limit} relances atteinte, arrêt."))
                    self._report(sent, skipped_no_email, failed)
                    return

                # Idempotence : pas de double envoi si le cron tourne deux fois.
                if invoice.last_reminder_sent_at and invoice.last_reminder_sent_at > now - timedelta(hours=48):
                    continue

                balance = invoice.get_balance_due()
                if balance <= 0:
                    continue  # soldée entre-temps (paiement partiel total)

                level = invoice.reminder_count + 1
                if level > max_count:
                    continue
                delay = delays.get(level, delays[3])
                due_plus_delay = invoice.due_date + timedelta(days=delay)

                # Prêt à relancer si la date programmée est atteinte, OU
                # (rattrapage) si aucune date n'a jamais été programmée et
                # que le délai du niveau 1 est déjà écoulé.
                ready = (
                    (invoice.next_reminder_date and invoice.next_reminder_date <= today)
                    or (not invoice.next_reminder_date and due_plus_delay <= today)
                )
                if not ready:
                    continue

                client_email = getattr(invoice.client, 'email', '') if invoice.client else ''
                if not client_email:
                    skipped_no_email += 1
                    if not dry_run:
                        InvoiceReminderLog.objects.create(
                            invoice=invoice, organization=organization, level=level,
                            triggered_by='auto', success=False,
                            error_message="Client sans email renseigné",
                        )
                    continue

                if dry_run:
                    self.stdout.write(
                        f"[dry-run] Relance N{level} -> {invoice.invoice_number} "
                        f"({client_email}, solde {balance} {invoice.currency})"
                    )
                    sent += 1
                    continue

                try:
                    self._send_reminder(invoice, level, client_email, balance)
                    sent += 1
                except Exception as exc:  # pragma: no cover - robustesse runtime
                    failed += 1
                    invoice.next_reminder_date = today + timedelta(days=1)
                    invoice.save(update_fields=['next_reminder_date'])
                    InvoiceReminderLog.objects.create(
                        invoice=invoice, organization=organization, level=level,
                        sent_to=client_email, triggered_by='auto', success=False,
                        error_message=str(exc)[:2000],
                    )
                    self.stderr.write(self.style.ERROR(
                        f"Échec relance {invoice.invoice_number}: {exc}"
                    ))

        self._report(sent, skipped_no_email, failed)

    def _send_reminder(self, invoice, level, client_email, balance):
        from apps.api.services.email_service import InvoiceEmailService

        template = _REMINDER_TEMPLATES.get(level, _REMINDER_TEMPLATES[3])
        message = template.format(
            number=invoice.invoice_number,
            balance=balance,
            currency=invoice.currency,
            due_date=invoice.due_date.strftime('%d/%m/%Y') if invoice.due_date else '',
        )

        result = InvoiceEmailService.send_invoice_email(
            invoice, recipient_email=client_email, custom_message=message,
        )
        if not result.get('success'):
            raise RuntimeError(result.get('message') or "Échec d'envoi (raison inconnue)")

        organization = invoice.organization
        delays = getattr(organization, 'settings', None)
        delay_next = delays.reminder_delay_2 if level == 1 else (
            delays.reminder_delay_3 if level == 2 else None
        ) if delays else None

        invoice.reminder_count = level
        invoice.last_reminder_sent_at = timezone.now()
        invoice.next_reminder_date = (
            invoice.due_date + timedelta(days=delay_next) if delay_next else None
        )
        invoice.save(update_fields=['reminder_count', 'last_reminder_sent_at', 'next_reminder_date'])

        InvoiceReminderLog.objects.create(
            invoice=invoice, organization=organization, level=level,
            sent_to=client_email, triggered_by='auto', success=True,
        )

    def _report(self, sent, skipped_no_email, failed):
        self.stdout.write(self.style.SUCCESS(
            f"\n{sent} relance(s) envoyée(s), {skipped_no_email} ignorée(s) (sans email), "
            f"{failed} échec(s)."
        ))
