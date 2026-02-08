"""
Laboratory Information Management System (LIMS) Models
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from decimal import Decimal
import uuid
from apps.core.services.number_generator import NumberGeneratorService


class LabTestCategory(models.Model):
    """
    Lab test categories (e.g., Hématologie, Biochimie, Microbiologie)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='lab_test_categories',
        verbose_name=_("Organisation")
    )
    name = models.CharField(max_length=100, verbose_name=_("Nom"))
    slug = models.SlugField(max_length=100, verbose_name=_("Slug"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    display_order = models.IntegerField(default=0, verbose_name=_("Ordre d'affichage"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Catégorie de test")
        verbose_name_plural = _("Catégories de tests")
        ordering = ['display_order', 'name']
        unique_together = [['organization', 'slug']]
    
    def __str__(self):
        return self.name


class LabTest(models.Model):
    """
    Lab test catalog - standalone LIMS structure (NOT Product)
    Each test has its own pricing, reference ranges, and methodology
    """
    SAMPLE_TYPES = [
        ('blood', _('Sang')),
        ('urine', _('Urine')),
        ('stool', _('Selles')),
        ('swab', _('Prélèvement')),
        ('sputum', _('Expectoration')),
        ('csf', _('LCR (Liquide céphalo-rachidien)')),
        ('tissue', _('Tissu')),
        ('other', _('Autre')),
    ]
    
    CONTAINER_TYPES = [
        ('edta', _('Tube EDTA (violet)')),
        ('serum', _('Tube sec (rouge)')),
        ('citrate', _('Tube citrate (bleu)')),
        ('heparin', _('Tube héparine (vert)')),
        ('fluoride', _('Tube fluorure (gris)')),
        ('urine_cup', _('Pot à urine')),
        ('stool_cup', _('Pot à selles')),
        ('swab_kit', _('Kit de prélèvement')),
        ('other', _('Autre')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='lab_tests',
        verbose_name=_("Organisation")
    )
    category = models.ForeignKey(
        LabTestCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tests',
        verbose_name=_("Catégorie")
    )
    
    # Test identification
    test_code = models.CharField(
        max_length=50,
        verbose_name=_("Code test"),
        help_text=_("Ex: HEM-CBC-001")
    )
    name = models.CharField(max_length=200, verbose_name=_("Nom du test"))
    short_name = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_("Nom court"),
        help_text=_("Abréviation pour affichage rapide")
    )
    description = models.TextField(blank=True, verbose_name=_("Description"))
    
    # Pricing
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name=_("Prix"),
        help_text=_("Prix du test en devise locale")
    )

    # Inventory Link
    # Inventory Link
    linked_product = models.ForeignKey(
        'invoicing.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='linked_lab_tests',
        verbose_name=_("Produit lié"),
        help_text=_("Produit à déduire du stock automatiquement lors du prélèvement")
    )
    
    # Reference ranges (can vary by gender/age)
    normal_range_male = models.CharField(
        max_length=200,
        blank=True,
        verbose_name=_("Valeurs normales (Homme)"),
        help_text=_("Ex: 4.5-5.5 x10^6/µL")
    )
    normal_range_female = models.CharField(
        max_length=200,
        blank=True,
        verbose_name=_("Valeurs normales (Femme)"),
        help_text=_("Ex: 4.0-5.0 x10^6/µL")
    )
    normal_range_child = models.CharField(
        max_length=200,
        blank=True,
        verbose_name=_("Valeurs normales (Enfant)")
    )
    normal_range_general = models.CharField(
        max_length=200,
        blank=True,
        verbose_name=_("Valeurs normales (Général)"),
        help_text=_("Si pas de distinction par genre/âge")
    )
    unit_of_measurement = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_("Unité de mesure"),
        help_text=_("Ex: g/dL, cells/mcL, mg/dL")
    )
    
    # Sample requirements
    sample_type = models.CharField(
        max_length=20,
        choices=SAMPLE_TYPES,
        default='blood',
        verbose_name=_("Type d'échantillon")
    )
    sample_volume = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_("Volume requis"),
        help_text=_("Ex: 5ml, 10ml")
    )
    container_type = models.CharField(
        max_length=20,
        choices=CONTAINER_TYPES,
        blank=True,
        verbose_name=_("Type de tube/conteneur")
    )
    
    # Patient preparation
    fasting_required = models.BooleanField(
        default=False,
        verbose_name=_("À jeun requis")
    )
    fasting_hours = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Heures de jeûne"),
        help_text=_("Nombre d'heures de jeûne recommandé")
    )
    preparation_instructions = models.TextField(
        blank=True,
        verbose_name=_("Instructions de préparation"),
        help_text=_("Instructions spéciales pour le patient")
    )
    
    # Processing
    estimated_turnaround_hours = models.IntegerField(
        default=24,
        verbose_name=_("Délai estimé (heures)"),
        help_text=_("Temps estimé pour les résultats")
    )
    methodology = models.CharField(
        max_length=200,
        blank=True,
        verbose_name=_("Méthodologie"),
        help_text=_("Ex: Spectrophotométrie, ELISA, PCR")
    )
    
    # Status and permissions
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    requires_approval = models.BooleanField(
        default=False,
        verbose_name=_("Nécessite approbation"),
        help_text=_("Les résultats doivent être validés par un superviseur")
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Test de laboratoire")
        verbose_name_plural = _("Tests de laboratoire")
        ordering = ['category', 'name']
        unique_together = [['organization', 'test_code']]
        indexes = [
            models.Index(fields=['organization', 'is_active']),
            models.Index(fields=['test_code']),
        ]
    
    def __str__(self):
        return f"{self.test_code} - {self.name}"
    
    def get_reference_range(self, gender=None, is_child=False):
        """Get appropriate reference range based on patient demographics"""
        if is_child and self.normal_range_child:
            return self.normal_range_child
        if gender == 'M' and self.normal_range_male:
            return self.normal_range_male
        if gender == 'F' and self.normal_range_female:
            return self.normal_range_female
        return self.normal_range_general or self.normal_range_male or self.normal_range_female
        
    def save(self, *args, **kwargs):
        # Auto-create linked product if missing (Consumable tracking)
        if not self.linked_product:
            from apps.invoicing.models import Product, ProductCategory
            from apps.core.models import OrganizationSettings
            
            # Check if auto-generation is enabled for this organization
            settings = OrganizationSettings.objects.filter(organization=self.organization).first()
            if settings and settings.auto_generate_lab_kits:
                # Try to find or create a default category for Lab Consumables
                category, _ = ProductCategory.objects.get_or_create(
                    organization=self.organization,
                    slug='lab-consumables',
                    defaults={'name': "Consommables Laboratoire"}
                )
                
                # Create the product
                product_name = f"Kit {self.test_code} - {self.name}"[:200]
                new_product = Product.objects.create(
                    organization=self.organization,
                    name=product_name,
                    description=f"Consommable généré automatiquement pour le test {self.test_code}",
                    product_type='physical',
                    category=category,
                    price=0, # Cost/Price to be adjusted by admin
                    cost_price=0,
                    stock_quantity=0, # Start with 0 stock
                    low_stock_threshold=10, 
                    is_active=True
                )
                self.linked_product = new_product
            
        super().save(*args, **kwargs)


class LabOrder(models.Model):
    """
    Lab test order - a request for one or more lab tests
    """
    STATUS_CHOICES = [
        ('pending', _('En attente')),
        ('sample_collected', _('Échantillon prélevé')),
        ('in_progress', _('En cours')),
        ('completed', _('Terminé')),
        ('results_ready', _('Résultats prêts')),
        ('results_delivered', _('Résultats remis')),
        ('cancelled', _('Annulé')),
    ]
    
    PRIORITY_CHOICES = [
        ('routine', _('Routine')),
        ('urgent', _('Urgent')),
        ('stat', _('STAT (Immédiat)')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='lab_orders',
        verbose_name=_("Organisation")
    )
    
    # Order identification
    order_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name=_("Numéro de commande")
    )
    
    # Patient reference
    patient = models.ForeignKey(
        'accounts.Client',
        on_delete=models.CASCADE,
        related_name='lab_orders',
        verbose_name=_("Patient"),
        limit_choices_to={'client_type__in': ['patient', 'both']}
    )
    
    # Visit reference (optional)
    visit = models.ForeignKey(
        'patients.PatientVisit',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lab_orders',
        verbose_name=_("Visite associée")
    )
    
    # Order details
    order_date = models.DateTimeField(
        default=timezone.now,
        verbose_name=_("Date de commande")
    )
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name=_("Statut")
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='routine',
        verbose_name=_("Priorité")
    )
    clinical_notes = models.TextField(
        blank=True,
        verbose_name=_("Notes cliniques"),
        help_text=_("Informations cliniques pertinentes pour le laborantin")
    )
    
    # Financials (New fields to support analytics)
    total_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name=_("Prix total")
    )
    
    # Staff tracking
    ordered_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ordered_lab_tests',
        verbose_name=_("Prescrit par")
    )
    
    # Sample collection tracking
    sample_collected_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Prélèvement effectué à")
    )
    sample_collected_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='collected_samples',
        verbose_name=_("Prélevé par")
    )
    
    # Results tracking
    results_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Résultats terminés à")
    )
    results_entered_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='entered_lab_results',
        verbose_name=_("Résultats saisis par")
    )
    results_verified_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_lab_results',
        verbose_name=_("Résultats validés par")
    )
    
    # Notification tracking (for future SMS integration)
    notification_sent = models.BooleanField(
        default=False,
        verbose_name=_("Notification envoyée")
    )
    notification_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Notification envoyée à")
    )
    
    # Billing
    lab_invoice = models.ForeignKey(
        'invoicing.Invoice',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lab_orders',
        verbose_name=_("Facture labo")
    )

    # Biologist diagnosis (NOUVEAU - Phase 3)
    biologist_diagnosis = models.TextField(
        blank=True,
        verbose_name=_("Diagnostic du biologiste"),
        help_text=_("Interprétation globale des résultats par le biologiste superviseur")
    )
    diagnosed_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lab_diagnoses',
        verbose_name=_("Diagnostiqué par"),
        limit_choices_to={'role': 'lab_tech'}
    )
    diagnosed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Date du diagnostic")
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Commande de labo")
        verbose_name_plural = _("Commandes de labo")
        ordering = ['-order_date']
        indexes = [
            models.Index(fields=['organization', '-order_date']),
            models.Index(fields=['patient']),
            models.Index(fields=['status']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = self._generate_order_number()
        super().save(*args, **kwargs)
    
    def _generate_order_number(self):
        """Generate unique order number: LAB-YYYYMMDD-0001"""
        return NumberGeneratorService.generate_number(
            prefix='LAB',
            organization=self.organization,
            model_class=LabOrder,
            field_name='order_number'
        )
    
    def __str__(self):
        return f"{self.order_number} - {self.patient.name}"
    
    # total_price is now a field, property removed
    
    @property
    def tests_count(self):
        """Number of tests in this order"""
        return self.items.count()
    
    @property
    def all_results_entered(self):
        """Check if all test results have been entered"""
        return not self.items.filter(result_value='').exists()
    
    # Status transition methods
    def collect_sample(self, collected_by=None):
        """Mark sample as collected and deduct inventory"""
        self.status = 'sample_collected'
        self.sample_collected_at = timezone.now()
        if collected_by:
            self.sample_collected_by = collected_by
        self.save()

        # Deduct inventory for linked products
        try:
            for item in self.items.all():
                if item.lab_test.linked_product:
                    product = item.lab_test.linked_product
                    # Deduct 1 unit per test (modify logic if multiple reagents needed per test)
                    # Using 'sale' type as it is a consumption for revenue generation
                    product.adjust_stock(
                        quantity=-1,
                        movement_type='sale', 
                        reference_type='manual', # Using manual since lab_order is not an enum choice yet
                        reference_id=self.id,
                        notes=f"Consommation Labo - Commande {self.order_number} - Test {item.lab_test.test_code}",
                        user=collected_by
                    )
        except Exception as e:
            # Log error but don't block flow
            print(f"Error deducting stock for LabOrder {self.order_number}: {e}")
    
    def start_processing(self):
        """Mark order as in progress"""
        self.status = 'in_progress'
        self.save()
    
    def complete_results(self, entered_by=None):
        """Mark results as completed"""
        self.status = 'completed'
        self.results_completed_at = timezone.now()
        if entered_by:
            self.results_entered_by = entered_by
        self.save()
    
    def verify_results(self, verified_by=None):
        """Verify/validate results and mark as ready"""
        self.status = 'results_ready'
        if verified_by:
            self.results_verified_by = verified_by
        self.save()
    
    def mark_delivered(self):
        """Mark results as delivered to patient"""
        self.status = 'results_delivered'
        self.save()
    
    def cancel_order(self):
        """Cancel the order"""
        self.status = 'cancelled'
        self.save()


class LabOrderItem(models.Model):
    """
    Individual test in a lab order with result fields
    """
    ABNORMALITY_TYPES = [
        ('normal', _('Normal')),
        ('low', _('Bas')),
        ('high', _('Élevé')),
        ('critical_low', _('Critique bas')),
        ('critical_high', _('Critique élevé')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lab_order = models.ForeignKey(
        LabOrder,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name=_("Commande")
    )
    lab_test = models.ForeignKey(
        LabTest,
        on_delete=models.PROTECT,
        related_name='order_items',
        verbose_name=_("Test")
    )
    
    # Result fields
    result_value = models.TextField(
        blank=True,
        verbose_name=_("Valeur du résultat"),
        help_text=_("Résultat du test (texte libre ou numérique)")
    )
    result_numeric = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name=_("Valeur numérique"),
        help_text=_("Valeur numérique si applicable")
    )
    result_unit = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_("Unité"),
        help_text=_("Unité du résultat (copié du test ou personnalisé)")
    )
    reference_range = models.CharField(
        max_length=200,
        blank=True,
        verbose_name=_("Valeurs de référence"),
        help_text=_("Plage normale pour ce patient")
    )
    
    # Financials (New field to support analytics)
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name=_("Prix")
    )
    
    # Abnormality flagging
    abnormality_type = models.CharField(
        max_length=20,
        choices=ABNORMALITY_TYPES,
        default='normal',
        verbose_name=_("Type d'anomalie")
    )
    is_abnormal = models.BooleanField(
        default=False,
        verbose_name=_("Anormal"),
        help_text=_("Résultat hors des valeurs normales")
    )
    is_critical = models.BooleanField(
        default=False,
        verbose_name=_("Critique"),
        help_text=_("Résultat nécessitant une attention immédiate")
    )
    
    # Interpretation
    interpretation = models.TextField(
        blank=True,
        verbose_name=_("Interprétation"),
        help_text=_("Interprétation du résultat par le technicien")
    )
    technician_notes = models.TextField(
        blank=True,
        verbose_name=_("Notes du technicien"),
        help_text=_("Notes internes")
    )
    
    # Result tracking
    result_entered_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Résultat saisi à")
    )
    result_verified_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Résultat validé à")
    )
    verified_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_lab_items',
        verbose_name=_("Validé par")
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Item de commande labo")
        verbose_name_plural = _("Items de commande labo")
        ordering = ['lab_test__name']
    
    def save(self, *args, **kwargs):
        # Auto-populate unit and reference range from test if not set
        if not self.result_unit and self.lab_test:
            self.result_unit = self.lab_test.unit_of_measurement
        
        if not self.reference_range and self.lab_test:
            # Try to get appropriate reference range based on patient
            patient = self.lab_order.patient
            if patient:
                is_child = patient.get_age() and patient.get_age() < 18
                self.reference_range = self.lab_test.get_reference_range(
                    gender=patient.gender,
                    is_child=is_child
                )
        
        # Set result_entered_at when result is first entered
        if self.result_value and not self.result_entered_at:
            self.result_entered_at = timezone.now()
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.lab_order.order_number} - {self.lab_test.name}"
    
    # price is now a field, property removed
    
    def check_abnormal(self):
        """
        Auto-detect if result is outside reference range
        This is a simple implementation - can be enhanced for specific tests
        """
        if not self.result_numeric or not self.reference_range:
            return
        
        try:
            # Try to parse reference range like "70-110" or "< 200"
            ref = self.reference_range.strip()
            
            if '-' in ref:
                low, high = ref.split('-')
                low = Decimal(low.strip())
                high = Decimal(high.strip())
                
                if self.result_numeric < low:
                    self.is_abnormal = True
                    self.abnormality_type = 'low'
                elif self.result_numeric > high:
                    self.is_abnormal = True
                    self.abnormality_type = 'high'
                else:
                    self.is_abnormal = False
                    self.abnormality_type = 'normal'
                    
        except (ValueError, AttributeError):
            pass  # Cannot parse, leave as is

    def get_previous_results(self, limit=5):
        """
        Récupère les N derniers résultats du même test pour ce patient
        (NOUVEAU - Phase 3)
        """
        return LabOrderItem.objects.filter(
            lab_order__patient=self.lab_order.patient,
            lab_test=self.lab_test,
            result_entered_at__isnull=False
        ).exclude(
            id=self.id
        ).select_related('lab_order').order_by('-result_entered_at')[:limit]
