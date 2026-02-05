"""
Medical Consultation and Prescription Models
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from decimal import Decimal
import uuid


class Consultation(models.Model):
    """
    Medical consultation record
    Includes vital signs, diagnosis, treatment plan, and follow-up
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='consultations',
        verbose_name=_("Organisation")
    )
    
    # Consultation identification
    consultation_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name=_("Numéro consultation")
    )
    
    # Patient reference
    patient = models.ForeignKey(
        'accounts.Client',
        on_delete=models.CASCADE,
        related_name='consultations',
        verbose_name=_("Patient"),
        limit_choices_to={'client_type__in': ['patient', 'both']}
    )
    
    # Visit reference
    visit = models.ForeignKey(
        'patients.PatientVisit',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='consultations',
        verbose_name=_("Visite")
    )
    
    # Doctor
    doctor = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='consultations',
        verbose_name=_("Médecin"),
        limit_choices_to={'role': 'doctor'}
    )
    
    # Consultation date/time
    consultation_date = models.DateTimeField(
        default=timezone.now,
        verbose_name=_("Date de consultation")
    )

    # Consultation timing tracking
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Heure de début"),
        help_text=_("Heure à laquelle la consultation a commencé")
    )
    ended_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Heure de fin"),
        help_text=_("Heure à laquelle la consultation s'est terminée")
    )

    # Billing
    fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name=_("Frais de consultation")
    )
    
    # === Vital Signs ===
    temperature = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        verbose_name=_("Température (°C)")
    )
    blood_pressure_systolic = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Tension artérielle (systolique)")
    )
    blood_pressure_diastolic = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Tension artérielle (diastolique)")
    )
    blood_glucose = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Glycémie (mg/dL)")
    )
    heart_rate = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Fréquence cardiaque (bpm)")
    )
    respiratory_rate = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Fréquence respiratoire")
    )
    oxygen_saturation = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Saturation O2 (%)")
    )
    weight = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Poids (kg)")
    )
    height = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Taille (cm)")
    )
    
    # === Clinical Information ===
    chief_complaint = models.TextField(
        blank=True,
        verbose_name=_("Motif de consultation"),
        help_text=_("Raison principale de la visite")
    )
    history_of_present_illness = models.TextField(
        blank=True,
        verbose_name=_("Histoire de la maladie actuelle")
    )
    physical_examination = models.TextField(
        blank=True,
        verbose_name=_("Examen physique"),
        help_text=_("Résultats de l'examen clinique")
    )
    diagnosis = models.TextField(
        blank=True,
        verbose_name=_("Diagnostic"),
        help_text=_("Diagnostic principal et différentiels")
    )
    diagnosis_codes = models.JSONField(
        default=list,
        blank=True,
        verbose_name=_("Codes diagnostiques"),
        help_text=_("Codes ICD-10 ou autres")
    )
    treatment_plan = models.TextField(
        blank=True,
        verbose_name=_("Plan de traitement"),
        help_text=_("Traitement prescrit et recommandations")
    )
    
    # === Follow-up ===
    follow_up_required = models.BooleanField(
        default=False,
        verbose_name=_("Suivi requis")
    )
    follow_up_date = models.DateField(
        null=True,
        blank=True,
        verbose_name=_("Date de suivi")
    )
    follow_up_instructions = models.TextField(
        blank=True,
        verbose_name=_("Instructions de suivi")
    )
    
    # === Additional Notes ===
    private_notes = models.TextField(
        blank=True,
        verbose_name=_("Notes privées"),
        help_text=_("Notes réservées au personnel médical")
    )
    patient_instructions = models.TextField(
        blank=True,
        verbose_name=_("Instructions au patient"),
        help_text=_("Instructions à remettre au patient")
    )
    
    # Billing
    consultation_invoice = models.ForeignKey(
        'invoicing.Invoice',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='consultations',
        verbose_name=_("Facture consultation")
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Consultation")
        verbose_name_plural = _("Consultations")
        ordering = ['-consultation_date']
        indexes = [
            models.Index(fields=['organization', '-consultation_date']),
            models.Index(fields=['patient', '-consultation_date']),
            models.Index(fields=['doctor']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.consultation_number:
            self.consultation_number = self._generate_consultation_number()
        super().save(*args, **kwargs)
    
    def _generate_consultation_number(self):
        """Generate unique consultation number: CONS-YYYYMMDD-0001"""
        today = timezone.now().strftime('%Y%m%d')
        prefix = f"CONS-{today}"
        
        last_consultation = Consultation.objects.filter(
            organization=self.organization,
            consultation_number__startswith=prefix
        ).order_by('-consultation_number').first()
        
        if last_consultation and last_consultation.consultation_number:
            try:
                last_num = int(last_consultation.consultation_number.split('-')[-1])
                return f"{prefix}-{last_num + 1:04d}"
            except (ValueError, IndexError):
                pass
        
        return f"{prefix}-0001"
    
    def __str__(self):
        return f"{self.consultation_number} - {self.patient.name}"
    
    @property
    def blood_pressure(self):
        """Return blood pressure as string"""
        if self.blood_pressure_systolic and self.blood_pressure_diastolic:
            return f"{self.blood_pressure_systolic}/{self.blood_pressure_diastolic}"
        return None
    
    @property
    def bmi(self):
        """Calculate Body Mass Index"""
        if self.weight and self.height and self.height > 0:
            height_m = Decimal(str(self.height)) / Decimal('100')
            return round(self.weight / (height_m ** 2), 1)
        return None
    
    @property
    def bmi_category(self):
        """Return BMI category"""
        bmi = self.bmi
        if not bmi:
            return None
        if bmi < 18.5:
            return 'underweight'
        elif bmi < 25:
            return 'normal'
        elif bmi < 30:
            return 'overweight'
        else:
            return 'obese'

    @property
    def duration_minutes(self):
        """Calculate consultation duration in minutes"""
        if self.started_at and self.ended_at:
            delta = self.ended_at - self.started_at
            return int(delta.total_seconds() / 60)
        return None

    @property
    def wait_time_minutes(self):
        """Calculate wait time from invoice payment to consultation start"""
        if self.started_at and self.consultation_invoice:
            # Try to get payment time from invoice
            if hasattr(self.consultation_invoice, 'paid_at') and self.consultation_invoice.paid_at:
                delta = self.started_at - self.consultation_invoice.paid_at
                return int(delta.total_seconds() / 60)
            # Fallback to invoice creation time
            elif self.consultation_invoice.created_at:
                delta = self.started_at - self.consultation_invoice.created_at
                return int(delta.total_seconds() / 60)
        return None


class Prescription(models.Model):
    """
    Medical prescription (ordonnance)
    Contains one or more prescribed medications
    """
    STATUS_CHOICES = [
        ('pending', _('En attente')),
        ('partially_filled', _('Partiellement dispensée')),
        ('filled', _('Dispensée')),
        ('cancelled', _('Annulée')),
        ('expired', _('Expirée')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='prescriptions',
        verbose_name=_("Organisation")
    )
    
    # Prescription identification
    prescription_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name=_("Numéro d'ordonnance")
    )
    
    # References
    consultation = models.ForeignKey(
        Consultation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='prescriptions',
        verbose_name=_("Consultation")
    )
    patient = models.ForeignKey(
        'accounts.Client',
        on_delete=models.CASCADE,
        related_name='prescriptions',
        verbose_name=_("Patient"),
        limit_choices_to={'client_type__in': ['patient', 'both']}
    )
    prescriber = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='written_prescriptions',
        verbose_name=_("Prescripteur"),
        limit_choices_to={'role__in': ['doctor', 'nurse']}
    )
    
    # Prescription details
    prescribed_date = models.DateTimeField(
        default=timezone.now,
        verbose_name=_("Date de prescription")
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name=_("Statut")
    )
    
    # Notes
    notes = models.TextField(
        blank=True,
        verbose_name=_("Notes"),
        help_text=_("Informations supplémentaires pour le pharmacien")
    )
    
    # Dispensing reference
    pharmacy_dispensing = models.ForeignKey(
        'pharmacy.PharmacyDispensing',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='prescriptions',
        verbose_name=_("Dispensation")
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Ordonnance")
        verbose_name_plural = _("Ordonnances")
        ordering = ['-prescribed_date']
        indexes = [
            models.Index(fields=['organization', '-prescribed_date']),
            models.Index(fields=['patient']),
            models.Index(fields=['status']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.prescription_number:
            self.prescription_number = self._generate_prescription_number()

        # Note: valid_until is now optional and not auto-generated

        super().save(*args, **kwargs)
    
    def _generate_prescription_number(self):
        """Generate unique prescription number: RX-YYYYMMDD-0001"""
        today = timezone.now().strftime('%Y%m%d')
        prefix = f"RX-{today}"
        
        last_rx = Prescription.objects.filter(
            organization=self.organization,
            prescription_number__startswith=prefix
        ).order_by('-prescription_number').first()
        
        if last_rx and last_rx.prescription_number:
            try:
                last_num = int(last_rx.prescription_number.split('-')[-1])
                return f"{prefix}-{last_num + 1:04d}"
            except (ValueError, IndexError):
                pass
        
        return f"{prefix}-0001"
    
    def __str__(self):
        return f"{self.prescription_number} - {self.patient.name}"
    
    @property
    def prescriber_type(self):
        """Get prescriber type (Médecin Général/Spécialisé/Infirmière)"""
        if not self.prescriber:
            return _("Non spécifié")

        if self.prescriber.role == 'nurse':
            return _("Infirmière")
        elif self.prescriber.role == 'doctor':
            # Check if specialized based on specialization field
            if hasattr(self.prescriber, 'specialization') and self.prescriber.specialization:
                return f"{_('Médecin Spécialisé')} ({self.prescriber.specialization})"
            return _("Médecin Général")
        return _("Prescripteur")

    @property
    def is_expired(self):
        """Check if prescription is expired"""
        if self.valid_until:
            return timezone.now().date() > self.valid_until
        return False

    @property
    def items_count(self):
        """Number of items in this prescription"""
        return self.items.count()
    
    @property
    def all_dispensed(self):
        """Check if all items have been dispensed"""
        return not self.items.filter(is_dispensed=False).exists()
    
    def update_status(self):
        """Update status based on dispensed items"""
        if self.is_expired and self.status == 'pending':
            self.status = 'expired'
        elif self.all_dispensed:
            self.status = 'filled'
        elif self.items.filter(is_dispensed=True).exists():
            self.status = 'partially_filled'
        self.save(update_fields=['status', 'updated_at'])


class PrescriptionItem(models.Model):
    """
    Individual medication in a prescription
    """
    ROUTE_CHOICES = [
        ('oral', _('Oral')),
        ('iv', _('Intraveineuse (IV)')),
        ('im', _('Intramusculaire (IM)')),
        ('sc', _('Sous-cutanée (SC)')),
        ('topical', _('Topique')),
        ('inhalation', _('Inhalation')),
        ('rectal', _('Rectal')),
        ('ophthalmic', _('Ophtalmique')),
        ('otic', _('Auriculaire')),
        ('nasal', _('Nasal')),
        ('other', _('Autre')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prescription = models.ForeignKey(
        Prescription,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name=_("Ordonnance")
    )
    
    # Medication (Product)
    medication = models.ForeignKey(
        'invoicing.Product',
        on_delete=models.PROTECT,
        related_name='prescription_items',
        verbose_name=_("Médicament"),
        null=True,
        blank=True
    )

    # Alternative: free-text medication name (for external medications)
    medication_name = models.CharField(
        max_length=200,
        blank=True,
        verbose_name=_("Nom du médicament"),
        help_text=_("Utilisé si le médicament n'est pas dans l'inventaire")
    )

    # Indicateur de médicament externe
    is_external_medication = models.BooleanField(
        default=False,
        verbose_name=_("Médicament externe"),
        help_text=_("Si True, le médicament n'est pas disponible dans l'inventaire")
    )

    # Dosage
    dosage = models.CharField(
        max_length=100,
        verbose_name=_("Dosage"),
        help_text=_("Ex: 500mg, 1 comprimé, 5ml")
    )
    frequency = models.CharField(
        max_length=100,
        verbose_name=_("Fréquence"),
        help_text=_("Ex: 3 fois par jour, matin et soir, toutes les 8h")
    )
    duration = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Durée"),
        help_text=_("Ex: 7 jours, 2 semaines, jusqu'à amélioration")
    )
    route = models.CharField(
        max_length=20,
        choices=ROUTE_CHOICES,
        default='oral',
        verbose_name=_("Voie d'administration")
    )
    
    # Quantity
    quantity_prescribed = models.IntegerField(
        verbose_name=_("Quantité prescrite"),
        help_text=_("Nombre total d'unités prescrites")
    )
    quantity_dispensed = models.IntegerField(
        default=0,
        verbose_name=_("Quantité dispensée")
    )
    
    # Dispensing status
    is_dispensed = models.BooleanField(
        default=False,
        verbose_name=_("Dispensé")
    )
    
    # Instructions
    instructions = models.TextField(
        blank=True,
        verbose_name=_("Instructions"),
        help_text=_("Instructions supplémentaires (ex: prendre avec repas)")
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
        verbose_name = _("Item d'ordonnance")
        verbose_name_plural = _("Items d'ordonnance")
        ordering = ['medication__name']
    
    def save(self, *args, **kwargs):
        # Auto-set medication_name from medication if linked
        if self.medication and not self.medication_name:
            self.medication_name = self.medication.name
            self.is_external_medication = False

        # If medication is None but medication_name is provided, mark as external
        if not self.medication and self.medication_name:
            self.is_external_medication = True

        # Update is_dispensed based on quantities
        if self.quantity_dispensed >= self.quantity_prescribed:
            self.is_dispensed = True

        super().save(*args, **kwargs)

        # Update parent prescription status
        if self.prescription_id:
            self.prescription.update_status()
    
    def __str__(self):
        return f"{self.medication_name} - {self.dosage}"
    
    @property
    def remaining_quantity(self):
        """Calculate remaining quantity to dispense"""
        return max(0, self.quantity_prescribed - self.quantity_dispensed)
    
    def dispense(self, quantity):
        """Record dispensing of this item"""
        self.quantity_dispensed += quantity
        if self.quantity_dispensed >= self.quantity_prescribed:
            self.is_dispensed = True
        self.save()
