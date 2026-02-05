"""
Patient Visit and Healthcare Flow Models
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import uuid
from .models_documents import PatientDocument

class PatientVisit(models.Model):
    """
    Suivi des visites de patients.
    Chaque visite représente une interaction du patient avec l'établissement de santé.
    """
    VISIT_TYPES = [
        ('consultation', _('Consultation Médicale')),
        ('lab_results', _('Retrait Résultats Labo')),
        ('follow_up_exam', _('Suivi après Examens')),
        ('prescription_renewal', _('Renouvellement Ordonnance')),
        ('laboratory', _('Examens Laboratoire')),
        ('pharmacy', _('Dispensation Pharmacie')),
        ('emergency', _('Urgence')),
        ('follow_up', _('Consultation de Suivi')),
        ('vaccination', _('Vaccination')),
        ('imaging', _('Imagerie Médicale')),
        ('administrative', _('Démarche Administrative')),
        ('wound_care', _('Soins Infirmiers')),
        ('physiotherapy', _('Kinésithérapie')),
        ('other', _('Autre')),
    ]
    
    STATUS_CHOICES = [
        ('registered', _('Enregistré')),
        ('waiting_consultation', _('En attente consultation')),
        ('in_consultation', _('En consultation')),
        ('waiting_lab', _('En attente labo')),
        ('in_lab', _('Au laboratoire')),
        ('waiting_results', _('En attente résultats')),
        ('waiting_pharmacy', _('En attente pharmacie')),
        ('at_pharmacy', _('À la pharmacie')),
        ('completed', _('Terminé')),
        ('cancelled', _('Annulé')),
        ('no_show', _('Non présenté')),
    ]
    
    PRIORITY_CHOICES = [
        ('routine', _('Routine')),
        ('urgent', _('Urgent')),
        ('emergency', _('Urgence')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='patient_visits',
        verbose_name=_("Organisation")
    )
    
    # Visit identification
    visit_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name=_("Numéro de visite")
    )
    
    # Patient reference - links to Client model with client_type='patient' or 'both'
    patient = models.ForeignKey(
        'accounts.Client',
        on_delete=models.CASCADE,
        related_name='visits',
        verbose_name=_("Patient"),
        limit_choices_to={'client_type__in': ['patient', 'both']}
    )
    
    # Visit details
    visit_type = models.CharField(
        max_length=20,
        choices=VISIT_TYPES,
        default='consultation',
        verbose_name=_("Type de visite")
    )
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='registered',
        verbose_name=_("Statut")
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='routine',
        verbose_name=_("Priorité")
    )
    
    # Chief complaint / reason for visit
    chief_complaint = models.TextField(
        blank=True,
        verbose_name=_("Motif de consultation"),
        help_text=_("Raison principale de la visite")
    )
    notes = models.TextField(
        blank=True,
        verbose_name=_("Notes"),
        help_text=_("Notes additionnelles pour cette visite")
    )

    # Vital Signs (Triage)
    vitals_weight = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True, 
        verbose_name=_("Poids (kg)")
    )
    vitals_height = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True, 
        verbose_name=_("Taille (cm)")
    )
    vitals_temperature = models.DecimalField(
        max_digits=4, 
        decimal_places=1, 
        null=True, 
        blank=True, 
        verbose_name=_("Température (°C)")
    )
    vitals_systolic = models.IntegerField(
        null=True, 
        blank=True, 
        verbose_name=_("Systolique (mmHg)")
    )
    vitals_diastolic = models.IntegerField(
        null=True, 
        blank=True, 
        verbose_name=_("Diastolique (mmHg)")
    )
    vitals_blood_glucose = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Glycémie (g/L)")
    )
    vitals_spo2 = models.IntegerField(
        null=True, 
        blank=True, 
        verbose_name=_("SpO2 (%)")
    )
    
    # Staff assignments
    assigned_doctor = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_visits',
        verbose_name=_("Médecin assigné"),
        limit_choices_to={'role': 'doctor'}
    )
    registered_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registered_visits',
        verbose_name=_("Enregistré par")
    )
    
    # Invoice references
    consultation_invoice = models.ForeignKey(
        'invoicing.Invoice',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='consultation_visits',
        verbose_name=_("Facture consultation")
    )
    
    # Timestamps for tracking flow
    arrived_at = models.DateTimeField(
        default=timezone.now,
        verbose_name=_("Heure d'arrivée")
    )
    consultation_started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Début consultation")
    )
    consultation_ended_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Fin consultation")
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Terminé à")
    )
    
    # Standard timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-arrived_at']
        verbose_name = _("Visite patient")
        verbose_name_plural = _("Visites patients")
        indexes = [
            models.Index(fields=['organization', '-arrived_at']),
            models.Index(fields=['patient', '-arrived_at']),
            models.Index(fields=['status']),
            models.Index(fields=['visit_type']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.visit_number:
            self.visit_number = self._generate_visit_number()
        super().save(*args, **kwargs)
    
    def _generate_visit_number(self):
        """Generate unique visit number: VIS-YYYYMMDD-0001"""
        today = timezone.now().strftime('%Y%m%d')
        prefix = f"VIS-{today}"
        
        # Find last visit number with this prefix for this organization
        last_visit = PatientVisit.objects.filter(
            organization=self.organization,
            visit_number__startswith=prefix
        ).order_by('-visit_number').first()
        
        if last_visit and last_visit.visit_number:
            try:
                last_num = int(last_visit.visit_number.split('-')[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1

        # Ensure uniqueness
        while True:
            candidate = f"{prefix}-{next_num:04d}"
            if not PatientVisit.objects.filter(visit_number=candidate).exists():
                return candidate
            next_num += 1
    
    def __str__(self):
        return f"{self.visit_number} - {self.patient.name}"
    
    # Status transition methods
    def start_consultation(self, doctor=None):
        """Mark consultation as started"""
        self.status = 'in_consultation'
        self.consultation_started_at = timezone.now()
        if doctor:
            self.assigned_doctor = doctor
        self.save()
    
    def end_consultation(self):
        """Mark consultation as ended"""
        self.consultation_ended_at = timezone.now()
        self.save()
    
    def send_to_lab(self):
        """Update status when patient is sent to lab"""
        self.status = 'waiting_lab'
        self.save()
    
    def send_to_pharmacy(self):
        """Update status when patient is sent to pharmacy"""
        self.status = 'waiting_pharmacy'
        self.save()
    
    def complete_visit(self):
        """Mark visit as completed"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save()
    
    def cancel_visit(self, reason=None):
        """Cancel the visit"""
        self.status = 'cancelled'
        if reason:
            self.notes = f"{self.notes}\nAnnulation: {reason}".strip()
        self.save()
    
    @property
    def wait_time_minutes(self):
        """Calculate waiting time in minutes"""
        if self.consultation_started_at and self.arrived_at:
            delta = self.consultation_started_at - self.arrived_at
            return int(delta.total_seconds() / 60)
        elif self.status in ['registered', 'waiting_consultation']:
            delta = timezone.now() - self.arrived_at
            return int(delta.total_seconds() / 60)
        return None
    
    @property
    def consultation_duration_minutes(self):
        """Calculate consultation duration in minutes"""
        if self.consultation_started_at and self.consultation_ended_at:
            delta = self.consultation_ended_at - self.consultation_started_at
            return int(delta.total_seconds() / 60)
        return None
    
    @property
    def is_active(self):
        """Check if visit is still active (not completed or cancelled)"""
        return self.status not in ['completed', 'cancelled', 'no_show']
