from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from .models import PurchaseOrder, PurchaseOrderHistory
from django.contrib.auth import get_user_model

User = get_user_model()


@receiver(pre_save, sender=PurchaseOrder)
def track_purchase_order_changes(sender, instance, **kwargs):
    """Enregistre les modifications dans l'historique"""
    if instance.pk:  # Modification d'un BC existant
        try:
            old_instance = PurchaseOrder.objects.get(pk=instance.pk)
            
            # Détecter les changements significatifs
            changes = {}
            fields_to_track = [
                'status', 'priority', 'supplier', 'total_amount', 
                'expected_delivery', 'notes'
            ]
            
            for field in fields_to_track:
                old_value = getattr(old_instance, field)
                new_value = getattr(instance, field)
                
                if old_value != new_value:
                    changes[field] = {
                        'old': str(old_value),
                        'new': str(new_value)
                    }
            
            if changes:
                # Créer l'entrée d'historique
                # Note: L'utilisateur sera défini dans la vue
                instance._changes_to_log = changes
                
        except PurchaseOrder.DoesNotExist:
            pass


@receiver(post_save, sender=PurchaseOrder)
def generate_purchase_order_number(sender, instance, created, **kwargs):
    """Génère automatiquement un numéro de BC si nécessaire"""
    if created and not instance.number:
        year = timezone.now().year
        
        # Trouver le dernier numéro de l'année
        last_po = PurchaseOrder.objects.filter(
            number__startswith=f'PO{year}'
        ).exclude(pk=instance.pk).order_by('-number').first()
        
        if last_po and last_po.number:
            try:
                last_num = int(last_po.number.split('-')[-1])
                new_num = last_num + 1
            except (ValueError, IndexError):
                new_num = 1
        else:
            new_num = 1
        
        instance.number = f'PO{year}-{new_num:05d}'
        instance.save(update_fields=['number'])


@receiver(post_save, sender=PurchaseOrder)
def update_supplier_last_order_date(sender, instance, created, **kwargs):
    """Met à jour la date de dernière commande du fournisseur"""
    if created:
        supplier = instance.supplier
        if not supplier.last_order_date or supplier.last_order_date < instance.order_date:
            supplier.last_order_date = instance.order_date
            supplier.save(update_fields=['last_order_date'])


@receiver(post_save, sender=PurchaseOrder)
def create_initial_history_entry(sender, instance, created, **kwargs):
    """Crée l'entrée d'historique initiale pour un nouveau BC"""
    if created:
        PurchaseOrderHistory.objects.create(
            purchase_order=instance,
            user=instance.created_by,
            action='created',
            new_values={
                'status': instance.status,
                'supplier': instance.supplier.name,
                'total_amount': str(instance.total_amount),
                'created_by_ai': instance.created_by_ai
            },
            notes=f'Bon de commande créé {"par IA" if instance.created_by_ai else "manuellement"}'
        )