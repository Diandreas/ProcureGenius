"""
Pharmacy Management Models
Handles medication dispensing, prescriptions, and inventory integration
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from decimal import Decimal
import uuid


class PharmacyDispensing(models.Model):
    """
    Record of medication dispensing transaction
    Can be linked to a prescription or standalone (OTC/walk-in)
    """
    STATUS_CHOICES = [
        ('pending', _('En attente')),
        ('dispensed', _('Dispensé')),
        ('partial', _('Partiellement dispensé')),
        ('cancelled', _('Annulé')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='pharmacy_dispensings',
        verbose_name=_("Organisation")
    )
    
    # Dispensing identification
    dispensing_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name=_("Numéro de dispensation")
    )
    
    # Patient reference (optional for OTC sales)
    patient = models.ForeignKey(
        'accounts.Client',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pharmacy_dispensings',
        verbose_name=_("Patient"),
        limit_choices_to={'client_type__in': ['patient', 'both']}
    )
    
    # Visit reference (optional)
    visit = models.ForeignKey(
        'patients.PatientVisit',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pharmacy_dispensings',
        verbose_name=_("Visite associée")
    )
    
    # Prescription reference (optional - for prescription-based dispensing)
    # Will be added when Consultations app is created
    # prescription = models.ForeignKey(...)
    
    # Dispensing details
    dispensed_at = models.DateTimeField(
        default=timezone.now,
        verbose_name=_("Date de dispensation")
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name=_("Statut")
    )
    
    # Staff
    dispensed_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dispensed_medications',
        verbose_name=_("Dispensé par")
    )
    
    # Counseling
    counseling_provided = models.BooleanField(
        default=False,
        verbose_name=_("Conseil fourni"),
        help_text=_("Le patient a reçu des conseils sur l'utilisation des médicaments")
    )
    counseling_notes = models.TextField(
        blank=True,
        verbose_name=_("Notes de conseil"),
        help_text=_("Instructions données au patient")
    )
    
    # Notes
    notes = models.TextField(
        blank=True,
        verbose_name=_("Notes")
    )
    
    # Billing
    pharmacy_invoice = models.ForeignKey(
        'invoicing.Invoice',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pharmacy_dispensings',
        verbose_name=_("Facture pharmacie")
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Dispensation")
        verbose_name_plural = _("Dispensations")
        ordering = ['-dispensed_at']
        indexes = [
            models.Index(fields=['organization', '-dispensed_at']),
            models.Index(fields=['patient']),
            models.Index(fields=['status']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.dispensing_number:
            self.dispensing_number = self._generate_dispensing_number()
        super().save(*args, **kwargs)
    
    def _generate_dispensing_number(self):
        """Generate unique dispensing number: DISP-YYYYMMDD-0001"""
        today = timezone.now().strftime('%Y%m%d')
        prefix = f"DISP-{today}"
        
        last_dispensing = PharmacyDispensing.objects.filter(
            organization=self.organization,
            dispensing_number__startswith=prefix
        ).order_by('-dispensing_number').first()
        
        if last_dispensing and last_dispensing.dispensing_number:
            try:
                last_num = int(last_dispensing.dispensing_number.split('-')[-1])
                return f"{prefix}-{last_num + 1:04d}"
            except (ValueError, IndexError):
                pass
        
        return f"{prefix}-0001"
    
    def __str__(self):
        patient_name = self.patient.name if self.patient else "Vente comptoir"
        return f"{self.dispensing_number} - {patient_name}"
    
    @property
    def total_amount(self):
        """Calculate total amount from all items"""
        return sum(item.total_price for item in self.items.all())
    
    @property
    def items_count(self):
        """Number of items in this dispensing"""
        return self.items.count()
    
    def complete_dispensing(self, dispensed_by=None):
        """Mark dispensing as complete"""
        self.status = 'dispensed'
        if dispensed_by:
            self.dispensed_by = dispensed_by
        self.save()
        
        # Update visit status if linked
        if self.visit and self.visit.status == 'at_pharmacy':
            self.visit.complete_visit()
    
    def cancel_dispensing(self, reason=None):
        """Cancel dispensing and restore stock"""
        self.status = 'cancelled'
        if reason:
            self.notes = f"{self.notes}\nAnnulation: {reason}".strip()
        
        # Restore stock for all items
        for item in self.items.all():
            item.restore_stock()
        
        self.save()


class DispensingItem(models.Model):
    """
    Individual medication in a dispensing transaction
    Automatically manages stock deduction
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dispensing = models.ForeignKey(
        PharmacyDispensing,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name=_("Dispensation")
    )
    
    # Medication (Product with category=Medications)
    medication = models.ForeignKey(
        'invoicing.Product',
        on_delete=models.PROTECT,
        related_name='dispensing_items',
        verbose_name=_("Médicament")
    )
    
    # Quantity and pricing
    quantity_dispensed = models.IntegerField(
        verbose_name=_("Quantité dispensée")
    )
    unit_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name=_("Coût unitaire"),
        help_text=_("Prix d'achat au moment de la dispensation")
    )
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name=_("Prix unitaire"),
        help_text=_("Prix de vente")
    )
    total_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Prix total"),
        editable=False
    )
    
    # Dosage instructions
    dosage_instructions = models.TextField(
        blank=True,
        verbose_name=_("Posologie"),
        help_text=_("Instructions de dosage pour le patient")
    )
    frequency = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Fréquence"),
        help_text=_("Ex: 3 fois par jour, matin et soir")
    )
    duration = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Durée"),
        help_text=_("Ex: 7 jours, 2 semaines")
    )
    route = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_("Voie d'administration"),
        help_text=_("Ex: Oral, IV, IM, Topique")
    )
    
    # Stock movement reference
    stock_movement = models.ForeignKey(
        'invoicing.StockMovement',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dispensing_items',
        verbose_name=_("Mouvement de stock")
    )
    
    # Notes
    notes = models.TextField(
        blank=True,
        verbose_name=_("Notes")
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Item de dispensation")
        verbose_name_plural = _("Items de dispensation")
        ordering = ['medication__name']
    
    def save(self, *args, **kwargs):
        # Calculate total price
        self.total_price = Decimal(str(self.quantity_dispensed)) * self.unit_price
        
        # Auto-set unit_cost and unit_price from medication if not set
        if not self.unit_cost and self.medication:
            self.unit_cost = self.medication.cost_price
        if not self.unit_price and self.medication:
            self.unit_price = self.medication.price
        
        is_new = self._state.adding
        super().save(*args, **kwargs)
        
        # Create stock movement for new items (deduct stock)
        if is_new and self.dispensing.status != 'cancelled':
            self._deduct_stock()
    
    def _deduct_stock(self):
        """Deduct stock and create movement record"""
        if self.medication and self.medication.product_type == 'physical':
            from apps.invoicing.models import StockMovement
            
            movement = self.medication.adjust_stock(
                quantity=-self.quantity_dispensed,
                movement_type='sale',
                reference_type='dispensing',
                reference_id=self.dispensing.id,
                notes=f"Dispensation {self.dispensing.dispensing_number}",
                user=self.dispensing.dispensed_by
            )
            
            if movement:
                self.stock_movement = movement
                self.save(update_fields=['stock_movement'])
    
    def restore_stock(self):
        """Restore stock when dispensing is cancelled"""
        if self.medication and self.medication.product_type == 'physical':
            self.medication.adjust_stock(
                quantity=self.quantity_dispensed,
                movement_type='return',
                reference_type='dispensing_cancel',
                reference_id=self.dispensing.id,
                notes=f"Annulation dispensation {self.dispensing.dispensing_number}",
                user=self.dispensing.dispensed_by
            )
    
    def __str__(self):
        return f"{self.medication.name} x{self.quantity_dispensed}"
    
    @property
    def profit(self):
        """Calculate profit on this item"""
        cost = Decimal(str(self.quantity_dispensed)) * self.unit_cost
        return self.total_price - cost
