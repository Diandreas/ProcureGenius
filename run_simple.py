#!/usr/bin/env python
"""
Script de démarrage simple pour ProcureGenius
Utilise la configuration simplifiée sans multi-tenancy
"""

import os
import sys
import django
from django.core.management import execute_from_command_line

if __name__ == '__main__':
    # Configuration simplifiée
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings_simple')
    
    try:
        django.setup()
        print("🚀 Démarrage de ProcureGenius avec configuration simplifiée...")
        print("📱 Landing page: http://127.0.0.1:8000/")
        print("🔧 Interface admin: http://127.0.0.1:8000/app/")
        print("⚙️ Django admin: http://127.0.0.1:8000/admin/")
        print("=" * 50)
        
        execute_from_command_line(['manage.py', 'runserver'])
        
    except Exception as e:
        print(f"❌ Erreur lors du démarrage: {e}")
        sys.exit(1)
