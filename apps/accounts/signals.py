"""
Signals pour le module accounts
Gère la création automatique des préférences et permissions utilisateur
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


@receiver(post_save, sender=User)
def create_user_preferences_and_permissions(sender, instance, created, **kwargs):
    """Créer automatiquement les préférences et permissions lors de la création d'un utilisateur"""
    if created:
        from .models import UserPreferences, UserPermissions

        logger.info(f"[OK] Nouvel utilisateur créé: {instance.username} (email: {instance.email})")
        logger.info(f"  - Organisation: {instance.organization.name if instance.organization else 'Aucune'}")
        logger.info(f"  - Rôle: {instance.role}")

        # Créer les préférences avec modules par défaut selon le rôle
        default_modules = _get_default_modules_for_role(instance.role, instance.organization)
        UserPreferences.objects.get_or_create(
            user=instance,
            defaults={
                'enabled_modules': default_modules,
                'onboarding_completed': False,  # Important: nouveau utilisateur doit passer par l'onboarding
                'onboarding_data': {},
                'dashboard_layout': {},
                'notification_settings': {},
            }
        )

        # Créer les permissions selon le rôle
        default_permissions = _get_default_permissions_for_role(instance.role)
        UserPermissions.objects.get_or_create(
            user=instance,
            defaults={
                'module_access': [],  # Liste vide = pas de restriction, utilise les modules de l'organisation
                **default_permissions
            }
        )


def _get_default_modules_for_role(role, organization=None):
    """Retourne les modules par défaut selon le rôle"""
    from apps.core.modules import Modules

    # If organization is provided, limit to org's modules
    if organization:
        org_modules = organization.get_available_modules()
    else:
        org_modules = None

    role_modules = {
        'admin': [
            Modules.DASHBOARD, Modules.SUPPLIERS, Modules.PURCHASE_ORDERS,
            Modules.INVOICES, Modules.PRODUCTS, Modules.CLIENTS,
            Modules.ANALYTICS
        ],
        'manager': [
            Modules.DASHBOARD, Modules.SUPPLIERS, Modules.PURCHASE_ORDERS,
            Modules.INVOICES, Modules.PRODUCTS, Modules.CLIENTS
        ],
        'buyer': [
            Modules.DASHBOARD, Modules.SUPPLIERS, Modules.PURCHASE_ORDERS,
            Modules.PRODUCTS
        ],
        'accountant': [
            Modules.DASHBOARD, Modules.INVOICES, Modules.CLIENTS, Modules.PRODUCTS
        ],
        'viewer': [Modules.DASHBOARD],
        # Healthcare roles
        'doctor': [
            Modules.DASHBOARD, Modules.PATIENTS, Modules.CONSULTATIONS,
            Modules.LABORATORY, Modules.PHARMACY
        ],
        'nurse': [
            Modules.DASHBOARD, Modules.PATIENTS, Modules.CONSULTATIONS
        ],
        'lab_tech': [
            Modules.DASHBOARD, Modules.PATIENTS, Modules.LABORATORY
        ],
        'pharmacist': [
            Modules.DASHBOARD, Modules.PATIENTS, Modules.PHARMACY
        ],
        'receptionist': [
            Modules.DASHBOARD, Modules.PATIENTS
        ],
    }

    modules = role_modules.get(role, [Modules.DASHBOARD])

    # Intersect with org modules if provided
    if org_modules:
        modules = [m for m in modules if m in org_modules]

    return modules


def _get_default_permissions_for_role(role):
    """Retourne les permissions par défaut selon le rôle"""
    if role == 'admin':
        return {
            'can_manage_users': True,
            'can_manage_settings': True,
            'can_view_analytics': True,
            'can_approve_purchases': True,
        }
    elif role == 'manager':
        return {
            'can_manage_users': False,
            'can_manage_settings': True,
            'can_view_analytics': True,
            'can_approve_purchases': True,
        }
    elif role == 'buyer':
        return {
            'can_manage_users': False,
            'can_manage_settings': False,
            'can_view_analytics': True,
            'can_approve_purchases': False,
        }
    elif role == 'accountant':
        return {
            'can_manage_users': False,
            'can_manage_settings': False,
            'can_view_analytics': True,
            'can_approve_purchases': False,
        }
    else:  # viewer and other roles
        return {
            'can_manage_users': False,
            'can_manage_settings': False,
            'can_view_analytics': False,
            'can_approve_purchases': False,
        }
