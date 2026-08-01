from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import uuid

from apps.core.services.number_generator import NumberGeneratorService


class ImagingExamCategory(models.Model):
    """Catégorie d'examen d'imagerie (ex: Radiologie, Échographie, Scanner, IRM)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='imaging_exam_categories',
        verbose_name=_("Organisation")
    )
    name = models.CharField(max_length=100, verbose_name=_("Nom"))
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Catégorie d'examen d'imagerie")
        verbose_name_plural = _("Catégories d'examen d'imagerie")
        ordering = ['name']

    def __str__(self):
        return self.name


class ImagingExamType(models.Model):
    """Type d'examen d'imagerie (catalogue) — ex: Radio thorax, Écho abdominale"""
    MODALITY_CHOICES = [
        ('xray', _('Radio')),
        ('ultrasound', _('Échographie')),
        ('ct', _('Scanner')),
        ('mri', _('IRM')),
        ('other', _('Autre')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='imaging_exam_types',
        verbose_name=_("Organisation")
    )
    category = models.ForeignKey(
        ImagingExamCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='exam_types',
        verbose_name=_("Catégorie")
    )
    exam_code = models.CharField(max_length=50, blank=True, verbose_name=_("Code examen"))
    name = models.CharField(max_length=200, verbose_name=_("Nom"))
    short_name = models.CharField(max_length=50, blank=True, verbose_name=_("Nom court"))
    modality = models.CharField(
        max_length=20,
        choices=MODALITY_CHOICES,
        default='other',
        verbose_name=_("Modalité")
    )
    description = models.TextField(blank=True, verbose_name=_("Description"))
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name=_("Prix"))
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name=_("Réduction"))
    estimated_duration_minutes = models.IntegerField(
        null=True, blank=True, verbose_name=_("Durée estimée (min)")
    )
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Type d'examen d'imagerie")
        verbose_name_plural = _("Types d'examen d'imagerie")
        ordering = ['name']

    def __str__(self):
        return self.name


class ImagingOrder(models.Model):
    """Commande d'examen(s) d'imagerie pour un patient"""
    STATUS_CHOICES = [
        ('prescribed', _('Prescrit')),
        ('in_progress', _('En cours')),
        ('results_ready', _('Résultats prêts')),
        ('results_delivered', _('Résultats remis')),
        ('cancelled', _('Annulé')),
    ]

    PRIORITY_CHOICES = [
        ('routine', _('Routine')),
        ('urgent', _('Urgent')),
        ('stat', _('STAT (Immédiat)')),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('cash', _('Espèces')),
        ('mobile_money', _('Mobile Money')),
        ('card', _('Carte Bancaire')),
        ('insurance', _('Assurance')),
        ('other', _('Autre')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='imaging_orders',
        verbose_name=_("Organisation")
    )
    order_number = models.CharField(max_length=50, unique=True, verbose_name=_("Numéro de commande"))

    patient = models.ForeignKey(
        'accounts.Client',
        on_delete=models.CASCADE,
        related_name='imaging_orders',
        verbose_name=_("Patient"),
        limit_choices_to={'client_type__in': ['patient', 'both']}
    )
    visit = models.ForeignKey(
        'patients.PatientVisit',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='imaging_orders',
        verbose_name=_("Visite associée")
    )

    order_date = models.DateTimeField(default=timezone.now, verbose_name=_("Date de commande"))
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='prescribed', verbose_name=_("Statut"))
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='routine', verbose_name=_("Priorité"))
    clinical_notes = models.TextField(
        blank=True,
        verbose_name=_("Notes cliniques"),
        help_text=_("Indication clinique pour le radiologue/technicien")
    )

    total_price = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name=_("Prix total"))
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name=_("Réduction totale"))
    payment_method = models.CharField(
        max_length=50, choices=PAYMENT_METHOD_CHOICES, default='cash', verbose_name=_("Méthode de paiement")
    )

    ordered_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ordered_imaging_exams',
        verbose_name=_("Prescrit par")
    )
    # Table partagée avec le module Laboratoire — un même prescripteur externe
    # peut adresser des patients pour du labo ET de l'imagerie.
    prescriber = models.ForeignKey(
        'laboratory.Prescriber',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='imaging_orders',
        verbose_name=_("Prescripteur externe")
    )

    results_completed_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Résultats terminés à"))
    results_entered_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='entered_imaging_results',
        verbose_name=_("Résultats saisis par")
    )
    results_delivered_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Résultats remis à"))

    imaging_invoice = models.ForeignKey(
        'invoicing.Invoice',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='imaging_orders',
        verbose_name=_("Facture imagerie")
    )

    # Sous-traitance — réutilise directement les modèles du module Laboratoire :
    # un même partenaire externe (ex: clinique partenaire) peut recevoir des
    # dépôts de labo ET d'imagerie, pas besoin de dupliquer l'infrastructure.
    subcontractor = models.ForeignKey(
        'laboratory.SubcontractorLab',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='imaging_orders',
        verbose_name=_("Sous-traitant"),
        help_text=_("Si renseigné, l'examen est sous-traité à ce partenaire")
    )
    subcontractor_patient = models.ForeignKey(
        'laboratory.SubcontractorPatient',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='imaging_orders',
        verbose_name=_("Patient sous-traitant")
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Commande d'imagerie")
        verbose_name_plural = _("Commandes d'imagerie")
        ordering = ['-order_date']
        indexes = [
            models.Index(fields=['organization', '-order_date']),
            models.Index(fields=['patient']),
            models.Index(fields=['status']),
        ]

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = self._generate_order_number()
        super().save(*args, **kwargs)

    def _generate_order_number(self):
        """Génère un numéro unique : IMG-YYYYMMDD-0001"""
        return NumberGeneratorService.generate_number(
            prefix='IMG',
            organization=self.organization,
            model_class=ImagingOrder,
            field_name='order_number'
        )

    def __str__(self):
        return f"{self.order_number} - {self.patient.name}"

    @property
    def exams_count(self):
        return self.items.count()

    @property
    def all_results_entered(self):
        """Vrai si tous les items ont un rapport texte renseigné"""
        return self.items.exists() and not self.items.filter(report_text='').exists()

    def start_processing(self):
        self.status = 'in_progress'
        self.save(update_fields=['status', 'updated_at'])

    def mark_results_ready(self, entered_by=None):
        self.status = 'results_ready'
        self.results_completed_at = timezone.now()
        if entered_by:
            self.results_entered_by = entered_by
        self.save(update_fields=['status', 'results_completed_at', 'results_entered_by', 'updated_at'])

    def mark_delivered(self):
        self.status = 'results_delivered'
        self.results_delivered_at = timezone.now()
        self.save(update_fields=['status', 'results_delivered_at', 'updated_at'])

    def cancel_order(self):
        self.status = 'cancelled'
        self.save(update_fields=['status', 'updated_at'])


class ImagingOrderItem(models.Model):
    """Examen individuel au sein d'une commande d'imagerie, avec son rapport"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    imaging_order = models.ForeignKey(
        ImagingOrder,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name=_("Commande")
    )
    exam_type = models.ForeignKey(
        ImagingExamType,
        on_delete=models.PROTECT,
        related_name='order_items',
        verbose_name=_("Examen")
    )

    price = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name=_("Prix"))
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name=_("Réduction"))

    report_text = models.TextField(
        blank=True,
        verbose_name=_("Compte-rendu"),
        help_text=_("Rapport du radiologue/technicien : constatations et conclusion")
    )
    technician_notes = models.TextField(blank=True, verbose_name=_("Notes internes"))
    is_urgent_finding = models.BooleanField(
        default=False,
        verbose_name=_("Découverte urgente"),
        help_text=_("À signaler en priorité au médecin traitant")
    )

    performed_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Examen réalisé à"))
    performed_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='performed_imaging_exams',
        verbose_name=_("Réalisé par")
    )
    report_entered_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Rapport saisi à"))
    report_entered_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reported_imaging_exams',
        verbose_name=_("Rapport saisi par")
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Examen d'imagerie (commande)")
        verbose_name_plural = _("Examens d'imagerie (commande)")
        ordering = ['exam_type__name']

    def __str__(self):
        return f"{self.imaging_order.order_number} - {self.exam_type.name}"


def imaging_result_file_upload_path(instance, filename):
    return f"imaging/results/{timezone.now():%Y/%m}/{filename}"


class ImagingResultFile(models.Model):
    """Image ou PDF joint au résultat d'un examen (plusieurs possibles par examen)"""
    FILE_TYPE_CHOICES = [
        ('image', _('Image')),
        ('pdf', _('PDF')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_item = models.ForeignKey(
        ImagingOrderItem,
        on_delete=models.CASCADE,
        related_name='result_files',
        verbose_name=_("Examen")
    )
    file = models.FileField(upload_to=imaging_result_file_upload_path, verbose_name=_("Fichier"))
    file_type = models.CharField(max_length=10, choices=FILE_TYPE_CHOICES, verbose_name=_("Type de fichier"))
    caption = models.CharField(max_length=200, blank=True, verbose_name=_("Légende"))
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_imaging_files',
        verbose_name=_("Ajouté par")
    )

    class Meta:
        verbose_name = _("Fichier de résultat d'imagerie")
        verbose_name_plural = _("Fichiers de résultat d'imagerie")
        ordering = ['uploaded_at']

    def __str__(self):
        return f"{self.order_item} - {self.file.name}"
