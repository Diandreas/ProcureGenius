import csv
import os
from apps.accounts.models import Organization, CustomUser, UserPermissions, UserPreferences
from apps.invoicing.models import Product, ProductCategory
from apps.laboratory.models import LabTest, LabTestCategory
from apps.core.modules import ProfileTypes, Modules
from django.utils.text import slugify
from decimal import Decimal

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

    # 2. Kit de prélèvement
    cat_cons, _ = ProductCategory.objects.get_or_create(
        organization=org, name="Consommables", defaults={'slug': 'consommables'}
    )
    Product.objects.update_or_create(
        organization=org, reference='KIT-PRELEV',
        defaults={'name': "Kit de prélèvement", 'price': Decimal('500.00'), 'product_type': 'physical', 'category': cat_cons, 'stock_quantity': 1000, 'is_active': True}
    )
    print(f"v Kit de prélèvement configuré à 500 FCFA.")

    # 3. Import du Catalogue d'Analyses (CSV)
    csv_file = "Liste Analyses Médicales - CSJ version finale.csv"
    if os.path.exists(csv_file):
        print(f"v Importation du catalogue depuis {csv_file}...")
        with open(csv_file, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f, delimiter=';')
            count = 0
            for row in reader:
                try:
                    # On assume les colonnes: Categorie;Code;Examen;Prix
                    cat_name = row.get('Categorie', 'Général').strip()
                    lab_cat, _ = LabTestCategory.objects.get_or_create(
                        organization=org, name=cat_name, defaults={'slug': slugify(cat_name)}
                    )
                    
                    price_str = row.get('Prix', '0').replace(' ', '').replace('FCFA', '')
                    
                    LabTest.objects.update_or_create(
                        organization=org,
                        test_code=row.get('Code', f"LAB-{count}"),
                        defaults={
                            'name': row.get('Examen', 'Inconnu'),
                            'category': lab_cat,
                            'price': Decimal(price_str) if price_str else 0,
                            'is_active': True
                        }
                    )
                    count += 1
                except Exception as e:
                    print(f"  ! Erreur ligne {row}: {e}")
            print(f"v {count} analyses importées avec succès.")
    else:
        print(f"X Fichier {csv_file} introuvable à la racine.")

    # 4. Personnel
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
        u, _ = CustomUser.objects.get_or_create(email=m['email'], defaults={'username': m['username'], 'role': m['role'], 'first_name': m['first_name'], 'last_name': m['last_name'], 'organization': org, 'is_staff': (m['role'] == 'admin')})
        u.username = m['username']
        u.set_password(m['password'])
        u.save()
        UserPermissions.objects.get_or_create(user=u)
        prefs, _ = UserPreferences.objects.get_or_create(user=u)
        prefs.onboarding_completed = True
        prefs.save()
        print(f"v Accès: {m['username']} configuré.")

    print("\n=== INITIALISATION TERMINÉE AVEC SUCCÈS ===\n")

# Exécution immédiate
setup_production()
