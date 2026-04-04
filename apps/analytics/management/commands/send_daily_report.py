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
        self.stdout.write(f"  Rupture de stock : {stats['out_of_stock_count']} produit(s)")
        self.stdout.write(f"  Stock bas        : {stats['low_stock_count']} produit(s)")

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
        from apps.invoicing.models import Invoice, Payment, Product, StockMovement
        from apps.accounts.models import Client
        from apps.pharmacy.models import PharmacyDispensing
        from django.db import models

        # --- Consultations ---
        consultations = Consultation.objects.filter(
            organization=org,
            consultation_date__date=report_date
        ).select_related('patient', 'doctor').order_by('consultation_date')

        consultations_completed = consultations.filter(status='completed').count()

        # Consultations payées (facture paid) — source de vérité pour les stats financières
        consultations_paid = consultations.filter(
            status='completed',
            consultation_invoice__status='paid'
        ).count()

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

        # --- Encaissements du jour (par méthode de paiement) ---
        # Payment is linked to Invoice, which has organization
        payments = Payment.objects.filter(
            invoice__organization=org,
            payment_date=report_date,
            status='success'
        )
        
        total_collections = payments.aggregate(total=Sum('amount'))['total'] or 0
        cash_collections = payments.filter(payment_method='cash').aggregate(total=Sum('amount'))['total'] or 0
        mobile_money_collections = payments.filter(
            payment_method__in=['paypal', 'other']
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Try to detect mobile money from reference/transaction fields
        mobile_payments = payments.filter(
            Q(reference_number__icontains='mobile') | 
            Q(reference_number__icontains='momo') |
            Q(reference_number__icontains='orange') |
            Q(reference_number__icontains='mtn') |
            Q(transaction_id__icontains='mobile') |
            Q(transaction_id__icontains='momo')
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        if mobile_payments > mobile_money_collections:
            mobile_money_collections = mobile_payments

        # --- CA par type d'activité ---
        revenue_by_type = {
            'consultation': invoices.filter(
                invoice_type='healthcare_consultation'
            ).aggregate(total=Sum('total_amount'))['total'] or 0,
            'lab': invoices.filter(
                invoice_type='healthcare_laboratory'
            ).aggregate(total=Sum('total_amount'))['total'] or 0,
            'pharmacy': invoices.filter(
                invoice_type='healthcare_pharmacy'
            ).aggregate(total=Sum('total_amount'))['total'] or 0,
        }

        # --- Ordonnances ---
        try:
            from apps.consultations.models import Prescription
            total_prescriptions = Prescription.objects.filter(
                organization=org,
                prescribed_date__date=report_date
            ).count()
        except Exception:
            total_prescriptions = 0

        # --- Nouveaux patients ---
        new_patients = Client.objects.filter(
            organization=org,
            client_type__in=['patient', 'both'],
            created_at__date=report_date
        ).order_by('name')

        # --- Pharmacie : Ventes du jour ---
        dispensings = PharmacyDispensing.objects.filter(
            organization=org,
            dispensed_at__date=report_date,
            status__in=['dispensed', 'partial']
        ).select_related('patient').prefetch_related('items').order_by('dispensed_at')
        
        pharmacy_sales_count = dispensings.count()
        pharmacy_revenue = sum(d.total_amount for d in dispensings)
        otc_sales = dispensings.filter(patient__isnull=True).count()

        # --- Stock critique ---
        low_stock_products = Product.objects.filter(
            organization=org,
            product_type='physical',
            is_active=True,
            stock_quantity__lte=models.F('low_stock_threshold')
        ).order_by('stock_quantity')

        out_of_stock = [p for p in low_stock_products if p.stock_quantity == 0]
        low_stock = [p for p in low_stock_products if p.stock_quantity > 0]

        # --- Pertes de stock du jour ---
        # StockMovement is linked to Product, which has organization
        stock_losses = StockMovement.objects.filter(
            product__organization=org,
            movement_type='loss',
            created_at__date=report_date
        ).select_related('product').order_by('-created_at')
        
        total_loss_value = stock_losses.aggregate(total=Sum('loss_value'))['total'] or 0
        
        # Add absolute quantity for display
        for loss in stock_losses:
            loss.quantity_abs = abs(loss.quantity)

        stats = {
            'total_consultations': consultations_paid,
            'consultations_completed': consultations_completed,
            'total_lab_orders': lab_orders.count(),
            'lab_completed': lab_completed,
            'total_invoices': invoices.count(),
            'total_revenue': float(total_revenue),
            'revenue_paid': float(revenue_paid),
            'new_patients': new_patients.count(),
            'total_prescriptions': total_prescriptions,
            'out_of_stock_count': len(out_of_stock),
            'low_stock_count': len(low_stock),
            # New stats
            'total_collections': float(total_collections),
            'cash_collections': float(cash_collections),
            'mobile_money_collections': float(mobile_money_collections),
            'revenue_by_type': {k: float(v) for k, v in revenue_by_type.items()},
            'pharmacy_sales_count': pharmacy_sales_count,
            'pharmacy_revenue': float(pharmacy_revenue),
            'otc_sales': otc_sales,
            'total_loss_value': float(total_loss_value),
            'stock_losses_count': stock_losses.count(),
        }

        return {
            'organization': org,
            'report_date': report_date.strftime('%d/%m/%Y'),
            'stats': stats,
            'consultations': list(consultations),
            'lab_orders': list(lab_orders),
            'invoices_summary': invoices_summary,
            'new_patients': list(new_patients),
            'out_of_stock': out_of_stock,
            'low_stock': low_stock,
            'dispensings': list(dispensings),
            'stock_losses': list(stock_losses),
        }

    def _get_recipients(self, org, email_override):
        """Retourne la liste des destinataires."""
        if email_override:
            return [email_override]

        # Admins actifs de l'organisation
        recipients = list(
            org.users.filter(
                is_active=True,
                role__in=['admin', 'manager', 'doctor']
            ).exclude(email='').values_list('email', flat=True)
        )

        # Fallback : tous les membres actifs avec email
        if not recipients:
            recipients = list(
                org.users.filter(is_active=True).exclude(email='').values_list('email', flat=True)[:5]
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
