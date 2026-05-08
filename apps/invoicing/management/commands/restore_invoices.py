"""
Management command to restore missing invoices in the sequence as cancelled.

Usage:
    python manage.py restore_invoices --numbers FAC202602-ORG-0051 FAC202602-ORG-0058 FAC202602-ORG-0059
    python manage.py restore_invoices --organization <UUID> --month 202602 --numbers 51 52 53
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal
from apps.invoicing.models import Invoice
from apps.accounts.models import Organization, CustomUser


class Command(BaseCommand):
    help = 'Restaure des factures manquantes en tant que factures annulées pour préserver la continuité de la séquence comptable.'

    def add_arguments(self, parser):
        parser.add_argument('--numbers', nargs='+', type=str, help='Full invoice numbers (e.g., FAC202602-ORG-0051)')
        parser.add_argument('--organization', type=str, help='Organization UUID (if using --month and simple numbers)')
        parser.add_argument('--month', type=str, help='YYYYMM (e.g., 202602)')
        parser.add_argument('--seqs', nargs='+', type=int, help='Sequence numbers (e.g., 51 58 59)')

    def handle(self, *args, **options):
        invoice_numbers = options.get('numbers') or []
        
        org_id = options.get('organization')
        month = options.get('month')
        seqs = options.get('seqs')
        
        organization = None
        if org_id:
            try:
                organization = Organization.objects.get(id=org_id)
            except Organization.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Organisation {org_id} introuvable."))
                return
        else:
            # Fallback to first organization if only one exists
            org_count = Organization.objects.count()
            if org_count == 1:
                organization = Organization.objects.first()
        
        # Build invoice numbers from seqs if provided
        if month and seqs and organization:
            org_suffix = str(organization.id).split('-')[0].upper()
            prefix = f"FAC{month}-{org_suffix}-"
            for seq in seqs:
                invoice_numbers.append(f"{prefix}{seq:04d}")
                
        if not invoice_numbers:
            self.stdout.write(self.style.ERROR("Aucun numéro de facture fourni."))
            return

        # Try to find a system/admin user to assign as creator
        admin_user = CustomUser.objects.filter(role__in=['admin', 'owner']).first()
        
        created_count = 0
        for inv_num in invoice_numbers:
            # Check if it already exists
            existing = Invoice.objects.filter(invoice_number=inv_num).first()
            if existing:
                self.stdout.write(self.style.WARNING(
                    f"Facture {inv_num} existe déjà (Statut: {existing.status}, "
                    f"Date: {existing.created_at.strftime('%Y-%m-%d')}). Ignorée."
                ))
                continue
                
            # Create the missing invoice as cancelled
            self.stdout.write(f"Restauration de la facture {inv_num}...")
            
            invoice = Invoice(
                invoice_number=inv_num,
                organization=organization,
                invoice_type='standard',
                title="[RESTAUREE] Facture Annulée",
                status='cancelled',
                subtotal=Decimal('0'),
                total_amount=Decimal('0'),
                tax_amount=Decimal('0'),
                payment_method='cash',
                created_by=admin_user,
                notes="Facture recréée manuellement pour préserver la continuité de la séquence comptable. Le document original a été physiquement supprimé."
            )
            # Skip the auto-numbering by setting a flag if needed, but since we set it explicitly,
            # we should just save it (save() might overwrite if we don't be careful)
            # We must override the save method behavior or just create it with a flag
            invoice._allow_deletion = True  # Just in case
            
            # Save it
            try:
                # We save without running the generation
                # Since models.py save() only generates if not self.invoice_number:
                #    self.invoice_number = self.generate_invoice_number()
                # We are safe because we set it above!
                invoice.save()
                
                # Also we want to ensure its creation date roughly matches the month if possible
                # Extract YYYYMM from invoice number
                import re
                match = re.search(r'FAC(\d{4})(\d{2})', inv_num)
                if match:
                    year, month = int(match.group(1)), int(match.group(2))
                    # Set it to the last day of that month roughly, just so it appears in the right period
                    # We have to use update() to bypass auto_now_add
                    Invoice.objects.filter(id=invoice.id).update(
                        created_at=timezone.datetime(year, month, 1, tzinfo=timezone.utc)
                    )
                
                self.stdout.write(self.style.SUCCESS(f"  -> Restaurée avec succès: {inv_num} (Statut: cancelled)"))
                created_count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  -> Erreur lors de la restauration: {e}"))
                
        self.stdout.write(self.style.SUCCESS(f"\nOpération terminée. {created_count} factures restaurées."))
