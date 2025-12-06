from django.db import models
from django.utils.translation import gettext_lazy as _
import uuid


class SupplierCategory(models.Model):
    """Catégorie de fournisseur"""
    name = models.CharField(max_length=100, unique=True, verbose_name=_("Nom"))
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True, verbose_name=_("Description"))
    
    class Meta:
        verbose_name = _("Catégorie de fournisseur")
        verbose_name_plural = _("Catégories de fournisseurs")
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Supplier(models.Model):
    """Fournisseur"""
    # Statuts
    STATUS_CHOICES = [
        ('active', _('Actif')),
        ('pending', _('En attente')),
        ('inactive', _('Inactif')),
        ('blocked', _('Bloqué')),
    ]
    
    # Provinces canadiennes
    PROVINCE_CHOICES = [
        ('QC', 'Québec'),
        ('ON', 'Ontario'),
        ('BC', 'Colombie-Britannique'),
        ('AB', 'Alberta'),
        ('MB', 'Manitoba'),
        ('SK', 'Saskatchewan'),
        ('NS', 'Nouvelle-Écosse'),
        ('NB', 'Nouveau-Brunswick'),
        ('NL', 'Terre-Neuve-et-Labrador'),
        ('PE', 'Île-du-Prince-Édouard'),
        ('NT', 'Territoires du Nord-Ouest'),
        ('YT', 'Yukon'),
        ('NU', 'Nunavut'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='suppliers',
        null=True,
        blank=True,
        verbose_name=_("Organisation")
    )
    name = models.CharField(max_length=200, verbose_name=_("Nom du fournisseur"))
    contact_person = models.CharField(max_length=100, blank=True, verbose_name=_("Personne contact"))
    email = models.EmailField(verbose_name=_("Email"))
    phone = models.CharField(max_length=20, blank=True, verbose_name=_("Téléphone"))
    address = models.TextField(blank=True, verbose_name=_("Adresse"))
    city = models.CharField(max_length=100, blank=True, verbose_name=_("Ville"))
    province = models.CharField(max_length=2, choices=PROVINCE_CHOICES, blank=True, verbose_name=_("Province"))
    
    # Statut et évaluation
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name=_("Statut"))
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=0, verbose_name=_("Note"))
    
    # Diversité
    is_local = models.BooleanField(default=False, verbose_name=_("Fournisseur local"))
    is_minority_owned = models.BooleanField(default=False, verbose_name=_("Propriété minoritaire"))
    is_woman_owned = models.BooleanField(default=False, verbose_name=_("Propriété féminine"))
    is_indigenous = models.BooleanField(default=False, verbose_name=_("Entreprise autochtone"))
    
    # Relations
    categories = models.ManyToManyField(SupplierCategory, blank=True, verbose_name=_("Catégories"))
    
    # Dates
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))

    class Meta:
        verbose_name = _("Fournisseur")
        verbose_name_plural = _("Fournisseurs")
        ordering = ['name']

    def __str__(self):
        return self.name
    
    def get_performance_badge(self):
        """Retourne le badge de performance basé sur la note"""
        if self.rating >= 4.5:
            return {'text': 'Excellent', 'class': 'success'}
        elif self.rating >= 3.5:
            return {'text': 'Très bon', 'class': 'info'}
        elif self.rating >= 2.5:
            return {'text': 'Bon', 'class': 'warning'}
        else:
            return {'text': 'À améliorer', 'class': 'danger'}


class SupplierProduct(models.Model):
    """Relation Many-to-Many entre Fournisseur et Produit avec informations additionnelles"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Relations
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.CASCADE,
        related_name='supplier_products',
        verbose_name=_("Fournisseur")
    )
    product = models.ForeignKey(
        'invoicing.Product',
        on_delete=models.CASCADE,
        related_name='supplier_products',
        verbose_name=_("Produit")
    )

    # Informations spécifiques au fournisseur
    supplier_reference = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Référence chez le fournisseur"),
        help_text=_("Référence ou SKU utilisé par le fournisseur pour ce produit")
    )
    supplier_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Prix chez ce fournisseur"),
        help_text=_("Prix d'achat chez ce fournisseur (peut différer du cost_price du produit)")
    )
    lead_time_days = models.PositiveIntegerField(
        default=7,
        verbose_name=_("Délai de livraison (jours)"),
        help_text=_("Délai moyen de livraison pour ce produit par ce fournisseur")
    )

    # Statut et préférences
    is_preferred = models.BooleanField(
        default=False,
        verbose_name=_("Fournisseur préféré"),
        help_text=_("Marquer ce fournisseur comme préféré pour ce produit")
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name=_("Association active")
    )

    # Historique et notes
    notes = models.TextField(
        blank=True,
        verbose_name=_("Notes"),
        help_text=_("Notes sur cette relation fournisseur-produit")
    )
    last_purchase_date = models.DateField(
        null=True,
        blank=True,
        verbose_name=_("Dernière date d'achat")
    )
    last_purchase_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Dernier prix d'achat")
    )

    # Dates
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Produit Fournisseur")
        verbose_name_plural = _("Produits Fournisseurs")
        unique_together = [['supplier', 'product']]
        ordering = ['-is_preferred', 'supplier__name']
        indexes = [
            models.Index(fields=['supplier', 'product']),
            models.Index(fields=['supplier', 'is_preferred']),
            models.Index(fields=['product', 'is_preferred']),
        ]

    def __str__(self):
        return f"{self.supplier.name} - {self.product.name}"

    def save(self, *args, **kwargs):
        # Si supplier_price n'est pas défini, utiliser le cost_price du produit
        if self.supplier_price is None and self.product:
            self.supplier_price = self.product.cost_price
        super().save(*args, **kwargs)
