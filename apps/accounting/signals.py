"""
Génération automatique des écritures comptables depuis les factures et paiements
"""
from decimal import Decimal
from datetime import date as date_type

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.invoicing.models import Invoice, Payment


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

    org = invoice.organization
    if not org:
        return None

    # Éviter les doublons
    if JournalEntry.objects.filter(source_invoice=invoice, source='invoice').exists():
        return None

    revenue_code = INVOICE_TYPE_TO_ACCOUNT.get(invoice.invoice_type, '7500')
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
    org = invoice.organization if invoice else None
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


@receiver(post_save, sender=Invoice)
def on_invoice_save(sender, instance, **kwargs):
    """Génère l'écriture de vente quand une facture est validée (pas draft)"""
    try:
        if instance.status in ('sent', 'paid', 'overdue') and instance.organization:
            create_invoice_entry(instance)
    except Exception:
        pass  # Ne jamais bloquer la sauvegarde de facture


@receiver(post_save, sender=Payment)
def on_payment_save(sender, instance, created, **kwargs):
    """Génère l'écriture de paiement quand un paiement est créé"""
    try:
        if created and instance.status == 'success':
            create_payment_entry(instance)
    except Exception:
        pass
