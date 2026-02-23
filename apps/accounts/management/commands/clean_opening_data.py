"""
Commande pour nettoyer les données de test des journées d'ouverture (21 et 22 février 2026).

RÈGLES :
  - Supprime les factures du 21 et 22/02/2026 SAUF celles de TCHANA MARIE CAROLINE
  - Supprime les commandes de labo du 21 et 22/02/2026 SAUF celles de :
      * TCHANA MARIE CAROLINE
      * DJAHPI CAROLINE
  - Ne touche PAS : patients (Client), consultations, prescriptions, produits, stock, etc.

Usage:
    python manage.py clean_opening_data
    python manage.py clean_opening_data --force   # sans confirmation
    python manage.py clean_opening_data --dry-run # aperçu sans rien supprimer
"""
from datetime import date
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q


# Dates à nettoyer
CLEAN_DATES = [date(2026, 2, 21), date(2026, 2, 22)]

# Patients dont les FACTURES doivent être conservées (correspondance exacte, insensible casse)
KEEP_INVOICE_PATIENTS = ['TCHANA MARIE CAROLINE']

# Numéros exacts des commandes labo à CONSERVER (les 2 seules réelles)
KEEP_LAB_ORDER_NUMBERS = ['LAB-20260221-0020', 'LAB-20260221-0010']


def build_name_filter(field, names):
    """Construit un filtre Q OR sur les noms (insensible à la casse, exact)."""
    q = Q()
    for name in names:
        q |= Q(**{f'{field}__iexact': name})
    return q


class Command(BaseCommand):
    help = "Nettoie les données de test des journées d'ouverture (21-22/02/2026)"

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Supprime sans demander de confirmation'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche ce qui serait supprimé sans rien faire'
        )

    def handle(self, *args, **options):
        from apps.invoicing.models import Invoice
        from apps.laboratory.models import LabOrder
        from apps.accounts.models import Organization

        dry_run = options['dry_run']
        force = options['force']

        org = Organization.objects.first()
        if not org:
            raise CommandError("Aucune organisation trouvée.")

        dates_str = " et ".join(d.strftime("%d/%m/%Y") for d in CLEAN_DATES)
        self.stdout.write(f"\nOrganisation : {org.name}")
        self.stdout.write(f"Dates ciblées : {dates_str}")
        self.stdout.write("=" * 60)

        # ---- FACTURES ----
        all_invoices_qs = Invoice.objects.filter(
            organization=org,
            created_at__date__in=CLEAN_DATES
        ).select_related('client')

        # Filtre de conservation pour les factures
        inv_keep_filter = build_name_filter('client__name', KEEP_INVOICE_PATIENTS)
        invoices_to_keep = all_invoices_qs.filter(inv_keep_filter)
        invoices_qs = all_invoices_qs.exclude(inv_keep_filter)

        self.stdout.write(f"\nFACTURES total             : {all_invoices_qs.count()}")
        self.stdout.write(f"  → À CONSERVER             : {invoices_to_keep.count()}")
        for inv in invoices_to_keep.order_by('created_at'):
            client_name = inv.client.name if inv.client else "—"
            self.stdout.write(
                f"     [CONSERVER] {inv.invoice_number} | {client_name} | "
                f"{inv.total_amount:,.0f} FCFA | {inv.status}"
            )

        self.stdout.write(f"  → À SUPPRIMER             : {invoices_qs.count()}")
        for inv in invoices_qs.order_by('created_at'):
            client_name = inv.client.name if inv.client else "—"
            self.stdout.write(
                f"  [{inv.created_at.strftime('%d/%m %H:%M')}] "
                f"{inv.invoice_number} | {client_name} | "
                f"{inv.total_amount:,.0f} FCFA | {inv.status}"
            )

        # ---- COMMANDES LABO ----
        all_lab_qs = LabOrder.objects.filter(
            organization=org,
            created_at__date__in=CLEAN_DATES
        ).select_related('patient')

        to_keep_qs = all_lab_qs.filter(order_number__in=KEEP_LAB_ORDER_NUMBERS)
        to_delete_lab_qs = all_lab_qs.exclude(order_number__in=KEEP_LAB_ORDER_NUMBERS)

        self.stdout.write(f"\nCOMMANDES LABO total      : {all_lab_qs.count()}")
        self.stdout.write(f"  → À CONSERVER             : {to_keep_qs.count()}")
        for order in to_keep_qs:
            self.stdout.write(
                f"     [CONSERVER] {order.order_number} | {order.patient.name}"
            )

        self.stdout.write(f"  → À SUPPRIMER             : {to_delete_lab_qs.count()}")
        for order in to_delete_lab_qs.order_by('created_at'):
            self.stdout.write(
                f"     [{order.created_at.strftime('%d/%m %H:%M')}] "
                f"{order.order_number} | {order.patient.name} | {order.status}"
            )

        self.stdout.write("=" * 60)
        total_invoices = invoices_qs.count()
        total_lab = to_delete_lab_qs.count()
        self.stdout.write(f"TOTAL à supprimer : {total_invoices} facture(s) + {total_lab} commande(s) labo")
        self.stdout.write(f"TOTAL à conserver : {invoices_to_keep.count()} facture(s) + {to_keep_qs.count()} commande(s) labo")

        if total_invoices == 0 and total_lab == 0:
            self.stdout.write(self.style.SUCCESS("\nRien à supprimer. Base de données déjà propre."))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING("\nMode dry-run : aucune suppression effectuée."))
            return

        # ---- CONFIRMATION ----
        if not force:
            self.stdout.write(self.style.WARNING(
                "\nATTENTION : Cette opération est IRRÉVERSIBLE."
            ))
            confirm = input("Confirmer la suppression ? [o/N] : ").strip().lower()
            if confirm not in ('o', 'oui', 'y', 'yes'):
                self.stdout.write(self.style.WARNING("Opération annulée."))
                return

        # ---- SUPPRESSION FACTURES ----
        if total_invoices > 0:
            deleted_invoices, _ = invoices_qs.delete()
            self.stdout.write(self.style.SUCCESS(
                f"\n✓ {total_invoices} facture(s) supprimée(s) "
                f"({deleted_invoices} enregistrements au total avec items/paiements)"
            ))

        # ---- SUPPRESSION COMMANDES LABO ----
        if total_lab > 0:
            deleted_lab, _ = to_delete_lab_qs.delete()
            self.stdout.write(self.style.SUCCESS(
                f"✓ {total_lab} commande(s) labo supprimée(s) "
                f"({deleted_lab} enregistrements au total avec items)"
            ))

        self.stdout.write(self.style.SUCCESS("\nNettoyage terminé."))
        self.stdout.write(
            "Commandes labo conservées : " + ", ".join(KEEP_LAB_ORDER_NUMBERS)
        )
