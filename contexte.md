# **📋 SPÉCIFICATIONS TECHNIQUES COMPLÈTES - SAAS FACTURATION & BONS DE COMMANDE**


## **🏗️ ARCHITECTURE GÉNÉRALE**

```
SAAS_PROCUREMENT/
├── apps/
│   ├── accounts/           # Gestion utilisateurs/tenants
│   ├── purchase_orders/    # Bons de commande
│   ├── invoicing/          # Facturation
│   ├── ai_assistant/       # IA Mistral intégrée
│   ├── suppliers/          # Fournisseurs/Catalogue
│   ├── analytics/          # Reporting/Analytics
│   ├── integrations/       # APIs externes
│   └── core/              # Utilitaires partagés
├── static/                 # Assets statiques
├── templates/              # Templates HTML
├── media/                  # Fichiers uploadés
├── locale/                 # Traductions FR/EN
├── requirements/           # Dépendances
├── deploy/                 # Docker/Kubernetes
└── tests/                  # Tests automatisés
```

---

## **⚙️ REQUIREMENTS.TXT**

```txt
# requirements/base.txt
Django==5.0.3
djangorestframework==3.14.0
django-tenant-schemas==1.11.0
django-allauth==0.57.0
django-money==3.4.1
django-import-export==3.3.5
django-channels==4.0.0
django-channels-redis==4.2.0
django-cors-headers==4.3.1
django-filter==23.5
django-crispy-forms==2.0
crispy-bootstrap5==0.7

# Base de données
psycopg2-binary==2.9.9
redis==5.0.1

# IA Mistral
mistralai==0.4.2
openai==1.12.0  # Backup option
python-dotenv==1.0.1

# Tâches asynchrones
celery==5.3.6
celery[redis]==5.3.6
django-celery-beat==2.5.0
django-celery-results==2.5.1

# Sécurité
cryptography==42.0.5
PyJWT==2.8.0

# Utilitaires
Pillow==10.2.0
reportlab==4.1.0
pandas==2.2.1
requests==2.31.0
python-dateutil==2.9.0
```

---

## **📊 MODÈLES DE DONNÉES (MODELS.PY)**

### **🏢 ACCOUNTS APP - GESTION MULTI-TENANT**

```python
# apps/accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from django_tenants.models import TenantMixin, DomainMixin
from djmoney import models as money_models
import uuid

class Tenant(TenantMixin):
    """Modèle tenant pour multi-tenancy"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    business_number = models.CharField(max_length=15, blank=True)  # Numéro d'entreprise canadien
    address = models.TextField()
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=2, choices=[
        ('AB', 'Alberta'), ('BC', 'British Columbia'), ('MB', 'Manitoba'),
        ('NB', 'New Brunswick'), ('NL', 'Newfoundland and Labrador'),
        ('NS', 'Nova Scotia'), ('ON', 'Ontario'), ('PE', 'Prince Edward Island'),
        ('QC', 'Quebec'), ('SK', 'Saskatchewan'), ('NT', 'Northwest Territories'),
        ('NU', 'Nunavut'), ('YT', 'Yukon')
    ])
    postal_code = models.CharField(max_length=7)
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    
    # Configuration IA
    ai_enabled = models.BooleanField(default=True)
    ai_automation_level = models.CharField(max_length=20, choices=[
        ('manual', 'Manuel uniquement'),
        ('assisted', 'Assisté par IA'),
        ('supervised', 'Automatisation supervisée'),
        ('full', 'Automatisation complète')
    ], default='assisted')
    
    # Dates
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    auto_create_schema = True

class Domain(DomainMixin):
    pass

class CustomUser(AbstractUser):
    """Utilisateur étendu"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(max_length=20, blank=True)
    language = models.CharField(max_length=2, choices=[('fr', 'Français'), ('en', 'English')], default='en')
    role = models.CharField(max_length=50, choices=[
        ('admin', 'Administrateur'),
        ('manager', 'Gestionnaire'),
        ('buyer', 'Acheteur'),
        ('accountant', 'Comptable'),
        ('viewer', 'Consultation')
    ], default='buyer')
    
    # Préférences IA
    ai_notifications = models.BooleanField(default=True)
    ai_auto_approve_limit = money_models.MoneyField(
        max_digits=14, decimal_places=2, default_currency='CAD', null=True, blank=True
    )
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.username})"

class UserPreferences(models.Model):
    """Préférences utilisateur"""
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='preferences')
    dashboard_layout = models.JSONField(default=dict)
    notification_settings = models.JSONField(default=dict)
    ai_learning_data = models.JSONField(default=dict)  # Données apprentissage IA
```

### **🛒 PURCHASE ORDERS APP**

```python
# apps/purchase_orders/models.py
from django.db import models
from djmoney import models as money_models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class PurchaseOrderStatus(models.TextChoices):
    DRAFT = 'draft', 'Brouillon'
    PENDING = 'pending', 'En attente d\'approbation'
    APPROVED = 'approved', 'Approuvé'
    SENT = 'sent', 'Envoyé au fournisseur'
    CONFIRMED = 'confirmed', 'Confirmé'
    PARTIALLY_RECEIVED = 'partial', 'Partiellement reçu'
    RECEIVED = 'received', 'Reçu'
    INVOICED = 'invoiced', 'Facturé'
    COMPLETED = 'completed', 'Terminé'
    CANCELLED = 'cancelled', 'Annulé'

class PurchaseOrder(models.Model):
    """Bon de commande principal"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.CharField(max_length=50, unique=True)
    
    # Relations
    supplier = models.ForeignKey('suppliers.Supplier', on_delete=models.CASCADE)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_pos')
    approved_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='approved_pos')
    
    # Statut et workflow
    status = models.CharField(max_length=20, choices=PurchaseOrderStatus.choices, default=PurchaseOrderStatus.DRAFT)
    priority = models.CharField(max_length=10, choices=[
        ('low', 'Faible'), ('medium', 'Moyenne'), ('high', 'Élevée'), ('urgent', 'Urgente')
    ], default='medium')
    
    # Montants
    subtotal = money_models.MoneyField(max_digits=14, decimal_places=2, default_currency='CAD')
    tax_gst_hst = money_models.MoneyField(max_digits=14, decimal_places=2, default_currency='CAD', default=0)
    tax_qst = money_models.MoneyField(max_digits=14, decimal_places=2, default_currency='CAD', default=0)
    total_amount = money_models.MoneyField(max_digits=14, decimal_places=2, default_currency='CAD')
    
    # Dates
    order_date = models.DateField()
    expected_delivery = models.DateField(null=True, blank=True)
    delivery_date = models.DateField(null=True, blank=True)
    
    # Adresses
    shipping_address = models.TextField()
    billing_address = models.TextField()
    
    # Termes et conditions
    payment_terms = models.CharField(max_length=50, default='NET 30')
    notes = models.TextField(blank=True)
    terms_conditions = models.TextField(blank=True)
    
    # IA et automatisation
    created_by_ai = models.BooleanField(default=False)
    ai_confidence_score = models.FloatField(null=True, blank=True)
    ai_analysis = models.JSONField(default=dict)  # Données analyse IA
    
    # Audit trail
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['supplier', 'status']),
        ]

class PurchaseOrderItem(models.Model):
    """Ligne de bon de commande"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    
    # Produit/Service
    sku = models.CharField(max_length=100, blank=True)
    description = models.CharField(max_length=255)
    category = models.ForeignKey('suppliers.ProductCategory', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Quantités et prix
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, default='unité')
    unit_price = money_models.MoneyField(max_digits=12, decimal_places=2, default_currency='CAD')
    total_price = money_models.MoneyField(max_digits=14, decimal_places=2, default_currency='CAD')
    
    # Livraison
    quantity_received = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    expected_date = models.DateField(null=True, blank=True)
    
    # IA
    suggested_by_ai = models.BooleanField(default=False)
    ai_match_score = models.FloatField(null=True, blank=True)

class PurchaseOrderApproval(models.Model):
    """Workflow d'approbation"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='approvals')
    approver = models.ForeignKey(User, on_delete=models.CASCADE)
    
    status = models.CharField(max_length=20, choices=[
        ('pending', 'En attente'),
        ('approved', 'Approuvé'),
        ('rejected', 'Rejeté'),
        ('delegated', 'Délégué')
    ])
    
    approval_level = models.IntegerField()  # Niveau dans le workflow
    comments = models.TextField(blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # IA
    ai_recommended = models.BooleanField(default=False)
    ai_risk_score = models.FloatField(null=True, blank=True)

class PurchaseOrderHistory(models.Model):
    """Historique des modifications"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='history')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    
    action = models.CharField(max_length=50)  # 'created', 'approved', 'modified', etc.
    old_values = models.JSONField(default=dict)
    new_values = models.JSONField(default=dict)
    notes = models.TextField(blank=True)
    
    performed_by_ai = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
```

### **💰 INVOICING APP**

```python
# apps/invoicing/models.py
from django.db import models
from djmoney import models as money_models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class InvoiceStatus(models.TextChoices):
    DRAFT = 'draft', 'Brouillon'
    SENT = 'sent', 'Envoyée'
    VIEWED = 'viewed', 'Consultée'
    PARTIAL = 'partial', 'Partiellement payée'
    PAID = 'paid', 'Payée'
    OVERDUE = 'overdue', 'En retard'
    CANCELLED = 'cancelled', 'Annulée'

class Invoice(models.Model):
    """Facture principale"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.CharField(max_length=50, unique=True)
    
    # Relations
    purchase_order = models.ForeignKey('purchase_orders.PurchaseOrder', on_delete=models.CASCADE, null=True, blank=True)
    client = models.ForeignKey('suppliers.Client', on_delete=models.CASCADE)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # Statut
    status = models.CharField(max_length=20, choices=InvoiceStatus.choices, default=InvoiceStatus.DRAFT)
    
    # Montants
    subtotal = money_models.MoneyField(max_digits=14, decimal_places=2, default_currency='CAD')
    tax_gst_hst_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.05)  # 5% ou 13-15%
    tax_gst_hst = money_models.MoneyField(max_digits=14, decimal_places=2, default_currency='CAD')
    tax_qst_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.09975)  # 9.975% Québec
    tax_qst = money_models.MoneyField(max_digits=14, decimal_places=2, default_currency='CAD', default=0)
    total_amount = money_models.MoneyField(max_digits=14, decimal_places=2, default_currency='CAD')
    
    # Dates
    invoice_date = models.DateField()
    due_date = models.DateField()
    
    # Paiement
    payment_terms = models.CharField(max_length=50, default='NET 30')
    payment_method = models.CharField(max_length=50, blank=True)
    
    # Adresses
    billing_address = models.TextField()
    
    # Notes
    notes = models.TextField(blank=True)
    terms_conditions = models.TextField(blank=True)
    
    # IA
    generated_by_ai = models.BooleanField(default=False)
    ai_analysis = models.JSONField(default=dict)
    
    # Facturation récurrente
    is_recurring = models.BooleanField(default=False)
    recurring_pattern = models.CharField(max_length=20, choices=[
        ('monthly', 'Mensuel'),
        ('quarterly', 'Trimestriel'),
        ('annually', 'Annuel')
    ], blank=True)
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    sent_at = models.DateTimeField(null=True, blank=True)

class InvoiceItem(models.Model):
    """Ligne de facture"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = money_models.MoneyField(max_digits=12, decimal_places=2, default_currency='CAD')
    total_price = money_models.MoneyField(max_digits=14, decimal_places=2, default_currency='CAD')
    
    # Catégorie comptable
    account_code = models.CharField(max_length=20, blank=True)

class Payment(models.Model):
    """Paiement reçu"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    
    amount = money_models.MoneyField(max_digits=14, decimal_places=2, default_currency='CAD')
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=50, choices=[
        ('interac', 'Virement Interac'),
        ('wire', 'Virement bancaire'),
        ('check', 'Chèque'),
        ('cash', 'Comptant'),
        ('card', 'Carte de crédit')
    ])
    
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

class InvoiceReminder(models.Model):
    """Relances automatiques"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='reminders')
    
    reminder_type = models.CharField(max_length=20, choices=[
        ('first', 'Premier rappel'),
        ('second', 'Deuxième rappel'),
        ('final', 'Mise en demeure'),
        ('collection', 'Recouvrement')
    ])
    
    sent_at = models.DateTimeField()
    sent_by_ai = models.BooleanField(default=False)
    email_subject = models.CharField(max_length=200)
    email_body = models.TextField()
    
    opened = models.BooleanField(default=False)
    opened_at = models.DateTimeField(null=True, blank=True)
```

### **🏪 SUPPLIERS APP**

```python
# apps/suppliers/models.py
from django.db import models
from djmoney import models as money_models
import uuid

class SupplierStatus(models.TextChoices):
    ACTIVE = 'active', 'Actif'
    INACTIVE = 'inactive', 'Inactif'
    PENDING = 'pending', 'En attente de validation'
    BLOCKED = 'blocked', 'Bloqué'

class Supplier(models.Model):
    """Fournisseur"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Informations de base
    name = models.CharField(max_length=200)
    legal_name = models.CharField(max_length=200, blank=True)
    business_number = models.CharField(max_length=15, blank=True)  # Numéro d'entreprise
    
    # Contact
    contact_person = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    website = models.URLField(blank=True)
    
    # Adresse
    address = models.TextField()
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=2)
    postal_code = models.CharField(max_length=7)
    country = models.CharField(max_length=2, default='CA')
    
    # Statut et évaluation
    status = models.CharField(max_length=20, choices=SupplierStatus.choices, default=SupplierStatus.PENDING)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)  # 0.00 à 5.00
    
    # Termes commerciaux
    payment_terms = models.CharField(max_length=50, default='NET 30')
    currency = models.CharField(max_length=3, default='CAD')
    
    # Catégories
    categories = models.ManyToManyField('ProductCategory', blank=True)
    
    # IA et scoring
    ai_risk_score = models.FloatField(default=0.0)  # 0-100
    ai_performance_score = models.FloatField(default=0.0)  # 0-100
    ai_analysis = models.JSONField(default=dict)
    
    # Certification et diversité
    is_local = models.BooleanField(default=False)
    is_minority_owned = models.BooleanField(default=False)
    is_indigenous = models.BooleanField(default=False)
    is_woman_owned = models.BooleanField(default=False)
    certifications = models.JSONField(default=list)  # ISO, CSA, etc.
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_order_date = models.DateField(null=True, blank=True)
    
    class Meta:
        ordering = ['name']

class ProductCategory(models.Model):
    """Catégories de produits/services"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    
    def __str__(self):
        return self.name

class Product(models.Model):
    """Produit dans catalogue fournisseur"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(ProductCategory, on_delete=models.SET_NULL, null=True)
    
    # Informations produit
    sku = models.CharField(max_length=100)
    name = models.CharField(max_length=200)
    description = models.TextField()
    
    # Prix
    unit_price = money_models.MoneyField(max_digits=12, decimal_places=2, default_currency='CAD')
    bulk_price = money_models.MoneyField(max_digits=12, decimal_places=2, default_currency='CAD', null=True, blank=True)
    bulk_quantity = models.IntegerField(null=True, blank=True)
    
    # Disponibilité
    is_available = models.BooleanField(default=True)
    stock_quantity = models.IntegerField(null=True, blank=True)
    lead_time_days = models.IntegerField(default=7)
    
    # IA
    ai_demand_forecast = models.JSONField(default=dict)
    ai_price_trend = models.JSONField(default=dict)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['supplier', 'sku']

class Client(models.Model):
    """Client (pour facturation sortante)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Informations de base
    name = models.CharField(max_length=200)
    legal_name = models.CharField(max_length=200, blank=True)
    business_number = models.CharField(max_length=15, blank=True)
    
    # Contact
    contact_person = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    
    # Adresse
    billing_address = models.TextField()
    
    # Termes commerciaux
    payment_terms = models.CharField(max_length=50, default='NET 30')
    credit_limit = money_models.MoneyField(max_digits=14, decimal_places=2, default_currency='CAD', null=True, blank=True)
    
    # IA
    ai_payment_risk_score = models.FloatField(default=0.0)
    ai_payment_pattern = models.JSONField(default=dict)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

class SupplierPerformance(models.Model):
    """Évaluation performance fournisseur"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='performance_records')
    
    # Métriques
    period_start = models.DateField()
    period_end = models.DateField()
    
    delivery_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)  # % livraisons à temps
    quality_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)   # % sans défaut
    price_competitiveness = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    responsiveness_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Données brutes
    total_orders = models.IntegerField(default=0)
    on_time_deliveries = models.IntegerField(default=0)
    quality_issues = models.IntegerField(default=0)
    
    # IA calculated
    overall_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    calculated_by_ai = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
```

### **🤖 AI_ASSISTANT APP**

```python
# apps/ai_assistant/models.py
from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class AIConversation(models.Model):
    """Conversation avec l'IA"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    
    title = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class AIMessage(models.Model):
    """Message dans conversation IA"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(AIConversation, on_delete=models.CASCADE, related_name='messages')
    
    role = models.CharField(max_length=10, choices=[
        ('user', 'Utilisateur'),
        ('assistant', 'IA'),
        ('system', 'Système')
    ])
    content = models.TextField()
    
    # Métadonnées IA
    model_used = models.CharField(max_length=50, default='mistral-medium')
    tokens_used = models.IntegerField(default=0)
    response_time_ms = models.IntegerField(default=0)
    
    # Action exécutée
    action_triggered = models.CharField(max_length=100, blank=True)
    action_result = models.JSONField(null=True, blank=True)
    
    timestamp = models.DateTimeField(auto_now_add=True)

class AIAction(models.Model):
    """Actions IA exécutées"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    
    action_type = models.CharField(max_length=50, choices=[
        ('create_po', 'Création bon de commande'),
        ('create_invoice', 'Création facture'),
        ('send_reminder', 'Envoi relance'),
        ('update_status', 'Mise à jour statut'),
        ('analyze_spend', 'Analyse dépenses'),
        ('suggest_supplier', 'Suggestion fournisseur'),
        ('extract_data', 'Extraction données'),
        ('generate_report', 'Génération rapport')
    ])
    
    # Paramètres et résultat
    parameters = models.JSONField(default=dict)
    result = models.JSONField(default=dict)
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    
    # Approbation
    requires_approval = models.BooleanField(default=False)
    approved = models.BooleanField(null=True, blank=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_ai_actions')
    approved_at = models.DateTimeField(null=True, blank=True)
    
    executed_at = models.DateTimeField(auto_now_add=True)

class AILearningData(models.Model):
    """Données d'apprentissage IA spécifiques au tenant"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    data_type = models.CharField(max_length=50, choices=[
        ('user_preferences', 'Préférences utilisateur'),
        ('approval_patterns', 'Patterns d\'approbation'),
        ('supplier_preferences', 'Préférences fournisseurs'),
        ('pricing_history', 'Historique prix'),
        ('seasonal_patterns', 'Patterns saisonniers')
    ])
    
    data = models.JSONField()
    confidence_level = models.FloatField(default=0.0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class AINotification(models.Model):
    """Notifications IA pour utilisateurs"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    
    notification_type = models.CharField(max_length=50, choices=[
        ('suggestion', 'Suggestion'),
        ('alert', 'Alerte'),
        ('action_completed', 'Action terminée'),
        ('approval_needed', 'Approbation requise'),
        ('anomaly_detected', 'Anomalie détectée')
    ])
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    priority = models.CharField(max_length=10, choices=[
        ('low', 'Faible'),
        ('medium', 'Moyenne'),
        ('high', 'Élevée'),
        ('critical', 'Critique')
    ], default='medium')
    
    # Action associée
    related_object_type = models.CharField(max_length=50, blank=True)  # 'purchase_order', 'invoice', etc.
    related_object_id = models.UUIDField(null=True, blank=True)
    
    # Statut
    is_read = models.BooleanField(default=False)
    is_dismissed = models.BooleanField(default=False)
    action_taken = models.CharField(max_length=50, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
```

---

## **🎮 VUES (VIEWS.PY)**

### **🛒 PURCHASE ORDERS VIEWS**

```python
# apps/purchase_orders/views.py
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.views.generic import ListView, CreateView, UpdateView, DeleteView
from django.contrib.auth.mixins import LoginRequiredMixin
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Sum, Count
from django.utils import timezone
from datetime import datetime, timedelta
import json

from .models import PurchaseOrder, PurchaseOrderItem, PurchaseOrderApproval
from .serializers import PurchaseOrderSerializer, PurchaseOrderItemSerializer
from .forms import PurchaseOrderForm, PurchaseOrderItemFormSet
from apps.ai_assistant.services import MistralAIService
from apps.suppliers.models import Supplier

# ===== VUES TRADITIONNELLES (Interface manuelle) =====

@login_required
def purchase_order_list(request):
    """Liste des bons de commande - Vue manuelle"""
    
    # Filtres
    status_filter = request.GET.get('status', '')
    supplier_filter = request.GET.get('supplier', '')
    date_from = request.GET.get('date_from', '')
    date_to = request.GET.get('date_to', '')
    
    queryset = PurchaseOrder.objects.select_related('supplier', 'created_by')
    
    if status_filter:
        queryset = queryset.filter(status=status_filter)
    if supplier_filter:
        queryset = queryset.filter(supplier_id=supplier_filter)
    if date_from:
        queryset = queryset.filter(order_date__gte=date_from)
    if date_to:
        queryset = queryset.filter(order_date__lte=date_to)
    
    # Statistiques pour dashboard
    stats = {
        'total_pos': queryset.count(),
        'pending_approval': queryset.filter(status='pending').count(),
        'total_amount': queryset.aggregate(total=Sum('total_amount'))['total'] or 0,
        'urgent_pos': queryset.filter(priority='urgent', status__in=['draft', 'pending']).count()
    }
    
    # Pagination
    from django.core.paginator import Paginator
    paginator = Paginator(queryset, 25)
    page_number = request.GET.get('page')
    purchase_orders = paginator.get_page(page_number)
    
    # Données pour filtres
    suppliers = Supplier.objects.filter(status='active').order_by('name')
    
    context = {
        'purchase_orders': purchase_orders,
        'suppliers': suppliers,
        'stats': stats,
        'current_filters': {
            'status': status_filter,
            'supplier': supplier_filter,
            'date_from': date_from,
            'date_to': date_to,
        },
        'status_choices': PurchaseOrder.status.field.choices,
    }
    
    return render(request, 'purchase_orders/list.html', context)

@login_required
def purchase_order_create(request):
    """Création manuelle d'un bon de commande"""
    
    if request.method == 'POST':
        form = PurchaseOrderForm(request.POST)
        formset = PurchaseOrderItemFormSet(request.POST)
        
        if form.is_valid() and formset.is_valid():
            # Création du BC
            purchase_order = form.save(commit=False)
            purchase_order.created_by = request.user
            purchase_order.number = _generate_po_number()  # Fonction utilitaire
            purchase_order.save()
            
            # Création des lignes
            items = formset.save(commit=False)
            total = 0
            for item in items:
                item.purchase_order = purchase_order
                item.total_price = item.quantity * item.unit_price
                item.save()
                total += item.total_price
            
            # Calcul des taxes
            purchase_order.subtotal = total
            purchase_order.tax_gst_hst = _calculate_gst_hst(total, purchase_order.supplier.province)
            purchase_order.tax_qst = _calculate_qst(total, purchase_order.supplier.province)
            purchase_order.total_amount = purchase_order.subtotal + purchase_order.tax_gst_hst + purchase_order.tax_qst
            purchase_order.save()
            
            messages.success(request, f'Bon de commande {purchase_order.number} créé avec succès.')
            return redirect('purchase_orders:detail', pk=purchase_order.pk)
    else:
        form = PurchaseOrderForm()
        formset = PurchaseOrderItemFormSet()
    
    context = {
        'form': form,
        'formset': formset,
        'suppliers': Supplier.objects.filter(status='active').order_by('name'),
    }
    
    return render(request, 'purchase_orders/create.html', context)

@login_required
def purchase_order_detail(request, pk):
    """Détail d'un bon de commande"""
    
    purchase_order = get_object_or_404(PurchaseOrder, pk=pk)
    
    # Vérifier les permissions (exemple simple)
    # TODO: Implémenter système de permissions plus robuste
    
    context = {
        'purchase_order': purchase_order,
        'items': purchase_order.items.all(),
        'approvals': purchase_order.approvals.order_by('approval_level'),
        'history': purchase_order.history.order_by('-timestamp')[:10],
        'can_edit': purchase_order.status in ['draft', 'pending'],
        'can_approve': _can_user_approve(request.user, purchase_order),
    }
    
    return render(request, 'purchase_orders/detail.html', context)

@login_required 
@require_http_methods(["POST"])
def purchase_order_approve(request, pk):
    """Approbation d'un bon de commande"""
    
    purchase_order = get_object_or_404(PurchaseOrder, pk=pk)
    
    if not _can_user_approve(request.user, purchase_order):
        messages.error(request, "Vous n'avez pas les permissions pour approuver ce bon de commande.")
        return redirect('purchase_orders:detail', pk=pk)
    
    # Logique d'approbation
    approval_level = _get_user_approval_level(request.user)
    required_level = _get_required_approval_level(purchase_order.total_amount)
    
    # Créer l'enregistrement d'approbation
    approval = PurchaseOrderApproval.objects.create(
        purchase_order=purchase_order,
        approver=request.user,
        status='approved',
        approval_level=approval_level,
        comments=request.POST.get('comments', ''),
        approved_at=timezone.now()
    )
    
    # Mettre à jour le statut si toutes approbations obtenues
    if approval_level >= required_level:
        purchase_order.status = 'approved'
        purchase_order.approved_by = request.user
        purchase_order.save()
        
        messages.success(request, f'Bon de commande {purchase_order.number} approuvé.')
        
        # Notification IA optionnelle
        if purchase_order.created_by != request.user:
            from apps.ai_assistant.tasks import send_ai_notification
            send_ai_notification.delay(
                user_id=purchase_order.created_by.id,
                message=f"Votre bon de commande {purchase_order.number} a été approuvé."
            )
    else:
        messages.info(request, "Approbation enregistrée. Approbations supplémentaires requises.")
    
    return redirect('purchase_orders:detail', pk=pk)

# ===== API REST (pour IA et intégrations) =====

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    """API REST pour les bons de commande"""
    
    serializer_class = PurchaseOrderSerializer
    
    def get_queryset(self):
        return PurchaseOrder.objects.select_related('supplier', 'created_by')
    
    def perform_create(self, serializer):
        """Création via API (souvent utilisée par l'IA)"""
        
        # Marquer comme créé par IA si c'est le cas
        created_by_ai = self.request.data.get('created_by_ai', False)
        ai_confidence = self.request.data.get('ai_confidence_score')
        
        instance = serializer.save(
            created_by=self.request.user,
            number=_generate_po_number(),
            created_by_ai=created_by_ai,
            ai_confidence_score=ai_confidence
        )
        
        # Calcul automatique des totaux
        _calculate_po_totals(instance)
        
        return instance
    
    @action(detail=True, methods=['post'])
    def ai_analyze(self, request, pk=None):
        """Analyse IA d'un bon de commande"""
        
        purchase_order = self.get_object()
        ai_service = MistralAIService()
        
        # Analyse par Mistral AI
        analysis = ai_service.analyze_purchase_order(purchase_order)
        
        # Sauvegarder l'analyse
        purchase_order.ai_analysis = analysis
        purchase_order.save()
        
        return Response({
            'status': 'success',
            'analysis': analysis
        })
    
    @action(detail=False, methods=['post'])
    def ai_create_from_request(self, request):
        """Création d'un BC via requête naturelle IA"""
        
        user_request = request.data.get('request')
        if not user_request:
            return Response(
                {'error': 'Paramètre "request" requis'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        ai_service = MistralAIService()
        
        try:
            # IA traite la demande
            po_data = ai_service.create_po_from_natural_request(
                user_request, 
                request.user
            )
            
            # Créer le BC
            serializer = self.get_serializer(data=po_data)
            if serializer.is_valid():
                po = self.perform_create(serializer)
                return Response({
                    'status': 'success',
                    'purchase_order_id': po.id,
                    'message': f'Bon de commande {po.number} créé avec succès par IA.'
                })
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la création: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# ===== VUES AJAX POUR INTERFACE HYBRIDE =====

@login_required
def ajax_po_quick_actions(request):
    """Actions rapides AJAX (utilisées par interface IA)"""
    
    if request.method != 'POST':
        return JsonResponse({'error': 'Méthode non autorisée'}, status=405)
    
    action = request.POST.get('action')
    po_id = request.POST.get('po_id')
    
    if not action or not po_id:
        return JsonResponse({'error': 'Paramètres manquants'}, status=400)
    
    try:
        purchase_order = PurchaseOrder.objects.get(pk=po_id)
    except PurchaseOrder.DoesNotExist:
        return JsonResponse({'error': 'Bon de commande introuvable'}, status=404)
    
    if action == 'change_status':
        new_status = request.POST.get('new_status')
        if new_status in dict(PurchaseOrder.status.field.choices):
            purchase_order.status = new_status
            purchase_order.save()
            
            # Log de l'action
            from apps.purchase_orders.models import PurchaseOrderHistory
            PurchaseOrderHistory.objects.create(
                purchase_order=purchase_order,
                user=request.user,
                action=f'status_changed_to_{new_status}',
                new_values={'status': new_status},
                performed_by_ai=request.POST.get('by_ai', False) == 'true'
            )
            
            return JsonResponse({
                'status': 'success',
                'message': f'Statut changé vers {purchase_order.get_status_display()}'
            })
    
    elif action == 'send_to_supplier':
        # Logique d'envoi au fournisseur
        # TODO: Implémenter envoi email/EDI
        
        purchase_order.status = 'sent'
        purchase_order.save()
        
        return JsonResponse({
            'status': 'success',
            'message': f'BC {purchase_order.number} envoyé au fournisseur'
        })
    
    return JsonResponse({'error': 'Action inconnue'}, status=400)

# ===== FONCTIONS UTILITAIRES =====

def _generate_po_number():
    """Génère un numéro de BC unique"""
    from datetime import datetime
    year = datetime.now().year
    last_po = PurchaseOrder.objects.filter(
        number__startswith=f'PO{year}'
    ).order_by('-number').first()
    
    if last_po:
        last_num = int(last_po.number.split('-')[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f'PO{year}-{new_num:05d}'

def _calculate_gst_hst(amount, province):
    """Calcule TPS/TVH selon province canadienne"""
    rates = {
        'AB': 0.05, 'BC': 0.05, 'MB': 0.05, 'NB': 0.15, 'NL': 0.15,
        'NS': 0.15, 'ON': 0.13, 'PE': 0.15, 'QC': 0.05, 'SK': 0.05,
        'NT': 0.05, 'NU': 0.05, 'YT': 0.05
    }
    return amount * rates.get(province, 0.05)

def _calculate_qst(amount, province):
    """Calcule TVQ (Québec seulement)"""
    return amount * 0.09975 if province == 'QC' else 0

def _can_user_approve(user, purchase_order):
    """Vérifie si utilisateur peut approuver ce BC"""
    user_level = _get_user_approval_level(user)
    required_level = _get_required_approval_level(purchase_order.total_amount)
    return user_level >= required_level

def _get_user_approval_level(user):
    """Obtient le niveau d'approbation de l'utilisateur"""
    if user.role == 'admin':
        return 3
    elif user.role == 'manager':
        return 2
    elif user.role == 'buyer':
        return 1
    return 0

def _get_required_approval_level(amount):
    """Obtient le niveau d'approbation requis selon montant"""
    if amount > 10000:
        return 3
    elif amount > 5000:
        return 2
    elif amount > 1000:
        return 1
    return 0

def _calculate_po_totals(purchase_order):
    """Recalcule les totaux d'un BC"""
    items = purchase_order.items.all()
    subtotal = sum(item.total_price for item in items)
    
    purchase_order.subtotal = subtotal
    purchase_order.tax_gst_hst = _calculate_gst_hst(subtotal, purchase_order.supplier.province)
    purchase_order.tax_qst = _calculate_qst(subtotal, purchase_order.supplier.province)
    purchase_order.total_amount = subtotal + purchase_order.tax_gst_hst + purchase_order.tax_qst
    purchase_order.save()
```

### **💰 INVOICING VIEWS**

```python
# apps/invoicing/views.py
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Sum, Count
from django.utils import timezone
from datetime import datetime, timedelta
import json

from .models import Invoice, InvoiceItem, Payment, InvoiceReminder
from .serializers import InvoiceSerializer
from .forms import InvoiceForm, InvoiceItemFormSet, PaymentForm
from apps.ai_assistant.services import MistralAIService
from apps.suppliers.models import Client

@login_required
def invoice_list(request):
    """Liste des factures - Vue manuelle"""
    
    # Filtres
    status_filter = request.GET.get('status', '')
    client_filter = request.GET.get('client', '')
    overdue_only = request.GET.get('overdue', '') == 'true'
    
    queryset = Invoice.objects.select_related('client', 'created_by')
    
    if status_filter:
        queryset = queryset.filter(status=status_filter)
    if client_filter:
        queryset = queryset.filter(client_id=client_filter)
    if overdue_only:
        queryset = queryset.filter(
            status__in=['sent', 'viewed'],
            due_date__lt=timezone.now().date()
        )
    
    # Statistiques
    stats = {
        'total_invoices': queryset.count(),
        'total_amount': queryset.aggregate(total=Sum('total_amount'))['total'] or 0,
        'outstanding': queryset.filter(status__in=['sent', 'viewed']).aggregate(
            total=Sum('total_amount'))['total'] or 0,
        'overdue': queryset.filter(
            status__in=['sent', 'viewed'], 
            due_date__lt=timezone.now().date()
        ).aggregate(total=Sum('total_amount'))['total'] or 0,
    }
    
    # Pagination
    from django.core.paginator import Paginator
    paginator = Paginator(queryset.order_by('-created_at'), 25)
    page_number = request.GET.get('page')
    invoices = paginator.get_page(page_number)
    
    # Données pour filtres
    clients = Client.objects.filter(is_active=True).order_by('name')
    
    context = {
        'invoices': invoices,
        'clients': clients,
        'stats': stats,
        'current_filters': {
            'status': status_filter,
            'client': client_filter,
            'overdue': overdue_only,
        },
        'status_choices': Invoice.status.field.choices,
    }
    
    return render(request, 'invoicing/list.html', context)

@login_required
def invoice_create(request):
    """Création manuelle d'une facture"""
    
    if request.method == 'POST':
        form = InvoiceForm(request.POST)
        formset = InvoiceItemFormSet(request.POST)
        
        if form.is_valid() and formset.is_valid():
            # Création de la facture
            invoice = form.save(commit=False)
            invoice.created_by = request.user
            invoice.number = _generate_invoice_number()
            invoice.save()
            
            # Création des lignes
            items = formset.save(commit=False)
            total = 0
            for item in items:
                item.invoice = invoice
                item.total_price = item.quantity * item.unit_price
                item.save()
                total += item.total_price
            
            # Calcul des taxes selon province du client
            client_province = _get_client_province(invoice.client)
            invoice.subtotal = total
            invoice.tax_gst_hst = _calculate_gst_hst(total, client_province)
            invoice.tax_qst = _calculate_qst(total, client_province)
            invoice.total_amount = invoice.subtotal + invoice.tax_gst_hst + invoice.tax_qst
            invoice.save()
            
            messages.success(request, f'Facture {invoice.number} créée avec succès.')
            return redirect('invoicing:detail', pk=invoice.pk)
    else:
        form = InvoiceForm()
        formset = InvoiceItemFormSet()
    
    context = {
        'form': form,
        'formset': formset,
        'clients': Client.objects.filter(is_active=True).order_by('name'),
    }
    
    return render(request, 'invoicing/create.html', context)

@login_required
def invoice_detail(request, pk):
    """Détail d'une facture"""
    
    invoice = get_object_or_404(Invoice, pk=pk)
    
    context = {
        'invoice': invoice,
        'items': invoice.items.all(),
        'payments': invoice.payments.order_by('-payment_date'),
        'reminders': invoice.reminders.order_by('-sent_at'),
        'balance_due': invoice.total_amount - sum(p.amount for p in invoice.payments.all()),
        'can_edit': invoice.status == 'draft',
        'can_send': invoice.status in ['draft', 'viewed'],
    }
    
    return render(request, 'invoicing/detail.html', context)

@login_required
@require_http_methods(["POST"])
def invoice_send(request, pk):
    """Envoi d'une facture par email"""
    
    invoice = get_object_or_404(Invoice, pk=pk)
    
    if invoice.status not in ['draft', 'viewed']:
        messages.error(request, "Cette facture ne peut pas être envoyée.")
        return redirect('invoicing:detail', pk=pk)
    
    try:
        # Génération PDF
        pdf_content = _generate_invoice_pdf(invoice)
        
        # Envoi email
        from django.core.mail import EmailMessage
        
        email = EmailMessage(
            subject=f'Facture {invoice.number}',
            body=_get_invoice_email_template(invoice),
            from_email='facturation@votreentreprise.com',
            to=[invoice.client.email],
            cc=[invoice.created_by.email],
        )
        
        email.attach(f'Facture_{invoice.number}.pdf', pdf_content, 'application/pdf')
        email.send()
        
        # Mise à jour statut
        invoice.status = 'sent'
        invoice.sent_at = timezone.now()
        invoice.save()
        
        messages.success(request, f'Facture {invoice.number} envoyée avec succès.')
        
    except Exception as e:
        messages.error(request, f'Erreur lors de l\'envoi: {str(e)}')
    
    return redirect('invoicing:detail', pk=pk)

@login_required
def invoice_record_payment(request, pk):
    """Enregistrer un paiement"""
    
    invoice = get_object_or_404(Invoice, pk=pk)
    
    if request.method == 'POST':
        form = PaymentForm(request.POST)
        if form.is_valid():
            payment = form.save(commit=False)
            payment.invoice = invoice
            payment.created_by = request.user
            payment.save()
            
            # Mise à jour statut facture
            total_payments = sum(p.amount for p in invoice.payments.all())
            if total_payments >= invoice.total_amount:
                invoice.status = 'paid'
            elif total_payments > 0:
                invoice.status = 'partial'
            invoice.save()
            
            messages.success(request, f'Paiement de {payment.amount} enregistré.')
            return redirect('invoicing:detail', pk=pk)
    else:
        # Pré-remplir avec solde restant
        balance = invoice.total_amount - sum(p.amount for p in invoice.payments.all())
        form = PaymentForm(initial={'amount': balance})
    
    context = {
        'form': form,
        'invoice': invoice,
        'balance_due': balance,
    }
    
    return render(request, 'invoicing/record_payment.html', context)

# ===== API REST =====

class InvoiceViewSet(viewsets.ModelViewSet):
    """API REST pour les factures"""
    
    serializer_class = InvoiceSerializer
    
    def get_queryset(self):
        return Invoice.objects.select_related('client', 'created_by')
    
    def perform_create(self, serializer):
        """Création via API"""
        
        instance = serializer.save(
            created_by=self.request.user,
            number=_generate_invoice_number(),
            generated_by_ai=self.request.data.get('generated_by_ai', False)
        )
        
        # Calcul automatique des totaux
        _calculate_invoice_totals(instance)
        
        return instance
    
    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """Envoi par email via API"""
        
        invoice = self.get_object()
        
        try:
            # Même logique que vue manuelle
            # ... code envoi email ...
            
            return Response({'status': 'success', 'message': 'Facture envoyée'})
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def ai_generate_from_po(self, request):
        """Génération facture IA depuis bon de commande"""
        
        po_id = request.data.get('purchase_order_id')
        if not po_id:
            return Response(
                {'error': 'purchase_order_id requis'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from apps.purchase_orders.models import PurchaseOrder
            purchase_order = PurchaseOrder.objects.get(pk=po_id)
            
            ai_service = MistralAIService()
            invoice_data = ai_service.generate_invoice_from_po(purchase_order)
            
            # Créer la facture
            serializer = self.get_serializer(data=invoice_data)
            if serializer.is_valid():
                invoice = self.perform_create(serializer)
                return Response({
                    'status': 'success',
                    'invoice_id': invoice.id,
                    'message': f'Facture {invoice.number} générée par IA.'
                })
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response(
                {'error': f'Erreur génération: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# ===== TÂCHES AUTOMATIQUES =====

@login_required
def automated_reminders_view(request):
    """Interface gestion relances automatiques"""
    
    # Factures en retard
    overdue_invoices = Invoice.objects.filter(
        status__in=['sent', 'viewed'],
        due_date__lt=timezone.now().date()
    ).select_related('client')
    
    # Factures approchant échéance (7 jours)
    upcoming_due = Invoice.objects.filter(
        status__in=['sent', 'viewed'],
        due_date__lte=timezone.now().date() + timedelta(days=7),
        due_date__gt=timezone.now().date()
    ).select_related('client')
    
    context = {
        'overdue_invoices': overdue_invoices,
        'upcoming_due': upcoming_due,
        'can_send_reminders': request.user.role in ['admin', 'manager', 'accountant'],
    }
    
    return render(request, 'invoicing/automated_reminders.html', context)

@login_required
@require_http_methods(["POST"])
def send_bulk_reminders(request):
    """Envoi relances en lot"""
    
    invoice_ids = request.POST.getlist('invoice_ids')
    reminder_type = request.POST.get('reminder_type', 'first')
    
    if not invoice_ids:
        messages.error(request, "Aucune facture sélectionnée.")
        return redirect('invoicing:reminders')
    
    # Tâche asynchrone
    from apps.invoicing.tasks import send_invoice_reminders
    task = send_invoice_reminders.delay(invoice_ids, reminder_type, request.user.id)
    
    messages.info(request, f"Envoi de {len(invoice_ids)} relances en cours...")
    return redirect('invoicing:reminders')

# ===== FONCTIONS UTILITAIRES =====

def _generate_invoice_number():
    """Génère numéro facture unique"""
    from datetime import datetime
    year = datetime.now().year
    last_invoice = Invoice.objects.filter(
        number__startswith=f'INV{year}'
    ).order_by('-number').first()
    
    if last_invoice:
        last_num = int(last_invoice.number.split('-')[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f'INV{year}-{new_num:05d}'

def _calculate_invoice_totals(invoice):
    """Recalcule totaux facture"""
    items = invoice.items.all()
    subtotal = sum(item.total_price for item in items)
    
    client_province = _get_client_province(invoice.client)
    
    invoice.subtotal = subtotal
    invoice.tax_gst_hst = _calculate_gst_hst(subtotal, client_province)
    invoice.tax_qst = _calculate_qst(subtotal, client_province)
    invoice.total_amount = subtotal + invoice.tax_gst_hst + invoice.tax_qst
    invoice.save()

def _get_client_province(client):
    """Extrait province du client depuis adresse"""
    # TODO: Parser adresse ou ajouter champ province explicite
    return 'ON'  # Défaut Ontario

def _generate_invoice_pdf(invoice):
    """Génère PDF de facture"""
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from io import BytesIO
    
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    # En-tête facture
    p.drawString(100, 750, f"FACTURE {invoice.number}")
    p.drawString(100, 730, f"Date: {invoice.invoice_date}")
    p.drawString(100, 710, f"Échéance: {invoice.due_date}")
    
    # Client
    p.drawString(100, 670, "FACTURÉ À:")
    p.drawString(100, 650, invoice.client.name)
    # TODO: Améliorer template PDF
    
    # Total
    p.drawString(400, 200, f"TOTAL: {invoice.total_amount}")
    
    p.showPage()
    p.save()
    
    buffer.seek(0)
    return buffer.getvalue()

def _get_invoice_email_template(invoice):
    """Template email facture"""
    return f"""
Bonjour {invoice.client.contact_person},

Veuillez trouver ci-joint la facture {invoice.number} d'un montant de {invoice.total_amount}.

Échéance de paiement: {invoice.due_date}

Merci de votre collaboration.

Cordialement,
L'équipe comptabilité
    """
```

### **🤖 AI_ASSISTANT VIEWS**

```python
# apps/ai_assistant/views.py
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
import json

from .models import AIConversation, AIMessage, AIAction, AINotification
from .services import MistralAIService
from .serializers import AIConversationSerializer, AIMessageSerializer

@login_required
def ai_chat_interface(request):
    """Interface principale du chat IA"""
    
    # Conversations récentes
    recent_conversations = AIConversation.objects.filter(
        user=request.user,
        is_active=True
    ).order_by('-updated_at')[:10]
    
    # Notifications IA non lues
    notifications = AINotification.objects.filter(
        user=request.user,
        is_read=False
    ).order_by('-created_at')[:5]
    
    # Actions IA en attente d'approbation
    pending_actions = AIAction.objects.filter(
        user=request.user,
        requires_approval=True,
        approved__isnull=True
    ).order_by('-executed_at')[:10]
    
    context = {
        'recent_conversations': recent_conversations,
        'notifications': notifications,
        'pending_actions': pending_actions,
        'ai_enabled': request.user.preferences.ai_notifications if hasattr(request.user, 'preferences') else True,
    }
    
    return render(request, 'ai_assistant/chat_interface.html', context)

@login_required
def ai_conversation_detail(request, conversation_id):
    """Détail d'une conversation IA"""
    
    try:
        conversation = AIConversation.objects.get(
            id=conversation_id,
            user=request.user
        )
    except AIConversation.DoesNotExist:
        return JsonResponse({'error': 'Conversation introuvable'}, status=404)
    
    messages = conversation.messages.order_by('timestamp')
    
    context = {
        'conversation': conversation,
        'messages': messages,
    }
    
    return render(request, 'ai_assistant/conversation_detail.html', context)

@login_required
@csrf_exempt
@require_http_methods(["POST"])
def ai_process_message(request):
    """Traite un message utilisateur via IA"""
    
    try:
        data = json.loads(request.body)
        user_message = data.get('message')
        conversation_id = data.get('conversation_id')
        
        if not user_message:
            return JsonResponse({'error': 'Message requis'}, status=400)
        
        # Récupérer ou créer conversation
        if conversation_id:
            try:
                conversation = AIConversation.objects.get(
                    id=conversation_id,
                    user=request.user
                )
            except AIConversation.DoesNotExist:
                return JsonResponse({'error': 'Conversation introuvable'}, status=404)
        else:
            conversation = AIConversation.objects.create(
                user=request.user,
                title=user_message[:50] + '...' if len(user_message) > 50 else user_message
            )
        
        # Sauvegarder message utilisateur
        user_msg = AIMessage.objects.create(
            conversation=conversation,
            role='user',
            content=user_message
        )
        
        # Traitement par IA Mistral
        ai_service = MistralAIService()
        
        # Contexte utilisateur
        user_context = {
            'user_id': request.user.id,
            'user_role': request.user.role,
            'tenant_name': getattr(request, 'tenant', {}).get('name', 'Unknown'),
            'conversation_history': [
                {'role': msg.role, 'content': msg.content}
                for msg in conversation.messages.order_by('timestamp')[-10:]  # 10 derniers messages
            ]
        }
        
        ai_response = ai_service.process_user_request(user_message, user_context)
        
        # Sauvegarder réponse IA
        ai_msg = AIMessage.objects.create(
            conversation=conversation,
            role='assistant',
            content=ai_response['message'],
            model_used=ai_response.get('model', 'mistral-medium'),
            tokens_used=ai_response.get('tokens', 0),
            response_time_ms=ai_response.get('response_time', 0)
        )
        
        # Exécuter action si demandée
        action_result = None
        if ai_response.get('action'):
            try:
                action_result = _execute_ai_action(
                    ai_response['action'],
                    ai_response.get('parameters', {}),
                    request.user,
                    conversation
                )
                
                # Enregistrer l'action
                ai_action = AIAction.objects.create(
                    user=request.user,
                    action_type=ai_response['action'],
                    parameters=ai_response.get('parameters', {}),
                    result=action_result,
                    success=action_result.get('success', False),
                    requires_approval=action_result.get('requires_approval', False)
                )
                
                # Mettre à jour le message IA
                ai_msg.action_triggered = ai_response['action']
                ai_msg.action_result = action_result
                ai_msg.save()
                
            except Exception as e:
                action_result = {
                    'success': False,
                    'error': str(e)
                }
        
        # Mettre à jour conversation
        conversation.updated_at = timezone.now()
        conversation.save()
        
        response_data = {
            'status': 'success',
            'conversation_id': str(conversation.id),
            'message_id': str(ai_msg.id),
            'ai_response': ai_response['message'],
            'action_result': action_result,
            'timestamp': ai_msg.timestamp.isoformat()
        }
        
        return JsonResponse(response_data)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON invalide'}, status=400)
    except Exception as e:
        return JsonResponse({'error': f'Erreur serveur: {str(e)}'}, status=500)

@login_required
@require_http_methods(["POST"])
def ai_approve_action(request, action_id):
    """Approuve une action IA en attente"""
    
    try:
        ai_action = AIAction.objects.get(
            id=action_id,
            user=request.user,
            requires_approval=True,
            approved__isnull=True
        )
    except AIAction.DoesNotExist:
        return JsonResponse({'error': 'Action introuvable'}, status=404)
    
    approve = request.POST.get('approve') == 'true'
    comments = request.POST.get('comments', '')
    
    ai_action.approved = approve
    ai_action.approved_by = request.user
    ai_action.approved_at = timezone.now()
    ai_action.save()
    
    if approve:
        # Exécuter l'action maintenant qu'elle est approuvée
        try:
            result = _execute_ai_action(
                ai_action.action_type,
                ai_action.parameters,
                request.user,
                None,
                skip_approval=True
            )
            ai_action.result = result
            ai_action.success = result.get('success', False)
            ai_action.save()
            
            message = 'Action approuvée et exécutée avec succès.'
        except Exception as e:
            ai_action.error_message = str(e)
            ai_action.success = False
            ai_action.save()
            message = f'Action approuvée mais échec execution: {str(e)}'
    else:
        message = 'Action refusée.'
    
    return JsonResponse({
        'status': 'success',
        'message': message
    })

@login_required
def ai_notifications_list(request):
    """Liste des notifications IA"""
    
    notifications = AINotification.objects.filter(
        user=request.user
    ).order_by('-created_at')
    
    # Marquer comme lues
    unread_notifications = notifications.filter(is_read=False)
    unread_notifications.update(is_read=True, read_at=timezone.now())
    
    context = {
        'notifications': notifications[:50],  # Limiter à 50
    }
    
    return render(request, 'ai_assistant/notifications_list.html', context)

@login_required
def ai_dashboard(request):
    """Dashboard IA avec statistiques d'usage"""
    
    from django.db.models import Count, Avg
    from datetime import timedelta
    
    # Statistiques des 30 derniers jours
    thirty_days_ago = timezone.now() - timedelta(days=30)
    
    stats = {
        'conversations_count': AIConversation.objects.filter(
            user=request.user,
            created_at__gte=thirty_days_ago
        ).count(),
        
        'messages_count': AIMessage.objects.filter(
            conversation__user=request.user,
            timestamp__gte=thirty_days_ago,
            role='user'
        ).count(),
        
        'actions_executed': AIAction.objects.filter(
            user=request.user,
            executed_at__gte=thirty_days_ago,
            success=True
        ).count(),
        
        'avg_response_time': AIMessage.objects.filter(
            conversation__user=request.user,
            timestamp__gte=thirty_days_ago,
            role='assistant'
        ).aggregate(avg_time=Avg('response_time_ms'))['avg_time'] or 0,
        
        'tokens_used': AIMessage.objects.filter(
            conversation__user=request.user,
            timestamp__gte=thirty_days_ago,
            role='assistant'
        ).aggregate(total_tokens=Sum('tokens_used'))['total_tokens'] or 0,
    }
    
    # Actions par type
    action_breakdown = AIAction.objects.filter(
        user=request.user,
        executed_at__gte=thirty_days_ago
    ).values('action_type').annotate(
        count=Count('id')
    ).order_by('-count')
    
    # Économies estimées
    estimated_savings = _calculate_ai_time_savings(request.user, thirty_days_ago)
    
    context = {
        'stats': stats,
        'action_breakdown': action_breakdown,
        'estimated_savings': estimated_savings,
    }
    
    return render(request, 'ai_assistant/dashboard.html', context)

# ===== FONCTIONS UTILITAIRES =====

def _execute_ai_action(action_type, parameters, user, conversation, skip_approval=False):
    """Exécute une action IA"""
    
    if action_type == 'create_purchase_order':
        return _ai_create_purchase_order(parameters, user)
    elif action_type == 'create_invoice':
        return _ai_create_invoice(parameters, user)
    elif action_type == 'send_reminder':
        return _ai_send_reminder(parameters, user)
    elif action_type == 'update_status':
        return _ai_update_status(parameters, user)
    elif action_type == 'generate_report':
        return _ai_generate_report(parameters, user)
    else:
        return {
            'success': False,
            'error': f'Action inconnue: {action_type}'
        }

def _ai_create_purchase_order(parameters, user):
    """Création BC par IA"""
    try:
        from apps.purchase_orders.models import PurchaseOrder
        from apps.suppliers.models import Supplier
        
        # Validation paramètres
        supplier_id = parameters.get('supplier_id')
        items = parameters.get('items', [])
        
        if not supplier_id or not items:
            return {
                'success': False,
                'error': 'Paramètres insuffisants: supplier_id et items requis'
            }
        
        supplier = Supplier.objects.get(id=supplier_id)
        
        # Créer BC
        po = PurchaseOrder.objects.create(
            supplier=supplier,
            created_by=user,
            number=_generate_po_number(),
            status='draft',
            created_by_ai=True,
            ai_confidence_score=parameters.get('confidence', 0.8)
        )
        
        # Ajouter items
        from apps.purchase_orders.models import PurchaseOrderItem
        for item_data in items:
            PurchaseOrderItem.objects.create(
                purchase_order=po,
                description=item_data['description'],
                quantity=item_data['quantity'],
                unit_price=item_data['unit_price'],
                total_price=item_data['quantity'] * item_data['unit_price']
            )
        
        # Recalculer totaux
        _calculate_po_totals(po)
        
        return {
            'success': True,
            'purchase_order_id': str(po.id),
            'purchase_order_number': po.number,
            'message': f'Bon de commande {po.number} créé avec succès'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': f'Erreur création BC: {str(e)}'
        }

def _ai_create_invoice(parameters, user):
    """Création facture par IA"""
    # Logique similaire à _ai_create_purchase_order
    pass

def _ai_send_reminder(parameters, user):
    """Envoi relance par IA"""
    # Logique envoi relance automatique
    pass

def _calculate_ai_time_savings(user, since_date):
    """Calcule économies temps grâce à l'IA"""
    # Estimation temps économisé par action
    time_savings_minutes = {
        'create_purchase_order': 15,
        'create_invoice': 10,
        'send_reminder': 5,
        'update_status': 2,
        'generate_report': 30,
    }
    
    actions = AIAction.objects.filter(
        user=user,
        executed_at__gte=since_date,
        success=True
    ).values('action_type').annotate(count=Count('id'))
    
    total_minutes_saved = sum(
        action['count'] * time_savings_minutes.get(action['action_type'], 0)
        for action in actions
    )
    
    return {
        'minutes_saved': total_minutes_saved,
        'hours_saved': round(total_minutes_saved / 60, 1),
        'estimated_cost_savings': round(total_minutes_saved * 0.5, 2)  # 0.50$/min
    }
```

---

## **🛣️ URLS ROUTING**

### **🏗️ URLS PRINCIPAL**

```python
# saas_procurement/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.conf.urls.i18n import i18n_patterns

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # APIs REST
    path('api/v1/', include('apps.api.urls')),
    
    # Authentification
    path('accounts/', include('allauth.urls')),
    path('accounts/', include('apps.accounts.urls')),
    
    # IA Assistant (WebSocket pour chat)
    # Note: WebSocket routes définies dans routing.py
]

# URLs avec préfixe de langue
urlpatterns += i18n_patterns(
    # Apps principales
    path('', include('apps.core.urls')),  # Dashboard principal
    path('purchase-orders/', include('apps.purchase_orders.urls')),
    path('invoicing/', include('apps.invoicing.urls')),
    path('suppliers/', include('apps.suppliers.urls')),
    path('analytics/', include('apps.analytics.urls')),
    path('ai/', include('apps.ai_assistant.urls')),
    path('integrations/', include('apps.integrations.urls')),
    
    # Fallback pour URLs sans préfixe
    prefix_default_language=False,
)

# Fichiers média en développement
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Gestion d'erreurs
handler404 = 'apps.core.views.custom_404'
handler500 = 'apps.core.views.custom_500'
```

### **🛒 PURCHASE ORDERS URLS**

```python
# apps/purchase_orders/urls.py
from django.urls import path
from . import views

app_name = 'purchase_orders'

urlpatterns = [
    # Vues manuelles
    path('', views.purchase_order_list, name='list'),
    path('create/', views.purchase_order_create, name='create'),
    path('<uuid:pk>/', views.purchase_order_detail, name='detail'),
    path('<uuid:pk>/edit/', views.purchase_order_edit, name='edit'),
    path('<uuid:pk>/approve/', views.purchase_order_approve, name='approve'),
    path('<uuid:pk>/send/', views.purchase_order_send, name='send'),
    path('<uuid:pk>/cancel/', views.purchase_order_cancel, name='cancel'),
    
    # Actions rapides AJAX
    path('ajax/quick-actions/', views.ajax_po_quick_actions, name='ajax_quick_actions'),
    path('ajax/supplier-info/<uuid:supplier_id>/', views.ajax_supplier_info, name='ajax_supplier_info'),
    path('ajax/product-search/', views.ajax_product_search, name='ajax_product_search'),
    
    # Rapports
    path('reports/', views.purchase_order_reports, name='reports'),
    path('reports/export/', views.export_purchase_orders, name='export'),
    
    # Workflows
    path('workflows/', views.workflow_settings, name='workflow_settings'),
    path('approval-rules/', views.approval_rules, name='approval_rules'),
]
```

### **💰 INVOICING URLS**

```python
# apps/invoicing/urls.py
from django.urls import path
from . import views

app_name = 'invoicing'

urlpatterns = [
    # Vues manuelles
    path('', views.invoice_list, name='list'),
    path('create/', views.invoice_create, name='create'),
    path('<uuid:pk>/', views.invoice_detail, name='detail'),
    path('<uuid:pk>/edit/', views.invoice_edit, name='edit'),
    path('<uuid:pk>/send/', views.invoice_send, name='send'),
    path('<uuid:pk>/duplicate/', views.invoice_duplicate, name='duplicate'),
    
    # Paiements
    path('<uuid:pk>/record-payment/', views.invoice_record_payment, name='record_payment'),
    path('payments/', views.payment_list, name='payments'),
    
    # Relances
    path('reminders/', views.automated_reminders_view, name='reminders'),
    path('send-bulk-reminders/', views.send_bulk_reminders, name='send_bulk_reminders'),
    
    # Récurrent
    path('recurring/', views.recurring_invoices, name='recurring'),
    path('recurring/create/', views.create_recurring_invoice, name='create_recurring'),
    
    # Rapports
    path('reports/', views.invoice_reports, name='reports'),
    path('aging-report/', views.aging_report, name='aging_report'),
    
    # Export/Import
    path('export/', views.export_invoices, name='export'),
    path('<uuid:pk>/pdf/', views.invoice_pdf, name='pdf'),
    
    # AJAX
    path('ajax/client-info/<uuid:client_id>/', views.ajax_client_info, name='ajax_client_info'),
]
```

### **🤖 AI ASSISTANT URLS**

```python
# apps/ai_assistant/urls.py
from django.urls import path
from . import views

app_name = 'ai_assistant'

urlpatterns = [
    # Interface principale
    path('', views.ai_chat_interface, name='chat_interface'),
    path('dashboard/', views.ai_dashboard, name='dashboard'),
    
    # Conversations
    path('conversations/', views.ai_conversations_list, name='conversations'),
    path('conversations/<uuid:conversation_id>/', views.ai_conversation_detail, name='conversation_detail'),
    
    # API Chat
    path('process-message/', views.ai_process_message, name='process_message'),
    path('new-conversation/', views.ai_new_conversation, name='new_conversation'),
    
    # Actions
    path('actions/', views.ai_actions_list, name='actions'),
    path('actions/<uuid:action_id>/approve/', views.ai_approve_action, name='approve_action'),
    
    # Notifications
    path('notifications/', views.ai_notifications_list, name='notifications'),
    path('notifications/mark-read/', views.ai_mark_notifications_read, name='mark_notifications_read'),
    
    # Configuration
    path('settings/', views.ai_settings, name='settings'),
    path('training/', views.ai_training_data, name='training'),
    
    # Utilitaires
    path('extract-invoice-data/', views.ai_extract_invoice_data, name='extract_invoice_data'),
    path('analyze-document/', views.ai_analyze_document, name='analyze_document'),
]
```

### **🏪 SUPPLIERS URLS**

```python
# apps/suppliers/urls.py
from django.urls import path
from . import views

app_name = 'suppliers'

urlpatterns = [
    # Fournisseurs
    path('', views.supplier_list, name='list'),
    path('create/', views.supplier_create, name='create'),
    path('<uuid:pk>/', views.supplier_detail, name='detail'),
    path('<uuid:pk>/edit/', views.supplier_edit, name='edit'),
    path('<uuid:pk>/performance/', views.supplier_performance, name='performance'),
    
    # Catalogue
    path('catalog/', views.product_catalog, name='catalog'),
    path('catalog/search/', views.catalog_search, name='catalog_search'),
    path('products/<uuid:pk>/', views.product_detail, name='product_detail'),
    
    # Clients (pour facturation)
    path('clients/', views.client_list, name='client_list'),
    path('clients/create/', views.client_create, name='client_create'),
    path('clients/<uuid:pk>/', views.client_detail, name='client_detail'),
    
    # Évaluation/Scoring
    path('evaluation/', views.supplier_evaluation, name='evaluation'),
    path('scoring-rules/', views.scoring_rules, name='scoring_rules'),
    
    # Import/Export
    path('import/', views.import_suppliers, name='import'),
    path('export/', views.export_suppliers, name='export'),
    
    # AJAX
    path('ajax/search/', views.ajax_supplier_search, name='ajax_search'),
    path('ajax/products/<uuid:supplier_id>/', views.ajax_supplier_products, name='ajax_products'),
]
```

### **📊 ANALYTICS URLS**

```python
# apps/analytics/urls.py
from django.urls import path
from . import views

app_name = 'analytics'

urlpatterns = [
    # Dashboards
    path('', views.analytics_dashboard, name='dashboard'),
    path('spend-analysis/', views.spend_analysis, name='spend_analysis'),
    path('supplier-analysis/', views.supplier_analysis, name='supplier_analysis'),
    path('invoice-analysis/', views.invoice_analysis, name='invoice_analysis'),
    
    # Rapports prédéfinis
    path('reports/monthly/', views.monthly_report, name='monthly_report'),
    path('reports/quarterly/', views.quarterly_report, name='quarterly_report'),
    path('reports/annual/', views.annual_report, name='annual_report'),
    
    # Rapports personnalisés
    path('custom-reports/', views.custom_reports, name='custom_reports'),
    path('custom-reports/builder/', views.report_builder, name='report_builder'),
    path('custom-reports/<int:report_id>/', views.custom_report_detail, name='custom_report_detail'),
    
    # APIs pour graphiques
    path('api/spend-trends/', views.api_spend_trends, name='api_spend_trends'),
    path('api/supplier-performance/', views.api_supplier_performance, name='api_supplier_performance'),
    path('api/cash-flow/', views.api_cash_flow_forecast, name='api_cash_flow'),
    
    # Export
    path('export/<str:report_type>/', views.export_report, name='export_report'),
]
```

### **🔗 API REST URLS**

```python
# apps/api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token

from apps.purchase_orders.viewsets import PurchaseOrderViewSet
from apps.invoicing.viewsets import InvoiceViewSet
from apps.suppliers.viewsets import SupplierViewSet, ClientViewSet
from apps.ai_assistant.viewsets import AIConversationViewSet

# Router automatique pour ViewSets
router = DefaultRouter()
router.register(r'purchase-orders', PurchaseOrderViewSet, basename='purchase-orders')
router.register(r'invoices',