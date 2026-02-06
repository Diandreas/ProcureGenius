"""
Services pour génération de factures des modules santé
Manuel uniquement (bouton "Générer Facture")
"""
from decimal import Decimal
from django.utils import timezone
from apps.invoicing.models import Invoice, InvoiceItem, Product


class ConsultationInvoiceService:
    """Service pour créer facture consultation"""

    @staticmethod
    def generate_invoice(consultation):
        """
        Génère facture pour consultation

        Args:
            consultation: Instance de Consultation

        Returns:
            Invoice: La facture créée

        Raises:
            ValueError: Si facture existe déjà
        """
        if consultation.consultation_invoice:
            raise ValueError("Une facture existe déjà pour cette consultation")

        # Obtenir ou créer produit "Consultation"
        consultation_product, _ = Product.objects.get_or_create(
            organization=consultation.organization,
            reference='CONS-FEE',
            defaults={
                'name': 'Frais de consultation',
                'product_type': 'service',
                'price': Decimal('50.00'),  # Prix par défaut, configurable
                'category': 'healthcare',
                'description': 'Consultation médicale'
            }
        )

        # Créer facture
        invoice = Invoice.objects.create(
            organization=consultation.organization,
            client=consultation.patient,
            invoice_type='healthcare_consultation',
            created_by=consultation.doctor or consultation.created_by,
            title=f"Consultation {consultation.consultation_number}",
            description=f"Consultation médicale - Dr {consultation.doctor.get_full_name() if consultation.doctor else 'N/A'}",
            due_date=timezone.now().date(),  # Payable immédiatement
            status='sent',
            subtotal=0,
            tax_amount=0,
            total_amount=0
        )

        # Créer ligne de facture
        InvoiceItem.objects.create(
            invoice=invoice,
            product=consultation_product,
            description=f"Consultation médicale - Dr {consultation.doctor.get_full_name() if consultation.doctor else 'N/A'}",
            quantity=1,
            unit_price=consultation_product.price,
            total_price=consultation_product.price
        )

        # Recalculer totaux
        invoice.recalculate_totals()

        # Lier facture à consultation
        consultation.consultation_invoice = invoice
        consultation.save(update_fields=['consultation_invoice'])

        return invoice


class LabOrderInvoiceService:
    """Service pour créer facture commande labo"""

    @staticmethod
    def generate_invoice(lab_order):
        """
        Génère facture pour commande laboratoire

        Args:
            lab_order: Instance de LabOrder

        Returns:
            Invoice: La facture créée

        Raises:
            ValueError: Si facture existe déjà ou aucun test
        """
        if lab_order.lab_invoice:
            raise ValueError("Une facture existe déjà pour cette commande labo")

        if not lab_order.items.exists():
            raise ValueError("Aucun test dans cette commande")

        # Créer facture
        invoice = Invoice.objects.create(
            organization=lab_order.organization,
            client=lab_order.patient,
            invoice_type='healthcare_laboratory',
            created_by=lab_order.ordered_by,
            title=f"Analyses laboratoire {lab_order.order_number}",
            description=f"Commande laboratoire #{lab_order.order_number}",
            due_date=timezone.now().date(),
            status='paid',
            subtotal=0,
            tax_amount=0,
            total_amount=0
        )

        # Créer lignes de facture pour chaque test
        for lab_item in lab_order.items.all():
            InvoiceItem.objects.create(
                invoice=invoice,
                product=None,  # LabTest n'est pas un Product
                description=lab_item.lab_test.name,
                quantity=1,
                unit_price=lab_item.lab_test.price,
                total_price=lab_item.lab_test.price,
                notes=f"Code: {lab_item.lab_test.test_code}"
            )

        # Recalculer totaux
        invoice.recalculate_totals()

        # Lier facture à commande labo
        lab_order.lab_invoice = invoice
        lab_order.save(update_fields=['lab_invoice'])

        return invoice


class PharmacyInvoiceService:
    """Service pour créer facture dispensation pharmacie"""

    @staticmethod
    def generate_invoice(dispensing):
        """
        Génère facture pour dispensation pharmacie

        Args:
            dispensing: Instance de PharmacyDispensing

        Returns:
            Invoice: La facture créée

        Raises:
            ValueError: Si facture existe déjà ou aucun médicament
        """
        if dispensing.pharmacy_invoice:
            raise ValueError("Une facture existe déjà pour cette dispensation")

        if not dispensing.items.exists():
            raise ValueError("Aucun médicament dans cette dispensation")

        # Créer facture
        invoice = Invoice.objects.create(
            organization=dispensing.organization,
            client=dispensing.patient,  # Peut être None pour vente comptoir
            invoice_type='healthcare_pharmacy',
            created_by=dispensing.dispensed_by,
            title=f"Dispensation {dispensing.dispensing_number}",
            description=f"Dispensation pharmacie #{dispensing.dispensing_number}",
            due_date=timezone.now().date(),
            status='sent',
            subtotal=0,
            tax_amount=0,
            total_amount=0
        )

        # Créer lignes de facture pour chaque médicament
        for disp_item in dispensing.items.all():
            InvoiceItem.objects.create(
                invoice=invoice,
                product=disp_item.medication,
                description=disp_item.medication.name,
                quantity=disp_item.quantity_dispensed,
                unit_price=disp_item.unit_price,
                total_price=disp_item.total_price,
                notes=f"Posologie: {disp_item.dosage_instructions}" if disp_item.dosage_instructions else None
            )

        # Recalculer totaux
        invoice.recalculate_totals()

        # Lier facture à dispensation
        dispensing.pharmacy_invoice = invoice
        dispensing.save(update_fields=['pharmacy_invoice'])

        return invoice
