"""
Service de facturation pour le module Maternité.
Miroir de ConsultationInvoiceService (apps/healthcare/invoice_services.py) — un Product
catalogue par acte facturable, dans la catégorie "Maternité", plutôt que des prix codés
en dur : cohérent avec le reste de l'app (le prix reste modifiable par l'admin).
"""
from decimal import Decimal
from django.utils import timezone
from apps.invoicing.models import Invoice, InvoiceItem, Product, ProductCategory


def _get_maternity_product(organization, reference, name, default_price='0.00'):
    category, _ = ProductCategory.objects.get_or_create(
        organization=organization,
        name='Maternité',
    )
    product, _ = Product.objects.get_or_create(
        organization=organization,
        reference=reference,
        defaults={
            'name': name,
            'product_type': 'service',
            'price': Decimal(default_price),
            'category': category,
            'description': name,
        }
    )
    return product


class MaternityInvoiceService:
    """Service pour créer les factures liées à la maternité (invoice_type=healthcare_maternity)"""

    @staticmethod
    def _create_invoice(organization, patient, created_by, title, description, product):
        invoice = Invoice.objects.create(
            organization=organization,
            client=patient,
            invoice_type='healthcare_maternity',
            created_by=created_by,
            title=title,
            description=description,
            due_date=timezone.now().date(),
            status='paid',
            subtotal=0,
            tax_amount=0,
            total_amount=0,
        )
        InvoiceItem.objects.create(
            invoice=invoice,
            product=product,
            description=product.name,
            quantity=1,
            unit_price=product.price,
            total_price=product.price,
        )
        invoice.recalculate_totals()
        return invoice

    @staticmethod
    def generate_prenatal_visit_invoice(visit, created_by):
        if visit.visit_invoice:
            raise ValueError("Une facture existe déjà pour cette consultation prénatale")

        pregnancy = visit.pregnancy
        product = _get_maternity_product(
            pregnancy.organization, 'CPN-FEE', 'Consultation prénatale (CPN)', '3000.00'
        )
        invoice = MaternityInvoiceService._create_invoice(
            organization=pregnancy.organization,
            patient=pregnancy.patient,
            created_by=visit.doctor or created_by,
            title=f"Consultation prénatale - {pregnancy.patient.name}",
            description=f"CPN du {visit.visit_date.strftime('%d/%m/%Y')}",
            product=product,
        )
        visit.visit_invoice = invoice
        visit.save(update_fields=['visit_invoice'])
        return invoice

    @staticmethod
    def generate_delivery_invoice(delivery, created_by):
        if delivery.delivery_invoice:
            raise ValueError("Une facture existe déjà pour cet accouchement")

        pregnancy = delivery.pregnancy
        ref_by_type = {
            'vaginal': ('DELIVERY-VAGINAL-FEE', 'Accouchement voie basse'),
            'cesarean': ('DELIVERY-CESAREAN-FEE', 'Accouchement césarienne'),
            'instrumental': ('DELIVERY-INSTRUMENTAL-FEE', 'Accouchement voie basse instrumentale'),
        }
        reference, name = ref_by_type.get(delivery.delivery_type, ref_by_type['vaginal'])
        product = _get_maternity_product(pregnancy.organization, reference, name, '25000.00')
        invoice = MaternityInvoiceService._create_invoice(
            organization=pregnancy.organization,
            patient=pregnancy.patient,
            created_by=created_by,
            title=f"Accouchement - {pregnancy.patient.name}",
            description=f"{name} du {delivery.delivery_date.strftime('%d/%m/%Y')}",
            product=product,
        )
        delivery.delivery_invoice = invoice
        delivery.save(update_fields=['delivery_invoice'])
        return invoice

    @staticmethod
    def generate_postnatal_visit_invoice(visit, created_by):
        if visit.visit_invoice:
            raise ValueError("Une facture existe déjà pour ce suivi post-natal")

        pregnancy = visit.delivery.pregnancy
        product = _get_maternity_product(
            pregnancy.organization, 'POSTNATAL-FEE', 'Suivi post-natal', '2000.00'
        )
        invoice = MaternityInvoiceService._create_invoice(
            organization=pregnancy.organization,
            patient=pregnancy.patient,
            created_by=visit.doctor or created_by,
            title=f"Suivi post-natal - {pregnancy.patient.name}",
            description=f"Visite post-natale du {visit.visit_date.strftime('%d/%m/%Y')}",
            product=product,
        )
        visit.visit_invoice = invoice
        visit.save(update_fields=['visit_invoice'])
        return invoice
