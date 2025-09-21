from django import forms
from django.utils.translation import gettext_lazy as _
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Fieldset, Submit, Row, Column, Div, HTML
from django.contrib.auth import get_user_model

from .models import Supplier

User = get_user_model()


class SupplierForm(forms.ModelForm):
    """Formulaire de création/modification de fournisseur"""
    
    class Meta:
        model = Supplier
        fields = [
            'name', 'contact_person', 'email', 'phone', 'address', 'is_active'
        ]
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'contact_person': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'phone': forms.TextInput(attrs={'class': 'form-control'}),
            'address': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'is_active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.layout = Layout(
            Fieldset(
                _('Informations générales'),
                'name',
            ),
            Fieldset(
                _('Contact'),
                Row(
                    Column('contact_person', css_class='form-group col-md-6 mb-0'),
                    Column('email', css_class='form-group col-md-6 mb-0'),
                ),
                'phone',
            ),
            Fieldset(
                _('Adresse'),
                'address',
            ),
            Fieldset(
                _('Statut'),
                'is_active',
            ),
            Submit('submit', _('Enregistrer'), css_class='btn btn-primary')
        )
