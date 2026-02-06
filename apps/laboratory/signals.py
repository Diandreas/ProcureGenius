"""
Signals for automatic laboratory order billing
Creates invoices when lab results are verified
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import LabOrder
from apps.invoicing.models import Invoice
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=LabOrder)
def create_invoice_for_lab_order(sender, instance, **kwargs):
    """
    Crée une facture pour une commande de labo une fois que les résultats sont validés
    """
    # Only when results are verified and not already billed
    if instance.status != 'verified':
        return
    
    # Check if already billed
    if hasattr(instance, 'care_services') and instance.care_services.filter(is_billed=True).exists():
        return
    
    try:
        # Create invoice
        due_date = timezone.now().date() + timedelta(days=7)
        invoice = Invoice.objects.create(
            organization=instance.organization,
            client=instance.patient,
            created_by=instance.ordered_by or instance.organization.users.first(),
            title=f"Analyses Laboratoire - {instance.order_number}",
            description=f"Tests commandés le {instance.order_date.strftime('%d/%m/%Y')}",
            invoice_type='healthcare_laboratory',
            due_date=due_date,
            subtotal=0,
            total_amount=0,
            status='paid'
        )
        
        # Add all tests as items
        for item in instance.items.all():
            result_text = f"Résultat: {item.result_value}" if item.result_value else "En attente"
            abnormal_text = ""
            if item.abnormality:
                abnormal_text = f"\\n[{item.get_abnormality_display()}]"
            
            invoice.add_item(
                service_code=item.lab_test.test_code,
                description=item.lab_test.name,
                detailed_description=f"{result_text}{abnormal_text}",
                quantity=1,
                unit_price=item.price,  # Use price from LabOrderItem
                product=item.lab_test.service_product if hasattr(item.lab_test, 'service_product') else None
            )
        
        invoice.recalculate_totals()
        
        logger.info(f"Created invoice {invoice.invoice_number} for lab order {instance.order_number}")
    
    except Exception as e:
        logger.error(f"Error creating invoice for lab order {instance.id}: {str(e)}", exc_info=True)
