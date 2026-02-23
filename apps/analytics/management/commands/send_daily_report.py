"""
Commande pour générer et envoyer le rapport journalier du Centre Julianna.

Usage:
    python manage.py send_daily_report
    python manage.py send_daily_report --date 2026-02-23
    python manage.py send_daily_report --date 2026-02-23 --email contact@centrejulianna.com
"""
import smtplib
from datetime import date, datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from django.core.management.base import BaseCommand, CommandError
from django.template.loader import render_to_string
from django.db.models import Sum, Count, Q


class Command(BaseCommand):
    help = "Génère et envoie le rapport journalier d'activité par email"

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            default=None,
            help='Date du rapport au format YYYY-MM-DD (défaut: aujourd\'hui)'
        )
        parser.add_argument(
            '--email',
            type=str,
            default=None,
            help='Adresse email destinataire (défaut: admins actifs de l\'organisation)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche le rapport sans envoyer l\'email'
        )

    def handle(self, *args, **options):
        from apps.accounts.models import Organization, EmailConfiguration

        # --- Date cible ---
        if options['date']:
            try:
                report_date = datetime.strptime(options['date'], '%Y-%m-%d').date()
            except ValueError:
                raise CommandError("Format de date invalide. Utilisez YYYY-MM-DD (ex: 2026-02-23)")
        else:
            report_date = date.today()

        self.stdout.write(f"Génération du rapport pour le {report_date.strftime('%d/%m/%Y')}...")

        # --- Organisation ---
        orgs = Organization.objects.all()
        if not orgs.exists():
            raise CommandError("Aucune organisation trouvée.")
        org = orgs.first()
        self.stdout.write(f"Organisation : {org.name}")

        # --- Collecte des données ---
        context = self._build_report_context(org, report_date)

        # --- Destinataires ---
        recipients = self._get_recipients(org, options['email'])
        if not recipients:
            raise CommandError("Aucun destinataire email trouvé. Utilisez --email pour spécifier une adresse.")

        self.stdout.write(f"Destinataire(s) : {', '.join(recipients)}")

        # --- Résumé console ---
        stats = context['stats']
        self.stdout.write("\nRésumé de la journée :")
        self.stdout.write(f"  Consultations    : {stats['total_consultations']}")
        self.stdout.write(f"  Examens labo     : {stats['total_lab_orders']}")
        self.stdout.write(f"  Factures         : {stats['total_invoices']}")
        self.stdout.write(f"  Nouveaux patients: {stats['new_patients']}")
        self.stdout.write(f"  Total facturé    : {stats['total_revenue']:,.0f} FCFA")

        if options['dry_run']:
            self.stdout.write(self.style.WARNING("\nMode dry-run : email non envoyé."))
            return

        # --- Envoi email ---
        email_config = EmailConfiguration.objects.filter(organization=org).first()
        if not email_config:
            raise CommandError(
                "Aucune configuration SMTP trouvée. Lancez d'abord : python manage.py configure_smtp"
            )

        html_content = render_to_string('emails/daily_report.html', context)
        subject = f"[{org.name}] Rapport journalier — {report_date.strftime('%d/%m/%Y')}"

        self._send_email(email_config, recipients, subject, html_content)
        self.stdout.write(self.style.SUCCESS(f"\nRapport envoyé à {', '.join(recipients)} !"))

    def _build_report_context(self, org, report_date):
        """Collecte toutes les données pour le rapport de la journée."""
        from apps.consultations.models import Consultation
        from apps.laboratory.models import LabOrder
        from apps.invoicing.models import Invoice
        from apps.accounts.models import Client

        # --- Consultations ---
        consultations = Consultation.objects.filter(
            organization=org,
            consultation_date__date=report_date
        ).select_related('patient', 'doctor').order_by('consultation_date')

        consultations_completed = consultations.filter(status='completed').count()

        # --- Examens de laboratoire ---
        lab_orders = LabOrder.objects.filter(
            organization=org,
            created_at__date=report_date
        ).select_related('patient').prefetch_related('items').order_by('created_at')

        lab_completed = lab_orders.filter(
            status__in=['completed', 'results_ready', 'results_delivered']
        ).count()

        # --- Factures ---
        invoices = Invoice.objects.filter(
            organization=org,
            created_at__date=report_date
        )

        total_revenue = invoices.aggregate(total=Sum('total_amount'))['total'] or 0
        revenue_paid = invoices.filter(status='paid').aggregate(total=Sum('total_amount'))['total'] or 0

        invoices_summary = {
            'consultation_count': invoices.filter(invoice_type='healthcare_consultation').count(),
            'lab_count': invoices.filter(invoice_type='healthcare_laboratory').count(),
            'pharmacy_count': invoices.filter(invoice_type='healthcare_pharmacy').count(),
        }

        # --- Ordonnances ---
        try:
            from apps.consultations.models import Prescription
            total_prescriptions = Prescription.objects.filter(
                organization=org,
                prescribed_date=report_date
            ).count()
        except Exception:
            total_prescriptions = 0

        # --- Nouveaux patients ---
        new_patients = Client.objects.filter(
            organization=org,
            client_type__in=['patient', 'both'],
            created_at__date=report_date
        ).order_by('name')

        stats = {
            'total_consultations': consultations.count(),
            'consultations_completed': consultations_completed,
            'total_lab_orders': lab_orders.count(),
            'lab_completed': lab_completed,
            'total_invoices': invoices.count(),
            'total_revenue': float(total_revenue),
            'revenue_paid': float(revenue_paid),
            'new_patients': new_patients.count(),
            'total_prescriptions': total_prescriptions,
        }

        return {
            'organization': org,
            'report_date': report_date.strftime('%d/%m/%Y'),
            'stats': stats,
            'consultations': list(consultations),
            'lab_orders': list(lab_orders),
            'invoices_summary': invoices_summary,
            'new_patients': list(new_patients),
        }

    def _get_recipients(self, org, email_override):
        """Retourne la liste des destinataires."""
        if email_override:
            return [email_override]

        # Admins actifs de l'organisation
        recipients = list(
            org.members.filter(
                is_active=True,
                role__in=['admin', 'manager', 'doctor']
            ).exclude(email='').values_list('email', flat=True)
        )

        # Fallback : tous les membres actifs avec email
        if not recipients:
            recipients = list(
                org.members.filter(is_active=True).exclude(email='').values_list('email', flat=True)[:5]
            )

        return recipients

    def _send_email(self, email_config, recipients, subject, html_content):
        """Envoie l'email via la configuration SMTP de l'organisation."""
        password = email_config.get_decrypted_password()
        if not password:
            raise CommandError("Impossible de déchiffrer le mot de passe SMTP.")

        from_header = f"{email_config.default_from_name} <{email_config.default_from_email}>"

        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = from_header
        msg['To'] = ', '.join(recipients)

        # Texte plain fallback minimal
        text_part = MIMEText(f"Rapport journalier {subject}. Veuillez consulter la version HTML.", 'plain', 'utf-8')
        html_part = MIMEText(html_content, 'html', 'utf-8')
        msg.attach(text_part)
        msg.attach(html_part)

        try:
            if email_config.use_ssl:
                server = smtplib.SMTP_SSL(
                    email_config.smtp_host,
                    email_config.smtp_port,
                    timeout=30
                )
            else:
                server = smtplib.SMTP(
                    email_config.smtp_host,
                    email_config.smtp_port,
                    timeout=30
                )
                if email_config.use_tls:
                    server.starttls()

            server.login(email_config.smtp_username, password)
            server.sendmail(email_config.default_from_email, recipients, msg.as_string())
            server.quit()

        except smtplib.SMTPException as e:
            raise CommandError(f"Erreur lors de l'envoi de l'email : {e}")
