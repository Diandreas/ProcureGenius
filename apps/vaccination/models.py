"""
Vaccination models.
Catalogue de vaccins (libre, modifiable par l'organisation) + dossier de
vaccination partagé entre le dossier patient général (PEV, campagnes) et le
module Maternité (vaccination anténatale) — un seul modèle, relié
optionnellement à une grossesse, plutôt que deux systèmes parallèles.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import uuid


class VaccineCategory(models.Model):
    """Catégorie de vaccin (ex: PEV Enfant, Anténatal, Voyageurs)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='vaccine_categories',
        verbose_name=_("Organisation")
    )
    name = models.CharField(max_length=100, verbose_name=_("Nom"))
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Catégorie de vaccin")
        verbose_name_plural = _("Catégories de vaccin")
        ordering = ['name']

    def __str__(self):
        return self.name


class VaccineType(models.Model):
    """Type de vaccin (catalogue) — libre et modifiable, pas figé sur un calendrier officiel"""
    TARGET_POPULATION_CHOICES = [
        ('child', _('Enfant (PEV)')),
        ('pregnant_woman', _('Femme enceinte')),
        ('adult', _('Adulte')),
        ('traveler', _('Voyageur')),
        ('other', _('Autre')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='vaccine_types',
        verbose_name=_("Organisation")
    )
    category = models.ForeignKey(
        VaccineCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vaccine_types',
        verbose_name=_("Catégorie")
    )
    code = models.CharField(max_length=50, blank=True, verbose_name=_("Code"))
    name = models.CharField(max_length=200, verbose_name=_("Nom"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    target_population = models.CharField(
        max_length=20, choices=TARGET_POPULATION_CHOICES, default='child',
        verbose_name=_("Population cible")
    )
    # Switch explicite plutôt que déduire "gratuit" de price=0 : un vaccin PEV
    # officiel est gratuit (campagne de santé publique), d'autres (ex: fièvre
    # jaune voyageur) sont facturés comme n'importe quel autre acte.
    is_billable = models.BooleanField(default=False, verbose_name=_("Facturable"))
    price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        verbose_name=_("Prix"), help_text=_("Utilisé seulement si le vaccin est facturable")
    )
    # Métadonnées de schéma de doses — pas encore exploitées par un écran (v1 =
    # historique par patient uniquement) mais nécessaires pour construire plus
    # tard un outil "qui est en retard" sans modifier le modèle.
    standard_doses_count = models.PositiveIntegerField(
        null=True, blank=True, verbose_name=_("Nombre de doses du schéma")
    )
    dose_interval_days = models.PositiveIntegerField(
        null=True, blank=True, verbose_name=_("Intervalle entre doses (jours)")
    )
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Type de vaccin")
        verbose_name_plural = _("Types de vaccin")
        ordering = ['name']

    def __str__(self):
        return self.name


class VaccinationRecord(models.Model):
    """
    Dose de vaccin administrée à un patient.
    Modèle partagé entre deux points d'entrée : le dossier patient général
    (pregnancy=None, ex: PEV enfant) et le dossier de grossesse en Maternité
    (pregnancy renseigné, ex: vaccination anténatale) — même logique que
    Delivery.hospitalization / PrenatalVisit.consultation : ne pas dupliquer
    le modèle, relier par FK nullable pour que l'historique patient inclue
    toujours ce qui a été saisi côté grossesse.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='vaccination_records',
        verbose_name=_("Organisation")
    )
    patient = models.ForeignKey(
        'accounts.Client',
        on_delete=models.CASCADE,
        related_name='vaccination_records',
        verbose_name=_("Patient"),
        limit_choices_to={'client_type__in': ['patient', 'both']}
    )
    vaccine_type = models.ForeignKey(
        VaccineType,
        on_delete=models.PROTECT,
        related_name='records',
        verbose_name=_("Vaccin")
    )
    pregnancy = models.ForeignKey(
        'maternity.PregnancyRecord',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='vaccination_records',
        verbose_name=_("Grossesse liée (si vaccination anténatale)")
    )
    dose_number = models.PositiveIntegerField(null=True, blank=True, verbose_name=_("Numéro de dose"))
    administered_date = models.DateTimeField(default=timezone.now, verbose_name=_("Date d'administration"))
    administered_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='vaccinations_administered',
        verbose_name=_("Administré par")
    )
    batch_number = models.CharField(max_length=100, blank=True, verbose_name=_("Numéro de lot"))
    next_dose_due_date = models.DateField(null=True, blank=True, verbose_name=_("Prochaine dose due"))
    notes = models.TextField(blank=True, verbose_name=_("Notes"))
    invoice = models.ForeignKey(
        'invoicing.Invoice',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='vaccination_records',
        verbose_name=_("Facture")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Vaccination")
        verbose_name_plural = _("Vaccinations")
        ordering = ['-administered_date']
        indexes = [
            models.Index(fields=['organization', '-administered_date']),
            models.Index(fields=['patient']),
        ]

    def __str__(self):
        return f"{self.vaccine_type.name} - {self.patient.name} ({self.administered_date.strftime('%d/%m/%Y')})"
