"""
Service de génération de facture pour le module Vaccination.
Mirroir de ImagingOrderInvoiceService (apps/imaging/invoice_services.py),
avec une différence clé : un vaccin non-facturable (PEV officiel, gratuit)
ne doit PAS lever d'erreur — generate_invoice retourne simplement None,
distinct du cas d'échec réel (facture déjà existante).
"""
from django.utils import timezone
from apps.invoicing.models import Invoice, InvoiceItem


class VaccinationInvoiceService:
    """Service pour créer la facture d'une vaccination (quand elle est facturable)"""

    @staticmethod
    def generate_invoice(record, created_by=None):
        """
        Génère la facture pour une VaccinationRecord.

        Returns:
            Invoice si le vaccin est facturable et la facture a été créée.
            None si le vaccin n'est pas facturable (ex: PEV gratuit) — ce n'est
            pas une erreur, juste "rien à facturer".

        Raises:
            ValueError: si une facture existe déjà pour cette vaccination.
        """
        if record.invoice:
            raise ValueError("Une facture existe déjà pour cette vaccination")

        vaccine_type = record.vaccine_type
        if not vaccine_type.is_billable or not vaccine_type.price or vaccine_type.price <= 0:
            return None

        invoice = Invoice.objects.create(
            organization=record.organization,
            client=record.patient,
            invoice_type='healthcare_vaccination',
            created_by=created_by or record.administered_by,
            title=f"Vaccination — {vaccine_type.name}",
            description=f"Vaccination {vaccine_type.name} du {record.administered_date.strftime('%d/%m/%Y')}",
            due_date=timezone.now().date(),
            status='paid',
            currency='XAF',
            payment_method='cash',
            subtotal=vaccine_type.price,
            tax_amount=0,
            total_amount=vaccine_type.price,
        )

        InvoiceItem.objects.create(
            invoice=invoice,
            product=None,
            description=vaccine_type.name,
            quantity=1,
            unit_price=vaccine_type.price,
            total_price=vaccine_type.price,
        )

        invoice.recalculate_totals()

        record.invoice = invoice
        record.save(update_fields=['invoice'])

        return invoice
