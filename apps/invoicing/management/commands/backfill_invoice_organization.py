"""
Commande ponctuelle : renseigne `Invoice.organization` pour les factures
historiques où ce champ est resté vide.

Contexte : `organization` a été ajouté après coup sur `Invoice` (migration
`0026_add_organization_to_invoice`) sans backfill des données existantes.
Sur la prod, 134 factures sur 147 avaient `organization=NULL` au moment de
la découverte. Ce champ est désormais utilisé DIRECTEMENT par plusieurs
fonctionnalités (relances automatiques `send_invoice_reminders`, avoirs
`issue_credit_note`) qui, sans ce rattrapage, ignoreraient silencieusement
ces factures historiques.

L'isolation multi-tenant elle-même N'EST PAS affectée (le ViewSet filtre via
`created_by__organization`, pas `organization` directement) : ce rattrapage
est un correctif de cohérence, pas un correctif de sécurité.

Usage :
    python manage.py backfill_invoice_organization --dry-run
    python manage.py backfill_invoice_organization
"""
from django.core.management.base import BaseCommand

from apps.invoicing.models import Invoice


class Command(BaseCommand):
    help = "Renseigne Invoice.organization pour les factures historiques où il est vide."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help="Affiche ce qui serait modifié sans rien écrire.")

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        orphans = Invoice.objects.filter(
            organization__isnull=True
        ).select_related('client', 'created_by')

        total = orphans.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS("Aucune facture orpheline. Rien à faire."))
            return

        via_client = 0
        via_created_by = 0
        unresolved = 0

        for invoice in orphans:
            org = None
            source = None
            if invoice.client and invoice.client.organization_id:
                org = invoice.client.organization
                source = 'client'
            elif invoice.created_by_id and invoice.created_by.organization_id:
                org = invoice.created_by.organization
                source = 'created_by'

            if org is None:
                unresolved += 1
                self.stdout.write(self.style.WARNING(
                    f"  {invoice.invoice_number} : organisation introuvable "
                    f"(client={invoice.client_id}, created_by={invoice.created_by_id})"
                ))
                continue

            if source == 'client':
                via_client += 1
            else:
                via_created_by += 1

            if dry_run:
                self.stdout.write(f"[dry-run] {invoice.invoice_number} -> {org.name} (via {source})")
            else:
                Invoice.objects.filter(pk=invoice.pk).update(organization=org)

        action = "seraient corrigées" if dry_run else "corrigées"
        self.stdout.write(self.style.SUCCESS(
            f"\n{total} facture(s) orpheline(s) : "
            f"{via_client} {action} via le client, "
            f"{via_created_by} {action} via le créateur, "
            f"{unresolved} non résolue(s) (aucune organisation trouvable)."
        ))
