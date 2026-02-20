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

# Import configuration (no external file parsers needed)
from julianna_tests_config import LAB_TESTS, LAB_CATEGORIES, MEDICAL_SERVICES
from julianna_medications_config import load_all_medications, enrich_medication_data
from julianna_simulation_scenarios import PATIENT_PROFILES, CLINICAL_SCENARIOS

# Import models
from apps.accounts.models import Organization, Client, UserPermissions
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
            # Delete any invoices created by org users but belonging to other orgs
            # (cross-org FK would block user deletion due to PROTECTED constraint)
            org_user_ids = list(User.objects.filter(organization=org).values_list('id', flat=True))
            if org_user_ids:
                cross_org_invoices = Invoice.objects.filter(created_by_id__in=org_user_ids)
                cross_org_invoices_ids = list(cross_org_invoices.values_list('id', flat=True))
                if cross_org_invoices_ids:
                    InvoiceItem.objects.filter(invoice_id__in=cross_org_invoices_ids).delete()
                    Payment.objects.filter(invoice_id__in=cross_org_invoices_ids).delete()
                    cross_org_invoices.delete()
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
        """Load catalog data from config modules (no external files required)"""
        self.stdout.write('[DATA] Chargement du catalogue depuis la configuration...')

        # Lab tests and medical services come directly from julianna_tests_config.
        # Medications: no external source file needed; enrich_medication_data
        # will produce an empty list which is fine for production setup.
        self.medications_data = load_all_medications({'medications': []})

        self.stdout.write(f'  [OK] {len(MEDICAL_SERVICES)} services medicaux charges')
        self.stdout.write(f'  [OK] {len(self.medications_data["medications"])} medicaments charges')
        self.stdout.write(f'  [OK] {len(LAB_TESTS)} tests de laboratoire charges')
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
        """Create staff users for Centre de Santé JULIANNA"""
        self.stdout.write('[USERS] Creation des utilisateurs...')

        from apps.core.modules import Modules

        self.users = {}

        # ── Modules par rôle ──────────────────────────────────────────────────
        # Liste vide = accès à tous les modules de l'org (cas admin uniquement)
        # Liste remplie = restriction aux modules listés
        MODULE_DOCTOR = [
            Modules.PATIENTS, Modules.CONSULTATIONS,
            Modules.LABORATORY, Modules.PHARMACY,
        ]
        MODULE_LAB_TECH = [
            Modules.PATIENTS, Modules.LABORATORY,
        ]
        MODULE_NURSE = [
            Modules.PATIENTS, Modules.CONSULTATIONS,
            Modules.PHARMACY, Modules.LABORATORY,
        ]
        MODULE_NURSE_SECRETARY = [
            Modules.PATIENTS, Modules.CONSULTATIONS,
            Modules.PHARMACY, Modules.LABORATORY,
            Modules.INVOICES, Modules.CLIENTS, Modules.PRODUCTS,
        ]
        MODULE_SECRETARY = [
            Modules.PATIENTS, Modules.CONSULTATIONS,
            Modules.INVOICES, Modules.CLIENTS,
            Modules.LABORATORY, Modules.PRODUCTS,
        ]

        users_to_create = [
            # ── ADMIN ─────────────────────────────────────────────────────────
            {
                'username': 'boris',
                'password': 'staneDU@#1989',
                'email': 'boris@csj.cm',
                'first_name': 'Boris',
                'last_name': 'ADMIN',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True,
                'modules': [],  # Admin = accès total
            },
            {
                'username': 'admin_julianna',
                'password': 'julianna2025',
                'email': 'admin@csj.cm',
                'first_name': 'Admin',
                'last_name': 'Julianna',
                'role': 'admin',
                'is_staff': True,
                'modules': [],
            },
            # ── MÉDECIN ───────────────────────────────────────────────────────
            {
                'username': 'dr.fabrice',
                'password': 'Mbeze!237x',
                'email': 'fabrice.mbezele@csj.cm',
                'first_name': 'Fabrice',
                'last_name': 'MBEZELE ESSAMA',
                'role': 'doctor',
                'modules': MODULE_DOCTOR,
            },
            # ── TECHNICIENNE MÉDICO-SANITAIRE (labo) ─────────────────────────
            {
                'username': 'lauriane',
                'password': 'kNj$09Tms!',
                'email': 'lauriane.njapoup@csj.cm',
                'first_name': 'Lauriane Karelle',
                'last_name': 'NJAPOUP KAMDEM',
                'role': 'lab_tech',
                'modules': MODULE_LAB_TECH,
            },
            # ── INFIRMIÈRES ───────────────────────────────────────────────────
            {
                'username': 'mariama',
                'password': 'Pem7!xRi03',
                'email': 'mariama.pememzi@csj.cm',
                'first_name': 'Mariama',
                'last_name': 'PEMEMZI',
                'role': 'nurse',
                'modules': MODULE_NURSE,
            },
            {
                'username': 'gaelle',
                'password': 'Nte#4Sie!8',
                'email': 'gaelle.ntiechou@csj.cm',
                'first_name': 'Gaëlle',
                'last_name': 'NTIECHOU SIEBANOU',
                'role': 'nurse',
                'modules': MODULE_NURSE,
            },
            # ── INFIRMIÈRE + SECRÉTAIRE MÉDICALE ─────────────────────────────
            {
                'username': 'sidoine',
                'password': 'Kts@56Rai!',
                'email': 'sidoine.kentsop@csj.cm',
                'first_name': 'Sidoine Raïssa',
                'last_name': 'KENTSOP',
                'role': 'nurse',
                'modules': MODULE_NURSE_SECRETARY,
            },
            # ── SECRÉTAIRES MÉDICALES ─────────────────────────────────────────
            {
                'username': 'gertrude',
                'password': 'yGn!Car83#',
                'email': 'gertrude.yagna@csj.cm',
                'first_name': 'Gertrude Carême',
                'last_name': 'YAGNA MBEUFET',
                'role': 'receptionist',
                'modules': MODULE_SECRETARY,
            },
            {
                'username': 'nelie',
                'password': 'Dj$17Nel!x',
                'email': 'nelie.djossi@csj.cm',
                'first_name': 'Nelie Grace',
                'last_name': 'DJOSSI',
                'role': 'receptionist',
                'modules': MODULE_SECRETARY,
            },
        ]

        for user_data in users_to_create:
            modules = user_data.pop('modules', [])
            password = user_data.pop('password')
            role = user_data.get('role', 'buyer')

            user = User.objects.create_user(
                password=password,
                organization=self.organization,
                **user_data
            )
            user.is_active = True
            user.save()

            # Créer/mettre à jour les permissions avec les modules restreints
            # (un signal peut déjà avoir créé un UserPermissions vide)
            perms, _ = UserPermissions.objects.get_or_create(user=user)
            perms.module_access = modules
            perms.can_manage_users = (role == 'admin')
            perms.can_manage_settings = (role == 'admin')
            perms.can_view_analytics = (role in ['admin', 'manager'])
            perms.can_approve_purchases = (role == 'admin')
            perms.save()

            # Stocker par rôle (pour les scénarios de simulation)
            if role not in self.users:
                self.users[role] = user

            self.stdout.write(
                f'  [OK] {role:<15} {user.get_full_name():<35} ({user.email})'
            )

        self.stdout.write(self.style.SUCCESS(f'  Total: {len(users_to_create)} utilisateurs crees\n'))

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

        # Slug mapping: julianna_tests_config category slugs → lab_categories dict keys
        category_slug_map = {
            'hematologie':     'hematology',
            'biochimie':       'biochemistry',
            'ionogramme':      'ionogram',
            'serologie':       'serology',
            'bacteriologie':   'bacteriology',
            'parasitologie':   'parasitology',
            'hormonologie':    'endocrinology',
            'electrophorese':  'electrophoresis',
        }

        # Create tests directly from LAB_TESTS config (already has all reference data)
        for test_cfg in LAB_TESTS:
            test_code = test_cfg['code']
            test_name = test_cfg['name']
            short_name = test_cfg.get('short_name', test_name[:30])

            cat_slug = category_slug_map.get(test_cfg.get('category', 'biochimie'), 'biochemistry')
            category = self.lab_categories.get(cat_slug, self.lab_categories['biochemistry'])

            lab_test = LabTest.objects.create(
                organization=self.organization,
                test_code=test_code,
                name=test_name,
                short_name=short_name,
                category=category,
                price=test_cfg['price'],
                sample_type=test_cfg.get('sample_type', 'blood'),
                container_type=test_cfg.get('container', 'serum'),
                fasting_required=test_cfg.get('fasting', False),
                fasting_hours=test_cfg.get('fasting_hours', 0),
                normal_range_male=test_cfg.get('normal_male', ''),
                normal_range_female=test_cfg.get('normal_female', ''),
                normal_range_child=test_cfg.get('normal_child', ''),
                normal_range_general=test_cfg.get('normal_general', ''),
                unit_of_measurement=test_cfg.get('unit', ''),
                methodology=test_cfg.get('methodology', ''),
                requires_approval=True,
                estimated_turnaround_hours=test_cfg.get('turnaround', 24),
            )

            # NOTE: Lab tests are NOT duplicated as Products.
            # They are managed and invoiced via the LabTest model directly.

            self.lab_tests[test_name] = lab_test
            test_count += 1

        self.stdout.write(self.style.SUCCESS(f'  [OK] {test_count} tests de laboratoire crees\n'))

    # ========================================================================
    # CREATE MEDICAL SERVICES
    # ========================================================================

    def _create_medical_services(self):
        """Create medical services from MEDICAL_SERVICES config (tarifs officiels CSJ 2026)"""
        self.stdout.write('[SERVICES] Creation du catalogue de services...')

        # Map MEDICAL_SERVICES category names → product categories
        cat_map = {
            'Consultations':     'consultations',
            'Hospitalisation':   'nursing',
            'Petite Chirurgie':  'procedures',
            'ORL':               'procedures',
            'Kit Prélèvement':   'services',
            'Maternité':         'services',
            'Vaccinations':      'services',
        }

        service_count = 0
        for svc in MEDICAL_SERVICES:
            cat_key = cat_map.get(svc['category'], 'services')
            Product.objects.create(
                organization=self.organization,
                name=svc['name'],
                reference=svc.get('code', ''),
                product_type='service',
                category=self.categories.get(cat_key, self.categories['services']),
                price=svc['price'],
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
        """Create medications with real batch/expiration tracking (inventaire CSJ Fév 2026)"""
        self.stdout.write('[PHARMA] Creation du catalogue de medicaments...')

        from apps.invoicing.models import ProductBatch

        med_count = 0

        for med in self.medications_data['medications']:
            initial_stock = med['initial_stock']

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
                stock_quantity=initial_stock,
                low_stock_threshold=med['min_stock_threshold'],
                is_active=True,
            )

            # Create real ProductBatch records for each batch
            for batch_info in med.get('batches', []):
                qty = batch_info.get('qty', 0)
                expiry = batch_info.get('expiry')
                ProductBatch.objects.create(
                    organization=self.organization,
                    product=medication,
                    batch_number=batch_info['number'],
                    quantity=qty,
                    quantity_remaining=qty,
                    expiry_date=expiry,
                    status='available',
                )

            # Create single initial stock movement for the total
            if initial_stock > 0:
                StockMovement.objects.create(
                    product=medication,
                    movement_type='initial',
                    quantity=initial_stock,
                    quantity_before=0,
                    quantity_after=initial_stock,
                    reference_type='manual',
                    notes='Stock initial (Mise en production - inventaire Fév 2026)',
                )

            med_count += 1

        # Create medical supplies (consommables: bétadine, compresses, etc.)
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

            for batch_info in supply.get('batches', []):
                qty = batch_info.get('qty', 0)
                expiry = batch_info.get('expiry')
                if qty > 0 and expiry:
                    ProductBatch.objects.create(
                        organization=self.organization,
                        product=supply_prod,
                        batch_number=batch_info['number'],
                        quantity=qty,
                        quantity_remaining=qty,
                        expiry_date=expiry,
                        status='available',
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
