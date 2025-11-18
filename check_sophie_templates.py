#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Script pour vérifier l'état des templates et settings de Sophie"""
import os
import sys
import django

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.invoicing.models import PrintTemplate
from apps.accounts.models import Organization
from apps.core.models import OrganizationSettings

# Trouver Sophie
org = Organization.objects.get(name__contains='Sophie')

print(f"=== Organisation: {org.name} ===\n")

# PrintTemplates
templates = PrintTemplate.objects.filter(organization=org)
print(f"PrintTemplates: {templates.count()}")
for t in templates:
    print(f"  - {t.name} (default={t.is_default}, type={t.template_type})")

# OrganizationSettings
settings = OrganizationSettings.objects.filter(organization=org).first()
print(f"\n=== OrganizationSettings ===")
if settings:
    print(f"Nom: {settings.company_name}")
    print(f"Logo: {bool(settings.company_logo)}")
    if settings.company_logo:
        print(f"  Path: {settings.company_logo.name}")
    print(f"Adresse: {'Oui' if settings.company_address else 'Non'}")
    print(f"Phone: {'Oui' if settings.company_phone else 'Non'}")
    print(f"Email: {'Oui' if settings.company_email else 'Non'}")
else:
    print("Pas de settings")
