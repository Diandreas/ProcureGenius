from django import forms
from django.forms import inlineformset_factory
from django.utils.translation import gettext_lazy as _
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Fieldset, Submit, Row, Column, Div, HTML
from django.contrib.auth import get_user_model

from .models import (
    PurchaseOrder, PurchaseOrderItem, PurchaseOrderApproval,
    PurchaseOrderReceipt, PurchaseOrderTemplate
)
from apps.suppliers.models import Supplier, Product, ProductCategory

User = get_user_model()


class PurchaseOrderForm(forms.ModelForm):
    """Formulaire principal de bon de commande"""
    
    class Meta:
        model = PurchaseOrder
        fields = [
            'supplier', 'priority', 'order_date', 'expected_delivery',
            'shipping_address', 'billing_address', 'payment_terms',
            'notes', 'terms_conditions', 'external_reference'
        ]
        widgets = {
            'supplier': forms.Select(attrs={'class': 'form-select'}),
            'priority': forms.Select(attrs={'class': 'form-select'}),
            'order_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'expected_delivery': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'shipping_address': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'billing_address': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'payment_terms': forms.TextInput(attrs={'class': 'form-control'}),
            'notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'terms_conditions': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
            'external_reference': forms.TextInput(attrs={'class': 'form-control'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Filtrer les fournisseurs actifs seulement
        self.fields['supplier'].queryset = Supplier.objects.filter(status='active').order_by('name')
        
        # Valeur par défaut pour la date de commande
        if not self.instance.pk:
            from django.utils import timezone
            self.fields['order_date'].initial = timezone.now().date()
        
        self.helper = FormHelper()
        self.helper.layout = Layout(
            Fieldset(
                _('Informations générales'),
                Row(
                    Column('supplier', css_class='form-group col-md-8 mb-0'),
                    Column('priority', css_class='form-group col-md-4 mb-0'),
                ),
                Row(
                    Column('order_date', css_class='form-group col-md-6 mb-0'),
                    Column('expected_delivery', css_class='form-group col-md-6 mb-0'),
                ),
                Row(
                    Column('payment_terms', css_class='form-group col-md-6 mb-0'),
                    Column('external_reference', css_class='form-group col-md-6 mb-0'),
                ),
            ),
            Fieldset(
                _('Adresses'),
                Row(
                    Column('shipping_address', css_class='form-group col-md-6 mb-0'),
                    Column('billing_address', css_class='form-group col-md-6 mb-0'),
                ),
            ),
            Fieldset(
                _('Notes et conditions'),
                'notes',
                'terms_conditions',
            ),
        )

    def clean(self):
        cleaned_data = super().clean()
        order_date = cleaned_data.get('order_date')
        expected_delivery = cleaned_data.get('expected_delivery')
        
        if order_date and expected_delivery and expected_delivery < order_date:
            raise forms.ValidationError(_('La date de livraison ne peut pas être antérieure à la date de commande.'))
        
        return cleaned_data


class PurchaseOrderItemForm(forms.ModelForm):
    """Formulaire pour les lignes de bon de commande"""
    
    product = forms.ModelChoiceField(
        queryset=Product.objects.filter(is_available=True),
        required=False,
        widget=forms.Select(attrs={'class': 'form-select product-select'}),
        label=_('Produit')
    )
    
    class Meta:
        model = PurchaseOrderItem
        fields = [
            'product', 'sku', 'description', 'category', 'quantity', 'unit',
            'unit_price', 'expected_date', 'notes'
        ]
        widgets = {
            'sku': forms.TextInput(attrs={'class': 'form-control'}),
            'description': forms.TextInput(attrs={'class': 'form-control'}),
            'category': forms.Select(attrs={'class': 'form-select'}),
            'quantity': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'unit': forms.TextInput(attrs={'class': 'form-control'}),
            'unit_price': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'expected_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'notes': forms.TextInput(attrs={'class': 'form-control'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['category'].queryset = ProductCategory.objects.all().order_by('name')


# Formset pour les lignes de bon de commande
PurchaseOrderItemFormSet = inlineformset_factory(
    PurchaseOrder,
    PurchaseOrderItem,
    form=PurchaseOrderItemForm,
    extra=1,
    min_num=1,
    validate_min=True,
    can_delete=True
)


class PurchaseOrderSearchForm(forms.Form):
    """Formulaire de recherche de bons de commande"""
    
    search = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': _('Rechercher par numéro, fournisseur...')
        }),
        label=_('Recherche')
    )
    
    status = forms.ChoiceField(
        required=False,
        choices=[('', _('Tous les statuts'))] + list(PurchaseOrder.status.field.choices),
        widget=forms.Select(attrs={'class': 'form-select'}),
        label=_('Statut')
    )
    
    supplier = forms.ModelChoiceField(
        required=False,
        queryset=Supplier.objects.filter(status='active'),
        widget=forms.Select(attrs={'class': 'form-select'}),
        label=_('Fournisseur'),
        empty_label=_('Tous les fournisseurs')
    )
    
    priority = forms.ChoiceField(
        required=False,
        choices=[('', _('Toutes les priorités'))] + list(PurchaseOrder.priority.field.choices),
        widget=forms.Select(attrs={'class': 'form-select'}),
        label=_('Priorité')
    )
    
    date_from = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
        label=_('Date de')
    )
    
    date_to = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
        label=_('Date à')
    )
    
    created_by_me = forms.BooleanField(
        required=False,
        widget=forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        label=_('Mes bons de commande uniquement')
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'GET'
        self.helper.layout = Layout(
            Row(
                Column('search', css_class='form-group col-md-3 mb-0'),
                Column('status', css_class='form-group col-md-2 mb-0'),
                Column('supplier', css_class='form-group col-md-3 mb-0'),
                Column('priority', css_class='form-group col-md-2 mb-0'),
                Column(
                    Submit('submit', _('Rechercher'), css_class='btn btn-primary'),
                    css_class='form-group col-md-2 mb-0 d-flex align-items-end'
                ),
            ),
            Row(
                Column('date_from', css_class='form-group col-md-3 mb-0'),
                Column('date_to', css_class='form-group col-md-3 mb-0'),
                Column(
                    Div('created_by_me', css_class='form-check mt-2'),
                    css_class='form-group col-md-3 mb-0'
                ),
                Column(
                    HTML('<a href="{% url \'purchase_orders:list\' %}" class="btn btn-outline-secondary">{% trans "Réinitialiser" %}</a>'),
                    css_class='form-group col-md-3 mb-0 d-flex align-items-end'
                ),
            )
        )


class PurchaseOrderApprovalForm(forms.ModelForm):
    """Formulaire d'approbation"""
    
    class Meta:
        model = PurchaseOrderApproval
        fields = ['comments']
        widgets = {
            'comments': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': _('Commentaires optionnels...')
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.layout = Layout(
            'comments',
            Div(
                Submit('approve', _('Approuver'), css_class='btn btn-success me-2'),
                Submit('reject', _('Rejeter'), css_class='btn btn-danger'),
                css_class='d-flex justify-content-end mt-3'
            )
        )


class PurchaseOrderReceiptForm(forms.ModelForm):
    """Formulaire de réception de marchandises"""
    
    class Meta:
        model = PurchaseOrderReceipt
        fields = [
            'receipt_date', 'delivery_note', 'carrier', 'tracking_number', 'notes'
        ]
        widgets = {
            'receipt_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'delivery_note': forms.TextInput(attrs={'class': 'form-control'}),
            'carrier': forms.TextInput(attrs={'class': 'form-control'}),
            'tracking_number': forms.TextInput(attrs={'class': 'form-control'}),
            'notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Date par défaut = aujourd'hui
        if not self.instance.pk:
            from django.utils import timezone
            self.fields['receipt_date'].initial = timezone.now().date()
        
        self.helper = FormHelper()
        self.helper.layout = Layout(
            Fieldset(
                _('Informations de réception'),
                Row(
                    Column('receipt_date', css_class='form-group col-md-6 mb-0'),
                    Column('delivery_note', css_class='form-group col-md-6 mb-0'),
                ),
                Row(
                    Column('carrier', css_class='form-group col-md-6 mb-0'),
                    Column('tracking_number', css_class='form-group col-md-6 mb-0'),
                ),
                'notes',
            ),
        )


class PurchaseOrderTemplateForm(forms.ModelForm):
    """Formulaire pour créer un template de bon de commande"""
    
    class Meta:
        model = PurchaseOrderTemplate
        fields = ['name', 'description', 'supplier']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'supplier': forms.Select(attrs={'class': 'form-select'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['supplier'].queryset = Supplier.objects.filter(status='active').order_by('name')
        
        self.helper = FormHelper()
        self.helper.layout = Layout(
            'name',
            'supplier',
            'description',
            Submit('submit', _('Créer le template'), css_class='btn btn-primary')
        )


class BulkPurchaseOrderActionForm(forms.Form):
    """Formulaire pour actions en lot sur les bons de commande"""
    
    ACTION_CHOICES = [
        ('', _('Choisir une action')),
        ('approve', _('Approuver')),
        ('send', _('Envoyer au fournisseur')),
        ('cancel', _('Annuler')),
        ('export', _('Exporter')),
    ]
    
    action = forms.ChoiceField(
        choices=ACTION_CHOICES,
        widget=forms.Select(attrs={'class': 'form-select'}),
        label=_('Action')
    )
    
    purchase_orders = forms.ModelMultipleChoiceField(
        queryset=PurchaseOrder.objects.all(),
        widget=forms.CheckboxSelectMultiple,
        label=_('Bons de commande')
    )
    
    comments = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        label=_('Commentaires')
    )

    def __init__(self, *args, **kwargs):
        queryset = kwargs.pop('queryset', None)
        super().__init__(*args, **kwargs)
        
        if queryset is not None:
            self.fields['purchase_orders'].queryset = queryset


class QuickPurchaseOrderForm(forms.Form):
    """Formulaire rapide pour création de BC via IA"""
    
    supplier = forms.ModelChoiceField(
        queryset=Supplier.objects.filter(status='active'),
        widget=forms.Select(attrs={'class': 'form-select'}),
        label=_('Fournisseur')
    )
    
    description = forms.CharField(
        widget=forms.Textarea(attrs={
            'class': 'form-control',
            'rows': 3,
            'placeholder': _('Décrivez ce que vous souhaitez commander...')
        }),
        label=_('Description de la commande')
    )
    
    priority = forms.ChoiceField(
        choices=PurchaseOrder.priority.field.choices,
        initial='medium',
        widget=forms.Select(attrs={'class': 'form-select'}),
        label=_('Priorité')
    )
    
    expected_delivery = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
        label=_('Livraison souhaitée')
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.layout = Layout(
            'supplier',
            'description',
            Row(
                Column('priority', css_class='form-group col-md-6 mb-0'),
                Column('expected_delivery', css_class='form-group col-md-6 mb-0'),
            ),
            Submit('submit', _('Créer avec l\'IA'), css_class='btn btn-primary')
        )


class PurchaseOrderComparisonForm(forms.Form):
    """Formulaire pour comparer des bons de commande"""
    
    purchase_orders = forms.ModelMultipleChoiceField(
        queryset=PurchaseOrder.objects.all(),
        widget=forms.CheckboxSelectMultiple(attrs={'class': 'form-check-input'}),
        label=_('Sélectionner les bons de commande à comparer')
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['purchase_orders'].queryset = PurchaseOrder.objects.select_related(
            'supplier'
        ).order_by('-created_at')[:50]  # Limiter aux 50 plus récents
        
        self.helper = FormHelper()
        self.helper.layout = Layout(
            'purchase_orders',
            Submit('compare', _('Comparer'), css_class='btn btn-primary')
        )

    def clean_purchase_orders(self):
        purchase_orders = self.cleaned_data['purchase_orders']
        
        if len(purchase_orders) < 2:
            raise forms.ValidationError(_('Vous devez sélectionner au moins 2 bons de commande.'))
        
        if len(purchase_orders) > 5:
            raise forms.ValidationError(_('Vous ne pouvez pas comparer plus de 5 bons de commande à la fois.'))
        
        return purchase_orders