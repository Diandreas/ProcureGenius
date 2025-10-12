# 📋 PLAN DE CORRECTIONS - MODULES FACTURES & BONS DE COMMANDE

## Date: 2025-10-12
## Basé sur: ANALYSE_INVOICES_PO_INCOHERENCES.md

---

## 🎯 OBJECTIFS

1. ✅ Ajouter modèle `Payment` manquant
2. ✅ Enrichir serializers avec statistiques calculées
3. ✅ Exposer actions critiques en API (`receive_items`, `approve`, `statistics`)
4. ✅ Améliorer frontend avec filtres et visualisations
5. ✅ Assurer cohérence complète inter-modules

---

## 🔧 PHASE 1: BACKEND - MODÈLES (CRITIQUE)

### ÉTAPE 1: Ajouter modèle Payment

**Fichier**: `apps/invoicing/models.py` (ajouter après ligne 857, après InvoiceItem)

```python
class Payment(models.Model):
    """Paiement d'une facture"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relations
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name=_("Facture")
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='payments_created',
        verbose_name=_("Créé par")
    )
    
    # Informations de paiement
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name=_("Montant")
    )
    payment_date = models.DateField(verbose_name=_("Date de paiement"))
    payment_method = models.CharField(
        max_length=50,
        choices=[
            ('cash', _('Comptant')),
            ('check', _('Chèque')),
            ('credit_card', _('Carte de crédit')),
            ('bank_transfer', _('Virement bancaire')),
            ('paypal', _('PayPal')),
            ('other', _('Autre')),
        ],
        default='bank_transfer',
        verbose_name=_("Mode de paiement")
    )
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Numéro de référence")
    )
    notes = models.TextField(blank=True, verbose_name=_("Notes"))
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Paiement")
        verbose_name_plural = _("Paiements")
        ordering = ['-payment_date', '-created_at']
        indexes = [
            models.Index(fields=['invoice', 'payment_date']),
            models.Index(fields=['payment_method']),
        ]
    
    def __str__(self):
        return f"Paiement {self.amount} pour {self.invoice.invoice_number}"
    
    def clean(self):
        """Validation du paiement"""
        from django.core.exceptions import ValidationError
        
        # Vérifier que le montant ne dépasse pas le solde dû
        if self.invoice_id:
            balance_due = self.invoice.get_balance_due()
            # Si c'est une modification, exclure le paiement actuel du calcul
            if self.pk:
                balance_due += self.amount
            
            if self.amount > balance_due:
                raise ValidationError(
                    f"Le montant du paiement ({self.amount}) dépasse le solde dû ({balance_due})"
                )
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        
        # Mettre à jour le statut de la facture après le paiement
        if self.invoice_id:
            self.invoice.update_status_from_payments()
```

---

### ÉTAPE 2: Améliorer modèle Invoice

**Fichier**: `apps/invoicing/models.py` (après ligne 446, après generate_invoice_number)

```python
def get_balance_due(self):
    """Calcule le solde restant à payer"""
    total_payments = sum(p.amount for p in self.payments.all())
    return self.total_amount - total_payments

def get_payment_status(self):
    """Retourne le statut de paiement: unpaid, partial, paid"""
    balance = self.get_balance_due()
    
    if balance <= 0:
        return 'paid'
    elif balance < self.total_amount:
        return 'partial'
    else:
        return 'unpaid'

def update_status_from_payments(self):
    """Met à jour le statut selon les paiements reçus"""
    payment_status = self.get_payment_status()
    
    if payment_status == 'paid':
        self.status = 'paid'
    elif payment_status == 'partial':
        # Garder le statut actuel si c'est 'sent' ou 'overdue'
        if self.status in ['draft', 'paid']:
            self.status = 'sent'
    # Ne rien changer si unpaid (garder sent/overdue/draft)
    
    self.save(update_fields=['status'])

@property
def is_overdue(self):
    """Vérifie si la facture est en retard"""
    from django.utils import timezone
    if self.status in ['paid', 'cancelled', 'draft']:
        return False
    return self.due_date < timezone.now().date()

@property
def days_overdue(self):
    """Nombre de jours de retard (0 si pas en retard)"""
    from django.utils import timezone
    if not self.is_overdue:
        return 0
    delta = timezone.now().date() - self.due_date
    return delta.days

@property
def days_until_due(self):
    """Nombre de jours avant échéance (négatif si en retard)"""
    from django.utils import timezone
    delta = self.due_date - timezone.now().date()
    return delta.days

def has_items(self):
    """Vérifie si la facture a au moins un élément"""
    return self.items.exists()

@property
def items_count(self):
    """Nombre d'éléments dans la facture"""
    return self.items.count()
```

---

### ÉTAPE 3: Améliorer modèle PurchaseOrder

**Fichier**: `apps/purchase_orders/models.py` (après ligne 96, après generate_qr_code)

```python
@property
def is_overdue(self):
    """Vérifie si le BC est en retard par rapport à required_date"""
    from django.utils import timezone
    if self.status in ['received', 'cancelled']:
        return False
    return self.required_date < timezone.now().date()

@property
def days_overdue(self):
    """Nombre de jours de retard"""
    from django.utils import timezone
    if not self.is_overdue:
        return 0
    delta = timezone.now().date() - self.required_date
    return delta.days

@property
def items_count(self):
    """Nombre d'items dans le bon de commande"""
    return self.items.count()

@property
def related_invoices_count(self):
    """Nombre de factures liées à ce BC"""
    return self.invoices.count()

def get_approval_status(self):
    """Retourne le statut d'approbation: pending, approved, not_required"""
    if self.status in ['draft']:
        return 'pending'
    elif self.approved_by is not None:
        return 'approved'
    else:
        return 'not_required'
```

---

### ÉTAPE 4: Enregistrer Payment dans admin

**Fichier**: `apps/invoicing/admin.py` (après ligne 43, après InvoiceItemAdmin)

```python
@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        'invoice', 'amount', 'payment_date', 'payment_method',
        'reference_number', 'created_by', 'created_at'
    ]
    list_filter = ['payment_method', 'payment_date', 'created_at']
    search_fields = [
        'invoice__invoice_number', 'reference_number',
        'created_by__username', 'created_by__email'
    ]
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'payment_date'
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('invoice', 'amount', 'payment_date')
        }),
        ('Détails du paiement', {
            'fields': ('payment_method', 'reference_number', 'notes')
        }),
        ('Audit', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # Modification
            return self.readonly_fields + ['invoice', 'created_by']
        return self.readonly_fields
    
    def save_model(self, request, obj, form, change):
        if not change:  # Création
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
```

---

### ÉTAPE 5: Migrations

```bash
# Créer la migration pour Payment
python manage.py makemigrations invoicing --name add_payment_model

# Appliquer
python manage.py migrate invoicing
```

---

## 🔌 PHASE 2: BACKEND - API

### ÉTAPE 6: Enrichir InvoiceSerializer

**Fichier**: `apps/api/serializers.py` (modifier InvoiceSerializer ligne 262)

```python
class PaymentSerializer(serializers.ModelSerializer):
    """Serializer pour les paiements"""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'invoice', 'amount', 'payment_date', 'payment_method',
            'reference_number', 'notes', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class InvoiceSerializer(ModuleAwareSerializerMixin, serializers.ModelSerializer):
    """Serializer pour les factures"""
    items = InvoiceItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    client_name = serializers.CharField(source='client.username', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    purchase_order_number = serializers.CharField(source='purchase_order.po_number', read_only=True, required=False)
    
    # Statistiques calculées
    items_count = serializers.IntegerField(source='items.count', read_only=True)
    total_paid = serializers.SerializerMethodField()
    balance_due = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)
    days_overdue = serializers.IntegerField(read_only=True)
    days_until_due = serializers.IntegerField(read_only=True)
    
    # Hide fields for disabled modules
    module_dependent_fields = {
        'purchase-orders': ['purchase_order', 'purchase_order_number'],
        'clients': ['client', 'client_name'],
    }

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'title', 'description', 'status',
            'client', 'client_name', 'purchase_order', 'purchase_order_number',
            'subtotal', 'tax_amount', 'total_amount',
            'due_date', 'billing_address', 'payment_terms', 'payment_method', 'currency',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
            'items', 'items_count', 'payments',
            'total_paid', 'balance_due', 'payment_status',
            'is_overdue', 'days_overdue', 'days_until_due'
        ]
        read_only_fields = [
            'id', 'invoice_number', 'subtotal', 'total_amount',
            'created_at', 'updated_at', 'created_by',
            'items_count', 'total_paid', 'balance_due', 'payment_status',
            'is_overdue', 'days_overdue', 'days_until_due'
        ]
    
    def get_total_paid(self, obj):
        total = sum(p.amount for p in obj.payments.all())
        return float(total)
    
    def get_balance_due(self, obj):
        return float(obj.get_balance_due())
    
    def get_payment_status(self, obj):
        return obj.get_payment_status()
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
```

---

### ÉTAPE 7: Enrichir PurchaseOrderSerializer

**Fichier**: `apps/api/serializers.py` (modifier PurchaseOrderSerializer ligne 219)

```python
class PurchaseOrderSerializer(ModuleAwareSerializerMixin, serializers.ModelSerializer):
    """Serializer pour les bons de commande"""
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    
    # Statistiques calculées
    items_count = serializers.IntegerField(source='items.count', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    days_overdue = serializers.IntegerField(read_only=True)
    related_invoices_count = serializers.IntegerField(read_only=True)
    approval_status = serializers.SerializerMethodField()
    
    # Hide supplier fields if suppliers module is disabled
    module_dependent_fields = {
        'suppliers': ['supplier', 'supplier_name'],
    }

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'po_number', 'title', 'description', 'supplier', 'supplier_name',
            'status', 'priority', 'subtotal', 'tax_gst_hst', 'tax_qst',
            'total_amount', 'shipping_cost', 'required_date', 'expected_delivery_date',
            'delivery_address', 'special_conditions', 'notes',
            'created_by', 'created_by_name', 'approved_by', 'approved_by_name',
            'created_at', 'updated_at', 'items', 'items_count',
            'is_overdue', 'days_overdue', 'related_invoices_count', 'approval_status'
        ]
        read_only_fields = [
            'id', 'po_number', 'subtotal', 'total_amount',
            'created_at', 'updated_at', 'created_by',
            'items_count', 'is_overdue', 'days_overdue',
            'related_invoices_count', 'approval_status'
        ]
    
    def get_approval_status(self, obj):
        return obj.get_approval_status()
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
```

---

### ÉTAPE 8: Ajouter actions dans InvoiceViewSet

**Fichier**: `apps/api/views.py` (après InvoiceViewSet ligne ~935)

```python
class InvoiceViewSet(viewsets.ModelViewSet):
    # ... code existant ...
    
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Statistiques complètes pour une facture"""
        invoice = self.get_object()
        from django.db.models import Sum, Count
        
        # Stats items
        items_stats = invoice.items.aggregate(
            total_items=Count('id'),
            total_quantity=Sum('quantity')
        )
        
        # Stats paiements
        payments = invoice.payments.all()
        payments_stats = {
            'total_payments': payments.count(),
            'total_paid': float(sum(p.amount for p in payments)),
            'last_payment_date': payments.first().payment_date if payments.exists() else None,
            'payment_methods': list(payments.values_list('payment_method', flat=True).distinct())
        }
        
        # Historique client si applicable
        client_history = {}
        if invoice.client:
            client_invoices = Invoice.objects.filter(client=invoice.client).exclude(id=invoice.id)
            client_history = {
                'total_invoices': client_invoices.count(),
                'total_amount': float(client_invoices.aggregate(Sum('total_amount'))['total_amount__sum'] or 0),
                'paid_invoices': client_invoices.filter(status='paid').count(),
            }
        
        return Response({
            'invoice_summary': {
                'invoice_number': invoice.invoice_number,
                'status': invoice.status,
                'total_amount': float(invoice.total_amount),
                'balance_due': float(invoice.get_balance_due()),
                'payment_status': invoice.get_payment_status(),
                'is_overdue': invoice.is_overdue,
                'days_overdue': invoice.days_overdue,
            },
            'items_breakdown': items_stats,
            'payments_received': payments_stats,
            'client_history': client_history,
            'related_purchase_order': {
                'po_number': invoice.purchase_order.po_number if invoice.purchase_order else None,
                'supplier': invoice.purchase_order.supplier.name if invoice.purchase_order and invoice.purchase_order.supplier else None,
            } if invoice.purchase_order else None
        })
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Statistiques tableau de bord des factures"""
        from django.db.models import Sum, Q
        from django.utils import timezone
        
        invoices = self.get_queryset()
        
        stats = {
            'total_invoices': invoices.count(),
            'draft': invoices.filter(status='draft').count(),
            'sent': invoices.filter(status='sent').count(),
            'paid': invoices.filter(status='paid').count(),
            'overdue': invoices.filter(
                Q(status__in=['sent']) &
                Q(due_date__lt=timezone.now().date())
            ).count(),
            'cancelled': invoices.filter(status='cancelled').count(),
            
            'total_amount': float(invoices.aggregate(Sum('total_amount'))['total_amount__sum'] or 0),
            'paid_amount': float(invoices.filter(status='paid').aggregate(Sum('total_amount'))['total_amount__sum'] or 0),
            'pending_amount': float(invoices.filter(status__in=['sent', 'draft']).aggregate(Sum('total_amount'))['total_amount__sum'] or 0),
        }
        
        return Response(stats)
    
    @action(detail=True, methods=['post'])
    def mark_as_paid(self, request, pk=None):
        """Marquer la facture comme payée"""
        invoice = self.get_object()
        
        if invoice.status == 'paid':
            return Response(
                {'error': 'La facture est déjà payée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Créer un paiement automatique pour le solde restant
        balance = invoice.get_balance_due()
        if balance > 0:
            from apps.invoicing.models import Payment
            from django.utils import timezone
            
            payment = Payment.objects.create(
                invoice=invoice,
                amount=balance,
                payment_date=timezone.now().date(),
                payment_method=request.data.get('payment_method', 'other'),
                reference_number=request.data.get('reference_number', ''),
                notes=request.data.get('notes', 'Marqué comme payé manuellement'),
                created_by=request.user
            )
        
        invoice.status = 'paid'
        invoice.save()
        
        return Response(self.get_serializer(invoice).data)
    
    @action(detail=True, methods=['post'])
    def add_payment(self, request, pk=None):
        """Ajouter un paiement à la facture"""
        invoice = self.get_object()
        
        from .serializers import PaymentSerializer
        serializer = PaymentSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            serializer.save(invoice=invoice)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

---

### ÉTAPE 9: Ajouter actions dans PurchaseOrderViewSet

**Fichier**: `apps/api/views.py` (après PurchaseOrderViewSet ligne ~960)

```python
class PurchaseOrderViewSet(viewsets.ModelViewSet):
    # ... code existant ...
    
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Statistiques complètes pour un bon de commande"""
        po = self.get_object()
        from django.db.models import Sum, Count, Avg
        
        # Stats items
        items_stats = po.items.aggregate(
            total_items=Count('id'),
            total_quantity=Sum('quantity'),
            avg_unit_price=Avg('unit_price')
        )
        
        # Factures liées
        related_invoices = Invoice.objects.filter(purchase_order=po)
        invoices_stats = {
            'total_invoices': related_invoices.count(),
            'total_invoiced': float(related_invoices.aggregate(Sum('total_amount'))['total_amount__sum'] or 0),
            'paid_invoices': related_invoices.filter(status='paid').count(),
        }
        
        # Historique fournisseur
        supplier_history = {}
        if po.supplier:
            supplier_pos = PurchaseOrder.objects.filter(supplier=po.supplier).exclude(id=po.id)
            supplier_history = {
                'total_pos': supplier_pos.count(),
                'received_pos': supplier_pos.filter(status='received').count(),
                'total_amount': float(supplier_pos.aggregate(Sum('total_amount'))['total_amount__sum'] or 0),
            }
        
        return Response({
            'po_summary': {
                'po_number': po.po_number,
                'status': po.status,
                'priority': po.priority,
                'total_amount': float(po.total_amount),
                'is_overdue': po.is_overdue,
                'days_overdue': po.days_overdue,
                'approval_status': po.get_approval_status(),
            },
            'items_breakdown': items_stats,
            'invoices_summary': invoices_stats,
            'supplier_history': supplier_history,
        })
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approuver le bon de commande"""
        po = self.get_object()
        
        if po.status != 'pending':
            return Response(
                {'error': f'Le BC doit être en statut "pending" pour être approuvé (statut actuel: {po.status})'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        po.approved_by = request.user
        po.status = 'approved'
        po.save()
        
        return Response(self.get_serializer(po).data)
    
    @action(detail=True, methods=['post'])
    def receive_items(self, request, pk=None):
        """Réceptionner les articles du bon de commande"""
        po = self.get_object()
        
        if po.status not in ['sent', 'approved']:
            return Response(
                {'error': f'Le BC doit être en statut "sent" ou "approved" pour être réceptionné (statut actuel: {po.status})'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Appeler la méthode existante du modèle
        po.receive_items(user=request.user)
        
        return Response({
            'status': 'received',
            'message': 'Articles réceptionnés avec succès',
            'po': self.get_serializer(po).data
        })
    
    @action(detail=False, methods=['get'])
    def pending_approvals(self, request):
        """Liste des BC en attente d'approbation"""
        pending_pos = self.get_queryset().filter(status='pending')
        serializer = self.get_serializer(pending_pos, many=True)
        return Response({
            'count': pending_pos.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Statistiques tableau de bord des bons de commande"""
        from django.db.models import Sum
        
        pos = self.get_queryset()
        
        stats = {
            'total_pos': pos.count(),
            'draft': pos.filter(status='draft').count(),
            'pending': pos.filter(status='pending').count(),
            'approved': pos.filter(status='approved').count(),
            'sent': pos.filter(status='sent').count(),
            'received': pos.filter(status='received').count(),
            'cancelled': pos.filter(status='cancelled').count(),
            
            'total_amount': float(pos.aggregate(Sum('total_amount'))['total_amount__sum'] or 0),
            'pending_approval_amount': float(pos.filter(status='pending').aggregate(Sum('total_amount'))['total_amount__sum'] or 0),
        }
        
        return Response(stats)
```

---

### ÉTAPE 10: Mettre à jour api.js

**Fichier**: `frontend/src/services/api.js` (ajouter après existant)

```javascript
// Invoices API
export const invoicesAPI = {
  // ... méthodes existantes ...
  getStatistics: (id) => api.get(`/invoices/${id}/statistics/`),
  getDashboardStats: () => api.get(`/invoices/dashboard_stats/`),
  markAsPaid: (id, data) => api.post(`/invoices/${id}/mark_as_paid/`, data),
  addPayment: (id, data) => api.post(`/invoices/${id}/add_payment/`, data),
};

// Purchase Orders API
export const purchaseOrdersAPI = {
  // ... méthodes existantes ...
  getStatistics: (id) => api.get(`/purchase-orders/${id}/statistics/`),
  getDashboardStats: () => api.get(`/purchase-orders/dashboard_stats/`),
  approve: (id) => api.post(`/purchase-orders/${id}/approve/`),
  receiveItems: (id) => api.post(`/purchase-orders/${id}/receive_items/`),
  getPendingApprovals: () => api.get(`/purchase-orders/pending_approvals/`),
};

// Payments API (nouveau)
export const paymentsAPI = {
  list: (params) => api.get('/payments/', { params }),
  get: (id) => api.get(`/payments/${id}/`),
  create: (data) => api.post('/payments/', data),
  update: (id, data) => api.put(`/payments/${id}/`, data),
  delete: (id) => api.delete(`/payments/${id}/`),
};
```

---

## 🎨 PHASE 3: FRONTEND - UI/UX

### ÉTAPE 11: Améliorer Invoices.jsx avec filtres

**Fichier**: `frontend/src/pages/invoices/Invoices.jsx`

**Ajouter état**:
```javascript
const [statusFilter, setStatusFilter] = useState('');
const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
```

**Ajouter filtres UI** (après le champ de recherche):
```javascript
<Grid item xs={12} sm={3}>
  <FormControl fullWidth size="small">
    <InputLabel>Statut</InputLabel>
    <Select
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
      label="Statut"
    >
      <MenuItem value="">Tous les statuts</MenuItem>
      <MenuItem value="draft">Brouillon</MenuItem>
      <MenuItem value="sent">Envoyée</MenuItem>
      <MenuItem value="paid">Payée</MenuItem>
      <MenuItem value="overdue">En retard</MenuItem>
      <MenuItem value="cancelled">Annulée</MenuItem>
    </Select>
  </FormControl>
</Grid>

<Grid item xs={12} sm={3}>
  <FormControl fullWidth size="small">
    <InputLabel>Paiement</InputLabel>
    <Select
      value={paymentStatusFilter}
      onChange={(e) => setPaymentStatusFilter(e.target.value)}
      label="Paiement"
    >
      <MenuItem value="">Tous</MenuItem>
      <MenuItem value="unpaid">Non payé</MenuItem>
      <MenuItem value="partial">Partiellement payé</MenuItem>
      <MenuItem value="paid">Payé</MenuItem>
    </Select>
  </FormControl>
</Grid>
```

**Modifier filteredInvoices**:
```javascript
const filteredInvoices = invoices.filter(invoice => {
  const matchesSearch = !searchTerm ||
    invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
  
  const matchesStatus = !statusFilter || invoice.status === statusFilter;
  const matchesPaymentStatus = !paymentStatusFilter || invoice.payment_status === paymentStatusFilter;
  
  return matchesSearch && matchesStatus && matchesPaymentStatus;
});
```

**Ajouter badges overdue dans TableCell**:
```javascript
<TableCell>
  <Box display="flex" alignItems="center" gap={1}>
    <Chip
      label={getStatusLabel(invoice.status)}
      color={getStatusColor(invoice.status)}
      size="small"
    />
    {invoice.is_overdue && (
      <Chip
        icon={<AccessTime />}
        label={`${invoice.days_overdue}j retard`}
        color="error"
        size="small"
      />
    )}
  </Box>
</TableCell>
```

---

### ÉTAPE 12: Créer InvoiceStatisticsCard composant

**Fichier**: `frontend/src/components/invoices/InvoiceStatisticsCard.jsx` (CRÉER)

```javascript
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Receipt,
  AttachMoney,
  TrendingUp,
  CheckCircle,
  Warning,
  AccessTime,
} from '@mui/icons-material';

function InvoiceStatisticsCard({ statistics, loading }) {
  if (loading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (!statistics) {
    return null;
  }

  const { invoice_summary, items_breakdown, payments_received, client_history } = statistics;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      paid: 'success',
      partial: 'warning',
      unpaid: 'error'
    };
    return colors[status] || 'default';
  };

  const getPaymentStatusLabel = (status) => {
    const labels = {
      paid: 'Payée',
      partial: 'Partiellement payée',
      unpaid: 'Non payée'
    };
    return labels[status] || status;
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp color="primary" />
          Statistiques de la facture
        </Typography>

        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Statut de paiement */}
          <Grid item xs={12} md={3}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Statut de paiement
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip
                  icon={invoice_summary.payment_status === 'paid' ? <CheckCircle /> : <Warning />}
                  label={getPaymentStatusLabel(invoice_summary.payment_status)}
                  color={getPaymentStatusColor(invoice_summary.payment_status)}
                  sx={{ fontWeight: 600 }}
                />
              </Box>
            </Box>
          </Grid>

          {/* Montant total */}
          <Grid item xs={12} md={3}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Montant total
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 600 }}>
                {formatCurrency(invoice_summary.total_amount)}
              </Typography>
            </Box>
          </Grid>

          {/* Montant payé */}
          <Grid item xs={12} md={3}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Montant payé
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 600, color: 'success.main' }}>
                {formatCurrency(payments_received.total_paid)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {payments_received.total_payments} paiement(s)
              </Typography>
            </Box>
          </Grid>

          {/* Solde dû */}
          <Grid item xs={12} md={3}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Solde dû
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  mt: 0.5,
                  fontWeight: 600,
                  color: invoice_summary.balance_due > 0 ? 'error.main' : 'success.main'
                }}
              >
                {formatCurrency(invoice_summary.balance_due)}
              </Typography>
            </Box>
          </Grid>

          {/* Retard éventuel */}
          {invoice_summary.is_overdue && (
            <Grid item xs={12}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'error.lighter',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <AccessTime color="error" />
                <Typography variant="body2" color="error.dark" fontWeight={600}>
                  Facture en retard de {invoice_summary.days_overdue} jour(s)
                </Typography>
              </Box>
            </Grid>
          )}

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Items */}
          <Grid item xs={12} md={4}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Nombre d'articles
              </Typography>
              <Typography variant="h6" sx={{ mt: 0.5 }}>
                {items_breakdown.total_items}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Quantité totale: {items_breakdown.total_quantity}
              </Typography>
            </Box>
          </Grid>

          {/* Historique client */}
          {client_history && (
            <>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Factures du client
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 0.5 }}>
                    {client_history.total_invoices}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    dont {client_history.paid_invoices} payées
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total des ventes (client)
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 0.5 }}>
                    {formatCurrency(client_history.total_amount)}
                  </Typography>
                </Box>
              </Grid>
            </>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
}

export default InvoiceStatisticsCard;
```

---

### ÉTAPE 13: Améliorer PurchaseOrders.jsx avec filtres

**Fichier**: `frontend/src/pages/purchase-orders/PurchaseOrders.jsx`

**Ajouter état**:
```javascript
const [statusFilter, setStatusFilter] = useState('');
const [priorityFilter, setPriorityFilter] = useState('');
```

**Ajouter filtres UI**:
```javascript
<Grid item xs={12} sm={3}>
  <FormControl fullWidth size="small">
    <InputLabel>Statut</InputLabel>
    <Select
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
      label="Statut"
    >
      <MenuItem value="">Tous</MenuItem>
      <MenuItem value="draft">Brouillon</MenuItem>
      <MenuItem value="pending">En attente</MenuItem>
      <MenuItem value="approved">Approuvé</MenuItem>
      <MenuItem value="sent">Envoyé</MenuItem>
      <MenuItem value="received">Reçu</MenuItem>
      <MenuItem value="cancelled">Annulé</MenuItem>
    </Select>
  </FormControl>
</Grid>

<Grid item xs={12} sm={3}>
  <FormControl fullWidth size="small">
    <InputLabel>Priorité</InputLabel>
    <Select
      value={priorityFilter}
      onChange={(e) => setPriorityFilter(e.target.value)}
      label="Priorité"
    >
      <MenuItem value="">Toutes</MenuItem>
      <MenuItem value="low">Faible</MenuItem>
      <MenuItem value="normal">Normal</MenuItem>
      <MenuItem value="high">Élevé</MenuItem>
      <MenuItem value="urgent">Urgent</MenuItem>
    </Select>
  </FormControl>
</Grid>
```

**Ajouter badges dans TableCell**:
```javascript
<TableCell>
  <Box display="flex" alignItems="center" gap={1}>
    <Chip
      label={getStatusLabel(po.status)}
      color={getStatusColor(po.status)}
      size="small"
    />
    {po.priority === 'urgent' && (
      <Chip
        icon={<Warning />}
        label="URGENT"
        color="error"
        size="small"
      />
    )}
    {po.is_overdue && (
      <Chip
        icon={<AccessTime />}
        label={`${po.days_overdue}j retard`}
        color="warning"
        size="small"
      />
    )}
  </Box>
</TableCell>
```

---

### ÉTAPE 14: Créer PurchaseOrderStatisticsCard

**Fichier**: `frontend/src/components/purchase-orders/PurchaseOrderStatisticsCard.jsx` (CRÉER)

*(Structure similaire à InvoiceStatisticsCard, adapter les champs)*

---

## 📝 PHASE 4: TESTS & VALIDATION

### ÉTAPE 15: Tests backend

```bash
# Tester création Payment
python manage.py shell
>>> from apps.invoicing.models import Invoice, Payment
>>> from django.contrib.auth import get_user_model
>>> User = get_user_model()
>>> user = User.objects.first()
>>> invoice = Invoice.objects.first()
>>> payment = Payment.objects.create(
...     invoice=invoice,
...     amount=100,
...     payment_date='2025-10-12',
...     payment_method='cash',
...     created_by=user
... )
>>> invoice.get_balance_due()

# Tester actions API
curl http://localhost:8000/api/v1/invoices/{id}/statistics/
curl http://localhost:8000/api/v1/invoices/dashboard_stats/
curl http://localhost:8000/api/v1/purchase-orders/{id}/approve/ -X POST
curl http://localhost:8000/api/v1/purchase-orders/{id}/receive_items/ -X POST
```

---

### ÉTAPE 16: Tests frontend

- Vérifier filtres dans Invoices.jsx
- Vérifier filtres dans PurchaseOrders.jsx
- Vérifier affichage stats
- Vérifier badges overdue
- Tester responsive mobile

---

## 📋 RÉSUMÉ DES CHANGEMENTS

### Backend (14 fichiers)
1. `apps/invoicing/models.py` - +Payment, +méthodes Invoice
2. `apps/invoicing/admin.py` - +PaymentAdmin
3. `apps/purchase_orders/models.py` - +méthodes PurchaseOrder
4. `apps/api/serializers.py` - +PaymentSerializer, enrichir Invoice/PO serializers
5. `apps/api/views.py` - +actions Invoice/PO ViewSets
6-9. Migrations (4 fichiers)

### Frontend (8 fichiers)
10. `frontend/src/services/api.js` - Nouvelles méthodes
11. `frontend/src/pages/invoices/Invoices.jsx` - Filtres
12. `frontend/src/pages/invoices/InvoiceDetail.jsx` - Stats
13. `frontend/src/pages/purchase-orders/PurchaseOrders.jsx` - Filtres
14. `frontend/src/pages/purchase-orders/PurchaseOrderDetail.jsx` - Stats
15. `frontend/src/components/invoices/InvoiceStatisticsCard.jsx` - **CRÉER**
16. `frontend/src/components/purchase-orders/PurchaseOrderStatisticsCard.jsx` - **CRÉER**
17. `frontend/src/components/invoices/PaymentsList.jsx` - **CRÉER** (optionnel)

---

## ⏱️ ESTIMATION FINALE

- Phase 1 (Backend Modèles): **4 heures**
- Phase 2 (Backend API): **6 heures**
- Phase 3 (Frontend UI/UX): **5 heures**
- Phase 4 (Tests): **2 heures**
- Documentation: **1 heure**

**Total: 18 heures**

---

## 🎯 BÉNÉFICES APRÈS CORRECTIONS

✅ Gestion complète des paiements (création, tracking, balance)
✅ Statistiques temps réel (montants, retards, approbations)
✅ Actions critiques exposées en API (approve, receive, mark_as_paid)
✅ Filtres avancés frontend (statut, priorité, paiement)
✅ Badges visuels pour retards et urgences
✅ Cohérence totale Invoice ↔ PurchaseOrder ↔ Payment
✅ UX améliorée pour gestion quotidienne

---

**Plan créé le**: 2025-10-12  
**Basé sur**: ANALYSE_INVOICES_PO_INCOHERENCES.md  
**Prêt à implémenter**: ✅

