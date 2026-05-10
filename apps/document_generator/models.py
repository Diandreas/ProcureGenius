"""
Document Generator models.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import uuid
import random
import string


class OrganizationDocument(models.Model):
    DOCUMENT_TYPES = [
        ('price_list_public', _('Liste de prix (Public)')),
        ('price_list_subcontract', _('Liste de prix (Sous-traitance)')),
        ('packs_catalog', _('Catalogue de packs')),
        ('bilans_list', _('Liste des bilans')),
        ('services_list', _('Liste des soins & services')),
        ('full_catalog', _('Catalogue complet (Tarifs + Infos)')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='documents',
        verbose_name=_("Organisation")
    )

    document_type = models.CharField(
        max_length=50,
        choices=DOCUMENT_TYPES,
        verbose_name=_("Type de document")
    )

    title = models.CharField(
        max_length=200,
        verbose_name=_("Titre du document")
    )
    subtitle = models.CharField(
        max_length=200,
        blank=True,
        verbose_name=_("Sous-titre")
    )

    revision_date = models.DateField(
        null=True,
        blank=True,
        verbose_name=_("Date de révision")
    )

    custom_fields = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Champs personnalisés"),
        help_text=_("Textes d'introduction, mentions légales, notes de bas de page, etc.")
    )

    header_image = models.ImageField(
        upload_to='document_headers/',
        null=True,
        blank=True,
        verbose_name=_("Image d'en-tête personnalisée")
    )
    footer_image = models.ImageField(
        upload_to='document_footers/',
        null=True,
        blank=True,
        verbose_name=_("Image de pied de page personnalisée")
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name=_("Actif")
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Document de l'Organisation")
        verbose_name_plural = _("Documents de l'Organisation")
        unique_together = ('organization', 'document_type')

    def __str__(self):
        return f"{self.get_document_type_display()} - {self.title}"


class HealthPackage(models.Model):
    CATEGORY_CHOICES = [
        ('couples', _('Couples & Bilan Prénuptial')),
        ('maternity', _('Maternité & Suivi de Grossesse')),
        ('seniority', _('Sénior & Bilan de Santé Général')),
        ('general', _('Bilan Général')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='health_packages',
        verbose_name=_("Organisation")
    )

    name = models.CharField(
        max_length=200,
        verbose_name=_("Nom du pack")
    )
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        default='general',
        verbose_name=_("Catégorie")
    )
    description = models.TextField(
        blank=True,
        verbose_name=_("Description / Note d'intention")
    )

    original_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Prix original (somme des tests)")
    )
    discounted_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name=_("Prix du pack remisé")
    )

    # We can link it to lab tests if we want to auto-calculate, but a text field is more flexible for the PDF
    included_tests = models.ManyToManyField(
        'laboratory.LabTest',
        blank=True,
        related_name='packages',
        verbose_name=_("Analyses incluses")
    )
    included_tests_text = models.TextField(
        blank=True,
        verbose_name=_("Analyses incluses (Texte libre)"),
        help_text=_("Liste des analyses ou prestations (pour affichage PDF si différent de la base)")
    )

    display_order = models.IntegerField(
        default=0,
        verbose_name=_("Ordre d'affichage")
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name=_("Actif")
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Pack Santé")
        verbose_name_plural = _("Packs Santé")
        ordering = ['category', 'display_order', 'name']

    def __str__(self):
        return self.name


def _generate_coupon_code():
    return ''.join(random.choices(string.digits, k=4))


class DiscountCoupon(models.Model):
    DISCOUNT_TYPE_CHOICES = [
        ('percent', _('Pourcentage (%)')),
        ('fixed', _('Montant fixe (FCFA)')),
    ]
    STATUS_CHOICES = [
        ('active', _('Actif')),
        ('used', _('Utilisé')),
        ('expired', _('Expiré')),
        ('cancelled', _('Annulé')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='discount_coupons',
        verbose_name=_("Organisation")
    )
    code = models.CharField(
        max_length=20,
        unique=True,
        default=_generate_coupon_code,
        verbose_name=_("Code coupon"),
        help_text=_("Code unique remis à la patiente")
    )
    label = models.CharField(
        max_length=150,
        blank=True,
        verbose_name=_("Libellé"),
        help_text=_("Ex: Offre Fête des Mères, Fidélité patiente, Pack prénatal")
    )

    discount_type = models.CharField(
        max_length=10,
        choices=DISCOUNT_TYPE_CHOICES,
        default='percent',
        verbose_name=_("Type de remise")
    )
    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name=_("Valeur de la remise"),
        help_text=_("Ex: 10 pour 10% ou 5000 pour 5 000 FCFA")
    )
    min_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name=_("Montant minimum de facture"),
        help_text=_("0 = aucun minimum")
    )
    max_discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Remise maximale (FCFA)"),
        help_text=_("Plafond de remise pour les coupons %. Vide = illimité.")
    )

    # Usage
    max_uses = models.PositiveIntegerField(
        default=1,
        verbose_name=_("Nombre d'utilisations max"),
        help_text=_("1 = usage unique")
    )
    uses_count = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Nombre d'utilisations")
    )

    # Validité
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Date d'expiration"),
        help_text=_("Laisser vide = pas d'expiration")
    )
    status = models.CharField(
        max_length=15,
        choices=STATUS_CHOICES,
        default='active',
        verbose_name=_("Statut")
    )

    # Traçabilité
    created_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.PROTECT,
        related_name='created_coupons',
        verbose_name=_("Créé par")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Facture sur laquelle il a été utilisé (peut être NULL si usage multiple)
    applied_invoices = models.ManyToManyField(
        'invoicing.Invoice',
        blank=True,
        related_name='applied_coupons',
        verbose_name=_("Factures où appliqué")
    )

    class Meta:
        verbose_name = _("Coupon de réduction")
        verbose_name_plural = _("Coupons de réduction")
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.code} — {self.get_discount_display()}"

    def get_discount_display(self):
        if self.discount_type == 'percent':
            return f"{self.discount_value}%"
        return f"{int(self.discount_value):,} FCFA".replace(',', ' ')

    @property
    def is_valid(self):
        if self.status != 'active':
            return False
        if self.uses_count >= self.max_uses:
            return False
        if self.expires_at and timezone.now() > self.expires_at:
            return False
        return True

    def calculate_discount(self, invoice_amount):
        """Retourne le montant de remise à appliquer pour une facture donnée."""
        from decimal import Decimal
        amount = Decimal(str(invoice_amount))
        if self.discount_type == 'percent':
            disc = amount * self.discount_value / 100
            if self.max_discount_amount:
                disc = min(disc, self.max_discount_amount)
        else:
            disc = self.discount_value
        return min(disc, amount)

    def apply_to_invoice(self, invoice, user=None):
        """
        Applique le coupon à une facture : incrémente le compteur,
        met à jour le statut si épuisé, et retourne le montant de remise.
        Lève ValueError si le coupon n'est pas valide.
        """
        from decimal import Decimal
        if not self.is_valid:
            raise ValueError("Ce coupon n'est plus valide ou a déjà été utilisé.")
        if self.min_amount and invoice.subtotal < self.min_amount:
            raise ValueError(
                f"Ce coupon nécessite un montant minimum de {int(self.min_amount):,} FCFA."
                .replace(',', ' ')
            )
        discount = self.calculate_discount(invoice.subtotal)
        self.uses_count += 1
        if self.uses_count >= self.max_uses:
            self.status = 'used'
        self.save(update_fields=['uses_count', 'status', 'updated_at'])
        self.applied_invoices.add(invoice)
        return discount
