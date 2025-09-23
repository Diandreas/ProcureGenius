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
        logger.info(f"Nouvel utilisateur créé: {instance.username}")
        # Ici on peut ajouter d'autres actions lors de la création d'un utilisateur