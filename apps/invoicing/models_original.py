from django.db import models
from djmoney import models as money_models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from django.urls import reverse
from decimal import Decimal
import uuid

User = get_user_model()


class InvoiceStatus(models.TextChoices):
    DRAFT = 'draft', _('Brouillon')
    SENT = 'sent', _('Envoyée')
    VIEWED = 'viewed', _('Consultée')
    PARTIAL = 'partial', _('Partiellement payée')
    PAID = 'paid', _('Payée')
    OVERDUE = 'overdue', _('En retard')
    CANCELLED = 'cancelled', _('Annulée')


class Invoice(models.Model):
    """Facture principale"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.CharField(max_length=50, unique=True, verbose_name=_("Numéro"))
    
    # Relations
    purchase_order = models.ForeignKey(
        'purchase_orders.PurchaseOrder', 
        on_delete=models.CASCADE, 
        null=True, blank=True,
        verbose_name=_("Bon de commande")
    )
    client = models.ForeignKey(
        'suppliers.Client', 
        on_delete=models.CASCADE,
        verbose_name=_("Client")
    )
    created_by = models.ForeignKey(
        User, 
        on_delete=models.CASCADE,
        verbose_name=_("Créé par")
    )
    
    # Statut
    status = models.CharField(
        max_length=20, 
        choices=InvoiceStatus.choices, 
        default=InvoiceStatus.DRAFT,
        verbose_name=_("Statut")
    )
    
    # Montants
    subtotal = money_models.MoneyField(
        max_digits=14, decimal_places=2, 
        default_currency='CAD',
        verbose_name=_("Sous-total")
    )
    tax_gst_hst_rate = models.DecimalField(
        max_digits=5, decimal_places=4, default=0.05,
        verbose_name=_("Taux TPS/TVH")
    )
    tax_gst_hst = money_models.MoneyField(
        max_digits=14, decimal_places=2, 
        default_currency='CAD',
        verbose_name=_("TPS/TVH")
    )
    tax_qst_rate = models.DecimalField(
        max_digits=5, decimal_places=4, default=0.09975,
        verbose_name=_("Taux TVQ")
    )
    tax_qst = money_models.MoneyField(
        max_digits=14, decimal_places=2, 
        default_currency='CAD', default=0,
        verbose_name=_("TVQ")
    )
    total_amount = money_models.MoneyField(
        max_digits=14, decimal_places=2, 
        default_currency='CAD',
        verbose_name=_("Montant total")
    )
    
    # Dates
    invoice_date = models.DateField(verbose_name=_("Date de facture"))
    due_date = models.DateField(verbose_name=_("Date d'échéance"))
    
    # Paiement
    payment_terms = models.CharField(
        max_length=50, default='NET 30',
        verbose_name=_("Conditions de paiement")
    )
    payment_method = models.CharField(
        max_length=50, blank=True,
        verbose_name=_("Méthode de paiement")
    )
    
    # Adresses
    billing_address = models.TextField(verbose_name=_("Adresse de facturation"))
    
    # Notes
    notes = models.TextField(blank=True, verbose_name=_("Notes"))
    terms_conditions = models.TextField(blank=True, verbose_name=_("Termes et conditions"))
    
    # IA
    generated_by_ai = models.BooleanField(
        default=False,
        verbose_name=_("Générée par IA")
    )
    ai_analysis = models.JSONField(default=dict, verbose_name=_("Analyse IA"))
    
    # Facturation récurrente
    is_recurring = models.BooleanField(default=False, verbose_name=_("Facturation récurrente"))
    recurring_pattern = models.CharField(max_length=20, choices=[
        ('monthly', _('Mensuel')),
        ('quarterly', _('Trimestriel')),
        ('annually', _('Annuel'))
    ], blank=True, verbose_name=_("Fréquence"))
    
    # PayPal
    paypal_payment_id = models.CharField(
        max_length=100, blank=True,
        verbose_name=_("ID de paiement PayPal")
    )
    paypal_status = models.CharField(
        max_length=50, blank=True,
        verbose_name=_("Statut PayPal")
    )
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Modifié le"))
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Envoyé le"))

    class Meta:
        ordering = ['-created_at']
        verbose_name = _("Facture")
        verbose_name_plural = _("Factures")
        indexes = [
            models.Index(fields=['status', 'due_date']),
            models.Index(fields=['client', 'status']),
            models.Index(fields=['number']),
        ]

    def __str__(self):
        return f"{self.number} - {self.client.name}"

    def get_absolute_url(self):
        return reverse('invoicing:detail', args=[str(self.id)])

    def get_status_display_class(self):
        """Retourne la classe CSS pour le statut"""
        status_classes = {
            'draft': 'secondary',
            'sent': 'primary',
            'viewed': 'info',
            'partial': 'warning',
            'paid': 'success',
            'overdue': 'danger',
            'cancelled': 'dark',
        }
        return status_classes.get(self.status, 'secondary')

    def is_overdue(self):
        """Vérifie si la facture est en retard"""
        from django.utils import timezone
        return (
            self.status in ['sent', 'viewed', 'partial'] and 
            self.due_date < timezone.now().date()
        )

    def get_balance_due(self):
        """Calcule le solde restant à payer"""
        total_payments = sum(p.amount for p in self.payments.all())
        return self.total_amount - total_payments

    def get_payment_percentage(self):
        """Calcule le pourcentage payé"""
        if self.total_amount.amount == 0:
            return 0
        
        total_payments = sum(p.amount.amount for p in self.payments.all())
        return (total_payments / self.total_amount.amount) * 100

    def can_be_edited(self):
        """Vérifie si la facture peut être modifiée"""
        return self.status in ['draft']

    def can_be_sent(self):
        """Vérifie si la facture peut être envoyée"""
        return self.status in ['draft', 'viewed']

    def can_be_cancelled(self):
        """Vérifie si la facture peut être annulée"""
        return self.status in ['draft', 'sent', 'viewed']

    def calculate_totals(self):
        """Recalcule les totaux de la facture"""
        subtotal = sum(item.total_price for item in self.items.all())
        
        self.subtotal = subtotal
        self.tax_gst_hst = subtotal * Decimal(str(self.tax_gst_hst_rate))
        self.tax_qst = subtotal * Decimal(str(self.tax_qst_rate))
        self.total_amount = self.subtotal + self.tax_gst_hst + self.tax_qst

    def update_status_from_payments(self):
        """Met à jour le statut selon les paiements reçus"""
        balance = self.get_balance_due()
        
        if balance.amount <= 0:
            self.status = 'paid'
        elif balance.amount < self.total_amount.amount:
            self.status = 'partial'
        elif self.is_overdue():
            self.status = 'overdue'

    def get_paypal_payment_url(self):
        """Génère l'URL de paiement PayPal"""
        # Cette méthode sera implémentée avec l'intégration PayPal
        return f"/invoicing/{self.id}/pay-paypal/"


class InvoiceItem(models.Model):
    """Ligne de facture"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        Invoice, 
        on_delete=models.CASCADE, 
        related_name='items',
        verbose_name=_("Facture")
    )
    
    description = models.CharField(max_length=255, verbose_name=_("Description"))
    quantity = models.DecimalField(
        max_digits=10, decimal_places=2,
        verbose_name=_("Quantité")
    )
    unit_price = money_models.MoneyField(
        max_digits=12, decimal_places=2, 
        default_currency='CAD',
        verbose_name=_("Prix unitaire")
    )
    total_price = money_models.MoneyField(
        max_digits=14, decimal_places=2, 
        default_currency='CAD',
        verbose_name=_("Prix total")
    )
    
    # Catégorie comptable
    account_code = models.CharField(
        max_length=20, blank=True,
        verbose_name=_("Code comptable")
    )

    class Meta:
        ordering = ['id']
        verbose_name = _("Ligne de facture")
        verbose_name_plural = _("Lignes de facture")

    def __str__(self):
        return f"{self.description} - {self.quantity} x {self.unit_price}"

    def save(self, *args, **kwargs):
        # Calculer automatiquement le prix total
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)


class Payment(models.Model):
    """Paiement reçu"""
    
    PAYMENT_METHODS = [
        ('interac', _('Virement Interac')),
        ('wire', _('Virement bancaire')),
        ('check', _('Chèque')),
        ('cash', _('Comptant')),
        ('card', _('Carte de crédit')),
        ('paypal', _('PayPal')),
        ('other', _('Autre')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        Invoice, 
        on_delete=models.CASCADE, 
        related_name='payments',
        verbose_name=_("Facture")
    )
    
    amount = money_models.MoneyField(
        max_digits=14, decimal_places=2, 
        default_currency='CAD',
        verbose_name=_("Montant")
    )
    payment_date = models.DateField(verbose_name=_("Date de paiement"))
    payment_method = models.CharField(
        max_length=50, 
        choices=PAYMENT_METHODS,
        verbose_name=_("Méthode de paiement")
    )
    
    reference = models.CharField(
        max_length=100, blank=True,
        verbose_name=_("Référence")
    )
    notes = models.TextField(blank=True, verbose_name=_("Notes"))
    
    # PayPal specific fields
    paypal_transaction_id = models.CharField(
        max_length=100, blank=True,
        verbose_name=_("ID transaction PayPal")
    )
    paypal_payer_email = models.EmailField(
        blank=True,
        verbose_name=_("Email payeur PayPal")
    )
    paypal_fee = money_models.MoneyField(
        max_digits=10, decimal_places=2, 
        default_currency='CAD', default=0,
        verbose_name=_("Frais PayPal")
    )
    
    created_by = models.ForeignKey(
        User, 
        on_delete=models.CASCADE,
        verbose_name=_("Créé par")
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))

    class Meta:
        ordering = ['-payment_date']
        verbose_name = _("Paiement")
        verbose_name_plural = _("Paiements")

    def __str__(self):
        return f"{self.invoice.number} - {self.amount} - {self.payment_date}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Mettre à jour le statut de la facture
        self.invoice.update_status_from_payments()
        self.invoice.save()


class InvoiceReminder(models.Model):
    """Relances automatiques"""
    
    REMINDER_TYPES = [
        ('first', _('Premier rappel')),
        ('second', _('Deuxième rappel')),
        ('final', _('Mise en demeure')),
        ('collection', _('Recouvrement')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        Invoice, 
        on_delete=models.CASCADE, 
        related_name='reminders',
        verbose_name=_("Facture")
    )
    
    reminder_type = models.CharField(
        max_length=20, 
        choices=REMINDER_TYPES,
        verbose_name=_("Type de relance")
    )
    
    sent_at = models.DateTimeField(verbose_name=_("Envoyé le"))
    sent_by_ai = models.BooleanField(default=False, verbose_name=_("Envoyé par IA"))
    email_subject = models.CharField(max_length=200, verbose_name=_("Sujet email"))
    email_body = models.TextField(verbose_name=_("Corps email"))
    
    opened = models.BooleanField(default=False, verbose_name=_("Ouvert"))
    opened_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Ouvert le"))

    class Meta:
        ordering = ['-sent_at']
        verbose_name = _("Relance")
        verbose_name_plural = _("Relances")

    def __str__(self):
        return f"{self.invoice.number} - {self.get_reminder_type_display()}"


class RecurringInvoice(models.Model):
    """Factures récurrentes"""
    
    FREQUENCIES = [
        ('monthly', _('Mensuel')),
        ('quarterly', _('Trimestriel')),
        ('semi_annual', _('Semestriel')),
        ('annually', _('Annuel')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Template de facture
    name = models.CharField(max_length=100, verbose_name=_("Nom"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    client = models.ForeignKey(
        'suppliers.Client',
        on_delete=models.CASCADE,
        verbose_name=_("Client")
    )
    
    # Configuration
    frequency = models.CharField(
        max_length=20, 
        choices=FREQUENCIES,
        verbose_name=_("Fréquence")
    )
    start_date = models.DateField(verbose_name=_("Date de début"))
    end_date = models.DateField(null=True, blank=True, verbose_name=_("Date de fin"))
    
    # Template de données
    template_data = models.JSONField(verbose_name=_("Données template"))
    
    # Statut
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    next_invoice_date = models.DateField(verbose_name=_("Prochaine facture"))
    
    # Statistiques
    invoices_generated = models.IntegerField(default=0, verbose_name=_("Factures générées"))
    last_generated = models.DateTimeField(null=True, blank=True, verbose_name=_("Dernière génération"))
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name=_("Créé par")
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Modifié le"))

    class Meta:
        ordering = ['next_invoice_date']
        verbose_name = _("Facture récurrente")
        verbose_name_plural = _("Factures récurrentes")

    def __str__(self):
        return f"{self.name} - {self.client.name}"

    def calculate_next_date(self):
        """Calcule la prochaine date de facturation"""
        from dateutil.relativedelta import relativedelta
        
        if self.frequency == 'monthly':
            return self.next_invoice_date + relativedelta(months=1)
        elif self.frequency == 'quarterly':
            return self.next_invoice_date + relativedelta(months=3)
        elif self.frequency == 'semi_annual':
            return self.next_invoice_date + relativedelta(months=6)
        elif self.frequency == 'annually':
            return self.next_invoice_date + relativedelta(years=1)
        
        return self.next_invoice_date

    def should_generate_invoice(self):
        """Vérifie s'il faut générer une facture"""
        from django.utils import timezone
        return (
            self.is_active and 
            self.next_invoice_date <= timezone.now().date() and
            (not self.end_date or self.next_invoice_date <= self.end_date)
        )


class InvoiceTemplate(models.Model):
    """Templates de factures pour faciliter la création"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(max_length=100, verbose_name=_("Nom"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    client = models.ForeignKey(
        'suppliers.Client',
        on_delete=models.CASCADE,
        null=True, blank=True,
        verbose_name=_("Client par défaut")
    )
    
    # Template data
    template_data = models.JSONField(verbose_name=_("Données du template"))
    
    # Métadonnées
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name=_("Créé par")
    )
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    usage_count = models.IntegerField(default=0, verbose_name=_("Nombre d'utilisations"))
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Modifié le"))

    class Meta:
        ordering = ['-usage_count', 'name']
        verbose_name = _("Template de facture")
        verbose_name_plural = _("Templates de factures")

    def __str__(self):
        return f"{self.name}"


class InvoiceAttachment(models.Model):
    """Pièces jointes aux factures"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='attachments',
        verbose_name=_("Facture")
    )
    
    name = models.CharField(max_length=200, verbose_name=_("Nom"))
    file = models.FileField(
        upload_to='invoices/attachments/',
        verbose_name=_("Fichier")
    )
    description = models.TextField(blank=True, verbose_name=_("Description"))
    
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name=_("Uploadé par")
    )
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Uploadé le"))

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = _("Pièce jointe")
        verbose_name_plural = _("Pièces jointes")

    def __str__(self):
        return f"{self.name} - {self.invoice.number}"


class PayPalTransaction(models.Model):
    """Transactions PayPal détaillées"""
    
    TRANSACTION_TYPES = [
        ('payment', _('Paiement')),
        ('refund', _('Remboursement')),
        ('dispute', _('Litige')),
    ]
    
    TRANSACTION_STATUS = [
        ('pending', _('En attente')),
        ('completed', _('Terminé')),
        ('failed', _('Échoué')),
        ('cancelled', _('Annulé')),
        ('refunded', _('Remboursé')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relations
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='paypal_transactions',
        verbose_name=_("Facture")
    )
    payment = models.OneToOneField(
        Payment,
        on_delete=models.CASCADE,
        null=True, blank=True,
        verbose_name=_("Paiement")
    )
    
    # Données PayPal
    paypal_transaction_id = models.CharField(
        max_length=100, unique=True,
        verbose_name=_("ID transaction PayPal")
    )
    paypal_payment_id = models.CharField(
        max_length=100, blank=True,
        verbose_name=_("ID paiement PayPal")
    )
    
    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_TYPES,
        verbose_name=_("Type de transaction")
    )
    status = models.CharField(
        max_length=20,
        choices=TRANSACTION_STATUS,
        verbose_name=_("Statut")
    )
    
    # Montants
    gross_amount = money_models.MoneyField(
        max_digits=14, decimal_places=2,
        default_currency='CAD',
        verbose_name=_("Montant brut")
    )
    fee_amount = money_models.MoneyField(
        max_digits=10, decimal_places=2,
        default_currency='CAD', default=0,
        verbose_name=_("Frais")
    )
    net_amount = money_models.MoneyField(
        max_digits=14, decimal_places=2,
        default_currency='CAD',
        verbose_name=_("Montant net")
    )
    
    # Informations du payeur
    payer_email = models.EmailField(verbose_name=_("Email payeur"))
    payer_name = models.CharField(max_length=100, blank=True, verbose_name=_("Nom payeur"))
    payer_id = models.CharField(max_length=100, blank=True, verbose_name=_("ID payeur"))
    
    # Données brutes de PayPal
    raw_data = models.JSONField(default=dict, verbose_name=_("Données brutes"))
    
    # Dates
    transaction_date = models.DateTimeField(verbose_name=_("Date transaction"))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))

    class Meta:
        ordering = ['-transaction_date']
        verbose_name = _("Transaction PayPal")
        verbose_name_plural = _("Transactions PayPal")

    def __str__(self):
        return f"PayPal {self.paypal_transaction_id} - {self.invoice.number}"