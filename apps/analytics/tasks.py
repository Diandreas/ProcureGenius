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
    """Generate and send a report for a specific config."""
    from apps.invoicing.models import Product, StockMovement, Invoice, ProductBatch
    from apps.analytics.predictive_restock import get_all_predictions

    org = config.organization
    user = config.user
    period_start = today - timedelta(days=7)

    context = {
        'user': user,
        'organization': org,
        'period_start': period_start.strftime('%d/%m/%Y'),
        'period_end': today.strftime('%d/%m/%Y'),
        'sections': {},
    }

    # Healthcare section
    if config.include_healthcare:
        try:
            from apps.laboratory.models import LabOrder
            exams_week = LabOrder.objects.filter(
                organization=org,
                created_at__date__gte=period_start
            ).count()
            completed_week = LabOrder.objects.filter(
                organization=org,
                created_at__date__gte=period_start,
                status='completed'
            ).count()
        except Exception:
            exams_week = 0
            completed_week = 0

        try:
            from apps.consultations.models import Consultation
            consultations_week = Consultation.objects.filter(
                organization=org,
                created_at__date__gte=period_start
            ).count()
        except Exception:
            consultations_week = 0

        context['sections']['healthcare'] = {
            'exams_week': exams_week,
            'completed_week': completed_week,
            'consultations_week': consultations_week,
        }

    # Finance section
    if config.include_finance:
        revenue = Invoice.objects.filter(
            organization=org, status='paid',
            created_at__date__gte=period_start,
            created_at__date__lte=today
        ).aggregate(
            total=models_Sum('total_amount')
        )['total'] or 0

        context['sections']['finance'] = {
            'revenue_week': float(revenue),
        }

    # Inventory section
    if config.include_inventory:
        low_stock = Product.objects.filter(
            organization=org, product_type='physical',
            stock_quantity__lte=models_F('low_stock_threshold'),
            is_active=True
        ).count()

        movements_week = StockMovement.objects.filter(
            product__organization=org,
            created_at__date__gte=period_start
        ).count()

        context['sections']['inventory'] = {
            'low_stock_count': low_stock,
            'movements_week': movements_week,
        }

    # Stock alerts
    if config.include_stock_alerts:
        expiring_batches = ProductBatch.objects.filter(
            organization=org,
            status__in=['available', 'opened'],
            expiry_date__lte=today + timedelta(days=30),
            quantity_remaining__gt=0
        ).count()

        predictions = get_all_predictions(org)
        critical_products = [p for p in predictions if p['urgency'] in ('critical', 'high')]

        context['sections']['alerts'] = {
            'expiring_batches': expiring_batches,
            'critical_products': critical_products[:10],
            'critical_count': len(critical_products),
        }

    # Render and send
    subject = f"[{org.name}] Rapport {config.get_frequency_display()} - {today.strftime('%d/%m/%Y')}"
    html = render_to_string('emails/weekly_report.html', context)

    send_mail(
        subject, '', settings.DEFAULT_FROM_EMAIL,
        [user.email], html_message=html, fail_silently=False
    )


# Lazy imports for aggregate functions used in _send_report_for_config
from django.db.models import Sum as models_Sum, F as models_F
