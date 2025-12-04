"""
Script pour corriger les PrintTemplates existants qui utilisent "ProcureGenius"
"""
import os
import sys
import django

# Configurer Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.invoicing.models import PrintTemplate
from apps.core.models import OrganizationSettings

def fix_print_templates():
    print("\n" + "="*80)
    print("CORRECTION DES PRINT TEMPLATES")
    print("="*80 + "\n")

    # Trouver tous les PrintTemplate avec "ProcureGenius" ou "PROCUREGENIUS"
    templates_to_fix = PrintTemplate.objects.filter(
        header_company_name__icontains="procuregenius"
    )

    print(f"Templates trouvés avec 'ProcureGenius': {templates_to_fix.count()}\n")

    for template in templates_to_fix:
        print(f"Template: {template.name}")
        print(f"  Type: {template.template_type}")
        print(f"  Organisation: {template.organization.name if template.organization else 'Aucune'}")
        print(f"  Ancien nom: '{template.header_company_name}'")

        # Essayer de récupérer le vrai nom de l'entreprise
        new_name = None

        if template.organization:
            # Chercher OrganizationSettings
            org_settings = OrganizationSettings.objects.filter(
                organization=template.organization
            ).first()

            if org_settings and org_settings.company_name and org_settings.company_name.strip():
                new_name = org_settings.company_name
                print(f"  → Trouvé dans OrganizationSettings: '{new_name}'")
            elif template.organization.name:
                new_name = template.organization.name
                print(f"  → Utilisation du nom de l'organisation: '{new_name}'")
            else:
                new_name = ""
                print(f"  → Aucun nom disponible, utilisation de chaîne vide")

            # Mettre à jour le template
            template.header_company_name = new_name
            template.save()
            print(f"  ✓ Template mis à jour\n")
        else:
            print(f"  ⚠ Template sans organisation, ignoré\n")

    print("="*80)
    print("CORRECTION TERMINÉE")
    print("="*80 + "\n")

if __name__ == '__main__':
    fix_print_templates()
