from django.db import models
from djmoney import models as money_models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
import uuid

User = get_user_model()


class SupplierStatus(models.TextChoices):
    ACTIVE = 'active', _('Actif')
    INACTIVE = 'inactive', _('Inactif')
    PENDING = 'pending', _('En attente de validation')
    BLOCKED = 'blocked', _('Bloqué')


class Supplier(models.Model):
    """Fournisseur"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Informations de base
    name = models.CharField(max_length=200, verbose_name=_("Nom"))
    legal_name = models.CharField(max_length=200, blank=True, verbose_name=_("Nom légal"))
    business_number = models.CharField(max_length=15, blank=True, verbose_name=_("Numéro d'entreprise"))
    
    # Contact
    contact_person = models.CharField(max_length=100, verbose_name=_("Personne de contact"))
    email = models.EmailField(verbose_name=_("Email"))
    phone = models.CharField(max_length=20, verbose_name=_("Téléphone"))
    website = models.URLField(blank=True, verbose_name=_("Site web"))
    
    # Adresse
    address = models.TextField(verbose_name=_("Adresse"))
    city = models.CharField(max_length=100, verbose_name=_("Ville"))
    province = models.CharField(max_length=2, choices=[
        ('AB', 'Alberta'), ('BC', 'Colombie-Britannique'), ('MB', 'Manitoba'),
        ('NB', 'Nouveau-Brunswick'), ('NL', 'Terre-Neuve-et-Labrador'),
        ('NS', 'Nouvelle-Écosse'), ('ON', 'Ontario'), ('PE', 'Île-du-Prince-Édouard'),
        ('QC', 'Québec'), ('SK', 'Saskatchewan'), ('NT', 'Territoires du Nord-Ouest'),
        ('NU', 'Nunavut'), ('YT', 'Yukon')
    ], verbose_name=_("Province"))
    postal_code = models.CharField(max_length=7, verbose_name=_("Code postal"))
    country = models.CharField(max_length=2, default='CA', verbose_name=_("Pays"))
    
    # Statut et évaluation
    status = models.CharField(
        max_length=20, 
        choices=SupplierStatus.choices, 
        default=SupplierStatus.PENDING,
        verbose_name=_("Statut")
    )
    rating = models.DecimalField(
        max_digits=3, decimal_places=2, default=0,
        verbose_name=_("Note")
    )  # 0.00 à 5.00
    
    # Termes commerciaux
    payment_terms = models.CharField(
        max_length=50, default='NET 30',
        verbose_name=_("Conditions de paiement")
    )
    currency = models.CharField(
        max_length=3, default='CAD',
        verbose_name=_("Devise")
    )
    
    # Catégories
    categories = models.ManyToManyField('ProductCategory', blank=True, verbose_name=_("Catégories"))
    
    # IA et scoring
    ai_risk_score = models.FloatField(default=0.0, verbose_name=_("Score de risque IA"))  # 0-100
    ai_performance_score = models.FloatField(default=0.0, verbose_name=_("Score de performance IA"))  # 0-100
    ai_analysis = models.JSONField(default=dict, verbose_name=_("Analyse IA"))
    
    # Certification et diversité
    is_local = models.BooleanField(default=False, verbose_name=_("Fournisseur local"))
    is_minority_owned = models.BooleanField(default=False, verbose_name=_("Entreprise de minorité"))
    is_indigenous = models.BooleanField(default=False, verbose_name=_("Entreprise autochtone"))
    is_woman_owned = models.BooleanField(default=False, verbose_name=_("Entreprise dirigée par une femme"))
    certifications = models.JSONField(default=list, verbose_name=_("Certifications"))  # ISO, CSA, etc.
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Modifié le"))
    last_order_date = models.DateField(null=True, blank=True, verbose_name=_("Dernière commande"))
    
    class Meta:
        ordering = ['name']
        verbose_name = _("Fournisseur")
        verbose_name_plural = _("Fournisseurs")

    def __str__(self):
        return self.name

    def get_full_address(self):
        """Retourne l'adresse complète formatée"""
        return f"{self.address}, {self.city}, {self.get_province_display()} {self.postal_code}"

    def get_performance_badge(self):
        """Retourne le badge de performance basé sur le score"""
        if self.ai_performance_score >= 90:
            return {'class': 'success', 'text': _('Excellent')}
        elif self.ai_performance_score >= 75:
            return {'class': 'primary', 'text': _('Très bon')}
        elif self.ai_performance_score >= 60:
            return {'class': 'warning', 'text': _('Bon')}
        elif self.ai_performance_score >= 40:
            return {'class': 'secondary', 'text': _('Moyen')}
        else:
            return {'class': 'danger', 'text': _('Faible')}


class ProductCategory(models.Model):
    """Catégories de produits/services"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, verbose_name=_("Nom"))
    parent = models.ForeignKey(
        'self', on_delete=models.CASCADE, 
        null=True, blank=True,
        verbose_name=_("Catégorie parent")
    )
    code = models.CharField(max_length=20, unique=True, verbose_name=_("Code"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    icon = models.CharField(max_length=50, default='bi-box', verbose_name=_("Icône"))
    
    class Meta:
        ordering = ['name']
        verbose_name = _("Catégorie de produit")
        verbose_name_plural = _("Catégories de produits")

    def __str__(self):
        if self.parent:
            return f"{self.parent.name} > {self.name}"
        return self.name

    def get_subcategories(self):
        """Retourne les sous-catégories"""
        return ProductCategory.objects.filter(parent=self)


class Product(models.Model):
    """Produit dans catalogue fournisseur"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supplier = models.ForeignKey(
        Supplier, on_delete=models.CASCADE, 
        related_name='products',
        verbose_name=_("Fournisseur")
    )
    category = models.ForeignKey(
        ProductCategory, on_delete=models.SET_NULL, 
        null=True, verbose_name=_("Catégorie")
    )
    
    # Informations produit
    sku = models.CharField(max_length=100, verbose_name=_("SKU"))
    name = models.CharField(max_length=200, verbose_name=_("Nom"))
    description = models.TextField(verbose_name=_("Description"))
    specifications = models.JSONField(default=dict, verbose_name=_("Spécifications"))
    
    # Prix
    unit_price = money_models.MoneyField(
        max_digits=12, decimal_places=2, 
        default_currency='CAD',
        verbose_name=_("Prix unitaire")
    )
    bulk_price = money_models.MoneyField(
        max_digits=12, decimal_places=2, 
        default_currency='CAD', 
        null=True, blank=True,
        verbose_name=_("Prix en gros")
    )
    bulk_quantity = models.IntegerField(
        null=True, blank=True,
        verbose_name=_("Quantité minimum pour prix en gros")
    )
    
    # Disponibilité
    is_available = models.BooleanField(default=True, verbose_name=_("Disponible"))
    stock_quantity = models.IntegerField(
        null=True, blank=True,
        verbose_name=_("Quantité en stock")
    )
    lead_time_days = models.IntegerField(
        default=7,
        verbose_name=_("Délai de livraison (jours)")
    )
    minimum_order_quantity = models.IntegerField(
        default=1,
        verbose_name=_("Quantité minimum de commande")
    )
    
    # Images
    image = models.ImageField(
        upload_to='products/', 
        null=True, blank=True,
        verbose_name=_("Image")
    )
    
    # IA
    ai_demand_forecast = models.JSONField(
        default=dict,
        verbose_name=_("Prévision de demande IA")
    )
    ai_price_trend = models.JSONField(
        default=dict,
        verbose_name=_("Tendance prix IA")
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Modifié le"))
    
    class Meta:
        unique_together = ['supplier', 'sku']
        ordering = ['name']
        verbose_name = _("Produit")
        verbose_name_plural = _("Produits")

    def __str__(self):
        return f"{self.name} ({self.supplier.name})"

    def get_effective_price(self, quantity=1):
        """Retourne le prix effectif selon la quantité"""
        if (self.bulk_price and self.bulk_quantity and 
            quantity >= self.bulk_quantity):
            return self.bulk_price
        return self.unit_price


class Client(models.Model):
    """Client (pour facturation sortante)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Informations de base
    name = models.CharField(max_length=200, verbose_name=_("Nom"))
    legal_name = models.CharField(max_length=200, blank=True, verbose_name=_("Nom légal"))
    business_number = models.CharField(max_length=15, blank=True, verbose_name=_("Numéro d'entreprise"))
    
    # Contact
    contact_person = models.CharField(max_length=100, verbose_name=_("Personne de contact"))
    email = models.EmailField(verbose_name=_("Email"))
    phone = models.CharField(max_length=20, verbose_name=_("Téléphone"))
    
    # Adresse
    billing_address = models.TextField(verbose_name=_("Adresse de facturation"))
    
    # Termes commerciaux
    payment_terms = models.CharField(
        max_length=50, default='NET 30',
        verbose_name=_("Conditions de paiement")
    )
    credit_limit = money_models.MoneyField(
        max_digits=14, decimal_places=2, 
        default_currency='CAD', 
        null=True, blank=True,
        verbose_name=_("Limite de crédit")
    )
    
    # IA
    ai_payment_risk_score = models.FloatField(
        default=0.0,
        verbose_name=_("Score de risque de paiement IA")
    )
    ai_payment_pattern = models.JSONField(
        default=dict,
        verbose_name=_("Modèle de paiement IA")
    )
    
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))

    class Meta:
        ordering = ['name']
        verbose_name = _("Client")
        verbose_name_plural = _("Clients")

    def __str__(self):
        return self.name

    def get_payment_risk_badge(self):
        """Retourne le badge de risque de paiement"""
        if self.ai_payment_risk_score <= 20:
            return {'class': 'success', 'text': _('Faible risque')}
        elif self.ai_payment_risk_score <= 50:
            return {'class': 'warning', 'text': _('Risque modéré')}
        else:
            return {'class': 'danger', 'text': _('Risque élevé')}


class SupplierPerformance(models.Model):
    """Évaluation performance fournisseur"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supplier = models.ForeignKey(
        Supplier, on_delete=models.CASCADE, 
        related_name='performance_records',
        verbose_name=_("Fournisseur")
    )
    
    # Métriques
    period_start = models.DateField(verbose_name=_("Début de période"))
    period_end = models.DateField(verbose_name=_("Fin de période"))
    
    delivery_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        verbose_name=_("Score de livraison")
    )  # % livraisons à temps
    quality_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        verbose_name=_("Score de qualité")
    )   # % sans défaut
    price_competitiveness = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        verbose_name=_("Compétitivité prix")
    )
    responsiveness_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        verbose_name=_("Score de réactivité")
    )
    
    # Données brutes
    total_orders = models.IntegerField(default=0, verbose_name=_("Total commandes"))
    on_time_deliveries = models.IntegerField(default=0, verbose_name=_("Livraisons à temps"))
    quality_issues = models.IntegerField(default=0, verbose_name=_("Problèmes qualité"))
    
    # IA calculated
    overall_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        verbose_name=_("Score global")
    )
    calculated_by_ai = models.BooleanField(default=False, verbose_name=_("Calculé par IA"))
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))

    class Meta:
        ordering = ['-period_end']
        verbose_name = _("Performance fournisseur")
        verbose_name_plural = _("Performances fournisseurs")

    def __str__(self):
        return f"{self.supplier.name} - {self.period_start} à {self.period_end}"


class SupplierDocument(models.Model):
    """Documents associés aux fournisseurs"""
    
    DOCUMENT_TYPES = [
        ('contract', _('Contrat')),
        ('certificate', _('Certificat')),
        ('insurance', _('Assurance')),
        ('catalog', _('Catalogue')),
        ('price_list', _('Liste de prix')),
        ('other', _('Autre')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supplier = models.ForeignKey(
        Supplier, on_delete=models.CASCADE,
        related_name='documents',
        verbose_name=_("Fournisseur")
    )
    
    name = models.CharField(max_length=200, verbose_name=_("Nom"))
    document_type = models.CharField(
        max_length=20, choices=DOCUMENT_TYPES,
        verbose_name=_("Type de document")
    )
    file = models.FileField(upload_to='supplier_documents/', verbose_name=_("Fichier"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    
    # Dates
    upload_date = models.DateTimeField(auto_now_add=True, verbose_name=_("Date d'upload"))
    expiry_date = models.DateField(
        null=True, blank=True,
        verbose_name=_("Date d'expiration")
    )
    
    uploaded_by = models.ForeignKey(
        User, on_delete=models.CASCADE,
        verbose_name=_("Uploadé par")
    )

    class Meta:
        ordering = ['-upload_date']
        verbose_name = _("Document fournisseur")
        verbose_name_plural = _("Documents fournisseurs")

    def __str__(self):
        return f"{self.name} ({self.supplier.name})"

    def is_expired(self):
        """Vérifie si le document est expiré"""
        if self.expiry_date:
            from django.utils import timezone
            return self.expiry_date < timezone.now().date()
        return False


class SupplierContact(models.Model):
    """Contacts multiples pour un fournisseur"""
    
    CONTACT_TYPES = [
        ('sales', _('Commercial')),
        ('support', _('Support')),
        ('billing', _('Facturation')),
        ('technical', _('Technique')),
        ('management', _('Direction')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supplier = models.ForeignKey(
        Supplier, on_delete=models.CASCADE,
        related_name='contacts',
        verbose_name=_("Fournisseur")
    )
    
    name = models.CharField(max_length=100, verbose_name=_("Nom"))
    title = models.CharField(max_length=100, blank=True, verbose_name=_("Titre"))
    contact_type = models.CharField(
        max_length=20, choices=CONTACT_TYPES,
        verbose_name=_("Type de contact")
    )
    
    email = models.EmailField(verbose_name=_("Email"))
    phone = models.CharField(max_length=20, blank=True, verbose_name=_("Téléphone"))
    mobile = models.CharField(max_length=20, blank=True, verbose_name=_("Mobile"))
    
    is_primary = models.BooleanField(default=False, verbose_name=_("Contact principal"))
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    
    notes = models.TextField(blank=True, verbose_name=_("Notes"))
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))

    class Meta:
        ordering = ['-is_primary', 'name']
        verbose_name = _("Contact fournisseur")
        verbose_name_plural = _("Contacts fournisseurs")

    def __str__(self):
        return f"{self.name} ({self.supplier.name})"