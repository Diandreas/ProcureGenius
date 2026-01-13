"""
Patient Document Model
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
import uuid

class PatientDocument(models.Model):
    """
    Document uploaded for a patient (e.g. external results, ID, insurance)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='patient_documents',
        verbose_name=_("Organisation")
    )
    patient = models.ForeignKey(
        'accounts.Client',
        on_delete=models.CASCADE,
        related_name='documents',
        verbose_name=_("Patient"),
        limit_choices_to={'client_type__in': ['patient', 'both']}
    )
    title = models.CharField(max_length=255, verbose_name=_("Titre"))
    file = models.FileField(upload_to='patient_documents/%Y/%m/', verbose_name=_("Fichier"))
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Date d'ajout"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    
    class Meta:
        verbose_name = _("Document patient")
        verbose_name_plural = _("Documents patients")
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.title} - {self.patient.name}"
