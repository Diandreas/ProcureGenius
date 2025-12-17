"""
Utilitaires pour la configuration et l'envoi d'emails via SMTP organisation
"""
from django.conf import settings
from django.core.mail import get_connection
from apps.accounts.models import EmailConfiguration
import logging

logger = logging.getLogger(__name__)


def get_organization_email_backend(organization):
    """
    Configure et retourne un backend email Django basé sur la configuration SMTP de l'organisation
    
    Args:
        organization: Instance du modèle Organization
        
    Returns:
        Email backend configuré ou None si configuration non trouvée
    """
    try:
        config = EmailConfiguration.objects.filter(organization=organization).first()
        
        if not config:
            logger.warning(f"No email configuration found for organization {organization.name}")
            return None
        
        # Récupérer le mot de passe déchiffré
        password = config.get_decrypted_password()
        
        if not password:
            logger.error(f"Could not decrypt password for organization {organization.name}")
            return None
        
        # Créer la connexion SMTP avec la configuration de l'organisation
        connection = get_connection(
            backend='django.core.mail.backends.smtp.EmailBackend',
            host=config.smtp_host,
            port=config.smtp_port,
            username=config.smtp_username,
            password=password,
            use_tls=config.use_tls,
            use_ssl=config.use_ssl,
            fail_silently=False,
        )
        
        return connection
        
    except Exception as e:
        logger.error(f"Error getting organization email backend: {e}")
        return None


def configure_django_email_settings(organization):
    """
    Configure temporairement les settings Django EMAIL_* pour utiliser la config de l'organisation
    Utile pour les services qui utilisent directement les settings Django
    
    Args:
        organization: Instance du modèle Organization
        
    Returns:
        dict: Dictionnaire des settings originaux (pour restauration)
    """
    try:
        config = EmailConfiguration.objects.filter(organization=organization).first()
        
        if not config:
            logger.warning(f"No email configuration found for organization {organization.name}")
            return None
        
        password = config.get_decrypted_password()
        
        if not password:
            logger.error(f"Could not decrypt password for organization {organization.name}")
            return None
        
        # Sauvegarder les settings originaux
        original_settings = {
            'EMAIL_BACKEND': getattr(settings, 'EMAIL_BACKEND', None),
            'EMAIL_HOST': getattr(settings, 'EMAIL_HOST', None),
            'EMAIL_PORT': getattr(settings, 'EMAIL_PORT', None),
            'EMAIL_USE_TLS': getattr(settings, 'EMAIL_USE_TLS', None),
            'EMAIL_USE_SSL': getattr(settings, 'EMAIL_USE_SSL', None),
            'EMAIL_HOST_USER': getattr(settings, 'EMAIL_HOST_USER', None),
            'EMAIL_HOST_PASSWORD': getattr(settings, 'EMAIL_HOST_PASSWORD', None),
            'DEFAULT_FROM_EMAIL': getattr(settings, 'DEFAULT_FROM_EMAIL', None),
        }
        
        # Configurer les nouveaux settings
        settings.EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
        settings.EMAIL_HOST = config.smtp_host
        settings.EMAIL_PORT = config.smtp_port
        settings.EMAIL_USE_TLS = config.use_tls
        settings.EMAIL_USE_SSL = config.use_ssl
        settings.EMAIL_HOST_USER = config.smtp_username
        settings.EMAIL_HOST_PASSWORD = password
        settings.DEFAULT_FROM_EMAIL = config.default_from_email
        
        return original_settings
        
    except Exception as e:
        logger.error(f"Error configuring Django email settings: {e}")
        return None


def restore_django_email_settings(original_settings):
    """
    Restaure les settings Django EMAIL_* originaux
    
    Args:
        original_settings: Dictionnaire des settings originaux retourné par configure_django_email_settings
    """
    if not original_settings:
        return
    
    try:
        for key, value in original_settings.items():
            if value is not None:
                setattr(settings, key, value)
            else:
                # Supprimer l'attribut s'il n'existait pas
                if hasattr(settings, key):
                    delattr(settings, key)
    except Exception as e:
        logger.error(f"Error restoring Django email settings: {e}")

