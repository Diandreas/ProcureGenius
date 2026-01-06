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
