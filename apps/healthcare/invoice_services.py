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
        Génère facture pour commande laboratoire avec kit de prélèvement automatique
        et gestion des réductions.
        """
        if lab_order.lab_invoice:
            raise ValueError("Une facture existe déjà pour cette commande labo")

        if not lab_order.items.exists():
            raise ValueError("Aucun test dans cette commande")

        # Obtenir le kit de prélèvement
        kit_product = Product.objects.filter(
            organization=lab_order.organization,
            name__icontains='Kit de prélèvement'
        ).first()

        # Créer facture
        invoice = Invoice.objects.create(
            organization=lab_order.organization,
            client=lab_order.patient,
            invoice_type='healthcare_laboratory',
            created_by=lab_order.ordered_by or lab_order.results_entered_by,
            title=f"Analyses laboratoire {lab_order.order_number}",
            description=f"Commande laboratoire #{lab_order.order_number}",
            due_date=timezone.now().date(),
            status='paid',
            currency='XAF',
            payment_method=lab_order.payment_method or 'cash',
            subtotal=0,
            tax_amount=0,
            total_amount=0
        )

        # 1. Ajouter le kit de prélèvement (Toujours ajouté pour le labo)
        if kit_product:
            InvoiceItem.objects.create(
                invoice=invoice,
                product=kit_product,
                description=kit_product.name,
                quantity=1,
                unit_price=kit_product.price,
                total_price=kit_product.price,
                notes="Ajouté automatiquement pour toute commande labo"
            )

        # 2. Ajouter les tests de laboratoire avec réductions
        # Bilans (panels) : une seule ligne forfaitaire par bilan
        billed_panels = set()

        for lab_item in lab_order.items.all().select_related('panel', 'lab_test'):
            if lab_item.panel_id:
                # Cet item fait partie d'un bilan
                if lab_item.panel_id in billed_panels:
                    # Déjà facturé via le premier item du bilan → ignorer
                    continue

                if lab_item.panel_price is not None:
                    # Premier item du bilan : créer une ligne forfaitaire
                    billed_panels.add(lab_item.panel_id)
                    panel = lab_item.panel
                    test_list = ", ".join(
                        lab_order.items.filter(panel=panel)
                        .values_list('lab_test__test_code', flat=True)
                    )
                    InvoiceItem.objects.create(
                        invoice=invoice,
                        product=None,
                        description=f"Bilan : {panel.name}",
                        quantity=1,
                        unit_price=lab_item.panel_price,
                        discount_amount=0,
                        total_price=lab_item.panel_price,
                        notes=f"Forfait bilan — Examens inclus : {test_list}"
                    )
                else:
                    # Item de bilan sans panel_price (ne devrait pas arriver) → marquer comme traité
                    billed_panels.add(lab_item.panel_id)
            else:
                # Test individuel (hors bilan)
                test_price = lab_item.price or lab_item.lab_test.price
                test_discount = lab_item.discount or 0
                final_price = test_price - test_discount

                notes = f"Code: {lab_item.lab_test.test_code}"
                if test_discount > 0:
                    notes += f" (Réduction de {test_discount} XAF appliquée sur ce test)"

                InvoiceItem.objects.create(
                    invoice=invoice,
                    product=None,
                    description=lab_item.lab_test.name,
                    quantity=1,
                    unit_price=test_price,
                    discount_amount=test_discount,
                    total_price=final_price,
                    notes=notes
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
