"""
Patient Care Service Models
Tracks all care services provided to patients across all healthcare modules
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import uuid


class PatientCareService(models.Model):
    """
    Service de soin reçu par un patient
    Centralise tous les types de soins: consultations, soins infirmiers, 
    examens de labo, dispensations médicaments
    """
    
    SERVICE_TYPES = [
        ('consultation', _('Consultation')),
        ('nursing_care', _('Soin infirmier')),
        ('laboratory', _('Analyse laboratoire')),
        ('pharmacy', _('Dispensation médicament')),
        ('imaging', _('Imagerie')),
        ('procedure', _('Procédure/Intervention')),
        ('vaccination', _('Vaccination')),
        ('physiotherapy', _('Kinésithérapie')),
        ('other', _('Autre')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Patient concerné
    patient = models.ForeignKey(
        'accounts.Client',
        on_delete=models.CASCADE,
        related_name='care_services',
        verbose_name=_("Patient")
    )
    
    # Service fourni (si facturable via Product)
    service_product = models.ForeignKey(
        'invoicing.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='patient_care_records',
        verbose_name=_("Service (Product)"),
        help_text=_("Pour les services facturables via catalogue")
    )
    
    # Metadata du service
    service_type = models.CharField(
        max_length=20,
        choices=SERVICE_TYPES,
        verbose_name=_("Type de service")
    )
    service_name = models.CharField(
        max_length=200,
        verbose_name=_("Nom du service"),
        help_text=_("Dupliqué depuis Product ou saisi manuellement")
    )
    service_category = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Catégorie"),
        help_text=_("Ex: Soins Infirmiers, Consultations, etc.")
    )
    
    # Fournisseur du soin
    provided_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='provided_care_services',
        verbose_name=_("Fourni par"),
        help_text=_("Médecin, infirmier, technicien, etc.")
    )
    provided_at = models.DateTimeField(
        default=timezone.now,
        verbose_name=_("Date/heure du soin")
    )
    
    # Liens optionnels vers modules source
    consultation = models.ForeignKey(
        'consultations.Consultation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='care_services',
        verbose_name=_("Consultation associée")
    )
    lab_order = models.ForeignKey(
        'laboratory.LabOrder',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='care_services',
        verbose_name=_("Commande labo associée")
    )
    dispensing = models.ForeignKey(
        'pharmacy.PharmacyDispensing',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='care_services',
        verbose_name=_("Dispensation associée")
    )
    visit = models.ForeignKey(
        'patients.PatientVisit',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='care_services',
        verbose_name=_("Visite associée")
    )
    
    # Facturation
    invoice = models.ForeignKey(
        'invoicing.Invoice',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='care_services',
        verbose_name=_("Facture")
    )
    invoice_item = models.ForeignKey(
        'invoicing.InvoiceItem',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='care_services',
        verbose_name=_("Ligne de facture")
    )
    is_billed = models.BooleanField(
        default=False,
        verbose_name=_("Facturé")
    )
    
    # Détails cliniques
    quantity = models.PositiveIntegerField(
        default=1,
        verbose_name=_("Quantité")
    )
    notes = models.TextField(
        blank=True,
        verbose_name=_("Notes/Observations"),
        help_text=_("Détails cliniques, observations")
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Service de soin patient")
        verbose_name_plural = _("Services de soins patients")
        ordering = ['-provided_at']
        indexes = [
            models.Index(fields=['patient', '-provided_at']),
            models.Index(fields=['service_type']),
            models.Index(fields=['is_billed']),
        ]
    
    def __str__(self):
        return f"{self.patient.name} - {self.service_name} ({self.provided_at.strftime('%d/%m/%Y')})"
