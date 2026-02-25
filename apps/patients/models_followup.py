"""
Patient Follow-Up Model
Table de suivi clinique léger : paramètres vitaux, évolution, traitement.
Fichier séparé pour ne pas toucher aux données existantes en production.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import uuid


class PatientFollowUp(models.Model):
    """
    Fiche de suivi patient (consultation de suivi légère).
    Capture : plaintes du jour, paramètres vitaux, examen physique,
    diagnostic, évolution et traitement / examens prescrits.

    Modèle 100 % additionnel — aucune donnée existante n'est touchée.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='follow_ups',
        verbose_name=_("Organisation")
    )
    patient = models.ForeignKey(
        'accounts.Client',
        on_delete=models.CASCADE,
        related_name='follow_ups',
        verbose_name=_("Patient"),
        limit_choices_to={'client_type__in': ['patient', 'both']}
    )
    provided_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='patient_follow_ups',
        verbose_name=_("Effectué par")
    )

    # Lien optionnel à une visite en cours
    visit = models.ForeignKey(
        'patients.PatientVisit',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='follow_ups',
        verbose_name=_("Visite liée")
    )

    # ── Clinique ───────────────────────────────────────────────────────────
    chief_complaint = models.TextField(
        blank=True,
        verbose_name=_("Plaintes du jour"),
        help_text=_("Motif principal de la visite de suivi")
    )
    physical_examination = models.TextField(
        blank=True,
        verbose_name=_("Examen physique"),
        help_text=_("Résultats de l'examen clinique")
    )
    diagnosis = models.TextField(
        blank=True,
        verbose_name=_("Diagnostic"),
        help_text=_("Diagnostic ou orientation diagnostique")
    )
    evolution = models.TextField(
        blank=True,
        verbose_name=_("Évolution"),
        help_text=_("Évolution par rapport à la dernière visite")
    )
    treatment = models.TextField(
        blank=True,
        verbose_name=_("Traitement / Examens"),
        help_text=_("Traitement prescrit ou examens demandés")
    )
    notes = models.TextField(
        blank=True,
        verbose_name=_("Notes complémentaires")
    )

    # ── Paramètres Vitaux ──────────────────────────────────────────────────
    temperature = models.DecimalField(
        max_digits=4, decimal_places=1,
        null=True, blank=True,
        verbose_name=_("Température (°C)")
    )
    blood_pressure_systolic = models.IntegerField(
        null=True, blank=True,
        verbose_name=_("Tension systolique (mmHg)")
    )
    blood_pressure_diastolic = models.IntegerField(
        null=True, blank=True,
        verbose_name=_("Tension diastolique (mmHg)")
    )
    heart_rate = models.IntegerField(
        null=True, blank=True,
        verbose_name=_("Fréquence cardiaque (bpm)")
    )
    oxygen_saturation = models.IntegerField(
        null=True, blank=True,
        verbose_name=_("SpO2 (%)")
    )
    respiratory_rate = models.IntegerField(
        null=True, blank=True,
        verbose_name=_("Fréquence respiratoire (cycle/min)")
    )
    weight = models.DecimalField(
        max_digits=5, decimal_places=1,
        null=True, blank=True,
        verbose_name=_("Poids (kg)")
    )
    blood_glucose = models.DecimalField(
        max_digits=5, decimal_places=2,
        null=True, blank=True,
        verbose_name=_("Glycémie (mg/dL)")
    )

    # ── Horodatage ────────────────────────────────────────────────────────
    follow_up_date = models.DateTimeField(
        default=timezone.now,
        verbose_name=_("Date du suivi")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Suivi Patient")
        verbose_name_plural = _("Suivis Patients")
        ordering = ['-follow_up_date']
        indexes = [
            models.Index(fields=['patient', '-follow_up_date']),
            models.Index(fields=['organization', '-follow_up_date']),
        ]

    def __str__(self):
        date = self.follow_up_date.strftime('%d/%m/%Y') if self.follow_up_date else '?'
        return f"Suivi {self.patient} — {date}"

    @property
    def blood_pressure(self):
        if self.blood_pressure_systolic and self.blood_pressure_diastolic:
            return f"{self.blood_pressure_systolic}/{self.blood_pressure_diastolic}"
        return None
