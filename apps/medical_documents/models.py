"""
Documents médicaux standards : référence, repos médical, soins infirmiers,
référence et contre-référence.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import uuid

from apps.core.services.number_generator import NumberGeneratorService


class MedicalDocument(models.Model):
    DOCUMENT_TYPES = [
        ('referral', _('Fiche de référence médicale')),
        ('rest_note', _('Fiche de repos médical')),
        ('nursing_care', _('Fiche de soins infirmiers')),
        ('referral_counter_referral', _('Fiche de référence et contre-référence')),
    ]

    PREFIX_BY_TYPE = {
        'referral': 'REF',
        'rest_note': 'REPOS',
        'nursing_care': 'SOINS',
        'referral_counter_referral': 'REFCR',
    }

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization', on_delete=models.CASCADE,
        related_name='medical_documents', verbose_name=_("Organisation")
    )
    document_type = models.CharField(max_length=30, choices=DOCUMENT_TYPES, verbose_name=_("Type de document"))
    document_number = models.CharField(max_length=50, unique=True, verbose_name=_("Numéro"))

    patient = models.ForeignKey(
        'accounts.Client', on_delete=models.CASCADE,
        related_name='medical_documents', verbose_name=_("Patient")
    )
    consultation = models.ForeignKey(
        'consultations.Consultation', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='medical_documents', verbose_name=_("Consultation liée")
    )
    issued_by = models.ForeignKey(
        'accounts.CustomUser', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='issued_medical_documents', verbose_name=_("Délivré par")
    )
    issue_date = models.DateField(default=timezone.now, verbose_name=_("Date de délivrance"))

    # Champ libre générique (motif / résumé — usage varie selon le type de document)
    notes = models.TextField(blank=True, verbose_name=_("Notes"))

    # -- Référence médicale / Référence et contre-référence --
    referred_to = models.CharField(max_length=255, blank=True, verbose_name=_("Structure / médecin destinataire"))
    referral_reason = models.TextField(blank=True, verbose_name=_("Motif de référence"))
    clinical_summary = models.TextField(blank=True, verbose_name=_("Résumé clinique"))
    exams_done = models.TextField(blank=True, verbose_name=_("Examens déjà réalisés"))
    provisional_diagnosis = models.TextField(blank=True, verbose_name=_("Diagnostic présomptif"))

    # -- Contre-référence (retour de la structure destinataire) --
    counter_referral_diagnosis = models.TextField(blank=True, verbose_name=_("Diagnostic retenu"))
    counter_referral_treatment = models.TextField(blank=True, verbose_name=_("Traitement donné"))
    counter_referral_recommendations = models.TextField(blank=True, verbose_name=_("Recommandations de suivi"))

    # -- Repos médical --
    rest_start_date = models.DateField(null=True, blank=True, verbose_name=_("Début du repos"))
    rest_end_date = models.DateField(null=True, blank=True, verbose_name=_("Fin du repos"))
    rest_days = models.PositiveIntegerField(null=True, blank=True, verbose_name=_("Nombre de jours"))
    rest_reason = models.CharField(max_length=255, blank=True, verbose_name=_("Motif du repos"))

    # -- Soins infirmiers --
    care_acts = models.TextField(blank=True, verbose_name=_("Soins effectués"))
    vital_signs = models.TextField(blank=True, verbose_name=_("Constantes (TA, T°, pouls…)"))
    next_care_date = models.DateField(null=True, blank=True, verbose_name=_("Prochain soin prévu"))

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Document médical")
        verbose_name_plural = _("Documents médicaux")
        ordering = ['-issue_date', '-created_at']

    def __str__(self):
        return f"{self.get_document_type_display()} - {self.patient.name} ({self.document_number})"

    def save(self, *args, **kwargs):
        if not self.document_number:
            prefix = self.PREFIX_BY_TYPE.get(self.document_type, 'DOC')
            self.document_number = NumberGeneratorService.generate_number(
                prefix=prefix,
                organization=self.organization,
                model_class=MedicalDocument,
                field_name='document_number',
            )
        super().save(*args, **kwargs)
