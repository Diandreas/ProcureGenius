"""
Management command pour créer les données du Centre de Santé JULIANNA
avec 3 comptes utilisateurs et des interactions complètes dans tous les modules healthcare.

Usage:
    python manage.py create_julianna_healthcare
"""

import random
from datetime import datetime, timedelta, date
from decimal import Decimal
import traceback
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils.text import slugify # Add this import
import uuid # This is already imported, but ensure it is there.

# Import des modèles
from apps.accounts.models import Organization, Client
from apps.core.models import OrganizationSettings
from apps.laboratory.models import LabTestCategory, LabTest, LabOrder, LabOrderItem
from apps.consultations.models import Consultation, Prescription, PrescriptionItem
from apps.pharmacy.models import PharmacyDispensing, DispensingItem
from apps.patients.models import PatientVisit
from apps.invoicing.models import Product, ProductCategory, StockMovement

# Import de la configuration des tests et services
from .julianna_tests_config import LAB_CATEGORIES, LAB_TESTS, MEDICAL_SERVICES, ORGANIZATION_INFO

User = get_user_model()


class Command(BaseCommand):
    help = 'Crée le Centre de Santé JULIANNA avec 3 utilisateurs et des interactions healthcare complètes'

    def __init__(self):
        super().__init__()
        self.organization = None
        self.users = {}
        self.patients = {}
        self.lab_categories = {}
        self.lab_tests = {}
        self.medications = {}
        self.visits = {}
        self.consultations = {}
        self.lab_orders = {}
        self.prescriptions = {}
        self.dispensings = {}

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Supprimer et recréer les données JULIANNA'
        )

    def handle(self, *args, **options):
        reset = options.get('reset', False)

        self.stdout.write(self.style.SUCCESS('\n' + '='*80))
        self.stdout.write(self.style.SUCCESS('    CRÉATION DU CENTRE DE SANTÉ JULIANNA (CSJ)'))
        self.stdout.write(self.style.SUCCESS('='*80 + '\n'))

        if reset:
            self.stdout.write(self.style.WARNING('Mode reset activé - Suppression des données existantes...'))
            self._delete_existing_data()

        try:
                # 1. Créer l'organisation
                self._create_organization()

                # 2. Créer les utilisateurs (3 comptes)
                self._create_users()

                # 3. Créer le catalogue de tests de laboratoire
                self._create_lab_catalog()

                # 4. Créer le catalogue de médicaments
                self._create_medication_catalog()

                # 4.1 Créer les services medicaux
                self._create_medical_services()

                # 5. Créer les patients (Fabrice et Angel)
                self._create_patients()

                # 6. Créer les scénarios d'interactions
                self._create_scenarios()

                self.stdout.write(self.style.SUCCESS('\n' + '='*80))
                self.stdout.write(self.style.SUCCESS('    CRÉATION TERMINÉE AVEC SUCCÈS'))
                self.stdout.write(self.style.SUCCESS('='*80 + '\n'))
                self._print_summary()

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n[ERROR] ERREUR: {str(e)}'))
            traceback.print_exc()
            raise

    def _delete_existing_data(self):
        """Supprime les données JULIANNA existantes"""
        try:
            org = Organization.objects.filter(name__icontains='JULIANNA').first()
            if org:
                self.stdout.write(f'  Suppression de l\'organisation {org.name}...')
                org.delete()
                self.stdout.write(self.style.SUCCESS('  [OK] Données supprimées'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'  Avertissement: {str(e)}'))

    def _create_organization(self):
        """Crée l'organisation Centre de Santé JULIANNA"""
        self.stdout.write('\n[ETAPE 1] Creation de l\'organisation...')

        self.organization, created = Organization.objects.get_or_create(
            name=ORGANIZATION_INFO['name'],
            defaults={
                'subscription_type': ORGANIZATION_INFO['subscription_type'],
                'enabled_modules': ORGANIZATION_INFO['enabled_modules'],
            }
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f'  [OK] Organisation créée: {self.organization.name}'))
        else:
            self.stdout.write(self.style.WARNING(f'  [WARN] Organisation existante: {self.organization.name}'))
        
        settings, created_settings = OrganizationSettings.objects.update_or_create(
            organization=self.organization,
            defaults={
                'company_name': ORGANIZATION_INFO.get('name'),
                'company_address': ORGANIZATION_INFO.get('address'),
                'company_phone': ORGANIZATION_INFO.get('phone_orange'),
                'company_email': ORGANIZATION_INFO.get('email'),
                'company_website': ORGANIZATION_INFO.get('website'),
                'default_currency': 'XAF', # Set currency to XAF
            }
        )
        if created_settings:
            self.stdout.write(self.style.SUCCESS(f'  [OK] Paramètres de l\'organisation créés (Devise: XAF)'))
        else:
            self.stdout.write(self.style.SUCCESS(f'  [OK] Paramètres de l\'organisation mis à jour (Devise: XAF)'))
        
        self.stdout.write(f'    - ID: {self.organization.id}')
        self.stdout.write(f'    - Type: {self.organization.subscription_type}')
        self.stdout.write(f'    - Modules: {len(self.organization.enabled_modules)}')
        self.stdout.write(f'    - Localisation: {ORGANIZATION_INFO["city"]}, {ORGANIZATION_INFO["country"]}')

    def _create_users(self):
        """Crée les 4 utilisateurs du CSJ (1 admin + 3 staff)"""
        self.stdout.write('\n[USERS] ÉTAPE 2: Création des utilisateurs...')

        users_config = [
            {
                'username': 'julianna_admin',
                'email': 'admin@csj.cm',
                'first_name': 'Boris',
                'last_name': 'TCHUENTE',
                'role': 'admin',
                'phone': '+237670123455',
                'password': 'julianna2025',
                'is_staff': True,
                'is_superuser': False,
            },
            {
                'username': 'julianna_reception',
                'email': 'reception@csj.cm',
                'first_name': 'Marie',
                'last_name': 'NGONO',
                'role': 'receptionist',
                'phone': '+237670123456',
                'password': 'julianna2025',
            },
            {
                'username': 'julianna_doctor',
                'email': 'docteur@csj.cm',
                'first_name': 'Dr. Paul',
                'last_name': 'EBODE',
                'role': 'doctor',
                'phone': '+237670123457',
                'password': 'julianna2025',
            },
            {
                'username': 'julianna_lab',
                'email': 'labo@csj.cm',
                'first_name': 'Jean',
                'last_name': 'FOTSO',
                'role': 'lab_tech',
                'phone': '+237670123458',
                'password': 'julianna2025',
            },
        ]

        for user_data in users_config:
            username = user_data.pop('username')
            password = user_data.pop('password')

            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    **user_data,
                    'organization': self.organization,
                    'email_verified': True,
                    'is_active': True,
                }
            )

            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(self.style.SUCCESS(
                    f'  [OK] Utilisateur créé: {user.get_full_name()} ({user.role})'
                ))
                self.stdout.write(f'    - Username: {username}')
                self.stdout.write(f'    - Email: {user.email}')
                self.stdout.write(f'    - Password: {password}')
            else:
                self.stdout.write(self.style.WARNING(
                    f'  [WARN] Utilisateur existant: {user.get_full_name()}'
                ))

            self.users[user.role] = user

    def _create_lab_catalog(self):
        """Crée le catalogue complet de 82 tests de laboratoire"""
        self.stdout.write('\n[LAB] ÉTAPE 3: Création du catalogue de tests (82 tests)...')

        # Créer les catégories depuis la configuration
        for cat_data in LAB_CATEGORIES:
            category, created = LabTestCategory.objects.get_or_create(
                organization=self.organization,
                slug=cat_data['slug'],
                defaults={
                    'name': cat_data['name'],
                    'display_order': cat_data['order'],
                    'is_active': True,
                }
            )
            self.lab_categories[cat_data['slug']] = category

            if created:
                self.stdout.write(f'  [OK] Catégorie: {category.name}')

        # Créer les 82 tests depuis la configuration
        tests_created = 0
        for test_data in LAB_TESTS:
            category_slug = test_data['category']
            category = self.lab_categories.get(category_slug)
            
            if not category:
                self.stdout.write(self.style.WARNING(
                    f'  [WARN] Catégorie non trouvée: {category_slug} pour {test_data["name"]}'
                ))
                continue

            # Gérer le prix spécial "Sur devis"
            price = test_data['price']
            if price == -1:
                price = 0  # Prix sur devis

            test, created = LabTest.objects.get_or_create(
                organization=self.organization,
                test_code=test_data['code'],
                defaults={
                    'category': category,
                    'name': test_data['name'],
                    'short_name': test_data['short_name'],
                    'price': price,
                    'sample_type': test_data.get('sample_type', 'blood'),
                    'container_type': test_data.get('container', 'serum'),
                    'sample_volume': test_data.get('sample_volume', ''),
                    'fasting_required': test_data.get('fasting', False),
                    'fasting_hours': test_data.get('fasting_hours', 0),
                    'estimated_turnaround_hours': test_data.get('turnaround', 24),
                    'unit_of_measurement': test_data.get('unit', ''),
                    'normal_range_male': test_data.get('normal_male', ''),
                    'normal_range_female': test_data.get('normal_female', ''),
                    'normal_range_general': test_data.get('normal_general', ''),
                    'methodology': test_data.get('methodology', ''),
                    'is_active': True,
                    'requires_approval': True,
                }
            )

            self.lab_tests[test_data['code']] = test

            if created:
                tests_created += 1
                if price > 0:
                    self.stdout.write(f'  [OK] {test.short_name} ({test.price} FCFA)')
                else:
                    self.stdout.write(f'  [OK] {test.short_name} (Sur devis)')

        self.stdout.write(self.style.SUCCESS(
            f'\n  Total: {len(self.lab_categories)} catégories, {tests_created} tests créés'
        ))

    def _create_medication_catalog(self):
        """Crée le catalogue de médicaments pour la pharmacie"""
        self.stdout.write('\n[PHARMA] ÉTAPE 4: Création du catalogue de médicaments...')

        # Créer la catégorie Médicaments
        med_category, _ = ProductCategory.objects.get_or_create(
            organization=self.organization,
            slug='medicaments',
            defaults={
                'name': 'Médicaments',
                'description': 'Produits pharmaceutiques',
                'is_active': True,
            }
        )

        medications_config = [
            {
                'name': 'Paracétamol 500mg',
                'reference': 'MED-PARA-500',
                'price': 100,
                'cost_price': 50,
                'stock': 500,
                'min_stock': 50,
            },
            {
                'name': 'Amoxicilline 500mg',
                'reference': 'MED-AMOX-500',
                'price': 200,
                'cost_price': 120,
                'stock': 300,
                'min_stock': 30,
            },
            {
                'name': 'Ciprofloxacine 500mg',
                'reference': 'MED-CIPRO-500',
                'price': 250,
                'cost_price': 150,
                'stock': 200,
                'min_stock': 20,
            },
            {
                'name': 'Ibuprofène 400mg',
                'reference': 'MED-IBU-400',
                'price': 150,
                'cost_price': 80,
                'stock': 400,
                'min_stock': 40,
            },
            {
                'name': 'Metronidazole 500mg',
                'reference': 'MED-METRO-500',
                'price': 180,
                'cost_price': 100,
                'stock': 250,
                'min_stock': 25,
            },
            {
                'name': 'Artemether + Lumefantrine (Coartem)',
                'reference': 'MED-COAR',
                'price': 3000,
                'cost_price': 2000,
                'stock': 100,
                'min_stock': 20,
            },
            {
                'name': 'Omeprazole 20mg',
                'reference': 'MED-OMEP-20',
                'price': 300,
                'cost_price': 180,
                'stock': 150,
                'min_stock': 15,
            },
            {
                'name': 'Vitamine C 500mg',
                'reference': 'MED-VITC-500',
                'price': 100,
                'cost_price': 50,
                'stock': 600,
                'min_stock': 50,
            },
        ]

        for med_data in medications_config:
            stock_qty = med_data.pop('stock')
            min_stock = med_data.pop('min_stock')

            medication, created = Product.objects.get_or_create(
                organization=self.organization,
                reference=med_data['reference'],
                defaults={
                    'name': med_data['name'],
                    'category': med_category,
                    'price': med_data['price'],
                    'cost_price': med_data['cost_price'],
                    'stock_quantity': stock_qty,
                    'low_stock_threshold': min_stock,
                    'product_type': 'physical',
                    'is_active': True,
                }
            )

            self.medications[med_data['reference']] = medication

            if created:
                self.stdout.write(
                    f'  [OK] Médicament: {medication.name} '
                    f'({medication.stock_quantity} unités)'
                )

        self.stdout.write(self.style.SUCCESS(
            f'\n  Total: {len(self.medications)} médicaments en stock'
        ))

    def _create_medical_services(self):
        """Crée le catalogue des services et soins médicaux"""
        self.stdout.write('\n[SERVICES] ÉTAPE 4.1: Création du catalogue de services médicaux...')

        # Créer la catégorie "Services Médicaux"
        service_category, _ = ProductCategory.objects.get_or_create(
            organization=self.organization,
            slug='services-medicaux',
            defaults={
                'name': 'Services Médicaux',
                'description': 'Consultations, soins, imagerie, etc.',
                'is_active': True,
            }
        )

        services_created = 0
        for service_data in MEDICAL_SERVICES:
            # Generate a unique reference for the service
            base_ref = slugify(service_data['name']).upper()
            # Ensure uniqueness by appending a random string/number
            reference = f"SVC-{base_ref[:20]}-{uuid.uuid4().hex[:6].upper()}"
            
            product, created = Product.objects.get_or_create(
                organization=self.organization,
                reference=reference, # Use the generated reference for lookup
                defaults={
                    'name': service_data['name'],
                    'product_type': 'service',
                    'category': service_category,
                    'price': service_data['price'],
                    'description': f'Service médical: {service_data["name"]}',
                    'is_active': True,
                    'stock_quantity': 0, # Service products do not have stock, set to 0
                    'low_stock_threshold': 0, # Service products do not have stock, set to 0
                }
            )

            if created:
                services_created += 1
                self.stdout.write(
                    f'  [OK] Service: {product.name} ({product.price} FCFA)'
                )

        self.stdout.write(self.style.SUCCESS(
            f'\n  Total: {services_created} services médicaux créés'
        ))

    def _create_patients(self):
        """Crée les patients Fabrice et Angel"""
        self.stdout.write('\n[PATIENT] ÉTAPE 5: Création des patients...')

        patients_config = [
            {
                'name': 'Fabrice KAMGA',
                'email': 'fabrice.kamga@email.cm',
                'phone': '+237650111222',
                'whatsapp': '+237650111222',
                'address': 'Quartier Mvog-Ada, Yaoundé',
                'date_of_birth': date(1988, 3, 15),
                'gender': 'M',
                'blood_type': 'O+',
                'allergies': 'Pénicilline',
                'chronic_conditions': 'Hypertension',
                'emergency_contact_name': 'Jeanne KAMGA',
                'emergency_contact_phone': '+237650111223',
                'registration_source': 'internal',
            },
            {
                'name': 'Angel MBALLA',
                'email': 'angel.mballa@email.cm',
                'phone': '+237670333444',
                'whatsapp': '+237670333444',
                'address': 'Quartier Bastos, Yaoundé',
                'date_of_birth': date(1992, 7, 22),
                'gender': 'F',
                'blood_type': 'A+',
                'allergies': 'Aucune',
                'chronic_conditions': '',
                'emergency_contact_name': 'Marc MBALLA',
                'emergency_contact_phone': '+237670333445',
                'registration_source': 'external',
                'referring_hospital': 'Hôpital Central de Yaoundé',
            },
        ]

        for patient_data in patients_config:
            patient_name = patient_data['name']

            patient, created = Client.objects.get_or_create(
                organization=self.organization,
                email=patient_data['email'],
                defaults={
                    **patient_data,
                    'client_type': 'patient',
                    'is_active': True,
                }
            )

            self.patients[patient_name.split()[0]] = patient

            if created:
                self.stdout.write(self.style.SUCCESS(
                    f'  [OK] Patient créé: {patient.name} ({patient.patient_number})'
                ))
                self.stdout.write(f'    - Âge: {patient.get_age()} ans')
                self.stdout.write(f'    - Groupe sanguin: {patient.blood_type}')
                self.stdout.write(f'    - Origine: {patient.registration_source}')
            else:
                self.stdout.write(self.style.WARNING(
                    f'  [WARN] Patient existant: {patient.name}'
                ))

    def _create_scenarios(self):
        """Crée les scénarios complets d'interactions"""
        self.stdout.write('\n[SCENARIO] ÉTAPE 6: Création des scénarios d\'interactions...')

        # Scénario 1: Fabrice - Première consultation
        self._scenario_fabrice_consultation()

        # Scénario 2: Fabrice - Examens de laboratoire
        self._scenario_fabrice_laboratory()

        # Scénario 3: Fabrice - Récupération des résultats
        self._scenario_fabrice_results()

        # Scénario 4: Fabrice - Achat de médicaments
        self._scenario_fabrice_pharmacy()

        # Scénario 5: Angel - Patient externe pour examens
        self._scenario_angel_external()

    def _scenario_fabrice_consultation(self):
        """Cas 1a: Fabrice vient pour une première consultation"""
        self.stdout.write('\n  [NOTE] Scénario 1: Fabrice - Première consultation')

        fabrice = self.patients['Fabrice']
        receptionist = self.users['receptionist']
        doctor = self.users['doctor']

        # Date de la visite: il y a 7 jours
        visit_date = timezone.now() - timedelta(days=7)

        # 1. Enregistrement à la réception (Check-in)
        visit = PatientVisit.objects.create(
            organization=self.organization,
            patient=fabrice,
            visit_type='consultation',
            status='completed',
            priority='routine',
            chief_complaint='Maux de tête persistants et fièvre',
            notes='Première visite au CSJ. Patient orienté par un ami.',
            registered_by=receptionist,
            assigned_doctor=doctor,
            arrived_at=visit_date,
            consultation_started_at=visit_date + timedelta(minutes=15),
            consultation_ended_at=visit_date + timedelta(minutes=45),
            completed_at=visit_date + timedelta(hours=2),
        )
        self.visits['fabrice_consultation'] = visit
        self.stdout.write(f'    [OK] Visite enregistrée: {visit.visit_number}')

        # 2. Consultation médicale
        consultation = Consultation.objects.create(
            organization=self.organization,
            patient=fabrice,
            visit=visit,
            doctor=doctor,
            consultation_date=visit_date + timedelta(minutes=15),
            # Signes vitaux
            temperature=Decimal('38.2'),
            blood_pressure_systolic=135,
            blood_pressure_diastolic=85,
            heart_rate=78,
            respiratory_rate=16,
            oxygen_saturation=98,
            weight=Decimal('75.5'),
            height=Decimal('172'),
            # Informations cliniques
            chief_complaint='Maux de tête persistants et fièvre depuis 3 jours',
            history_of_present_illness=(
                'Le patient se plaint de céphalées frontales intenses '
                'accompagnées de fièvre modérée (38-39°C) depuis 3 jours. '
                'Pas de nausées ni vomissements. Légère photophobie.'
            ),
            physical_examination=(
                'État général conservé. Conjonctives légèrement pâles. '
                'Pas de raideur de nuque. Thorax: MV bien perçus. '
                'Abdomen: souple, indolore. TA: 135/85 mmHg.'
            ),
            diagnosis='Syndrome fébrile - Suspicion de paludisme',
            diagnosis_codes={'icd10': ['R50.9', 'R51']},
            treatment_plan=(
                '1. Examens biologiques: GE Paludisme, NFS\n'
                '2. Antipyrétique en attendant résultats\n'
                '3. Traitement antipaludique si GE positive'
            ),
            follow_up_required=True,
            follow_up_date=visit_date.date() + timedelta(days=3),
            follow_up_instructions='Revenir avec les résultats d\'examens',
            patient_instructions=(
                '- Prendre le paracétamol toutes les 8h en cas de fièvre\n'
                '- Bien s\'hydrater\n'
                '- Revenir immédiatement si aggravation'
            ),
        )
        self.consultations['fabrice_consultation'] = consultation
        self.stdout.write(f'    [OK] Consultation créée: {consultation.consultation_number}')
        self.stdout.write(f'      Diagnostic: {consultation.diagnosis}')

        # 3. Prescription de médicaments (antipyrétique)
        prescription = Prescription.objects.create(
            organization=self.organization,
            consultation=consultation,
            patient=fabrice,
            prescriber=doctor,
            prescribed_date=visit_date + timedelta(minutes=40),
            valid_until=(visit_date + timedelta(days=30)).date(),
            status='filled',
            notes='Antipyrétique en attendant les résultats d\'examens',
        )
        self.prescriptions['fabrice_rx1'] = prescription

        # Items de prescription
        PrescriptionItem.objects.create(
            prescription=prescription,
            medication=self.medications['MED-PARA-500'],
            medication_name='Paracétamol 500mg',
            dosage='500mg',
            frequency='3 fois par jour',
            duration='5 jours',
            route='oral',
            quantity_prescribed=15,
            quantity_dispensed=15,
            is_dispensed=True,
            instructions='Prendre 1 comprimé toutes les 8 heures après les repas',
        )

        self.stdout.write(f'    [OK] Ordonnance créée: {prescription.prescription_number}')
        self.stdout.write(f'      Statut: {prescription.status}')

    def _scenario_fabrice_laboratory(self):
        """Cas 1b: Fabrice revient pour effectuer des examens"""
        self.stdout.write('\n  [LAB] Scénario 2: Fabrice - Examens de laboratoire')

        fabrice = self.patients['Fabrice']
        receptionist = self.users['receptionist']
        doctor = self.users['doctor']
        lab_tech = self.users['lab_tech']

        # Date: il y a 6 jours (1 jour après consultation)
        visit_date = timezone.now() - timedelta(days=6)

        # 1. Visite pour examens
        visit = PatientVisit.objects.create(
            organization=self.organization,
            patient=fabrice,
            visit_type='laboratory',
            status='completed',
            priority='routine',
            chief_complaint='Venue pour examens prescrits',
            notes='Examens prescrits lors de la consultation du ' +
                  (visit_date - timedelta(days=1)).strftime('%d/%m/%Y'),
            registered_by=receptionist,
            arrived_at=visit_date,
            completed_at=visit_date + timedelta(hours=1),
        )
        self.visits['fabrice_lab'] = visit
        self.stdout.write(f'    [OK] Visite lab enregistrée: {visit.visit_number}')

        # 2. Commande de laboratoire
        lab_order = LabOrder.objects.create(
            organization=self.organization,
            patient=fabrice,
            visit=visit,
            order_date=visit_date,
            status='results_ready',
            priority='routine',
            clinical_notes='Syndrome fébrile - Suspicion de paludisme',
            ordered_by=doctor,
            sample_collected_by=lab_tech,
            sample_collected_at=visit_date + timedelta(minutes=10),
            results_entered_by=lab_tech,
            results_completed_at=visit_date + timedelta(hours=2),
            results_verified_by=lab_tech,
            notification_sent=True,
            notification_sent_at=visit_date + timedelta(hours=3),
        )
        self.lab_orders['fabrice_lab1'] = lab_order
        self.stdout.write(f'    [OK] Commande labo créée: {lab_order.order_number}')

        # 3. Tests individuels avec résultats

        # Test 1: Goutte Épaisse (Paludisme) - POSITIF
        LabOrderItem.objects.create(
            lab_order=lab_order,
            lab_test=self.lab_tests['PARA-PALU'],
            result_value='Présence de trophozoïtes de Plasmodium falciparum',
            result_numeric=Decimal('15000'),
            result_unit='Parasites/µL',
            reference_range='Absence de parasites',
            abnormality_type='critical_high',
            is_abnormal=True,
            is_critical=True,
            interpretation=(
                'Paludisme à Plasmodium falciparum. '
                'Parasitémie modérée (15 000 parasites/µL). '
                'Traitement antipaludique recommandé.'
            ),
            technician_notes='Bon prélèvement. Lames de bonne qualité.',
            result_entered_at=visit_date + timedelta(hours=1, minutes=30),
            result_verified_at=visit_date + timedelta(hours=2),
            verified_by=lab_tech,
        )

        # Test 2: NFS (Numération Formule Sanguine)
        LabOrderItem.objects.create(
            lab_order=lab_order,
            lab_test=self.lab_tests['HEM-NFS'],
            result_value='Légère anémie',
            result_numeric=Decimal('4.2'),
            result_unit='G/L',
            reference_range='4.5-5.5 G/L (Homme)',
            abnormality_type='low',
            is_abnormal=True,
            is_critical=False,
            interpretation=(
                'Numération globulaire légèrement basse. '
                'Compatible avec une anémie modérée probablement '
                'secondaire à l\'infection palustre.'
            ),
            technician_notes='Prélèvement correct. Analyse complète effectuée.',
            result_entered_at=visit_date + timedelta(hours=1, minutes=45),
            result_verified_at=visit_date + timedelta(hours=2),
            verified_by=lab_tech,
        )

        self.stdout.write(f'    [OK] Résultats saisis: {lab_order.items.count()} tests')
        self.stdout.write(f'      - Paludisme: POSITIF (15 000 parasites/µL)')
        self.stdout.write(f'      - NFS: Légère anémie')

    def _scenario_fabrice_results(self):
        """Cas 1c: Fabrice revient récupérer ses résultats"""
        self.stdout.write('\n  [DOC] Scénario 3: Fabrice - Récupération des résultats')

        fabrice = self.patients['Fabrice']
        receptionist = self.users['receptionist']
        doctor = self.users['doctor']

        # Date: il y a 5 jours (1 jour après les examens)
        visit_date = timezone.now() - timedelta(days=5)

        # 1. Visite pour récupération de résultats et consultation
        visit = PatientVisit.objects.create(
            organization=self.organization,
            patient=fabrice,
            visit_type='follow_up',
            status='completed',
            priority='routine',
            chief_complaint='Récupération des résultats d\'examens',
            notes='Résultats disponibles. Notification SMS envoyée.',
            registered_by=receptionist,
            assigned_doctor=doctor,
            arrived_at=visit_date,
            consultation_started_at=visit_date + timedelta(minutes=10),
            consultation_ended_at=visit_date + timedelta(minutes=30),
            completed_at=visit_date + timedelta(hours=1),
        )
        self.visits['fabrice_followup'] = visit
        self.stdout.write(f'    [OK] Visite follow-up: {visit.visit_number}')

        # 2. Consultation de suivi avec résultats
        consultation = Consultation.objects.create(
            organization=self.organization,
            patient=fabrice,
            visit=visit,
            doctor=doctor,
            consultation_date=visit_date + timedelta(minutes=10),
            # Signes vitaux
            temperature=Decimal('37.5'),
            blood_pressure_systolic=130,
            blood_pressure_diastolic=82,
            heart_rate=75,
            respiratory_rate=15,
            oxygen_saturation=99,
            weight=Decimal('75.0'),
            height=Decimal('172'),
            # Informations cliniques
            chief_complaint='Suivi - Résultats d\'examens',
            history_of_present_illness=(
                'Patient revient pour résultats. '
                'Fièvre a diminué mais persiste. '
                'Céphalées moins intenses.'
            ),
            physical_examination=(
                'État général amélioré. Température: 37.5°C. '
                'Conjonctives légèrement pâles. '
                'Pas de signe de gravité.'
            ),
            diagnosis='Paludisme à Plasmodium falciparum confirmé + Anémie modérée',
            diagnosis_codes={'icd10': ['B50.0', 'D64.9']},
            treatment_plan=(
                '1. Traitement antipaludique complet (Coartem)\n'
                '2. Supplémentation en fer\n'
                '3. Repos et hydratation\n'
                '4. Contrôle dans 1 semaine'
            ),
            follow_up_required=True,
            follow_up_date=visit_date.date() + timedelta(days=7),
            follow_up_instructions='Contrôle post-traitement',
            patient_instructions=(
                '- Compléter TOUT le traitement antipaludique\n'
                '- Prendre les comprimés de fer\n'
                '- Alimentation riche en protéines\n'
                '- Revenir si fièvre persiste après 3 jours'
            ),
        )
        self.consultations['fabrice_followup'] = consultation
        self.stdout.write(f'    [OK] Consultation de suivi: {consultation.consultation_number}')
        self.stdout.write(f'      Diagnostic confirmé: Paludisme')

        # 3. Nouvelle prescription (traitement complet)
        prescription = Prescription.objects.create(
            organization=self.organization,
            consultation=consultation,
            patient=fabrice,
            prescriber=doctor,
            prescribed_date=visit_date + timedelta(minutes=25),
            valid_until=(visit_date + timedelta(days=30)).date(),
            status='filled',
            notes='Traitement complet du paludisme confirmé',
        )
        self.prescriptions['fabrice_rx2'] = prescription

        # Antipaludique
        PrescriptionItem.objects.create(
            prescription=prescription,
            medication=self.medications['MED-COAR'],
            medication_name='Artemether + Lumefantrine (Coartem)',
            dosage='4 comprimés',
            frequency='2 fois par jour',
            duration='3 jours',
            route='oral',
            quantity_prescribed=1,
            quantity_dispensed=1,
            is_dispensed=True,
            instructions='Prendre 4 comprimés matin et soir pendant 3 jours avec un repas gras',
        )

        self.stdout.write(f'    [OK] Nouvelle ordonnance: {prescription.prescription_number}')
        self.stdout.write(f'      Traitement antipaludique prescrit')

    def _scenario_fabrice_pharmacy(self):
        """Cas 1d: Fabrice achète des médicaments à la pharmacie"""
        self.stdout.write('\n  [PHARMA] Scénario 4: Fabrice - Achat de médicaments (OTC)')

        fabrice = self.patients['Fabrice']
        receptionist = self.users['receptionist']  # Peut aussi dispenser

        # Date: il y a 2 jours
        dispensing_date = timezone.now() - timedelta(days=2)

        # Dispensation sans ordonnance (vente au comptoir)
        dispensing = PharmacyDispensing.objects.create(
            organization=self.organization,
            patient=fabrice,
            dispensed_at=dispensing_date,
            status='dispensed',
            dispensed_by=receptionist,
            counseling_provided=True,
            counseling_notes=(
                'Patient informé de bien s\'hydrater. '
                'Prendre les vitamines après les repas.'
            ),
            notes='Achat au comptoir - Pas d\'ordonnance',
        )
        self.dispensings['fabrice_otc'] = dispensing

        # Items dispensés
        DispensingItem.objects.create(
            dispensing=dispensing,
            medication=self.medications['MED-VITC-500'],
            quantity_dispensed=30,
            unit_cost=self.medications['MED-VITC-500'].cost_price,
            unit_price=self.medications['MED-VITC-500'].price,
            dosage_instructions='1 comprimé par jour',
            frequency='1 fois par jour',
            duration='30 jours',
            route='oral',
            notes='Supplément vitaminique',
        )

        DispensingItem.objects.create(
            dispensing=dispensing,
            medication=self.medications['MED-PARA-500'],
            quantity_dispensed=10,
            unit_cost=self.medications['MED-PARA-500'].cost_price,
            unit_price=self.medications['MED-PARA-500'].price,
            dosage_instructions='1 comprimé si douleur',
            frequency='Au besoin (max 3x/jour)',
            duration='',
            route='oral',
            notes='En cas de maux de tête résiduels',
        )

        self.stdout.write(f'    [OK] Dispensation créée: {dispensing.dispensing_number}')
        self.stdout.write(f'      Items: {dispensing.items.count()} médicaments')
        self.stdout.write(f'      Total: {dispensing.total_amount} FCFA')

    def _scenario_angel_external(self):
        """Cas 2: Angel - Patiente externe pour examens"""
        self.stdout.write('\n  [HOSPITAL] Scénario 5: Angel - Patiente externe (examens)')

        angel = self.patients['Angel']
        receptionist = self.users['receptionist']
        lab_tech = self.users['lab_tech']

        # Date: il y a 3 jours
        visit_date = timezone.now() - timedelta(days=3)

        # 1. Enregistrement + Visite pour examens
        visit = PatientVisit.objects.create(
            organization=self.organization,
            patient=angel,
            visit_type='laboratory',
            status='completed',
            priority='routine',
            chief_complaint='Examens prescrits par médecin externe',
            notes=(
                'Patiente orientée par l\'Hôpital Central de Yaoundé. '
                'Ordonnance externe pour bilan biochimique complet.'
            ),
            registered_by=receptionist,
            arrived_at=visit_date,
            completed_at=visit_date + timedelta(hours=3),
        )
        self.visits['angel_lab'] = visit
        self.stdout.write(f'    [OK] Visite externe enregistrée: {visit.visit_number}')
        self.stdout.write(f'      Provenance: {angel.referring_hospital}')

        # 2. Commande de laboratoire (bilan complet)
        lab_order = LabOrder.objects.create(
            organization=self.organization,
            patient=angel,
            visit=visit,
            order_date=visit_date,
            status='results_delivered',
            priority='routine',
            clinical_notes='Bilan de santé - Ordonnance externe (Hôpital Central)',
            ordered_by=receptionist,  # Pas de médecin interne
            sample_collected_by=lab_tech,
            sample_collected_at=visit_date + timedelta(minutes=20),
            results_entered_by=lab_tech,
            results_completed_at=visit_date + timedelta(hours=4),
            results_verified_by=lab_tech,
            notification_sent=True,
            notification_sent_at=visit_date + timedelta(hours=5),
        )
        self.lab_orders['angel_lab1'] = lab_order
        self.stdout.write(f'    [OK] Commande labo: {lab_order.order_number}')

        # 3. Tests demandés (bilan complet)

        # Glycémie à jeun
        LabOrderItem.objects.create(
            lab_order=lab_order,
            lab_test=self.lab_tests['BIO-GLU'],
            result_value='0.95',
            result_numeric=Decimal('0.95'),
            result_unit='g/L',
            reference_range='0.70-1.10 g/L',
            abnormality_type='normal',
            is_abnormal=False,
            is_critical=False,
            interpretation='Glycémie à jeun dans les normes.',
            technician_notes='Jeûne respecté (12h). Prélèvement correct.',
            result_entered_at=visit_date + timedelta(hours=3),
            result_verified_at=visit_date + timedelta(hours=4),
            verified_by=lab_tech,
        )

        # Créatinine
        LabOrderItem.objects.create(
            lab_order=lab_order,
            lab_test=self.lab_tests['BIO-CREAS'],
            result_value='8.5',
            result_numeric=Decimal('8.5'),
            result_unit='mg/L',
            reference_range='6-11 mg/L (Femme)',
            abnormality_type='normal',
            is_abnormal=False,
            is_critical=False,
            interpretation='Fonction rénale normale.',
            technician_notes='Prélèvement correct.',
            result_entered_at=visit_date + timedelta(hours=3, minutes=15),
            result_verified_at=visit_date + timedelta(hours=4),
            verified_by=lab_tech,
        )

        # Urée
        LabOrderItem.objects.create(
            lab_order=lab_order,
            lab_test=self.lab_tests['BIO-UREE'],
            result_value='0.32',
            result_numeric=Decimal('0.32'),
            result_unit='g/L',
            reference_range='0.15-0.45 g/L',
            abnormality_type='normal',
            is_abnormal=False,
            is_critical=False,
            interpretation='Urée sanguine normale.',
            technician_notes='Prélèvement correct.',
            result_entered_at=visit_date + timedelta(hours=3, minutes=30),
            result_verified_at=visit_date + timedelta(hours=4),
            verified_by=lab_tech,
        )

        # Sérologie VIH
        LabOrderItem.objects.create(
            lab_order=lab_order,
            lab_test=self.lab_tests['SERO-HIV'],
            result_value='Négatif',
            result_numeric=None,
            result_unit='Qualitatif',
            reference_range='Négatif',
            abnormality_type='normal',
            is_abnormal=False,
            is_critical=False,
            interpretation='Sérologie VIH négative.',
            technician_notes='Test rapide + confirmation ELISA. Confidentiel.',
            result_entered_at=visit_date + timedelta(hours=3, minutes=45),
            result_verified_at=visit_date + timedelta(hours=4),
            verified_by=lab_tech,
        )

        self.stdout.write(f'    [OK] Résultats: {lab_order.items.count()} tests complets')
        self.stdout.write(f'      Bilan: Tous les paramètres normaux')
        self.stdout.write(f'      Résultats remis à la patiente')

    def _print_summary(self):
        """Affiche un résumé de toutes les données créées"""
        self.stdout.write('\n[STATS] RÉSUMÉ DES DONNÉES CRÉÉES:')
        self.stdout.write('='*80)

        self.stdout.write(f'\n[HOSPITAL] ORGANISATION:')
        self.stdout.write(f'  Nom: {self.organization.name}')
        self.stdout.write(f'  Type: {self.organization.subscription_type}')
        self.stdout.write(f'  Modules: {len(self.organization.enabled_modules)}')

        self.stdout.write(f'\n[USERS] UTILISATEURS: {len(self.users)}')
        for role, user in self.users.items():
            self.stdout.write(f'  • {user.get_full_name()} ({role})')
            self.stdout.write(f'    Login: {user.username} / Password: julianna2025')

        self.stdout.write(f'\n[PATIENT] PATIENTS: {len(self.patients)}')
        for name, patient in self.patients.items():
            self.stdout.write(f'  • {patient.name} ({patient.patient_number})')
            self.stdout.write(f'    Âge: {patient.get_age()} ans - Source: {patient.registration_source}')

        self.stdout.write(f'\n[LAB] CATALOGUE LABORATOIRE:')
        self.stdout.write(f'  Catégories: {len(self.lab_categories)}')
        self.stdout.write(f'  Tests disponibles: {len(self.lab_tests)}')
        total_lab_price = sum(test.price for test in self.lab_tests.values())
        self.stdout.write(f'  Valeur catalogue: {total_lab_price} FCFA')

        self.stdout.write(f'\n[PHARMA] CATALOGUE PHARMACIE:')
        self.stdout.write(f'  Médicaments: {len(self.medications)}')
        total_stock_value = sum(
            med.stock_quantity * med.cost_price
            for med in self.medications.values()
        )
        self.stdout.write(f'  Valeur stock: {total_stock_value} FCFA')

        self.stdout.write(f'\n[SCENARIO] INTERACTIONS CRÉÉES:')
        self.stdout.write(f'  Visites: {PatientVisit.objects.filter(organization=self.organization).count()}')
        self.stdout.write(f'  Consultations: {Consultation.objects.filter(organization=self.organization).count()}')
        self.stdout.write(f'  Commandes labo: {LabOrder.objects.filter(organization=self.organization).count()}')
        total_lab_items = sum(
            order.items.count()
            for order in LabOrder.objects.filter(organization=self.organization)
        )
        self.stdout.write(f'  Tests effectués: {total_lab_items}')
        self.stdout.write(f'  Ordonnances: {Prescription.objects.filter(organization=self.organization).count()}')
        self.stdout.write(f'  Dispensations: {PharmacyDispensing.objects.filter(organization=self.organization).count()}')

        self.stdout.write('\n' + '='*80)
        self.stdout.write(self.style.SUCCESS('[OK] Le Centre de Santé JULIANNA est opérationnel!'))
        self.stdout.write('='*80 + '\n')

        self.stdout.write('\n[NOTE] PROCHAINES ÉTAPES:')
        self.stdout.write('  1. Se connecter avec un des comptes utilisateurs')
        self.stdout.write('  2. Explorer les modules Healthcare (Patients, Labo, Pharmacie)')
        self.stdout.write('  3. Consulter l\'historique des patients')
        self.stdout.write('  4. Générer des rapports et statistiques')
        self.stdout.write('')
