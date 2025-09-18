from django import forms
from django.utils.translation import gettext_lazy as _
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Fieldset, Submit, Row, Column, Div, HTML
from django.contrib.auth import get_user_model

from .models import Supplier, Product, Client, ProductCategory, SupplierContact, SupplierDocument

User = get_user_model()


class SupplierForm(forms.ModelForm):
    """Formulaire de création/modification de fournisseur"""
    
    class Meta:
        model = Supplier
        fields = [
            'name', 'legal_name', 'business_number', 'contact_person', 
            'email', 'phone', 'website', 'address', 'city', 'province', 
            'postal_code', 'payment_terms', 'currency', 'categories',
            'is_local', 'is_minority_owned', 'is_indigenous', 'is_woman_owned',
            'certifications'
        ]
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'legal_name': forms.TextInput(attrs={'class': 'form-control'}),
            'business_number': forms.TextInput(attrs={'class': 'form-control'}),
            'contact_person': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'phone': forms.TextInput(attrs={'class': 'form-control'}),
            'website': forms.URLInput(attrs={'class': 'form-control'}),
            'address': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'city': forms.TextInput(attrs={'class': 'form-control'}),
            'province': forms.Select(attrs={'class': 'form-select'}),
            'postal_code': forms.TextInput(attrs={'class': 'form-control'}),
            'payment_terms': forms.TextInput(attrs={'class': 'form-control'}),
            'currency': forms.Select(attrs={'class': 'form-select'}),
            'categories': forms.SelectMultiple(attrs={'class': 'form-select', 'size': '4'}),
            'certifications': forms.HiddenInput(),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.layout = Layout(
            Fieldset(
                _('Informations générales'),
                Row(
                    Column('name', css_class='form-group col-md-8 mb-0'),
                    Column('legal_name', css_class='form-group col-md-4 mb-0'),
                ),
                'business_number',
            ),
            Fieldset(
                _('Contact'),
                Row(
                    Column('contact_person', css_class='form-group col-md-6 mb-0'),
                    Column('email', css_class='form-group col-md-6 mb-0'),
                ),
                Row(
                    Column('phone', css_class='form-group col-md-6 mb-0'),
                    Column('website', css_class='form-group col-md-6 mb-0'),
                ),
            ),
            Fieldset(
                _('Adresse'),
                'address',
                Row(
                    Column('city', css_class='form-group col-md-6 mb-0'),
                    Column('province', css_class='form-group col-md-3 mb-0'),
                    Column('postal_code', css_class='form-group col-md-3 mb-0'),
                ),
            ),
            Fieldset(
                _('Termes commerciaux'),
                Row(
                    Column('payment_terms', css_class='form-group col-md-6 mb-0'),
                    Column('currency', css_class='form-group col-md-6 mb-0'),
                ),
                'categories',
            ),
            Fieldset(
                _('Diversité et certification'),
                Div(
                    Row(
                        Column('is_local', css_class='form-group col-md-6 mb-0'),
                        Column('is_minority_owned', css_class='form-group col-md-6 mb-0'),
                    ),
                    Row(
                        Column('is_indigenous', css_class='form-group col-md-6 mb-0'),
                        Column('is_woman_owned', css_class='form-group col-md-6 mb-0'),
                    ),
                    css_class='row'
                ),
                HTML('<div id="certifications-container"></div>'),
            ),
            Submit('submit', _('Enregistrer'), css_class='btn btn-primary')
        )


class ProductForm(forms.ModelForm):
    """Formulaire de produit"""
    
    class Meta:
        model = Product
        fields = [
            'supplier', 'category', 'sku', 'name', 'description', 
            'unit_price', 'bulk_price', 'bulk_quantity', 'is_available',
            'stock_quantity', 'lead_time_days', 'minimum_order_quantity',
            'image', 'specifications'
        ]
        widgets = {
            'supplier': forms.Select(attrs={'class': 'form-select'}),
            'category': forms.Select(attrs={'class': 'form-select'}),
            'sku': forms.TextInput(attrs={'class': 'form-control'}),
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
            'unit_price': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'bulk_price': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'bulk_quantity': forms.NumberInput(attrs={'class': 'form-control'}),
            'stock_quantity': forms.NumberInput(attrs={'class': 'form-control'}),
            'lead_time_days': forms.NumberInput(attrs={'class': 'form-control'}),
            'minimum_order_quantity': forms.NumberInput(attrs={'class': 'form-control'}),
            'image': forms.FileInput(attrs={'class': 'form-control'}),
            'specifications': forms.HiddenInput(),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.layout = Layout(
            Fieldset(
                _('Informations générales'),
                Row(
                    Column('supplier', css_class='form-group col-md-6 mb-0'),
                    Column('category', css_class='form-group col-md-6 mb-0'),
                ),
                Row(
                    Column('sku', css_class='form-group col-md-4 mb-0'),
                    Column('name', css_class='form-group col-md-8 mb-0'),
                ),
                'description',
                'image',
            ),
            Fieldset(
                _('Prix et quantités'),
                Row(
                    Column('unit_price', css_class='form-group col-md-4 mb-0'),
                    Column('bulk_price', css_class='form-group col-md-4 mb-0'),
                    Column('bulk_quantity', css_class='form-group col-md-4 mb-0'),
                ),
                Row(
                    Column('stock_quantity', css_class='form-group col-md-4 mb-0'),
                    Column('lead_time_days', css_class='form-group col-md-4 mb-0'),
                    Column('minimum_order_quantity', css_class='form-group col-md-4 mb-0'),
                ),
                'is_available',
            ),
            HTML('<div id="specifications-container"></div>'),
            Submit('submit', _('Enregistrer'), css_class='btn btn-primary')
        )


class ClientForm(forms.ModelForm):
    """Formulaire de client"""
    
    class Meta:
        model = Client
        fields = [
            'name', 'legal_name', 'business_number', 'contact_person',
            'email', 'phone', 'billing_address', 'payment_terms', 'credit_limit'
        ]
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'legal_name': forms.TextInput(attrs={'class': 'form-control'}),
            'business_number': forms.TextInput(attrs={'class': 'form-control'}),
            'contact_person': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'phone': forms.TextInput(attrs={'class': 'form-control'}),
            'billing_address': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'payment_terms': forms.TextInput(attrs={'class': 'form-control'}),
            'credit_limit': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.layout = Layout(
            Fieldset(
                _('Informations générales'),
                Row(
                    Column('name', css_class='form-group col-md-8 mb-0'),
                    Column('legal_name', css_class='form-group col-md-4 mb-0'),
                ),
                'business_number',
            ),
            Fieldset(
                _('Contact'),
                Row(
                    Column('contact_person', css_class='form-group col-md-6 mb-0'),
                    Column('email', css_class='form-group col-md-6 mb-0'),
                ),
                'phone',
                'billing_address',
            ),
            Fieldset(
                _('Termes commerciaux'),
                Row(
                    Column('payment_terms', css_class='form-group col-md-6 mb-0'),
                    Column('credit_limit', css_class='form-group col-md-6 mb-0'),
                ),
            ),
            Submit('submit', _('Enregistrer'), css_class='btn btn-primary')
        )


class ProductCategoryForm(forms.ModelForm):
    """Formulaire de catégorie de produit"""
    
    class Meta:
        model = ProductCategory
        fields = ['name', 'parent', 'code', 'description', 'icon']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'parent': forms.Select(attrs={'class': 'form-select'}),
            'code': forms.TextInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'icon': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'bi-box'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.layout = Layout(
            Row(
                Column('name', css_class='form-group col-md-6 mb-0'),
                Column('parent', css_class='form-group col-md-6 mb-0'),
            ),
            Row(
                Column('code', css_class='form-group col-md-6 mb-0'),
                Column('icon', css_class='form-group col-md-6 mb-0'),
            ),
            'description',
            Submit('submit', _('Enregistrer'), css_class='btn btn-primary')
        )


class SupplierContactForm(forms.ModelForm):
    """Formulaire de contact fournisseur"""
    
    class Meta:
        model = SupplierContact
        fields = [
            'name', 'title', 'contact_type', 'email', 'phone', 
            'mobile', 'is_primary', 'notes'
        ]
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'title': forms.TextInput(attrs={'class': 'form-control'}),
            'contact_type': forms.Select(attrs={'class': 'form-select'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'phone': forms.TextInput(attrs={'class': 'form-control'}),
            'mobile': forms.TextInput(attrs={'class': 'form-control'}),
            'notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.layout = Layout(
            Row(
                Column('name', css_class='form-group col-md-6 mb-0'),
                Column('title', css_class='form-group col-md-6 mb-0'),
            ),
            'contact_type',
            Row(
                Column('email', css_class='form-group col-md-6 mb-0'),
                Column('phone', css_class='form-group col-md-3 mb-0'),
                Column('mobile', css_class='form-group col-md-3 mb-0'),
            ),
            'is_primary',
            'notes',
            Submit('submit', _('Enregistrer'), css_class='btn btn-primary')
        )


class SupplierDocumentForm(forms.ModelForm):
    """Formulaire de document fournisseur"""
    
    class Meta:
        model = SupplierDocument
        fields = ['name', 'document_type', 'file', 'description', 'expiry_date']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'document_type': forms.Select(attrs={'class': 'form-select'}),
            'file': forms.FileInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'expiry_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.layout = Layout(
            'name',
            Row(
                Column('document_type', css_class='form-group col-md-6 mb-0'),
                Column('expiry_date', css_class='form-group col-md-6 mb-0'),
            ),
            'file',
            'description',
            Submit('submit', _('Enregistrer'), css_class='btn btn-primary')
        )


class SupplierSearchForm(forms.Form):
    """Formulaire de recherche de fournisseurs"""
    
    search = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': _('Rechercher par nom, email, ville...')
        }),
        label=_('Recherche')
    )
    
    status = forms.ChoiceField(
        required=False,
        choices=[('', _('Tous les statuts'))] + list(Supplier.status.field.choices),
        widget=forms.Select(attrs={'class': 'form-select'}),
        label=_('Statut')
    )
    
    province = forms.ChoiceField(
        required=False,
        choices=[('', _('Toutes les provinces'))] + [
            ('AB', 'Alberta'), ('BC', 'Colombie-Britannique'), ('MB', 'Manitoba'),
            ('NB', 'Nouveau-Brunswick'), ('NL', 'Terre-Neuve-et-Labrador'),
            ('NS', 'Nouvelle-Écosse'), ('ON', 'Ontario'), ('PE', 'Île-du-Prince-Édouard'),
            ('QC', 'Québec'), ('SK', 'Saskatchewan'), ('NT', 'Territoires du Nord-Ouest'),
            ('NU', 'Nunavut'), ('YT', 'Yukon')
        ],
        widget=forms.Select(attrs={'class': 'form-select'}),
        label=_('Province')
    )
    
    category = forms.ModelChoiceField(
        required=False,
        queryset=ProductCategory.objects.filter(parent__isnull=True),
        widget=forms.Select(attrs={'class': 'form-select'}),
        label=_('Catégorie'),
        empty_label=_('Toutes les catégories')
    )
    
    is_local = forms.BooleanField(
        required=False,
        widget=forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        label=_('Fournisseurs locaux uniquement')
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'GET'
        self.helper.layout = Layout(
            Row(
                Column('search', css_class='form-group col-md-4 mb-0'),
                Column('status', css_class='form-group col-md-2 mb-0'),
                Column('province', css_class='form-group col-md-2 mb-0'),
                Column('category', css_class='form-group col-md-3 mb-0'),
                Column(
                    Div('is_local', css_class='form-check mt-2'),
                    css_class='form-group col-md-1 mb-0'
                ),
            ),
            Submit('submit', _('Rechercher'), css_class='btn btn-primary')
        )


class ProductSearchForm(forms.Form):
    """Formulaire de recherche de produits"""
    
    search = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': _('Rechercher par nom, SKU, description...')
        }),
        label=_('Recherche')
    )
    
    supplier = forms.ModelChoiceField(
        required=False,
        queryset=Supplier.objects.filter(status='active'),
        widget=forms.Select(attrs={'class': 'form-select'}),
        label=_('Fournisseur'),
        empty_label=_('Tous les fournisseurs')
    )
    
    category = forms.ModelChoiceField(
        required=False,
        queryset=ProductCategory.objects.all(),
        widget=forms.Select(attrs={'class': 'form-select'}),
        label=_('Catégorie'),
        empty_label=_('Toutes les catégories')
    )
    
    available_only = forms.BooleanField(
        required=False,
        initial=True,
        widget=forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        label=_('Produits disponibles uniquement')
    )
    
    min_price = forms.DecimalField(
        required=False,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'placeholder': _('Prix min'),
            'step': '0.01'
        }),
        label=_('Prix minimum')
    )
    
    max_price = forms.DecimalField(
        required=False,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'placeholder': _('Prix max'),
            'step': '0.01'
        }),
        label=_('Prix maximum')
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'GET'
        self.helper.layout = Layout(
            Row(
                Column('search', css_class='form-group col-md-3 mb-0'),
                Column('supplier', css_class='form-group col-md-3 mb-0'),
                Column('category', css_class='form-group col-md-2 mb-0'),
                Column('min_price', css_class='form-group col-md-2 mb-0'),
                Column('max_price', css_class='form-group col-md-2 mb-0'),
            ),
            Row(
                Column(
                    Div('available_only', css_class='form-check'),
                    css_class='form-group col-md-3 mb-0'
                ),
                Column(
                    Submit('submit', _('Rechercher'), css_class='btn btn-primary'),
                    css_class='form-group col-md-9 mb-0 text-end'
                ),
            )
        )