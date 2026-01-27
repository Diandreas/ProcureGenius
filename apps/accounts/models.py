from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.db.models.signals import post_save
from django.dispatch import receiver
import uuid


class Organization(models.Model):
    """Organisation/Entreprise"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, verbose_name=_("Nom de l'organisation"))
    subscription_type = models.CharField(
        max_length=50,
        choices=[
            ('free', _('Gratuit')),
            ('billing', _('Facturation')),
            ('procurement', _('Achats')),
            ('professional', _('Professionnel')),
            ('strategic', _('Stratégique')),
            ('enterprise', _('Entreprise')),
        ],
        default='free',
        verbose_name=_("Type d'abonnement")
    )
    enabled_modules = models.JSONField(
        default=list,
        verbose_name=_("Modules activés"),
        help_text=_("Liste des modules disponibles pour l'organisation")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Organisation")
        verbose_name_plural = _("Organisations")
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    def has_module(self, module_code):
        """Check if organization has access to a specific module"""
        from apps.core.modules import Modules
        
        # Dashboard is always enabled
        if module_code == Modules.DASHBOARD:
            return True
        
        enabled = self.enabled_modules or []
        return module_code in enabled
    
    def get_available_modules(self):
        """Get list of modules available to this organization"""
        from apps.core.modules import Modules, get_modules_for_profile
        
        # If custom modules are set, use them
        if self.enabled_modules:
            return self.enabled_modules
        
        # Otherwise, use profile default
        return get_modules_for_profile(self.subscription_type)
    
    def update_modules_from_profile(self):
        """Update enabled_modules based on subscription_type"""
        from apps.core.modules import get_modules_for_profile
        
        self.enabled_modules = get_modules_for_profile(self.subscription_type)
        self.save(update_fields=['enabled_modules', 'updated_at'])
    
    def save(self, *args, **kwargs):
        """Override save to auto-populate modules if not set"""
        from apps.core.modules import get_modules_for_profile
        
        # Auto-populate modules if empty
        if not self.enabled_modules:
            self.enabled_modules = get_modules_for_profile(self.subscription_type)
        
        super().save(*args, **kwargs)


class CustomUser(AbstractUser):
    """Modèle utilisateur personnalisé"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(max_length=20, blank=True, verbose_name=_("Téléphone"))
    organization = models.ForeignKey(
        Organization,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
        verbose_name=_("Organisation")
    )
    # Garder company pour compatibilité (sera déprécié)
    company = models.CharField(max_length=200, blank=True, verbose_name=_("Entreprise (déprécié)"))
    
    # Rôle utilisateur
    role = models.CharField(
        max_length=50,
        choices=[
            ('admin', _('Administrateur')),
            ('manager', _('Gestionnaire')),
            ('buyer', _('Acheteur')),
            ('accountant', _('Comptable')),
            ('viewer', _('Consultation')),
            # Healthcare roles
            ('doctor', _('Médecin')),
            ('nurse', _('Infirmier/Infirmière')),
            ('lab_tech', _('Technicien de laboratoire')),
            ('pharmacist', _('Pharmacien')),
            ('receptionist', _('Réceptionniste')),
        ],
        default='buyer',
        verbose_name=_("Rôle")
    )

    # Vérification email (pour django-allauth)
    email_verified = models.BooleanField(
        default=False,
        verbose_name=_("Email vérifié")
    )

    class Meta:
        verbose_name = _("Utilisateur")
        verbose_name_plural = _("Utilisateurs")


# Alias pour la compatibilité
User = CustomUser


class Client(models.Model):
    """Modèle pour les clients et patients"""
    
    # Client type choices
    CLIENT_TYPES = [
        ('b2b', _('Entreprise (B2B)')),
        ('patient', _('Patient')),
        ('both', _('Les deux')),
    ]
    
    # Gender choices
    GENDER_CHOICES = [
        ('M', _('Masculin')),
        ('F', _('Féminin')),
        ('O', _('Autre')),
    ]
    
    # Blood type choices
    BLOOD_TYPES = [
        ('A+', 'A+'), ('A-', 'A-'),
        ('B+', 'B+'), ('B-', 'B-'),
        ('AB+', 'AB+'), ('AB-', 'AB-'),
        ('O+', 'O+'), ('O-', 'O-'),
    ]
    
    # Registration source choices
    REGISTRATION_SOURCES = [
        ('internal', _('Interne')),
        ('external', _('Externe (autre hôpital)')),
        ('emergency', _('Urgence')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='clients',
        verbose_name=_("Organisation")
    )
    
    # === Basic Information ===
    name = models.CharField(
        max_length=200,
        verbose_name=_("Nom"),
        help_text=_("Nom complet du client (obligatoire)")
    )
    email = models.EmailField(blank=True, verbose_name=_("Email"))
    phone = models.CharField(max_length=20, blank=True, verbose_name=_("Téléphone"))
    address = models.TextField(blank=True, verbose_name=_("Adresse"))
    contact_person = models.CharField(max_length=100, blank=True, verbose_name=_("Personne contact"))
    tax_id = models.CharField(max_length=50, blank=True, verbose_name=_("Numéro de taxe"))
    payment_terms = models.CharField(max_length=100, default="CASH", blank=True, verbose_name=_("Conditions de paiement"))
    
    # === Client Type (B2B vs Patient) ===
    client_type = models.CharField(
        max_length=20,
        choices=CLIENT_TYPES,
        default='b2b',
        verbose_name=_("Type de client")
    )
    
    # === Patient-specific fields ===
    patient_number = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        unique=True,
        verbose_name=_("Numéro patient"),
        help_text=_("Généré automatiquement pour les patients")
    )
    date_of_birth = models.DateField(
        null=True,
        blank=True,
        verbose_name=_("Date de naissance")
    )
    gender = models.CharField(
        max_length=1,
        choices=GENDER_CHOICES,
        blank=True,
        verbose_name=_("Sexe")
    )
    blood_type = models.CharField(
        max_length=3,
        choices=BLOOD_TYPES,
        blank=True,
        verbose_name=_("Groupe sanguin")
    )
    allergies = models.TextField(
        blank=True,
        verbose_name=_("Allergies"),
        help_text=_("Liste des allergies connues")
    )
    chronic_conditions = models.TextField(
        blank=True,
        verbose_name=_("Conditions chroniques"),
        help_text=_("Maladies chroniques ou conditions permanentes")
    )
    
    # === Emergency Contact ===
    emergency_contact_name = models.CharField(
        max_length=200,
        blank=True,
        verbose_name=_("Contact d'urgence - Nom")
    )
    emergency_contact_phone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name=_("Contact d'urgence - Téléphone")
    )
    
    # === Communication ===
    whatsapp = models.CharField(
        max_length=20,
        blank=True,
        verbose_name=_("WhatsApp"),
        help_text=_("Numéro WhatsApp pour notifications")
    )
    
    # === Registration Source ===
    registration_source = models.CharField(
        max_length=20,
        choices=REGISTRATION_SOURCES,
        blank=True,
        verbose_name=_("Source d'inscription")
    )
    referring_hospital = models.CharField(
        max_length=200,
        blank=True,
        verbose_name=_("Hôpital référent"),
        help_text=_("Pour les patients externes")
    )
    
    # === Status & Activity ===
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    last_activity_date = models.DateTimeField(null=True, blank=True, verbose_name=_("Dernière activité"))
    auto_inactive_since = models.DateTimeField(null=True, blank=True, verbose_name=_("Inactif automatiquement depuis"))
    is_manually_active = models.BooleanField(default=False, verbose_name=_("Statut manuel"), help_text=_("Si True, le statut actif/inactif est géré manuellement et ne sera pas modifié automatiquement"))
    
    # === Timestamps ===
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Client")
        verbose_name_plural = _("Clients")
        ordering = ['name']

    def __str__(self):
        return self.name or "Client sans nom"

    def clean(self):
        """Validation du client"""
        from django.core.exceptions import ValidationError

        errors = {}

        # Vérifier que le nom n'est pas vide
        if not self.name or not self.name.strip():
            errors['name'] = _("Le nom du client est obligatoire.")

        # Nettoyer le nom (enlever les espaces multiples)
        if self.name:
            self.name = ' '.join(self.name.split())

        # NOUVEAU: Vérifier que le téléphone est obligatoire pour les patients
        if self.client_type in ['patient', 'both']:
            if not self.phone or not self.phone.strip():
                errors['phone'] = _("Le numéro de téléphone est obligatoire pour les patients.")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        """Sauvegarder avec validation et génération du numéro patient"""
        self.full_clean()
        
        # Generate patient number for patients
        if self.client_type in ['patient', 'both'] and not self.patient_number:
            self.patient_number = self._generate_patient_number()
        
        super().save(*args, **kwargs)
    
    def _generate_patient_number(self):
        """Generate unique patient number: PAT-YYYYMM-0001"""
        from django.utils import timezone
        now = timezone.now()
        prefix = f"PAT-{now.year}{now.month:02d}"
        
        # Find last patient number with this prefix
        last_patient = Client.objects.filter(
            patient_number__startswith=prefix
        ).order_by('-patient_number').first()
        
        if last_patient and last_patient.patient_number:
            try:
                last_num = int(last_patient.patient_number.split('-')[-1])
                return f"{prefix}-{last_num + 1:04d}"
            except (ValueError, IndexError):
                pass
        
        return f"{prefix}-0001"

    def get_full_name(self):
        """Retourne le nom complet du client (alias pour cohérence avec User)"""
        return self.name
    
    def get_age(self):
        """Calcule l'âge du patient à partir de la date de naissance"""
        if not self.date_of_birth:
            return None
        from django.utils import timezone
        from datetime import date
        today = timezone.now().date()
        born = self.date_of_birth
        return today.year - born.year - ((today.month, today.day) < (born.month, born.day))
    
    @property
    def is_patient(self):
        """Check if this client is a patient"""
        return self.client_type in ['patient', 'both']
    
    @property
    def is_b2b(self):
        """Check if this client is B2B"""
        return self.client_type in ['b2b', 'both']

    @property
    def invoices_count(self):
        """Nombre de factures pour ce client"""
        return self.invoices.count()

    @property
    def total_invoiced(self):
        """Montant total facturé à ce client"""
        from decimal import Decimal
        return sum(Decimal(str(invoice.total_amount)) for invoice in self.invoices.all())

    @property
    def outstanding_balance(self):
        """Solde restant à payer"""
        from decimal import Decimal
        return sum(invoice.get_balance_due() for invoice in self.invoices.filter(status__in=['sent', 'overdue']))

    def update_activity_status(self, inactivity_days=180):
        """
        Met à jour automatiquement le statut actif/inactif basé sur l'activité récente.
        
        Args:
            inactivity_days: Nombre de jours sans activité pour considérer comme inactif (défaut: 180)
        
        Returns:
            bool: True si le statut a été modifié, False sinon
        """
        from django.utils import timezone
        from datetime import timedelta
        
        # Si le statut est géré manuellement, ne pas modifier
        if self.is_manually_active:
            return False
        
        # Trouver la date de la dernière activité (facture)
        last_invoice = self.invoices.exclude(status='cancelled').order_by('-created_at').first()
        
        # Calculer la dernière date d'activité
        if last_invoice:
            last_activity = last_invoice.created_at
        else:
            # Si aucune facture, utiliser la date de création du client
            last_activity = self.created_at
        
        # Mettre à jour last_activity_date
        self.last_activity_date = last_activity
        
        # Calculer si le client est inactif
        cutoff_date = timezone.now() - timedelta(days=inactivity_days)
        was_active = self.is_active
        
        if last_activity < cutoff_date:
            # Client inactif
            self.is_active = False
            if not self.auto_inactive_since:
                self.auto_inactive_since = timezone.now()
        else:
            # Client actif
            self.is_active = True
            self.auto_inactive_since = None
        
        # Sauvegarder seulement si le statut a changé
        if was_active != self.is_active:
            self.save(update_fields=['is_active', 'last_activity_date', 'auto_inactive_since', 'updated_at'])
            return True
        else:
            # Sauvegarder quand même pour mettre à jour last_activity_date
            self.save(update_fields=['last_activity_date', 'updated_at'])
            return False


class UserPreferences(models.Model):
    """Préférences utilisateur pour les modules et l'onboarding"""
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='preferences',
        verbose_name=_("Utilisateur")
    )
    enabled_modules = models.JSONField(
        default=list,
        verbose_name=_("Modules activés pour l'utilisateur"),
        help_text=_("Liste des modules auxquels l'utilisateur a accès")
    )
    onboarding_completed = models.BooleanField(
        default=False,
        verbose_name=_("Onboarding complété")
    )
    onboarding_data = models.JSONField(
        default=dict,
        verbose_name=_("Données d'onboarding"),
        help_text=_("Réponses du questionnaire d'onboarding")
    )
    dashboard_layout = models.JSONField(
        default=dict,
        verbose_name=_("Mise en page du tableau de bord")
    )
    notification_settings = models.JSONField(
        default=dict,
        verbose_name=_("Paramètres de notification")
    )
    preferred_currency = models.CharField(
        max_length=3,
        default='EUR',
        verbose_name=_("Devise préférée"),
        help_text=_("Code ISO de la devise préférée (EUR, USD, XOF, etc.)")
    )
    preferred_language = models.CharField(
        max_length=10,
        default='fr',
        choices=[('fr', 'Français'), ('en', 'English')],
        verbose_name=_("Langue préférée")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Préférence utilisateur")
        verbose_name_plural = _("Préférences utilisateur")
    
    def __str__(self):
        return f"Préférences de {self.user.get_full_name() or self.user.username}"


class UserPermissions(models.Model):
    """Permissions et droits d'accès de l'utilisateur"""
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='permissions',
        verbose_name=_("Utilisateur")
    )
    can_manage_users = models.BooleanField(
        default=False,
        verbose_name=_("Gérer les utilisateurs"),
        help_text=_("Peut créer, modifier et supprimer des utilisateurs")
    )
    can_manage_settings = models.BooleanField(
        default=False,
        verbose_name=_("Gérer les paramètres"),
        help_text=_("Peut modifier les paramètres de l'organisation")
    )
    can_view_analytics = models.BooleanField(
        default=True,
        verbose_name=_("Voir les analytics"),
        help_text=_("Peut accéder aux rapports et analytics")
    )
    can_approve_purchases = models.BooleanField(
        default=False,
        verbose_name=_("Approuver les achats"),
        help_text=_("Peut approuver les bons de commande")
    )
    module_access = models.JSONField(
        default=list,
        verbose_name=_("Accès aux modules"),
        help_text=_("Liste des modules accessibles (sous-ensemble des modules de l'organisation)")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Permission utilisateur")
        verbose_name_plural = _("Permissions utilisateur")
    
    def __str__(self):
        return f"Permissions de {self.user.get_full_name() or self.user.username}"


# Signals pour créer automatiquement les préférences et permissions
@receiver(post_save, sender=CustomUser)
def create_user_preferences_and_permissions(sender, instance, created, **kwargs):
    """Créer automatiquement les préférences et permissions lors de la création d'un utilisateur"""
    if created:
        # Créer les préférences avec modules par défaut selon le rôle
        default_modules = _get_default_modules_for_role(instance.role, instance.organization)
        UserPreferences.objects.get_or_create(
            user=instance,
            defaults={
                'enabled_modules': default_modules,
                'onboarding_completed': False,  # Important: nouveau utilisateur doit passer par l'onboarding
                'onboarding_data': {},
                'dashboard_layout': {},
                'notification_settings': {},
            }
        )
        
        # Créer les permissions selon le rôle
        default_permissions = _get_default_permissions_for_role(instance.role)
        UserPermissions.objects.get_or_create(
            user=instance,
            defaults={
                'module_access': [],  # Liste vide = pas de restriction, utilise les modules de l'organisation
                **default_permissions
            }
        )


def _get_default_modules_for_role(role, organization=None):
    """Retourne les modules par défaut selon le rôle"""
    from apps.core.modules import Modules
    
    # If organization is provided, limit to org's modules
    if organization:
        org_modules = organization.get_available_modules()
    else:
        org_modules = None
    
    role_modules = {
        'admin': [
            Modules.DASHBOARD, Modules.SUPPLIERS, Modules.PURCHASE_ORDERS, 
            Modules.INVOICES, Modules.PRODUCTS, Modules.CLIENTS, 
            Modules.E_SOURCING, Modules.CONTRACTS, Modules.ANALYTICS
        ],
        'manager': [
            Modules.DASHBOARD, Modules.SUPPLIERS, Modules.PURCHASE_ORDERS, 
            Modules.INVOICES, Modules.PRODUCTS, Modules.CLIENTS, 
            Modules.E_SOURCING, Modules.CONTRACTS
        ],
        'buyer': [
            Modules.DASHBOARD, Modules.SUPPLIERS, Modules.PURCHASE_ORDERS, 
            Modules.PRODUCTS
        ],
        'accountant': [
            Modules.DASHBOARD, Modules.INVOICES, Modules.CLIENTS, Modules.PRODUCTS
        ],
        'viewer': [Modules.DASHBOARD],
        # Healthcare roles
        'doctor': [
            Modules.DASHBOARD, Modules.PATIENTS, Modules.CONSULTATIONS,
            Modules.LABORATORY, Modules.PHARMACY
        ],
        'nurse': [
            Modules.DASHBOARD, Modules.PATIENTS, Modules.CONSULTATIONS
        ],
        'lab_tech': [
            Modules.DASHBOARD, Modules.PATIENTS, Modules.LABORATORY
        ],
        'pharmacist': [
            Modules.DASHBOARD, Modules.PATIENTS, Modules.PHARMACY
        ],
        'receptionist': [
            Modules.DASHBOARD, Modules.PATIENTS
        ],
    }
    
    modules = role_modules.get(role, [Modules.DASHBOARD])
    
    # Intersect with org modules if provided
    if org_modules:
        modules = [m for m in modules if m in org_modules]
    
    return modules


def _get_default_permissions_for_role(role):
    """Retourne les permissions par défaut selon le rôle"""
    if role == 'admin':
        return {
            'can_manage_users': True,
            'can_manage_settings': True,
            'can_view_analytics': True,
            'can_approve_purchases': True,
        }
    elif role == 'manager':
        return {
            'can_manage_users': False,
            'can_manage_settings': True,
            'can_view_analytics': True,
            'can_approve_purchases': True,
        }
    elif role == 'buyer':
        return {
            'can_manage_users': False,
            'can_manage_settings': False,
            'can_view_analytics': True,
            'can_approve_purchases': False,
        }
    elif role == 'accountant':
        return {
            'can_manage_users': False,
            'can_manage_settings': False,
            'can_view_analytics': True,
            'can_approve_purchases': False,
        }
    else:  # viewer
        return {
            'can_manage_users': False,
            'can_manage_settings': False,
            'can_view_analytics': False,
            'can_approve_purchases': False,
        }


class EmailConfiguration(models.Model):
    """Configuration SMTP par organisation"""
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name='email_config',
        verbose_name=_("Organisation")
    )
    smtp_host = models.CharField(max_length=255, verbose_name=_("Serveur SMTP"))
    smtp_port = models.IntegerField(default=587, verbose_name=_("Port SMTP"))
    smtp_username = models.CharField(max_length=255, verbose_name=_("Nom d'utilisateur SMTP"))
    smtp_password_encrypted = models.TextField(verbose_name=_("Mot de passe SMTP (chiffré)"))
    use_tls = models.BooleanField(default=True, verbose_name=_("Utiliser TLS"))
    use_ssl = models.BooleanField(default=False, verbose_name=_("Utiliser SSL"))
    default_from_email = models.EmailField(verbose_name=_("Email expéditeur par défaut"))
    default_from_name = models.CharField(max_length=100, verbose_name=_("Nom expéditeur par défaut"))
    is_verified = models.BooleanField(default=False, verbose_name=_("Vérifié"))
    last_verified_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Dernière vérification"))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Date de création"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Date de modification"))

    class Meta:
        verbose_name = _("Configuration email")
        verbose_name_plural = _("Configurations email")
        ordering = ['-updated_at']

    def __str__(self):
        return f"Email config - {self.organization.name}"

    def get_decrypted_password(self):
        """Récupère le mot de passe déchiffré"""
        from apps.core.encryption import decrypt_value
        import logging
        logger = logging.getLogger(__name__)
        try:
            password = decrypt_value(self.smtp_password_encrypted)
            if password:
                # S'assurer qu'il n'y a pas d'espaces (important pour Gmail App Password)
                password = password.strip().replace(' ', '')
            return password
        except Exception as e:
            logger.error(f"Error decrypting password: {e}")
            return None