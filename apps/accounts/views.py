from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.utils.translation import gettext as _
from django.contrib.auth import login
from django.urls import reverse_lazy
from django.views.generic import CreateView, UpdateView
from django.contrib.auth.mixins import LoginRequiredMixin

from .models import CustomUser, UserPreferences, Tenant
from .forms import UserProfileForm, UserPreferencesForm, TenantRegistrationForm


@login_required
def profile_view(request):
    """Vue du profil utilisateur"""
    user = request.user
    preferences, created = UserPreferences.objects.get_or_create(user=user)
    
    context = {
        'user': user,
        'preferences': preferences,
        'tenant': getattr(request, 'tenant', None),
    }
    
    return render(request, 'accounts/profile.html', context)


@login_required
def profile_edit(request):
    """Édition du profil utilisateur"""
    user = request.user
    preferences, created = UserPreferences.objects.get_or_create(user=user)
    
    if request.method == 'POST':
        user_form = UserProfileForm(request.POST, instance=user)
        preferences_form = UserPreferencesForm(request.POST, instance=preferences)
        
        if user_form.is_valid() and preferences_form.is_valid():
            user_form.save()
            preferences_form.save()
            messages.success(request, _('Profil mis à jour avec succès.'))
            return redirect('accounts:profile')
    else:
        user_form = UserProfileForm(instance=user)
        preferences_form = UserPreferencesForm(instance=preferences)
    
    context = {
        'user_form': user_form,
        'preferences_form': preferences_form,
    }
    
    return render(request, 'accounts/profile_edit.html', context)


class TenantRegistrationView(CreateView):
    """Vue d'inscription d'un nouveau tenant"""
    model = Tenant
    form_class = TenantRegistrationForm
    template_name = 'accounts/tenant_registration.html'
    success_url = reverse_lazy('accounts:registration_success')
    
    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(
            self.request, 
            _('Inscription réussie ! Votre compte sera activé sous peu.')
        )
        return response


@login_required
def tenant_settings(request):
    """Paramètres du tenant"""
    tenant = getattr(request, 'tenant', None)
    
    if not tenant:
        messages.error(request, _('Aucun tenant associé à ce compte.'))
        return redirect('core:dashboard')
    
    if request.method == 'POST':
        # Traitement des paramètres tenant
        ai_enabled = request.POST.get('ai_enabled') == 'on'
        ai_automation_level = request.POST.get('ai_automation_level')
        
        tenant.ai_enabled = ai_enabled
        tenant.ai_automation_level = ai_automation_level
        tenant.save()
        
        messages.success(request, _('Paramètres mis à jour avec succès.'))
        return redirect('accounts:tenant_settings')
    
    context = {
        'tenant': tenant,
        'ai_levels': [
            ('manual', _('Manuel uniquement')),
            ('assisted', _('Assisté par IA')),
            ('supervised', _('Automatisation supervisée')),
            ('full', _('Automatisation complète')),
        ]
    }
    
    return render(request, 'accounts/tenant_settings.html', context)


@login_required
def user_list(request):
    """Liste des utilisateurs du tenant"""
    if request.user.role not in ['admin', 'manager']:
        messages.error(request, _('Accès non autorisé.'))
        return redirect('core:dashboard')
    
    users = CustomUser.objects.all().order_by('last_name', 'first_name')
    
    context = {
        'users': users,
        'can_add_user': request.user.role == 'admin',
    }
    
    return render(request, 'accounts/user_list.html', context)


@login_required
@require_http_methods(["POST"])
def toggle_user_status(request, user_id):
    """Active/désactive un utilisateur"""
    if request.user.role != 'admin':
        return JsonResponse({'error': _('Accès non autorisé')}, status=403)
    
    try:
        user = CustomUser.objects.get(id=user_id)
        user.is_active = not user.is_active
        user.save()
        
        status = _('activé') if user.is_active else _('désactivé')
        return JsonResponse({
            'success': True,
            'message': _('Utilisateur {} avec succès.').format(status),
            'is_active': user.is_active
        })
    except CustomUser.DoesNotExist:
        return JsonResponse({'error': _('Utilisateur introuvable')}, status=404)


@login_required
def change_language(request):
    """Changement de langue utilisateur"""
    if request.method == 'POST':
        language = request.POST.get('language')
        if language in ['fr', 'en']:
            request.user.language = language
            request.user.save()
            
            # Activer la langue dans la session
            from django.utils import translation
            translation.activate(language)
            request.session[translation.LANGUAGE_SESSION_KEY] = language
            
            messages.success(request, _('Langue mise à jour avec succès.'))
    
    return redirect(request.META.get('HTTP_REFERER', 'core:dashboard'))


def registration_success(request):
    """Page de succès après inscription"""
    return render(request, 'accounts/registration_success.html')


def login_redirect(request):
    """Redirection après connexion selon le rôle"""
    user = request.user
    
    if not user.is_authenticated:
        return redirect('account_login')
    
    # Redirection selon le rôle
    if user.role == 'admin':
        return redirect('core:admin_dashboard')
    elif user.role in ['manager', 'accountant']:
        return redirect('core:manager_dashboard')
    else:
        return redirect('core:dashboard')


@login_required
def api_user_search(request):
    """API de recherche d'utilisateurs (pour autocomplete)"""
    query = request.GET.get('q', '')
    
    if len(query) < 2:
        return JsonResponse({'results': []})
    
    users = CustomUser.objects.filter(
        first_name__icontains=query
    ).values('id', 'first_name', 'last_name', 'email')[:10]
    
    results = [
        {
            'id': str(user['id']),
            'text': f"{user['first_name']} {user['last_name']} ({user['email']})"
        }
        for user in users
    ]
    
    return JsonResponse({'results': results})