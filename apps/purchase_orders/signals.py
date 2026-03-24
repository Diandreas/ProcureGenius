from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import PurchaseOrder


@receiver(pre_save, sender=PurchaseOrder)
def _cache_po_status(sender, instance, **kwargs):
    """Mémorise le statut précédent pour détecter le passage à 'received'"""
    if instance.pk:
        try:
            instance._previous_po_status = PurchaseOrder.objects.values_list(
                'status', flat=True
            ).get(pk=instance.pk)
        except PurchaseOrder.DoesNotExist:
            instance._previous_po_status = None
    else:
        instance._previous_po_status = None
