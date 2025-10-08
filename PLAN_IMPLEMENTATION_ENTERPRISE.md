# 🚀 PLAN D'IMPLÉMENTATION ENTERPRISE - ProcureGenius

**Date:** 2025-10-07
**Version:** 1.0
**Objectif:** Rendre ProcureGenius prêt pour le marché Enterprise (500+ employés)

---

## 📋 TABLE DES MATIÈRES

1. [E-Sourcing (RFI/RFP/RFQ/Enchères)](#1-e-sourcing)
2. [Contract Lifecycle Management (CLM)](#2-contract-lifecycle-management-clm)
3. [Intégrations ERP Natives](#3-intégrations-erp-natives)
4. [Planning & Estimation](#4-planning--estimation)

---

# 1. E-SOURCING (RFI/RFP/RFQ/ENCHÈRES)

## 🎯 OBJECTIF
Permettre aux entreprises de lancer des appels d'offres formels, comparer automatiquement les propositions de fournisseurs, et gérer des enchères inversées pour obtenir les meilleurs prix.

## 📊 ARCHITECTURE PROPOSÉE

### Nouvelle App Django: `apps/e_sourcing/`

```
apps/e_sourcing/
├── models.py              # Modèles de données
├── views.py               # Vues API et web
├── serializers.py         # Serializers DRF
├── admin.py               # Interface admin
├── urls.py                # Routes
├── services/
│   ├── rfq_service.py     # Logique RFQ
│   ├── rfp_service.py     # Logique RFP
│   ├── rfi_service.py     # Logique RFI
│   ├── auction_service.py # Logique enchères
│   └── evaluation_service.py # Évaluation automatique
├── tasks.py               # Tâches Celery (emails, notifications)
└── utils.py               # Utilitaires
```

---

## 📦 MODÈLES DE DONNÉES

### 1. **SourcingEvent** (Événement de Sourcing)

**Description:** Conteneur principal pour tout événement de sourcing (RFI/RFP/RFQ/Enchère)

```python
class SourcingEvent(models.Model):
    EVENT_TYPES = [
        ('rfi', 'Request for Information'),       # Demande d'informations
        ('rfp', 'Request for Proposal'),          # Demande de proposition
        ('rfq', 'Request for Quotation'),         # Demande de cotation
        ('reverse_auction', 'Reverse Auction'),   # Enchère inversée
    ]

    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('published', 'Publié'),
        ('in_progress', 'En cours'),
        ('evaluation', 'En évaluation'),
        ('awarded', 'Attribué'),
        ('closed', 'Fermé'),
        ('cancelled', 'Annulé'),
    ]

    # Identifiants
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    event_number = models.CharField(max_length=50, unique=True)  # Auto: RFQ202501-0001
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    title = models.CharField(max_length=300)
    description = models.TextField()

    # Status et workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    # Dates clés
    created_at = models.DateTimeField(auto_now_add=True)
    published_at = models.DateTimeField(null=True, blank=True)
    submission_deadline = models.DateTimeField()  # Date limite soumission
    question_deadline = models.DateTimeField(null=True, blank=True)  # Date limite questions
    evaluation_deadline = models.DateTimeField(null=True, blank=True)
    award_date = models.DateTimeField(null=True, blank=True)

    # Relations
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='sourcing_events')
    category = models.ForeignKey('suppliers.SupplierCategory', on_delete=models.SET_NULL, null=True, blank=True)
    invited_suppliers = models.ManyToManyField('suppliers.Supplier', blank=True, related_name='invited_to_events')

    # Configuration
    is_public = models.BooleanField(default=False)  # Visible à tous les fournisseurs?
    allow_questions = models.BooleanField(default=True)
    auto_publish_responses = models.BooleanField(default=False)  # Publier réponses automatiquement?

    # Critères d'évaluation (JSON)
    evaluation_criteria = models.JSONField(default=dict, blank=True)
    # Exemple: {"price": 40, "quality": 30, "delivery": 20, "support": 10}

    # Documents attachés
    # Géré par modèle SourcingDocument séparé

    # Métadonnées
    estimated_budget = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default='CAD')

    # Résultats
    winning_bid = models.ForeignKey('SupplierBid', on_delete=models.SET_NULL, null=True, blank=True, related_name='won_event')
    total_bids_received = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.event_number} - {self.title}"

    def generate_event_number(self):
        """Génère numéro unique: RFQ202501-0001"""
        from datetime import datetime
        prefix_map = {
            'rfi': 'RFI',
            'rfp': 'RFP',
            'rfq': 'RFQ',
            'reverse_auction': 'AUC',
        }
        prefix = prefix_map.get(self.event_type, 'EVT')
        year_month = datetime.now().strftime('%Y%m')

        last_event = SourcingEvent.objects.filter(
            event_number__startswith=f"{prefix}{year_month}"
        ).order_by('-event_number').first()

        if last_event:
            last_num = int(last_event.event_number[-4:])
            next_num = last_num + 1
        else:
            next_num = 1

        return f"{prefix}{year_month}-{next_num:04d}"

    def publish(self):
        """Publie l'événement et envoie invitations"""
        self.status = 'published'
        self.published_at = timezone.now()
        self.save()

        # Tâche Celery: Envoyer emails aux fournisseurs invités
        from .tasks import send_sourcing_invitations
        send_sourcing_invitations.delay(self.id)

    def close_event(self):
        """Ferme l'événement après la date limite"""
        self.status = 'evaluation'
        self.save()

        # Tâche Celery: Notifier créateur
        from .tasks import notify_event_closed
        notify_event_closed.delay(self.id)
```

---

### 2. **SourcingItem** (Articles/Lignes de l'événement)

**Description:** Articles individuels pour lesquels on demande des soumissions

```python
class SourcingItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    sourcing_event = models.ForeignKey(SourcingEvent, on_delete=models.CASCADE, related_name='items')

    # Informations produit/service
    line_number = models.IntegerField()  # Numéro de ligne
    title = models.CharField(max_length=300)
    description = models.TextField()
    specifications = models.TextField(blank=True)

    # Quantité et unités
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_of_measure = models.CharField(max_length=50, default='unité')

    # Estimations
    estimated_unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    estimated_total = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)

    # Produit existant (optionnel)
    product = models.ForeignKey('invoicing.Product', on_delete=models.SET_NULL, null=True, blank=True)

    # Dates
    delivery_deadline = models.DateField(null=True, blank=True)

    # Métadonnées
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['line_number']
        unique_together = ['sourcing_event', 'line_number']

    def __str__(self):
        return f"{self.line_number}. {self.title}"
```

---

### 3. **SupplierBid** (Soumission fournisseur)

**Description:** Proposition/offre soumise par un fournisseur

```python
class SupplierBid(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('submitted', 'Soumise'),
        ('under_review', 'En révision'),
        ('accepted', 'Acceptée'),
        ('rejected', 'Rejetée'),
        ('withdrawn', 'Retirée'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    sourcing_event = models.ForeignKey(SourcingEvent, on_delete=models.CASCADE, related_name='bids')
    supplier = models.ForeignKey('suppliers.Supplier', on_delete=models.CASCADE, related_name='bids')

    # Informations soumission
    bid_number = models.CharField(max_length=50, unique=True)  # Auto: BID202501-0001
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    # Dates
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Montants totaux
    total_bid_amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, default='CAD')

    # Conditions
    delivery_terms = models.TextField(blank=True)
    payment_terms = models.TextField(blank=True)
    warranty_terms = models.TextField(blank=True)
    validity_period_days = models.IntegerField(default=30)  # Validité de l'offre

    # Évaluation
    evaluation_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    evaluation_notes = models.TextField(blank=True)
    evaluated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    # Commentaires
    supplier_notes = models.TextField(blank=True)  # Notes du fournisseur
    internal_notes = models.TextField(blank=True)  # Notes internes (non visibles fournisseur)

    # Rang
    rank = models.IntegerField(null=True, blank=True)  # Rang après évaluation
    is_winner = models.BooleanField(default=False)

    class Meta:
        ordering = ['rank', '-evaluation_score', 'submitted_at']
        unique_together = ['sourcing_event', 'supplier']

    def __str__(self):
        return f"{self.bid_number} - {self.supplier.name}"

    def submit_bid(self):
        """Soumet la soumission"""
        self.status = 'submitted'
        self.submitted_at = timezone.now()
        self.save()

        # Incrémenter compteur de l'événement
        self.sourcing_event.total_bids_received = self.sourcing_event.bids.filter(status='submitted').count()
        self.sourcing_event.save()

        # Notifier créateur
        from .tasks import notify_bid_received
        notify_bid_received.delay(self.id)

    def calculate_evaluation_score(self):
        """Calcule le score d'évaluation basé sur critères"""
        criteria = self.sourcing_event.evaluation_criteria
        if not criteria:
            return None

        score = 0
        # Exemple simplifié - à personnaliser selon critères
        if 'price' in criteria:
            # Logique score prix (meilleur prix = meilleur score)
            price_weight = criteria['price']
            # ... calcul complexe

        # Ajouter autres critères (qualité, délai, etc.)

        self.evaluation_score = score
        self.save()
        return score
```

---

### 4. **BidLineItem** (Lignes de soumission)

**Description:** Prix et détails pour chaque item du sourcing event

```python
class BidLineItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    supplier_bid = models.ForeignKey(SupplierBid, on_delete=models.CASCADE, related_name='line_items')
    sourcing_item = models.ForeignKey(SourcingItem, on_delete=models.CASCADE, related_name='bid_items')

    # Prix proposés
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)  # Peut différer de la demande
    total_price = models.DecimalField(max_digits=14, decimal_places=2)

    # Détails
    brand_offered = models.CharField(max_length=200, blank=True)
    model_number = models.CharField(max_length=100, blank=True)
    delivery_days = models.IntegerField(null=True, blank=True)  # Délai de livraison proposé

    # Alternates/Options
    is_alternate = models.BooleanField(default=False)  # Proposition alternative?
    alternate_description = models.TextField(blank=True)

    # Notes
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['sourcing_item__line_number']
        unique_together = ['supplier_bid', 'sourcing_item', 'is_alternate']

    def save(self, *args, **kwargs):
        self.total_price = self.unit_price * self.quantity
        super().save(*args, **kwargs)

        # Recalculer total de la soumission
        self.supplier_bid.total_bid_amount = sum(
            item.total_price for item in self.supplier_bid.line_items.filter(is_alternate=False)
        )
        self.supplier_bid.save()
```

---

### 5. **SourcingQuestion** (Questions fournisseurs)

**Description:** Questions posées par fournisseurs durant l'événement

```python
class SourcingQuestion(models.Model):
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('answered', 'Répondue'),
        ('rejected', 'Rejetée'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    sourcing_event = models.ForeignKey(SourcingEvent, on_delete=models.CASCADE, related_name='questions')

    # Question
    asked_by_supplier = models.ForeignKey('suppliers.Supplier', on_delete=models.CASCADE, related_name='sourcing_questions')
    question_text = models.TextField()
    asked_at = models.DateTimeField(auto_now_add=True)

    # Réponse
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    answer_text = models.TextField(blank=True)
    answered_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    answered_at = models.DateTimeField(null=True, blank=True)

    # Visibilité
    is_public = models.BooleanField(default=True)  # Réponse visible à tous les fournisseurs?

    class Meta:
        ordering = ['asked_at']

    def __str__(self):
        return f"Q: {self.question_text[:50]}..."
```

---

### 6. **ReverseAuction** (Enchère Inversée)

**Description:** Configuration spécifique pour enchères inversées

```python
class ReverseAuction(models.Model):
    AUCTION_STATUS = [
        ('scheduled', 'Planifiée'),
        ('live', 'En cours'),
        ('paused', 'En pause'),
        ('ended', 'Terminée'),
        ('cancelled', 'Annulée'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    sourcing_event = models.OneToOneField(SourcingEvent, on_delete=models.CASCADE, related_name='auction')

    # Configuration enchère
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=AUCTION_STATUS, default='scheduled')

    # Prix de départ
    starting_price = models.DecimalField(max_digits=14, decimal_places=2)
    reserve_price = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)  # Prix plancher

    # Règles
    minimum_bid_decrement = models.DecimalField(max_digits=10, decimal_places=2)  # Incrément minimum de baisse
    overtime_period_minutes = models.IntegerField(default=5)  # Extension si offre dernière minute
    max_overtime_extensions = models.IntegerField(default=3)

    # État actuel
    current_best_price = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    current_leader = models.ForeignKey('suppliers.Supplier', on_delete=models.SET_NULL, null=True, blank=True)
    total_bids_placed = models.IntegerField(default=0)

    # Résultats
    winning_price = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    winning_supplier = models.ForeignKey('suppliers.Supplier', on_delete=models.SET_NULL, null=True, blank=True, related_name='won_auctions')

    class Meta:
        ordering = ['-start_time']

    def start_auction(self):
        """Démarre l'enchère"""
        self.status = 'live'
        self.current_best_price = self.starting_price
        self.save()

        # Notifier participants
        from .tasks import notify_auction_started
        notify_auction_started.delay(self.id)

    def end_auction(self):
        """Termine l'enchère"""
        self.status = 'ended'
        self.winning_price = self.current_best_price
        self.winning_supplier = self.current_leader
        self.save()

        # Marquer l'événement comme attribué
        if self.winning_supplier:
            self.sourcing_event.status = 'awarded'
            self.sourcing_event.save()
```

---

### 7. **AuctionBid** (Offre d'enchère)

**Description:** Offres individuelles durant enchère inversée

```python
class AuctionBid(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    auction = models.ForeignKey(ReverseAuction, on_delete=models.CASCADE, related_name='auction_bids')
    supplier = models.ForeignKey('suppliers.Supplier', on_delete=models.CASCADE)

    # Offre
    bid_amount = models.DecimalField(max_digits=14, decimal_places=2)
    bid_time = models.DateTimeField(auto_now_add=True)

    # État
    is_current_leader = models.BooleanField(default=False)
    was_outbid = models.BooleanField(default=False)

    class Meta:
        ordering = ['bid_amount', 'bid_time']  # Prix le plus bas en premier

    def save(self, *args, **kwargs):
        # Vérifier si meilleure offre
        if self.auction.status == 'live':
            if not self.auction.current_best_price or self.bid_amount < self.auction.current_best_price:
                # Nouvelle meilleure offre
                self.is_current_leader = True

                # Marquer ancien leader comme outbid
                old_leader_bids = self.auction.auction_bids.filter(is_current_leader=True).exclude(id=self.id)
                old_leader_bids.update(is_current_leader=False, was_outbid=True)

                # Mettre à jour enchère
                self.auction.current_best_price = self.bid_amount
                self.auction.current_leader = self.supplier
                self.auction.total_bids_placed += 1
                self.auction.save()

                # Notifier ancien leader
                # ...

        super().save(*args, **kwargs)
```

---

### 8. **SourcingDocument** (Documents attachés)

**Description:** Documents liés à l'événement de sourcing

```python
class SourcingDocument(models.Model):
    DOCUMENT_TYPES = [
        ('specification', 'Spécifications techniques'),
        ('terms', 'Termes et conditions'),
        ('template', 'Template de réponse'),
        ('addendum', 'Addendum'),
        ('other', 'Autre'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    sourcing_event = models.ForeignKey(SourcingEvent, on_delete=models.CASCADE, related_name='documents')

    # Document
    title = models.CharField(max_length=200)
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES)
    file = models.FileField(upload_to='sourcing_documents/%Y/%m/')
    file_size = models.IntegerField()  # Bytes

    # Métadonnées
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True)

    # Visibilité
    is_public = models.BooleanField(default=True)  # Visible aux fournisseurs?

    class Meta:
        ordering = ['-uploaded_at']
```

---

### 9. **BidEvaluation** (Évaluation détaillée)

**Description:** Évaluation formelle de chaque soumission selon critères

```python
class BidEvaluation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    supplier_bid = models.ForeignKey(SupplierBid, on_delete=models.CASCADE, related_name='evaluations')

    # Évaluateur
    evaluator = models.ForeignKey(User, on_delete=models.CASCADE)
    evaluated_at = models.DateTimeField(auto_now_add=True)

    # Scores par critère (JSON)
    criteria_scores = models.JSONField(default=dict)
    # Exemple: {"price": 38, "quality": 28, "delivery": 18, "support": 9}

    # Score total
    total_score = models.DecimalField(max_digits=5, decimal_places=2)

    # Commentaires
    strengths = models.TextField(blank=True)
    weaknesses = models.TextField(blank=True)
    recommendations = models.TextField(blank=True)

    # Recommandation
    is_recommended = models.BooleanField(default=False)

    class Meta:
        ordering = ['-total_score']
        unique_together = ['supplier_bid', 'evaluator']
```

---

## 🎨 FONCTIONNALITÉS PRINCIPALES

### Phase 1 (MVP) - 3-4 mois

#### ✅ 1. Gestion RFQ (Request for Quotation)
**Fonctionnalités:**
- Créer RFQ avec items multiples
- Inviter fournisseurs sélectionnés
- Fournisseurs soumettent prix ligne par ligne
- Comparaison automatique des prix
- Tableau comparatif visuel
- Export Excel des soumissions
- Génération automatique BC depuis RFQ gagnante

**Valeur:** Économies **10-25%** sur achats récurrents

#### ✅ 2. Enchères Inversées (Reverse Auction)
**Fonctionnalités:**
- Configuration enchère (date/heure, prix départ, règles)
- Interface temps réel pour fournisseurs
- Notifications push quand outbid
- Extension automatique si offres dernière minute
- Attribution automatique au gagnant
- Historique des offres

**Valeur:** **Gain de temps 90%** vs négociations manuelles

#### ✅ 3. Comparaison Automatique Offres
**Fonctionnalités:**
- Tableau de comparaison multi-critères
- Scoring automatique (prix, délai, qualité)
- Normalisation des offres (même unités, même quantités)
- Filtrage et tri dynamiques
- Visualisations graphiques (radar chart, bar chart)
- **IA Mistral:** Recommandation fournisseur optimal

**Valeur:** **100% plus rapide** évaluation vs manuel

#### ✅ 4. Évaluation Multi-Critères
**Fonctionnalités:**
- Définir critères personnalisés (prix 40%, qualité 30%, etc.)
- Scoring automatique par critère
- Évaluations collaboratives (plusieurs évaluateurs)
- Matrice de décision
- Rapport d'évaluation PDF

**Valeur:** Décisions objectives et traçables

#### ✅ 5. Portail Fournisseurs
**Fonctionnalités:**
- Vue dédiée pour fournisseurs invités
- Téléchargement documents (specs, termes)
- Soumission en ligne
- Poser questions (Q&A visible à tous)
- Statut soumission en temps réel
- Historique participations

**Valeur:** Réduction emails/appels de **50%**

### Phase 2 (Avancé) - 2-3 mois additionnels

#### ✅ 6. RFP (Request for Proposal) Complet
**Fonctionnalités:**
- Templates RFP configurables
- Sections narratives (expérience, approche, équipe)
- Upload documents fournisseurs (certifications, références)
- Grille évaluation qualitative
- Notation pondérée complexe

#### ✅ 7. RFI (Request for Information)
**Fonctionnalités:**
- Questionnaires personnalisables
- Collecte informations fournisseurs
- Analyse comparative
- Pré-qualification automatique

#### ✅ 8. Multi-Format Auctions
**Fonctionnalités:**
- Japanese reverse auction (baisse par palliers)
- Sealed bid auction (offres cachées)
- Multi-round bidding

---

## 🔗 INTÉGRATION AVEC EXISTANT

### Avec Purchase Orders
```python
# Créer BC automatiquement depuis soumission gagnante
def create_po_from_bid(supplier_bid):
    po = PurchaseOrder.objects.create(
        supplier=supplier_bid.supplier,
        title=supplier_bid.sourcing_event.title,
        created_by=supplier_bid.sourcing_event.created_by,
        # ...
    )

    # Créer items depuis bid line items
    for bid_item in supplier_bid.line_items.filter(is_alternate=False):
        PurchaseOrderItem.objects.create(
            purchase_order=po,
            product_reference=bid_item.sourcing_item.title,
            description=bid_item.sourcing_item.description,
            quantity=bid_item.quantity,
            unit_price=bid_item.unit_price,
            # ...
        )

    return po
```

### Avec Assistant IA Mistral
```python
# Assistant suggère fournisseurs pour invitation
def ai_suggest_suppliers_for_event(sourcing_event):
    prompt = f"""
    Événement: {sourcing_event.title}
    Catégorie: {sourcing_event.category.name if sourcing_event.category else 'N/A'}
    Budget: {sourcing_event.estimated_budget} CAD
    Items: {sourcing_event.items.count()} lignes

    Suggère 5 fournisseurs optimaux pour cet événement basé sur:
    - Performance historique (rating)
    - Expérience catégorie
    - Localisation (préférer locaux)
    - Critères diversité
    """

    # Appel Mistral IA
    # Retourne liste fournisseurs avec justifications
```

### Avec Analytics
```python
# Tracking économies réalisées via e-sourcing
class SourcingSavings(models.Model):
    sourcing_event = models.OneToOneField(SourcingEvent, on_delete=models.CASCADE)
    estimated_price = models.DecimalField(max_digits=14, decimal_places=2)
    actual_price = models.DecimalField(max_digits=14, decimal_places=2)
    savings_amount = models.DecimalField(max_digits=14, decimal_places=2)
    savings_percent = models.DecimalField(max_digits=5, decimal_places=2)
```

---

## 🎯 ESTIMATION EFFORT

**Phase 1 (MVP - RFQ + Reverse Auction):**
- **Modèles & Migrations:** 1 semaine
- **API Backend (DRF):** 2-3 semaines
- **Interface Admin Django:** 1 semaine
- **Frontend (créer événements):** 2 semaines
- **Portail Fournisseurs:** 2 semaines
- **Enchères temps réel (WebSockets):** 2 semaines
- **Tests & Debug:** 1-2 semaines
- **Documentation:** 1 semaine

**TOTAL Phase 1:** 12-14 semaines (3-3.5 mois) avec **2-3 développeurs**

**Phase 2 (RFP/RFI):**
- **Modèles additionnels:** 1 semaine
- **Interfaces RFP/RFI:** 3 semaines
- **Tests:** 1 semaine

**TOTAL Phase 2:** 5 semaines (1.25 mois)

**TOTAL COMPLET:** **4-5 mois** avec équipe de 2-3 développeurs

---

# 2. CONTRACT LIFECYCLE MANAGEMENT (CLM)

## 🎯 OBJECTIF
Gérer le cycle de vie complet des contrats fournisseurs: création, négociation, approbation, signatures électroniques, stockage, alertes renouvellement, et extraction automatique de clauses via IA.

## 📊 ARCHITECTURE PROPOSÉE

### Nouvelle App Django: `apps/contracts/`

```
apps/contracts/
├── models.py              # Modèles de données
├── views.py               # Vues API et web
├── serializers.py         # Serializers DRF
├── admin.py               # Interface admin
├── urls.py                # Routes
├── services/
│   ├── contract_service.py     # Logique contrats
│   ├── signature_service.py    # Signatures électroniques
│   ├── ai_extraction_service.py # Extraction IA clauses
│   └── alert_service.py        # Alertes renouvellement
├── tasks.py               # Tâches Celery
├── templates/
│   └── contract_templates/     # Templates contrats
└── utils.py
```

---

## 📦 MODÈLES DE DONNÉES

### 1. **Contract** (Contrat)

**Description:** Contrat principal avec fournisseur ou client

```python
class Contract(models.Model):
    CONTRACT_TYPES = [
        ('supplier', 'Contrat fournisseur'),
        ('client', 'Contrat client'),
        ('service', 'Contrat de service'),
        ('nda', 'Accord de confidentialité (NDA)'),
        ('msa', 'Master Service Agreement'),
        ('sow', 'Statement of Work'),
        ('other', 'Autre'),
    ]

    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('in_negotiation', 'En négociation'),
        ('pending_approval', 'En attente d\'approbation'),
        ('pending_signature', 'En attente de signature'),
        ('active', 'Actif'),
        ('expired', 'Expiré'),
        ('terminated', 'Résilié'),
        ('renewed', 'Renouvelé'),
    ]

    # Identifiants
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    contract_number = models.CharField(max_length=50, unique=True)  # Auto: CTR202501-0001
    title = models.CharField(max_length=300)
    contract_type = models.CharField(max_length=20, choices=CONTRACT_TYPES)

    # Parties
    supplier = models.ForeignKey('suppliers.Supplier', on_delete=models.PROTECT, null=True, blank=True, related_name='contracts')
    client = models.ForeignKey('accounts.Client', on_delete=models.PROTECT, null=True, blank=True, related_name='contracts')
    our_entity = models.CharField(max_length=200, blank=True)  # Notre entité légale

    # Statut
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft')

    # Dates
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    effective_date = models.DateField()  # Date d'entrée en vigueur
    expiration_date = models.DateField(null=True, blank=True)
    termination_date = models.DateField(null=True, blank=True)
    auto_renewal = models.BooleanField(default=False)
    renewal_notice_days = models.IntegerField(default=90)  # Préavis renouvellement

    # Valeurs
    contract_value = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default='CAD')
    payment_terms = models.TextField(blank=True)

    # Propriétaire et responsables
    owner = models.ForeignKey(User, on_delete=models.PROTECT, related_name='owned_contracts')
    stakeholders = models.ManyToManyField(User, blank=True, related_name='stakeholder_contracts')

    # Description
    description = models.TextField(blank=True)
    objectives = models.TextField(blank=True)
    scope_of_work = models.TextField(blank=True)

    # Documents
    # Géré par ContractDocument séparé

    # Métadonnées IA (extraction automatique)
    ai_extracted_data = models.JSONField(default=dict, blank=True)
    # Exemple: {"key_clauses": [...], "obligations": [...], "termination_conditions": [...]}
    ai_extraction_date = models.DateTimeField(null=True, blank=True)

    # Relation avec sourcing (optionnel)
    sourcing_event = models.ForeignKey('e_sourcing.SourcingEvent', on_delete=models.SET_NULL, null=True, blank=True, related_name='contracts')

    # Alertes
    alert_expiration_sent = models.BooleanField(default=False)
    alert_renewal_sent = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.contract_number} - {self.title}"

    def generate_contract_number(self):
        """Génère numéro unique: CTR202501-0001"""
        from datetime import datetime
        year_month = datetime.now().strftime('%Y%m')

        last_contract = Contract.objects.filter(
            contract_number__startswith=f"CTR{year_month}"
        ).order_by('-contract_number').first()

        if last_contract:
            last_num = int(last_contract.contract_number[-4:])
            next_num = last_num + 1
        else:
            next_num = 1

        return f"CTR{year_month}-{next_num:04d}"

    @property
    def days_until_expiration(self):
        """Nombre de jours avant expiration"""
        if not self.expiration_date:
            return None
        delta = self.expiration_date - timezone.now().date()
        return delta.days

    @property
    def is_expiring_soon(self):
        """Expire dans moins de 90 jours?"""
        days = self.days_until_expiration
        return days is not None and days <= 90 and days >= 0

    def renew_contract(self, new_expiration_date):
        """Renouvelle le contrat"""
        # Créer nouveau contrat basé sur celui-ci
        new_contract = Contract.objects.create(
            title=f"{self.title} (Renewed)",
            contract_type=self.contract_type,
            supplier=self.supplier,
            client=self.client,
            owner=self.owner,
            effective_date=self.expiration_date,
            expiration_date=new_expiration_date,
            contract_value=self.contract_value,
            currency=self.currency,
            # ...
        )

        # Marquer ancien comme renouvelé
        self.status = 'renewed'
        self.save()

        return new_contract
```

---

### 2. **ContractVersion** (Versions du contrat)

**Description:** Historique des versions pour tracking modifications

```python
class ContractVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='versions')

    # Version
    version_number = models.IntegerField()  # 1, 2, 3...
    version_name = models.CharField(max_length=100, blank=True)  # Ex: "Draft initial", "Révision juridique"

    # Document
    document = models.ForeignKey('ContractDocument', on_delete=models.PROTECT, related_name='as_version')

    # Changements
    change_summary = models.TextField(blank=True)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Statut
    is_current = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=False)

    class Meta:
        ordering = ['-version_number']
        unique_together = ['contract', 'version_number']

    def __str__(self):
        return f"v{self.version_number} - {self.contract.contract_number}"
```

---

### 3. **ContractDocument** (Documents du contrat)

**Description:** Fichiers attachés au contrat

```python
class ContractDocument(models.Model):
    DOCUMENT_TYPES = [
        ('main_contract', 'Contrat principal'),
        ('annex', 'Annexe'),
        ('amendment', 'Amendement'),
        ('exhibit', 'Pièce jointe'),
        ('signed', 'Version signée'),
        ('other', 'Autre'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='documents')

    # Document
    title = models.CharField(max_length=200)
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES)
    file = models.FileField(upload_to='contracts/%Y/%m/')
    file_size = models.IntegerField()  # Bytes
    file_hash = models.CharField(max_length=64, blank=True)  # SHA256 pour vérification

    # Métadonnées
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True)

    # Signature
    is_signed = models.BooleanField(default=False)
    signature_date = models.DateTimeField(null=True, blank=True)

    # Extraction IA
    extracted_text = models.TextField(blank=True)  # Texte extrait (OCR/PDF parsing)
    ai_analysis = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-uploaded_at']

    def extract_text(self):
        """Extrait texte du PDF pour analyse IA"""
        # Utiliser PyPDF2 ou pdfplumber
        # ...

    def analyze_with_ai(self):
        """Analyse document avec Mistral IA"""
        if not self.extracted_text:
            self.extract_text()

        prompt = f"""
        Analyse ce contrat et extrais:
        1. Clauses clés (confidentialité, propriété intellectuelle, garanties)
        2. Obligations des parties
        3. Conditions de résiliation
        4. Pénalités et recours
        5. Dates importantes (renouvellement, révision)

        Contrat:
        {self.extracted_text[:10000]}  # Limiter taille
        """

        # Appel Mistral IA
        # Sauvegarder résultats dans ai_analysis
```

---

### 4. **ContractClause** (Clauses du contrat)

**Description:** Clauses individuelles extraites automatiquement ou manuellement

```python
class ContractClause(models.Model):
    CLAUSE_TYPES = [
        ('payment', 'Paiement'),
        ('delivery', 'Livraison'),
        ('warranty', 'Garantie'),
        ('liability', 'Responsabilité'),
        ('termination', 'Résiliation'),
        ('confidentiality', 'Confidentialité'),
        ('ip_rights', 'Propriété intellectuelle'),
        ('dispute_resolution', 'Résolution conflits'),
        ('force_majeure', 'Force majeure'),
        ('other', 'Autre'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='clauses')

    # Clause
    clause_type = models.CharField(max_length=30, choices=CLAUSE_TYPES)
    title = models.CharField(max_length=200)
    content = models.TextField()

    # Extraction
    extracted_by_ai = models.BooleanField(default=False)
    manually_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    # Métadonnées
    page_number = models.IntegerField(null=True, blank=True)
    clause_number = models.CharField(max_length=20, blank=True)  # Ex: "5.3.2"

    # Criticité
    is_critical = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['clause_number', 'created_at']

    def __str__(self):
        return f"{self.contract.contract_number} - {self.clause_type}"
```

---

### 5. **ContractApproval** (Workflow d'approbation)

**Description:** Approbations nécessaires avant activation du contrat

```python
class ContractApproval(models.Model):
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('approved', 'Approuvé'),
        ('rejected', 'Rejeté'),
        ('cancelled', 'Annulé'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='approvals')

    # Approbateur
    approver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='contract_approvals')
    approval_role = models.CharField(max_length=100, blank=True)  # Ex: "Legal", "Finance", "VP Operations"

    # Statut
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Dates
    requested_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    # Feedback
    comments = models.TextField(blank=True)

    # Ordre
    sequence = models.IntegerField(default=1)  # Ordre d'approbation

    class Meta:
        ordering = ['sequence', 'requested_at']
        unique_together = ['contract', 'approver']

    def approve(self, comments=''):
        """Approuve le contrat"""
        self.status = 'approved'
        self.responded_at = timezone.now()
        self.comments = comments
        self.save()

        # Vérifier si toutes approbations complètes
        all_approvals = self.contract.approvals.all()
        if all_approvals.filter(status='approved').count() == all_approvals.count():
            self.contract.status = 'pending_signature'
            self.contract.save()

    def reject(self, comments=''):
        """Rejette le contrat"""
        self.status = 'rejected'
        self.responded_at = timezone.now()
        self.comments = comments
        self.save()

        # Retourner contrat en brouillon
        self.contract.status = 'draft'
        self.contract.save()
```

---

### 6. **ContractSignature** (Signatures)

**Description:** Signatures électroniques

```python
class ContractSignature(models.Model):
    SIGNATURE_TYPES = [
        ('electronic', 'Signature électronique'),
        ('digital', 'Signature numérique'),
        ('handwritten', 'Signature manuscrite scannée'),
    ]

    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('signed', 'Signé'),
        ('declined', 'Refusé'),
        ('expired', 'Expiré'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='signatures')

    # Signataire
    signer_name = models.CharField(max_length=200)
    signer_email = models.EmailField()
    signer_title = models.CharField(max_length=100, blank=True)  # Ex: "CEO", "Procurement Manager"
    signer_organization = models.CharField(max_length=200, blank=True)

    # Type et statut
    signature_type = models.CharField(max_length=20, choices=SIGNATURE_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Dates
    sent_at = models.DateTimeField(auto_now_add=True)
    signed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    # Signature
    signature_image = models.ImageField(upload_to='signatures/', null=True, blank=True)
    signature_data = models.TextField(blank=True)  # Base64 ou données cryptographiques
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    # Document signé
    signed_document = models.ForeignKey(ContractDocument, on_delete=models.SET_NULL, null=True, blank=True, related_name='signature_of')

    # Vérification
    is_verified = models.BooleanField(default=False)
    verification_hash = models.CharField(max_length=128, blank=True)

    # Ordre
    sequence = models.IntegerField(default=1)

    class Meta:
        ordering = ['sequence', 'sent_at']

    def sign(self, signature_data, ip_address):
        """Enregistre la signature"""
        self.signature_data = signature_data
        self.ip_address = ip_address
        self.signed_at = timezone.now()
        self.status = 'signed'
        self.save()

        # Vérifier si toutes signatures complètes
        all_signatures = self.contract.signatures.all()
        if all_signatures.filter(status='signed').count() == all_signatures.count():
            self.contract.status = 'active'
            self.contract.save()

            # Générer document final signé
            # ...
```

---

### 7. **ContractTemplate** (Templates de contrats)

**Description:** Templates réutilisables

```python
class ContractTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=200)
    contract_type = models.CharField(max_length=20, choices=Contract.CONTRACT_TYPES)
    description = models.TextField(blank=True)

    # Template
    template_file = models.FileField(upload_to='contract_templates/')
    # Supporte variables: {{supplier_name}}, {{contract_value}}, {{effective_date}}

    # Clauses par défaut
    default_clauses = models.JSONField(default=list, blank=True)

    # Métadonnées
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    # Usage
    usage_count = models.IntegerField(default=0)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    def create_contract_from_template(self, **kwargs):
        """Crée contrat depuis template"""
        # Remplacer variables dans template
        # Créer nouveau Contract
        # ...
```

---

### 8. **ContractAlert** (Alertes automatiques)

**Description:** Alertes renouvellement, expiration, etc.

```python
class ContractAlert(models.Model):
    ALERT_TYPES = [
        ('expiration', 'Expiration proche'),
        ('renewal', 'Renouvellement requis'),
        ('milestone', 'Milestone atteint'),
        ('value_exceeded', 'Valeur dépassée'),
        ('compliance', 'Revue conformité'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='alerts')

    # Alerte
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()

    # Dates
    trigger_date = models.DateField()  # Quand déclencher l'alerte
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    # Destinataires
    recipients = models.ManyToManyField(User, related_name='contract_alerts')

    # Statut
    is_sent = models.BooleanField(default=False)
    is_acknowledged = models.BooleanField(default=False)

    class Meta:
        ordering = ['trigger_date']
```

---

## 🎨 FONCTIONNALITÉS PRINCIPALES

### Phase 1 (MVP) - 3-4 mois

#### ✅ 1. Repository Centralisé
**Fonctionnalités:**
- Upload contrats (PDF, Word, etc.)
- Métadonnées structurées (parties, dates, valeur)
- Recherche fulltext et filtres avancés
- Tags et catégories
- Permissions granulaires (qui voit quoi)

**Valeur:** Fin du chaos des emails et dossiers partagés

#### ✅ 2. Templates Contrats
**Fonctionnalités:**
- Bibliothèque templates (NDA, MSA, contrat fournisseur)
- Variables dynamiques ({{supplier_name}}, etc.)
- Clauses standards réutilisables
- Génération PDF depuis template

**Valeur:** **50% plus rapide** création contrats

#### ✅ 3. Workflows Approbation
**Fonctionnalités:**
- Chaîne d'approbation configurable (Legal → Finance → VP)
- Notifications automatiques
- Commentaires et feedback
- Historique complet

**Valeur:** Traçabilité et conformité

#### ✅ 4. Alertes Renouvellement
**Fonctionnalités:**
- Alertes automatiques 90/60/30 jours avant expiration
- Email + notifications in-app
- Dashboard contrats expirant
- Actions rapides (renouveler, prolonger, archiver)

**Valeur:** **Zéro contrat oublié**, renouvellements proactifs

#### ✅ 5. Versioning Complet
**Fonctionnalités:**
- Historique toutes versions
- Comparaison versions (diff visuel)
- Rollback si nécessaire
- Audit trail

**Valeur:** Sécurité et traçabilité

### Phase 1.5 (Extension IA) - 1-2 mois

#### ✅ 6. **Extraction IA Clauses** (DIFFÉRENCIATEUR MAJEUR)
**Fonctionnalités:**
- Upload PDF → Mistral IA extrait automatiquement:
  - Clauses clés (paiement, garantie, résiliation, etc.)
  - Obligations parties
  - Dates importantes
  - Montants et conditions
- Validation manuelle
- Export clauses en base de données structurée

**Valeur:** **80% plus rapide** analyse contrats, risk mitigation

**Exemple Mistral Prompt:**
```python
prompt = f"""
Analyse ce contrat fournisseur et extrais:

1. CLAUSES CLÉS:
   - Paiement (termes, délais)
   - Garanties offertes
   - Conditions résiliation
   - Confidentialité
   - Propriété intellectuelle

2. OBLIGATIONS:
   - Obligations fournisseur
   - Obligations client

3. DATES CRITIQUES:
   - Date effective
   - Date expiration
   - Préavis renouvellement
   - Milestones

4. MONTANTS:
   - Valeur totale
   - Pénalités éventuelles

5. RISQUES:
   - Clauses défavorables
   - Ambiguïtés

Format JSON structuré.

CONTRAT:
{contract_text}
"""
```

#### ✅ 7. **IA Conversationnelle Contrats**
**Fonctionnalités:**
- Questions en langage naturel:
  - "Quelles sont les conditions de résiliation du contrat CTR202501-0012?"
  - "Liste tous les contrats expirant en Q2 2025"
  - "Compare les garanties du contrat A et B"
- Mistral IA répond en analysant contrats

**Valeur:** Accès instantané à l'information contractuelle

### Phase 2 (Avancé) - 2-3 mois

#### ✅ 8. Signatures Électroniques
**Fonctionnalités:**
- Génération document à signer
- Envoi email avec lien signature sécurisé
- Signature électronique (dessin ou upload)
- Certificat de signature (PDF avec hash, IP, date)
- Support multi-signataires séquentiels

**Alternatives:**
- Intégration DocuSign/Adobe Sign (via API)
- Solution native simplifiée

**Valeur:** **100% digital**, pas d'impression/scan

#### ✅ 9. Analyse Conformité
**Fonctionnalités:**
- Vérification clauses obligatoires présentes
- Comparaison vs standards industrie
- Scoring risques (IA)
- Recommandations améliorations

#### ✅ 10. Rapports Avancés
**Fonctionnalités:**
- Valeur totale contrats actifs
- Dépenses par fournisseur/catégorie
- Taux renouvellement
- Contrats à risque (expiration imminente)

---

## 🔗 INTÉGRATION AVEC EXISTANT

### Avec Suppliers
```python
# Vue tous contrats d'un fournisseur
supplier.contracts.filter(status='active')

# Alerte si pas de contrat actif
if not supplier.contracts.filter(status='active').exists():
    # Warning: Achat sans contrat cadre
```

### Avec E-Sourcing
```python
# Créer contrat depuis événement de sourcing gagné
def create_contract_from_sourcing_event(sourcing_event, winning_bid):
    contract = Contract.objects.create(
        title=f"Contrat - {sourcing_event.title}",
        supplier=winning_bid.supplier,
        contract_value=winning_bid.total_bid_amount,
        effective_date=timezone.now().date(),
        owner=sourcing_event.created_by,
        sourcing_event=sourcing_event,
        # ...
    )
    return contract
```

### Avec Purchase Orders
```python
# Vérifier contrat cadre existant lors création BC
po = PurchaseOrder(supplier=supplier, ...)
active_contract = supplier.contracts.filter(status='active', expiration_date__gte=timezone.now()).first()

if not active_contract:
    # Warning: Pas de contrat cadre actif
    # Ou bloquer si règle stricte
```

### Avec Assistant IA
```python
# Chat: "Résume le contrat CTR202501-0045"
def ai_summarize_contract(contract):
    extracted_data = contract.ai_extracted_data
    prompt = f"""
    Résume ce contrat en 5 bullet points:
    - Titre: {contract.title}
    - Fournisseur: {contract.supplier.name}
    - Valeur: {contract.contract_value} {contract.currency}
    - Dates: {contract.effective_date} à {contract.expiration_date}
    - Clauses: {extracted_data.get('key_clauses', [])}
    """
    # Mistral IA génère résumé
```

---

## 🎯 ESTIMATION EFFORT

**Phase 1 (MVP):**
- **Modèles & Migrations:** 1 semaine
- **API Backend:** 2 semaines
- **Interface Admin:** 1 semaine
- **Upload/Download/Versioning:** 1 semaine
- **Workflows Approbation:** 2 semaines
- **Alertes système:** 1 semaine
- **Tests:** 1 semaine

**TOTAL Phase 1:** 9 semaines (2.25 mois) avec **2 développeurs**

**Phase 1.5 (Extraction IA):**
- **PDF parsing:** 1 semaine
- **Intégration Mistral IA extraction:** 2 semaines
- **UI affichage clauses:** 1 semaine
- **Tests:** 1 semaine

**TOTAL Phase 1.5:** 5 semaines (1.25 mois)

**Phase 2 (Signatures + Avancé):**
- **Signatures électroniques:** 3 semaines
- **Analyse conformité IA:** 2 semaines
- **Rapports avancés:** 1 semaine
- **Tests:** 1 semaine

**TOTAL Phase 2:** 7 semaines (1.75 mois)

**TOTAL COMPLET:** **5-5.5 mois** avec équipe de 2 développeurs

---

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Analyser les mod\u00e8les existants et architecture actuelle", "activeForm": "Analysant les mod\u00e8les existants et architecture actuelle", "status": "completed"}, {"content": "Cr\u00e9er plan d\u00e9taill\u00e9 E-Sourcing (RFI/RFP/RFQ/Ench\u00e8res)", "activeForm": "Cr\u00e9ant plan d\u00e9taill\u00e9 E-Sourcing", "status": "completed"}, {"content": "Cr\u00e9er plan d\u00e9taill\u00e9 Contract Management (CLM)", "activeForm": "Cr\u00e9ant plan d\u00e9taill\u00e9 Contract Management", "status": "in_progress"}, {"content": "Cr\u00e9er plan d\u00e9taill\u00e9 Int\u00e9grations ERP natives", "activeForm": "Cr\u00e9ant plan d\u00e9taill\u00e9 Int\u00e9grations ERP natives", "status": "pending"}, {"content": "G\u00e9n\u00e9rer document de sp\u00e9cifications compl\u00e8tes", "activeForm": "G\u00e9n\u00e9rant document de sp\u00e9cifications compl\u00e8tes", "status": "pending"}]