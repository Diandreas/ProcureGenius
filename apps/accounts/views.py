from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
import json
from .models import CustomUser, UserPreferences, UserPermissions, Organization


def profile(request):
    """Profil utilisateur simplifié"""
    if request.user.is_authenticated:
        return render(request, 'accounts/profile.html', {
            'user': request.user
        })
    return redirect('login')


def dashboard(request):
    """Tableau de bord simplifié"""
    if request.user.is_authenticated:
        return render(request, 'core/dashboard.html', {
            'user': request.user
        })
    return redirect('login')


def api_profile(request):
    """API profil utilisateur avec permissions et préférences"""
    if request.user.is_authenticated:
        user = request.user
        
        # Récupérer ou créer les préférences et permissions
        preferences, _ = UserPreferences.objects.get_or_create(user=user)
        permissions, _ = UserPermissions.objects.get_or_create(user=user)
        
        # Organisation modules (si l'utilisateur appartient à une organisation)
        organization_modules = []
        organization_name = None
        if user.organization:
            organization_modules = user.organization.enabled_modules
            organization_name = user.organization.name
        
        return JsonResponse({
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone': user.phone,
            'company': user.company,
            'role': user.role,
            'organization': {
                'id': str(user.organization.id) if user.organization else None,
                'name': organization_name,
                'enabled_modules': organization_modules
            },
            'preferences': {
                'enabled_modules': preferences.enabled_modules,
                'onboarding_completed': preferences.onboarding_completed,
                'onboarding_data': preferences.onboarding_data,
            },
            'permissions': {
                'can_manage_users': permissions.can_manage_users,
                'can_manage_settings': permissions.can_manage_settings,
                'can_view_analytics': permissions.can_view_analytics,
                'can_approve_purchases': permissions.can_approve_purchases,
                'module_access': permissions.module_access,
            }
        })
    return JsonResponse({'error': 'Non authentifié'}, status=401)


@csrf_exempt
@require_http_methods(["GET", "PUT"])
def api_user_preferences(request):
    """API pour gérer les préférences utilisateur"""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Non authentifié'}, status=401)
    
    preferences, _ = UserPreferences.objects.get_or_create(user=request.user)
    
    if request.method == 'GET':
        return JsonResponse({
            'enabled_modules': preferences.enabled_modules,
            'onboarding_completed': preferences.onboarding_completed,
            'onboarding_data': preferences.onboarding_data,
            'dashboard_layout': preferences.dashboard_layout,
            'notification_settings': preferences.notification_settings,
        })
    
    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            
            # Mettre à jour les champs si fournis
            if 'enabled_modules' in data:
                preferences.enabled_modules = data['enabled_modules']
            if 'onboarding_completed' in data:
                preferences.onboarding_completed = data['onboarding_completed']
            if 'onboarding_data' in data:
                preferences.onboarding_data = data['onboarding_data']
            if 'dashboard_layout' in data:
                preferences.dashboard_layout = data['dashboard_layout']
            if 'notification_settings' in data:
                preferences.notification_settings = data['notification_settings']
            
            preferences.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Préférences mises à jour',
                'preferences': {
                    'enabled_modules': preferences.enabled_modules,
                    'onboarding_completed': preferences.onboarding_completed,
                    'onboarding_data': preferences.onboarding_data,
                }
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def api_organization_users(request):
    """API pour gérer les utilisateurs de l'organisation"""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Non authentifié'}, status=401)
    
    # Vérifier que l'utilisateur a les permissions
    permissions, _ = UserPermissions.objects.get_or_create(user=request.user)
    if not permissions.can_manage_users:
        return JsonResponse({'error': 'Permission refusée'}, status=403)
    
    if request.method == 'GET':
        # Lister tous les utilisateurs de l'organisation
        if request.user.organization:
            users = CustomUser.objects.filter(organization=request.user.organization)
            users_data = []
            
            for user in users:
                user_perms, _ = UserPermissions.objects.get_or_create(user=user)
                user_prefs, _ = UserPreferences.objects.get_or_create(user=user)
                
                users_data.append({
                    'id': str(user.id),
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': user.role,
                    'is_active': user.is_active,
                    'phone': user.phone,
                    'enabled_modules': user_prefs.enabled_modules,
                    'permissions': {
                        'can_manage_users': user_perms.can_manage_users,
                        'can_manage_settings': user_perms.can_manage_settings,
                        'can_view_analytics': user_perms.can_view_analytics,
                        'can_approve_purchases': user_perms.can_approve_purchases,
                        'module_access': user_perms.module_access,
                    }
                })
            
            return JsonResponse({'users': users_data})
        else:
            return JsonResponse({'users': []})
    
    elif request.method == 'POST':
        # Créer un nouvel utilisateur
        try:
            data = json.loads(request.body)
            
            with transaction.atomic():
                # Créer l'utilisateur
                user = CustomUser.objects.create_user(
                    username=data.get('email'),  # Utiliser email comme username
                    email=data['email'],
                    first_name=data.get('first_name', ''),
                    last_name=data.get('last_name', ''),
                    password=data.get('password', 'temp_password_123'),  # Mot de passe temporaire
                    role=data.get('role', 'buyer'),
                    organization=request.user.organization
                )
                
                # Les préférences et permissions seront créées automatiquement par le signal
                
                return JsonResponse({
                    'success': True,
                    'message': 'Utilisateur créé avec succès',
                    'user_id': str(user.id)
                })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["PUT", "DELETE"])
def api_organization_user_detail(request, user_id):
    """API pour modifier ou supprimer un utilisateur"""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Non authentifié'}, status=401)
    
    # Vérifier les permissions
    permissions, _ = UserPermissions.objects.get_or_create(user=request.user)
    if not permissions.can_manage_users:
        return JsonResponse({'error': 'Permission refusée'}, status=403)
    
    try:
        user = CustomUser.objects.get(id=user_id, organization=request.user.organization)
    except CustomUser.DoesNotExist:
        return JsonResponse({'error': 'Utilisateur non trouvé'}, status=404)
    
    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            
            # Mettre à jour les champs de base
            if 'first_name' in data:
                user.first_name = data['first_name']
            if 'last_name' in data:
                user.last_name = data['last_name']
            if 'email' in data:
                user.email = data['email']
            if 'role' in data:
                user.role = data['role']
            if 'is_active' in data:
                user.is_active = data['is_active']
            
            user.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Utilisateur mis à jour'
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    
    elif request.method == 'DELETE':
        user.is_active = False
        user.save()
        return JsonResponse({
            'success': True,
            'message': 'Utilisateur désactivé'
        })


@csrf_exempt
@require_http_methods(["GET", "PUT"])
def api_user_permissions(request, user_id):
    """API pour gérer les permissions d'un utilisateur"""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Non authentifié'}, status=401)
    
    # Vérifier que l'utilisateur a les permissions
    user_permissions, _ = UserPermissions.objects.get_or_create(user=request.user)
    if not user_permissions.can_manage_users:
        return JsonResponse({'error': 'Permission refusée'}, status=403)
    
    try:
        user = CustomUser.objects.get(id=user_id, organization=request.user.organization)
        permissions, _ = UserPermissions.objects.get_or_create(user=user)
    except CustomUser.DoesNotExist:
        return JsonResponse({'error': 'Utilisateur non trouvé'}, status=404)
    
    if request.method == 'GET':
        return JsonResponse({
            'can_manage_users': permissions.can_manage_users,
            'can_manage_settings': permissions.can_manage_settings,
            'can_view_analytics': permissions.can_view_analytics,
            'can_approve_purchases': permissions.can_approve_purchases,
            'module_access': permissions.module_access,
        })
    
    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            
            if 'can_manage_users' in data:
                permissions.can_manage_users = data['can_manage_users']
            if 'can_manage_settings' in data:
                permissions.can_manage_settings = data['can_manage_settings']
            if 'can_view_analytics' in data:
                permissions.can_view_analytics = data['can_view_analytics']
            if 'can_approve_purchases' in data:
                permissions.can_approve_purchases = data['can_approve_purchases']
            if 'module_access' in data:
                permissions.module_access = data['module_access']
            
            permissions.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Permissions mises à jour'
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
