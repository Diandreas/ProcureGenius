# 🔄 PLAN MIGRATION ERP SIMPLIFIÉ - Import Initial

**Date:** 2025-10-07
**Version:** 1.0
**Objectif:** Permettre aux nouveaux clients d'importer facilement leurs données existantes depuis leur ERP

---

## 🎯 OBJECTIF RÉVISÉ

**AVANT (Plan complet):** Synchronisation bi-directionnelle continue → Complexe, 8-9 mois

**MAINTENANT (Simplifié):** Import initial one-time pour faciliter la transition → **Simple, 1-2 mois!**

---

## 💡 CONCEPT

Quand un nouveau client arrive sur ProcureGenius:

```
Client utilise QuickBooks/Sage/autre
          ↓
"Je veux essayer ProcureGenius mais j'ai déjà 500 fournisseurs et 1000 produits!"
          ↓
ProcureGenius: "Importez vos données en 3 clics!"
          ↓
1. Connecter votre ERP (OAuth)
2. Sélectionner ce qu'on importe (Fournisseurs? Produits? Factures?)
3. IMPORT → Terminé en 5 minutes!
          ↓
Client utilise maintenant ProcureGenius avec toutes ses données
(Pas de sync continue = client quitte son ancien système)
```

---

## 📊 ARCHITECTURE SIMPLIFIÉE

### Nouvelle App Django: `apps/data_migration/`

```
apps/data_migration/
├── models.py              # MigrationJob, ImportLog
├── views.py               # UI + API
├── serializers.py
├── admin.py
├── importers/            # Importers par source
│   ├── base.py           # BaseImporter
│   ├── quickbooks_importer.py
│   ├── sage_importer.py
│   ├── excel_importer.py
│   ├── csv_importer.py
│   └── netsuite_importer.py
├── tasks.py              # Tâches Celery import async
├── services/
│   ├── migration_service.py
│   └── duplicate_detection.py
└── utils.py
```

---

## 📦 MODÈLES DE DONNÉES (ULTRA-SIMPLES)

### 1. **MigrationJob** (Job d'import)

```python
class MigrationJob(models.Model):
    """
    Job d'importation de données depuis ERP externe
    """
    SOURCE_TYPES = [
        ('quickbooks', 'QuickBooks Online'),
        ('sage', 'Sage Intacct'),
        ('netsuite', 'NetSuite'),
        ('excel', 'Excel/CSV'),
        ('manual', 'Saisie manuelle'),
    ]

    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('connecting', 'Connexion en cours'),
        ('importing', 'Import en cours'),
        ('completed', 'Terminé'),
        ('failed', 'Échec'),
        ('cancelled', 'Annulé'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)

    # Source
    source_type = models.CharField(max_length=30, choices=SOURCE_TYPES)
    source_name = models.CharField(max_length=200, blank=True)  # Nom de l'entreprise source

    # Statut
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Dates
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Configuration
    import_suppliers = models.BooleanField(default=True)
    import_products = models.BooleanField(default=True)
    import_purchase_orders = models.BooleanField(default=False)  # Historique optionnel
    import_invoices = models.BooleanField(default=False)  # Historique optionnel

    # Credentials temporaires (pour ERP)
    temp_credentials = models.JSONField(default=dict, blank=True)  # Encrypted

    # Statistiques
    total_records = models.IntegerField(default=0)
    imported_records = models.IntegerField(default=0)
    skipped_records = models.IntegerField(default=0)
    error_records = models.IntegerField(default=0)

    # Résultats détaillés
    import_summary = models.JSONField(default=dict, blank=True)
    # Exemple: {
    #   "suppliers": {"total": 500, "imported": 495, "skipped": 5, "errors": 0},
    #   "products": {"total": 1200, "imported": 1180, "skipped": 20, "errors": 0}
    # }

    # Erreurs
    error_details = models.JSONField(default=list, blank=True)

    # Créateur
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Import {self.get_source_type_display()} - {self.created_at.strftime('%Y-%m-%d')}"
```

---

### 2. **ImportLog** (Logs détaillés)

```python
class ImportLog(models.Model):
    """
    Log détaillé de chaque enregistrement importé
    """
    RECORD_TYPES = [
        ('supplier', 'Fournisseur'),
        ('product', 'Produit'),
        ('purchase_order', 'Bon de commande'),
        ('invoice', 'Facture'),
    ]

    STATUS_CHOICES = [
        ('imported', 'Importé'),
        ('skipped', 'Ignoré'),
        ('error', 'Erreur'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    migration_job = models.ForeignKey(MigrationJob, on_delete=models.CASCADE, related_name='logs')

    # Type et statut
    record_type = models.CharField(max_length=30, choices=RECORD_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)

    # Données
    source_id = models.CharField(max_length=200, blank=True)  # ID dans système source
    source_data = models.JSONField(default=dict, blank=True)  # Données brutes source

    # Résultat
    created_object_id = models.UUIDField(null=True, blank=True)  # ID créé dans ProcureGenius
    error_message = models.TextField(blank=True)

    # Metadata
    imported_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['imported_at']
        indexes = [
            models.Index(fields=['migration_job', 'record_type']),
            models.Index(fields=['migration_job', 'status']),
        ]
```

---

## 🎨 FONCTIONNALITÉS

### Phase 1 (MVP) - 1-1.5 mois

#### ✅ 1. Import depuis Excel/CSV (Universel)

**Pourquoi en premier?**
- Fonctionne avec **TOUS** les ERP (tout le monde peut exporter en CSV)
- Pas besoin d'OAuth ou API compliquée
- Rapide à implémenter

**Fonctionnalités:**
```
1. Upload fichier CSV/Excel
2. Mapping colonnes automatique (intelligent)
   - Détecte "Supplier Name" → supplier.name
   - Détecte "Email" → supplier.email
   - Détecte "Phone" → supplier.phone
3. Prévisualisation (10 premières lignes)
4. Validation données
5. Import avec détection doublons
6. Rapport final
```

**Templates CSV fournis:**
- `suppliers_template.csv`
- `products_template.csv`
- `purchase_orders_template.csv`

**Exemple UI:**

```
┌─────────────────────────────────────────────────┐
│  📤 IMPORTER VOS DONNÉES                        │
├─────────────────────────────────────────────────┤
│                                                  │
│  Étape 1: Choisir la source                     │
│  ○ QuickBooks Online                            │
│  ○ Sage Intacct                                 │
│  ● Excel/CSV (recommandé pour débuter)         │
│                                                  │
│  Étape 2: Type de données                       │
│  ☑ Fournisseurs (500 trouvés)                  │
│  ☑ Produits (1200 trouvés)                     │
│  ☐ Bons de commande (historique)               │
│  ☐ Factures (historique)                       │
│                                                  │
│  [Télécharger template CSV] [Upload fichier]   │
│                                                  │
│  📊 Prévisualisation:                           │
│  ┌──────────────────────────────────────────┐  │
│  │ Name         | Email          | Phone    │  │
│  │ Acme Corp    | info@acme.com  | 514-... │  │
│  │ Tech Supply  | sales@tech.ca  | 438-... │  │
│  │ ...                                      │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  [Annuler]              [Lancer l'import →]     │
└─────────────────────────────────────────────────┘
```

**Effort:** 3 semaines

---

#### ✅ 2. Import depuis QuickBooks Online (OAuth)

**Pour clients QuickBooks qui veulent facilité:**

**Fonctionnalités:**
```
1. Connexion OAuth QuickBooks (1 clic)
2. Sélection données à importer
3. Import automatique:
   - Vendors → Suppliers
   - Items → Products
   - (Optionnel) Purchase Orders historique
4. Mapping intelligent
5. Rapport final
```

**Flow utilisateur:**

```
┌─────────────────────────────────────────────────┐
│  🔗 CONNECTER QUICKBOOKS                        │
├─────────────────────────────────────────────────┤
│                                                  │
│  Cliquez pour vous connecter à QuickBooks:      │
│                                                  │
│  [🟢 Se connecter avec QuickBooks]              │
│                                                  │
│  ✓ Sécurisé (OAuth 2.0)                        │
│  ✓ Lecture seule                               │
│  ✓ Vos credentials restent privés              │
│                                                  │
└─────────────────────────────────────────────────┘

        ↓ (Après connexion)

┌─────────────────────────────────────────────────┐
│  ✓ Connecté: Acme Corp (QuickBooks)            │
├─────────────────────────────────────────────────┤
│                                                  │
│  Données disponibles:                           │
│  ☑ 487 Fournisseurs (Vendors)                  │
│  ☑ 1,203 Produits (Items)                      │
│  ☐ 2,456 Factures (Bills) - historique         │
│  ☐ 534 Bons de commande - historique           │
│                                                  │
│  Options:                                        │
│  ☑ Détecter et ignorer doublons                │
│  ☑ Préserver IDs QuickBooks (pour référence)   │
│                                                  │
│  [Annuler]        [Lancer l'import (5 min) →]  │
└─────────────────────────────────────────────────┘

        ↓ (Pendant import)

┌─────────────────────────────────────────────────┐
│  ⏳ IMPORT EN COURS...                          │
├─────────────────────────────────────────────────┤
│                                                  │
│  ████████████░░░░░░░░░░░░  60%                 │
│                                                  │
│  Fournisseurs: 292/487 importés                │
│  Produits: En attente...                        │
│                                                  │
│  Temps restant estimé: 2 minutes                │
│                                                  │
└─────────────────────────────────────────────────┘

        ↓ (Terminé)

┌─────────────────────────────────────────────────┐
│  ✅ IMPORT TERMINÉ!                             │
├─────────────────────────────────────────────────┤
│                                                  │
│  📊 Résumé:                                     │
│                                                  │
│  Fournisseurs:                                  │
│  ✓ 482 importés                                │
│  ⊘ 5 ignorés (doublons)                        │
│  ✗ 0 erreurs                                   │
│                                                  │
│  Produits:                                      │
│  ✓ 1,198 importés                              │
│  ⊘ 5 ignorés (doublons)                        │
│  ✗ 0 erreurs                                   │
│                                                  │
│  🎉 Vos données sont maintenant dans            │
│     ProcureGenius et prêtes à utiliser!         │
│                                                  │
│  [Voir les fournisseurs] [Voir les produits]   │
│  [Télécharger rapport détaillé PDF]            │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Effort:** 3 semaines (réutilise OAuth du plan complet)

---

#### ✅ 3. Détection Intelligente de Doublons

**Problème:** Client peut avoir données partielles déjà dans ProcureGenius

**Solution:**

```python
class DuplicateDetector:
    """
    Détecte les doublons avant import
    """

    def find_duplicate_supplier(self, name, email=None, phone=None):
        """
        Trouve fournisseur existant basé sur:
        1. Email exact match (priorité haute)
        2. Nom similaire (fuzzy matching)
        3. Téléphone exact match
        """
        # Email exact
        if email:
            existing = Supplier.objects.filter(email__iexact=email).first()
            if existing:
                return existing, 'email_match'

        # Nom similaire (Levenshtein distance)
        from fuzzywuzzy import fuzz
        all_suppliers = Supplier.objects.all()

        for supplier in all_suppliers:
            similarity = fuzz.ratio(name.lower(), supplier.name.lower())
            if similarity > 90:  # 90% similaire
                return supplier, 'name_fuzzy_match'

        # Phone exact
        if phone:
            clean_phone = self._clean_phone(phone)
            existing = Supplier.objects.filter(phone__contains=clean_phone).first()
            if existing:
                return existing, 'phone_match'

        return None, None

    def _clean_phone(self, phone):
        """Nettoie numéro téléphone (garde que digits)"""
        return ''.join(filter(str.isdigit, phone))
```

**Options pour l'utilisateur:**
```
Doublon détecté: "Acme Corporation" existe déjà

○ Ignorer (ne pas importer)
○ Créer nouveau quand même
○ Mettre à jour l'existant avec nouvelles données
○ Fusionner (garder meilleur de chaque)
```

**Effort:** 1 semaine

---

#### ✅ 4. Assistant IA pour Mapping

**Utiliser Mistral IA pour mapper automatiquement les colonnes:**

```python
def ai_detect_column_mapping(csv_headers):
    """
    IA détecte automatiquement le mapping des colonnes CSV
    """
    prompt = f"""
    J'ai un fichier CSV avec ces colonnes:
    {csv_headers}

    Mappe ces colonnes vers les champs d'un fournisseur:
    - name (nom du fournisseur)
    - email
    - phone
    - address
    - city
    - province
    - contact_person

    Retourne JSON avec mapping.
    Si une colonne n'a pas de correspondance, mets null.

    Exemple:
    CSV: ["Supplier Name", "Email Address", "Contact", "Tel"]
    JSON: {{
      "Supplier Name": "name",
      "Email Address": "email",
      "Contact": "contact_person",
      "Tel": "phone"
    }}
    """

    # Appel Mistral IA
    response = mistral_client.chat(messages=[{"role": "user", "content": prompt}])
    mapping = json.loads(response.choices[0].message.content)

    return mapping
```

**Interface:**
```
┌─────────────────────────────────────────────────┐
│  🤖 MAPPING AUTOMATIQUE (IA)                    │
├─────────────────────────────────────────────────┤
│                                                  │
│  L'IA a détecté ces correspondances:            │
│                                                  │
│  "Vendor Name"      →  Nom fournisseur ✓       │
│  "Email Address"    →  Email ✓                 │
│  "Phone Number"     →  Téléphone ✓             │
│  "Contact Person"   →  Personne contact ✓      │
│  "Vendor ID"        →  (Ignoré)                │
│                                                  │
│  Tout est correct? [Oui] [Modifier manuellement]│
│                                                  │
└─────────────────────────────────────────────────┘
```

**Effort:** 1 semaine

---

### Phase 2 (Optionnel) - 3-4 semaines

#### ✅ 5. Import Sage Intacct
- Même logique que QuickBooks
- OAuth + Import one-time

#### ✅ 6. Import NetSuite
- SOAP API
- Import one-time

#### ✅ 7. Templates d'Export pour autres ERP
- Fournir templates CSV pour:
  - Microsoft Dynamics
  - SAP Business One
  - Odoo
  - Etc.

---

## 🔧 IMPLÉMENTATION TECHNIQUE

### Service Principal

```python
# apps/data_migration/services/migration_service.py

class MigrationService:
    """
    Service orchestration import données
    """

    def __init__(self, migration_job):
        self.job = migration_job
        self.importer = self._get_importer()

    def _get_importer(self):
        """Retourne l'importer approprié"""
        if self.job.source_type == 'quickbooks':
            from ..importers.quickbooks_importer import QuickBooksImporter
            return QuickBooksImporter(self.job)
        elif self.job.source_type == 'excel':
            from ..importers.excel_importer import ExcelImporter
            return ExcelImporter(self.job)
        # ... autres

    def start_import(self):
        """Lance l'import"""
        self.job.status = 'importing'
        self.job.started_at = timezone.now()
        self.job.save()

        try:
            # Import fournisseurs
            if self.job.import_suppliers:
                self._import_suppliers()

            # Import produits
            if self.job.import_products:
                self._import_products()

            # Import historique (optionnel)
            if self.job.import_purchase_orders:
                self._import_purchase_orders()

            if self.job.import_invoices:
                self._import_invoices()

            # Terminé
            self.job.status = 'completed'
            self.job.completed_at = timezone.now()
            self.job.save()

            # Notification email
            self._send_completion_email()

        except Exception as e:
            self.job.status = 'failed'
            self.job.error_details.append({'error': str(e)})
            self.job.save()
            raise

    def _import_suppliers(self):
        """Importe les fournisseurs"""
        suppliers_data = self.importer.get_suppliers()

        stats = {'total': 0, 'imported': 0, 'skipped': 0, 'errors': 0}

        for supplier_data in suppliers_data:
            stats['total'] += 1

            try:
                # Détection doublon
                duplicate, match_type = DuplicateDetector().find_duplicate_supplier(
                    name=supplier_data.get('name'),
                    email=supplier_data.get('email'),
                    phone=supplier_data.get('phone'),
                )

                if duplicate:
                    # Log skip
                    ImportLog.objects.create(
                        migration_job=self.job,
                        record_type='supplier',
                        status='skipped',
                        source_id=supplier_data.get('id'),
                        source_data=supplier_data,
                        error_message=f"Duplicate found (match: {match_type}): {duplicate.name}",
                    )
                    stats['skipped'] += 1
                    continue

                # Créer supplier
                supplier = Supplier.objects.create(
                    name=supplier_data['name'],
                    email=supplier_data.get('email', ''),
                    phone=supplier_data.get('phone', ''),
                    address=supplier_data.get('address', ''),
                    city=supplier_data.get('city', ''),
                    province=supplier_data.get('province', ''),
                    contact_person=supplier_data.get('contact_person', ''),
                    # ... autres champs
                )

                # Log success
                ImportLog.objects.create(
                    migration_job=self.job,
                    record_type='supplier',
                    status='imported',
                    source_id=supplier_data.get('id'),
                    source_data=supplier_data,
                    created_object_id=supplier.id,
                )
                stats['imported'] += 1

            except Exception as e:
                # Log error
                ImportLog.objects.create(
                    migration_job=self.job,
                    record_type='supplier',
                    status='error',
                    source_id=supplier_data.get('id'),
                    source_data=supplier_data,
                    error_message=str(e),
                )
                stats['errors'] += 1

        # Update summary
        self.job.import_summary['suppliers'] = stats
        self.job.imported_records += stats['imported']
        self.job.skipped_records += stats['skipped']
        self.job.error_records += stats['errors']
        self.job.save()
```

---

### Importer Excel/CSV

```python
# apps/data_migration/importers/excel_importer.py

import pandas as pd
from .base import BaseImporter

class ExcelImporter(BaseImporter):
    """
    Importer pour fichiers Excel/CSV
    """

    def __init__(self, migration_job):
        super().__init__(migration_job)
        self.df = None
        self.column_mapping = {}

    def load_file(self, file_path):
        """Charge le fichier Excel/CSV"""
        if file_path.endswith('.csv'):
            self.df = pd.read_csv(file_path)
        else:
            self.df = pd.read_excel(file_path)

    def detect_mapping(self):
        """Détecte automatiquement le mapping des colonnes via IA"""
        from ..services.ai_mapping_service import AIMappingService

        headers = self.df.columns.tolist()
        self.column_mapping = AIMappingService().detect_mapping(headers, 'supplier')

        return self.column_mapping

    def get_suppliers(self):
        """Retourne liste des fournisseurs du fichier"""
        suppliers = []

        for index, row in self.df.iterrows():
            supplier_data = {}

            # Map colonnes selon mapping
            for csv_col, pg_field in self.column_mapping.items():
                if pg_field and csv_col in row:
                    value = row[csv_col]
                    # Clean value (NaN → None)
                    if pd.isna(value):
                        value = None
                    supplier_data[pg_field] = value

            # Ajout ID source (numéro ligne)
            supplier_data['id'] = f"row_{index}"

            suppliers.append(supplier_data)

        return suppliers
```

---

### Tâche Celery (Import Async)

```python
# apps/data_migration/tasks.py

from celery import shared_task
from .services.migration_service import MigrationService

@shared_task
def run_migration_import(migration_job_id):
    """
    Tâche Celery pour import asynchrone
    """
    try:
        migration_job = MigrationJob.objects.get(id=migration_job_id)
        service = MigrationService(migration_job)
        service.start_import()

        return {'status': 'success', 'job_id': str(migration_job_id)}

    except Exception as e:
        logger.error(f"Migration import failed: {str(e)}")
        return {'status': 'error', 'error': str(e)}
```

---

## 🎯 ESTIMATION EFFORT (VERSION SIMPLIFIÉE)

### Phase 1 - MVP (Import Excel/CSV + QuickBooks)

**Semaine 1-2: Infrastructure**
- [ ] Modèles MigrationJob + ImportLog
- [ ] Interface upload fichier
- [ ] Service base MigrationService

**Semaine 3-4: Excel/CSV Importer**
- [ ] Parsing Excel/CSV (pandas)
- [ ] Mapping colonnes (IA)
- [ ] Détection doublons
- [ ] Import fournisseurs + produits

**Semaine 5-6: QuickBooks Importer**
- [ ] OAuth QuickBooks
- [ ] Fetch Vendors + Items
- [ ] Import one-time
- [ ] UI sélection données

**Semaine 7: Finitions**
- [ ] Dashboard migration
- [ ] Rapports PDF
- [ ] Notifications email
- [ ] Tests

**TOTAL Phase 1:** **7 semaines (~1.5 mois)** avec **1-2 développeurs**

### Phase 2 - Extensions (Optionnel)

**+2 semaines:** Sage Intacct
**+2 semaines:** NetSuite
**+1 semaine:** Templates additionnels

---

## 💰 COMPARAISON: COMPLET vs SIMPLIFIÉ

| Aspect | **Plan Complet (Sync)** | **Plan Simplifié (Import)** |
|--------|------------------------|---------------------------|
| **Objectif** | Sync bi-directionnelle continue | Import initial one-time |
| **Complexité** | 🔴🔴🔴 Très élevée | 🟢 Faible |
| **Temps dev** | 8-9 mois | **1.5-2 mois** ✅ |
| **Développeurs** | 2 full-time | 1-2 |
| **Modèles** | 4 complexes | 2 simples |
| **Maintenance** | Élevée (webhooks, tokens, sync errors) | **Minimale** ✅ |
| **Use case** | Client veut garder 2 systèmes | **Client migre vers ProcureGenius** ✅ |
| **ROI client** | Gain de temps continu | **Adoption rapide** ✅ |

---

## ✅ AVANTAGES VERSION SIMPLIFIÉE

1. **Rapide à développer:** 1.5 mois vs 8-9 mois
2. **Moins de bugs:** Import one-time = pas de sync errors récurrents
3. **Meilleur pour votre modèle:** Client quitte ancien système = **lock-in ProcureGenius**
4. **Support universel:** Tout ERP peut exporter CSV
5. **Onboarding ultra-rapide:** "Importez vos 500 fournisseurs en 5 minutes"
6. **Moins de maintenance:** Pas de webhooks, refresh tokens, etc.

---

## 🚀 RECOMMANDATION FINALE

**COMMENCEZ PAR CETTE VERSION SIMPLIFIÉE!**

**Pourquoi:**
- ✅ Rapide (1.5 mois vs 8 mois)
- ✅ Couvre 80% des besoins migration
- ✅ Facilite adoption (argument massif: "Migrez en 1 jour!")
- ✅ Moins risqué

**Puis PLUS TARD (si demandé):**
- Si vraiment des clients veulent sync continue → Implémenter sync partielle (ex: juste fournisseurs)
- Mais **90% des clients préféreront migrer complètement** vers ProcureGenius!

---

## 📋 PROCHAINES ÉTAPES

**Semaine 1-2:**
- [ ] Valider approche simplifiée
- [ ] Créer modèles MigrationJob + ImportLog
- [ ] Setup Celery pour import async
- [ ] Interface upload CSV

**Semaine 3-4:**
- [ ] Importer Excel/CSV complet
- [ ] IA mapping colonnes (Mistral)
- [ ] Détection doublons
- [ ] Tests avec vrais fichiers clients

**Semaine 5-6:**
- [ ] OAuth QuickBooks
- [ ] Import QuickBooks Vendors/Items
- [ ] UI sélection + preview

**Semaine 7:**
- [ ] Dashboard migration
- [ ] Email notifications
- [ ] Documentation utilisateur
- [ ] Tests end-to-end

**DÉPLOIEMENT:** Fin mois 2 🚀

---

## 🎉 CONCLUSION

**CETTE APPROCHE EST BEAUCOUP PLUS INTELLIGENTE!**

**Au lieu de:**
- 8 mois de dev complexe
- Maintenance continue difficile
- Client garde 2 systèmes

**Tu as:**
- 1.5 mois de dev simple
- Maintenance minimale
- **Client migre COMPLÈTEMENT vers ProcureGenius** = Lock-in!

**Argument marketing killer:**
> **"Passez à ProcureGenius en 1 journée!**
> Importez vos 500 fournisseurs et 1000 produits depuis QuickBooks/Excel en 5 minutes.
> Zéro double saisie. Zéro migration complexe."

**C'est ça?** 🎯
