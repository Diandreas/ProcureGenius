#!/usr/bin/env python
"""Script pour créer un superutilisateur automatiquement"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Créer superutilisateur s'il n'existe pas
if not User.objects.filter(username='admin').exists():
    user = User.objects.create_superuser(
        username='admin',
        email='admin@procuregenius.com',
        password='admin123',
        first_name='Admin',
        last_name='ProcureGenius'
    )
    print(f"✅ Superutilisateur créé: {user.username}")
else:
    print("✅ Superutilisateur 'admin' existe déjà")

