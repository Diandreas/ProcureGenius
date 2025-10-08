from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid
from datetime import timedelta

User = get_user_model()


class Contract(models.Model):
    """Contrat avec gestion du cycle de vie"""

    CONTRACT_TYPE_CHOICES = [
        ('purchase', _('Contrat d\'achat')),
        ('service', _('Contrat de service')),
        ('maintenance', _('Contrat de maintenance')),
        ('lease', _('Contrat de location')),
        ('nda', _('Accord de confidentialité')),
        ('partnership', _('Accord de partenariat')),
        ('other', _('Autre')),
    ]

    STATUS_CHOICES = [
        ('draft', _('Brouillon')),
        ('pending_review', _('En révision')),
        ('pending_approval', _('En attente d\'approbation')),
        ('approved', _('Approuvé')),
        ('active', _('Actif')),
        ('expiring_soon', _('Expire bientôt')),
        ('expired', _('Expiré')),
        ('terminated', _('Résilié')),
        ('renewed', _('Renouvelé')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract_number = models.CharField(max_length=50, unique=True, verbose_name=_("Numéro de contrat"))
    title = models.CharField(max_length=200, verbose_name=_("Titre"))
    contract_type = models.CharField(max_length=20, choices=CONTRACT_TYPE_CHOICES, verbose_name=_("Type de contrat"))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name=_("Statut"))

    # Parties
    supplier = models.ForeignKey('suppliers.Supplier', on_delete=models.PROTECT, related_name='contracts', verbose_name=_("Fournisseur"))
    internal_contact = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_contracts', verbose_name=_("Contact interne"))

    # Description et termes
    description = models.TextField(verbose_name=_("Description"))
    terms_and_conditions = models.TextField(blank=True, verbose_name=_("Termes et conditions"))
    payment_terms = models.CharField(max_length=200, blank=True, verbose_name=_("Conditions de paiement"))

    # Dates
    start_date = models.DateField(verbose_name=_("Date de début"))
    end_date = models.DateField(verbose_name=_("Date de fin"))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Date de création"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Date de modification"))
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Date d'approbation"))
    terminated_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Date de résiliation"))

    # Montants
    total_value = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)], verbose_name=_("Valeur totale"))
    currency = models.CharField(max_length=3, default='CAD', verbose_name=_("Devise"))

    # Renouvellement
    auto_renewal = models.BooleanField(default=False, verbose_name=_("Renouvellement automatique"))
    renewal_notice_days = models.PositiveIntegerField(default=30, verbose_name=_("Jours de préavis pour renouvellement"))
    renewal_count = models.PositiveIntegerField(default=0, verbose_name=_("Nombre de renouvellements"))

    # Alertes
    alert_days_before_expiry = models.PositiveIntegerField(default=30, verbose_name=_("Alerte (jours avant expiration)"))
    last_alert_sent = models.DateTimeField(null=True, blank=True, verbose_name=_("Dernière alerte envoyée"))

    # Métadonnées
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_contracts', verbose_name=_("Créé par"))
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_contracts', verbose_name=_("Approuvé par"))

    # Notes internes
    internal_notes = models.TextField(blank=True, verbose_name=_("Notes internes"))

    class Meta:
        verbose_name = _("Contrat")
        verbose_name_plural = _("Contrats")
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.contract_number} - {self.title}"

    def save(self, *args, **kwargs):
        if not self.contract_number:
            self.contract_number = self.generate_contract_number()
        super().save(*args, **kwargs)

    def generate_contract_number(self):
        """Génère un numéro de contrat unique au format CTR202501-0001"""
        from datetime import datetime
        year = datetime.now().year
        month = datetime.now().month

        last_contract = Contract.objects.filter(
            contract_number__startswith=f"CTR{year}{month:02d}"
        ).order_by('-contract_number').first()

        if last_contract:
            try:
                last_number = int(last_contract.contract_number.split('-')[1])
                next_number = last_number + 1
            except (ValueError, IndexError):
                next_number = 1
        else:
            next_number = 1

        return f"CTR{year}{month:02d}-{next_number:04d}"

    @property
    def days_until_expiry(self):
        """Retourne le nombre de jours avant expiration"""
        if self.end_date:
            delta = self.end_date - timezone.now().date()
            return delta.days
        return None

    @property
    def is_expiring_soon(self):
        """Vérifie si le contrat expire bientôt"""
        days = self.days_until_expiry
        if days is not None:
            return 0 <= days <= self.alert_days_before_expiry
        return False

    @property
    def is_expired(self):
        """Vérifie si le contrat est expiré"""
        if self.end_date:
            return timezone.now().date() > self.end_date
        return False

    def approve(self, user):
        """Approuve le contrat"""
        if self.status in ['draft', 'pending_review', 'pending_approval']:
            self.status = 'approved'
            self.approved_by = user
            self.approved_at = timezone.now()
            self.save(update_fields=['status', 'approved_by', 'approved_at'])
            return True
        return False

    def activate(self):
        """Active le contrat"""
        if self.status == 'approved':
            self.status = 'active'
            self.save(update_fields=['status'])
            return True
        return False

    def terminate(self):
        """Résilie le contrat"""
        if self.status in ['active', 'expiring_soon']:
            self.status = 'terminated'
            self.terminated_at = timezone.now()
            self.save(update_fields=['status', 'terminated_at'])
            return True
        return False

    def update_status(self):
        """Met à jour le statut en fonction des dates"""
        if self.status == 'active':
            if self.is_expired:
                self.status = 'expired'
                self.save(update_fields=['status'])
            elif self.is_expiring_soon:
                self.status = 'expiring_soon'
                self.save(update_fields=['status'])


class ContractClause(models.Model):
    """Clause de contrat extraite par IA"""

    CLAUSE_TYPE_CHOICES = [
        ('payment', _('Paiement')),
        ('delivery', _('Livraison')),
        ('warranty', _('Garantie')),
        ('liability', _('Responsabilité')),
        ('termination', _('Résiliation')),
        ('confidentiality', _('Confidentialité')),
        ('intellectual_property', _('Propriété intellectuelle')),
        ('dispute_resolution', _('Résolution des litiges')),
        ('force_majeure', _('Force majeure')),
        ('renewal', _('Renouvellement')),
        ('penalty', _('Pénalité')),
        ('sla', _('SLA / Niveau de service')),
        ('other', _('Autre')),
    ]

    RISK_LEVEL_CHOICES = [
        ('low', _('Faible')),
        ('medium', _('Moyen')),
        ('high', _('Élevé')),
        ('critical', _('Critique')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='clauses', verbose_name=_("Contrat"))

    # Informations de la clause
    clause_type = models.CharField(max_length=30, choices=CLAUSE_TYPE_CHOICES, verbose_name=_("Type de clause"))
    title = models.CharField(max_length=200, verbose_name=_("Titre"))
    content = models.TextField(verbose_name=_("Contenu"))
    section_reference = models.CharField(max_length=50, blank=True, verbose_name=_("Référence de section"))

    # Analyse IA
    risk_level = models.CharField(max_length=20, choices=RISK_LEVEL_CHOICES, null=True, blank=True, verbose_name=_("Niveau de risque"))
    ai_confidence_score = models.FloatField(validators=[MinValueValidator(0), MaxValueValidator(100)], null=True, blank=True, verbose_name=_("Score de confiance IA"))
    ai_analysis = models.TextField(blank=True, verbose_name=_("Analyse IA"))
    ai_recommendations = models.TextField(blank=True, verbose_name=_("Recommandations IA"))

    # Métadonnées
    extracted_by_ai = models.BooleanField(default=False, verbose_name=_("Extrait par IA"))
    verified = models.BooleanField(default=False, verbose_name=_("Vérifié"))
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_clauses', verbose_name=_("Vérifié par"))
    verified_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Date de vérification"))

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Clause de contrat")
        verbose_name_plural = _("Clauses de contrat")
        ordering = ['contract', 'clause_type', 'created_at']

    def __str__(self):
        return f"{self.get_clause_type_display()} - {self.title}"

    def verify(self, user):
        """Marque la clause comme vérifiée"""
        self.verified = True
        self.verified_by = user
        self.verified_at = timezone.now()
        self.save(update_fields=['verified', 'verified_by', 'verified_at'])


class ContractMilestone(models.Model):
    """Jalon ou événement important du contrat"""

    STATUS_CHOICES = [
        ('pending', _('En attente')),
        ('completed', _('Complété')),
        ('delayed', _('Retardé')),
        ('cancelled', _('Annulé')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='milestones', verbose_name=_("Contrat"))

    title = models.CharField(max_length=200, verbose_name=_("Titre"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    due_date = models.DateField(verbose_name=_("Date d'échéance"))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name=_("Statut"))

    # Montant associé (optionnel)
    payment_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)], verbose_name=_("Montant du paiement"))

    # Complétion
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Date de complétion"))
    completed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='completed_milestones', verbose_name=_("Complété par"))

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Jalon de contrat")
        verbose_name_plural = _("Jalons de contrat")
        ordering = ['due_date', 'created_at']

    def __str__(self):
        return f"{self.title} - {self.due_date}"

    def complete(self, user):
        """Marque le jalon comme complété"""
        if self.status == 'pending':
            self.status = 'completed'
            self.completed_at = timezone.now()
            self.completed_by = user
            self.save(update_fields=['status', 'completed_at', 'completed_by'])
            return True
        return False

    @property
    def is_overdue(self):
        """Vérifie si le jalon est en retard"""
        if self.status == 'pending' and self.due_date:
            return timezone.now().date() > self.due_date
        return False


class ContractDocument(models.Model):
    """Document attaché à un contrat"""

    DOCUMENT_TYPE_CHOICES = [
        ('contract', _('Contrat principal')),
        ('amendment', _('Amendement')),
        ('annex', _('Annexe')),
        ('invoice', _('Facture')),
        ('correspondence', _('Correspondance')),
        ('other', _('Autre')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='documents', verbose_name=_("Contrat"))

    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPE_CHOICES, verbose_name=_("Type de document"))
    title = models.CharField(max_length=200, verbose_name=_("Titre"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    file = models.FileField(upload_to='contracts/documents/%Y/%m/', verbose_name=_("Fichier"))

    # Métadonnées
    file_size = models.PositiveIntegerField(null=True, blank=True, verbose_name=_("Taille du fichier (bytes)"))
    mime_type = models.CharField(max_length=100, blank=True, verbose_name=_("Type MIME"))

    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='uploaded_contract_docs', verbose_name=_("Téléchargé par"))
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Date de téléchargement"))

    class Meta:
        verbose_name = _("Document de contrat")
        verbose_name_plural = _("Documents de contrat")
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.title} ({self.get_document_type_display()})"

    def save(self, *args, **kwargs):
        if self.file:
            self.file_size = self.file.size
        super().save(*args, **kwargs)
