from django import forms
from django.forms import inlineformset_factory
from django.utils.translation import gettext_lazy as _
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Fieldset, Submit, Row, Column

from .models import Invoice, InvoiceItem


class InvoiceForm(forms.ModelForm):
    """Formulaire principal de facture (version simplifiée)"""
    
    class Meta:
        model = Invoice
        fields = ['title', 'description', 'due_date']
        widgets = {
            'title': forms.TextInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'due_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Valeur par défaut pour la date d'échéance
        if not self.instance.pk:
            from django.utils import timezone
            from datetime import timedelta
            self.fields['due_date'].initial = (timezone.now() + timedelta(days=30)).date()
        
        self.helper = FormHelper()
        self.helper.layout = Layout(
            Fieldset(
                _('Informations de la facture'),
                'title',
                'description',
                'due_date',
            ),
            Submit('submit', _('Créer la facture'), css_class='btn btn-primary')
        )


class InvoiceItemForm(forms.ModelForm):
    """Formulaire pour les lignes de facture"""
    
    class Meta:
        model = InvoiceItem
        fields = [
            'service_code', 'product_reference', 'description', 'detailed_description',
            'quantity', 'unit_price', 'unit_of_measure', 'discount_percent', 
            'tax_rate', 'notes'
        ]
        widgets = {
            'service_code': forms.TextInput(attrs={
                'class': 'form-control', 
                'placeholder': 'Ex: WEB-DEV',
                'value': 'SVC-001'
            }),
            'product_reference': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Référence produit (optionnel)'
            }),
            'description': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Description de l\'élément',
                'required': True
            }),
            'detailed_description': forms.Textarea(attrs={
                'class': 'form-control', 
                'rows': 2,
                'placeholder': 'Description détaillée (optionnel)'
            }),
            'quantity': forms.NumberInput(attrs={
                'class': 'form-control', 
                'step': '1',
                'min': '1',
                'value': '1'
            }),
            'unit_price': forms.NumberInput(attrs={
                'class': 'form-control', 
                'step': '0.01',
                'min': '0',
                'value': '0.00'
            }),
            'unit_of_measure': forms.TextInput(attrs={
                'class': 'form-control',
                'value': 'unité',
                'placeholder': 'Ex: heure, pièce, forfait'
            }),
            'discount_percent': forms.NumberInput(attrs={
                'class': 'form-control',
                'step': '0.01',
                'min': '0',
                'max': '100',
                'value': '0.00'
            }),
            'tax_rate': forms.NumberInput(attrs={
                'class': 'form-control',
                'step': '0.01',
                'min': '0',
                'max': '100',
                'value': '0.00'
            }),
            'notes': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Notes sur cet élément (optionnel)'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Rendre certains champs non requis
        self.fields['product_reference'].required = False
        self.fields['detailed_description'].required = False
        self.fields['unit_of_measure'].required = False
        self.fields['discount_percent'].required = False
        self.fields['tax_rate'].required = False
        self.fields['notes'].required = False
        
        # Valeurs par défaut
        if not self.instance.pk:
            self.fields['service_code'].initial = 'SVC-001'
            self.fields['quantity'].initial = 1
            self.fields['unit_price'].initial = 0.00
            self.fields['unit_of_measure'].initial = 'unité'
            self.fields['discount_percent'].initial = 0.00
            self.fields['tax_rate'].initial = 0.00

    def clean_quantity(self):
        quantity = self.cleaned_data.get('quantity')
        if quantity is not None and quantity <= 0:
            raise forms.ValidationError('La quantité doit être supérieure à 0.')
        return quantity

    def clean_unit_price(self):
        unit_price = self.cleaned_data.get('unit_price')
        if unit_price is not None and unit_price < 0:
            raise forms.ValidationError('Le prix unitaire ne peut pas être négatif.')
        return unit_price

    def clean_discount_percent(self):
        discount = self.cleaned_data.get('discount_percent')
        if discount is not None and (discount < 0 or discount > 100):
            raise forms.ValidationError('La remise doit être entre 0 et 100%.')
        return discount

    def clean_tax_rate(self):
        tax_rate = self.cleaned_data.get('tax_rate')
        if tax_rate is not None and (tax_rate < 0 or tax_rate > 100):
            raise forms.ValidationError('Le taux de taxe doit être entre 0 et 100%.')
        return tax_rate


# Formset pour les lignes de facture
InvoiceItemFormSet = inlineformset_factory(
    Invoice,
    InvoiceItem,
    form=InvoiceItemForm,
    extra=1,
    min_num=1,
    validate_min=True,
    can_delete=True
)


class InvoiceSearchForm(forms.Form):
    """Formulaire de recherche de factures"""
    
    search = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': _('Rechercher par numéro, titre...')
        }),
        label=_('Recherche')
    )
    
    status = forms.ChoiceField(
        required=False,
        choices=[('', _('Tous les statuts'))] + Invoice.STATUS_CHOICES,
        widget=forms.Select(attrs={'class': 'form-select'}),
        label=_('Statut')
    )
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'GET'
        self.helper.layout = Layout(
            Row(
                Column('search', css_class='form-group col-md-6 mb-0'),
                Column('status', css_class='form-group col-md-4 mb-0'),
                Column(
                    Submit('submit', _('Rechercher'), css_class='btn btn-primary'),
                    css_class='form-group col-md-2 mb-0 d-flex align-items-end'
                ),
            )
        )


