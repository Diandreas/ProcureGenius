# Signals pour la gestion automatique des factures
from django.db.models.signals import post_save, post_delete, pre_delete
from django.dispatch import receiver
from .models import Invoice, InvoiceItem


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
