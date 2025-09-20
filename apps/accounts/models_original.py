from django.contrib.auth.models import AbstractUser
from django.db import models
from django_tenants.models import TenantMixin, DomainMixin
from djmoney import models as money_models
import uuid


class Tenant(TenantMixin):
    """Modèle tenant pour multi-tenancy"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, verbose_name="Nom de l'entreprise")
    business_number = models.CharField(max_length=15, blank=True, verbose_name="Numéro d'entreprise")
    address = models.TextField(verbose_name="Adresse")
    city = models.CharField(max_length=100, verbose_name="Ville")
    province = models.CharField(max_length=2, choices=[
        ('AB', 'Alberta'), ('BC', 'Colombie-Britannique'), ('MB', 'Manitoba'),
        ('NB', 'Nouveau-Brunswick'), ('NL', 'Terre-Neuve-et-Labrador'),
        ('NS', 'Nouvelle-Écosse'), ('ON', 'Ontario'), ('PE', 'Île-du-Prince-Édouard'),
        ('QC', 'Québec'), ('SK', 'Saskatchewan'), ('NT', 'Territoires du Nord-Ouest'),
        ('NU', 'Nunavut'), ('YT', 'Yukon')
    ], verbose_name="Province")
    postal_code = models.CharField(max_length=7, verbose_name="Code postal")
    phone = models.CharField(max_length=20, verbose_name="Téléphone")
    email = models.EmailField(verbose_name="Email")
    
    # Configuration IA
    ai_enabled = models.BooleanField(default=True, verbose_name="IA activée")
    ai_automation_level = models.CharField(max_length=20, choices=[
        ('manual', 'Manuel uniquement'),
        ('assisted', 'Assisté par IA'),
        ('supervised', 'Automatisation supervisée'),
        ('full', 'Automatisation complète')
    ], default='assisted', verbose_name="Niveau d'automatisation IA")
    
    # Dates
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    auto_create_schema = True

    class Meta:
        verbose_name = "Locataire"
        verbose_name_plural = "Locataires"

    def __str__(self):
        return self.name


class Domain(DomainMixin):
    """Domaines associés aux tenants"""
    pass


class CustomUser(AbstractUser):
    """Utilisateur étendu"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    language = models.CharField(max_length=2, choices=[
        ('fr', 'Français'), 
        ('en', 'English')
    ], default='fr', verbose_name="Langue")
    role = models.CharField(max_length=50, choices=[
        ('admin', 'Administrateur'),
        ('manager', 'Gestionnaire'),
        ('buyer', 'Acheteur'),
        ('accountant', 'Comptable'),
        ('viewer', 'Consultation')
    ], default='buyer', verbose_name="Rôle")
    
    # Préférences IA
    ai_notifications = models.BooleanField(default=True, verbose_name="Notifications IA")
    ai_auto_approve_limit = money_models.MoneyField(
        max_digits=14, decimal_places=2, default_currency='CAD', 
        null=True, blank=True, verbose_name="Limite d'approbation automatique IA"
    )

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.username})"

    def get_role_display_fr(self):
        """Retourne le rôle en français"""
        roles_fr = {
            'admin': 'Administrateur',
            'manager': 'Gestionnaire',
            'buyer': 'Acheteur',
            'accountant': 'Comptable',
            'viewer': 'Consultation'
        }
        return roles_fr.get(self.role, self.role)


class UserPreferences(models.Model):
    """Préférences utilisateur"""
    user = models.OneToOneField(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name='preferences',
        verbose_name="Utilisateur"
    )
    dashboard_layout = models.JSONField(default=dict, verbose_name="Mise en page du tableau de bord")
    notification_settings = models.JSONField(default=dict, verbose_name="Paramètres de notification")
    ai_learning_data = models.JSONField(default=dict, verbose_name="Données d'apprentissage IA")

    class Meta:
        verbose_name = "Préférence utilisateur"
        verbose_name_plural = "Préférences utilisateur"

    def __str__(self):
        return f"Préférences de {self.user.get_full_name()}"