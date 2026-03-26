"""
Utilitaires pour la configuration et l'envoi d'emails via SMTP organisation
"""
from django.conf import settings
from django.core.mail import get_connection, send_mail
from django.core.mail import EmailMultiAlternatives
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


def send_user_invitation_email(invited_user, temp_password, invited_by_user, organization):
    """
    Envoie un email d'invitation à un nouvel utilisateur ajouté à l'organisation.
    """
    try:
        app_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        from_email = settings.DEFAULT_FROM_EMAIL
        org_name = organization.name if organization else 'Procura'

        subject = f"Invitation à rejoindre {org_name} sur Procura"

        text_body = f"""Bonjour {invited_user.first_name or invited_user.email},

{invited_by_user.get_full_name() or invited_by_user.email} vous a invité(e) à rejoindre l'espace de travail "{org_name}" sur Procura.

Vos identifiants de connexion temporaires :
  Email : {invited_user.email}
  Mot de passe temporaire : {temp_password}

Connectez-vous ici : {app_url}/login

Veuillez changer votre mot de passe dès votre première connexion.

Cordialement,
L'équipe Procura
"""

        html_body = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background:#f5f5f5; padding: 20px;">
  <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#1976d2;padding:24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">Procura</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#333;">Vous êtes invité(e) !</h2>
      <p style="color:#555;">Bonjour <strong>{invited_user.first_name or invited_user.email}</strong>,</p>
      <p style="color:#555;"><strong>{invited_by_user.get_full_name() or invited_by_user.email}</strong> vous a invité(e) à rejoindre l'espace de travail <strong>"{org_name}"</strong> sur Procura.</p>

      <div style="background:#f0f4ff;border-radius:8px;padding:20px;margin:24px 0;">
        <h3 style="color:#1976d2;margin:0 0 12px 0;">Vos identifiants temporaires</h3>
        <p style="margin:4px 0;color:#333;"><strong>Email :</strong> {invited_user.email}</p>
        <p style="margin:4px 0;color:#333;"><strong>Mot de passe :</strong> <code style="background:#e8eaf6;padding:2px 8px;border-radius:4px;">{temp_password}</code></p>
      </div>

      <p style="text-align:center;margin:32px 0;">
        <a href="{app_url}/login" style="background:#1976d2;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;">
          Se connecter maintenant
        </a>
      </p>

      <p style="color:#888;font-size:13px;">⚠️ Pour votre sécurité, changez votre mot de passe dès la première connexion.</p>
    </div>
    <div style="background:#f5f5f5;padding:16px;text-align:center;">
      <p style="color:#aaa;font-size:12px;margin:0;">Procura — Gestion des achats intelligente</p>
    </div>
  </div>
</body>
</html>
"""

        email = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=from_email,
            to=[invited_user.email],
        )
        email.attach_alternative(html_body, "text/html")
        email.send(fail_silently=False)

        logger.info(f"Invitation email sent to {invited_user.email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send invitation email to {invited_user.email}: {e}")
        return False


def send_welcome_registration_email(user, organization):
    """
    Envoie un email de bienvenue lors de l'inscription.
    """
    try:
        app_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        from_email = settings.DEFAULT_FROM_EMAIL

        subject = "Bienvenue sur Procura !"

        html_body = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background:#f5f5f5; padding: 20px;">
  <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#1976d2;padding:24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">Procura</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#333;">Bienvenue, {user.first_name or user.email} !</h2>
      <p style="color:#555;">Votre espace de travail <strong>"{organization.name}"</strong> a été créé avec succès.</p>
      <p style="color:#555;">Commencez par configurer les informations de votre entreprise dans les Paramètres.</p>
      <p style="text-align:center;margin:32px 0;">
        <a href="{app_url}" style="background:#1976d2;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;">
          Accéder à Procura
        </a>
      </p>
    </div>
    <div style="background:#f5f5f5;padding:16px;text-align:center;">
      <p style="color:#aaa;font-size:12px;margin:0;">Procura — Gestion des achats intelligente</p>
    </div>
  </div>
</body>
</html>
"""

        email = EmailMultiAlternatives(
            subject=subject,
            body=f"Bienvenue {user.first_name or user.email} ! Votre espace {organization.name} est prêt.",
            from_email=from_email,
            to=[user.email],
        )
        email.attach_alternative(html_body, "text/html")
        
        # Désactiver le fail_silently pour voir les erreurs réelles dans les logs
        email.send(fail_silently=False)

        logger.info(f"Welcome email successfully sent to {user.email}")
        return True

    except Exception as e:
        logger.error(f"FATAL: Failed to send welcome email to {user.email}: {e}", exc_info=True)
        return False


def send_password_reset_email(user, token):
    """
    Envoie un email de réinitialisation de mot de passe.
    """
    try:
        app_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        from_email = settings.DEFAULT_FROM_EMAIL
        
        # Le lien vers le frontend avec le token
        reset_url = f"{app_url}/reset-password?token={token}&email={user.email}"

        subject = "Réinitialisation de votre mot de passe - Procura"

        html_body = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background:#f5f5f5; padding: 20px;">
  <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#1976d2;padding:24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">Procura</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#333;">Réinitialisation de mot de passe</h2>
      <p style="color:#555;">Bonjour {user.first_name or user.username},</p>
      <p style="color:#555;">Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte Procura.</p>
      <p style="color:#555;">Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
      
      <p style="text-align:center;margin:32px 0;">
        <a href="{reset_url}" style="background:#1976d2;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;">
          Réinitialiser mon mot de passe
        </a>
      </p>
      
      <p style="color:#888;font-size:13px;">Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité. Votre mot de passe actuel restera inchangé.</p>
      <p style="color:#888;font-size:13px;">Ce lien expirera dans 24 heures.</p>
    </div>
    <div style="background:#f5f5f5;padding:16px;text-align:center;">
      <p style="color:#aaa;font-size:12px;margin:0;">Procura — Gestion des achats intelligente</p>
    </div>
  </div>
</body>
</html>
"""

        email = EmailMultiAlternatives(
            subject=subject,
            body=f"Cliquez sur ce lien pour réinitialiser votre mot de passe : {reset_url}",
            from_email=from_email,
            to=[user.email],
        )
        email.attach_alternative(html_body, "text/html")
        email.send(fail_silently=False)

        logger.info(f"Password reset email sent to {user.email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send password reset email to {user.email}: {e}")
        return False


def send_verification_email(user, token):
    """
    Envoie un email de vérification d'adresse email.
    """
    try:
        app_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        from_email = settings.DEFAULT_FROM_EMAIL
        
        verify_url = f"{app_url}/verify-email?token={token}&email={user.email}"

        subject = "Vérifiez votre adresse email - Procura"

        html_body = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background:#f5f5f5; padding: 20px;">
  <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#1976d2;padding:24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">Procura</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#333;">Vérification de votre email</h2>
      <p style="color:#555;">Bonjour {user.first_name or user.username},</p>
      <p style="color:#555;">Merci de vous être inscrit sur Procura. Pour finaliser la création de votre compte, veuillez confirmer votre adresse email.</p>
      
      <p style="text-align:center;margin:32px 0;">
        <a href="{verify_url}" style="background:#1976d2;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;">
          Confirmer mon email
        </a>
      </p>
      
      <p style="color:#888;font-size:13px;">Si vous n'avez pas créé de compte sur Procura, vous pouvez ignorer cet email.</p>
    </div>
    <div style="background:#f5f5f5;padding:16px;text-align:center;">
      <p style="color:#aaa;font-size:12px;margin:0;">Procura — Gestion des achats intelligente</p>
    </div>
  </div>
</body>
</html>
"""

        email = EmailMultiAlternatives(
            subject=subject,
            body=f"Cliquez sur ce lien pour vérifier votre email : {verify_url}",
            from_email=from_email,
            to=[user.email],
        )
        email.attach_alternative(html_body, "text/html")
        email.send(fail_silently=False)

        logger.info(f"Verification email sent to {user.email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send verification email to {user.email}: {e}")
        return False

