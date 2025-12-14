"""
Signaux Django pour journaliser automatiquement les activités importantes
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType
from .activity_logger import log_create, log_update, log_delete, log_send, log_payment, log_approve
from apps.invoicing.models import Invoice, Product, StockMovement
from apps.accounts.models import Client
from apps.purchase_orders.models import PurchaseOrder
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Invoice)
def log_invoice_activity(sender, instance, created, **kwargs):
    """Journalise les activités sur les factures"""
    try:
        user = getattr(instance, '_current_user', None) or instance.created_by
        organization = getattr(user, 'organization', None) if user else None
        
        if created:
            log_create(
                entity_type='invoice',
                entity_id=str(instance.id),
                entity_name=f"Facture {instance.invoice_number}",
                user=user,
                organization=organization,
                metadata={
                    'invoice_number': instance.invoice_number,
                    'total_amount': str(instance.total_amount),
                    'status': instance.status,
                    'client_id': str(instance.client.id) if instance.client else None
                }
            )
        else:
            # Vérifier si le statut a changé
            if hasattr(instance, '_previous_status'):
                if instance.status == 'sent':
                    log_send(
                        entity_type='invoice',
                        entity_id=str(instance.id),
                        entity_name=f"Facture {instance.invoice_number}",
                        recipient=instance.client.name if instance.client else None,
                        user=user,
                        organization=organization
                    )
                elif instance.status == 'paid':
                    log_payment(
                        entity_type='invoice',
                        entity_id=str(instance.id),
                        entity_name=f"Facture {instance.invoice_number}",
                        amount=instance.total_amount,
                        user=user,
                        organization=organization
                    )
            else:
                log_update(
                    entity_type='invoice',
                    entity_id=str(instance.id),
                    entity_name=f"Facture {instance.invoice_number}",
                    user=user,
                    organization=organization,
                    metadata={'status': instance.status}
                )
    except Exception as e:
        logger.error(f"Error logging invoice activity: {e}", exc_info=True)


@receiver(post_delete, sender=Invoice)
def log_invoice_delete(sender, instance, **kwargs):
    """Journalise la suppression de factures"""
    try:
        user = getattr(instance, '_current_user', None) or instance.created_by
        organization = getattr(user, 'organization', None) if user else None
        
        log_delete(
            entity_type='invoice',
            entity_id=str(instance.id),
            entity_name=f"Facture {instance.invoice_number}",
            user=user,
            organization=organization
        )
    except Exception as e:
        logger.error(f"Error logging invoice delete: {e}", exc_info=True)


@receiver(post_save, sender=Client)
def log_client_activity(sender, instance, created, **kwargs):
    """Journalise les activités sur les clients"""
    try:
        user = getattr(instance, '_current_user', None)
        organization = instance.organization
        
        if created:
            log_create(
                entity_type='client',
                entity_id=str(instance.id),
                entity_name=instance.name,
                user=user,
                organization=organization
            )
        else:
            log_update(
                entity_type='client',
                entity_id=str(instance.id),
                entity_name=instance.name,
                user=user,
                organization=organization
            )
    except Exception as e:
        logger.error(f"Error logging client activity: {e}", exc_info=True)


@receiver(post_delete, sender=Client)
def log_client_delete(sender, instance, **kwargs):
    """Journalise la suppression de clients"""
    try:
        user = getattr(instance, '_current_user', None)
        organization = instance.organization
        
        log_delete(
            entity_type='client',
            entity_id=str(instance.id),
            entity_name=instance.name,
            user=user,
            organization=organization
        )
    except Exception as e:
        logger.error(f"Error logging client delete: {e}", exc_info=True)


@receiver(post_save, sender=Product)
def log_product_activity(sender, instance, created, **kwargs):
    """Journalise les activités sur les produits"""
    try:
        user = getattr(instance, '_current_user', None)
        organization = instance.organization
        
        if created:
            log_create(
                entity_type='product',
                entity_id=str(instance.id),
                entity_name=instance.name,
                user=user,
                organization=organization,
                metadata={
                    'product_type': instance.product_type,
                    'price': str(instance.price)
                }
            )
        else:
            log_update(
                entity_type='product',
                entity_id=str(instance.id),
                entity_name=instance.name,
                user=user,
                organization=organization
            )
    except Exception as e:
        logger.error(f"Error logging product activity: {e}", exc_info=True)


@receiver(post_save, sender=PurchaseOrder)
def log_po_activity(sender, instance, created, **kwargs):
    """Journalise les activités sur les bons de commande"""
    try:
        user = getattr(instance, '_current_user', None) or instance.created_by
        organization = getattr(user, 'organization', None) if user else None
        
        if created:
            log_create(
                entity_type='purchase_order',
                entity_id=str(instance.id),
                entity_name=f"BC {instance.po_number}",
                user=user,
                organization=organization,
                metadata={
                    'po_number': instance.po_number,
                    'total_amount': str(instance.total_amount),
                    'status': instance.status
                }
            )
        else:
            # Vérifier si le statut a changé
            if hasattr(instance, '_previous_status'):
                if instance.status == 'approved':
                    log_approve(
                        entity_type='purchase_order',
                        entity_id=str(instance.id),
                        entity_name=f"BC {instance.po_number}",
                        user=user,
                        organization=organization
                    )
            else:
                log_update(
                    entity_type='purchase_order',
                    entity_id=str(instance.id),
                    entity_name=f"BC {instance.po_number}",
                    user=user,
                    organization=organization,
                    metadata={'status': instance.status}
                )
    except Exception as e:
        logger.error(f"Error logging PO activity: {e}", exc_info=True)


@receiver(post_save, sender=StockMovement)
def log_stock_movement(sender, instance, created, **kwargs):
    """Journalise les mouvements de stock"""
    try:
        if created:
            user = instance.created_by
            organization = instance.product.organization if instance.product else None
            
            log_create(
                entity_type='stock_movement',
                entity_id=str(instance.id),
                entity_name=f"Mouvement stock - {instance.product.name if instance.product else 'N/A'}",
                user=user,
                organization=organization,
                metadata={
                    'movement_type': instance.movement_type,
                    'quantity': str(instance.quantity),
                    'product_id': str(instance.product.id) if instance.product else None
                }
            )
    except Exception as e:
        logger.error(f"Error logging stock movement: {e}", exc_info=True)

