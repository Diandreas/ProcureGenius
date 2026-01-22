"""
Management command pour simuler les parcours patients du Centre de Santé JULIANNA (CSJ)
basé sur la typologie des cas fournie par l'utilisateur.

Usage:
    python manage.py simulate_csj_scenarios --reset
"""

import random
from datetime import datetime, timedelta
from decimal import Decimal
import traceback
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils.text import slugify
import uuid

# Import des modèles
from apps.accounts.models import Organization, Client
from apps.core.models import OrganizationSettings
from apps.laboratory.models import LabTestCategory, LabTest, LabOrder, LabOrderItem
from apps.consultations.models import Consultation, Prescription, PrescriptionItem
from apps.pharmacy.models import PharmacyDispensing, DispensingItem
from apps.patients.models import PatientVisit
from apps.invoicing.models import Product, ProductCategory, Invoice, InvoiceItem, Payment

# Import de la configuration des tests et services
from .julianna_tests_config import LAB_CATEGORIES, LAB_TESTS, MEDICAL_SERVICES, ORGANIZATION_INFO

User = get_user_model()

class Command(BaseCommand):
    help = 'Simule les parcours patients complets du CSJ'

    def __init__(self):
        super().__init__()
        self.organization = None
        self.users = {}
        self.patients = {}
        self.lab_tests = {}
        self.products = {}
        self.med_category = None
        self.service_category = None

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Supprimer et recréer les données JULIANNA'
        )

    def handle(self, *args, **options):
        reset = options.get('reset', False)

        self.stdout.write(self.style.SUCCESS('\n' + '='*80))
        self.stdout.write(self.style.SUCCESS('    SIMULATION DES PARCOURS PATIENTS JULIANNA (CSJ)'))
        self.stdout.write(self.style.SUCCESS('='*80 + '\n'))

        if reset:
            self.stdout.write(self.style.WARNING('Mode reset activé - Suppression des données existantes...'))
            self._delete_existing_data()

        try:
            with transaction.atomic():
                # 1. Initialisation de base (reprise de create_julianna_healthcare)
                self._init_base_data()

                # 2. Exécution des Cas
                self._case_1a_fabrice_consultation()
                self._case_1b_fabrice_lab_request()
                self._case_1c_fabrice_results()
                self._case_1d_fabrice_pharmacy()
                self._case_2_angel_external()
                
                # 3. Circuits Spécialisés (Cas 1-8 rapides)
                self._simulate_healthcare_circuits()

                self.stdout.write(self.style.SUCCESS('\n' + '='*80))
                self.stdout.write(self.style.SUCCESS('    SIMULATION TERMINÉE AVEC SUCCÈS'))
                self.stdout.write(self.style.SUCCESS('='*80 + '\n'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n[ERROR] ERREUR: {str(e)}'))
            traceback.print_exc()
            raise

    def _delete_existing_data(self):
        """Supprime les données JULIANNA existantes en respectant les contraintes PROTECT"""
        org = Organization.objects.filter(name__icontains='JULIANNA').first()
        if org:
            self.stdout.write(f'  Nettoyage des données de l\'organisation {org.name}...')
            
            # Supprimer les données en commençant par celles qui "pointent" vers d'autres
            InvoiceItem.objects.filter(invoice__organization=org).delete()
            Payment.objects.filter(invoice__organization=org).delete()
            Invoice.objects.filter(organization=org).delete()
            
            DispensingItem.objects.filter(dispensing__organization=org).delete()
            PharmacyDispensing.objects.filter(organization=org).delete()
            
            LabOrderItem.objects.filter(lab_order__organization=org).delete()
            LabOrder.objects.filter(organization=org).delete()
            
            PrescriptionItem.objects.filter(prescription__consultation__organization=org).delete()
            Prescription.objects.filter(consultation__organization=org).delete()
            Consultation.objects.filter(organization=org).delete()
            
            PatientVisit.objects.filter(organization=org).delete()
            Client.objects.filter(organization=org).delete()
            
            # Les produits peuvent être protégés si référencés ailleurs, 
            # mais ici on est dans un reset d'org spécifique
            Product.objects.filter(organization=org).delete()
            ProductCategory.objects.filter(organization=org).delete()
            
            # Enfin supprimer l'org (les users suivront si possible ou seront supprimés)
            User.objects.filter(organization=org).delete()
            org.delete()
            
            self.stdout.write(self.style.SUCCESS('  [OK] Données précédentes nettoyées'))

    def _init_base_data(self):
        """Initialise l'organisation, les users, et le catalogue"""
        self.stdout.write('[BASE] Initialisation de l\'organisation et du catalogue...')
        
        # Organisation
        self.organization, _ = Organization.objects.get_or_create(
            name=ORGANIZATION_INFO['name'],
            defaults={
                'subscription_type': ORGANIZATION_INFO['subscription_type'],
                'enabled_modules': ORGANIZATION_INFO['enabled_modules'],
            }
        )
        
        OrganizationSettings.objects.update_or_create(
            organization=self.organization,
            defaults={
                'company_name': ORGANIZATION_INFO.get('name'),
                'company_address': ORGANIZATION_INFO.get('address'),
                'company_phone': ORGANIZATION_INFO.get('phone_orange'),
                'company_email': ORGANIZATION_INFO.get('email'),
                'default_currency': 'XAF',
            }
        )

        # Users
        roles = ['admin', 'receptionist', 'doctor', 'lab_tech']
        for role in roles:
            username = f'julianna_{role}'
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'organization': self.organization,
                    'is_staff': True,
                    'role': role,
                    'email': f'{role}@csj.cm',
                    'first_name': role.capitalize(),
                    'last_name': 'CSJ'
                }
            )
            if created:
                user.set_password('julianna2025')
                user.save()
            self.users[role] = user

        # Categories
        self.med_category, _ = ProductCategory.objects.get_or_create(
            organization=self.organization, slug='medicaments', defaults={'name': 'Médicaments'}
        )
        self.service_category, _ = ProductCategory.objects.get_or_create(
            organization=self.organization, slug='services', defaults={'name': 'Services Médicaux'}
        )

        # Lab Catalog
        for cat_data in LAB_CATEGORIES:
            category, _ = LabTestCategory.objects.get_or_create(
                organization=self.organization, slug=cat_data['slug'], defaults={'name': cat_data['name']}
            )
            for test_data in [t for t in LAB_TESTS if t['category'] == cat_data['slug']]:
                test, _ = LabTest.objects.get_or_create(
                    organization=self.organization, test_code=test_data['code'],
                    defaults={
                        'category': category, 'name': test_data['name'], 
                        'short_name': test_data['short_name'], 'price': test_data['price'] if test_data['price'] > 0 else 0
                    }
                )
                self.lab_tests[test.test_code] = test

                # Also create a service product for billing lab tests
                prod_ref = f"CSJ-LAB-{test.test_code}"
                Product.objects.get_or_create(
                    organization=self.organization, reference=prod_ref,
                    defaults={
                        'name': test.name, 'product_type': 'service', 'category': self.service_category,
                        'price': test.price, 'low_stock_threshold': 0
                    }
                )

        # Medical services as Products
        for svc_data in MEDICAL_SERVICES:
            prod_ref = f"CSJ-SVC-{slugify(svc_data['name']).upper()[:15]}"
            prod, _ = Product.objects.get_or_create(
                organization=self.organization, reference=prod_ref,
                defaults={
                    'name': svc_data['name'],
                    'product_type': 'service', 'category': self.service_category,
                    'price': svc_data['price'], 
                    'low_stock_threshold': 0
                }
            )
            self.products[svc_data['name']] = prod

        # Medicines
        meds = [
            ('Paracétamol 500mg', 'CSJ-MED-PARA', 100, 500),
            ('Amoxicilline 500mg', 'CSJ-MED-AMOX', 250, 200),
            ('Coartem', 'CSJ-MED-COAR', 3000, 100),
        ]
        for name, ref, price, stock in meds:
            prod, _ = Product.objects.get_or_create(
                organization=self.organization, reference=ref,
                defaults={
                    'name': name, 'product_type': 'physical', 'category': self.med_category,
                    'price': price, 'cost_price': price/2, 'stock_quantity': stock
                }
            )
            self.products[name] = prod

    def _create_invoice_and_pay(self, client, items, title, status='paid'):
        """Helper pour créer une facture et son paiement"""
        invoice = Invoice.objects.create(
            organization=self.organization,
            client=client,
            title=title,
            created_by=self.users['receptionist'],
            status=status,
            due_date=timezone.now().date(),
            subtotal=0, total_amount=0, tax_amount=0,
            currency='XAF'
        )
        total = Decimal('0')
        for prod, qty in items:
            price = Decimal(str(prod.price or 0))
            if qty is None:
                self.stdout.write(self.style.WARNING(f"  [DEBUG] Qty is None for product {prod.name}"))
                qty = 1
            
            self.stdout.write(f"  - Item: {prod.name}, Qty: {qty}, Price: {price}")
            
            InvoiceItem.objects.create(
                invoice=invoice, product=prod, description=prod.name,
                quantity=qty, unit_price=price, total_price=price * qty
            )
            total += price * qty
        
        invoice.subtotal = total
        invoice.total_amount = total
        invoice.save()

        if status == 'paid':
            Payment.objects.create(
                invoice=invoice, amount=total, payment_date=timezone.now().date(),
                payment_method='cash', created_by=self.users['receptionist'], status='success'
            )
        return invoice

    def _case_1a_fabrice_consultation(self):
        self.stdout.write('[CAS 1a] Fabrice - Enregistrement + Caisse + Consultation')
        
        # 1. Enregistrement
        fabrice, _ = Client.objects.get_or_create(
            organization=self.organization, name='Fabrice KAMGA',
            defaults={
                'phone': '+237650111222', 'whatsapp': '+237650111222',
                'address': 'Mvog-Ada, Yaoundé', 'client_type': 'patient'
            }
        )
        self.patients['Fabrice'] = fabrice

        # 2. Caisse (Frais de consultation)
        items = [(self.products['Consultation Médecin Généraliste'], 1)]
        self._create_invoice_and_pay(fabrice, items, 'Frais de consultation')

        # 3. Visite + Paramètres
        visit = PatientVisit.objects.create(
            organization=self.organization, patient=fabrice, visit_type='consultation',
            status='completed', registered_by=self.users['receptionist'],
            chief_complaint='Fièvre et maux de tête',
            notes='Paramètres: TA 12/8, Temp 38.5°C, Poids 75kg'
        )

        # 4. Consultation médicale
        Consultation.objects.create(
            organization=self.organization, patient=fabrice, visit=visit,
            doctor=self.users['doctor'], consultation_date=timezone.now(),
            diagnosis='Suspicion de Paludisme',
            treatment_plan='Demander NFS + Goutte Epaisse'
        )

    def _case_1b_fabrice_lab_request(self):
        self.stdout.write('[CAS 1b] Fabrice - Caisse + Laboratoire')
        fabrice = self.patients['Fabrice']
        
        # 1. Caisse (Examens)
        exam_nfs = self.lab_tests['HEM-NFS']
        exam_ge = self.lab_tests['PARA-PALU']
        
        # Récupérer les produits services liés aux tests
        prod_nfs = Product.objects.get(organization=self.organization, reference=f"CSJ-LAB-{exam_nfs.test_code}")
        prod_ge = Product.objects.get(organization=self.organization, reference=f"CSJ-LAB-{exam_ge.test_code}")
        
        self._create_invoice_and_pay(fabrice, [(prod_nfs, 1), (prod_ge, 1)], 'Frais d\'examens médicaux')

        # 2. Lab Order
        order = LabOrder.objects.create(
            organization=self.organization, patient=fabrice, status='pending',
            ordered_by=self.users['doctor']
        )
        LabOrderItem.objects.create(lab_order=order, lab_test=exam_nfs)
        LabOrderItem.objects.create(lab_order=order, lab_test=exam_ge)

    def _case_1c_fabrice_results(self):
        self.stdout.write('[CAS 1c] Fabrice - Récupération résultats')
        fabrice = self.patients['Fabrice']
        order = LabOrder.objects.filter(patient=fabrice).latest('created_at')
        
        # Simulation saisie résultats
        order.status = 'results_delivered'
        order.results_completed_at = timezone.now()
        order.save()
        
        for item in order.items.all():
            item.result_value = 'POSITIF (++)' if 'PALU' in item.lab_test.test_code else 'Normal'
            item.save()

    def _case_1d_fabrice_pharmacy(self):
        self.stdout.write('[CAS 1d] Fabrice - Médicaments')
        fabrice = self.patients['Fabrice']
        
        # 1. Caisse
        coartem = self.products['Coartem']
        para = self.products['Paracétamol 500mg']
        self._create_invoice_and_pay(fabrice, [(coartem, 1), (para, 2)], 'Achat médicaments')
        
        # 2. Dispensation
        disp = PharmacyDispensing.objects.create(
            organization=self.organization, patient=fabrice, 
            status='dispensed', dispensed_by=self.users['receptionist']
        )
        DispensingItem.objects.create(dispensing=disp, medication=coartem, quantity_dispensed=1)
        DispensingItem.objects.create(dispensing=disp, medication=para, quantity_dispensed=2)

    def _case_2_angel_external(self):
        self.stdout.write('[CAS 2] Angel - Patient externe (Labo uniquement)')
        
        # 1. Enregistrement
        angel, _ = Client.objects.get_or_create(
            organization=self.organization, name='Angel MBALLA',
            defaults={
                'phone': '+237670333444', 'address': 'Bastos, Yaoundé',
                'client_type': 'patient', 'registration_source': 'external'
            }
        )
        
        # 2. Caisse
        exam_bilan = self.lab_tests['BIO-GLU'] # Glycémie
        prod_glu = Product.objects.get(organization=self.organization, reference=f"CSJ-LAB-{exam_bilan.test_code}")
        self._create_invoice_and_pay(angel, [(prod_glu, 1)], 'Frais examens externes')
        
        # 3. Lab Order
        order = LabOrder.objects.create(
            organization=self.organization, patient=angel, status='results_ready'
        )
        LabOrderItem.objects.create(lab_order=order, lab_test=exam_bilan, result_value='0.95 g/L')

    def _simulate_healthcare_circuits(self):
        self.stdout.write('[CIRCUITS] Simulation des circuits 1 à 8')
        
        circuits_patients = [
            ('Circuit 1', ['consultation', 'soins']),
            ('Circuit 2', ['consultation', 'lab']),
            ('Circuit 3', ['consultation', 'hospit']), # Hospit not fully implemented but can simulate via visit
            ('Circuit 4', ['consultation', 'pharmacy']),
            ('Circuit 5', ['consultation']),
            ('Circuit 6', ['soins']),
            ('Circuit 7', ['lab']),
            ('Circuit 8', ['pharmacy']),
        ]
        
        for name, steps in circuits_patients:
            p_name = f'Patient {name}'
            pat, _ = Client.objects.get_or_create(
                organization=self.organization, name=p_name,
                defaults={'client_type': 'patient', 'phone': f'+2370000000{name[-1]}'}
            )
            
            self.stdout.write(f'  - Simulation {name} pour {p_name}')
            
            # Simple visit reflecting the circuit
            visit = PatientVisit.objects.create(
                organization=self.organization, patient=pat,
                visit_type='consultation' if 'consultation' in steps else 'check_up',
                status='completed', registered_by=self.users['receptionist'],
                notes=f"Parcours: {', '.join(steps)}"
            )
            
            # Create a combined invoice for all steps
            inv_items = []
            if 'consultation' in steps:
                inv_items.append((self.products['Consultation Médecin Généraliste'], 1))
            if 'soins' in steps:
                inv_items.append((self.products.get('Pansement simple', self.products['Consultation Médecin Généraliste']), 1))
            if 'lab' in steps:
                # Use a random lab product
                lab_prod = Product.objects.filter(organization=self.organization, reference__startswith='CSJ-LAB-').first()
                if lab_prod:
                    inv_items.append((lab_prod, 1))
            if 'pharmacy' in steps:
                inv_items.append((self.products['Paracétamol 500mg'], 1))
            
            if inv_items:
                self._create_invoice_and_pay(pat, inv_items, f'Facture globale {name}')
