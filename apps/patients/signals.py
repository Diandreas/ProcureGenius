"""
Signals for automatic patient care service tracking
When services are billed to patients, automatically create care service records
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.invoicing.models import InvoiceItem
import logging

logger = logging.getLogger(__name__)


# Categories that are considered care services
CARE_CATEGORIES = [
    'Soins Infirmiers',
    'Consultations',
    'Maternité',
    'Imagerie',
    'Explorations',
    'Chirurgie',
    'Vaccinations',
    'Bilans',
    'Hospitalisation',
]


def is_care_service(product):
    """Vérifie si un produit est un service de soin médical"""
    if not product or product.product_type != 'service':
        return False
    
    if product.category and product.category.name in CARE_CATEGORIES:
        return True
    
    return False


def get_service_type_from_category(category_name):
    """Détermine le type de service basé sur la catégorie"""
    category_to_type = {
        'Consultations': 'consultation',
        'Soins Infirmiers': 'nursing_care',
        'Imagerie': 'imaging',
        'Explorations': 'imaging',
        'Chirurgie': 'procedure',
        'Maternité': 'procedure',
        'Vaccinations': 'nursing_care',
        'Bilans': 'other',
        'Hospitalisation': 'other',
    }
    return category_to_type.get(category_name, 'other')


@receiver(post_save, sender=InvoiceItem)
def track_care_service_in_patient_record(sender, instance, created, **kwargs):
    """
    Quand un service de soin est facturé, l'enregistrer automatiquement 
    dans le dossier patient
    """
    # Only for new items
    if not created:
        return
    
    # Check if it's a care service
    if not instance.product or not is_care_service(instance.product):
        return
    
    # Verify that the client is a patient
    if not instance.invoice.client or not instance.invoice.client.is_patient:
        return
    
    # Avoid duplicates - check if already tracked
    from .models_care import PatientCareService
    existing = PatientCareService.objects.filter(
        invoice_item=instance
    ).exists()
    
    if existing:
        return
    
    try:
        # Determine service type
        service_type = get_service_type_from_category(
            instance.product.category.name if instance.product.category else ""
        )
        
        # Create care service record
        care_service = PatientCareService.objects.create(
            patient=instance.invoice.client,
            service_product=instance.product,
            service_type=service_type,
            service_name=instance.product.name,
            service_category=instance.product.category.name if instance.product.category else "",
            invoice_item=instance,
            is_billed=True,
            quantity=instance.quantity,
            notes=instance.notes or "",
            provided_at=instance.invoice.created_at
        )
        
        logger.info(f"Created care service record: {care_service.id} for patient {instance.invoice.client.name}")
    
    except Exception as e:
        logger.error(f"Error creating care service record: {str(e)}", exc_info=True)
