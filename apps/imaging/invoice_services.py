"""
Service de génération de facture pour le module Imagerie.
Mirroir de LabOrderInvoiceService (apps/healthcare/invoice_services.py).
"""
from django.utils import timezone
from apps.invoicing.models import Invoice, InvoiceItem
from apps.accounts.privilege_card import apply_privilege_card_discount


class ImagingOrderInvoiceService:
    """Service pour créer facture commande imagerie"""

    @staticmethod
    def generate_invoice(imaging_order):
        """
        Génère facture pour une commande d'imagerie.

        Args:
            imaging_order: Instance de ImagingOrder

        Returns:
            Invoice: La facture créée

        Raises:
            ValueError: Si facture existe déjà ou aucun examen dans la commande
        """
        if imaging_order.imaging_invoice:
            raise ValueError("Une facture existe déjà pour cette commande d'imagerie")

        if not imaging_order.items.exists():
            raise ValueError("Aucun examen dans cette commande")

        invoice = Invoice.objects.create(
            organization=imaging_order.organization,
            client=imaging_order.patient,
            invoice_type='healthcare_imaging',
            created_by=imaging_order.ordered_by or imaging_order.results_entered_by,
            title=f"Imagerie {imaging_order.order_number}",
            description=f"Commande imagerie #{imaging_order.order_number}",
            due_date=timezone.now().date(),
            status='paid',
            currency='XAF',
            payment_method=imaging_order.payment_method or 'cash',
            subtotal=0,
            tax_amount=0,
            total_amount=0,
        )

        for item in imaging_order.items.all().select_related('exam_type'):
            final_price = item.price - (item.discount or 0)
            notes = f"Code: {item.exam_type.exam_code}" if item.exam_type.exam_code else ''
            InvoiceItem.objects.create(
                invoice=invoice,
                product=None,
                description=item.exam_type.name,
                quantity=1,
                unit_price=item.price,
                discount_amount=item.discount or 0,
                total_price=final_price,
                notes=notes,
            )

        # Carte privilège : réduction automatique si le patient en est titulaire
        apply_privilege_card_discount(invoice, imaging_order.patient, 'imaging')

        invoice.recalculate_totals()

        imaging_order.imaging_invoice = invoice
        imaging_order.save(update_fields=['imaging_invoice'])

        return invoice
