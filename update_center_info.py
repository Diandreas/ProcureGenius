#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Script pour mettre a jour les informations du Centre de Sante Julianna pour la production"""
import os
import sys
import django

# Force UTF-8 encoding for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.accounts.models import Organization
from apps.core.models import OrganizationSettings

# Informations du Centre de Sante Julianna
CENTER_NAME = "Centre de Sante JULIANNA"
CENTER_ADDRESS = """Centre de Sante JULIANNA
Entree Marie Lumiere a cote
du Consulat Honoraire d'Indonesie
Makepe Saint-Tropez - Douala"""
CENTER_PHONES = "Orange: 655244149 | MTN: 679145198"
CENTER_WEBSITE = "https://centrejulianna.com"
CENTER_EMAIL = "contact@centrejulianna.com"  # Vous pouvez changer ceci

# Trouver l'organisation
try:
    org = Organization.objects.filter(name__icontains="JULIANNA").first()

    if not org:
        print("[ERREUR] Organisation 'Centre de Sante JULIANNA' non trouvee.")
        print("\nOrganisations existantes:")
        for o in Organization.objects.all():
            print(f"  - {o.name} (ID: {o.id})")

        # Creer l'organisation si elle n'existe pas
        create = input("\nVoulez-vous creer l'organisation? (o/n): ")
        if create.lower() == 'o':
            org = Organization.objects.create(name=CENTER_NAME)
            print(f"[OK] Organisation creee: {org.name}")
        else:
            sys.exit(0)

    print(f"\n[INFO] Organisation trouvee: {org.name}")

    # Mettre a jour le nom si necessaire
    if org.name != CENTER_NAME:
        old_name = org.name
        org.name = CENTER_NAME
        org.save()
        print(f"[OK] Nom mis a jour: '{old_name}' -> '{CENTER_NAME}'")

    # Creer ou mettre a jour les parametres
    settings, created = OrganizationSettings.objects.get_or_create(organization=org)

    if created:
        print("[OK] Parametres crees pour l'organisation")

    # Mettre a jour les informations
    settings.company_name = CENTER_NAME
    settings.company_address = CENTER_ADDRESS
    settings.company_phone = CENTER_PHONES
    settings.company_website = CENTER_WEBSITE
    settings.company_email = CENTER_EMAIL
    settings.tax_region = 'cameroon'
    settings.save()

    print("\n[OK] Informations mises a jour avec succes!")
    print(f"\n=== Details ===")
    print(f"  Nom: {settings.company_name}")
    print(f"  Adresse: {settings.company_address.replace(chr(10), ' ')}")
    print(f"  Telephones: {settings.company_phone}")
    print(f"  Site web: {settings.company_website}")
    print(f"  Email: {settings.company_email}")
    print(f"  Region fiscale: {settings.tax_region}")

except Exception as e:
    print(f"[ERREUR] {e}")
    import traceback
    traceback.print_exc()
