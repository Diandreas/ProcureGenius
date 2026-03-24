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
