"""
Dépenses : création (saisie, assistant IA, import d'un reçu) et écriture comptable.

Écriture d'une dépense (journal Caisse, Banque ou Achats selon le cas) :
    Débit  compte de charge de la catégorie (HT)       ex. SYSCOHADA 622 Locations
    Débit  TVA récupérable (si TVA et compte présents)  ex. 4452
    Crédit trésorerie (dépense payée)                    571 caisse / 521 banque / 552 Mobile Money
        ou fournisseur (dépense à payer)                 401
Plan historique Procura : même logique avec ses comptes ; sans compte de TVA récupérable,
la TVA reste dans la charge (TTC).
Petite entreprise exonérée (franchise en base, Kleinunternehmerregelung § 19 UStG) : la TVA
payée n'est pas déductible, toute la dépense (TTC) va en charge.
"""
from datetime import date as date_type
from decimal import Decimal, InvalidOperation

from django.db import transaction

from .charts import EXPENSE_CATEGORIES, PAYMENT_ROLE, account_for_role, entry_label, journal_name

CATEGORY_KEYS = {k for k, _ in EXPENSE_CATEGORIES}

# Mots du libellé -> catégorie (pour les saisies sans catégorie, ex. assistant IA)
_KEYWORDS = [
    ('exp_rent', ('loyer', 'bail', 'location local', 'rent')),
    ('exp_utilities', ('électricité', 'electricite', 'eneo', 'eau', 'camwater', 'énergie', 'energie', 'courant')),
    ('exp_telecom', ('téléphone', 'telephone', 'internet', 'crédit appel', 'forfait', 'mtn', 'orange', 'camtel', 'wifi')),
    ('exp_transport', ('transport', 'carburant', 'essence', 'gasoil', 'taxi', 'moto', 'livraison', 'péage', 'peage')),
    ('exp_salaries', ('salaire', 'paie', 'paye', 'employé', 'employe', 'prime')),
    ('exp_social', ('cnps', 'cotisation sociale', 'charges sociales')),
    ('exp_office', ('bureau', 'papeterie', 'ramette', 'stylo', 'cartouche', 'encre')),
    ('exp_repairs', ('réparation', 'reparation', 'entretien', 'maintenance', 'dépannage', 'depannage')),
    ('exp_insurance', ('assurance',)),
    ('exp_advertising', ('publicité', 'publicite', 'pub ', 'affiche', 'flyer', 'facebook', 'sponsoris')),
    ('exp_fees', ('honoraires', 'comptable', 'avocat', 'conseil', 'consultant', 'notaire')),
    ('exp_bank_fees', ('frais bancaires', 'agios', 'commission', 'frais de retrait', 'frais mobile money')),
    ('exp_taxes', ('impôt', 'impot', 'taxe', 'patente', 'dgi', 'licence')),
    ('exp_goods', ('marchandise', 'stock', 'achat de', 'réassort', 'reassort')),
]


def guess_category(text):
    t = (text or '').lower()
    for key, words in _KEYWORDS:
        if any(w in t for w in words):
            return key
    return 'exp_other'


def normalize_payment_method(value):
    v = (value or '').lower().strip()
    if not v:
        return 'cash'
    if 'orange' in v:
        return 'orange_money'
    if 'mtn' in v or 'momo' in v:
        return 'mtn_momo'
    if 'wave' in v:
        return 'wave'
    if 'mobile' in v:
        return 'mobile_money'
    if any(w in v for w in ('virement', 'transfer', 'banque', 'bank')):
        return 'bank_transfer'
    if any(w in v for w in ('chèque', 'cheque', 'check')):
        return 'check'
    if any(w in v for w in ('carte', 'card', 'visa', 'mastercard')):
        return 'credit_card'
    if any(w in v for w in ('espèce', 'espece', 'cash', 'liquide', 'comptant')):
        return 'cash'
    return v if v in PAYMENT_ROLE else 'other'


def to_decimal(value, default=Decimal('0')):
    if value in (None, ''):
        return default
    try:
        return Decimal(str(value).replace(' ', '').replace(' ', '').replace(',', '.'))
    except (InvalidOperation, ValueError):
        return default


def vat_exempt(org):
    """Vrai si l'organisation relève du régime des petites entreprises (TVA non déductible)."""
    try:
        return bool(org.settings.vat_exempt_small_business)
    except Exception:
        return False


def deductible_vat_account(org, total, tax, net=None):
    """Compte de TVA récupérable d'une dépense ou d'un achat TTC `total` contenant `tax`.

    None si la TVA n'est pas déductible (petite entreprise exonérée) ou s'il n'y a pas de TVA.
    Taux inférieur au taux normal (ex. 7 % en Allemagne) : compte du taux réduit
    (SKR03 1571 au lieu de 1576), le compte du taux normal à défaut. `net` : base HT servant
    à reconnaître le taux (par défaut total − TVA).
    """
    total, tax = Decimal(total or 0), Decimal(tax or 0)
    if not (0 < tax < total) or vat_exempt(org):
        return None
    base = Decimal(net) if net and Decimal(net) > 0 else total - tax
    rate = tax * 100 / base
    try:
        normal = Decimal(str(org.settings.default_tax_rate or 0))
    except Exception:
        normal = Decimal('0')
    if normal > 0 and rate < normal - Decimal('0.5'):
        return account_for_role(org, 'vat_deductible_reduced') or account_for_role(org, 'vat_deductible')
    return account_for_role(org, 'vat_deductible')


def _journal(org, code, name, jtype):
    from .models import AccountingJournal
    journal, _ = AccountingJournal.objects.get_or_create(
        organization=org, code=code, defaults={'name': journal_name(org, code, name), 'journal_type': jtype})
    return journal


def _lines_for(expense):
    """[(compte, débit, crédit)] de l'écriture, ou (None, message) si un compte manque."""
    org = expense.organization
    zero = Decimal('0')
    charge = account_for_role(org, expense.category) or account_for_role(org, 'exp_other')
    if not charge:
        return None, "Plan comptable incomplet : aucun compte de charge."
    total = Decimal(expense.amount)
    tax = Decimal(expense.tax_amount or 0)
    vat = deductible_vat_account(org, total, tax)
    if expense.is_paid:
        counter = account_for_role(org, PAYMENT_ROLE.get(expense.payment_method, 'cash')) or account_for_role(org, 'cash')
    else:
        counter = account_for_role(org, 'suppliers')
    if not counter:
        return None, "Plan comptable incomplet : compte de trésorerie ou fournisseur manquant."
    lines = [(charge, total - tax if vat else total, zero)]
    if vat:
        lines.append((vat, tax, zero))
    lines.append((counter, zero, total))
    return lines, None


def post_expense_entry(expense, user=None):
    """Crée ou remet à jour l'écriture de la dépense. Retourne (écriture, erreur)."""
    from .models import JournalEntry, JournalEntryLine

    lines, err = _lines_for(expense)
    if err:
        return None, err
    org = expense.organization
    if not expense.is_paid:
        journal = _journal(org, 'ACH', 'Journal des Achats', 'purchases')
    elif PAYMENT_ROLE.get(expense.payment_method, 'cash') == 'bank':
        journal = _journal(org, 'BNQ', 'Journal de Banque', 'bank')
    else:
        journal = _journal(org, 'CAI', 'Journal de Caisse', 'cash')
    label = f"{entry_label(org, 'expense')} — {expense.description}"[:300]

    with transaction.atomic():
        entry = expense.journal_entry
        if entry and entry.status == 'cancelled':
            entry = None
        if entry is None:
            entry = JournalEntry.objects.create(
                organization=org, journal=journal,
                entry_number=JournalEntry.generate_entry_number(org, journal),
                date=expense.date or date_type.today(), description=label,
                reference=expense.reference or '', status='posted', source='expense', created_by=user,
            )
        else:
            entry.journal = journal
            entry.date = expense.date
            entry.description = label
            entry.reference = expense.reference or ''
            entry.save(update_fields=['journal', 'date', 'description', 'reference', 'updated_at'])
            entry.lines.all().delete()
        for acc, debit, credit in lines:
            JournalEntryLine.objects.create(entry=entry, account=acc, description=expense.description[:300],
                                            debit=debit, credit=credit)
        if expense.journal_entry_id != entry.pk:
            type(expense).objects.filter(pk=expense.pk).update(journal_entry=entry)
            expense.journal_entry = entry
    return entry, None


def cancel_expense_entry(expense):
    """Annule l'écriture d'une dépense supprimée (l'écriture reste visible, marquée annulée)."""
    entry = expense.journal_entry
    if entry and entry.status != 'cancelled':
        entry.status = 'cancelled'
        entry.save(update_fields=['status', 'updated_at'])


def create_expense(organization, user, *, amount, description='', category=None, date=None, tax_amount=0,
                   payment_method='cash', is_paid=True, supplier_name='', reference='', source='manual',
                   receipt=None, notes=''):
    """Crée une dépense et son écriture. Retourne (dépense, erreur)."""
    from .models import Expense
    from apps.suppliers.models import Supplier

    amount = to_decimal(amount)
    if amount <= 0:
        return None, "Montant manquant ou nul."
    tax = to_decimal(tax_amount)
    if tax >= amount:
        tax = Decimal('0')
    cat = category if category in CATEGORY_KEYS else guess_category(f"{description} {supplier_name}")
    supplier = None
    if supplier_name:
        supplier = Supplier.objects.filter(organization=organization, name__iexact=supplier_name.strip()).first()
    with transaction.atomic():
        expense = Expense(
            organization=organization, date=date or date_type.today(), category=cat,
            description=(description or supplier_name or 'Dépense')[:300], supplier=supplier,
            supplier_name=(supplier_name or '')[:200], reference=(reference or '')[:100],
            amount=amount, tax_amount=tax, is_paid=bool(is_paid),
            payment_method=normalize_payment_method(payment_method), source=source,
            created_by=user if getattr(user, 'pk', None) else None, notes=notes or '',
        )
        if receipt is not None:
            expense.receipt = receipt
        expense.full_clean(exclude=['journal_entry', 'receipt', 'supplier', 'created_by'])
        expense.save()
        _entry, err = post_expense_entry(expense, user if getattr(user, 'pk', None) else None)
        if err:
            transaction.set_rollback(True)
            return None, err
    return expense, None
