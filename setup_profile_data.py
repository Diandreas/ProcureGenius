"""
Script de migration pour le système de profils/modules
Met à jour les organisations existantes et crée des données de test
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.accounts.models import Organization, CustomUser, UserPermissions
from apps.core.modules import ProfileTypes, get_modules_for_profile
from django.db import transaction


def update_existing_organizations():
    """Met à jour les organisations existantes avec les nouveaux profils"""
    print("\n=== Mise à jour des organisations existantes ===")
    
    organizations = Organization.objects.all()
    
    for org in organizations:
        old_subscription = org.subscription_type
        
        # Mapper les anciens types vers les nouveaux
        subscription_mapping = {
            'free': ProfileTypes.FREE,
            'basic': ProfileTypes.PROCUREMENT,  # basic -> procurement
            'professional': ProfileTypes.PROFESSIONAL,
            'enterprise': ProfileTypes.ENTERPRISE,
        }
        
        new_subscription = subscription_mapping.get(old_subscription, ProfileTypes.FREE)
        
        if new_subscription != old_subscription:
            org.subscription_type = new_subscription
            print(f"  Organisation '{org.name}': {old_subscription} -> {new_subscription}")
        
        # Mettre à jour les modules selon le nouveau profil
        org.update_modules_from_profile()
        print(f"    Modules activés: {', '.join(org.enabled_modules)}")
    
    print(f"\n✓ {organizations.count()} organisations mises à jour")


def create_test_organizations():
    """Crée des organisations de test pour chaque type de profil"""
    print("\n=== Création d'organisations de test ===")
    
    test_orgs = [
        {
            'name': 'Startup Demo (Free)',
            'subscription_type': ProfileTypes.FREE,
        },
        {
            'name': 'Cabinet Comptable (Billing)',
            'subscription_type': ProfileTypes.BILLING,
        },
        {
            'name': 'Entreprise Achats (Procurement)',
            'subscription_type': ProfileTypes.PROCUREMENT,
        },
        {
            'name': 'PME Complète (Professional)',
            'subscription_type': ProfileTypes.PROFESSIONAL,
        },
        {
            'name': 'Sourcing Stratégique (Strategic)',
            'subscription_type': ProfileTypes.STRATEGIC,
        },
        {
            'name': 'Grande Entreprise (Enterprise)',
            'subscription_type': ProfileTypes.ENTERPRISE,
        },
    ]
    
    for org_data in test_orgs:
        org, created = Organization.objects.get_or_create(
            name=org_data['name'],
            defaults={'subscription_type': org_data['subscription_type']}
        )
        
        if not created:
            # Mettre à jour si existe déjà
            org.subscription_type = org_data['subscription_type']
            org.update_modules_from_profile()
        
        status = "créée" if created else "mise à jour"
        print(f"  ✓ {org.name} - {status}")
        print(f"    Type: {org.subscription_type}")
        print(f"    Modules: {', '.join(org.get_available_modules())}")


def create_test_users():
    """Crée des utilisateurs de test pour chaque profil"""
    print("\n=== Création d'utilisateurs de test ===")
    
    test_users = [
        {
            'username': 'demo.free@procuregenius.com',
            'email': 'demo.free@procuregenius.com',
            'first_name': 'Demo',
            'last_name': 'Free',
            'password': 'Demo123!',
            'organization_name': 'Startup Demo (Free)',
            'role': 'admin',
        },
        {
            'username': 'demo.billing@procuregenius.com',
            'email': 'demo.billing@procuregenius.com',
            'first_name': 'Demo',
            'last_name': 'Billing',
            'password': 'Demo123!',
            'organization_name': 'Cabinet Comptable (Billing)',
            'role': 'accountant',
        },
        {
            'username': 'demo.procurement@procuregenius.com',
            'email': 'demo.procurement@procuregenius.com',
            'first_name': 'Demo',
            'last_name': 'Procurement',
            'password': 'Demo123!',
            'organization_name': 'Entreprise Achats (Procurement)',
            'role': 'buyer',
        },
        {
            'username': 'demo.professional@procuregenius.com',
            'email': 'demo.professional@procuregenius.com',
            'first_name': 'Demo',
            'last_name': 'Professional',
            'password': 'Demo123!',
            'organization_name': 'PME Complète (Professional)',
            'role': 'manager',
        },
        {
            'username': 'demo.strategic@procuregenius.com',
            'email': 'demo.strategic@procuregenius.com',
            'first_name': 'Demo',
            'last_name': 'Strategic',
            'password': 'Demo123!',
            'organization_name': 'Sourcing Stratégique (Strategic)',
            'role': 'manager',
        },
        {
            'username': 'demo.enterprise@procuregenius.com',
            'email': 'demo.enterprise@procuregenius.com',
            'first_name': 'Demo',
            'last_name': 'Enterprise',
            'password': 'Demo123!',
            'organization_name': 'Grande Entreprise (Enterprise)',
            'role': 'admin',
        },
    ]
    
    for user_data in test_users:
        org = Organization.objects.filter(name=user_data['organization_name']).first()
        
        if not org:
            print(f"  ⚠ Organisation '{user_data['organization_name']}' introuvable pour {user_data['username']}")
            continue
        
        user, created = CustomUser.objects.get_or_create(
            username=user_data['username'],
            defaults={
                'email': user_data['email'],
                'first_name': user_data['first_name'],
                'last_name': user_data['last_name'],
                'organization': org,
                'role': user_data['role'],
            }
        )
        
        if created:
            user.set_password(user_data['password'])
            user.save()
            status = "créé"
        else:
            # Mettre à jour l'organisation et le rôle
            user.organization = org
            user.role = user_data['role']
            user.set_password(user_data['password'])
            user.save()
            status = "mis à jour"
        
        print(f"  ✓ {user.username} ({user.role}) - {status}")
        print(f"    Organisation: {org.name}")
        print(f"    Modules accessibles: {', '.join(user.permissions.module_access or [])}")


def update_user_modules():
    """Met à jour les modules des utilisateurs existants selon leur organisation"""
    print("\n=== Mise à jour des modules utilisateurs ===")
    
    users = CustomUser.objects.filter(organization__isnull=False)
    
    for user in users:
        org = user.organization
        org_modules = org.get_available_modules()
        
        # Mettre à jour les permissions utilisateur
        permissions, _ = UserPermissions.objects.get_or_create(user=user)
        
        # L'accès utilisateur est limité aux modules de l'organisation
        from apps.accounts.models import _get_default_modules_for_role
        role_modules = _get_default_modules_for_role(user.role, org)
        
        # Intersection entre les modules du rôle et de l'organisation
        user_modules = list(set(role_modules) & set(org_modules))
        
        permissions.module_access = user_modules
        permissions.save()
        
        print(f"  ✓ {user.username} ({user.role})")
        print(f"    Modules: {', '.join(user_modules)}")


def display_summary():
    """Affiche un résumé des profils configurés"""
    print("\n" + "="*70)
    print("RÉSUMÉ DES PROFILS CONFIGURÉS")
    print("="*70)
    
    for profile_type in [ProfileTypes.FREE, ProfileTypes.BILLING, ProfileTypes.PROCUREMENT, 
                         ProfileTypes.PROFESSIONAL, ProfileTypes.STRATEGIC, ProfileTypes.ENTERPRISE]:
        
        orgs = Organization.objects.filter(subscription_type=profile_type)
        modules = get_modules_for_profile(profile_type)
        
        print(f"\n📊 Profil: {profile_type.upper()}")
        print(f"   Organisations: {orgs.count()}")
        print(f"   Modules inclus: {len(modules)}")
        print(f"   → {', '.join(modules)}")
        
        # Afficher les utilisateurs
        users = CustomUser.objects.filter(organization__subscription_type=profile_type)
        if users.exists():
            print(f"   Utilisateurs de test ({users.count()}):")
            for user in users[:3]:  # Afficher max 3
                print(f"     • {user.username} ({user.role})")


def main():
    """Fonction principale"""
    print("="*70)
    print("MIGRATION SYSTÈME DE PROFILS/MODULES")
    print("="*70)
    
    try:
        with transaction.atomic():
            # 1. Mettre à jour les organisations existantes
            update_existing_organizations()
            
            # 2. Créer des organisations de test
            create_test_organizations()
            
            # 3. Créer des utilisateurs de test
            create_test_users()
            
            # 4. Mettre à jour les modules des utilisateurs
            update_user_modules()
            
            # 5. Afficher le résumé
            display_summary()
            
            print("\n" + "="*70)
            print("✅ MIGRATION TERMINÉE AVEC SUCCÈS")
            print("="*70)
            
            print("\n📝 Identifiants de test:")
            print("-" * 70)
            print("Tous les comptes: password = 'Demo123!'")
            print()
            print("FREE:         demo.free@procuregenius.com")
            print("BILLING:      demo.billing@procuregenius.com")
            print("PROCUREMENT:  demo.procurement@procuregenius.com")
            print("PROFESSIONAL: demo.professional@procuregenius.com")
            print("STRATEGIC:    demo.strategic@procuregenius.com")
            print("ENTERPRISE:   demo.enterprise@procuregenius.com")
            print("-" * 70)
            
    except Exception as e:
        print(f"\n❌ ERREUR lors de la migration: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == '__main__':
    main()


