"""
Maternity models.
Suivi grossesse (CPN) -> accouchement -> nouveau-né(s) -> suivi post-natal.
Le séjour hospitalier après accouchement réutilise apps.hospitalizations.Hospitalization
(lien par FK, aucune modification de ce modèle) plutôt que de dupliquer lits/sortie/PDF.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import uuid


class PregnancyRecord(models.Model):
    """Dossier de grossesse d'une patiente"""
    STATUS_CHOICES = [
        ('ongoing', _('En cours')),
        ('delivered', _('Accouchée')),
        ('terminated', _('Interrompue')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='pregnancy_records',
        verbose_name=_("Organisation")
    )
    patient = models.ForeignKey(
        'accounts.Client',
        on_delete=models.CASCADE,
        related_name='pregnancy_records',
        verbose_name=_("Patiente"),
        limit_choices_to={'client_type__in': ['patient', 'both']}
    )
    lmp_date = models.DateField(
        null=True, blank=True,
        verbose_name=_("Date des dernières règles (DDR)")
    )
    expected_delivery_date = models.DateField(
        null=True, blank=True,
        verbose_name=_("Date prévue d'accouchement (DPA)")
    )
    gravidity = models.PositiveIntegerField(
        null=True, blank=True,
        verbose_name=_("Gravidité"), help_text=_("Nombre total de grossesses")
    )
    parity = models.PositiveIntegerField(
        null=True, blank=True,
        verbose_name=_("Parité"), help_text=_("Nombre d'accouchements précédents")
    )
    risk_factors = models.TextField(
        blank=True, verbose_name=_("Facteurs de risque"),
        help_text=_("Ex: HTA, diabète gestationnel, grossesse multiple...")
    )
    referring_doctor = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='referred_pregnancies',
        verbose_name=_("Médecin référent")
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='ongoing',
        verbose_name=_("Statut")
    )
    notes = models.TextField(blank=True, verbose_name=_("Notes"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Dossier de grossesse")
        verbose_name_plural = _("Dossiers de grossesse")
        ordering = ['-created_at']

    def __str__(self):
        return f"Grossesse - {self.patient.name} ({self.get_status_display()})"


class PrenatalVisit(models.Model):
    """Consultation prénatale (CPN)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pregnancy = models.ForeignKey(
        PregnancyRecord, on_delete=models.CASCADE,
        related_name='prenatal_visits', verbose_name=_("Grossesse")
    )
    visit_date = models.DateTimeField(default=timezone.now, verbose_name=_("Date de la visite"))
    gestational_age_weeks = models.PositiveIntegerField(
        null=True, blank=True, verbose_name=_("Âge gestationnel (SA)")
    )
    weight = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True, verbose_name=_("Poids (kg)")
    )
    blood_pressure_systolic = models.PositiveIntegerField(
        null=True, blank=True, verbose_name=_("Tension systolique")
    )
    blood_pressure_diastolic = models.PositiveIntegerField(
        null=True, blank=True, verbose_name=_("Tension diastolique")
    )
    fundal_height = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True,
        verbose_name=_("Hauteur utérine (cm)")
    )
    fetal_heart_rate = models.PositiveIntegerField(
        null=True, blank=True, verbose_name=_("Bruits du cœur fœtal (bpm)")
    )
    edema = models.BooleanField(default=False, verbose_name=_("Œdèmes"))
    fetal_movements = models.BooleanField(default=True, verbose_name=_("Mouvements fœtaux actifs"))
    urine_test_results = models.CharField(
        max_length=200, blank=True, verbose_name=_("Bandelette urinaire (albumine/glucose)")
    )
    doctor = models.ForeignKey(
        'accounts.CustomUser', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='prenatal_visits_done', verbose_name=_("Médecin / Sage-femme")
    )
    notes = models.TextField(blank=True, verbose_name=_("Notes"))
    next_visit_date = models.DateField(null=True, blank=True, verbose_name=_("Prochaine visite"))
    visit_invoice = models.ForeignKey(
        'invoicing.Invoice', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='prenatal_visit', verbose_name=_("Facture")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Consultation prénatale")
        verbose_name_plural = _("Consultations prénatales")
        ordering = ['-visit_date']

    def __str__(self):
        return f"CPN {self.pregnancy.patient.name} - {self.visit_date.strftime('%d/%m/%Y')}"


class Delivery(models.Model):
    """Accouchement"""
    DELIVERY_TYPE_CHOICES = [
        ('vaginal', _('Voie basse')),
        ('cesarean', _('Césarienne')),
        ('instrumental', _('Voie basse instrumentale')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pregnancy = models.OneToOneField(
        PregnancyRecord, on_delete=models.CASCADE,
        related_name='delivery', verbose_name=_("Grossesse")
    )
    delivery_date = models.DateTimeField(default=timezone.now, verbose_name=_("Date/heure d'accouchement"))
    delivery_type = models.CharField(
        max_length=20, choices=DELIVERY_TYPE_CHOICES, default='vaginal',
        verbose_name=_("Type d'accouchement")
    )
    labor_duration_hours = models.DecimalField(
        max_digits=5, decimal_places=1, null=True, blank=True,
        verbose_name=_("Durée du travail (heures)")
    )
    complications = models.TextField(blank=True, verbose_name=_("Complications"))
    attending_staff = models.TextField(
        blank=True, verbose_name=_("Personnel présent"),
        help_text=_("Médecin(s), sage-femme(s) ayant assisté l'accouchement")
    )
    mother_condition_after = models.TextField(
        blank=True, verbose_name=_("État de la mère après accouchement")
    )
    # Lien vers le séjour hospitalier — pas de modification du modèle Hospitalization
    hospitalization = models.ForeignKey(
        'hospitalizations.Hospitalization', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='delivery', verbose_name=_("Séjour d'hospitalisation lié")
    )
    delivery_invoice = models.ForeignKey(
        'invoicing.Invoice', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='delivery', verbose_name=_("Facture accouchement")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Accouchement")
        verbose_name_plural = _("Accouchements")
        ordering = ['-delivery_date']

    def __str__(self):
        return f"Accouchement {self.pregnancy.patient.name} - {self.delivery_date.strftime('%d/%m/%Y')}"


class Newborn(models.Model):
    """Nouveau-né (un accouchement peut avoir plusieurs nouveau-nés : grossesse multiple)"""
    SEX_CHOICES = [('M', _('Masculin')), ('F', _('Féminin'))]
    FEEDING_CHOICES = [
        ('breast', _('Allaitement maternel')),
        ('formula', _('Allaitement artificiel')),
        ('mixed', _('Mixte')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    delivery = models.ForeignKey(
        Delivery, on_delete=models.CASCADE,
        related_name='newborns', verbose_name=_("Accouchement")
    )
    name = models.CharField(max_length=200, blank=True, verbose_name=_("Nom"))
    sex = models.CharField(max_length=1, choices=SEX_CHOICES, verbose_name=_("Sexe"))
    birth_weight_grams = models.PositiveIntegerField(
        null=True, blank=True, verbose_name=_("Poids de naissance (g)")
    )
    birth_height_cm = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True, verbose_name=_("Taille (cm)")
    )
    head_circumference_cm = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True,
        verbose_name=_("Périmètre crânien (cm)")
    )
    apgar_score_1min = models.PositiveIntegerField(null=True, blank=True, verbose_name=_("Apgar 1 min"))
    apgar_score_5min = models.PositiveIntegerField(null=True, blank=True, verbose_name=_("Apgar 5 min"))
    apgar_score_10min = models.PositiveIntegerField(null=True, blank=True, verbose_name=_("Apgar 10 min"))
    condition_at_birth = models.TextField(blank=True, verbose_name=_("État à la naissance"))
    feeding_type = models.CharField(
        max_length=20, choices=FEEDING_CHOICES, blank=True, verbose_name=_("Alimentation")
    )
    birth_vaccinations = models.CharField(
        max_length=300, blank=True, verbose_name=_("Vaccinations à la naissance"),
        help_text=_("Ex: BCG, Polio 0")
    )
    # Optionnel : créer une fiche patient à part pour le suivi pédiatrique futur
    patient_record = models.ForeignKey(
        'accounts.Client', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='newborn_record', verbose_name=_("Fiche patient liée")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Nouveau-né")
        verbose_name_plural = _("Nouveau-nés")
        ordering = ['created_at']

    def __str__(self):
        return self.name or f"Nouveau-né de {self.delivery.pregnancy.patient.name}"


class PostnatalVisit(models.Model):
    """Suivi post-natal (mère et/ou nouveau-né)"""
    FEEDING_STATUS_CHOICES = [
        ('breast', _('Allaitement maternel')),
        ('formula', _('Allaitement artificiel')),
        ('mixed', _('Mixte')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    delivery = models.ForeignKey(
        Delivery, on_delete=models.CASCADE,
        related_name='postnatal_visits', verbose_name=_("Accouchement")
    )
    newborn = models.ForeignKey(
        Newborn, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='postnatal_visits', verbose_name=_("Nouveau-né concerné")
    )
    visit_date = models.DateTimeField(default=timezone.now, verbose_name=_("Date de la visite"))
    days_after_delivery = models.PositiveIntegerField(
        null=True, blank=True, verbose_name=_("Jours après l'accouchement")
    )
    mother_condition = models.TextField(blank=True, verbose_name=_("État de la mère"))
    mother_weight = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True, verbose_name=_("Poids mère (kg)")
    )
    mother_blood_pressure_systolic = models.PositiveIntegerField(
        null=True, blank=True, verbose_name=_("Tension systolique mère")
    )
    mother_blood_pressure_diastolic = models.PositiveIntegerField(
        null=True, blank=True, verbose_name=_("Tension diastolique mère")
    )
    newborn_weight_grams = models.PositiveIntegerField(
        null=True, blank=True, verbose_name=_("Poids bébé (g)")
    )
    feeding_status = models.CharField(
        max_length=20, choices=FEEDING_STATUS_CHOICES, blank=True, verbose_name=_("Alimentation")
    )
    complications = models.TextField(blank=True, verbose_name=_("Complications"))
    doctor = models.ForeignKey(
        'accounts.CustomUser', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='postnatal_visits_done', verbose_name=_("Médecin / Sage-femme")
    )
    notes = models.TextField(blank=True, verbose_name=_("Notes"))
    next_visit_date = models.DateField(null=True, blank=True, verbose_name=_("Prochaine visite"))
    visit_invoice = models.ForeignKey(
        'invoicing.Invoice', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='postnatal_visit', verbose_name=_("Facture")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Suivi post-natal")
        verbose_name_plural = _("Suivis post-nataux")
        ordering = ['-visit_date']

    def __str__(self):
        return f"Post-natal {self.delivery.pregnancy.patient.name} - {self.visit_date.strftime('%d/%m/%Y')}"
