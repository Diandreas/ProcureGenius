"""
Services pour génération de factures des modules santé
Manuel uniquement (bouton "Générer Facture")
"""
from decimal import Decimal
from django.utils import timezone
from apps.invoicing.models import Invoice, InvoiceItem, Product
from apps.accounts.privilege_card import apply_privilege_card_discount


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

        # Carte privilège : réduction automatique si le patient en est titulaire
        apply_privilege_card_discount(invoice, consultation.patient, 'consultation')

        # Recalculer totaux
        invoice.recalculate_totals()

        # Lier facture à consultation
        consultation.consultation_invoice = invoice
        consultation.save(update_fields=['consultation_invoice'])

        return invoice


class LabOrderInvoiceService:
    """Service pour créer facture commande labo"""

    @staticmethod
    def generate_invoice(lab_order, privilege_card_used_by=None):
        """
        Génère facture pour commande laboratoire avec kit de prélèvement automatique
        et gestion des réductions.

        privilege_card_used_by: dict optionnel {'patient': Client|None, 'name': str, 'relationship': str}
        précisant qui a utilisé la carte privilège du patient (par défaut le titulaire).
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

        # Kit de prélèvement : NE PLUS l'ajouter automatiquement.
        # Les examens ayant des consommables liés déduisent leurs propres réactifs
        # via TestConsumable, donc facturer un kit en double est redondant.

        # Ajouter les tests de laboratoire avec réductions
        # Bilans (panels) : une seule ligne forfaitaire par bilan.
        #
        # IMPORTANT : LabOrderItem.Meta.ordering = ['lab_test__name'] — l'ordre
        # de lecture ci-dessous n'a donc RIEN à voir avec l'ordre dans lequel les
        # items ont été créés (et donc avec lequel a reçu panel_price). Si on se
        # fiait à "le premier item du bilan rencontré porte panel_price", un item
        # sans panel_price rencontré avant marquait le bilan comme déjà facturé
        # (billed_panels) et l'item porteur du prix, rencontré plus tard, était
        # alors ignoré silencieusement → facture à 0 F pour tout le bilan. D'où
        # le pré-calcul ci-dessous, indépendant de l'ordre d'itération.
        all_items = list(lab_order.items.all().select_related('panel', 'lab_test'))
        panel_prices = {}
        panel_test_codes = {}
        for lab_item in all_items:
            if not lab_item.panel_id:
                continue
            panel_test_codes.setdefault(lab_item.panel_id, []).append(lab_item.lab_test.test_code)
            if lab_item.panel_price is not None:
                panel_prices[lab_item.panel_id] = lab_item.panel_price

        billed_panels = set()

        for lab_item in all_items:
            if lab_item.panel_id:
                # Cet item fait partie d'un bilan — une seule ligne forfaitaire
                if lab_item.panel_id in billed_panels:
                    continue
                billed_panels.add(lab_item.panel_id)
                panel = lab_item.panel
                panel_price = panel_prices.get(lab_item.panel_id, Decimal('0'))
                test_list = ", ".join(panel_test_codes.get(lab_item.panel_id, []))
                InvoiceItem.objects.create(
                    invoice=invoice,
                    product=None,
                    description=f"Bilan : {panel.name}",
                    quantity=1,
                    unit_price=panel_price,
                    discount_amount=0,
                    total_price=panel_price,
                    notes=f"Forfait bilan — Examens inclus : {test_list}"
                )
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

        # Carte privilège : réduction automatique si le patient en est titulaire —
        # uniquement sur les bilans/packs, jamais sur les examens individuels.
        used_by = privilege_card_used_by or {}
        apply_privilege_card_discount(
            invoice, lab_order.patient, 'laboratory',
            used_by_patient=used_by.get('patient'),
            used_by_name=used_by.get('name', ''),
            used_by_relationship=used_by.get('relationship', ''),
            item_filter=lambda item: item.description.startswith('Bilan : '),
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

        # Carte privilège : réduction automatique si le patient en est titulaire
        if dispensing.patient:
            apply_privilege_card_discount(invoice, dispensing.patient, 'pharmacy')

        # Recalculer totaux
        invoice.recalculate_totals()

        # Lier facture à dispensation
        dispensing.pharmacy_invoice = invoice
        dispensing.save(update_fields=['pharmacy_invoice'])

        return invoice
