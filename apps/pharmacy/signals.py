"""
Signals for automatic pharmacy dispensing billing
Creates invoices when medications are dispensed
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import PharmacyDispensing
from apps.invoicing.models import Invoice
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=PharmacyDispensing)
def create_invoice_for_dispensing(sender, instance, **kwargs):
    """
    Crée une facture pour une dispensation de médicaments
    """
    # Only when dispensed and not already billed
    if instance.status != 'dispensed':
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
            created_by=instance.dispensed_by or instance.organization.users.first(),
            title=f"Pharmacie - {instance.dispensing_number}",
            description=f"Dispensation du {instance.dispensed_at.strftime('%d/%m/%Y')}",
            invoice_type='healthcare_pharmacy',
            due_date=due_date,
            subtotal=0,
            total_amount=0,
            status='draft'
        )
        
        # Add all medications as items
        for item in instance.items.all():
            dosage_text = f"Posologie: {item.dosage}" if item.dosage else ""
            instructions = f"Instructions: {item.instructions}" if item.instructions else ""
            detailed_desc = f"{dosage_text}\\n{instructions}".strip()
            
            invoice.add_item(
                service_code=item.medication.reference,
                description=item.medication.name,
                detailed_description=detailed_desc,
                quantity=item.quantity,
                unit_price=item.unit_price,
                product=item.medication
            )
        
        invoice.recalculate_totals()
        
        logger.info(f"Created invoice {invoice.invoice_number} for dispensing {instance.dispensing_number}")
    
    except Exception as e:
        logger.error(f"Error creating invoice for dispensing {instance.id}: {str(e)}", exc_info=True)
