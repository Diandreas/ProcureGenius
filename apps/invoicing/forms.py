from django import forms
from django.forms import inlineformset_factory
from django.utils.translation import gettext_lazy as _
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Fieldset, Submit, Row, Column, Div, HTML
from django.contrib.auth import get_user_model

from .models import (
    Invoice, InvoiceItem, Payment, RecurringInvoice, 
    InvoiceTemplate, InvoiceReminder
)
from apps.suppliers.models import Client
from apps.purchase_orders.models import PurchaseOrder

User = get_user_model()


class InvoiceForm(forms.ModelForm):
    """Formulaire principal de facture"""
    
    class Meta:
        model = Invoice
        fields = [
            'client', 'purchase_order', 'invoice_date', 'due_date',
            'billing_address', 'payment_terms', 'payment_method',
            'notes', 'terms_conditions', 'is_recurring', 'recurring_pattern'
        ]
        widgets = {
            'client': forms.Select(attrs={'class': 'form-select'}),
            'purchase_order': forms.Select(attrs={'class': 'form-select'}),
            'invoice_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'due_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'billing_address': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'payment_terms': forms.TextInput(attrs={'class': 'form-control'}),
            'payment_method': forms.TextInput(attrs={'class': 'form-control'}),
            'notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'terms_conditions': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
            'recurring_pattern': forms.Select(attrs={'class': 'form-select'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Filtrer les clients actifs
        self.fields['client'].queryset = Client.objects.filter(is_active=True).order_by('name')
        
        # Filtrer les bons de commande reçus
        self.fields['purchase_order'].queryset = PurchaseOrder.objects.filter(
            status__in=['received', 'invoiced']
        ).select_related('supplier').order_by('-created_at')
        self.fields['purchase_order'].required = False
        
        # Valeur par défaut pour la date de facture
        if not self.instance.pk:
            from django.utils import timezone
            self.fields['invoice_date'].initial = timezone.now().date()
        
        self.helper = FormHelper()
        self.helper.layout = Layout(
            Fieldset(
                _('Informations générales'),
                Row(
                    Column('client', css_class='form-group col-md-8 mb-0'),
                    Column('purchase_order', css_class='form-group col-md-4 mb-0'),
                ),
                Row(
                    Column('invoice_date', css_class='form-group col-md-4 mb-0'),
                    Column('due_date', css_class='form-group col-md-4 mb-0'),
                    Column('payment_terms', css_class='form-group col-md-4 mb-0'),
                ),
                'payment_method',
            ),
            Fieldset(
                _('Adresse de facturation'),
                'billing_address',
            ),
            Fieldset(
                _('Facturation récurrente'),
                Row(
                    Column(
                        Div('is_recurring', css_class='form-check'),
                        css_class='form-group col-md-6 mb-0'
                    ),
                    Column('recurring_pattern', css_class='form-group col-md-6 mb-0'),
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
        invoice_date = cleaned_data.get('invoice_date')
        due_date = cleaned_data.get('due_date')
        is_recurring = cleaned_data.get('is_recurring')
        recurring_pattern = cleaned_data.get('recurring_pattern')
        
        if invoice_date and due_date and due_date < invoice_date:
            raise forms.ValidationError(_('La date d\'échéance ne peut pas être antérieure à la date de facture.'))
        
        if is_recurring and not recurring_pattern:
            raise forms.ValidationError(_('Vous devez spécifier une fréquence pour la facturation récurrente.'))
        
        return cleaned_data


class InvoiceItemForm(forms.ModelForm):
    """Formulaire pour les lignes de facture"""
    
    class Meta:
        model = InvoiceItem
        fields = [
            'description', 'quantity', 'unit_price', 'account_code'
        ]
        widgets = {
            'description': forms.TextInput(attrs={'class': 'form-control'}),
            'quantity': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'unit_price': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'account_code': forms.TextInput(attrs={'class': 'form-control'}),
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


class PaymentForm(forms.ModelForm):
    """Formulaire d'enregistrement de paiement"""
    
    class Meta:
        model = Payment
        fields = [
            'amount', 'payment_date', 'payment_method', 
            'reference', 'notes'
        ]
        widgets = {
            'amount': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'payment_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'payment_method': forms.Select(attrs={'class': 'form-select'}),
            'reference': forms.TextInput(attrs={'class': 'form-control'}),
            'notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Date par défaut = aujourd'hui
        if not self.instance.pk:
            from django.utils import timezone
            self.fields['payment_date'].initial = timezone.now().date()
        
        self.helper = FormHelper()
        self.helper.layout = Layout(
            Row(
                Column('amount', css_class='form-group col-md-6 mb-0'),
                Column('payment_date', css_class='form-group col-md-6 mb-0'),
            ),
            Row(
                Column('payment_method', css_class='form-group col-md-6 mb-0'),
                Column('reference', css_class='form-group col-md-6 mb-0'),
            ),
            'notes',
            Submit('submit', _('Enregistrer le paiement'), css_class='btn btn-primary')
        )


class InvoiceSearchForm(forms.Form):
    """Formulaire de recherche de factures"""
    
    search = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': _('Rechercher par numéro, client...')
        }),
        label=_('Recherche')
    )
    
    status = forms.ChoiceField(
        required=False,
        choices=[('', _('Tous les statuts'))] + list(Invoice.status.field.choices),
        widget=forms.Select(attrs={'class': 'form-select'}),
        label=_('Statut')
    )
    
    client = forms.ModelChoiceField(
        required=False,
        queryset=Client.objects.filter(is_active=True),
        widget=forms.Select(attrs={'class': 'form-select'}),
        label=_('Client'),
        empty_label=_('Tous les clients')
    )
    
    overdue_only = forms.BooleanField(
        required=False,
        widget=forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        label=_('Factures en retard uniquement')
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

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'GET'
        self.helper.layout = Layout(
            Row(
                Column('search', css_class='form-group col-md-3 mb-0'),
                Column('status', css_class='form-group col-md-2 mb-0'),
                Column('client', css_class='form-group col-md-3 mb-0'),
                Column(
                    Div('overdue_only', css_class='form-check mt-2'),
                    css_class='form-group col-md-2 mb-0'
                ),
                Column(
                    Submit('submit', _('Rechercher'), css_class='btn btn-primary'),
                    css_class='form-group col-md-2 mb-0 d-flex align-items-end'
                ),
            ),
            Row(
                Column('date_from', css_class='form-group col-md-3 mb-0'),
                Column('date_to', css_class='form-group col-md-3 mb-0'),
                Column(
                    HTML('<a href="{% url \'invoicing:list\' %}" class="btn btn-outline-secondary">{% trans "Réinitialiser" %}</a>'),
                    css_class='form-group col-md-6 mb-0 d-flex align-items-end'
                ),
            )
        )


class RecurringInvoiceForm(forms.ModelForm):
    """Formulaire de facture récurrente"""
    
    class Meta:
        model = RecurringInvoice
        fields = [
            'name', 'description', 'client', 'frequency', 
            'start_date', 'end_date'
        ]
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'client': forms.Select(attrs={'class': 'form-select'}),
            'frequency': forms.Select(attrs={'class': 'form-select'}),
            'start_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'end_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['client'].queryset = Client.objects.filter(is_active=True).order_by('name')
        self.fields['end_date'].required = False
        
        self.helper = FormHelper()
        self.helper.layout = Layout(
            'name',
            'client',
            'description',
            Row(
                Column('frequency', css_class='form-group col-md-4 mb-0'),
                Column('start_date', css_class='form-group col-md-4 mb-0'),
                Column('end_date', css_class='form-group col-md-4 mb-0'),
            ),
            Submit('submit', _('Créer la facturation récurrente'), css_class='btn btn-primary')
        )

    def clean(self):
        cleaned_data = super().clean()
        start_date = cleaned_data.get('start_date')
        end_date = cleaned_data.get('end_date')
        
        if start_date and end_date and end_date <= start_date:
            raise forms.ValidationError(_('La date de fin doit être postérieure à la date de début.'))
        
        return cleaned_data


class InvoiceTemplateForm(forms.ModelForm):
    """Formulaire de template de facture"""
    
    class Meta:
        model = InvoiceTemplate
        fields = ['name', 'description', 'client']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'client': forms.Select(attrs={'class': 'form-select'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['client'].queryset = Client.objects.filter(is_active=True).order_by('name')
        self.fields['client'].required = False
        
        self.helper = FormHelper()
        self.helper.layout = Layout(
            'name',
            'client',
            'description',
            Submit('submit', _('Créer le template'), css_class='btn btn-primary')
        )


class InvoiceReminderForm(forms.ModelForm):
    """Formulaire de relance manuelle"""
    
    class Meta:
        model = InvoiceReminder
        fields = ['reminder_type', 'email_subject', 'email_body']
        widgets = {
            'reminder_type': forms.Select(attrs={'class': 'form-select'}),
            'email_subject': forms.TextInput(attrs={'class': 'form-control'}),
            'email_body': forms.Textarea(attrs={'class': 'form-control', 'rows': 6}),
        }

    def __init__(self, *args, **kwargs):
        invoice = kwargs.pop('invoice', None)
        super().__init__(*args, **kwargs)
        
        # Pré-remplir avec des templates par défaut
        if invoice and not self.instance.pk:
            reminder_templates = {
                'first': {
                    'subject': f'Rappel - Facture {invoice.number}',
                    'body': f'''Bonjour {invoice.client.contact_person},

Nous vous rappelons que la facture {invoice.number} d'un montant de {invoice.total_amount} arrive à échéance le {invoice.due_date}.

Merci de procéder au paiement dans les plus brefs délais.

Cordialement,
L'équipe comptabilité'''
                },
                'second': {
                    'subject': f'2ème rappel - Facture {invoice.number}',
                    'body': f'''Bonjour {invoice.client.contact_person},

Malgré notre premier rappel, nous constatons que la facture {invoice.number} d'un montant de {invoice.total_amount} n'a toujours pas été réglée.

Cette facture était due le {invoice.due_date}.

Merci de régulariser votre situation rapidement.

Cordialement,
L'équipe comptabilité'''
                }
            }
            
            template = reminder_templates.get('first', {})
            self.fields['email_subject'].initial = template.get('subject', '')
            self.fields['email_body'].initial = template.get('body', '')
        
        self.helper = FormHelper()
        self.helper.layout = Layout(
            'reminder_type',
            'email_subject',
            'email_body',
            Submit('submit', _('Envoyer la relance'), css_class='btn btn-primary')
        )


class BulkInvoiceActionForm(forms.Form):
    """Formulaire pour actions en lot sur les factures"""
    
    ACTION_CHOICES = [
        ('', _('Choisir une action')),
        ('send', _('Envoyer par email')),
        ('send_reminder', _('Envoyer relance')),
        ('mark_paid', _('Marquer comme payées')),
        ('cancel', _('Annuler')),
        ('export', _('Exporter')),
    ]
    
    action = forms.ChoiceField(
        choices=ACTION_CHOICES,
        widget=forms.Select(attrs={'class': 'form-select'}),
        label=_('Action')
    )
    
    invoices = forms.ModelMultipleChoiceField(
        queryset=Invoice.objects.all(),
        widget=forms.CheckboxSelectMultiple,
        label=_('Factures')
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
            self.fields['invoices'].queryset = queryset


class PayPalPaymentForm(forms.Form):
    """Formulaire pour paiement PayPal"""
    
    amount = forms.DecimalField(
        max_digits=14, decimal_places=2,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'step': '0.01',
            'readonly': True
        }),
        label=_('Montant à payer')
    )
    
    currency = forms.CharField(
        max_length=3,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'readonly': True
        }),
        initial='CAD',
        label=_('Devise')
    )
    
    payer_email = forms.EmailField(
        required=False,
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': _('Votre email (optionnel)')
        }),
        label=_('Email du payeur')
    )

    def __init__(self, *args, **kwargs):
        invoice = kwargs.pop('invoice', None)
        super().__init__(*args, **kwargs)
        
        if invoice:
            balance = invoice.get_balance_due()
            self.fields['amount'].initial = balance.amount
            self.fields['currency'].initial = str(balance.currency)
        
        self.helper = FormHelper()
        self.helper.layout = Layout(
            'amount',
            'currency',
            'payer_email',
            HTML('''
                <div class="text-center mt-3">
                    <p class="text-muted">{% trans "Vous serez redirigé vers PayPal pour finaliser le paiement" %}</p>
                </div>
            '''),
            Submit('submit', _('Payer avec PayPal'), css_class='btn btn-primary btn-lg w-100')
        )


class QuickInvoiceForm(forms.Form):
    """Formulaire rapide pour création de facture via IA"""
    
    client = forms.ModelChoiceField(
        queryset=Client.objects.filter(is_active=True),
        widget=forms.Select(attrs={'class': 'form-select'}),
        label=_('Client')
    )
    
    description = forms.CharField(
        widget=forms.Textarea(attrs={
            'class': 'form-control',
            'rows': 3,
            'placeholder': _('Décrivez les services/produits à facturer...')
        }),
        label=_('Description des services')
    )
    
    amount = forms.DecimalField(
        max_digits=14, decimal_places=2,
        required=False,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'step': '0.01',
            'placeholder': _('Montant (optionnel)')
        }),
        label=_('Montant estimé')
    )
    
    due_date = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
        label=_('Date d\'échéance souhaitée')
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.layout = Layout(
            'client',
            'description',
            Row(
                Column('amount', css_class='form-group col-md-6 mb-0'),
                Column('due_date', css_class='form-group col-md-6 mb-0'),
            ),
            Submit('submit', _('Créer avec l\'IA'), css_class='btn btn-primary')
        )