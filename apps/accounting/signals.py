"""
Génération automatique des écritures comptables depuis les factures, paiements
et bons de commande.

Flux couverts :
  1. Facture validée (sent/paid/overdue) → écriture vente (clients / ventes [+ TVA collectée])
  2. Paiement encaissé                   → écriture trésorerie (caisse, banque ou Mobile Money / clients)
  3. Facture annulée                     → extourne de l'écriture de vente
  4. BC reçu                             → écriture achat (achats [+ TVA récupérable] / fournisseurs)

Les comptes viennent du référentiel de l'organisation (apps/accounting/charts.py) ; le plan
historique Procura garde ses codes et son comportement d'origine.
"""
import logging
from decimal import Decimal
from datetime import date as date_type

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

logger = logging.getLogger(__name__)

from apps.invoicing.models import Invoice, Payment
from apps.purchase_orders.models import PurchaseOrder
from apps.accounts.models import Organization

from .charts import LEGACY, PAYMENT_ROLE, account_for_role, org_standard, split_amount


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
    'orange_money':  '5100',
    'mtn_momo':      '5100',
    'wave':          '5100',
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
    if method in ('cash', 'mobile_money', 'orange_money', 'mtn_momo', 'wave', 'other'):
        code, name, jtype = 'CAI', 'Journal de Caisse', 'cash'
    else:
        code, name, jtype = 'BNQ', 'Journal de Banque', 'bank'
    journal, _ = AccountingJournal.objects.get_or_create(
        organization=organization,
        code=code,
        defaults={'name': name, 'journal_type': jtype}
    )
    return journal


def _invoice_org(invoice):
    return invoice.organization or (getattr(invoice.created_by, 'organization', None) if invoice.created_by else None)


def _sales_lines(org, invoice, amount_ttc, tax_amount):
    """
    Lignes d'une écriture de vente pour un montant TTC donné.

    Plan historique Procura : tout le TTC au compte de produit du type de facture (comportement
    inchangé, pour que les livres existants restent cohérents).
    Autres référentiels : clients au débit (TTC) ; au crédit la TVA collectée et le HT réparti entre
    ventes de marchandises et services selon les lignes de la facture.
    Retourne [(compte, débit, crédit)] ou None si un compte manque.
    """
    zero = Decimal('0')
    if org_standard(org) == LEGACY:
        code = INVOICE_TYPE_TO_ACCOUNT.get(getattr(invoice, 'invoice_type', 'standard'), '7500')
        client, revenue = _get_account(org, '4100'), _get_account(org, code)
        if not client or not revenue:
            return None
        return [(client, amount_ttc, zero), (revenue, zero, amount_ttc)]

    client = account_for_role(org, 'customers')
    if not client:
        return None
    tax = min(Decimal(tax_amount or 0), amount_ttc)
    vat = account_for_role(org, 'vat_collected') if tax > 0 else None
    if tax > 0 and not vat:
        tax = zero
    ht = amount_ttc - tax

    # part des marchandises dans le HT (lignes de produits physiques), le reste en services
    goods = services = zero
    for item in invoice.items.select_related('product').all():
        line_total = Decimal(item.total_price or 0)
        if item.product_id and getattr(item.product, 'product_type', 'physical') == 'physical':
            goods += line_total
        else:
            services += line_total
    if goods + services > 0:
        ratio = goods / (goods + services)
    else:
        ratio = Decimal('1')
    if str(getattr(invoice, 'invoice_type', '')).startswith('healthcare'):
        ratio = Decimal('0')
    part_goods, part_services = split_amount(ht, ratio)

    lines = [(client, amount_ttc, zero)]
    for role, amt in (('sales_goods', part_goods), ('sales_services', part_services)):
        if amt > 0:
            acc = account_for_role(org, role)
            if not acc:
                return None
            lines.append((acc, zero, amt))
    if tax > 0:
        lines.append((vat, zero, tax))
    return lines


def _write_lines(entry, lines, label, reverse=False):
    from .models import JournalEntryLine
    for acc, debit, credit in lines:
        if reverse:
            debit, credit = credit, debit
        JournalEntryLine.objects.create(entry=entry, account=acc, description=label, debit=debit, credit=credit)


def create_invoice_entry(invoice, user=None):
    """
    Écriture de vente d'une facture validée (clients / ventes [+ TVA collectée]).
    Si l'écriture existe déjà et que le montant a changé (lignes ajoutées après validation),
    elle est reconstruite au nouveau montant.
    """
    from .models import JournalEntry

    org = _invoice_org(invoice)
    if not org:
        return None
    amount = invoice.total_amount or Decimal('0')
    if amount <= 0:
        return None
    lines = _sales_lines(org, invoice, amount, invoice.tax_amount)
    if not lines:
        return None

    existing = JournalEntry.objects.filter(source_invoice=invoice, source='invoice').first()
    if existing:
        if existing.status != 'cancelled':
            current = sum((l.debit or Decimal('0')) for l in existing.lines.all())
            if current != amount:
                existing.lines.all().delete()
                _write_lines(existing, lines, invoice.invoice_number)
        return existing

    journal = _get_or_create_sales_journal(org)
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
    _write_lines(entry, lines, invoice.invoice_number)
    return entry


def _treasury_account(org, method):
    """Caisse, banque ou Mobile Money selon le mode de paiement."""
    if org_standard(org) == LEGACY:
        code = PAYMENT_METHOD_TO_ACCOUNT.get(method, '5100')
        return _get_account(org, code) or _get_account(org, '5100')
    return account_for_role(org, PAYMENT_ROLE.get(method, 'cash')) or account_for_role(org, 'cash')


def create_payment_entry(payment, user=None):
    """Écriture d'encaissement : trésorerie (caisse / banque / Mobile Money) au débit, clients au crédit."""
    from .models import JournalEntry, JournalEntryLine

    invoice = payment.invoice
    org = _invoice_org(invoice) if invoice else None
    if not org:
        return None

    # Éviter les doublons
    if JournalEntry.objects.filter(source_payment=payment, source='payment').exists():
        return None

    method = payment.payment_method or 'cash'
    cash_account = _treasury_account(org, method)
    client_account = _get_account(org, '4100') if org_standard(org) == LEGACY else account_for_role(org, 'customers')
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


def create_credit_note_entry(credit_note, user=None):
    """
    Écriture d'un avoir PARTIEL (la facture reste active) : l'inverse d'une vente pour le montant
    de l'avoir (ventes [+ TVA] au débit, clients au crédit), au prorata de la TVA de la facture.
    """
    from .models import JournalEntry

    invoice = credit_note.invoice
    org = credit_note.organization or _invoice_org(invoice)
    if not org:
        return None

    if JournalEntry.objects.filter(organization=org, reference=credit_note.credit_note_number, source='credit_note').exists():
        return None

    amount = credit_note.amount or Decimal('0')
    if amount <= 0:
        return None
    total = invoice.total_amount or Decimal('0')
    tax = ((invoice.tax_amount or Decimal('0')) * amount / total).quantize(Decimal('0.01')) if total > 0 else Decimal('0')
    lines = _sales_lines(org, invoice, amount, tax)
    if not lines:
        return None

    journal = _get_or_create_sales_journal(org)
    entry = JournalEntry.objects.create(
        organization=org,
        journal=journal,
        entry_number=JournalEntry.generate_entry_number(org, journal),
        date=date_type.today(),
        description=f"Avoir — {credit_note.credit_note_number} ({invoice.invoice_number})",
        reference=credit_note.credit_note_number,
        status='posted',
        source='credit_note',
        source_invoice=invoice,
        created_by=user,
    )
    _write_lines(entry, lines, credit_note.credit_note_number, reverse=True)
    return entry


def create_purchase_order_entry(po, user=None):
    """
    Écriture d'achat quand un BC est reçu.
    Plan historique : 6900 au débit (TTC) / 4010 au crédit.
    Autres référentiels : achats de marchandises (HT) + TVA récupérable au débit / fournisseurs (TTC) au crédit.
    """
    from .models import JournalEntry

    org = getattr(po.created_by, 'organization', None)
    if not org:
        return None

    if JournalEntry.objects.filter(organization=org, reference=po.po_number, source='purchase_order').exists():
        return None

    amount = po.total_amount or Decimal('0')
    if amount <= 0:
        return None
    zero = Decimal('0')

    if org_standard(org) == LEGACY:
        expense_account, supplier_account = _get_account(org, '6900'), _get_account(org, '4010')
        if not expense_account or not supplier_account:
            return None
        lines = [(expense_account, amount, zero), (supplier_account, zero, amount)]
    else:
        supplier_account = account_for_role(org, 'suppliers')
        expense_account = account_for_role(org, 'exp_goods')
        if not expense_account or not supplier_account:
            return None
        tax = Decimal(getattr(po, 'tax_gst_hst', 0) or 0) + Decimal(getattr(po, 'tax_qst', 0) or 0)
        vat = account_for_role(org, 'vat_deductible') if 0 < tax < amount else None
        lines = [(expense_account, amount - tax if vat else amount, zero)]
        if vat:
            lines.append((vat, tax, zero))
        lines.append((supplier_account, zero, amount))

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
    _write_lines(entry, lines, po.po_number)
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
        logger.exception("Échec écriture comptable pour facture %s", getattr(instance, 'pk', None))


@receiver(post_save, sender=Payment)
def on_payment_save(sender, instance, created, **kwargs):
    """Génère l'écriture de paiement quand un paiement est créé"""
    try:
        # Le statut par défaut des paiements est 'completed' (et non 'success') :
        # on accepte les deux pour ne pas rater l'écriture de trésorerie.
        if created and instance.status in ('completed', 'success', 'paid'):
            create_payment_entry(instance)
    except Exception:
        logger.exception("Échec création écriture de paiement %s", getattr(instance, 'pk', None))


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
        logger.exception("Plan comptable non initialisé pour l'organisation %s", instance.pk)
