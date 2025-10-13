"""
API Views pour la gestion des comptes utilisateurs, préférences et permissions
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from .models import CustomUser, UserPreferences, UserPermissions, Organization
from apps.core.modules import (
    get_user_accessible_modules, 
    MODULE_METADATA, 
    PROFILE_METADATA,
    ProfileTypes,
    get_modules_for_profile
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_profile(request):
    """API profil utilisateur avec permissions et préférences"""
    
    user = request.user
    
    # Récupérer ou créer les préférences et permissions
    preferences, _ = UserPreferences.objects.get_or_create(user=user)
    permissions, _ = UserPermissions.objects.get_or_create(user=user)
    
    # Organisation modules (si l'utilisateur appartient à une organisation)
    organization_modules = []
    organization_name = None
    subscription_type = None
    if user.organization:
        organization_modules = user.organization.get_available_modules()
        organization_name = user.organization.name
        subscription_type = user.organization.subscription_type
    
    # Get user's actual accessible modules (intersection of org and user permissions)
    accessible_modules = get_user_accessible_modules(user)
    
    return Response({
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
            'subscription_type': subscription_type,
            'enabled_modules': organization_modules
        },
        'accessible_modules': accessible_modules,  # Actual modules user can access
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


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def api_user_preferences(request):
    """API pour gérer les préférences utilisateur"""
    preferences, _ = UserPreferences.objects.get_or_create(user=request.user)
    
    if request.method == 'GET':
        return Response({
            'enabled_modules': preferences.enabled_modules,
            'onboarding_completed': preferences.onboarding_completed,
            'onboarding_data': preferences.onboarding_data,
            'dashboard_layout': preferences.dashboard_layout,
            'notification_settings': preferences.notification_settings,
        })
    
    elif request.method == 'PUT':
        try:
            data = request.data
            
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
            
            return Response({
                'success': True,
                'message': 'Préférences mises à jour',
                'preferences': {
                    'enabled_modules': preferences.enabled_modules,
                    'onboarding_completed': preferences.onboarding_completed,
                    'onboarding_data': preferences.onboarding_data,
                }
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def api_organization_users(request):
    """API pour gérer les utilisateurs de l'organisation"""
    # Vérifier que l'utilisateur a les permissions
    permissions, _ = UserPermissions.objects.get_or_create(user=request.user)
    if not permissions.can_manage_users:
        return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)
    
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
            
            return Response({'users': users_data})
        else:
            return Response({'users': []})
    
    elif request.method == 'POST':
        # Créer un nouvel utilisateur
        try:
            data = request.data
            
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
                
                return Response({
                    'success': True,
                    'message': 'Utilisateur créé avec succès',
                    'user_id': str(user.id)
                })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def api_organization_user_detail(request, user_id):
    """API pour modifier ou supprimer un utilisateur"""
    # Vérifier les permissions
    permissions, _ = UserPermissions.objects.get_or_create(user=request.user)
    if not permissions.can_manage_users:
        return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        user = CustomUser.objects.get(id=user_id, organization=request.user.organization)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Utilisateur non trouvé'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'PUT':
        try:
            data = request.data
            
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
            
            return Response({
                'success': True,
                'message': 'Utilisateur mis à jour'
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        user.is_active = False
        user.save()
        return Response({
            'success': True,
            'message': 'Utilisateur désactivé'
        })


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def api_user_permissions(request, user_id):
    """API pour gérer les permissions d'un utilisateur"""
    # Vérifier que l'utilisateur a les permissions
    user_permissions, _ = UserPermissions.objects.get_or_create(user=request.user)
    if not user_permissions.can_manage_users:
        return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        user = CustomUser.objects.get(id=user_id, organization=request.user.organization)
        permissions, _ = UserPermissions.objects.get_or_create(user=user)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Utilisateur non trouvé'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        return Response({
            'can_manage_users': permissions.can_manage_users,
            'can_manage_settings': permissions.can_manage_settings,
            'can_view_analytics': permissions.can_view_analytics,
            'can_approve_purchases': permissions.can_approve_purchases,
            'module_access': permissions.module_access,
        })
    
    elif request.method == 'PUT':
        try:
            data = request.data
            
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
            
            return Response({
                'success': True,
                'message': 'Permissions mises à jour'
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_user_modules(request):
    """Get user's accessible modules with metadata"""
    user = request.user
    accessible_modules = get_user_accessible_modules(user)
    
    # Add metadata for each module
    modules_with_metadata = []
    for module_code in accessible_modules:
        metadata = MODULE_METADATA.get(module_code, {})
        modules_with_metadata.append({
            'code': module_code,
            'name': str(metadata.get('name', module_code)),
            'description': str(metadata.get('description', '')),
            'icon': metadata.get('icon', 'apps'),
            'always_enabled': metadata.get('always_enabled', False),
        })
    
    return Response({
        'modules': modules_with_metadata,
        'module_codes': accessible_modules,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_profile_types(request):
    """Get available profile types with their modules"""
    profiles = []
    for profile_type, metadata in PROFILE_METADATA.items():
        modules = get_modules_for_profile(profile_type)
        profiles.append({
            'type': profile_type,
            'name': str(metadata.get('name', profile_type)),
            'description': str(metadata.get('description', '')),
            'features': [str(f) for f in metadata.get('features', [])],
            'modules': modules,
        })
    
    return Response({'profiles': profiles})


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def api_organization_settings(request):
    """Manage organization module settings (admin only)"""
    user = request.user
    
    # Check if user has permission to manage settings
    permissions, _ = UserPermissions.objects.get_or_create(user=user)
    if not permissions.can_manage_settings:
        return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)
    
    if not user.organization:
        return Response({'error': 'Aucune organisation associée'}, status=status.HTTP_400_BAD_REQUEST)
    
    org = user.organization
    
    if request.method == 'GET':
        return Response({
            'subscription_type': org.subscription_type,
            'enabled_modules': org.get_available_modules(),
            'available_profile_types': list(PROFILE_METADATA.keys()),
        })
    
    elif request.method == 'PUT':
        try:
            data = request.data
            
            # Update subscription type if provided
            if 'subscription_type' in data:
                new_type = data['subscription_type']
                if new_type in PROFILE_METADATA:
                    # IMPORTANT: Sauvegarder d'abord le subscription_type
                    org.subscription_type = new_type
                    org.save(update_fields=['subscription_type', 'updated_at'])
                    
                    # Puis mettre à jour les modules basés sur le nouveau profil
                    org.update_modules_from_profile()
                else:
                    return Response(
                        {'error': 'Type d\'abonnement invalide'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Allow custom module selection if provided
            elif 'enabled_modules' in data:
                org.enabled_modules = data['enabled_modules']
                org.save()
            
            # Recharger l'organisation pour avoir les données fraîches
            org.refresh_from_db()
            
            return Response({
                'success': True,
                'message': 'Paramètres mis à jour',
                'subscription_type': org.subscription_type,
                'enabled_modules': org.get_available_modules(),
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

