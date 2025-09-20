#!/usr/bin/env python3
"""
Script pour créer des clients de test
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def create_test_clients():
    """Crée des clients de test"""
    
    clients_data = [
        {
            'username': 'marie.client',
            'first_name': 'Marie',
            'last_name': 'Dubois',
            'email': 'marie.dubois@email.com',
            'is_staff': False,
            'is_active': True,
        },
        {
            'username': 'jean.martin',
            'first_name': 'Jean',
            'last_name': 'Martin',
            'email': 'jean.martin@entreprise.com',
            'is_staff': False,
            'is_active': True,
        },
        {
            'username': 'sophie.tech',
            'first_name': 'Sophie',
            'last_name': 'Technologie',
            'email': 'sophie@techcorp.com',
            'is_staff': False,
            'is_active': True,
        },
        {
            'username': 'pierre.startup',
            'first_name': 'Pierre',
            'last_name': 'Entrepreneur',
            'email': 'pierre@startup.io',
            'is_staff': False,
            'is_active': True,
        },
        {
            'username': 'alice.creative',
            'first_name': 'Alice',
            'last_name': 'Créative',
            'email': 'alice@agency.com',
            'is_staff': False,
            'is_active': True,
        },
    ]
    
    created_count = 0
    updated_count = 0
    
    for client_data in clients_data:
        user, created = User.objects.get_or_create(
            username=client_data['username'],
            defaults=client_data
        )
        
        if created:
            # Définir un mot de passe par défaut
            user.set_password('client123')
            user.save()
            created_count += 1
            print(f"✅ Client créé : {user.get_full_name()} ({user.username})")
        else:
            # Mettre à jour les données
            for key, value in client_data.items():
                if key != 'username':  # Ne pas changer le nom d'utilisateur
                    setattr(user, key, value)
            user.save()
            updated_count += 1
            print(f"🔄 Client mis à jour : {user.get_full_name()} ({user.username})")
    
    print(f"\n📊 Résumé :")
    print(f"   Clients créés : {created_count}")
    print(f"   Clients mis à jour : {updated_count}")
    print(f"   Total clients : {User.objects.filter(is_staff=False).count()}")
    
    # Afficher la liste des clients
    print(f"\n👥 Liste des clients :")
    for client in User.objects.filter(is_staff=False, is_active=True):
        print(f"   • {client.get_full_name()} ({client.email})")

if __name__ == "__main__":
    print("🚀 Création des clients de test...")
    try:
        create_test_clients()
        print("\n🎉 Clients de test créés avec succès !")
        print("\n💡 Mot de passe par défaut pour tous les clients : client123")
    except Exception as e:
        print(f"❌ Erreur : {e}")
        import traceback
        traceback.print_exc()
