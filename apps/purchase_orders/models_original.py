from django.db import models
from djmoney import models as money_models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from django.urls import reverse
from decimal import Decimal
import uuid

User = get_user_model()


class PurchaseOrderStatus(models.TextChoices):
    DRAFT = 'draft', _('Brouillon')
    PENDING = 'pending', _('En attente d\'approbation')
    APPROVED = 'approved', _('Approuvé')
    SENT = 'sent', _('Envoyé au fournisseur')
    CONFIRMED = 'confirmed', _('Confirmé')
    PARTIALLY_RECEIVED = 'partial', _('Partiellement reçu')
    RECEIVED = 'received', _('Reçu')
    INVOICED = 'invoiced', _('Facturé')
    COMPLETED = 'completed', _('Terminé')
    CANCELLED = 'cancelled', _('Annulé')


class PurchaseOrderPriority(models.TextChoices):
    LOW = 'low', _('Faible')
    MEDIUM = 'medium', _('Moyenne')
    HIGH = 'high', _('Élevée')
    URGENT = 'urgent', _('Urgente')


class PurchaseOrder(models.Model):
    """Bon de commande principal"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.CharField(max_length=50, unique=True, verbose_name=_("Numéro"))
    
    # Relations
    supplier = models.ForeignKey(
        'suppliers.Supplier', 
        on_delete=models.CASCADE,
        verbose_name=_("Fournisseur")
    )
    created_by = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='created_pos',
        verbose_name=_("Créé par")
    )
    approved_by = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        null=True, blank=True, 
        related_name='approved_pos',
        verbose_name=_("Approuvé par")
    )
    
    # Statut et workflow
    status = models.CharField(
        max_length=20, 
        choices=PurchaseOrderStatus.choices, 
        default=PurchaseOrderStatus.DRAFT,
        verbose_name=_("Statut")
    )
    priority = models.CharField(
        max_length=10, 
        choices=PurchaseOrderPriority.choices, 
        default=PurchaseOrderPriority.MEDIUM,
        verbose_name=_("Priorité")
    )
    
    # Montants
    subtotal = money_models.MoneyField(
        max_digits=14, decimal_places=2, 
        default_currency='CAD',
        verbose_name=_("Sous-total")
    )
    tax_gst_hst = money_models.MoneyField(
        max_digits=14, decimal_places=2, 
        default_currency='CAD', default=0,
        verbose_name=_("TPS/TVH")
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
    order_date = models.DateField(verbose_name=_("Date de commande"))
    expected_delivery = models.DateField(
        null=True, blank=True,
        verbose_name=_("Livraison prévue")
    )
    delivery_date = models.DateField(
        null=True, blank=True,
        verbose_name=_("Date de livraison")
    )
    
    # Adresses
    shipping_address = models.TextField(verbose_name=_("Adresse de livraison"))
    billing_address = models.TextField(verbose_name=_("Adresse de facturation"))
    
    # Termes et conditions
    payment_terms = models.CharField(
        max_length=50, default='NET 30',
        verbose_name=_("Conditions de paiement")
    )
    notes = models.TextField(blank=True, verbose_name=_("Notes"))
    terms_conditions = models.TextField(
        blank=True,
        verbose_name=_("Termes et conditions")
    )
    
    # IA et automatisation
    created_by_ai = models.BooleanField(
        default=False,
        verbose_name=_("Créé par IA")
    )
    ai_confidence_score = models.FloatField(
        null=True, blank=True,
        verbose_name=_("Score de confiance IA")
    )
    ai_analysis = models.JSONField(
        default=dict,
        verbose_name=_("Analyse IA")
    )
    
    # Référence externe
    external_reference = models.CharField(
        max_length=100, blank=True,
        verbose_name=_("Référence externe")
    )
    
    # Audit trail
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Modifié le"))
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = _("Bon de commande")
        verbose_name_plural = _("Bons de commande")
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['supplier', 'status']),
            models.Index(fields=['number']),
        ]

    def __str__(self):
        return f"{self.number} - {self.supplier.name}"

    def get_absolute_url(self):
        return reverse('purchase_orders:detail', args=[str(self.id)])

    def get_status_display_class(self):
        """Retourne la classe CSS pour le statut"""
        status_classes = {
            'draft': 'secondary',
            'pending': 'warning',
            'approved': 'info',
            'sent': 'primary',
            'confirmed': 'success',
            'partial': 'warning',
            'received': 'success',
            'invoiced': 'info',
            'completed': 'success',
            'cancelled': 'danger',
        }
        return status_classes.get(self.status, 'secondary')

    def get_priority_display_class(self):
        """Retourne la classe CSS pour la priorité"""
        priority_classes = {
            'low': 'secondary',
            'medium': 'primary',
            'high': 'warning',
            'urgent': 'danger',
        }
        return priority_classes.get(self.priority, 'primary')

    def can_be_edited(self):
        """Vérifie si le BC peut être modifié"""
        return self.status in ['draft', 'pending']

    def can_be_approved(self):
        """Vérifie si le BC peut être approuvé"""
        return self.status == 'pending'

    def can_be_cancelled(self):
        """Vérifie si le BC peut être annulé"""
        return self.status in ['draft', 'pending', 'approved', 'sent']

    def get_completion_percentage(self):
        """Calcule le pourcentage de réception"""
        total_quantity = sum(item.quantity for item in self.items.all())
        received_quantity = sum(item.quantity_received for item in self.items.all())
        
        if total_quantity == 0:
            return 0
        
        return (received_quantity / total_quantity) * 100

    def calculate_totals(self):
        """Recalcule les totaux du bon de commande"""
        subtotal = sum(item.total_price for item in self.items.all())
        
        # Calcul des taxes selon la province du fournisseur
        province = self.supplier.province
        gst_hst_rate = self._get_gst_hst_rate(province)
        qst_rate = self._get_qst_rate(province)
        
        self.subtotal = subtotal
        self.tax_gst_hst = subtotal * Decimal(str(gst_hst_rate))
        self.tax_qst = subtotal * Decimal(str(qst_rate))
        self.total_amount = self.subtotal + self.tax_gst_hst + self.tax_qst

    def _get_gst_hst_rate(self, province):
        """Obtient le taux de TPS/TVH selon la province"""
        rates = {
            'AB': 0.05, 'BC': 0.05, 'MB': 0.05, 'NB': 0.15, 'NL': 0.15,
            'NS': 0.15, 'ON': 0.13, 'PE': 0.15, 'QC': 0.05, 'SK': 0.05,
            'NT': 0.05, 'NU': 0.05, 'YT': 0.05
        }
        return rates.get(province, 0.05)

    def _get_qst_rate(self, province):
        """Obtient le taux de TVQ (Québec seulement)"""
        return 0.09975 if province == 'QC' else 0.0


class PurchaseOrderItem(models.Model):
    """Ligne de bon de commande"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(
        PurchaseOrder, 
        on_delete=models.CASCADE, 
        related_name='items',
        verbose_name=_("Bon de commande")
    )
    
    # Produit/Service
    product = models.ForeignKey(
        'suppliers.Product',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name=_("Produit")
    )
    sku = models.CharField(max_length=100, blank=True, verbose_name=_("SKU"))
    description = models.CharField(max_length=255, verbose_name=_("Description"))
    category = models.ForeignKey(
        'suppliers.ProductCategory', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        verbose_name=_("Catégorie")
    )
    
    # Quantités et prix
    quantity = models.DecimalField(
        max_digits=10, decimal_places=2,
        verbose_name=_("Quantité")
    )
    unit = models.CharField(
        max_length=20, default='unité',
        verbose_name=_("Unité")
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
    
    # Livraison
    quantity_received = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        verbose_name=_("Quantité reçue")
    )
    expected_date = models.DateField(
        null=True, blank=True,
        verbose_name=_("Date prévue")
    )
    
    # IA
    suggested_by_ai = models.BooleanField(
        default=False,
        verbose_name=_("Suggéré par IA")
    )
    ai_match_score = models.FloatField(
        null=True, blank=True,
        verbose_name=_("Score de correspondance IA")
    )
    
    # Notes spécifiques à la ligne
    notes = models.TextField(blank=True, verbose_name=_("Notes"))

    class Meta:
        ordering = ['id']
        verbose_name = _("Ligne de bon de commande")
        verbose_name_plural = _("Lignes de bon de commande")

    def __str__(self):
        return f"{self.description} - {self.quantity} {self.unit}"

    def save(self, *args, **kwargs):
        # Calculer automatiquement le prix total
        self.total_price = self.quantity * self.unit_price
        
        # Si lié à un produit, récupérer les informations
        if self.product:
            self.sku = self.product.sku
            if not self.description:
                self.description = self.product.name
            if not self.category:
                self.category = self.product.category
        
        super().save(*args, **kwargs)

    def get_remaining_quantity(self):
        """Quantité restant à recevoir"""
        return self.quantity - self.quantity_received

    def is_fully_received(self):
        """Vérifie si la ligne est complètement reçue"""
        return self.quantity_received >= self.quantity

    def get_reception_percentage(self):
        """Pourcentage de réception de cette ligne"""
        if self.quantity == 0:
            return 0
        return (self.quantity_received / self.quantity) * 100


class PurchaseOrderApproval(models.Model):
    """Workflow d'approbation"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(
        PurchaseOrder, 
        on_delete=models.CASCADE, 
        related_name='approvals',
        verbose_name=_("Bon de commande")
    )
    approver = models.ForeignKey(
        User, 
        on_delete=models.CASCADE,
        verbose_name=_("Approbateur")
    )
    
    status = models.CharField(max_length=20, choices=[
        ('pending', _('En attente')),
        ('approved', _('Approuvé')),
        ('rejected', _('Rejeté')),
        ('delegated', _('Délégué'))
    ], verbose_name=_("Statut"))
    
    approval_level = models.IntegerField(verbose_name=_("Niveau d'approbation"))
    comments = models.TextField(blank=True, verbose_name=_("Commentaires"))
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Approuvé le"))
    
    # IA
    ai_recommended = models.BooleanField(
        default=False,
        verbose_name=_("Recommandé par IA")
    )
    ai_risk_score = models.FloatField(
        null=True, blank=True,
        verbose_name=_("Score de risque IA")
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))

    class Meta:
        ordering = ['approval_level', '-created_at']
        verbose_name = _("Approbation")
        verbose_name_plural = _("Approbations")
        unique_together = ['purchase_order', 'approver', 'approval_level']

    def __str__(self):
        return f"{self.purchase_order.number} - {self.approver.get_full_name()} - {self.get_status_display()}"


class PurchaseOrderHistory(models.Model):
    """Historique des modifications"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(
        PurchaseOrder, 
        on_delete=models.CASCADE, 
        related_name='history',
        verbose_name=_("Bon de commande")
    )
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE,
        verbose_name=_("Utilisateur")
    )
    
    action = models.CharField(
        max_length=50,
        verbose_name=_("Action")
    )  # 'created', 'approved', 'modified', etc.
    old_values = models.JSONField(default=dict, verbose_name=_("Anciennes valeurs"))
    new_values = models.JSONField(default=dict, verbose_name=_("Nouvelles valeurs"))
    notes = models.TextField(blank=True, verbose_name=_("Notes"))
    
    performed_by_ai = models.BooleanField(
        default=False,
        verbose_name=_("Effectué par IA")
    )
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name=_("Horodatage"))

    class Meta:
        ordering = ['-timestamp']
        verbose_name = _("Historique")
        verbose_name_plural = _("Historiques")

    def __str__(self):
        return f"{self.purchase_order.number} - {self.action} - {self.timestamp}"


class PurchaseOrderTemplate(models.Model):
    """Templates de bons de commande pour faciliter la création"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(max_length=100, verbose_name=_("Nom"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    supplier = models.ForeignKey(
        'suppliers.Supplier',
        on_delete=models.CASCADE,
        verbose_name=_("Fournisseur")
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
        verbose_name = _("Template de bon de commande")
        verbose_name_plural = _("Templates de bons de commande")

    def __str__(self):
        return f"{self.name} - {self.supplier.name}"


class PurchaseOrderAttachment(models.Model):
    """Pièces jointes aux bons de commande"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name='attachments',
        verbose_name=_("Bon de commande")
    )
    
    name = models.CharField(max_length=200, verbose_name=_("Nom"))
    file = models.FileField(
        upload_to='purchase_orders/attachments/',
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
        return f"{self.name} - {self.purchase_order.number}"


class PurchaseOrderReceipt(models.Model):
    """Réceptions de marchandises"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name='receipts',
        verbose_name=_("Bon de commande")
    )
    
    receipt_number = models.CharField(
        max_length=50, unique=True,
        verbose_name=_("Numéro de réception")
    )
    receipt_date = models.DateField(verbose_name=_("Date de réception"))
    
    notes = models.TextField(blank=True, verbose_name=_("Notes"))
    
    # Informations de livraison
    delivery_note = models.CharField(
        max_length=100, blank=True,
        verbose_name=_("Bon de livraison")
    )
    carrier = models.CharField(
        max_length=100, blank=True,
        verbose_name=_("Transporteur")
    )
    tracking_number = models.CharField(
        max_length=100, blank=True,
        verbose_name=_("Numéro de suivi")
    )
    
    received_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name=_("Reçu par")
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))

    class Meta:
        ordering = ['-receipt_date']
        verbose_name = _("Réception")
        verbose_name_plural = _("Réceptions")

    def __str__(self):
        return f"{self.receipt_number} - {self.purchase_order.number}"


class PurchaseOrderReceiptItem(models.Model):
    """Détail des réceptions par ligne"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    receipt = models.ForeignKey(
        PurchaseOrderReceipt,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name=_("Réception")
    )
    purchase_order_item = models.ForeignKey(
        PurchaseOrderItem,
        on_delete=models.CASCADE,
        verbose_name=_("Ligne de commande")
    )
    
    quantity_received = models.DecimalField(
        max_digits=10, decimal_places=2,
        verbose_name=_("Quantité reçue")
    )
    
    # Contrôle qualité
    quality_ok = models.BooleanField(default=True, verbose_name=_("Qualité OK"))
    quality_notes = models.TextField(blank=True, verbose_name=_("Notes qualité"))
    
    # Écarts
    quantity_variance = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        verbose_name=_("Écart quantité")
    )
    variance_reason = models.TextField(blank=True, verbose_name=_("Raison de l'écart"))

    class Meta:
        verbose_name = _("Ligne de réception")
        verbose_name_plural = _("Lignes de réception")

    def __str__(self):
        return f"{self.receipt.receipt_number} - {self.purchase_order_item.description}"

    def save(self, *args, **kwargs):
        # Calculer l'écart
        expected_qty = self.purchase_order_item.quantity - self.purchase_order_item.quantity_received
        self.quantity_variance = self.quantity_received - expected_qty
        
        super().save(*args, **kwargs)
        
        # Mettre à jour la quantité reçue sur la ligne de commande
        self.purchase_order_item.quantity_received += self.quantity_received
        self.purchase_order_item.save()
        
        # Mettre à jour le statut du bon de commande si nécessaire
        po = self.purchase_order_item.purchase_order
        completion = po.get_completion_percentage()
        
        if completion >= 100:
            po.status = 'received'
        elif completion > 0:
            po.status = 'partial'
        
        po.save()