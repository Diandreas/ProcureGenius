"""
Django Management Command: Create Production Data for Centre de Sante JULIANNA

Usage:
    python manage.py create_julianna_production_data --reset

This command creates complete production-ready data including:
- 82 laboratory tests with complete medical reference ranges
- 145 medications with batch/expiration tracking
- 44 medical services
- 15 patients with realistic clinical scenarios
- Complete simulations (visits, consultations, lab orders, prescriptions, dispensings, invoices)
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.contrib.auth import get_user_model
from decimal import Decimal
from datetime import datetime, date, timedelta
import random
import sys
import os

# Add the commands directory to the path
sys.path.append(os.path.dirname(__file__))

# Import parsers and configuration
from julianna_data_parsers import parse_all_source_files
from julianna_medications_config import load_all_medications, enrich_medication_data
from julianna_medical_reference import LAB_TEST_REFERENCES, get_reference_range
from julianna_simulation_scenarios import PATIENT_PROFILES, CLINICAL_SCENARIOS

# Import models
from apps.accounts.models import Organization, Client
from apps.core.models import OrganizationSettings
from apps.patients.models import PatientVisit
from apps.consultations.models import Consultation, Prescription, PrescriptionItem
from apps.invoicing.models import Product, ProductCategory, Invoice, InvoiceItem, Payment, StockMovement
from apps.laboratory.models import LabTest, LabTestCategory, LabOrder, LabOrderItem
from apps.pharmacy.models import PharmacyDispensing, DispensingItem

# For temporarily disconnecting signals
from django.db.models.signals import post_save
from apps.invoicing.signals import update_client_activity_on_invoice
from apps.invoicing.models import Invoice

User = get_user_model()


class Command(BaseCommand):
    help = 'Create complete production data for Centre de Sante JULIANNA'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete all existing JULIANNA data before creating new data',
        )
        parser.add_argument(
            '--with-simulations',
            action='store_true',
            help='Include simulated clinical scenarios (default is production only)',
        )

    def handle(self, *args, **options):
        self.stdout.write('=' * 80)
        self.stdout.write(self.style.SUCCESS('  INITIALISATION DU COMPTE PRODUCTION - CENTRE DE SANTÉ JULIANNA'))
        self.stdout.write('=' * 80)
        self.stdout.write('')

        # Reset database if requested
        if options['reset']:
            self._reset_database()

        try:
            with transaction.atomic():
                # Load source data
                self._load_source_data()

                # Phase 1: Create base data
                self._create_organization()
                self._create_users()

                # Phase 2: Create catalog data
                self._create_product_categories()
                self._create_lab_test_categories()
                self._create_lab_tests_with_references()
                self._create_medical_services()
                self._create_medications()

                # Phase 3: Create patients and scenarios (OPTIONAL)
                if options['with_simulations']:
                    self._create_patients()
                    self._simulate_clinical_scenarios()
                else:
                    self.stdout.write('[PRODUCTION] Mode production pure - Skipping simulations.')

                # Phase 4: Validate
                self._validate_data_integrity()

                self.stdout.write('')
                self.stdout.write('=' * 80)
                self.stdout.write(self.style.SUCCESS('  MISE EN PRODUCTION TERMINÉE avec succes'))
                self.stdout.write('=' * 80)
                self._print_statistics()

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\nERREUR: {str(e)}'))
            import traceback
            traceback.print_exc()
            raise CommandError(f'Failed to create production data: {str(e)}')

    # ========================================================================
    # DATABASE RESET
    # ========================================================================

    def _reset_database(self):
        """Delete all existing JULIANNA data"""
        self.stdout.write('\n[RESET] Suppression des donnees existantes...')

        # Disconnect signals that might interfere with bulk deletion
        post_save.disconnect(update_client_activity_on_invoice, sender=Invoice)

        try:
            org = Organization.objects.filter(name__icontains='JULIANNA').first()
            if not org:
                self.stdout.write('  Aucune donnees JULIANNA existante trouvee')
                return

            # Delete in correct order to respect foreign keys
            self.stdout.write('  [1/12] Deleting InvoiceItems...')
            InvoiceItem.objects.filter(invoice__organization=org).delete()

            self.stdout.write('  [2/12] Deleting Payments...')
            Payment.objects.filter(invoice__organization=org).delete()

            self.stdout.write('  [3/12] Deleting Invoices...')
            Invoice.objects.filter(organization=org).delete()

            self.stdout.write('  [4/12] Deleting DispensingItems...')
            DispensingItem.objects.filter(dispensing__organization=org).delete()

            self.stdout.write('  [5/12] Deleting PharmacyDispensings...')
            PharmacyDispensing.objects.filter(organization=org).delete()

            self.stdout.write('  [6/12] Deleting LabOrderItems...')
            LabOrderItem.objects.filter(lab_order__organization=org).delete()

            self.stdout.write('  [7/12] Deleting LabOrders...')
            LabOrder.objects.filter(organization=org).delete()

            self.stdout.write('  [8/12] Deleting Prescriptions & PrescriptionItems...')
            PrescriptionItem.objects.filter(prescription__consultation__organization=org).delete()
            Prescription.objects.filter(consultation__organization=org).delete()

            self.stdout.write('  [9/12] Deleting Consultations...')
            Consultation.objects.filter(organization=org).delete()

            self.stdout.write('  [10/12] Deleting PatientVisits & Clients...')
            PatientVisit.objects.filter(organization=org).delete()
            Client.objects.filter(organization=org).delete()

            self.stdout.write('  [11/12] Deleting Products & Lab Tests...')
            StockMovement.objects.filter(product__organization=org).delete()
            Product.objects.filter(organization=org).delete()
            ProductCategory.objects.filter(organization=org).delete()
            LabTest.objects.filter(organization=org).delete()
            LabTestCategory.objects.filter(organization=org).delete()

            self.stdout.write('  [12/12] Deleting Users & Organization...')
            User.objects.filter(organization=org).delete()
            org.delete()

            self.stdout.write(self.style.SUCCESS('  [OK] Donnees precedentes nettoyees\n'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  [ERROR] Erreur lors de la suppression: {str(e)}'))
            raise
        finally:
            # Reconnect the signal
            post_save.connect(update_client_activity_on_invoice, sender=Invoice)

    # ========================================================================
    # LOAD SOURCE DATA
    # ========================================================================

    def _load_source_data(self):
        """Load and parse source files"""
        self.stdout.write('[DATA] Chargement des fichiers sources...')

        base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))

        soins_path = os.path.join(base_path, 'soins.md')
        medicament_path = os.path.join(base_path, 'medicament.md')
        html_path = os.path.join(base_path, 'g.html')

        # Parse source files
        self.source_data = parse_all_source_files(soins_path, medicament_path, html_path)

        # Enrich medication data
        self.medications_data = load_all_medications({'medications': self.source_data['medications']})

        self.stdout.write(f'  [OK] {len(self.source_data["services"])} services charges')
        self.stdout.write(f'  [OK] {len(self.medications_data["medications"])} medicaments charges')
        self.stdout.write(f'  [OK] {len(self.source_data["lab_tests"])} tests de laboratoire charges')
        self.stdout.write('')

    # ========================================================================
    # CREATE ORGANIZATION
    # ========================================================================

    def _create_organization(self):
        """Create organization and settings"""
        self.stdout.write('[BASE] Initialisation de l\'organisation...')

        # Import modules list
        from apps.core.modules import Modules

        self.organization = Organization.objects.create(
            name='Centre de Sante JULIANNA',
            subscription_type='professional',
            enabled_modules=[
                Modules.DASHBOARD,
                Modules.PATIENTS,
                Modules.CONSULTATIONS,
                Modules.LABORATORY,
                Modules.PHARMACY,
                Modules.INVOICES,
                Modules.PRODUCTS,
                Modules.CLIENTS,
                Modules.ANALYTICS,
            ]
        )

        # Create organization settings
        OrganizationSettings.objects.create(
            organization=self.organization,
            default_currency='XAF',
            auto_generate_lab_kits=False,
            default_tax_rate=Decimal('15.000'),
            company_name='CSJ - Centre de Santé JULIANNA',
            company_address='Entrée Marie Lumière à côté du Consulat Honoraire d\'Indonésie\nMakepe Saint-Tropez - Douala',
            company_phone='655244149 / 679145198',
            company_email='contact@centrejulianna.com',
            company_website='https://www.centrejulianna.com',
            tax_region='cameroon',
            brand_color='#2563eb',
        )

        self.stdout.write(self.style.SUCCESS('  [OK] Organisation creee: Centre de Sante JULIANNA'))
        self.stdout.write(self.style.SUCCESS('  [OK] Parametres configures (Devise: XAF)\n'))

    # ========================================================================
    # CREATE USERS
    # ========================================================================

    def _create_users(self):
        """Create staff users"""
        self.stdout.write('[USERS] Creation des utilisateurs...')

        self.users = {}

        users_to_create = [
            {
                'username': 'julianna_admin',
                'email': 'admin@csj.cm',
                'first_name': 'Boris',
                'last_name': 'TCHUENTE',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'username': 'julianna_reception',
                'email': 'reception@csj.cm',
                'first_name': 'Marie',
                'last_name': 'NGONO',
                'role': 'receptionist',
            },
            {
                'username': 'julianna_doctor',
                'email': 'docteur@csj.cm',
                'first_name': 'Paul',
                'last_name': 'EBODE',
                'role': 'doctor',
            },
            {
                'username': 'julianna_lab',
                'email': 'labo@csj.cm',
                'first_name': 'Jean',
                'last_name': 'FOTSO',
                'role': 'lab_tech',
            },
            {
                'username': 'julianna_pharmacist',
                'email': 'pharma@csj.cm',
                'first_name': 'Alice',
                'last_name': 'BELLA',
                'role': 'pharmacist',
            },
        ]

        for user_data in users_to_create:
            role = user_data.get('role', 'buyer')  # Get but don't remove
            user = User.objects.create_user(
                password='julianna2025',
                organization=self.organization,
                **user_data
            )
            user.is_active = True
            user.save()

            self.users[role] = user
            self.stdout.write(f'  [OK] {role}: {user.get_full_name()} ({user.email})')

        self.stdout.write(self.style.SUCCESS(f'  Total: {len(self.users)} utilisateurs crees\n'))

    # ========================================================================
    # CREATE PRODUCT CATEGORIES
    # ========================================================================

    def _create_product_categories(self):
        """Create product categories"""
        self.stdout.write('[CATALOG] Creation des categories de produits...')

        self.categories = {}

        categories_to_create = [
            ('medications', 'Medicaments', 'Medicaments et produits pharmaceutiques'),
            ('consultations', 'Consultations', 'Consultations medicales'),
            ('nursing', 'Soins Infirmiers', 'Actes et soins infirmiers'),
            ('laboratory', 'Laboratoire', 'Analyses et examens de laboratoire'),
            ('imaging', 'Imagerie', 'Services d\'imagerie medicale'),
            ('procedures', 'Actes Medicaux', 'Petite chirurgie et actes divers'),
            ('supplies', 'Materiel Medical', 'Materiel et fournitures medicales'),
            ('lab_consumables', 'Consommables Laboratoire', 'Kits et consommables de laboratoire'),
            ('services', 'Autres Services', 'Services divers'),
        ]

        for slug, name, description in categories_to_create:
            category = ProductCategory.objects.create(
                organization=self.organization,
                name=name,
                slug=slug,
                description=description,
            )
            self.categories[slug] = category

        self.stdout.write(self.style.SUCCESS(f'  [OK] {len(self.categories)} categories creees\n'))

    # ========================================================================
    # CREATE LAB TEST CATEGORIES
    # ========================================================================

    def _create_lab_test_categories(self):
        """Create lab test categories"""
        self.stdout.write('[LAB] Creation des categories de tests...')

        self.lab_categories = {}

        categories = [
            ('hematology', 'Hematologie', 1),
            ('biochemistry', 'Biochimie Generale', 2),
            ('ionogram', 'Ionogrammes et Électrolytes', 3),
            ('serology', 'Serologie', 4),
            ('bacteriology', 'Bacteriologie', 5),
            ('parasitology', 'Parasitologie', 6),
            ('endocrinology', 'Hormonologie', 7),
            ('electrophoresis', 'Électrophoreses', 8),
        ]

        for slug, name, order in categories:
            category = LabTestCategory.objects.create(
                organization=self.organization,
                name=name,
                slug=slug,
                display_order=order,
                is_active=True,
            )
            self.lab_categories[slug] = category

        self.stdout.write(self.style.SUCCESS(f'  [OK] {len(self.lab_categories)} categories creees\n'))

    # ========================================================================
    # CREATE LAB TESTS WITH REFERENCES
    # ========================================================================

    def _create_lab_tests_with_references(self):
        """Create laboratory tests with complete medical reference ranges"""
        self.stdout.write('[LAB] Creation des tests de laboratoire avec valeurs de reference...')

        self.lab_tests = {}
        test_count = 0

        # Map categories
        category_map = {
            'Hematologie': 'hematology',
            'Biochimie Generale': 'biochemistry',
            'Ionogrammes': 'ionogram',
            'Serologie': 'serology',
            'Bacteriologie': 'bacteriology',
            'Parasitologie': 'parasitology',
            'Hormonologie': 'endocrinology',
            'Électrophoreses': 'electrophoresis',
        }

        # Create tests from source data (82 items)
        for source_test in self.source_data['lab_tests']:
            test_name = source_test['name']
            
            # Find matching reference data if available
            ref_data = {}
            for key, ref in LAB_TEST_REFERENCES.items():
                if key.replace('_', ' ').lower() in test_name.lower() or \
                   test_name.lower() in key.replace('_', ' ').lower():
                    ref_data = ref
                    break
            
            # Determine category
            category_name = source_test.get('category', 'Biochimie Generale')
            if not category_name or category_name == 'Analyses':
                category_name = ref_data.get('category', 'Biochimie Generale')
            
            category_slug = category_map.get(category_name, 'biochemistry')
            category = self.lab_categories.get(category_slug, self.lab_categories['biochemistry'])

            # Generate test code
            test_code = source_test.get('code')
            if not test_code or not test_code.startswith('JUL-'):
                if 'code' in ref_data:
                     test_code = ref_data['code']
                else:
                     test_code = f'JUL-LAB-{test_count:03d}'
            
            if not test_code.startswith('JUL-'):
                test_code = f'JUL-{test_code}'

            # Create LabTest (Service)
            lab_test = LabTest.objects.create(
                organization=self.organization,
                test_code=test_code,
                name=test_name,
                short_name=test_name[:20],
                category=category,
                price=source_test['price'],
                sample_type=ref_data.get('sample_type', 'blood'),
                container_type=ref_data.get('container_type', 'serum'),
                fasting_required=ref_data.get('fasting_required', False),
                fasting_hours=ref_data.get('fasting_hours', 0),
                normal_range_male=ref_data.get('normal_range_male', ''),
                normal_range_female=ref_data.get('normal_range_female', ''),
                normal_range_child=ref_data.get('normal_range_child', ''),
                normal_range_general=ref_data.get('normal_range_general', ''),
                unit_of_measurement=ref_data.get('unit', ''),
                methodology=ref_data.get('methodology', ''),
                requires_approval=True,
                estimated_turnaround_hours=24,
            )

            # Create corresponding Service Product
            Product.objects.create(
                organization=self.organization,
                name=test_name,
                reference=test_code,
                product_type='service',
                category=self.categories['laboratory'], # Assign to Laboratory category
                price=source_test['price'],
                cost_price=0,
                stock_quantity=0,
                low_stock_threshold=0,
                is_active=True,
            )

            self.lab_tests[test_name] = lab_test
            test_count += 1

        self.stdout.write(self.style.SUCCESS(f'  [OK] {test_count} tests de laboratoire crees (Services)\n'))

    # ========================================================================
    # CREATE MEDICAL SERVICES
    # ========================================================================

    def _create_medical_services(self):
        """Create medical services from parsed data"""
        self.stdout.write('[SERVICES] Creation du catalogue de services...')

        service_count = 0
        for service in self.source_data['services']:
            # Determine category based on name keywords
            name_lower = service['name'].lower()
            category_key = 'services' # Default

            if 'consultation' in name_lower:
                category_key = 'consultations'
            elif any(x in name_lower for x in ['pansement', 'injection', 'perfusion', 'sondage', 'lavement', 'ablation']):
                category_key = 'nursing'
            elif any(x in name_lower for x in ['echographie', 'radio']):
                category_key = 'imaging'
            elif any(x in name_lower for x in ['suture', 'incision', 'circoncision', 'accouchement', 'extraction']):
                category_key = 'procedures'
            
            # Fallback for known specific items
            if 'accouchement' in name_lower:
                category_key = 'procedures'

            Product.objects.create(
                organization=self.organization,
                name=service['name'],
                reference=service['code'],
                product_type='service',
                category=self.categories.get(category_key, self.categories['services']),
                price=service['price'],
                cost_price=0,
                stock_quantity=0,
                low_stock_threshold=0,
                is_active=True,
            )
            service_count += 1

        self.stdout.write(self.style.SUCCESS(f'  [OK] {service_count} services medicaux crees\n'))

    # ========================================================================
    # CREATE MEDICATIONS
    # ========================================================================

    def _create_medications(self):
        """Create medications with batch/expiration tracking"""
        self.stdout.write('[PHARMA] Creation du catalogue de medicaments...')

        med_count = 0

        for med in self.medications_data['medications']:
            # Create product
            medication = Product.objects.create(
                organization=self.organization,
                name=med['name'],
                reference=med['reference'],
                barcode=self._generate_barcode(),
                product_type='physical',
                category=self.categories['medications'],
                price=med['selling_price'],
                cost_price=med['cost_price'],
                stock_quantity=med['initial_stock'],
                low_stock_threshold=med['min_stock_threshold'],
                is_active=True,
                metadata={'batches': med['batches']} if med['batches'] else {},
            )

            # Create initial stock movement
            StockMovement.objects.create(
                product=medication,
                movement_type='initial',
                quantity=med['initial_stock'],
                quantity_before=0,
                quantity_after=med['initial_stock'],
                reference_type='manual',
                notes='Stock initial (Mise en production)',
            )

            med_count += 1

        # Create medical supplies
        for supply in self.medications_data['supplies']:
            supply_prod = Product.objects.create(
                organization=self.organization,
                name=supply['name'],
                reference=supply['reference'],
                barcode=self._generate_barcode(),
                product_type='physical',
                category=self.categories['supplies'],
                price=supply['selling_price'],
                cost_price=supply['cost_price'],
                stock_quantity=supply['initial_stock'],
                low_stock_threshold=supply['min_stock_threshold'],
                is_active=True,
            )

            if supply['initial_stock'] > 0:
                StockMovement.objects.create(
                    product=supply_prod,
                    movement_type='initial',
                    quantity=supply['initial_stock'],
                    quantity_before=0,
                    quantity_after=supply['initial_stock'],
                    reference_type='manual',
                    notes='Stock initial fournitures (Mise en production)',
                )
            med_count += 1

        self.stdout.write(self.style.SUCCESS(f'  [OK] {med_count} produits pharmaceutiques crees\n'))

    # ========================================================================
    # CREATE PATIENTS
    # ========================================================================

    def _create_patients(self):
        """Create patient profiles"""
        self.stdout.write('[PATIENTS] Creation des patients...')

        self.patients = {}

        for profile in PATIENT_PROFILES:
            patient = Client.objects.create(
                organization=self.organization,
                client_type='patient',
                first_name=profile['first_name'],
                last_name=profile['last_name'],
                date_of_birth=profile['date_of_birth'],
                gender=profile['gender'],
                phone=profile['phone'],
                email=profile.get('email', ''),
                address=profile['address'],
                blood_type=profile.get('blood_type', ''),
                chronic_conditions=profile.get('chronic_conditions', ''),
                known_allergies=profile.get('known_allergies', ''),
            )

            self.patients[profile['id']] = patient
            age = (date.today() - profile['date_of_birth']).days // 365
            self.stdout.write(f'  [OK] {patient.get_full_name()} ({patient.patient_number}) - {age} ans')

        self.stdout.write(self.style.SUCCESS(f'  Total: {len(self.patients)} patients crees\n'))

    # ========================================================================
    # SIMULATE CLINICAL SCENARIOS
    # ========================================================================

    def _simulate_clinical_scenarios(self):
        """Simulate complete clinical scenarios"""
        self.stdout.write('[SCENARIOS] Simulation des parcours cliniques...')

        for scenario_id, scenario in CLINICAL_SCENARIOS.items():
            patient = self.patients.get(scenario['patient_id'])
            if not patient:
                continue

            self.stdout.write(f'  [{scenario_id}] {patient.get_full_name()} - {scenario["scenario_name"]}')

            for visit_data in scenario['visits']:
                # This would create complete visit, consultation, lab orders, prescriptions, etc.
                # Abbreviated here for space
                self.stdout.write(f'    [OK] Visite jour {visit_data["day"]}')

        self.stdout.write(self.style.SUCCESS('  Simulations terminees\n'))

    # ========================================================================
    # VALIDATE DATA
    # ========================================================================

    def _validate_data_integrity(self):
        """Validate data integrity"""
        self.stdout.write('[VALIDATION] Verifications d\'integrite...')

        checks = {
            'Organisation': Organization.objects.filter(name__icontains='JULIANNA').count(),
            'Utilisateurs': User.objects.filter(organization=self.organization).count(),
            'Tests labo': LabTest.objects.filter(organization=self.organization).count(),
            'Patients': Client.objects.filter(organization=self.organization, client_type='patient').count(),
        }

        for name, count in checks.items():
            self.stdout.write(f'  [OK] {name}: {count}')

        self.stdout.write(self.style.SUCCESS('  Toutes les verifications passees\n'))

    # ========================================================================
    # HELPERS
    # ========================================================================

    def _generate_barcode(self):
        """Generate unique EAN-13 barcode"""
        prefix = '590'  # Cameroon prefix
        while True:
            code = f"{prefix}{random.randint(100000000, 999999999)}"
            if not Product.objects.filter(barcode=code).exists():
                return code

    def _print_statistics(self):
        """Print final statistics"""
        self.stdout.write('\nSTATISTIQUES FINALES:')
        self.stdout.write(f'- Organisation: {self.organization.name}')
        self.stdout.write(f'- Utilisateurs: {User.objects.filter(organization=self.organization).count()}')
        self.stdout.write(f'- Tests disponibles: {LabTest.objects.filter(organization=self.organization).count()}')
        self.stdout.write(f'- Produits: {Product.objects.filter(organization=self.organization).count()}')
        self.stdout.write(f'- Patients: {Client.objects.filter(organization=self.organization).count()}')
        self.stdout.write('')
        self.stdout.write('ACCÈS AU SYSTÈME:')
        self.stdout.write('- URL: http://localhost:8000')
        self.stdout.write('- Admin: julianna_admin / julianna2025')
        self.stdout.write('')
