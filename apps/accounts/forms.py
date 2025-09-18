from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.utils.translation import gettext_lazy as _
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Fieldset, Submit, Row, Column

from .models import CustomUser, UserPreferences, Tenant


class UserProfileForm(forms.ModelForm):
    """Formulaire de profil utilisateur"""
    
    class Meta:
        model = CustomUser
        fields = [
            'first_name', 'last_name', 'email', 'phone', 
            'language', 'ai_notifications', 'ai_auto_approve_limit'
        ]
        widgets = {
            'first_name': forms.TextInput(attrs={'class': 'form-control'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'phone': forms.TextInput(attrs={'class': 'form-control'}),
            'language': forms.Select(attrs={'class': 'form-select'}),
            'ai_notifications': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'ai_auto_approve_limit': forms.NumberInput(attrs={'class': 'form-control'}),
        }
        labels = {
            'first_name': _('Prénom'),
            'last_name': _('Nom'),
            'email': _('Email'),
            'phone': _('Téléphone'),
            'language': _('Langue'),
            'ai_notifications': _('Notifications IA'),
            'ai_auto_approve_limit': _('Limite d\'approbation automatique IA'),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.layout = Layout(
            Fieldset(
                _('Informations personnelles'),
                Row(
                    Column('first_name', css_class='form-group col-md-6 mb-0'),
                    Column('last_name', css_class='form-group col-md-6 mb-0'),
                ),
                Row(
                    Column('email', css_class='form-group col-md-8 mb-0'),
                    Column('phone', css_class='form-group col-md-4 mb-0'),
                ),
                'language',
            ),
            Fieldset(
                _('Préférences IA'),
                'ai_notifications',
                'ai_auto_approve_limit',
            ),
            Submit('submit', _('Enregistrer'), css_class='btn btn-primary')
        )


class UserPreferencesForm(forms.ModelForm):
    """Formulaire des préférences utilisateur"""
    
    class Meta:
        model = UserPreferences
        fields = ['dashboard_layout', 'notification_settings']
        widgets = {
            'dashboard_layout': forms.HiddenInput(),
            'notification_settings': forms.HiddenInput(),
        }


class TenantRegistrationForm(forms.ModelForm):
    """Formulaire d'inscription d'un nouveau tenant"""
    
    admin_first_name = forms.CharField(
        max_length=30, 
        label=_('Prénom de l\'administrateur')
    )
    admin_last_name = forms.CharField(
        max_length=30, 
        label=_('Nom de l\'administrateur')
    )
    admin_email = forms.EmailField(
        label=_('Email de l\'administrateur')
    )
    admin_password1 = forms.CharField(
        widget=forms.PasswordInput,
        label=_('Mot de passe')
    )
    admin_password2 = forms.CharField(
        widget=forms.PasswordInput,
        label=_('Confirmation du mot de passe')
    )
    
    class Meta:
        model = Tenant
        fields = [
            'name', 'business_number', 'address', 'city', 
            'province', 'postal_code', 'phone', 'email'
        ]
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'business_number': forms.TextInput(attrs={'class': 'form-control'}),
            'address': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'city': forms.TextInput(attrs={'class': 'form-control'}),
            'province': forms.Select(attrs={'class': 'form-select'}),
            'postal_code': forms.TextInput(attrs={'class': 'form-control'}),
            'phone': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
        }
        labels = {
            'name': _('Nom de l\'entreprise'),
            'business_number': _('Numéro d\'entreprise'),
            'address': _('Adresse'),
            'city': _('Ville'),
            'province': _('Province'),
            'postal_code': _('Code postal'),
            'phone': _('Téléphone'),
            'email': _('Email de l\'entreprise'),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.layout = Layout(
            Fieldset(
                _('Informations de l\'entreprise'),
                'name',
                'business_number',
                'address',
                Row(
                    Column('city', css_class='form-group col-md-6 mb-0'),
                    Column('province', css_class='form-group col-md-3 mb-0'),
                    Column('postal_code', css_class='form-group col-md-3 mb-0'),
                ),
                Row(
                    Column('phone', css_class='form-group col-md-6 mb-0'),
                    Column('email', css_class='form-group col-md-6 mb-0'),
                ),
            ),
            Fieldset(
                _('Administrateur principal'),
                Row(
                    Column('admin_first_name', css_class='form-group col-md-6 mb-0'),
                    Column('admin_last_name', css_class='form-group col-md-6 mb-0'),
                ),
                'admin_email',
                Row(
                    Column('admin_password1', css_class='form-group col-md-6 mb-0'),
                    Column('admin_password2', css_class='form-group col-md-6 mb-0'),
                ),
            ),
            Submit('submit', _('Créer le compte'), css_class='btn btn-primary')
        )

    def clean_admin_password2(self):
        password1 = self.cleaned_data.get("admin_password1")
        password2 = self.cleaned_data.get("admin_password2")
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError(_("Les mots de passe ne correspondent pas."))
        return password2

    def save(self, commit=True):
        tenant = super().save(commit=False)
        
        if commit:
            # Générer un schema_name unique basé sur le nom de l'entreprise
            import re
            schema_name = re.sub(r'[^a-zA-Z0-9]', '', tenant.name.lower())[:60]
            
            # Vérifier l'unicité
            counter = 1
            original_schema = schema_name
            while Tenant.objects.filter(schema_name=schema_name).exists():
                schema_name = f"{original_schema}{counter}"
                counter += 1
            
            tenant.schema_name = schema_name
            tenant.save()
            
            # Créer l'utilisateur administrateur
            admin_user = CustomUser.objects.create_user(
                username=self.cleaned_data['admin_email'],
                email=self.cleaned_data['admin_email'],
                first_name=self.cleaned_data['admin_first_name'],
                last_name=self.cleaned_data['admin_last_name'],
                password=self.cleaned_data['admin_password1'],
                role='admin'
            )
        
        return tenant


class UserCreationForm(UserCreationForm):
    """Formulaire de création d'utilisateur personnalisé"""
    
    class Meta:
        model = CustomUser
        fields = ['username', 'email', 'first_name', 'last_name', 'role', 'language']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.layout = Layout(
            Fieldset(
                _('Informations de connexion'),
                'username',
                'email',
                Row(
                    Column('password1', css_class='form-group col-md-6 mb-0'),
                    Column('password2', css_class='form-group col-md-6 mb-0'),
                ),
            ),
            Fieldset(
                _('Informations personnelles'),
                Row(
                    Column('first_name', css_class='form-group col-md-6 mb-0'),
                    Column('last_name', css_class='form-group col-md-6 mb-0'),
                ),
                Row(
                    Column('role', css_class='form-group col-md-6 mb-0'),
                    Column('language', css_class='form-group col-md-6 mb-0'),
                ),
            ),
            Submit('submit', _('Créer l\'utilisateur'), css_class='btn btn-primary')
        )