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


class ProductCategory(models.Model):
    """Catégorie de produits"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='product_categories',
        null=True,
        blank=True,
        verbose_name=_("Organisation")
    )
    name = models.CharField(max_length=100, verbose_name=_("Nom"))
    slug = models.SlugField(max_length=100, unique=True, verbose_name=_("Slug"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        verbose_name=_("Catégorie parente")
    )
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Catégorie de produit")
        verbose_name_plural = _("Catégories de produits")
        ordering = ['name']
        unique_together = [['organization', 'slug']]

    def __str__(self):
        return self.name


class Warehouse(models.Model):
    """Entrepôt pour la gestion multi-warehouse"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='warehouses',
        null=True,
        blank=True,
        verbose_name=_("Organisation")
    )
    name = models.CharField(max_length=200, verbose_name=_("Nom"))
    code = models.CharField(max_length=50, unique=True, verbose_name=_("Code"))
    address = models.TextField(blank=True, verbose_name=_("Adresse"))
    city = models.CharField(max_length=100, blank=True, verbose_name=_("Ville"))
    province = models.CharField(max_length=100, blank=True, verbose_name=_("Province"))
    postal_code = models.CharField(max_length=20, blank=True, verbose_name=_("Code postal"))
    country = models.CharField(max_length=100, default='Canada', verbose_name=_("Pays"))
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Entrepôt")
        verbose_name_plural = _("Entrepôts")
        ordering = ['name']
        unique_together = [['organization', 'code']]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Product(models.Model):
    """Produit ou service facturable"""
    PRODUCT_TYPES = [
        ('physical', 'Produit physique'),
        ('service', 'Service'),
        ('digital', 'Produit numérique'),
    ]

    SOURCE_TYPES = [
        ('purchased', 'Acheté (fournisseur)'),
        ('manufactured', 'Fabriqué (maison)'),
        ('resale', 'Revente'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='products',
        null=True,
        blank=True,
        verbose_name=_("Organisation")
    )
    name = models.CharField(max_length=200, verbose_name="Nom")
    description = models.TextField(blank=True, verbose_name="Description")
    reference = models.CharField(max_length=50, unique=True, blank=True, verbose_name="Référence")
    barcode = models.CharField(max_length=50, blank=True, null=True, unique=True, verbose_name="Code-barres")

    product_type = models.CharField(max_length=20, choices=PRODUCT_TYPES, default='physical', verbose_name="Type")
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPES, default='purchased', verbose_name="Source")
    category = models.ForeignKey(
        ProductCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        verbose_name=_("Catégorie")
    )
    supplier = models.ForeignKey('suppliers.Supplier', on_delete=models.SET_NULL, null=True, blank=True, related_name='products', verbose_name="Fournisseur")
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        verbose_name=_("Entrepôt principal")
    )

    # Prix
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Prix de vente")
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Prix d'achat")
    
    # Stock (pour produits physiques)
    stock_quantity = models.IntegerField(default=0, verbose_name="Quantité en stock")
    low_stock_threshold = models.IntegerField(default=5, verbose_name="Seuil de stock bas")
    
    # Métadonnées
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Produit"
        verbose_name_plural = "Produits"
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.reference:
            # Générer une référence automatique
            prefix = 'PRD' if self.product_type == 'physical' else 'SVC'
            last_product = Product.objects.filter(reference__startswith=prefix).order_by('-reference').first()
            if last_product and last_product.reference:
                try:
                    last_number = int(last_product.reference[3:])
                    self.reference = f"{prefix}{last_number + 1:04d}"
                except:
                    self.reference = f"{prefix}0001"
            else:
                self.reference = f"{prefix}0001"
        super().save(*args, **kwargs)
    
    @property
    def is_low_stock(self):
        """Vérifie si le stock est bas"""
        return self.product_type == 'physical' and self.stock_quantity <= self.low_stock_threshold
    
    @property
    def is_out_of_stock(self):
        """Vérifie si le produit est en rupture"""
        return self.product_type == 'physical' and self.stock_quantity == 0
    
    @property
    def stock_status(self):
        """Retourne le statut du stock"""
        if self.product_type != 'physical':
            return 'unlimited'
        elif self.is_out_of_stock:
            return 'out'
        elif self.is_low_stock:
            return 'low'
        else:
            return 'good'

    @property
    def margin(self):
        """Calcule la marge bénéficiaire"""
        if self.cost_price > 0:
            return self.price - self.cost_price
        return 0

    @property
    def margin_percent(self):
        """Calcule le pourcentage de marge"""
        if self.cost_price > 0:
            return ((self.price - self.cost_price) / self.cost_price) * 100
        return 0

    def format_price(self):
        """Formate le prix"""
        return f"{self.price:,.2f} CAD"

    def adjust_stock(self, quantity, movement_type, reference_type=None, reference_id=None, notes="", user=None):
        """
        Ajuste le stock et crée un mouvement

        Args:
            quantity: Quantité (positive pour entrée, négative pour sortie)
            movement_type: Type de mouvement (reception, sale, adjustment, return)
            reference_type: Type de référence (purchase_order, invoice, etc.)
            reference_id: ID de la référence
            notes: Notes du mouvement
            user: Utilisateur qui effectue le mouvement
        """
        if self.product_type != 'physical':
            return None

        old_quantity = self.stock_quantity
        self.stock_quantity += quantity
        self.save(update_fields=['stock_quantity'])

        # Créer le mouvement
        movement = StockMovement.objects.create(
            product=self,
            movement_type=movement_type,
            quantity=quantity,
            quantity_before=old_quantity,
            quantity_after=self.stock_quantity,
            reference_type=reference_type,
            reference_id=reference_id,
            notes=notes,
            created_by=user
        )

        # Vérifier et envoyer alertes si nécessaire
        from .stock_alerts import check_stock_after_movement
        check_stock_after_movement(self)

        return movement


class StockMovement(models.Model):
    """Historique des mouvements de stock"""
    MOVEMENT_TYPES = [
        ('reception', 'Réception (Bon de commande)'),
        ('sale', 'Vente (Facture)'),
        ('adjustment', 'Ajustement manuel'),
        ('return', 'Retour'),
        ('loss', 'Perte/Casse/Vol'),
        ('initial', 'Stock initial'),
    ]

    REFERENCE_TYPES = [
        ('purchase_order', 'Bon de commande'),
        ('invoice', 'Facture'),
        ('manual', 'Manuel'),
        ('loss_report', 'Rapport de perte'),
    ]

    LOSS_REASONS = [
        ('damaged', 'Produit endommagé'),
        ('expired', 'Produit périmé'),
        ('stolen', 'Vol'),
        ('lost', 'Perte/Égarement'),
        ('quality_issue', 'Problème de qualité'),
        ('other', 'Autre raison'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_movements', verbose_name="Produit")

    # Détails du mouvement
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES, verbose_name="Type de mouvement")
    quantity = models.IntegerField(verbose_name="Quantité")  # Positif = entrée, Négatif = sortie
    quantity_before = models.IntegerField(verbose_name="Quantité avant")
    quantity_after = models.IntegerField(verbose_name="Quantité après")

    # Référence (PO, Facture, etc.)
    reference_type = models.CharField(max_length=20, choices=REFERENCE_TYPES, blank=True, null=True, verbose_name="Type de référence")
    reference_id = models.UUIDField(blank=True, null=True, verbose_name="ID de référence")
    reference_number = models.CharField(max_length=100, blank=True, verbose_name="Numéro de référence")

    # Détails sur les pertes (si movement_type='loss')
    loss_reason = models.CharField(max_length=20, choices=LOSS_REASONS, blank=True, null=True, verbose_name="Raison de la perte")
    loss_description = models.TextField(blank=True, verbose_name="Description détaillée de la perte")
    loss_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Valeur de la perte")

    # Informations supplémentaires
    notes = models.TextField(blank=True, verbose_name="Notes")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Créé par")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date")

    class Meta:
        verbose_name = "Mouvement de stock"
        verbose_name_plural = "Mouvements de stock"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['product', '-created_at']),
            models.Index(fields=['reference_type', 'reference_id']),
        ]

    def __str__(self):
        direction = "+" if self.quantity > 0 else ""
        return f"{self.product.name} - {direction}{self.quantity} ({self.get_movement_type_display()})"

    @property
    def is_entry(self):
        """Vérifie si c'est une entrée de stock"""
        return self.quantity > 0

    @property
    def is_exit(self):
        """Vérifie si c'est une sortie de stock"""
        return self.quantity < 0

    @property
    def is_loss(self):
        """Vérifie si c'est une perte"""
        return self.movement_type == 'loss'

    @property
    def loss_reason_display(self):
        """Retourne le libellé de la raison de perte"""
        if self.loss_reason:
            return dict(self.LOSS_REASONS).get(self.loss_reason, '')
        return ''


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

    def clean(self):
        """Validation de la facture"""
        from django.core.exceptions import ValidationError
        
        # Vérifier qu'une facture envoyée a au moins un élément
        if self.status in ['sent', 'paid'] and self.pk:
            if not self.has_items():
                raise ValidationError(
                    "Une facture doit avoir au moins un élément avant d'être envoyée."
                )
        
        # Vérifier que les montants sont cohérents
        if self.total_amount < 0:
            raise ValidationError("Le montant total ne peut pas être négatif.")
        
        # Vérifier la date d'échéance
        if self.due_date and hasattr(self, 'created_at') and self.created_at:
            if self.due_date < self.created_at.date():
                raise ValidationError("La date d'échéance ne peut pas être antérieure à la date de création.")
    
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

    @classmethod
    def create_with_items(cls, created_by, title, due_date, items_data, **kwargs):
        """
        Crée une facture avec plusieurs éléments en une seule opération
        
        Args:
            created_by: Utilisateur qui crée la facture
            title: Titre de la facture
            due_date: Date d'échéance
            items_data: Liste de dictionnaires avec les données des éléments
                        [{"service_code": "SVC-001", "description": "...", "quantity": 1, "unit_price": 100.00}, ...]
            **kwargs: Autres champs de la facture
            
        Returns:
            Invoice: La facture créée avec tous ses éléments
        """
        # Créer la facture principale
        invoice = cls.objects.create(
            created_by=created_by,
            title=title,
            due_date=due_date,
            subtotal=0,  # Sera recalculé
            total_amount=0,  # Sera recalculé
            **kwargs
        )
        
        # Ajouter tous les éléments
        for item_data in items_data:
            invoice.add_item(**item_data)
        
        # Recalculer les totaux finaux
        invoice.recalculate_totals()
        
        return invoice

    def clone_with_items(self, created_by=None, **override_fields):
        """
        Clone une facture avec tous ses éléments
        
        Args:
            created_by: Nouvel utilisateur créateur (optionnel)
            **override_fields: Champs à modifier dans la nouvelle facture
            
        Returns:
            Invoice: La nouvelle facture clonée
        """
        # Préparer les données de base
        clone_data = {
            'title': f"Copie de {self.title}",
            'description': self.description,
            'due_date': self.due_date,
            'billing_address': self.billing_address,
            'payment_terms': self.payment_terms,
            'payment_method': self.payment_method,
            'currency': self.currency,
            'client': self.client,
            'purchase_order': self.purchase_order,
            'created_by': created_by or self.created_by,
        }
        
        # Appliquer les surcharges
        clone_data.update(override_fields)
        
        # Préparer les données des éléments
        items_data = []
        for item in self.items.all():
            items_data.append({
                'service_code': item.service_code,
                'product_reference': item.product_reference,
                'description': item.description,
                'detailed_description': item.detailed_description,
                'quantity': item.quantity,
                'unit_price': item.unit_price,
                'unit_of_measure': item.unit_of_measure,
                'discount_percent': item.discount_percent,
                'tax_rate': item.tax_rate,
                'notes': item.notes,
            })
        
        # Créer la facture clonée
        return self.__class__.create_with_items(
            created_by=clone_data.pop('created_by'),
            title=clone_data.pop('title'),
            due_date=clone_data.pop('due_date'),
            items_data=items_data,
            **clone_data
        )

    @property
    def qr_code_data(self):
        """Retourne les données QR code encodées en base64"""
        return self.generate_qr_code()

    def add_item(self, service_code, description, quantity, unit_price, 
                 detailed_description="", unit_of_measure="unité", 
                 discount_percent=0, tax_rate=0, notes=""):
        """Ajoute un nouvel élément à la facture"""
        return InvoiceItem.objects.create(
            invoice=self,
            service_code=service_code,
            description=description,
            detailed_description=detailed_description,
            quantity=quantity,
            unit_price=unit_price,
            unit_of_measure=unit_of_measure,
            discount_percent=discount_percent,
            tax_rate=tax_rate,
            notes=notes
        )

    def remove_item(self, item_id):
        """Supprime un élément de la facture"""
        try:
            item = self.items.get(id=item_id)
            item.delete()
            self.recalculate_totals()
            return True
        except InvoiceItem.DoesNotExist:
            return False

    def clear_items(self):
        """Supprime tous les éléments de la facture"""
        self.items.all().delete()
        self.recalculate_totals()

    def duplicate_items_from(self, other_invoice):
        """Copie tous les éléments d'une autre facture"""
        for item in other_invoice.items.all():
            self.add_item(
                service_code=item.service_code,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                detailed_description=item.detailed_description,
                unit_of_measure=item.unit_of_measure,
                discount_percent=item.discount_percent,
                tax_rate=item.tax_rate,
                notes=item.notes
            )

    def get_items_count(self):
        """Retourne le nombre d'éléments dans la facture"""
        return self.items.count()

    def get_total_quantity(self):
        """Retourne la quantité totale de tous les éléments"""
        return sum(item.quantity for item in self.items.all())

    def has_items(self):
        """Vérifie si la facture a au moins un élément"""
        return self.items.exists()

    def get_items_by_service(self, service_code):
        """Retourne tous les éléments pour un service donné"""
        return self.items.filter(service_code=service_code)

    def format_amount(self, amount):
        """Formate un montant selon la devise"""
        if self.currency == 'CAD':
            return f"{amount:,.2f} $ CAD"
        elif self.currency == 'USD':
            return f"${amount:,.2f} USD"
        elif self.currency == 'EUR':
            return f"{amount:,.2f} € EUR"
        else:
            return f"{amount:,.2f} {self.currency}"
    
    def can_be_edited(self):
        """Vérifie si la facture peut être modifiée"""
        return self.status in ['draft', 'sent']


class InvoiceItem(models.Model):
    """Article d'une facture"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items', verbose_name=_("Facture"))
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoice_items',
        verbose_name=_("Produit"),
        help_text=_("Produit facturé (si applicable)")
    )
    
    # Informations service/produit
    service_code = models.CharField(max_length=100, verbose_name=_("Code service"), default="SVC-001")
    product_reference = models.CharField(max_length=100, blank=True, default="", verbose_name=_("Référence produit"), help_text=_("Référence manuelle si produit non lié"))
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
        
        # Synchroniser product_reference si product défini
        if self.product:
            self.product_reference = self.product.reference
            if not self.description or self.description == "":
                self.description = self.product.name
        
        # Calcul avec remise
        base_total = self.quantity * self.unit_price
        discount_amount = base_total * (self.discount_percent / Decimal('100'))
        self.total_price = base_total - discount_amount

        super().save(*args, **kwargs)
        # Recalculer les totaux de la facture seulement si elle existe déjà
        if self.invoice_id:
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