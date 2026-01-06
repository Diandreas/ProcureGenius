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
    # Champs pour l'automatisation du statut
    last_activity_date = models.DateTimeField(null=True, blank=True, verbose_name=_("Dernière activité"))
    auto_inactive_since = models.DateTimeField(null=True, blank=True, verbose_name=_("Inactif automatiquement depuis"))
    is_manually_active = models.BooleanField(default=False, verbose_name=_("Statut manuel"), help_text=_("Si True, le statut est géré manuellement et ne sera pas modifié automatiquement"))

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

    def update_activity_status(self, inactivity_days=180):
        """
        Met à jour automatiquement le statut basé sur l'activité récente.
        
        Args:
            inactivity_days: Nombre de jours sans activité pour considérer comme inactif (défaut: 180)
        
        Returns:
            bool: True si le statut a été modifié, False sinon
        """
        from django.utils import timezone
        from datetime import timedelta
        
        # Si le statut est géré manuellement, ne pas modifier
        if self.is_manually_active:
            return False
        
        # Trouver la date de la dernière activité
        # Vérifier les purchase orders
        last_po = None
        try:
            from apps.purchase_orders.models import PurchaseOrder
            last_po = PurchaseOrder.objects.filter(
                supplier=self
            ).exclude(status='cancelled').order_by('-created_at').first()
        except:
            pass
        
        # Vérifier les factures fournisseurs (si elles existent)
        last_invoice = None
        try:
            from apps.invoicing.models import Invoice
            # Les factures peuvent être liées via purchase_order
            if last_po:
                last_invoice = Invoice.objects.filter(
                    purchase_order=last_po
                ).exclude(status='cancelled').order_by('-created_at').first()
        except:
            pass
        
        # Calculer la dernière date d'activité
        last_activity = None
        if last_invoice:
            last_activity = last_invoice.created_at
        elif last_po:
            last_activity = last_po.created_at
        else:
            # Si aucune activité, utiliser la date de création
            last_activity = self.created_at
        
        # Mettre à jour last_activity_date
        self.last_activity_date = last_activity
        
        # Calculer si le fournisseur est inactif
        cutoff_date = timezone.now() - timedelta(days=inactivity_days)
        old_status = self.status
        
        if last_activity < cutoff_date:
            # Fournisseur inactif (mais ne pas changer si blocked)
            if self.status != 'blocked':
                self.status = 'inactive'
                if not self.auto_inactive_since:
                    self.auto_inactive_since = timezone.now()
        else:
            # Fournisseur actif (mais ne pas changer si blocked ou pending)
            if self.status == 'inactive' and not self.is_manually_active:
                self.status = 'active'
            self.auto_inactive_since = None
        
        # Sauvegarder seulement si le statut a changé
        if old_status != self.status:
            self.save(update_fields=['status', 'last_activity_date', 'auto_inactive_since', 'updated_at'])
            return True
        else:
            # Sauvegarder quand même pour mettre à jour last_activity_date
            self.save(update_fields=['last_activity_date', 'updated_at'])
            return False


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
