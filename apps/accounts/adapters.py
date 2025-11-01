"""
Adapters personnalisés pour django-allauth
Gère la création automatique de UserPreferences et Organization lors de l'inscription
"""
from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings


class CustomAccountAdapter(DefaultAccountAdapter):
    """
    Adapter pour l'inscription classique (email/password)
    """

    def is_open_for_signup(self, request):
        """Autoriser l'inscription"""
        return True

    def save_user(self, request, user, form, commit=True):
        """
        Sauvegarde l'utilisateur et crée automatiquement:
        - UserPreferences
        - Organization (si nécessaire)
        """
        user = super().save_user(request, user, form, commit=False)

        # Le signal post_save créera automatiquement UserPreferences
        # (défini dans apps/accounts/signals.py)

        if commit:
            user.save()

        return user


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Adapter pour l'inscription via Google OAuth
    """

    def is_open_for_signup(self, request, sociallogin):
        """Autoriser l'inscription via Google"""
        return True

    def pre_social_login(self, request, sociallogin):
        """
        Appelé après qu'un utilisateur se soit connecté avec succès via un provider social,
        mais avant que le login ne soit traité.
        """
        # Si l'utilisateur existe déjà avec cet email, lier le compte social
        if sociallogin.is_existing:
            return

        # Essayer de trouver un utilisateur existant avec le même email
        try:
            from apps.accounts.models import CustomUser
            email = sociallogin.account.extra_data.get('email', '').lower()

            if email:
                existing_user = CustomUser.objects.get(email=email)
                # Lier le compte social à l'utilisateur existant
                sociallogin.connect(request, existing_user)
        except CustomUser.DoesNotExist:
            pass

    def save_user(self, request, sociallogin, form=None):
        """
        Sauvegarde l'utilisateur lors de l'inscription via Google
        """
        user = sociallogin.user

        # Récupérer les données de Google
        data = sociallogin.account.extra_data

        # Remplir les informations depuis Google
        user.email = data.get('email', '').lower()

        if not user.username:
            # Utiliser email comme username si pas déjà défini
            user.username = user.email

        # Remplir nom et prénom si disponibles
        if not user.first_name and data.get('given_name'):
            user.first_name = data.get('given_name', '')

        if not user.last_name and data.get('family_name'):
            user.last_name = data.get('family_name', '')

        # Email vérifié automatiquement pour Google
        user.email_verified = True

        user.save()

        # Le signal post_save créera automatiquement UserPreferences

        return user

    def populate_user(self, request, sociallogin, data):
        """
        Remplit les données utilisateur depuis le provider social
        """
        user = super().populate_user(request, sociallogin, data)

        # Données supplémentaires de Google
        user.email = data.get('email', '').lower()
        user.first_name = data.get('given_name', '')
        user.last_name = data.get('family_name', '')

        return user
