"""
Hospitalization models.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import uuid


class Hospitalization(models.Model):
    STATUS_CHOICES = [
        ('admitted', _('Admis')),
        ('discharged', _('Sorti')),
        ('transferred', _('Transféré')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='hospitalizations',
        verbose_name=_("Organisation")
    )

    # Reference to Patient
    patient = models.ForeignKey(
        'accounts.Client',
        on_delete=models.CASCADE,
        related_name='hospitalizations',
        verbose_name=_("Patient"),
        limit_choices_to={'client_type__in': ['patient', 'both']}
    )

    # Doctors
    admitting_doctor = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='admitted_patients',
        verbose_name=_("Médecin traitant / admission")
    )
    discharging_doctor = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='discharged_patients',
        verbose_name=_("Médecin autorisant la sortie")
    )

    # Dates
    admission_date = models.DateTimeField(
        default=timezone.now,
        verbose_name=_("Date d'admission")
    )
    discharge_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Date de sortie")
    )

    # Medical Info
    admission_reason = models.TextField(
        blank=True,
        verbose_name=_("Motif d'hospitalisation")
    )
    diagnosis = models.TextField(
        blank=True,
        verbose_name=_("Diagnostic")
    )
    treatment_during_stay = models.TextField(
        blank=True,
        verbose_name=_("Traitement reçu pendant le séjour")
    )

    # Discharge specifics
    discharge_summary = models.TextField(
        blank=True,
        verbose_name=_("Résumé de sortie / Évolution")
    )
    follow_up_instructions = models.TextField(
        blank=True,
        verbose_name=_("Recommandations / Instructions")
    )
    prescribed_treatment_after = models.TextField(
        blank=True,
        verbose_name=_("Traitement de sortie (Ordonnance)")
    )
    next_appointment_date = models.DateField(
        null=True,
        blank=True,
        verbose_name=_("Date du prochain RDV de suivi")
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='admitted',
        verbose_name=_("Statut")
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Hospitalisation")
        verbose_name_plural = _("Hospitalisations")
        ordering = ['-admission_date']

    def __str__(self):
        return f"Hospitalisation: {self.patient.name} ({self.get_status_display()})"
