from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
import uuid
import qrcode
from io import BytesIO
from django.core.files.base import ContentFile
import base64

User = get_user_model()


class Invoice(models.Model):
    """Facture"""
    STATUS_CHOICES = [
        ('draft', _('Brouillon')),
        ('sent', _('Envoyée')),
        ('paid', _('Payée')),
        ('overdue', _('En retard')),
        ('cancelled', _('Annulée')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=50, unique=True, verbose_name=_("Numéro de facture"))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name=_("Statut"))
    
    # Informations générales
    title = models.CharField(max_length=200, verbose_name=_("Titre"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    
    # Dates
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Date de création"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Date de modification"))
    due_date = models.DateField(verbose_name=_("Date d'échéance"))
    
    # Montants (simplifiés)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, verbose_name=_("Sous-total"))
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name=_("Montant des taxes"))
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, verbose_name=_("Montant total"))
    
    # Relations et informations supplémentaires
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_invoices', verbose_name=_("Créé par"))
    client = models.ForeignKey('accounts.CustomUser', on_delete=models.PROTECT, related_name='client_invoices', null=True, blank=True, verbose_name=_("Client"))
    purchase_order = models.ForeignKey('purchase_orders.PurchaseOrder', on_delete=models.SET_NULL, null=True, blank=True, verbose_name=_("Bon de commande associé"))

    # Informations de facturation
    billing_address = models.TextField(blank=True, verbose_name=_("Adresse de facturation"))
    payment_terms = models.CharField(max_length=100, default="Net 30", verbose_name=_("Conditions de paiement"))
    payment_method = models.CharField(max_length=50, blank=True, verbose_name=_("Mode de paiement"))
    currency = models.CharField(max_length=3, default="CAD", verbose_name=_("Devise"))

    class Meta:
        verbose_name = _("Facture")
        verbose_name_plural = _("Factures")
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.invoice_number} - {self.title}"

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = self.generate_invoice_number()
        super().save(*args, **kwargs)
    
    def recalculate_totals(self):
        """Recalcule les totaux basés sur les items"""
        items = self.items.all()
        self.subtotal = sum(item.total_price for item in items)
        self.total_amount = self.subtotal + self.tax_amount
        self.save(update_fields=['subtotal', 'total_amount'])

    def generate_qr_code(self):
        """Génère un QR code pour la facture"""
        client_name = self.client.get_full_name() if self.client else "Client"
        qr_data = f"FACTURE-{self.invoice_number}-{self.total_amount}{self.currency}-{client_name}"
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_data)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')

        return base64.b64encode(buffer.getvalue()).decode()

    def generate_invoice_number(self):
        """Génère un numéro de facture unique"""
        from datetime import datetime
        year = datetime.now().year
        month = datetime.now().month

        # Trouve le prochain numéro disponible
        last_invoice = Invoice.objects.filter(
            invoice_number__startswith=f"FAC{year}{month:02d}"
        ).order_by('-invoice_number').first()

        if last_invoice:
            try:
                last_number = int(last_invoice.invoice_number[-4:])
                next_number = last_number + 1
            except ValueError:
                next_number = 1
        else:
            next_number = 1

        return f"FAC{year}{month:02d}{next_number:04d}"

    @property
    def qr_code_data(self):
        """Retourne les données QR code encodées en base64"""
        return self.generate_qr_code()


class InvoiceItem(models.Model):
    """Article d'une facture"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items', verbose_name=_("Facture"))
    
    # Informations service/produit
    service_code = models.CharField(max_length=100, verbose_name=_("Code service"), default="SVC-001")
    product_reference = models.CharField(max_length=100, blank=True, default="", verbose_name=_("Référence produit"))
    description = models.CharField(max_length=500, verbose_name=_("Description"))
    detailed_description = models.TextField(blank=True, default="", verbose_name=_("Description détaillée"))
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)], verbose_name=_("Quantité"))
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], verbose_name=_("Prix unitaire"))
    total_price = models.DecimalField(max_digits=14, decimal_places=2, verbose_name=_("Prix total"))

    # Informations supplémentaires
    unit_of_measure = models.CharField(max_length=20, default="unité", verbose_name=_("Unité de mesure"))
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name=_("Remise (%)"))
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name=_("Taux de taxe (%)"))
    notes = models.TextField(blank=True, default="", verbose_name=_("Notes"))
    
    # Dates
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Article de facture")
        verbose_name_plural = _("Articles de facture")

    def __str__(self):
        return f"{self.service_code} - {self.description}"

    def save(self, *args, **kwargs):
        from decimal import Decimal
        # Calcul avec remise
        base_total = self.quantity * self.unit_price
        discount_amount = base_total * (self.discount_percent / Decimal('100'))
        self.total_price = base_total - discount_amount

        super().save(*args, **kwargs)
        # Recalculer les totaux de la facture
        self.invoice.recalculate_totals()

    @property
    def total_before_discount(self):
        """Retourne le total avant remise"""
        return self.quantity * self.unit_price

    @property
    def discount_amount(self):
        """Retourne le montant de la remise"""
        from decimal import Decimal
        return self.total_before_discount * (self.discount_percent / Decimal('100'))


# ====================================
# MODÈLES D'IMPRESSION
# ====================================

class PrintTemplate(models.Model):
    """Template d'impression configurable"""
    TEMPLATE_TYPES = [
        ('invoice', _('Facture')),
        ('purchase_order', _('Bon de commande')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, verbose_name=_("Nom du template"))
    template_type = models.CharField(max_length=20, choices=TEMPLATE_TYPES, verbose_name=_("Type"))
    is_default = models.BooleanField(default=False, verbose_name=_("Template par défaut"))

    # Configuration de l'en-tête
    header_logo = models.ImageField(upload_to='print_templates/logos/', blank=True, null=True, verbose_name=_("Logo"))
    header_company_name = models.CharField(max_length=200, default="ProcureGenius", verbose_name=_("Nom de l'entreprise"))
    header_address = models.TextField(default="", verbose_name=_("Adresse"))
    header_phone = models.CharField(max_length=50, blank=True, default="", verbose_name=_("Téléphone"))
    header_email = models.EmailField(blank=True, default="", verbose_name=_("Email"))
    header_website = models.URLField(blank=True, default="", verbose_name=_("Site web"))

    # Configuration du footer
    footer_text = models.TextField(blank=True, default="", verbose_name=_("Texte du pied de page"))
    footer_conditions = models.TextField(blank=True, default="", verbose_name=_("Conditions générales"))

    # Configuration des couleurs
    primary_color = models.CharField(max_length=7, default="#0066cc", verbose_name=_("Couleur principale"))
    secondary_color = models.CharField(max_length=7, default="#00d4ff", verbose_name=_("Couleur secondaire"))
    text_color = models.CharField(max_length=7, default="#333333", verbose_name=_("Couleur du texte"))

    # Configuration de mise en page
    show_qr_code = models.BooleanField(default=True, verbose_name=_("Afficher le QR code"))
    qr_code_position = models.CharField(
        max_length=20,
        choices=[
            ('top-right', _('En haut à droite')),
            ('bottom-right', _('En bas à droite')),
            ('bottom-left', _('En bas à gauche')),
        ],
        default='bottom-right',
        verbose_name=_("Position du QR code")
    )

    # Dates
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Template d'impression")
        verbose_name_plural = _("Templates d'impression")
        ordering = ['template_type', 'name']

    def __str__(self):
        return f"{self.get_template_type_display()} - {self.name}"

    def save(self, *args, **kwargs):
        # S'assurer qu'il n'y a qu'un seul template par défaut par type
        if self.is_default:
            PrintTemplate.objects.filter(
                template_type=self.template_type,
                is_default=True
            ).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)


class PrintConfiguration(models.Model):
    """Configuration d'impression pour une organisation"""
    PAPER_SIZES = [
        ('A4', 'A4 (210 × 297 mm)'),
        ('LETTER', 'Letter (8.5 × 11 in)'),
        ('LEGAL', 'Legal (8.5 × 14 in)'),
    ]

    ORIENTATIONS = [
        ('portrait', _('Portrait')),
        ('landscape', _('Paysage')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, default="Configuration par défaut", verbose_name=_("Nom de la configuration"))

    # Configuration papier
    paper_size = models.CharField(max_length=10, choices=PAPER_SIZES, default='A4', verbose_name=_("Taille du papier"))
    orientation = models.CharField(max_length=10, choices=ORIENTATIONS, default='portrait', verbose_name=_("Orientation"))

    # Marges (en mm)
    margin_top = models.PositiveIntegerField(default=20, verbose_name=_("Marge haute (mm)"))
    margin_bottom = models.PositiveIntegerField(default=20, verbose_name=_("Marge basse (mm)"))
    margin_left = models.PositiveIntegerField(default=20, verbose_name=_("Marge gauche (mm)"))
    margin_right = models.PositiveIntegerField(default=20, verbose_name=_("Marge droite (mm)"))

    # Configuration des polices
    font_family = models.CharField(
        max_length=50,
        choices=[
            ('Arial', 'Arial'),
            ('Helvetica', 'Helvetica'),
            ('Times New Roman', 'Times New Roman'),
            ('Roboto', 'Roboto'),
            ('Open Sans', 'Open Sans'),
        ],
        default='Arial',
        verbose_name=_("Police")
    )
    font_size_normal = models.PositiveIntegerField(default=10, verbose_name=_("Taille police normale"))
    font_size_small = models.PositiveIntegerField(default=8, verbose_name=_("Taille police petite"))
    font_size_large = models.PositiveIntegerField(default=14, verbose_name=_("Taille police grande"))

    # Configuration des numéros
    invoice_number_prefix = models.CharField(max_length=10, default="FAC-", verbose_name=_("Préfixe facture"))
    po_number_prefix = models.CharField(max_length=10, default="BC-", verbose_name=_("Préfixe bon de commande"))

    # Options d'impression
    include_duplicate_watermark = models.BooleanField(default=False, verbose_name=_("Filigrane duplicata"))
    include_page_numbers = models.BooleanField(default=True, verbose_name=_("Numéros de page"))
    include_total_pages = models.BooleanField(default=True, verbose_name=_("Total des pages"))

    is_default = models.BooleanField(default=False, verbose_name=_("Configuration par défaut"))

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Configuration d'impression")
        verbose_name_plural = _("Configurations d'impression")
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # S'assurer qu'il n'y a qu'une seule configuration par défaut
        if self.is_default:
            PrintConfiguration.objects.filter(is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)


class PrintHistory(models.Model):
    """Historique des impressions"""
    DOCUMENT_TYPES = [
        ('invoice', _('Facture')),
        ('purchase_order', _('Bon de commande')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES, verbose_name=_("Type de document"))
    document_id = models.UUIDField(verbose_name=_("ID du document"))
    document_number = models.CharField(max_length=100, verbose_name=_("Numéro du document"))

    template_used = models.ForeignKey(PrintTemplate, on_delete=models.SET_NULL, null=True, verbose_name=_("Template utilisé"))
    configuration_used = models.ForeignKey(PrintConfiguration, on_delete=models.SET_NULL, null=True, verbose_name=_("Configuration utilisée"))

    printed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name=_("Imprimé par"))
    printed_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Date d'impression"))

    # Métadonnées d'impression
    print_format = models.CharField(max_length=20, default='PDF', verbose_name=_("Format d'impression"))
    file_size = models.PositiveIntegerField(null=True, blank=True, verbose_name=_("Taille du fichier (bytes)"))

    class Meta:
        verbose_name = _("Historique d'impression")
        verbose_name_plural = _("Historiques d'impression")
        ordering = ['-printed_at']

    def __str__(self):
        return f"{self.get_document_type_display()} {self.document_number} - {self.printed_at.strftime('%d/%m/%Y %H:%M')}"