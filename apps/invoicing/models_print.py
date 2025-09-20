from django.db import models
from django.utils.translation import gettext_lazy as _
import uuid


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
    header_company_name = models.CharField(max_length=200, verbose_name=_("Nom de l'entreprise"))
    header_address = models.TextField(verbose_name=_("Adresse"))
    header_phone = models.CharField(max_length=50, blank=True, verbose_name=_("Téléphone"))
    header_email = models.EmailField(blank=True, verbose_name=_("Email"))
    header_website = models.URLField(blank=True, verbose_name=_("Site web"))

    # Configuration du footer
    footer_text = models.TextField(blank=True, verbose_name=_("Texte du pied de page"))
    footer_conditions = models.TextField(blank=True, verbose_name=_("Conditions générales"))

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
    name = models.CharField(max_length=200, verbose_name=_("Nom de la configuration"))

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

    printed_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, verbose_name=_("Imprimé par"))
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