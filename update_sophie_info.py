#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os
import sys
import django

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.accounts.models import User
from apps.core.models import OrganizationSettings

# Trouver Sophie
u = User.objects.filter(username='sophie.martin').first()
settings = OrganizationSettings.objects.filter(organization=u.organization).first()

# Ajouter les informations
settings.company_address = '123 Rue de la Patisserie\n75001 Paris, France'
settings.company_phone = '+33 1 23 45 67 89'
settings.company_email = 'contact@patisserie-sophie.fr'
settings.save()

print('OK Informations ajoutees pour Sophie:')
print(f'  Nom: {settings.company_name}')
print(f'  Adresse: {settings.company_address}')
print(f'  Telephone: {settings.company_phone}')
print(f'  Email: {settings.company_email}')
print(f'  Logo: {bool(settings.company_logo)}')
