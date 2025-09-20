#!/usr/bin/env python
"""
Script de configuration initiale pour ProcureGenius
"""

import os
import sys
import subprocess

def run_command(cmd, description):
    """Exécute une commande Django"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"✅ {description} - Succès!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} - Erreur: {e}")
        if e.stdout:
            print(f"Sortie: {e.stdout}")
        if e.stderr:
            print(f"Erreur: {e.stderr}")
        return False

def main():
    print("🚀 Configuration initiale de ProcureGenius...")
    print("=" * 50)
    
    # Configuration minimale
    settings = 'saas_procurement.settings_minimal'
    
    # Créer les migrations
    if not run_command([
        sys.executable, 'manage.py', 'makemigrations', 
        '--settings=' + settings
    ], "Création des migrations"):
        return
    
    # Appliquer les migrations
    if not run_command([
        sys.executable, 'manage.py', 'migrate', 
        '--settings=' + settings
    ], "Application des migrations"):
        return
    
    # Collecter les fichiers statiques
    if not run_command([
        sys.executable, 'manage.py', 'collectstatic', 
        '--noinput', '--settings=' + settings
    ], "Collecte des fichiers statiques"):
        return
    
    print("\n🎉 Configuration terminée!")
    print("\n📝 Prochaines étapes:")
    print("1. Créer un superutilisateur:")
    print(f"   py manage.py createsuperuser --settings={settings}")
    print("2. Démarrer l'application:")
    print(f"   py manage.py runserver --settings={settings}")
    print("\n🔗 URLs disponibles:")
    print("   📱 Landing page: http://127.0.0.1:8000/")
    print("   🔧 Interface admin: http://127.0.0.1:8000/app/")
    print("   ⚙️ Django admin: http://127.0.0.1:8000/admin/")

if __name__ == '__main__':
    main()
