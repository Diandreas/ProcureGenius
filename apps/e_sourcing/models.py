from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.utils import timezone
import uuid
import secrets

User = get_user_model()


class SourcingEvent(models.Model):
    """Événement de sourcing (RFQ uniquement pour MVP)"""

    EVENT_TYPE_CHOICES = [
        ('rfq', _('Demande de Prix (RFQ)')),
    ]

    STATUS_CHOICES = [
        ('draft', _('Brouillon')),
        ('published', _('Publié')),
        ('in_progress', _('En cours')),
        ('evaluation', _('Évaluation')),
        ('awarded', _('Attribué')),
        ('cancelled', _('Annulé')),
        ('closed', _('Clôturé')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_number = models.CharField(max_length=50, unique=True, verbose_name=_("Numéro d'événement"))
    event_type = models.CharField(max_length=20, choices=EVENT_TYPE_CHOICES, default='rfq', verbose_name=_("Type d'événement"))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name=_("Statut"))

    # Token d'accès public pour l'événement (sans invitation)
    public_token = models.CharField(max_length=64, unique=True, editable=False, blank=True, default='', verbose_name=_("Token public"))

    # Informations générales
    title = models.CharField(max_length=200, verbose_name=_("Titre"))
    description = models.TextField(verbose_name=_("Description"))
    requirements = models.TextField(blank=True, verbose_name=_("Exigences"))
    terms_and_conditions = models.TextField(blank=True, verbose_name=_("Termes et conditions"))

    # Dates
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Date de création"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Date de modification"))
    published_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Date de publication"))
    submission_deadline = models.DateTimeField(verbose_name=_("Date limite de soumission"))
    evaluation_deadline = models.DateField(null=True, blank=True, verbose_name=_("Date limite d'évaluation"))

    # Relations
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_sourcing_events', verbose_name=_("Créé par"))

    # Budget estimé
    estimated_budget = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True, verbose_name=_("Budget estimé"))

    # Critères d'évaluation (stockés en JSON)
    evaluation_criteria = models.JSONField(default=dict, blank=True, verbose_name=_("Critères d'évaluation"))

    class Meta:
        verbose_name = _("Événement de sourcing")
        verbose_name_plural = _("Événements de sourcing")
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.event_number} - {self.title}"

    def save(self, *args, **kwargs):
        if not self.event_number:
            self.event_number = self.generate_event_number()
        if not self.public_token:
            self.public_token = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

    def generate_event_number(self):
        """Génère un numéro d'événement unique au format RFQ202501-0001"""
        from datetime import datetime
        year = datetime.now().year
        month = datetime.now().month

        # Trouve le prochain numéro disponible
        last_event = SourcingEvent.objects.filter(
            event_number__startswith=f"RFQ{year}{month:02d}"
        ).order_by('-event_number').first()

        if last_event:
            try:
                last_number = int(last_event.event_number.split('-')[1])
                next_number = last_number + 1
            except (ValueError, IndexError):
                next_number = 1
        else:
            next_number = 1

        return f"RFQ{year}{month:02d}-{next_number:04d}"

    def publish(self):
        """Publie l'événement et envoie les invitations"""
        if self.status == 'draft':
            self.status = 'published'
            self.published_at = timezone.now()
            self.save(update_fields=['status', 'published_at'])
            return True
        return False

    def can_submit_bid(self):
        """Vérifie si les soumissions sont encore possibles"""
        return self.status == 'published' and timezone.now() < self.submission_deadline

    def get_public_url(self):
        """Retourne l'URL publique pour l'événement"""
        from django.conf import settings
        base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        return f"{base_url}/sourcing/public/{self.public_token}"

    @property
    def total_invitations(self):
        """Retourne le nombre total d'invitations"""
        return self.invitations.count()

    @property
    def total_bids(self):
        """Retourne le nombre total de soumissions"""
        return self.bids.count()


class SupplierInvitation(models.Model):
    """Invitation d'un fournisseur à un événement de sourcing"""

    STATUS_CHOICES = [
        ('pending', _('En attente')),
        ('sent', _('Envoyé')),
        ('viewed', _('Vu')),
        ('accepted', _('Accepté')),
        ('declined', _('Refusé')),
        ('expired', _('Expiré')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sourcing_event = models.ForeignKey(SourcingEvent, on_delete=models.CASCADE, related_name='invitations', verbose_name=_("Événement de sourcing"))
    supplier = models.ForeignKey('suppliers.Supplier', on_delete=models.CASCADE, related_name='sourcing_invitations', verbose_name=_("Fournisseur"))

    # Token d'accès unique pour accès public
    access_token = models.CharField(max_length=64, unique=True, editable=False, blank=True, default='', verbose_name=_("Token d'accès"))

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name=_("Statut"))

    # Dates
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Date de création"))
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Date d'envoi"))
    viewed_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Date de consultation"))
    responded_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Date de réponse"))

    # Message personnalisé
    invitation_message = models.TextField(blank=True, verbose_name=_("Message d'invitation"))
    decline_reason = models.TextField(blank=True, verbose_name=_("Raison du refus"))

    class Meta:
        verbose_name = _("Invitation fournisseur")
        verbose_name_plural = _("Invitations fournisseurs")
        unique_together = [('sourcing_event', 'supplier')]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.sourcing_event.event_number} - {self.supplier.name}"

    def save(self, *args, **kwargs):
        if not self.access_token:
            self.access_token = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

    def get_public_url(self):
        """Retourne l'URL publique pour accéder à l'invitation"""
        from django.conf import settings
        base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        return f"{base_url}/sourcing/submit/{self.access_token}"

    def mark_as_sent(self):
        """Marque l'invitation comme envoyée"""
        if self.status == 'pending':
            self.status = 'sent'
            self.sent_at = timezone.now()
            self.save(update_fields=['status', 'sent_at'])

    def mark_as_viewed(self):
        """Marque l'invitation comme vue"""
        if self.status == 'sent' and not self.viewed_at:
            self.status = 'viewed'
            self.viewed_at = timezone.now()
            self.save(update_fields=['status', 'viewed_at'])


class SupplierBid(models.Model):
    """Soumission d'un fournisseur pour un événement de sourcing"""

    STATUS_CHOICES = [
        ('draft', _('Brouillon')),
        ('submitted', _('Soumis')),
        ('under_review', _('En révision')),
        ('shortlisted', _('Présélectionné')),
        ('awarded', _('Retenu')),
        ('rejected', _('Rejeté')),
        ('withdrawn', _('Retiré')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sourcing_event = models.ForeignKey(SourcingEvent, on_delete=models.CASCADE, related_name='bids', verbose_name=_("Événement de sourcing"))
    supplier = models.ForeignKey('suppliers.Supplier', on_delete=models.CASCADE, related_name='bids', verbose_name=_("Fournisseur"))
    invitation = models.OneToOneField(SupplierInvitation, on_delete=models.SET_NULL, null=True, blank=True, related_name='bid', verbose_name=_("Invitation"))

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name=_("Statut"))

    # Informations de la soumission
    cover_letter = models.TextField(blank=True, verbose_name=_("Lettre de présentation"))
    technical_response = models.TextField(blank=True, verbose_name=_("Réponse technique"))
    terms_accepted = models.BooleanField(default=False, verbose_name=_("Termes acceptés"))

    # Montants
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name=_("Sous-total"))
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name=_("Montant des taxes"))
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name=_("Montant total"))

    # Dates
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Date de création"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Date de modification"))
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Date de soumission"))

    # Délai de livraison proposé (en jours)
    delivery_time_days = models.PositiveIntegerField(null=True, blank=True, verbose_name=_("Délai de livraison (jours)"))

    # Évaluation
    evaluation_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name=_("Score d'évaluation"))
    evaluation_notes = models.TextField(blank=True, verbose_name=_("Notes d'évaluation"))
    evaluated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='evaluated_bids', verbose_name=_("Évalué par"))
    evaluated_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Date d'évaluation"))

    class Meta:
        verbose_name = _("Soumission fournisseur")
        verbose_name_plural = _("Soumissions fournisseurs")
        unique_together = [('sourcing_event', 'supplier')]
        ordering = ['-submitted_at', '-created_at']

    def __str__(self):
        return f"{self.sourcing_event.event_number} - {self.supplier.name}"

    def save(self, *args, **kwargs):
        # Recalculer le total si nécessaire
        if self.subtotal and self.tax_amount is not None:
            self.total_amount = self.subtotal + self.tax_amount
        super().save(*args, **kwargs)

    def submit(self):
        """Soumet la soumission"""
        if self.status == 'draft' and self.sourcing_event.can_submit_bid():
            self.status = 'submitted'
            self.submitted_at = timezone.now()
            self.save(update_fields=['status', 'submitted_at'])

            # Marque l'invitation comme acceptée si elle existe
            if self.invitation and self.invitation.status in ['sent', 'viewed']:
                self.invitation.status = 'accepted'
                self.invitation.responded_at = timezone.now()
                self.invitation.save(update_fields=['status', 'responded_at'])

            return True
        return False

    def recalculate_totals(self):
        """Recalcule les totaux basés sur les items"""
        items = self.items.all()
        self.subtotal = sum(item.total_price for item in items)
        self.save(update_fields=['subtotal', 'total_amount'])

    @property
    def is_editable(self):
        """Vérifie si la soumission peut être modifiée"""
        return self.status in ['draft'] and self.sourcing_event.can_submit_bid()


class BidItem(models.Model):
    """Article d'une soumission fournisseur"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bid = models.ForeignKey(SupplierBid, on_delete=models.CASCADE, related_name='items', verbose_name=_("Soumission"))
    product = models.ForeignKey(
        'invoicing.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bid_items',
        verbose_name=_("Produit catalogue")
    )

    # Informations produit/service
    product_reference = models.CharField(max_length=100, verbose_name=_("Référence produit"))
    description = models.CharField(max_length=500, verbose_name=_("Description"))
    specifications = models.TextField(blank=True, verbose_name=_("Spécifications"))

    # Prix et quantité
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)], verbose_name=_("Quantité"))
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], verbose_name=_("Prix unitaire"))
    total_price = models.DecimalField(max_digits=14, decimal_places=2, verbose_name=_("Prix total"))

    # Unité de mesure
    unit_of_measure = models.CharField(max_length=20, default="unité", verbose_name=_("Unité de mesure"))

    # Dates
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Notes supplémentaires
    notes = models.TextField(blank=True, verbose_name=_("Notes"))

    class Meta:
        verbose_name = _("Article de soumission")
        verbose_name_plural = _("Articles de soumission")
        ordering = ['created_at']

    def __str__(self):
        return f"{self.product_reference} - {self.description}"

    def save(self, *args, **kwargs):
        # Synchroniser avec product si défini
        if self.product:
            self.product_reference = self.product.reference
            if not self.description or self.description == "":
                self.description = self.product.name
            if not self.unit_price or self.unit_price == 0:
                self.unit_price = self.product.price

        # Calcul automatique du prix total
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)

        # Recalcule les totaux de la soumission
        self.bid.recalculate_totals()


class BidderAuth(models.Model):
    """Authentification OTP pour les soumissionnaires publics (protection DDoS)"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(verbose_name=_("Email"))
    sourcing_event = models.ForeignKey(
        SourcingEvent,
        on_delete=models.CASCADE,
        related_name='bidder_auths',
        verbose_name=_("Événement de sourcing")
    )

    # Code OTP à 6 chiffres
    otp_code = models.CharField(max_length=6, verbose_name=_("Code OTP"))
    otp_expires_at = models.DateTimeField(verbose_name=_("Expiration OTP"))

    # Session token après vérification
    session_token = models.CharField(max_length=64, unique=True, blank=True, verbose_name=_("Token de session"))
    verified_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Vérifié le"))

    # Rate limiting
    attempts = models.PositiveIntegerField(default=0, verbose_name=_("Tentatives"))
    blocked_until = models.DateTimeField(null=True, blank=True, verbose_name=_("Bloqué jusqu'à"))

    # Métadonnées
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name=_("Adresse IP"))
    user_agent = models.TextField(blank=True, verbose_name=_("User Agent"))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Mis à jour le"))

    class Meta:
        verbose_name = _("Authentification soumissionnaire")
        verbose_name_plural = _("Authentifications soumissionnaires")
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email', 'sourcing_event']),
            models.Index(fields=['session_token']),
            models.Index(fields=['otp_expires_at']),
        ]

    def __str__(self):
        return f"{self.email} - {self.sourcing_event.event_number}"

    def save(self, *args, **kwargs):
        if not self.session_token:
            self.session_token = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

    @staticmethod
    def generate_otp():
        """Génère un code OTP à 6 chiffres"""
        import random
        return f"{random.randint(100000, 999999)}"

    def is_valid_otp(self, otp_code):
        """Vérifie si le code OTP est valide"""
        if self.is_blocked():
            return False
        if timezone.now() > self.otp_expires_at:
            return False
        return self.otp_code == otp_code

    def verify_otp(self, otp_code):
        """Vérifie et valide le code OTP"""
        if self.is_valid_otp(otp_code):
            self.verified_at = timezone.now()
            self.attempts = 0
            self.save(update_fields=['verified_at', 'attempts', 'updated_at'])
            return True
        else:
            self.attempts += 1
            # Bloquer après 3 tentatives échouées
            if self.attempts >= 3:
                from datetime import timedelta
                self.blocked_until = timezone.now() + timedelta(minutes=15)
            self.save(update_fields=['attempts', 'blocked_until', 'updated_at'])
            return False

    def is_blocked(self):
        """Vérifie si l'authentification est bloquée"""
        if self.blocked_until and timezone.now() < self.blocked_until:
            return True
        return False

    def is_verified(self):
        """Vérifie si l'email a été vérifié"""
        return self.verified_at is not None and not self.is_otp_expired()

    def is_otp_expired(self):
        """Vérifie si l'OTP a expiré"""
        return timezone.now() > self.otp_expires_at

    @classmethod
    def create_otp_for_email(cls, email, sourcing_event, ip_address=None, user_agent=None):
        """Crée ou met à jour un OTP pour un email"""
        from datetime import timedelta

        # Vérifier le rate limiting: max 3 OTP par heure
        one_hour_ago = timezone.now() - timedelta(hours=1)
        recent_auths = cls.objects.filter(
            email=email,
            sourcing_event=sourcing_event,
            created_at__gte=one_hour_ago
        ).count()

        if recent_auths >= 3:
            raise ValueError("Trop de tentatives. Veuillez réessayer dans une heure.")

        # Créer un nouveau OTP
        otp_code = cls.generate_otp()
        otp_expires_at = timezone.now() + timedelta(minutes=10)

        auth = cls.objects.create(
            email=email,
            sourcing_event=sourcing_event,
            otp_code=otp_code,
            otp_expires_at=otp_expires_at,
            ip_address=ip_address,
            user_agent=user_agent
        )

        return auth
