"""
Génération automatique des écritures comptables depuis les factures, paiements
et bons de commande.

Flux couverts :
  1. Facture validée (sent/paid/overdue) → écriture vente (4100 / 7xxx)
  2. Paiement encaissé                   → écriture trésorerie (5xxx / 4100)
  3. Facture annulée                     → extourne de l'écriture de vente
  4. BC reçu                             → écriture charge achat (6900 / 4010)
"""
from decimal import Decimal
from datetime import date as date_type

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.invoicing.models import Invoice, Payment
from apps.purchase_orders.models import PurchaseOrder
from apps.accounts.models import Organization


# Mapping invoice_type → code compte produit
INVOICE_TYPE_TO_ACCOUNT = {
    'healthcare_consultation': '7100',
    'healthcare_laboratory':   '7200',
    'healthcare_pharmacy':     '7300',
    'healthcare_services':     '7400',
    'standard':                '7500',
    'credit_note':             '7500',  # Note de crédit sur comptes produits
}

# Mapping mode de paiement → code compte trésorerie
PAYMENT_METHOD_TO_ACCOUNT = {
    'cash':          '5100',  # Caisse
    'mobile_money':  '5100',  # Caisse (assimilé)
    'bank_transfer': '5200',  # Banque
    'check':         '5200',  # Banque
    'credit_card':   '5200',  # Banque
    'paypal':        '5200',  # Banque
    'other':         '5100',
}


def _get_account(organization, code):
    """Récupère un compte par code, None si inexistant"""
    from .models import Account
    try:
        return Account.objects.get(organization=organization, code=code, is_active=True)
    except Account.DoesNotExist:
        return None


def _get_or_create_purchase_journal(organization):
    """Récupère le journal des achats de l'organisation"""
    from .models import AccountingJournal
    journal, _ = AccountingJournal.objects.get_or_create(
        organization=organization,
        code='ACH',
        defaults={'name': "Journal des Achats", 'journal_type': 'purchases'}
    )
    return journal


def _get_or_create_sales_journal(organization):
    """Récupère le journal des ventes de l'organisation"""
    from .models import AccountingJournal
    journal, _ = AccountingJournal.objects.get_or_create(
        organization=organization,
        code='VTE',
        defaults={
            'name': 'Journal des Ventes',
            'journal_type': 'sales',
        }
    )
    return journal


def _get_or_create_cash_journal(organization, method='cash'):
    """Récupère le journal de caisse ou banque selon le mode de paiement"""
    from .models import AccountingJournal
    if method in ('cash', 'mobile_money', 'other'):
        code, name, jtype = 'CAI', 'Journal de Caisse', 'cash'
    else:
        code, name, jtype = 'BNQ', 'Journal de Banque', 'bank'
    journal, _ = AccountingJournal.objects.get_or_create(
        organization=organization,
        code=code,
        defaults={'name': name, 'journal_type': jtype}
    )
    return journal


def create_invoice_entry(invoice, user=None):
    """
    Crée l'écriture comptable pour une facture validée.
    Débit 4100 (Clients) / Crédit 7xxx (Produit selon type)
    Retourne l'écriture créée ou None si les comptes manquent.
    """
    from .models import JournalEntry, JournalEntryLine

    org = getattr(invoice.created_by, 'organization', None) if invoice.created_by else None
    if not org:
        return None

    # Éviter les doublons
    if JournalEntry.objects.filter(source_invoice=invoice, source='invoice').exists():
        return None

    invoice_type = getattr(invoice, 'invoice_type', 'standard')
    revenue_code = INVOICE_TYPE_TO_ACCOUNT.get(invoice_type, '7500')
    client_account = _get_account(org, '4100')
    revenue_account = _get_account(org, revenue_code)

    if not client_account or not revenue_account:
        return None

    journal = _get_or_create_sales_journal(org)
    amount = invoice.total_amount or Decimal('0')
    if amount <= 0:
        return None

    entry = JournalEntry.objects.create(
        organization=org,
        journal=journal,
        entry_number=JournalEntry.generate_entry_number(org, journal),
        date=invoice.created_at.date() if invoice.created_at else date_type.today(),
        description=f"Vente — {invoice.invoice_number}",
        reference=invoice.invoice_number,
        status='posted',
        source='invoice',
        source_invoice=invoice,
        created_by=user,
    )
    JournalEntryLine.objects.create(entry=entry, account=client_account,
                                    description=invoice.invoice_number, debit=amount, credit=Decimal('0'))
    JournalEntryLine.objects.create(entry=entry, account=revenue_account,
                                    description=invoice.invoice_number, debit=Decimal('0'), credit=amount)
    return entry


def create_payment_entry(payment, user=None):
    """
    Crée l'écriture comptable pour un paiement.
    Débit 5100/5200 (Caisse/Banque) / Crédit 4100 (Clients)
    """
    from .models import JournalEntry, JournalEntryLine

    invoice = payment.invoice
    org = (getattr(invoice.created_by, 'organization', None) if invoice and invoice.created_by else None)
    if not org:
        return None

    # Éviter les doublons
    if JournalEntry.objects.filter(source_payment=payment, source='payment').exists():
        return None

    method = payment.payment_method or 'cash'
    cash_code = PAYMENT_METHOD_TO_ACCOUNT.get(method, '5100')
    cash_account = _get_account(org, cash_code)
    client_account = _get_account(org, '4100')

    if not cash_account or not client_account:
        return None

    journal = _get_or_create_cash_journal(org, method)
    amount = payment.amount or Decimal('0')
    if amount <= 0:
        return None

    ref = invoice.invoice_number if invoice else ''
    entry = JournalEntry.objects.create(
        organization=org,
        journal=journal,
        entry_number=JournalEntry.generate_entry_number(org, journal),
        date=payment.payment_date or date_type.today(),
        description=f"Encaissement — {ref}",
        reference=ref,
        status='posted',
        source='payment',
        source_payment=payment,
        created_by=user,
    )
    JournalEntryLine.objects.create(entry=entry, account=cash_account,
                                    description=ref, debit=amount, credit=Decimal('0'))
    JournalEntryLine.objects.create(entry=entry, account=client_account,
                                    description=ref, debit=Decimal('0'), credit=amount)
    return entry


def create_invoice_reversal(invoice):
    """
    Extourne l'écriture de vente quand une facture est annulée.
    Crée une écriture miroir (Débit 7xxx / Crédit 4100) pour neutraliser.
    """
    from .models import JournalEntry, JournalEntryLine

    org = getattr(invoice.created_by, 'organization', None) if invoice.created_by else None
    if not org:
        return None

    original = JournalEntry.objects.filter(
        source_invoice=invoice, source='invoice'
    ).first()
    if not original:
        return None

    # Éviter les doubles extournes
    if JournalEntry.objects.filter(
        source_invoice=invoice, source='invoice_reversal'
    ).exists():
        return None

    journal = _get_or_create_sales_journal(org)
    reversal = JournalEntry.objects.create(
        organization=org,
        journal=journal,
        entry_number=JournalEntry.generate_entry_number(org, journal),
        date=date_type.today(),
        description=f"Extourne — {invoice.invoice_number}",
        reference=invoice.invoice_number,
        status='posted',
        source='invoice_reversal',
        source_invoice=invoice,
    )
    # Inverser chaque ligne de l'écriture originale
    for line in original.lines.all():
        JournalEntryLine.objects.create(
            entry=reversal,
            account=line.account,
            description=f"Extourne {line.description}",
            debit=line.credit,
            credit=line.debit,
        )
    return reversal


def create_purchase_order_entry(po, user=None):
    """
    Crée l'écriture comptable quand un BC est reçu.
    Débit 6900 (Autres charges / Achats) / Crédit 4010 (Fournisseurs)
    Utilise 6900 par défaut — suffisant pour un plan comptable générique.
    """
    from .models import JournalEntry, JournalEntryLine

    org = getattr(po.created_by, 'organization', None)
    if not org:
        return None

    if JournalEntry.objects.filter(
        reference=po.po_number, source='purchase_order'
    ).exists():
        return None

    expense_account = _get_account(org, '6900')
    supplier_account = _get_account(org, '4010')
    if not expense_account or not supplier_account:
        return None

    amount = po.total_amount or Decimal('0')
    if amount <= 0:
        return None

    journal = _get_or_create_purchase_journal(org)
    entry = JournalEntry.objects.create(
        organization=org,
        journal=journal,
        entry_number=JournalEntry.generate_entry_number(org, journal),
        date=date_type.today(),
        description=f"Réception BC — {po.po_number}",
        reference=po.po_number,
        status='posted',
        source='purchase_order',
        created_by=user,
    )
    JournalEntryLine.objects.create(
        entry=entry, account=expense_account,
        description=po.po_number, debit=amount, credit=Decimal('0')
    )
    JournalEntryLine.objects.create(
        entry=entry, account=supplier_account,
        description=po.po_number, debit=Decimal('0'), credit=amount
    )
    return entry


# ─── Signals ──────────────────────────────────────────────────────────────────

@receiver(pre_save, sender=Invoice)
def _cache_invoice_status(sender, instance, **kwargs):
    """Mémorise le statut précédent pour détecter le passage à 'cancelled'"""
    if instance.pk:
        try:
            instance._previous_status = Invoice.objects.values_list(
                'status', flat=True
            ).get(pk=instance.pk)
        except Invoice.DoesNotExist:
            instance._previous_status = None
    else:
        instance._previous_status = None


@receiver(post_save, sender=Invoice)
def on_invoice_save(sender, instance, **kwargs):
    """
    - Facture validée → écriture vente
    - Facture annulée → extourne si une écriture existe
    """
    try:
        if instance.status in ('sent', 'paid', 'overdue') and instance.organization:
            create_invoice_entry(instance)
        elif instance.status == 'cancelled':
            prev = getattr(instance, '_previous_status', None)
            if prev in ('sent', 'paid', 'overdue'):
                create_invoice_reversal(instance)
    except Exception:
        pass


@receiver(post_save, sender=Payment)
def on_payment_save(sender, instance, created, **kwargs):
    """Génère l'écriture de paiement quand un paiement est créé"""
    try:
        if created and instance.status == 'success':
            create_payment_entry(instance)
    except Exception:
        pass


@receiver(post_save, sender=PurchaseOrder)
def on_purchase_order_received(sender, instance, **kwargs):
    """Génère l'écriture de charge quand un BC passe au statut 'received'"""
    try:
        prev = getattr(instance, '_previous_po_status', None)
        if instance.status == 'received' and prev != 'received':
            create_purchase_order_entry(instance)
    except Exception:
        pass


@receiver(post_save, sender=Organization)
def on_organization_created(sender, instance, created, **kwargs):
    """
    Initialise automatiquement le plan comptable par défaut
    lors de la création d'une nouvelle organisation.
    """
    if not created:
        return
    try:
        from .setup_utils import setup_accounting_for_org
        setup_accounting_for_org(instance)
    except Exception:
        pass
