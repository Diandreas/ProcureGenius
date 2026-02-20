
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

    # 3. Import du Catalogue d'Analyses (CSV) avec gestion d'encodage
    csv_file = "Liste Analyses Médicales - CSJ version finale.csv"
    if not os.path.exists(csv_file):
        # Essai avec un nom sans caractères spéciaux au cas où
        csv_file = "Liste Analyses Medicales - CSJ version finale.csv"

    if os.path.exists(csv_file):
        print(f"v Importation du catalogue depuis {csv_file}...")
        
        # Tester différents encodages
        encodings = ['utf-8-sig', 'latin-1', 'cp1252']
        data_loaded = False
        
        for enc in encodings:
            try:
                with open(csv_file, mode='r', encoding=enc) as f:
                    # Détection automatique du délimiteur
                    sample = f.read(2048)
                    f.seek(0)
                    dialect = csv.Sniffer().sniff(sample)
                    reader = csv.DictReader(f, dialect=dialect)
                    
                    count = 0
                    for row in reader:
                        # Nettoyer les noms de colonnes (enlever BOM ou espaces)
                        row = {k.strip() if k else k: v for k, v in row.items()}
                        
                        try:
                            # Mapping des colonnes (ajustez si vos colonnes ont des noms exacts différents)
                            cat_name = row.get('Categorie') or row.get('Catégorie') or 'Général'
                            test_name = row.get('Examen') or row.get('Test') or row.get('Nom')
                            test_code = row.get('Code') or f"LAB-{count:04d}"
                            price_val = row.get('Prix') or '0'
                            
                            if not test_name: continue

                            lab_cat, _ = LabTestCategory.objects.get_or_create(
                                organization=org, name=cat_name.strip(), 
                                defaults={'slug': slugify(cat_name)}
                            )
                            
                            price_str = str(price_val).replace(' ', '').replace('FCFA', '').replace('XAF', '')
                            
                            LabTest.objects.update_or_create(
                                organization=org,
                                test_code=test_code.strip(),
                                defaults={
                                    'name': test_name.strip(),
                                    'category': lab_cat,
                                    'price': Decimal(price_str) if price_str and price_str != 'None' else 0,
                                    'is_active': True
                                }
                            )
                            count += 1
                        except Exception as e:
                            pass # Ignorer les lignes mal formées
                    
                    print(f"v SUCCESS: {count} analyses importées avec l'encodage {enc}.")
                    data_loaded = True
                    break
            except Exception as e:
                print(f"  ... échec avec {enc}: {e}")
                continue
        
        if not data_loaded:
            print("X Impossible de lire le fichier CSV. Vérifiez l'encodage et le format.")
    else:
        print(f"X Fichier CSV introuvable.")

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
        u.organization = org
        u.save()
        UserPermissions.objects.get_or_create(user=u)
        prefs, _ = UserPreferences.objects.get_or_create(user=u)
        prefs.onboarding_completed = True
        prefs.save()
        print(f"v Accès: {m['username']} configuré.")

    print("\n=== INITIALISATION TERMINÉE AVEC SUCCÈS ===\n")

setup_production()
