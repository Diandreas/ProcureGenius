from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
import uuid
import qrcode
from io import BytesIO
import base64

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
    
    # Relations et informations supplémentaires
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_pos', verbose_name=_("Créé par"))
    approved_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='approved_pos', null=True, blank=True, verbose_name=_("Approuvé par"))
    supplier = models.ForeignKey('suppliers.Supplier', on_delete=models.PROTECT, null=True, blank=True, verbose_name=_("Fournisseur"))

    # Informations de livraison
    delivery_address = models.TextField(blank=True, verbose_name=_("Adresse de livraison"))
    expected_delivery_date = models.DateField(null=True, blank=True, verbose_name=_("Date de livraison prévue"))
    special_conditions = models.TextField(blank=True, verbose_name=_("Conditions spéciales"))
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name=_("Frais de livraison"))
    
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
    
    def recalculate_totals(self):
        """Recalcule les totaux basés sur les items"""
        items = self.items.all()
        self.subtotal = sum(item.total_price for item in items)
        self.total_amount = self.subtotal + self.tax_gst_hst + self.tax_qst + self.shipping_cost
        self.save(update_fields=['subtotal', 'total_amount'])

    def generate_qr_code(self):
        """Génère un QR code pour le bon de commande"""
        qr_data = f"BC-{self.po_number}-{self.total_amount}CAD-{self.supplier.name if self.supplier else 'N/A'}"
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_data)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')

        return base64.b64encode(buffer.getvalue()).decode()
    
    @property
    def is_overdue(self):
        """Vérifie si le BC est en retard par rapport à required_date"""
        from django.utils import timezone
        if self.status in ['received', 'cancelled']:
            return False
        return self.required_date < timezone.now().date()

    @property
    def days_overdue(self):
        """Nombre de jours de retard"""
        from django.utils import timezone
        if not self.is_overdue:
            return 0
        delta = timezone.now().date() - self.required_date
        return delta.days

    @property
    def items_count(self):
        """Nombre d'items dans le bon de commande"""
        return self.items.count()

    @property
    def related_invoices_count(self):
        """Nombre de factures liées à ce BC"""
        return self.invoices.count()

    def get_approval_status(self):
        """Retourne le statut d'approbation: pending, approved, not_required"""
        if self.status in ['draft']:
            return 'pending'
        elif self.approved_by is not None:
            return 'approved'
        else:
            return 'not_required'

    @property
    def qr_code_data(self):
        """Retourne les données QR code encodées en base64"""
        return self.generate_qr_code()

    @property
    def tax_amount(self):
        """Retourne le montant total des taxes"""
        return self.tax_gst_hst + self.tax_qst

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

    def receive_items(self, user=None):
        """
        Marque le bon de commande comme reçu et met à jour le stock des produits physiques

        Returns:
            dict: Résumé des mouvements de stock créés
        """
        if self.status == 'received':
            return {'error': 'Ce bon de commande a déjà été reçu'}

        from apps.invoicing.models import Product

        movements = []
        errors = []

        for item in self.items.all():
            try:
                # Utiliser FK product directement ou chercher par référence en fallback
                product = item.product
                if not product and item.product_reference:
                    product = Product.objects.filter(reference=item.product_reference).first()

                if product and product.product_type == 'physical':
                    # Ajuster le stock
                    movement = product.adjust_stock(
                        quantity=item.quantity,
                        movement_type='reception',
                        reference_type='purchase_order',
                        reference_id=self.id,
                        notes=f"Réception BC {self.po_number} - {item.description}",
                        user=user
                    )
                    if movement:
                        movements.append({
                            'product': product.name,
                            'quantity': item.quantity,
                            'new_stock': product.stock_quantity
                        })
            except Exception as e:
                errors.append({
                    'item': item.description,
                    'error': str(e)
                })

        # Mettre à jour le statut
        self.status = 'received'
        self.save(update_fields=['status'])

        return {
            'success': True,
            'movements': movements,
            'errors': errors,
            'total_updated': len(movements)
        }


class PurchaseOrderItem(models.Model):
    """Article d'un bon de commande"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items', verbose_name=_("Bon de commande"))
    product = models.ForeignKey(
        'invoicing.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='purchase_order_items',
        verbose_name=_("Produit")
    )

    # Informations produit
    product_reference = models.CharField(max_length=100, default="REF-001", verbose_name=_("Référence produit"))
    product_code = models.CharField(max_length=100, blank=True, verbose_name=_("Code produit"))
    description = models.CharField(max_length=500, verbose_name=_("Description"))
    specifications = models.TextField(blank=True, verbose_name=_("Spécifications"))
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)], verbose_name=_("Quantité"))
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], verbose_name=_("Prix unitaire"))
    total_price = models.DecimalField(max_digits=14, decimal_places=2, verbose_name=_("Prix total"))

    # Informations supplémentaires
    unit_of_measure = models.CharField(max_length=20, default="unité", verbose_name=_("Unité de mesure"))
    expected_delivery_date = models.DateField(null=True, blank=True, verbose_name=_("Date de livraison prévue"))
    notes = models.TextField(blank=True, verbose_name=_("Notes"))

    # Suivi réception
    quantity_received = models.PositiveIntegerField(default=0, verbose_name=_("Quantité reçue"))

    # Dates
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Article de BC")
        verbose_name_plural = _("Articles de BC")

    def __str__(self):
        return f"{self.product_reference} - {self.description}"

    def clean(self):
        """Validation de l'article de bon de commande"""
        super().clean()

        # Validation: Un produit doit toujours être associé
        if not self.product:
            raise ValidationError({
                'product': _("Un produit doit être associé à cet article. Sélectionnez un produit existant ou créez-en un nouveau.")
            })

    def save(self, *args, **kwargs):
        # Validation avant sauvegarde
        self.full_clean()

        # Synchroniser avec product si défini
        if self.product:
            self.product_reference = self.product.reference
            if not self.description or self.description == "":
                self.description = self.product.name
            if not self.unit_price or self.unit_price == 0:
                self.unit_price = self.product.cost_price or self.product.price

        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)
        # Recalculer les totaux du bon de commande
        self.purchase_order.recalculate_totals()

    @property
    def quantity_remaining(self):
        """Quantité restant à recevoir"""
        return self.quantity - self.quantity_received

    @property
    def is_fully_received(self):
        """Vérifie si l'item est entièrement reçu"""
        return self.quantity_received >= self.quantity

    @property
    def reception_progress(self):
        """Pourcentage de réception"""
        if self.quantity == 0:
            return 0
        return (self.quantity_received / self.quantity) * 100
