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
        fields = ['description', 'quantity', 'unit_price']
        widgets = {
            'description': forms.TextInput(attrs={'class': 'form-control'}),
            'quantity': forms.NumberInput(attrs={'class': 'form-control', 'step': '1'}),
            'unit_price': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
        }


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

