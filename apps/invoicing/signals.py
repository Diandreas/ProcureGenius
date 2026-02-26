# Signals pour la gestion automatique des factures
from django.db.models.signals import post_save, post_delete, pre_delete, pre_save
from django.dispatch import receiver
from .models import Invoice, InvoiceItem
from apps.accounts.models import Client
from apps.purchase_orders.models import PurchaseOrder


@receiver(post_save, sender=InvoiceItem)
def recalculate_invoice_totals_on_item_save(sender, instance, **kwargs):
    """Recalcule les totaux de la facture quand un élément est sauvegardé"""
    if instance.invoice_id:
        instance.invoice.recalculate_totals()


@receiver(post_delete, sender=InvoiceItem)
def recalculate_invoice_totals_on_item_delete(sender, instance, **kwargs):
    """Recalcule les totaux de la facture quand un élément est supprimé"""
    if instance.invoice_id:
        try:
            instance.invoice.recalculate_totals()
        except Invoice.DoesNotExist:
            # La facture n'existe plus, pas besoin de recalculer
            pass


@receiver(pre_delete, sender=Invoice)
def cleanup_invoice_items(sender, instance, **kwargs):
    """Nettoie les éléments avant de supprimer une facture"""
    # Les éléments seront supprimés automatiquement grâce à CASCADE
    # Ce signal peut être utilisé pour d'autres nettoyages si nécessaire
    pass


@receiver(pre_save, sender=Invoice)
def track_invoice_status_change(sender, instance, **kwargs):
    """Stocke le statut précédent pour détecter les changements dans post_save"""
    if instance.pk:
        try:
            instance._old_status = Invoice.objects.get(pk=instance.pk).status
        except Invoice.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=Invoice)
def handle_stock_on_invoice_validation(sender, instance, created, **kwargs):
    """
    Déclenche les mouvements de stock quand une facture passe de 'draft' à un autre statut.
    """
    old_status = getattr(instance, '_old_status', None)
    
    # Si passage de draft -> (sent, paid, overdue)
    if old_status == 'draft' and instance.status in ['sent', 'paid', 'overdue']:
        for item in instance.items.filter(product__product_type='physical'):
            # Ajuster le stock global du produit
            item.product.adjust_stock(
                quantity=-item.quantity,
                movement_type='sale',
                reference_type='invoice',
                reference_id=instance.id,
                notes=f"Validation Facture {instance.invoice_number}",
                user=instance.created_by
            )
            # Ajuster le lot si spécifié
            if item.batch:
                item.batch.quantity_remaining -= item.quantity
                item.batch.save(update_fields=['quantity_remaining'])
                item.batch.update_status()
    
    # Si passage de (sent, paid, overdue) -> cancelled
    elif old_status in ['sent', 'paid', 'overdue'] and instance.status == 'cancelled':
        for item in instance.items.filter(product__product_type='physical'):
            # Restaurer le stock (mouvement inverse)
            item.product.adjust_stock(
                quantity=item.quantity,
                movement_type='return',
                reference_type='invoice',
                reference_id=instance.id,
                notes=f"Annulation Facture {instance.invoice_number}",
                user=instance.created_by
            )
            # Restaurer le lot
            if item.batch:
                item.batch.quantity_remaining += item.quantity
                item.batch.save(update_fields=['quantity_remaining'])
                item.batch.update_status()


@receiver(post_save, sender=Invoice)
def update_invoice_overdue_status(sender, instance, **kwargs):
    """Met à jour automatiquement le statut 'overdue' des factures"""
    try:
        instance.update_overdue_status()
    except Exception:
        pass


@receiver(post_save, sender=Invoice)
def update_client_activity_on_invoice(sender, instance, created, **kwargs):
    """Met à jour l'activité du client quand une facture est créée/modifiée"""
    if instance.client:
        try:
            from django.utils import timezone
            # Mettre à jour la date d'activité
            instance.client.last_activity_date = instance.created_at
            # Si le client n'est pas géré manuellement, mettre à jour le statut
            if not instance.client.is_manually_active:
                instance.client.update_activity_status()
            else:
                # Juste mettre à jour la date d'activité
                instance.client.save(update_fields=['last_activity_date', 'updated_at'])
        except Exception:
            pass


@receiver(post_save, sender=PurchaseOrder)
def update_purchase_order_status_auto(sender, instance, **kwargs):
    """Met à jour automatiquement les statuts 'received' et 'invoiced' des purchase orders"""
    try:
        instance.update_status_automatically()
    except Exception:
        pass


@receiver(post_save, sender=PurchaseOrder)
def update_supplier_activity_on_po(sender, instance, created, **kwargs):
    """Met à jour l'activité du fournisseur quand un purchase order est créé/modifié"""
    if instance.supplier:
        try:
            from django.utils import timezone
            # Mettre à jour la date d'activité
            instance.supplier.last_activity_date = instance.created_at
            # Si le fournisseur n'est pas géré manuellement, mettre à jour le statut
            if not instance.supplier.is_manually_active:
                instance.supplier.update_activity_status()
            else:
                # Juste mettre à jour la date d'activité
                instance.supplier.save(update_fields=['last_activity_date', 'updated_at'])
        except Exception:
            pass


@receiver(post_save, sender=Invoice)
def update_supplier_rating_on_invoice(sender, instance, created, **kwargs):
    """Met à jour le rating du fournisseur quand une facture liée à un PO est payée"""
    if instance.purchase_order and instance.purchase_order.supplier and instance.status == 'paid':
        try:
            from apps.suppliers.services import SupplierRatingService
            SupplierRatingService.update_supplier_rating(instance.purchase_order.supplier)
        except Exception:
            pass
