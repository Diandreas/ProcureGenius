"""
Remet les remises (discount_amount) sur les items de factures labo
qui ont perdu leurs remises suite à une réédition.

Fonctionne en croisant les items de facture avec les LabOrderItems correspondants
(même test, même facture liée à un LabOrder).

Usage:
    python manage.py fix_invoice_discounts --date 2026-02-27
    python manage.py fix_invoice_discounts --date 2026-02-27 --apply
"""
from django.core.management.base import BaseCommand
from datetime import date
from decimal import Decimal
from django.db.models import Sum


class Command(BaseCommand):
    help = 'Corrige les remises perdues sur les items de factures labo'

    def add_arguments(self, parser):
        parser.add_argument('--date', type=str, default=None, help='Limiter a une date YYYY-MM-DD')
        parser.add_argument('--apply', action='store_true', help='Appliquer les corrections (sans --apply = simulation)')

    def handle(self, *args, **options):
        from apps.invoicing.models import Invoice, InvoiceItem

        target_date = None
        if options['date']:
            target_date = date.fromisoformat(options['date'])

        apply = options['apply']
        mode = 'CORRECTION' if apply else 'SIMULATION'
        self.stdout.write(self.style.SUCCESS(f"\n[{mode}] Recherche des remises perdues...\n"))

        # Chercher toutes les factures liées à un LabOrder via lab_order.lab_invoice
        try:
            from apps.laboratory.models import LabOrder
        except ImportError:
            self.stdout.write(self.style.ERROR("Module laboratory introuvable."))
            return

        lab_orders = LabOrder.objects.filter(lab_invoice__isnull=False).select_related('lab_invoice')
        if target_date:
            lab_orders = lab_orders.filter(lab_invoice__created_at__date=target_date)

        total_fixed = 0
        total_amount_recovered = Decimal('0')

        for lab_order in lab_orders:
            invoice = lab_order.lab_invoice
            changed = False

            for lab_item in lab_order.items.all():
                test_discount = lab_item.discount or 0
                if test_discount <= 0:
                    continue  # Pas de remise sur ce test

                test_name = lab_item.lab_test.name
                test_price = lab_item.price or lab_item.lab_test.price

                # Chercher l'item de facture correspondant (même description/test)
                invoice_item = invoice.items.filter(
                    description=test_name,
                    unit_price=test_price,
                ).first()

                if not invoice_item:
                    # Essayer avec juste le nom
                    invoice_item = invoice.items.filter(description=test_name).first()

                if not invoice_item:
                    self.stdout.write(
                        self.style.WARNING(
                            f"  {invoice.invoice_number} : item '{test_name}' introuvable dans la facture"
                        )
                    )
                    continue

                if invoice_item.discount_amount == test_discount:
                    continue  # Remise déjà correcte

                old_discount = invoice_item.discount_amount
                old_total = invoice_item.total_price
                expected_total = invoice_item.unit_price * invoice_item.quantity - Decimal(str(test_discount))

                self.stdout.write(
                    f"  {invoice.invoice_number} | {test_name[:40]:<40} | "
                    f"remise {float(old_discount):,.0f} -> {float(test_discount):,.0f} | "
                    f"total {float(old_total):,.0f} -> {float(expected_total):,.0f}"
                )

                if apply:
                    invoice_item.discount_amount = Decimal(str(test_discount))
                    invoice_item.total_price = expected_total
                    invoice_item.save(update_fields=['discount_amount', 'total_price'])
                    changed = True

                total_amount_recovered += (old_total - expected_total)
                total_fixed += 1

            if apply and changed:
                invoice.recalculate_totals()
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  OK Facture {invoice.invoice_number} recalculee : nouveau total = {float(invoice.total_amount):,.0f}"
                    )
                )

        self.stdout.write(f"\n{'='*60}")
        if total_fixed == 0:
            self.stdout.write("Aucune remise manquante trouvée.")
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"{total_fixed} item(s) avec remise perdue."
                    f"\nMontant total à récupérer : {float(total_amount_recovered):,.0f} XAF"
                )
            )
            if not apply:
                self.stdout.write(self.style.NOTICE("\nRelancez avec --apply pour appliquer les corrections."))
            else:
                self.stdout.write(self.style.SUCCESS("Corrections appliquées."))
