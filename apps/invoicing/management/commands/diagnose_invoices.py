from django.core.management.base import BaseCommand
from datetime import date
from decimal import Decimal
from django.db.models import Sum
from apps.invoicing.models import Invoice, InvoiceItem, StockMovement
import re


class Command(BaseCommand):
    help = 'Diagnostique les factures dune journée donnée, et recherche les numéros manquants globalement'

    def add_arguments(self, parser):
        parser.add_argument('--date', type=str, default='2026-02-27', help='Date YYYY-MM-DD')
        parser.add_argument('--fix', action='store_true', help='Supprimer les doublons a zero')
        parser.add_argument('--find-gaps', action='store_true', help='Chercher les trous de séquence sur toutes les factures')
        parser.add_argument('--seq', type=str, help='Rechercher des numéros de séquence précis, ex: "51,58,59"')

    def handle(self, *args, **options):
        target_date = date.fromisoformat(options['date'])
        fix = options['fix']

        # Global gap analysis — run separately from daily diagnostic
        if options.get('find_gaps') or options.get('seq'):
            self._find_global_gaps(options)
            return

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

        # Sequence gap detection
        self.stdout.write(f"\n--- ANALYSE DE LA SEQUENCE (Trouver 51, 58, 59) ---")
        import re
        sequences = []
        for inv in invoices:
            # Extract sequence number from e.g. "FAC202602-ORG-0012"
            match = re.search(r'-(\d+)$', inv.invoice_number)
            if match:
                sequences.append((int(match.group(1)), inv))
        
        if sequences:
            sequences.sort(key=lambda x: x[0])
            all_seqs = [s[0] for s in sequences]
            min_seq, max_seq = min(all_seqs), max(all_seqs)
            
            # Find missing
            missing = set(range(min_seq, max_seq + 1)) - set(all_seqs)
            if missing:
                self.stdout.write(self.style.ERROR(f"  Trous détectés dans la séquence ({len(missing)}) : {sorted(list(missing))}"))
                
                # Check if these gaps exist as cancelled/deleted in the database (maybe not fetched by the date filter)
                for seq in sorted(list(missing)):
                    # Try to find invoice by sequence suffix
                    suffix = f"-{seq:04d}"
                    found = Invoice.objects.filter(invoice_number__endswith=suffix).first()
                    if found:
                        self.stdout.write(f"    Trou {seq:04d} -> Existe ! (Statut: {found.status}, Date: {found.created_at.date()})")
                    else:
                        self.stdout.write(self.style.ERROR(f"    Trou {seq:04d} -> Complètement introuvable en base (probablement supprimé)."))
            else:
                self.stdout.write("  Aucun trou détecté dans la séquence du jour.")

        # Option fix : supprimer les factures a zero si elles sont des doublons
        if fix and zero_invoices:
            self.stdout.write(self.style.WARNING(f"\n--- SUPPRESSION DES FACTURES A ZERO ---"))
            to_delete = [i for i in zero_invoices if i.client_id in doublon_client_ids]
            if to_delete:
                for inv in to_delete:
                    self.stdout.write(f"  Suppression {inv.invoice_number}...")
                    inv._allow_deletion = True
                    inv.delete()
                self.stdout.write(self.style.SUCCESS(f"  {len(to_delete)} factures supprimees."))
            else:
                self.stdout.write("  Aucune facture a zero identifiee comme doublon a supprimer.")

    def _find_global_gaps(self, options):
        """Cherche les trous dans la séquence globale des factures."""
        self.stdout.write(self.style.SUCCESS(f"\n{'='*70}"))
        self.stdout.write(self.style.SUCCESS("ANALYSE GLOBALE DES SÉQUENCES DE FACTURES"))
        self.stdout.write(self.style.SUCCESS('='*70))

        specific_seqs = None
        if options.get('seq'):
            try:
                specific_seqs = [int(s.strip()) for s in options['seq'].split(',')]
                self.stdout.write(f"\nRecherche des séquences spécifiques : {specific_seqs}")
            except ValueError:
                self.stdout.write(self.style.ERROR("--seq doit être une liste de nombres, ex: '51,58,59'"))
                return

        all_invoices = Invoice.objects.all().order_by('invoice_number')
        self.stdout.write(f"Total factures en base (tous statuts) : {all_invoices.count()}")

        # Group by period prefix (FAC{YYYYMM}-{ORG})
        by_prefix = {}
        for inv in all_invoices:
            m = re.match(r'^(FAC\d{6}-[^-]+)-(\d+)$', inv.invoice_number)
            if m:
                prefix = m.group(1)
                seq = int(m.group(2))
                if prefix not in by_prefix:
                    by_prefix[prefix] = []
                by_prefix[prefix].append((seq, inv))

        all_gaps = []
        for prefix, items in sorted(by_prefix.items()):
            items.sort(key=lambda x: x[0])
            seqs = [s for s, _ in items]
            if not seqs:
                continue
            min_s, max_s = min(seqs), max(seqs)
            gaps = sorted(set(range(min_s, max_s + 1)) - set(seqs))
            if gaps:
                self.stdout.write(f"\n  Préfixe: {prefix}")
                self.stdout.write(f"  Séquences présentes: {min_s} → {max_s} ({len(seqs)} factures)")
                self.stdout.write(self.style.ERROR(f"  Trous ({len(gaps)}): {gaps}"))
                for g in gaps:
                    all_gaps.append((prefix, g))
            if specific_seqs:
                for target_seq in specific_seqs:
                    hit = next((inv for s, inv in items if s == target_seq), None)
                    if hit:
                        self.stdout.write(self.style.SUCCESS(
                            f"  Séq. {target_seq:04d} TROUVÉE: {hit.invoice_number} | Statut: {hit.status} | "
                            f"Date: {hit.created_at.date()} | Client: {hit.client.name if hit.client else 'N/A'} | "
                            f"Montant: {float(hit.total_amount or 0):,.0f}"
                        ))

        # Global search for specific seqs (across all prefixes)
        if specific_seqs:
            self.stdout.write(f"\n{'='*70}")
            self.stdout.write(f"RECHERCHE DIRECTE DES SÉQUENCES {specific_seqs}")
            for target_seq in specific_seqs:
                suffix = f"-{target_seq:04d}"
                found = Invoice.objects.filter(invoice_number__endswith=suffix)
                if found.exists():
                    for inv in found:
                        self.stdout.write(self.style.SUCCESS(
                            f"  ✓ Séq {target_seq:04d}: {inv.invoice_number} | {inv.status} | "
                            f"{inv.created_at.date()} | {inv.client.name if inv.client else 'N/A'} | "
                            f"{float(inv.total_amount or 0):,.0f} FCFA"
                        ))
                else:
                    self.stdout.write(self.style.ERROR(
                        f"  ✗ Séq {target_seq:04d}: INTROUVABLE — supprimée sans soft-delete ou jamais créée."
                    ))

        if all_gaps:
            self.stdout.write(self.style.WARNING(f"\nTotal trous détectés : {len(all_gaps)}"))
        else:
            self.stdout.write(self.style.SUCCESS("\nAucun trou dans les séquences."))
        self.stdout.write("")
