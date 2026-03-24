"""
Module Comptabilité — Plan comptable, journaux, écritures en partie double
"""
import uuid
from decimal import Decimal
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

User = get_user_model()


class Account(models.Model):
    """Compte du Plan Comptable"""

    ACCOUNT_TYPES = [
        ('asset',     _('Actif')),
        ('liability', _('Passif')),
        ('equity',    _('Capitaux Propres')),
        ('revenue',   _('Produit')),
        ('expense',   _('Charge')),
    ]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='accounts',
        verbose_name=_("Organisation"),
    )
    code         = models.CharField(max_length=20, verbose_name=_("Numéro de compte"))
    name         = models.CharField(max_length=200, verbose_name=_("Intitulé"))
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES, verbose_name=_("Type"))
    parent       = models.ForeignKey(
        'self',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='children',
        verbose_name=_("Compte parent"),
    )
    is_active    = models.BooleanField(default=True, verbose_name=_("Actif"))
    is_system    = models.BooleanField(default=False, verbose_name=_("Compte système"),
                                       help_text=_("Compte prédéfini, non supprimable"))
    notes        = models.TextField(blank=True, verbose_name=_("Notes"))
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['code']
        unique_together = [('organization', 'code')]
        verbose_name = _("Compte")
        verbose_name_plural = _("Plan Comptable")

    def __str__(self):
        return f"{self.code} — {self.name}"

    @property
    def is_debit_normal(self):
        """Actifs et Charges augmentent au débit"""
        return self.account_type in ('asset', 'expense')


class AccountingJournal(models.Model):
    """Journal comptable (Ventes, Achats, Caisse, Banque, OD)"""

    JOURNAL_TYPES = [
        ('sales',     _('Journal des Ventes')),
        ('purchases', _('Journal des Achats')),
        ('cash',      _('Journal de Caisse')),
        ('bank',      _('Journal de Banque')),
        ('misc',      _('Opérations Diverses')),
    ]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='accounting_journals',
    )
    code         = models.CharField(max_length=10, verbose_name=_("Code"))
    name         = models.CharField(max_length=100, verbose_name=_("Nom"))
    journal_type = models.CharField(max_length=20, choices=JOURNAL_TYPES, verbose_name=_("Type"))
    is_active    = models.BooleanField(default=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['code']
        unique_together = [('organization', 'code')]
        verbose_name = _("Journal")
        verbose_name_plural = _("Journaux")

    def __str__(self):
        return f"{self.code} — {self.name}"


class JournalEntry(models.Model):
    """Écriture comptable"""

    STATUS_CHOICES = [
        ('draft',     _('Brouillon')),
        ('posted',    _('Validée')),
        ('cancelled', _('Annulée')),
    ]

    SOURCE_CHOICES = [
        ('manual',            _('Saisie manuelle')),
        ('invoice',           _('Facture')),
        ('invoice_reversal',  _('Extourne facture')),
        ('payment',           _('Paiement')),
        ('purchase_order',    _('Bon de commande')),
    ]

    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization   = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='journal_entries',
    )
    journal        = models.ForeignKey(
        AccountingJournal,
        on_delete=models.PROTECT,
        related_name='entries',
        verbose_name=_("Journal"),
    )
    entry_number   = models.CharField(max_length=50, verbose_name=_("Numéro d'écriture"))
    date           = models.DateField(verbose_name=_("Date"))
    description    = models.CharField(max_length=300, verbose_name=_("Libellé"))
    reference      = models.CharField(max_length=100, blank=True, verbose_name=_("Référence"))
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    source         = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='manual')

    # Liens optionnels vers les documents sources
    source_invoice = models.ForeignKey(
        'invoicing.Invoice',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='accounting_entries',
        verbose_name=_("Facture source"),
    )
    source_payment = models.ForeignKey(
        'invoicing.Payment',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='accounting_entries',
        verbose_name=_("Paiement source"),
    )

    created_by   = models.ForeignKey(
        User,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='accounting_entries_created',
    )
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        verbose_name = _("Écriture comptable")
        verbose_name_plural = _("Écritures comptables")

    def __str__(self):
        return f"{self.entry_number} — {self.description}"

    @property
    def total_debit(self):
        return self.lines.aggregate(t=models.Sum('debit'))['t'] or Decimal('0')

    @property
    def total_credit(self):
        return self.lines.aggregate(t=models.Sum('credit'))['t'] or Decimal('0')

    @property
    def is_balanced(self):
        return self.total_debit == self.total_credit

    def clean(self):
        if self.status == 'posted' and not self.is_balanced:
            raise ValidationError(
                _("L'écriture doit être équilibrée (Total débit = Total crédit) avant validation.")
            )

    @classmethod
    def generate_entry_number(cls, organization, journal):
        from django.utils import timezone
        year = timezone.now().year
        prefix = f"{journal.code}-{year}"
        last = cls.objects.filter(
            organization=organization,
            journal=journal,
            entry_number__startswith=prefix,
        ).order_by('-entry_number').first()
        if last:
            try:
                seq = int(last.entry_number.split('-')[-1]) + 1
            except (ValueError, IndexError):
                seq = 1
        else:
            seq = 1
        return f"{prefix}-{seq:05d}"


class JournalEntryLine(models.Model):
    """Ligne d'écriture (débit ou crédit)"""

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entry       = models.ForeignKey(
        JournalEntry,
        on_delete=models.CASCADE,
        related_name='lines',
        verbose_name=_("Écriture"),
    )
    account     = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name='lines',
        verbose_name=_("Compte"),
    )
    description = models.CharField(max_length=300, blank=True, verbose_name=_("Libellé"))
    debit       = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0'))
    credit      = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0'))
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = _("Ligne d'écriture")
        verbose_name_plural = _("Lignes d'écriture")

    def __str__(self):
        if self.debit:
            return f"D {self.account.code} {self.debit}"
        return f"C {self.account.code} {self.credit}"

    def clean(self):
        d = self.debit or Decimal('0')
        c = self.credit or Decimal('0')
        if d == 0 and c == 0:
            raise ValidationError(_("Une ligne doit avoir un montant débit ou crédit."))
        if d > 0 and c > 0:
            raise ValidationError(_("Une ligne ne peut pas avoir à la fois un débit et un crédit."))
        if d < 0 or c < 0:
            raise ValidationError(_("Les montants ne peuvent pas être négatifs."))
