"""
push_triggers.py — Fonctions appelées depuis les signaux Django ou les tâches Celery
pour déclencher les push notifications au bon moment.

Brancher dans apps/invoicing/signals.py et apps/subscriptions/models.py.
"""
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)


def check_and_push_overdue_invoices(organization=None):
    """
    Vérifie les factures en retard (>7j) et envoie les push.
    À appeler via tâche cron quotidienne.
    """
    try:
        from django.utils import timezone
        from apps.invoicing.models import Invoice
        from .web_push_service import notify_facture_retard

        cutoff = timezone.now().date() - timedelta(days=7)
        qs = Invoice.objects.filter(
            status__in=['sent', 'overdue'],
            due_date__lt=cutoff,
        ).select_related('created_by', 'created_by__organization')

        if organization:
            qs = qs.filter(created_by__organization=organization)

        # Grouper par utilisateur pour éviter le spam
        notified_users = set()
        for invoice in qs:
            user = invoice.created_by
            if not user or user.id in notified_users:
                continue
            days_late = (timezone.now().date() - invoice.due_date).days
            notify_facture_retard(user, invoice.invoice_number, days_late, str(invoice.id))
            notified_users.add(user.id)

    except Exception as e:
        logger.error(f"check_and_push_overdue_invoices error: {e}")


def check_and_push_draft_invoices(organization=None):
    """
    Vérifie les factures brouillon depuis +24h et envoie un push groupé.
    """
    try:
        from django.utils import timezone
        from django.contrib.auth import get_user_model
        from apps.invoicing.models import Invoice
        from .web_push_service import notify_facture_brouillon

        User = get_user_model()
        cutoff = timezone.now() - timedelta(hours=24)
        qs = Invoice.objects.filter(
            status='draft',
            created_at__lt=cutoff,
        ).select_related('created_by')

        if organization:
            qs = qs.filter(created_by__organization=organization)

        # Grouper par utilisateur
        from django.db.models import Count
        counts = (
            qs.values('created_by')
              .annotate(cnt=Count('id'))
        )
        for row in counts:
            try:
                user = User.objects.get(id=row['created_by'])
                notify_facture_brouillon(user, row['cnt'])
            except Exception:
                pass

    except Exception as e:
        logger.error(f"check_and_push_draft_invoices error: {e}")


def check_and_push_overdue_pos(organization=None):
    """
    Vérifie les bons de commande en retard et envoie les push.
    """
    try:
        from django.utils import timezone
        from apps.purchase_orders.models import PurchaseOrder
        from .web_push_service import notify_bc_retard

        qs = PurchaseOrder.objects.filter(
            status__in=['sent', 'confirmed'],
        ).select_related('created_by')

        if organization:
            qs = qs.filter(created_by__organization=organization)

        notified_users = set()
        for po in qs:
            if not po.is_overdue:
                continue
            user = po.created_by
            if not user or user.id in notified_users:
                continue
            if po.expected_delivery_date:
                days_late = (timezone.now().date() - po.expected_delivery_date).days
            else:
                days_late = 0
            notify_bc_retard(user, po.po_number, days_late, str(po.id))
            notified_users.add(user.id)

    except Exception as e:
        logger.error(f"check_and_push_overdue_pos error: {e}")


def check_and_push_expiring_batches(organization=None):
    """
    Vérifie les lots de produits expirant sous 30 jours et envoie les push.
    """
    try:
        from django.utils import timezone
        from apps.invoicing.models import ProductBatch
        from .web_push_service import notify_lot_expirant

        today = timezone.now().date()
        cutoff = today + timedelta(days=30)
        qs = ProductBatch.objects.filter(
            expiration_date__gte=today,
            expiration_date__lte=cutoff,
            quantity__gt=0,
        ).select_related('product', 'product__created_by')

        if organization:
            qs = qs.filter(product__organization=organization)

        notified = set()
        for batch in qs:
            product = batch.product
            user = getattr(product, 'created_by', None)
            key = (getattr(user, 'id', None), str(product.id))
            if key in notified:
                continue
            if user:
                days_left = (batch.expiration_date - today).days
                notify_lot_expirant(user, product.name, days_left, str(product.id))
                notified.add(key)

    except Exception as e:
        logger.error(f"check_and_push_expiring_batches error: {e}")


def push_quota_alert(user, quota_type: str, used: int, limit: int):
    """
    À appeler depuis subscriptions/models.py quand check_quota retourne 90%+.
    """
    try:
        from .web_push_service import notify_quota_atteint
        if limit and used / limit >= 0.9:
            notify_quota_atteint(user, quota_type, used, limit)
    except Exception as e:
        logger.error(f"push_quota_alert error: {e}")


def send_weekly_summary(user):
    """
    Envoie le résumé hebdo à un utilisateur.
    À appeler via tâche Celery beat (chaque lundi matin).
    """
    try:
        from django.utils import timezone
        from django.db.models import Sum
        from apps.invoicing.models import Invoice
        from .web_push_service import notify_resume_hebdo
        from .models import NotificationPreferences

        prefs = NotificationPreferences.get_or_create_for_user(user)
        if not prefs.push_resume_hebdo:
            return

        org = getattr(user, 'organization', None)
        if not org:
            return

        week_ago = timezone.now() - timedelta(days=7)

        # CA semaine
        ca = Invoice.objects.filter(
            created_by__organization=org,
            status__in=['paid', 'sent'],
            created_at__gte=week_ago,
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        # Factures en attente
        factures_attente = Invoice.objects.filter(
            created_by__organization=org,
            status__in=['sent', 'overdue'],
        ).count()

        # Alertes stock
        try:
            from apps.invoicing.stock_alerts import StockAlertService
            alerts = StockAlertService.check_low_stock_products()
            alertes_stock = len(alerts)
        except Exception:
            alertes_stock = 0

        notify_resume_hebdo(user, float(ca), factures_attente, alertes_stock)

    except Exception as e:
        logger.error(f"send_weekly_summary error: {e}")
