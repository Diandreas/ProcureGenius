"""
Script pour corriger les codes de modules (underscore -> dash)
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.accounts.models import Organization

# Mapping ancien -> nouveau
MODULE_MAPPING = {
    'purchase_orders': 'purchase-orders',
    'e_sourcing': 'e-sourcing',
}

def fix_module_codes():
    """Corriger les codes de modules dans toutes les organisations"""
    organizations = Organization.objects.all()

    for org in organizations:
        if org.enabled_modules:
            print(f"\n📦 Organisation: {org.name}")
            print(f"   Avant: {org.enabled_modules}")

            # Remplacer les anciens codes par les nouveaux
            fixed_modules = []
            for module in org.enabled_modules:
                if module in MODULE_MAPPING:
                    new_code = MODULE_MAPPING[module]
                    print(f"   ✏️  Remplacer '{module}' -> '{new_code}'")
                    fixed_modules.append(new_code)
                elif module not in fixed_modules:  # Éviter les doublons
                    fixed_modules.append(module)

            org.enabled_modules = fixed_modules
            org.save()

            print(f"   Après: {org.enabled_modules}")
            print(f"   ✅ Sauvegardé")

    print("\n✨ Migration terminée !")

if __name__ == '__main__':
    fix_module_codes()
