import csv
import os
from apps.accounts.models import Organization, CustomUser, UserPermissions, UserPreferences
from apps.invoicing.models import Product, ProductCategory
from apps.laboratory.models import LabTest, LabTestCategory
from apps.core.modules import ProfileTypes, Modules
from django.utils.text import slugify
from decimal import Decimal

# Import source data from existing config command modules
from apps.accounts.management.commands.julianna_tests_config import LAB_TESTS, MEDICAL_SERVICES

def setup_production():
    print("\n=== DÉMARRAGE INITIALISATION PRODUCTION JULIANNA ===")

    # 1. Organisation
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

    # 2. Catégories de Produits
    cat_map = {}
    categories = [
        ('consultations', 'Consultations'),
        ('procedures', 'Actes Medicaux'),
        ('nursing', 'Soins Infirmiers'),
        ('services', 'Autres Services'),
        ('lab_consumables', 'Consommables Laboratoire'),
    ]
    for slug, name in categories:
        cat, _ = ProductCategory.objects.get_or_create(
            organization=org, slug=slug, defaults={'name': name}
        )
        cat_map[slug] = cat

    # 3. Services Médicaux (Soins)
    print("v Importation des services médicaux...")
    svc_cat_map = {
        'Consultations':     'consultations',
        'Hospitalisation':   'nursing',
        'Petite Chirurgie':  'procedures',
        'ORL':               'procedures',
        'Kit Prélèvement':   'lab_consumables',
        'Maternité':         'services',
        'Vaccinations':      'services',
    }
    
    for svc in MEDICAL_SERVICES:
        cat_slug = svc_cat_map.get(svc['category'], 'services')
        Product.objects.update_or_create(
            organization=org,
            reference=svc.get('code', ''),
            defaults={
                'name': svc['name'],
                'product_type': 'service',
                'category': cat_map.get(cat_slug),
                'price': Decimal(str(svc['price'])),
                'is_active': True
            }
        )
    print(f"v {len(MEDICAL_SERVICES)} services configurés.")

    # 4. Catalogue d'Analyses Laboratoire
    print("v Importation des analyses de laboratoire...")
    lab_cat_slugs = {
        'hematologie': 'Hematologie',
        'biochimie': 'Biochimie Generale',
        'ionogramme': 'Ionogrammes et Électrolytes',
        'serologie': 'Serologie',
        'bacteriologie': 'Bacteriologie',
        'parasitologie': 'Parasitologie',
        'hormonologie': 'Hormonologie',
        'electrophorese': 'Électrophorèses',
    }

    for test_cfg in LAB_TESTS:
        cat_name = lab_cat_slugs.get(test_cfg['category'], 'Autres')
        lab_cat, _ = LabTestCategory.objects.get_or_create(
            organization=org, name=cat_name, defaults={'slug': slugify(cat_name)}
        )
        
        LabTest.objects.update_or_create(
            organization=org,
            test_code=test_cfg['code'],
            defaults={
                'name': test_cfg['name'],
                'short_name': test_cfg.get('short_name', ''),
                'category': lab_cat,
                'price': Decimal(str(test_cfg['price'])),
                'sample_type': test_cfg.get('sample_type', 'blood'),
                'container_type': test_cfg.get('container', 'serum'),
                'is_active': True
            }
        )
    print(f"v {len(LAB_TESTS)} analyses configurées.")

    # 5. Personnel
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

    for m in staff:
        u, _ = CustomUser.objects.get_or_create(email=m['email'], defaults={'username': m['username'], 'role': m['role'], 'first_name': m['first_name'], 'last_name': m['last_name'], 'organization': org, 'is_staff': (m['role'] == 'admin'), 'is_superuser': (m['role'] == 'admin')})
        u.username = m['username']
        u.set_password(m['password'])
        u.organization = org
        u.save()
        
        UserPermissions.objects.get_or_create(user=u)
        prefs, _ = UserPreferences.objects.get_or_create(user=u)
        prefs.onboarding_completed = True
        prefs.save()
        print(f"v Accès: {m['username']} configuré.")

    print("\n=== INITIALISATION TERMINÉE AVEC SUCCÈS ===\n")

setup_production()
