from django.core.management.base import BaseCommand
from datetime import date
from decimal import Decimal
from django.db.models import Sum
from apps.invoicing.models import Invoice, InvoiceItem, StockMovement


class Command(BaseCommand):
    help = 'Diagnostique les factures dune journée donnée'

    def add_arguments(self, parser):
        parser.add_argument('--date', type=str, default='2026-02-27', help='Date YYYY-MM-DD')
        parser.add_argument('--fix', action='store_true', help='Supprimer les doublons a zero')

    def handle(self, *args, **options):
        target_date = date.fromisoformat(options['date'])
        fix = options['fix']

        self.stdout.write(self.style.SUCCESS(f"\n{'='*70}"))
        self.stdout.write(self.style.SUCCESS(f"DIAGNOSTIC FACTURES DU {target_date}"))
        self.stdout.write(self.style.SUCCESS('='*70))

        invoices = Invoice.objects.filter(
            created_at__date=target_date
        ).order_by('created_at')

        grand_total = Decimal('0')
        zero_invoices = []
        non_zero_invoices = []

        for inv in invoices:
            items = inv.items.all()
            items_total = items.aggregate(s=Sum('total_price'))['s'] or Decimal('0')
            client_name = (inv.client.name if inv.client else 'N/A')

            grand_total += inv.total_amount or Decimal('0')

            if inv.total_amount == 0 and items_total == 0:
                zero_invoices.append(inv)
            else:
                non_zero_invoices.append((inv, items_total))

        # Factures non-nulles avec leurs items
        self.stdout.write(f"\n--- FACTURES AVEC MONTANT ---")
        meaningful_total = Decimal('0')
        for inv, items_total in non_zero_invoices:
            client_name = (inv.client.name if inv.client else 'N/A')
            stored = inv.total_amount or Decimal('0')
            meaningful_total += stored
            ecart = items_total - stored
            flag = ' ⚠️ ECART!' if abs(ecart) > 1 else ''
            self.stdout.write(
                f"  {inv.invoice_number} | {inv.status:<8} | "
                f"stocke={float(stored):>10,.0f} | items={float(items_total):>10,.0f}{flag} | {client_name}"
            )
            for item in inv.items.all():
                prod = (item.product.name if item.product else item.description or '?')[:45]
                self.stdout.write(
                    f"      - {prod:<45} x{item.quantity:<4} "
                    f"UP={float(item.unit_price):>10,.0f}  "
                    f"total={float(item.total_price):>10,.0f}"
                )

        self.stdout.write(f"\n  TOTAL factures non-nulles : {float(meaningful_total):,.0f}")

        # Factures a zero
        self.stdout.write(f"\n--- FACTURES A ZERO ({len(zero_invoices)}) ---")
        for inv in zero_invoices:
            client_name = (inv.client.name if inv.client else 'N/A')
            self.stdout.write(
                f"  {inv.invoice_number} | {inv.status:<8} | {inv.created_at.strftime('%H:%M:%S')} | {client_name}"
            )

        # Doublons (meme client, a zero + une autre non-zero)
        self.stdout.write(f"\n--- ANALYSE DOUBLONS ---")
        zero_client_ids = {inv.client_id for inv in zero_invoices}
        nonzero_client_ids = {inv.client_id for inv, _ in non_zero_invoices}
        doublon_client_ids = zero_client_ids & nonzero_client_ids

        if doublon_client_ids:
            self.stdout.write(self.style.WARNING(
                f"  Clients avec a la fois facture(s) a zero ET facture(s) non-nulle(s) : {len(doublon_client_ids)}"
            ))
            for client_id in doublon_client_ids:
                zeros = [i for i in zero_invoices if i.client_id == client_id]
                nzeros = [i for i, _ in non_zero_invoices if i.client_id == client_id]
                client_name = (zeros[0].client.name if zeros[0].client else 'N/A')
                self.stdout.write(f"  Client: {client_name}")
                for z in zeros:
                    self.stdout.write(f"    ZERO : {z.invoice_number} ({z.status})")
                for n in nzeros:
                    self.stdout.write(f"    REEL : {n.invoice_number} ({n.status}) = {float(n.total_amount):,.0f}")
        else:
            self.stdout.write("  Aucun doublon detecte.")

        # Mouvements de stock en double
        self.stdout.write(f"\n--- MOUVEMENTS DE STOCK VENTE DU JOUR ---")
        movements = StockMovement.objects.filter(
            created_at__date=target_date,
            movement_type='sale'
        ).select_related('product').order_by('reference_id', 'created_at')

        from collections import defaultdict
        by_invoice = defaultdict(list)
        for mv in movements:
            by_invoice[str(mv.reference_id)].append(mv)

        for ref_id, mvs in by_invoice.items():
            try:
                inv = Invoice.objects.get(id=ref_id)
                item_count = inv.items.filter(product__product_type='physical').count()
                if len(mvs) > item_count:
                    self.stdout.write(self.style.ERROR(
                        f"  DOUBLE DEDUCTION sur {inv.invoice_number}: "
                        f"{item_count} items physiques mais {len(mvs)} mouvements de vente"
                    ))
                    for mv in mvs:
                        self.stdout.write(
                            f"    - {mv.product.name[:40]:<40} qte={mv.quantity} a {mv.created_at.strftime('%H:%M:%S')}"
                        )
            except Invoice.DoesNotExist:
                pass

        # Totaux finaux
        self.stdout.write(f"\n{'='*70}")
        self.stdout.write(f"TOTAL STOCKE EN DB : {float(grand_total):,.0f}")
        self.stdout.write(f"TOTAL FACTURES REELLES : {float(meaningful_total):,.0f}")

        # Option fix : supprimer les factures a zero si elles sont des doublons
        if fix and zero_invoices:
            self.stdout.write(self.style.WARNING(f"\n--- SUPPRESSION DES FACTURES A ZERO ---"))
            to_delete = [i for i in zero_invoices if i.client_id in doublon_client_ids]
            if to_delete:
                for inv in to_delete:
                    self.stdout.write(f"  Suppression {inv.invoice_number}...")
                    inv.delete()
                self.stdout.write(self.style.SUCCESS(f"  {len(to_delete)} factures supprimees."))
            else:
                self.stdout.write("  Aucune facture a zero identifiee comme doublon a supprimer.")
