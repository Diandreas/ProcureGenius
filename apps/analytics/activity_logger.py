"""
Service de journalisation des activités
Permet d'enregistrer automatiquement toutes les actions importantes
"""
from .models import ActivityLog
from django.contrib.auth import get_user_model
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


def log_activity(
    action_type,
    entity_type,
    entity_id,
    description,
    user=None,
    organization=None,
    metadata=None,
    request=None
):
    """
    Enregistre une activité dans le journal
    
    Args:
        action_type: Type d'action (create, update, delete, etc.)
        entity_type: Type d'entité (invoice, client, product, etc.)
        entity_id: ID de l'entité (UUID string)
        description: Description de l'action
        user: Utilisateur qui a effectué l'action
        organization: Organisation concernée
        metadata: Données supplémentaires (dict)
        request: Objet request Django (pour IP et user agent)
    """
    try:
        # Extraire IP et user agent depuis request si fourni
        ip_address = None
        user_agent = ''
        if request:
            ip_address = get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')[:255]
        
        # Déterminer l'organisation si non fournie
        if not organization and user:
            organization = getattr(user, 'organization', None)
        
        ActivityLog.objects.create(
            user=user,
            organization=organization,
            action_type=action_type,
            entity_type=entity_type,
            entity_id=str(entity_id),
            description=description,
            metadata=metadata or {},
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        logger.error(f"Error logging activity: {e}", exc_info=True)


def get_client_ip(request):
    """Extrait l'adresse IP du client depuis la requête"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


# Helpers pour les actions courantes
def log_create(entity_type, entity_id, entity_name, user=None, organization=None, request=None, **metadata):
    """Journalise une création"""
    log_activity(
        action_type='create',
        entity_type=entity_type,
        entity_id=entity_id,
        description=f"Création de {entity_name}",
        user=user,
        organization=organization,
        metadata={'entity_name': entity_name, **metadata},
        request=request
    )


def log_update(entity_type, entity_id, entity_name, user=None, organization=None, request=None, **metadata):
    """Journalise une modification"""
    log_activity(
        action_type='update',
        entity_type=entity_type,
        entity_id=entity_id,
        description=f"Modification de {entity_name}",
        user=user,
        organization=organization,
        metadata={'entity_name': entity_name, **metadata},
        request=request
    )


def log_delete(entity_type, entity_id, entity_name, user=None, organization=None, request=None, **metadata):
    """Journalise une suppression"""
    log_activity(
        action_type='delete',
        entity_type=entity_type,
        entity_id=entity_id,
        description=f"Suppression de {entity_name}",
        user=user,
        organization=organization,
        metadata={'entity_name': entity_name, **metadata},
        request=request
    )


def log_send(entity_type, entity_id, entity_name, recipient=None, user=None, organization=None, request=None, **metadata):
    """Journalise un envoi (facture, email, etc.)"""
    log_activity(
        action_type='send',
        entity_type=entity_type,
        entity_id=entity_id,
        description=f"Envoi de {entity_name}" + (f" à {recipient}" if recipient else ""),
        user=user,
        organization=organization,
        metadata={'entity_name': entity_name, 'recipient': recipient, **metadata},
        request=request
    )


def log_payment(entity_type, entity_id, entity_name, amount=None, user=None, organization=None, request=None, **metadata):
    """Journalise un paiement"""
    log_activity(
        action_type='pay',
        entity_type=entity_type,
        entity_id=entity_id,
        description=f"Paiement de {entity_name}" + (f" - {amount}" if amount else ""),
        user=user,
        organization=organization,
        metadata={'entity_name': entity_name, 'amount': str(amount) if amount else None, **metadata},
        request=request
    )


def log_approve(entity_type, entity_id, entity_name, user=None, organization=None, request=None, **metadata):
    """Journalise une approbation"""
    log_activity(
        action_type='approve',
        entity_type=entity_type,
        entity_id=entity_id,
        description=f"Approbation de {entity_name}",
        user=user,
        organization=organization,
        metadata={'entity_name': entity_name, **metadata},
        request=request
    )

