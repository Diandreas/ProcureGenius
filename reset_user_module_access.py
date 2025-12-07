"""
Script pour réinitialiser les restrictions de modules individuelles
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.accounts.models import CustomUser, UserPermissions

def reset_user_module_access():
    """Vider les restrictions module_access pour tous les utilisateurs"""

    # Obtenir toutes les permissions utilisateurs
    all_permissions = UserPermissions.objects.all()

    print(f"📊 Total permissions à mettre à jour: {all_permissions.count()}\n")

    for perm in all_permissions:
        user = perm.user
        print(f"👤 Utilisateur: {user.email}")
        print(f"   Avant module_access: {perm.module_access}")

        # Vider module_access pour utiliser tous les modules de l'organisation
        perm.module_access = []
        perm.save()

        print(f"   Après module_access: {perm.module_access}")
        print(f"   ✅ Réinitialisé\n")

    print("✨ Terminé ! Tous les utilisateurs utilisent maintenant les modules de leur organisation.")

if __name__ == '__main__':
    reset_user_module_access()
