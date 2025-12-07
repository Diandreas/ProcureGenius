"""
Script complet pour corriger tous les problèmes de modules
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.accounts.models import CustomUser, UserPermissions, Organization

# Mapping ancien -> nouveau
MODULE_MAPPING = {
    'purchase_orders': 'purchase-orders',
    'e_sourcing': 'e-sourcing',
}

def fix_organization_modules():
    """Corriger les codes de modules dans toutes les organisations"""
    print("=" * 60)
    print("🏢 ÉTAPE 1: Correction des modules des organisations")
    print("=" * 60)

    organizations = Organization.objects.all()

    for org in organizations:
        if org.enabled_modules:
            print(f"\n📦 Organisation: {org.name}")
            print(f"   Avant: {org.enabled_modules}")

            # Remplacer les anciens codes + supprimer doublons
            fixed_modules = []
            for module in org.enabled_modules:
                # Remplacer si ancien code
                if module in MODULE_MAPPING:
                    new_code = MODULE_MAPPING[module]
                    print(f"   ✏️  '{module}' -> '{new_code}'")
                    if new_code not in fixed_modules:
                        fixed_modules.append(new_code)
                # Ajouter si pas déjà présent
                elif module not in fixed_modules:
                    fixed_modules.append(module)
                else:
                    print(f"   🗑️  Doublon supprimé: '{module}'")

            org.enabled_modules = fixed_modules
            org.save()

            print(f"   Après: {org.enabled_modules}")
            print(f"   ✅ Sauvegardé")

def reset_user_permissions():
    """Vider les restrictions module_access pour tous les utilisateurs"""
    print("\n" + "=" * 60)
    print("👥 ÉTAPE 2: Réinitialisation des permissions utilisateurs")
    print("=" * 60)

    all_permissions = UserPermissions.objects.all()

    for perm in all_permissions:
        user = perm.user
        print(f"\n👤 Utilisateur: {user.email}")

        if perm.module_access:
            print(f"   Avant module_access: {perm.module_access}")
            perm.module_access = []
            perm.save()
            print(f"   Après module_access: [] (vide)")
            print(f"   ✅ Restrictions supprimées - utilisera les modules de l'organisation")
        else:
            print(f"   ℹ️  Déjà vide - aucune restriction")

def verify_fix():
    """Vérifier que tout est correct"""
    print("\n" + "=" * 60)
    print("🔍 ÉTAPE 3: Vérification")
    print("=" * 60)

    for org in Organization.objects.all():
        print(f"\n📦 {org.name}")
        print(f"   Modules actifs: {org.enabled_modules}")

        users = CustomUser.objects.filter(organization=org)
        print(f"   Utilisateurs: {users.count()}")

        for user in users:
            try:
                perm = user.permissions
                print(f"     - {user.email}: module_access = {perm.module_access}")
            except:
                print(f"     - {user.email}: pas de permissions")

if __name__ == '__main__':
    print("\n🚀 Démarrage de la correction complète des modules\n")

    fix_organization_modules()
    reset_user_permissions()
    verify_fix()

    print("\n" + "=" * 60)
    print("✨ TERMINÉ !")
    print("=" * 60)
    print("\n📌 Prochaines étapes:")
    print("   1. Rechargez la page des paramètres")
    print("   2. Cliquez à nouveau sur 'Debug Info'")
    print("   3. Vérifiez que les deux listes sont identiques")
    print("   4. Testez l'activation/désactivation des modules\n")
