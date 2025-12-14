"""
Signals pour le module accounts
Les signaux de création UserPreferences et UserPermissions sont définis dans models.py
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Actions à exécuter lors de la création d'un utilisateur"""
    if created:
        logger.info(f"✓ Nouvel utilisateur créé: {instance.username} (email: {instance.email})")
        logger.info(f"  - Organisation: {instance.organization.name if instance.organization else 'Aucune'}")
        logger.info(f"  - Rôle: {instance.role}")
        
        # Les UserPreferences et UserPermissions sont créées automatiquement
        # par le signal dans models.py (create_user_preferences_and_permissions)