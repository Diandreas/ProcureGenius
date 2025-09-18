from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import UserPreferences

User = get_user_model()


@receiver(post_save, sender=User)
def create_user_preferences(sender, instance, created, **kwargs):
    """Créer automatiquement les préférences utilisateur"""
    if created:
        UserPreferences.objects.create(
            user=instance,
            notification_settings={
                'email_notifications': True,
                'ai_suggestions': True,
                'approval_requests': True,
                'system_alerts': True,
            },
            dashboard_layout={
                'widgets': [
                    'recent_purchase_orders',
                    'pending_invoices',
                    'ai_suggestions',
                    'quick_stats'
                ]
            }
        )