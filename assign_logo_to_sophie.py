#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Script pour assigner un logo a l'organisation de Sophie"""
import os
import sys
import django

# Force UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.core.models import OrganizationSettings
from apps.accounts.models import Organization
from django.core.files import File

# Trouver l'organisation de Sophie
try:
    org = Organization.objects.get(name__contains='Sophie')
    print(f"OK Organisation trouvee: {org.name}")

    # Creer ou recuperer les settings
    settings, created = OrganizationSettings.objects.get_or_create(organization=org)
    print(f"OK Settings: {'crees' if created else 'existants'}")

    # Assigner le logo existant
    logo_path = 'media/organization/logos/logo.jpg'

    if os.path.exists(logo_path):
        with open(logo_path, 'rb') as f:
            settings.company_logo.save('sophie_logo.jpg', File(f), save=True)

        print(f"OK Logo assigne avec succes !")
        print(f"  Chemin: {settings.company_logo.name}")
        print(f"  Fichier existe: {bool(settings.company_logo)}")
        print(f"  Path complet: {settings.company_logo.path}")
    else:
        print(f"ERR Fichier logo introuvable: {logo_path}")

except Organization.DoesNotExist:
    print("ERR Organisation de Sophie introuvable")
except Exception as e:
    print(f"ERR Erreur: {e}")
