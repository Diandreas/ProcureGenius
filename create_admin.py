#!/usr/bin/env python
"""
Script pour créer un superutilisateur
"""
import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings_minimal')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Créer le superutilisateur
try:
    if User.objects.filter(username='admin').exists():
        print("✅ Superutilisateur 'admin' existe déjà")
    else:
        User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
        print("✅ Superutilisateur 'admin' créé avec succès!")
        print("   Username: admin")
        print("   Email: admin@example.com")
        print("   Password: admin123")
except Exception as e:
    print(f"❌ Erreur: {e}")

print("\n🔗 URLs disponibles:")
print("   📱 Landing page: http://127.0.0.1:8000/")
print("   🔧 Interface admin: http://127.0.0.1:8000/app/")
print("   ⚙️ Django admin: http://127.0.0.1:8000/admin/")
