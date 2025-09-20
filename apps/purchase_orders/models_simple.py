from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


class PurchaseOrder(models.Model):
    """Bon de commande"""
    STATUS_CHOICES = [
        ('draft', _('Brouillon')),
        ('pending', _('En attente')),
        ('approved', _('Approuvé')),
        ('sent', _('Envoyé')),
        ('received', _('Reçu')),
        ('invoiced', _('Facturé')),
        ('cancelled', _('Annulé')),
    ]
    
    PRIORITY_CHOICES = [
        ('low', _('Faible')),
        ('normal', _('Normal')),
        ('high', _('Élevé')),
        ('urgent', _('Urgent')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    po_number = models.CharField(max_length=50, unique=True, verbose_name=_("Numéro de BC"))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name=_("Statut"))
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal', verbose_name=_("Priorité"))
    
    # Informations générales
    title = models.CharField(max_length=200, verbose_name=_("Titre"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    notes = models.TextField(blank=True, verbose_name=_("Notes internes"))
    
    # Dates
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Date de création"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Date de modification"))
    required_date = models.DateField(verbose_name=_("Date requise"))
    
    # Montants (simplifiés sans django-money)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, verbose_name=_("Sous-total"))
    tax_gst_hst = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name=_("TPS/TVH"))
    tax_qst = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name=_("TVQ"))
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, verbose_name=_("Montant total"))
    
    # Relations
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_pos', verbose_name=_("Créé par"))
    approved_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='approved_pos', null=True, blank=True, verbose_name=_("Approuvé par"))
    
    class Meta:
        verbose_name = _("Bon de commande")
        verbose_name_plural = _("Bons de commande")
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.po_number} - {self.title}"

    def save(self, *args, **kwargs):
        if not self.po_number:
            self.po_number = self.generate_po_number()
        super().save(*args, **kwargs)

    def generate_po_number(self):
        """Génère un numéro de BC unique"""
        from datetime import datetime
        year = datetime.now().year
        month = datetime.now().month
        
        # Trouve le prochain numéro disponible
        last_po = PurchaseOrder.objects.filter(
            po_number__startswith=f"BC{year}{month:02d}"
        ).order_by('-po_number').first()
        
        if last_po:
            try:
                last_number = int(last_po.po_number[-4:])
                next_number = last_number + 1
            except ValueError:
                next_number = 1
        else:
            next_number = 1
            
        return f"BC{year}{month:02d}{next_number:04d}"


class PurchaseOrderItem(models.Model):
    """Article d'un bon de commande"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items', verbose_name=_("Bon de commande"))
    
    # Informations produit
    product_code = models.CharField(max_length=100, verbose_name=_("Code produit"))
    description = models.CharField(max_length=500, verbose_name=_("Description"))
    quantity = models.PositiveIntegerField(verbose_name=_("Quantité"))
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name=_("Prix unitaire"))
    total_price = models.DecimalField(max_digits=14, decimal_places=2, verbose_name=_("Prix total"))
    
    # Dates
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Article de BC")
        verbose_name_plural = _("Articles de BC")

    def __str__(self):
        return f"{self.product_code} - {self.description}"

    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)
