
from apps.accounts.models import Organization, CustomUser, UserPermissions, UserPreferences
from apps.invoicing.models import Product, ProductCategory
from apps.core.modules import ProfileTypes, Modules
from django.utils.text import slugify
from decimal import Decimal

def setup_production():
    print("--- DÉMARRAGE INITIALISATION PRODUCTION JULIANNA ---")

    # 1. Création de l'Organisation
    org, created = Organization.objects.get_or_create(
        name="Centre de Santé Julianna",
        defaults={
            'subscription_type': ProfileTypes.HEALTHCARE,
            'enabled_modules': [
                Modules.DASHBOARD, Modules.PATIENTS, Modules.CONSULTATIONS,
                Modules.LABORATORY, Modules.PHARMACY, Modules.INVOICES,
                Modules.PRODUCTS, Modules.CLIENTS, Modules.ANALYTICS
            ]
        }
    )
    if not created:
        org.subscription_type = ProfileTypes.HEALTHCARE
        org.enabled_modules = [
            Modules.DASHBOARD, Modules.PATIENTS, Modules.CONSULTATIONS,
            Modules.LABORATORY, Modules.PHARMACY, Modules.INVOICES,
            Modules.PRODUCTS, Modules.CLIENTS, Modules.ANALYTICS
        ]
        org.save()
    print(f"v Organisation: {org.name} configurée.")

    # 2. Création du Catalogue de base (Kit de prélèvement)
    cat, _ = ProductCategory.objects.get_or_create(
        organization=org,
        name="Consommables",
        defaults={'slug': 'consommables'}
    )
    
    kit, created = Product.objects.update_or_create(
        organization=org,
        name="Kit de prélèvement",
        defaults={
            'price': Decimal('500.00'),
            'product_type': 'physical',
            'category': cat,
            'reference': 'KIT-PRELEV',
            'stock_quantity': 1000,
            'is_active': True
        }
    )
    print(f"v Produit: {kit.name} configuré à {kit.price} FCFA.")

    # 3. Création du Personnel
    staff = [
        {'username': 'dr.fabrice', 'email': 'fabrice.mbezele@csj.cm', 'password': 'Mbeze!237x', 'role': 'doctor', 'first_name': 'Fabrice', 'last_name': 'MBEZELE ESSAMA'},
        {'username': 'lauriane', 'email': 'lauriane.njapoup@csj.cm', 'password': 'kNj$09Tms!', 'role': 'lab_tech', 'first_name': 'Lauriane Karelle', 'last_name': 'NJAPOUP KAMDEM'},
        {'username': 'mariama', 'email': 'mariama.pememzi@csj.cm', 'password': 'Pem7!xRi03', 'role': 'nurse', 'first_name': 'Mariama', 'last_name': 'PEMEMZI'},
        {'username': 'gaelle', 'email': 'gaelle.ntiechou@csj.cm', 'password': 'Nte#4Sie!8', 'role': 'nurse', 'first_name': 'Gaëlle', 'last_name': 'NTIECHOU SIEBANOU'},
        {'username': 'sidoine', 'email': 'sidoine.kentsop@csj.cm', 'password': 'Kts@56Rai!', 'role': 'nurse', 'first_name': 'Sidoine Raïssa', 'last_name': 'KENTSOP'},
        {'username': 'gertrude', 'email': 'gertrude.yagna@csj.cm', 'password': 'yGn!Car83#', 'role': 'receptionist', 'first_name': 'Gertrude Carême', 'last_name': 'YAGNA MBEUFET'},
        {'username': 'nelie', 'email': 'nelie.djossi@csj.cm', 'password': 'Dj$17Nel!x', 'role': 'receptionist', 'first_name': 'Nelie Grace', 'last_name': 'DJOSSI'},
        {'username': 'admin_julianna', 'email': 'admin@csj.cm', 'password': 'julianna2025', 'role': 'admin', 'first_name': 'Admin', 'last_name': 'Julianna'},
    ]

    for member in staff:
        u, created = CustomUser.objects.get_or_create(
            email=member['email'],
            defaults={
                'username': member['username'],
                'role': member['role'],
                'first_name': member['first_name'],
                'last_name': member['last_name'],
                'organization': org,
                'is_staff': True if member['role'] == 'admin' else False
            }
        )
        u.username = member['username']
        u.set_password(member['password'])
        u.organization = org
        u.save()
        
        # Permissions & Onboarding
        UserPermissions.objects.get_or_create(user=u)
        prefs, _ = UserPreferences.objects.get_or_create(user=u)
        prefs.onboarding_completed = True
        prefs.save()
        
        print(f"v Utilisateur: {member['username']} prêt.")

    print("--- INITIALISATION TERMINÉE AVEC SUCCÈS ---")

if __name__ == "__main__":
    setup_production()
