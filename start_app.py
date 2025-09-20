#!/usr/bin/env python
"""
Script de démarrage ultra-simple pour ProcureGenius
"""

import os
import sys
import subprocess

def main():
    print("🚀 Démarrage de ProcureGenius...")
    print("📱 Landing page: http://127.0.0.1:8000/")
    print("🔧 Interface admin: http://127.0.0.1:8000/app/")
    print("⚙️ Django admin: http://127.0.0.1:8000/admin/")
    print("=" * 50)
    
    try:
        # Utiliser la configuration minimale
        cmd = [sys.executable, 'manage.py', 'runserver', '--settings=saas_procurement.settings_minimal']
        subprocess.run(cmd)
    except KeyboardInterrupt:
        print("\n👋 Arrêt de l'application.")
    except Exception as e:
        print(f"❌ Erreur: {e}")
        print("\n💡 Essayez de créer un superutilisateur d'abord:")
        print("   py manage.py createsuperuser --settings=saas_procurement.settings_minimal")

if __name__ == '__main__':
    main()
