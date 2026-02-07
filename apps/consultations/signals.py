"""
Signals for automatic consultation billing
Creates invoices automatically when consultations are completed
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Consultation
from apps.invoicing.models import Invoice, Product
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Consultation)
def create_invoice_for_consultation(sender, instance, created, **kwargs):
    """
    Crée automatiquement une facture pour une consultation
    Si un service "Consultation" existe dans Product, l'utilise, sinon crée item manuel
    """
    # Only for new consultations and if not already invoiced
    if not created:
        return
    
    # Check if invoice already exists for this consultation
    if hasattr(instance, 'care_services') and instance.care_services.filter(is_billed=True).exists():
        return
    
    try:
        # Find consultation service in product catalog
        consultation_service = None
        try:
            consultation_service = Product.objects.filter(
                organization=instance.organization,
                product_type='service',
                category__name__icontains='consultation',
                is_active=True
            ).first()
        except Exception as e:
            logger.warning(f"Could not find consultation service product: {e}")
        
        # Create invoice
        due_date = timezone.now().date() + timedelta(days=7)
        invoice_creator = instance.created_by or instance.doctor
        
        # Fallback if no creator is found (should not happen with API fix)
        if not invoice_creator:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            invoice_creator = User.objects.filter(is_superuser=True).first()

        invoice = Invoice.objects.create(
            organization=instance.organization,
            client=instance.patient,
            created_by=invoice_creator,
            title=f"Consultation - {instance.consultation_number}",
            description=f"Consultation du {instance.consultation_date.strftime('%d/%m/%Y')}\nMotif: {instance.chief_complaint or 'N/A'}",
            invoice_type='healthcare_consultation',
            due_date=due_date,
            subtotal=0,
            total_amount=0,
            status='sent'
        )
        
        # Add service
        service_name = consultation_service.name if consultation_service else "Consultation Médicale"
        price = consultation_service.price if consultation_service else 10000  # Default price
        service_code = f"CONS-{instance.consultation_number}"
        
        invoice.add_item(
            service_code=service_code,
            description=service_name,
            detailed_description=f"Motif: {instance.chief_complaint or 'N/A'}\\nDiagnostic: {instance.diagnosis or 'En cours'}",
            quantity=1,
            unit_price=price,
            product=consultation_service
        )
        
        invoice.recalculate_totals()
        
        # Link invoice to consultation via care service (will be created by patients signals)
        logger.info(f"Created invoice {invoice.invoice_number} for consultation {instance.consultation_number}")
    
    except Exception as e:
        logger.error(f"Error creating invoice for consultation {instance.id}: {str(e)}", exc_info=True)
