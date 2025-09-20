from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid


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
