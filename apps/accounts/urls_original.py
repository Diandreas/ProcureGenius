from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    # Profil utilisateur
    path('profile/', views.profile_view, name='profile'),
    path('profile/edit/', views.profile_edit, name='profile_edit'),
    
    # Gestion des utilisateurs
    path('users/', views.user_list, name='user_list'),
    path('users/<uuid:user_id>/toggle-status/', views.toggle_user_status, name='toggle_user_status'),
    
    # Paramètres tenant
    path('tenant/settings/', views.tenant_settings, name='tenant_settings'),
    path('tenant/register/', views.TenantRegistrationView.as_view(), name='tenant_register'),
    path('registration/success/', views.registration_success, name='registration_success'),
    
    # Utilitaires
    path('change-language/', views.change_language, name='change_language'),
    path('login-redirect/', views.login_redirect, name='login_redirect'),
    
    # APIs
    path('api/user-search/', views.api_user_search, name='api_user_search'),
]