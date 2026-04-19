"""
Celery tasks pour les push notifications périodiques.
Enregistré automatiquement via app.autodiscover_tasks().
"""
import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name='ai_assistant.daily_push_checks')
def daily_push_checks():
    """Tâche quotidienne : factures en retard, brouillons, BC, lots expirants."""
    from .push_triggers import (
        check_and_push_overdue_invoices,
        check_and_push_draft_invoices,
        check_and_push_overdue_pos,
        check_and_push_expiring_batches,
    )
    check_and_push_overdue_invoices()
    check_and_push_draft_invoices()
    check_and_push_overdue_pos()
    check_and_push_expiring_batches()
    logger.info('daily_push_checks completed')


@shared_task(name='ai_assistant.weekly_push_summary')
def weekly_push_summary():
    """Tâche hebdo (lundi 8h) : résumé envoyé à tous les utilisateurs actifs."""
    from django.contrib.auth import get_user_model
    from .push_triggers import send_weekly_summary

    User = get_user_model()
    users = User.objects.filter(is_active=True).select_related('organization')
    for user in users:
        try:
            send_weekly_summary(user)
        except Exception as e:
            logger.error(f'weekly_push_summary error for user {user.id}: {e}')
    logger.info(f'weekly_push_summary sent to {users.count()} users')


@shared_task(name='ai_assistant.smart_notifications')
def smart_notifications():
    """
    Moteur de notifications adaptatif — tourne chaque matin.
    Analyse le profil réel de chaque utilisateur actif et envoie
    uniquement les notifications pertinentes pour ses modules.
    Remplace les anciennes tâches retention_push_j2/j5/j7.
    """
    from django.contrib.auth import get_user_model
    from .smart_notification_engine import SmartNotificationEngine

    User = get_user_model()
    users = User.objects.filter(is_active=True).select_related('organization')

    sent = 0
    for user in users:
        try:
            engine = SmartNotificationEngine(user)
            engine.run()
            sent += 1
        except Exception as e:
            logger.error(f'smart_notifications error for user {user.id}: {e}')

    logger.info(f'smart_notifications: processed {sent} users')


@shared_task(name='ai_assistant.cleanup_notification_logs')
def cleanup_notification_logs():
    """Nettoie les logs de notifications de plus de 30 jours."""
    from django.utils import timezone
    from datetime import timedelta
    from .models import NotificationLog

    cutoff = timezone.now() - timedelta(days=30)
    deleted, _ = NotificationLog.objects.filter(sent_at__lt=cutoff).delete()
    logger.info(f'cleanup_notification_logs: {deleted} logs supprimés')


@shared_task(name='ai_assistant.cleanup_old_conversations')
def cleanup_old_conversations():
    """Archiver les conversations >90j, supprimer les messages >180j."""
    from django.utils import timezone
    from datetime import timedelta
    from .models import Conversation, Message

    now = timezone.now()

    # Marquer inactives les conversations > 90 jours
    archive_cutoff = now - timedelta(days=90)
    archived = Conversation.objects.filter(
        last_message_at__lt=archive_cutoff, is_active=True
    ).update(is_active=False)

    # Supprimer les messages des conversations > 180 jours
    delete_cutoff = now - timedelta(days=180)
    deleted, _ = Message.objects.filter(
        conversation__last_message_at__lt=delete_cutoff
    ).delete()

    logger.info(
        f'cleanup_old_conversations: {archived} archived, {deleted} messages deleted'
    )
