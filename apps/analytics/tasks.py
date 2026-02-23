"""
Periodic Celery tasks for analytics:
- Weekly/biweekly/monthly reports by email
- Daily batch expiry alerts
- Daily predictive stockout alerts
"""
import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta, date
from django.template.loader import render_to_string
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(name='analytics.send_weekly_reports')
def send_weekly_reports():
    """Send periodic reports to subscribed users. Runs Monday 7h."""
    from .models import WeeklyReportConfig
    from apps.invoicing.models import Product, StockMovement, Invoice, ProductBatch
    from apps.analytics.predictive_restock import get_all_predictions

    today = date.today()
    configs = WeeklyReportConfig.objects.filter(is_active=True).select_related('user', 'organization')

    for config in configs:
        # Check frequency
        if config.frequency == 'biweekly' and today.isocalendar()[1] % 2 != 0:
            continue
        if config.frequency == 'monthly' and today.day > 7:
            continue

        try:
            _send_report_for_config(config, today)
        except Exception as e:
            logger.error(f"Error sending report for {config.user.email}: {e}")

    return f"Processed {configs.count()} report configs"


@shared_task(name='analytics.check_batch_expiry_alerts')
def check_batch_expiry_alerts():
    """Check for expiring batches and send alerts. Runs daily 8h."""
    from apps.invoicing.models import ProductBatch
    from apps.accounts.models import Organization

    today = date.today()
    seven_days = today + timedelta(days=7)

    organizations = Organization.objects.all()

    for org in organizations:
        expiring = ProductBatch.objects.filter(
            organization=org,
            status__in=['available', 'opened'],
            expiry_date__lte=seven_days,
            quantity_remaining__gt=0
        ).select_related('product')

        if not expiring.exists():
            continue

        # Auto-update expired batches
        for batch in expiring:
            if batch.is_expired and batch.status not in ('expired', 'depleted'):
                batch.status = 'expired'
                batch.save(update_fields=['status'])

        # Get org admin emails
        admin_users = org.members.filter(
            is_active=True,
            weekly_report_configs__include_stock_alerts=True
        ).distinct()

        if not admin_users.exists():
            admin_users = org.members.filter(is_active=True)[:3]

        expiring_list = [{
            'product_name': b.product.name,
            'batch_number': b.batch_number,
            'expiry_date': b.effective_expiry.strftime('%d/%m/%Y'),
            'days_left': b.days_until_expiry,
            'quantity': b.quantity_remaining,
        } for b in expiring[:20]]

        for user in admin_users:
            if not user.email:
                continue
            try:
                subject = f"[{org.name}] Alerte: {expiring.count()} lot(s) expirant bientot"
                html = render_to_string('emails/batch_expiry_alert.html', {
                    'user': user,
                    'organization': org,
                    'batches': expiring_list,
                    'total_count': expiring.count(),
                })
                send_mail(
                    subject, '', settings.DEFAULT_FROM_EMAIL,
                    [user.email], html_message=html, fail_silently=True
                )
            except Exception as e:
                logger.error(f"Error sending batch alert to {user.email}: {e}")

    return "Batch expiry alerts processed"


@shared_task(name='analytics.check_predictive_stockout_alerts')
def check_predictive_stockout_alerts():
    """Check for predicted stockouts and alert. Runs daily 8h30."""
    from apps.analytics.predictive_restock import get_all_predictions
    from apps.accounts.models import Organization

    organizations = Organization.objects.all()

    for org in organizations:
        predictions = get_all_predictions(org)
        critical = [p for p in predictions if p['urgency'] in ('critical', 'high')]

        if not critical:
            continue

        admin_users = org.members.filter(
            is_active=True,
            weekly_report_configs__include_stock_alerts=True
        ).distinct()

        if not admin_users.exists():
            admin_users = org.members.filter(is_active=True)[:3]

        for user in admin_users:
            if not user.email:
                continue
            try:
                subject = f"[{org.name}] Alerte: {len(critical)} produit(s) en risque de rupture"
                html = render_to_string('emails/stockout_alert.html', {
                    'user': user,
                    'organization': org,
                    'predictions': critical[:15],
                    'total_critical': len(critical),
                })
                send_mail(
                    subject, '', settings.DEFAULT_FROM_EMAIL,
                    [user.email], html_message=html, fail_silently=True
                )
            except Exception as e:
                logger.error(f"Error sending stockout alert to {user.email}: {e}")

    return "Predictive stockout alerts processed"


def _send_report_for_config(config, today):
    """Generate and send a comprehensive weekly report for a specific config."""
    from apps.invoicing.models import Product, StockMovement, Invoice, ProductBatch
    from apps.analytics.predictive_restock import get_all_predictions

    org = config.organization
    user = config.user
    period_start = today - timedelta(days=7)
    prev_period_start = period_start - timedelta(days=7)

    context = {
        'user': user,
        'organization': org,
        'period_start': period_start.strftime('%d/%m/%Y'),
        'period_end': today.strftime('%d/%m/%Y'),
        'config_frequency': config.get_frequency_display(),
        'sections': {},
    }

    # ---- Healthcare section ----
    if config.include_healthcare:
        try:
            from apps.laboratory.models import LabOrder
            from apps.consultations.models import Consultation
            from apps.accounts.models import Client

            lab_qs = LabOrder.objects.filter(
                organization=org,
                created_at__date__gte=period_start,
                created_at__date__lte=today,
            )
            lab_prev = LabOrder.objects.filter(
                organization=org,
                created_at__date__gte=prev_period_start,
                created_at__date__lt=period_start,
            ).count()

            # Commandes labo en attente (non terminées)
            lab_pending = lab_qs.exclude(
                status__in=['completed', 'results_ready', 'results_delivered', 'cancelled']
            ).select_related('patient').order_by('created_at')[:10]

            consult_qs = Consultation.objects.filter(
                organization=org,
                consultation_date__date__gte=period_start,
                consultation_date__date__lte=today,
            )
            consult_prev = Consultation.objects.filter(
                organization=org,
                consultation_date__date__gte=prev_period_start,
                consultation_date__date__lt=period_start,
            ).count()

            # Consultations par médecin
            from django.db.models import Count as models_Count
            by_doctor = (
                consult_qs.exclude(doctor=None)
                .values('doctor__first_name', 'doctor__last_name', 'doctor__username')
                .annotate(total=models_Count('id'))
                .order_by('-total')[:5]
            )

            # Nouveaux patients cette semaine
            new_patients_count = Client.objects.filter(
                organization=org,
                client_type__in=['patient', 'both'],
                created_at__date__gte=period_start,
                created_at__date__lte=today,
            ).count()

            # Ordonnances
            try:
                from apps.consultations.models import Prescription
                prescriptions_count = Prescription.objects.filter(
                    organization=org,
                    prescribed_date__gte=period_start,
                    prescribed_date__lte=today,
                ).count()
            except Exception:
                prescriptions_count = 0

            context['sections']['healthcare'] = {
                'exams_week': lab_qs.count(),
                'exams_prev': lab_prev,
                'completed_week': lab_qs.filter(
                    status__in=['completed', 'results_ready', 'results_delivered']
                ).count(),
                'lab_pending_list': list(lab_pending),
                'consultations_week': consult_qs.count(),
                'consultations_prev': consult_prev,
                'consultations_completed': consult_qs.filter(status='completed').count(),
                'by_doctor': list(by_doctor),
                'new_patients': new_patients_count,
                'prescriptions': prescriptions_count,
            }
        except Exception as e:
            logger.error(f"Error building healthcare section: {e}")
            context['sections']['healthcare'] = {
                'exams_week': 0, 'completed_week': 0,
                'consultations_week': 0, 'consultations_completed': 0,
                'by_doctor': [], 'new_patients': 0, 'prescriptions': 0,
                'lab_pending_list': [], 'exams_prev': 0, 'consultations_prev': 0,
            }

    # ---- Finance section ----
    if config.include_finance:
        inv_qs = Invoice.objects.filter(
            organization=org,
            created_at__date__gte=period_start,
            created_at__date__lte=today,
        )
        prev_revenue = Invoice.objects.filter(
            organization=org,
            created_at__date__gte=prev_period_start,
            created_at__date__lt=period_start,
            status='paid',
        ).aggregate(total=models_Sum('total_amount'))['total'] or 0

        revenue_paid = inv_qs.filter(status='paid').aggregate(
            total=models_Sum('total_amount'))['total'] or 0
        revenue_total = inv_qs.aggregate(
            total=models_Sum('total_amount'))['total'] or 0
        revenue_unpaid = inv_qs.filter(
            status__in=['sent', 'draft', 'overdue']
        ).aggregate(total=models_Sum('total_amount'))['total'] or 0

        # Par type
        by_type = {
            'consultation': inv_qs.filter(invoice_type='healthcare_consultation').aggregate(
                t=models_Sum('total_amount'), c=models_Count_('id'))['t'] or 0,
            'consultation_count': inv_qs.filter(invoice_type='healthcare_consultation').count(),
            'laboratory': inv_qs.filter(invoice_type='healthcare_laboratory').aggregate(
                t=models_Sum('total_amount'))['t'] or 0,
            'laboratory_count': inv_qs.filter(invoice_type='healthcare_laboratory').count(),
            'pharmacy': inv_qs.filter(invoice_type='healthcare_pharmacy').aggregate(
                t=models_Sum('total_amount'))['t'] or 0,
            'pharmacy_count': inv_qs.filter(invoice_type='healthcare_pharmacy').count(),
        }

        # Factures impayées > 7 jours
        overdue_invoices = inv_qs.filter(
            status__in=['sent', 'overdue']
        ).select_related('client').order_by('-total_amount')[:8]

        context['sections']['finance'] = {
            'revenue_week': float(revenue_paid),
            'revenue_total': float(revenue_total),
            'revenue_unpaid': float(revenue_unpaid),
            'revenue_prev': float(prev_revenue),
            'invoices_count': inv_qs.count(),
            'by_type': by_type,
            'overdue_list': list(overdue_invoices),
            'overdue_count': inv_qs.filter(status__in=['sent', 'overdue']).count(),
        }

    # ---- Inventory section ----
    if config.include_inventory:
        low_stock_products = Product.objects.filter(
            organization=org, product_type='physical',
            stock_quantity__lte=models_F('low_stock_threshold'),
            is_active=True
        ).order_by('stock_quantity')[:12]

        movements_week = StockMovement.objects.filter(
            product__organization=org,
            created_at__date__gte=period_start
        ).count()

        context['sections']['inventory'] = {
            'low_stock_count': low_stock_products.count(),
            'low_stock_products': list(low_stock_products),
            'movements_week': movements_week,
        }

    # ---- Alerts section ----
    if config.include_stock_alerts:
        expiring_soon = ProductBatch.objects.filter(
            organization=org,
            status__in=['available', 'opened'],
            expiry_date__lte=today + timedelta(days=30),
            quantity_remaining__gt=0
        ).select_related('product').order_by('expiry_date')[:15]

        expiring_list = []
        for b in expiring_soon:
            try:
                expiry = b.effective_expiry
                days_left = b.days_until_expiry
            except Exception:
                expiry = b.expiry_date
                days_left = (b.expiry_date - today).days if b.expiry_date else None
            expiring_list.append({
                'product_name': b.product.name,
                'batch_number': b.batch_number or '—',
                'expiry_date': expiry.strftime('%d/%m/%Y') if expiry else '—',
                'days_left': days_left,
                'quantity': b.quantity_remaining,
                'is_critical': days_left is not None and days_left <= 7,
            })

        try:
            predictions = get_all_predictions(org)
            critical_products = [p for p in predictions if p['urgency'] in ('critical', 'high')]
        except Exception:
            critical_products = []

        context['sections']['alerts'] = {
            'expiring_batches': len(expiring_list),
            'expiring_list': expiring_list,
            'critical_products': critical_products[:10],
            'critical_count': len(critical_products),
        }

    # ---- Render and send via org SMTP ----
    subject = f"[{org.name}] Rapport {config.get_frequency_display()} — {period_start.strftime('%d/%m')} au {today.strftime('%d/%m/%Y')}"
    html = render_to_string('emails/weekly_report.html', context)

    # Destinataire : email de l'org (EmailConfiguration) en priorité, sinon user.email
    try:
        from apps.accounts.models import EmailConfiguration
        org_email_config = EmailConfiguration.objects.filter(organization=org).first()
        recipient = org_email_config.default_from_email if org_email_config else user.email
    except Exception:
        recipient = user.email

    _send_via_org_smtp(org, recipient, subject, html)


def _send_via_org_smtp(org, recipient_email, subject, html_content):
    """Envoie un email via la configuration SMTP de l'organisation."""
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    try:
        from apps.accounts.models import EmailConfiguration
        email_config = EmailConfiguration.objects.filter(organization=org).first()
    except Exception:
        email_config = None

    if not email_config:
        # Fallback : Django send_mail avec settings globaux
        send_mail(subject, '', settings.DEFAULT_FROM_EMAIL,
                  [recipient_email], html_message=html_content, fail_silently=True)
        return

    password = email_config.get_decrypted_password()
    if not password:
        logger.error(f"Cannot decrypt SMTP password for org {org.name}")
        return

    from_header = f"{email_config.default_from_name} <{email_config.default_from_email}>"
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = from_header
    msg['To'] = recipient_email
    msg.attach(MIMEText('Veuillez consulter la version HTML.', 'plain', 'utf-8'))
    msg.attach(MIMEText(html_content, 'html', 'utf-8'))

    try:
        if email_config.use_ssl:
            server = smtplib.SMTP_SSL(email_config.smtp_host, email_config.smtp_port, timeout=30)
        else:
            server = smtplib.SMTP(email_config.smtp_host, email_config.smtp_port, timeout=30)
            if email_config.use_tls:
                server.starttls()
        server.login(email_config.smtp_username, password)
        server.sendmail(email_config.default_from_email, [recipient_email], msg.as_string())
        server.quit()
        logger.info(f"Weekly report sent to {recipient_email} via org SMTP")
    except Exception as e:
        logger.error(f"Failed to send weekly report to {recipient_email}: {e}")


# Lazy imports for aggregate functions
from django.db.models import Sum as models_Sum, F as models_F, Count as models_Count_
