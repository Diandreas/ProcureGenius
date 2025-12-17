"""
API Views pour la gestion des comptes utilisateurs, préférences et permissions
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from .models import CustomUser, UserPreferences, UserPermissions, Organization, EmailConfiguration
from apps.core.encryption import encrypt_value, decrypt_value
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


@api_view(['GET', 'POST', 'PUT'])
@permission_classes([IsAuthenticated])
def api_organization_settings(request):
    """Manage organization settings (company info, logo, tax settings)"""
    from apps.core.models import OrganizationSettings

    user = request.user

    if not user.organization:
        return Response(
            {'error': 'No organization assigned to user'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get or create organization settings
    org_settings, _ = OrganizationSettings.objects.get_or_create(
        organization=user.organization
    )

    if request.method == 'GET':
        # Return organization settings
        return Response({
            'company_name': org_settings.company_name,
            'company_address': org_settings.company_address,
            'company_phone': org_settings.company_phone,
            'company_email': org_settings.company_email,
            'company_website': org_settings.company_website,
            'company_logo': org_settings.company_logo.url if org_settings.company_logo else None,
            'tax_region': org_settings.tax_region,
            'company_niu': org_settings.company_niu,
            'company_rc_number': org_settings.company_rc_number,
            'company_rccm_number': org_settings.company_rccm_number,
            'company_tax_number': org_settings.company_tax_number,
            'company_vat_number': org_settings.company_vat_number,
            'company_gst_number': org_settings.company_gst_number,
            'company_qst_number': org_settings.company_qst_number,
            'company_neq': org_settings.company_neq,
            'default_currency': org_settings.default_currency,
            'default_tax_rate': float(org_settings.default_tax_rate),
            'enabled_modules': user.organization.enabled_modules or [],
            'subscription_type': user.organization.subscription_type,
        })

    elif request.method in ['POST', 'PUT']:
        try:
            # Update organization settings
            # Handle text fields
            text_fields = [
                'company_name', 'company_address', 'company_phone', 'company_email',
                'company_website', 'tax_region', 'company_niu', 'company_rc_number',
                'company_rccm_number', 'company_tax_number', 'company_vat_number',
                'company_gst_number', 'company_qst_number', 'company_neq',
                'default_currency'
            ]

            for field in text_fields:
                if field in request.data:
                    setattr(org_settings, field, request.data[field])

            # Handle numeric fields
            if 'default_tax_rate' in request.data:
                org_settings.default_tax_rate = float(request.data['default_tax_rate'])

            # Handle logo upload
            if 'company_logo' in request.FILES:
                org_settings.company_logo = request.FILES['company_logo']

            org_settings.save()

            # Update Organization model fields (subscription_type, enabled_modules)
            organization = user.organization
            if organization:
                org_updated = False
                if 'subscription_type' in request.data:
                    organization.subscription_type = request.data['subscription_type']
                    # Auto-update modules based on profile if not explicitly provided
                    if 'enabled_modules' not in request.data:
                        organization.update_modules_from_profile()
                    org_updated = True
                
                if 'enabled_modules' in request.data:
                    import json
                    # FormData sends as string, need to parse JSON
                    modules_data = request.data['enabled_modules']
                    modules = json.loads(modules_data) if isinstance(modules_data, str) else modules_data
                    organization.enabled_modules = modules
                    org_updated = True
                
                if org_updated:
                    organization.save()

            return Response({
                'success': True,
                'message': 'Paramètres de l\'organisation mis à jour',
                'company_logo': org_settings.company_logo.url if org_settings.company_logo else None,
            })

        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la mise à jour: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    # Fallback pour les méthodes non gérées (ne devrait jamais arriver)
    return Response(
        {'error': 'Méthode non supportée'},
        status=status.HTTP_405_METHOD_NOT_ALLOWED
    )


@api_view(['GET', 'POST', 'PATCH'])
@permission_classes([IsAuthenticated])
def email_config(request):
    """
    GET/POST/PATCH /api/accounts/email-config/
    
    Gère la configuration email SMTP de l'organisation
    """
    organization = request.user.organization
    
    if not organization:
        return Response(
            {'error': 'User must belong to an organization'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if request.method == 'GET':
        try:
            config = EmailConfiguration.objects.filter(organization=organization).first()
            
            if not config:
                return Response({
                    'exists': False,
                    'config': None
                })
            
            return Response({
                'exists': True,
                'config': {
                    'id': str(config.id),
                    'smtp_host': config.smtp_host,
                    'smtp_port': config.smtp_port,
                    'smtp_username': config.smtp_username,
                    'use_tls': config.use_tls,
                    'use_ssl': config.use_ssl,
                    'default_from_email': config.default_from_email,
                    'default_from_name': config.default_from_name,
                    'is_verified': config.is_verified,
                    'last_verified_at': config.last_verified_at.isoformat() if config.last_verified_at else None,
                }
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    elif request.method == 'POST':
        # Créer une nouvelle configuration
        try:
            data = request.data
            
            # Chiffrer le mot de passe
            password = data.get('smtp_password', '').strip()
            # Supprimer tous les espaces (important pour Gmail App Password)
            password = password.replace(' ', '').replace('\t', '').replace('\n', '')
            if not password:
                return Response(
                    {'error': 'smtp_password is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # S'assurer que le mot de passe n'est pas déjà chiffré
            encrypted_password = encrypt_value(password)
            
            config = EmailConfiguration.objects.create(
                organization=organization,
                smtp_host=data.get('smtp_host'),
                smtp_port=data.get('smtp_port', 587),
                smtp_username=data.get('smtp_username'),
                smtp_password_encrypted=encrypted_password,
                use_tls=data.get('use_tls', True),
                use_ssl=data.get('use_ssl', False),
                default_from_email=data.get('default_from_email'),
                default_from_name=data.get('default_from_name', organization.name),
            )
            
            return Response({
                'success': True,
                'message': 'Configuration email créée',
                'config': {
                    'id': str(config.id),
                    'smtp_host': config.smtp_host,
                    'smtp_port': config.smtp_port,
                    'smtp_username': config.smtp_username,
                    'use_tls': config.use_tls,
                    'use_ssl': config.use_ssl,
                    'default_from_email': config.default_from_email,
                    'default_from_name': config.default_from_name,
                    'is_verified': config.is_verified,
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    elif request.method == 'PATCH':
        # Mettre à jour la configuration existante
        try:
            config = EmailConfiguration.objects.filter(organization=organization).first()
            
            if not config:
                return Response(
                    {'error': 'Email configuration not found. Use POST to create.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            data = request.data
            
            # Mettre à jour les champs
            if 'smtp_host' in data:
                config.smtp_host = data['smtp_host']
            if 'smtp_port' in data:
                config.smtp_port = data['smtp_port']
            if 'smtp_username' in data:
                config.smtp_username = data['smtp_username']
            if 'smtp_password' in data:
                password = data['smtp_password'].strip()
                # Supprimer tous les espaces (important pour Gmail App Password)
                password = password.replace(' ', '')
                if password:  # Ne mettre à jour que si un nouveau mot de passe est fourni
                    config.smtp_password_encrypted = encrypt_value(password)
            if 'use_tls' in data:
                config.use_tls = data['use_tls']
            if 'use_ssl' in data:
                config.use_ssl = data['use_ssl']
            if 'default_from_email' in data:
                config.default_from_email = data['default_from_email']
            if 'default_from_name' in data:
                config.default_from_name = data['default_from_name']
            
            config.save()
            
            return Response({
                'success': True,
                'message': 'Configuration email mise à jour',
                'config': {
                    'id': str(config.id),
                    'smtp_host': config.smtp_host,
                    'smtp_port': config.smtp_port,
                    'smtp_username': config.smtp_username,
                    'use_tls': config.use_tls,
                    'use_ssl': config.use_ssl,
                    'default_from_email': config.default_from_email,
                    'default_from_name': config.default_from_name,
                    'is_verified': config.is_verified,
                }
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def email_config_test(request):
    """
    POST /api/accounts/email-config/test/
    
    Envoie un email de test avec la configuration actuelle
    """
    from django.core.mail import EmailMessage
    from django.utils import timezone
    
    organization = request.user.organization
    
    if not organization:
        return Response(
            {'error': 'User must belong to an organization'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        config = EmailConfiguration.objects.filter(organization=organization).first()
        
        if not config:
            return Response(
                {'error': 'Email configuration not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Récupérer le mot de passe déchiffré
        password = config.get_decrypted_password()
        
        if not password:
            return Response(
                {'error': 'Could not decrypt password'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # S'assurer que le mot de passe n'a pas d'espaces superflus
        password = password.strip()
        username = config.smtp_username.strip()
        
        # Configurer Django pour utiliser cette configuration SMTP
        from django.conf import settings
        import logging
        logger = logging.getLogger(__name__)
        
        original_email_backend = getattr(settings, 'EMAIL_BACKEND', None)
        original_email_host = getattr(settings, 'EMAIL_HOST', None)
        original_email_port = getattr(settings, 'EMAIL_PORT', None)
        original_email_use_tls = getattr(settings, 'EMAIL_USE_TLS', None)
        original_email_use_ssl = getattr(settings, 'EMAIL_USE_SSL', None)
        original_email_host_user = getattr(settings, 'EMAIL_HOST_USER', None)
        original_email_host_password = getattr(settings, 'EMAIL_HOST_PASSWORD', None)
        
        # Utiliser la configuration de l'organisation
        settings.EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
        settings.EMAIL_HOST = config.smtp_host
        settings.EMAIL_PORT = config.smtp_port
        settings.EMAIL_USE_TLS = config.use_tls
        settings.EMAIL_USE_SSL = config.use_ssl
        settings.EMAIL_HOST_USER = username
        settings.EMAIL_HOST_PASSWORD = password
        
        # Log pour déboguer (sans afficher le mot de passe complet)
        logger.info(f"SMTP test: host={config.smtp_host}, port={config.smtp_port}, user={username}, password_length={len(password)}")
        
        # Envoyer l'email de test
        test_email = request.data.get('test_email', request.user.email)
        
        email = EmailMessage(
            subject='Test de configuration email - ProcureGenius',
            body=f"""
Bonjour,

Ceci est un email de test pour vérifier votre configuration SMTP.

Configuration testée:
- Serveur: {config.smtp_host}:{config.smtp_port}
- TLS: {config.use_tls}
- SSL: {config.use_ssl}
- Expéditeur: {config.default_from_name} <{config.default_from_email}>

Si vous recevez cet email, votre configuration est correcte !

Cordialement,
ProcureGenius
            """,
            from_email=f"{config.default_from_name} <{config.default_from_email}>",
            to=[test_email],
        )
        
        email.send(fail_silently=False)
        
        # Marquer comme vérifié
        config.is_verified = True
        config.last_verified_at = timezone.now()
        config.save()
        
        # Restaurer les paramètres originaux
        if original_email_backend:
            settings.EMAIL_BACKEND = original_email_backend
        if original_email_host:
            settings.EMAIL_HOST = original_email_host
        if original_email_port:
            settings.EMAIL_PORT = original_email_port
        if original_email_use_tls is not None:
            settings.EMAIL_USE_TLS = original_email_use_tls
        if original_email_use_ssl is not None:
            settings.EMAIL_USE_SSL = original_email_use_ssl
        if original_email_host_user:
            settings.EMAIL_HOST_USER = original_email_host_user
        if original_email_host_password:
            settings.EMAIL_HOST_PASSWORD = original_email_host_password
        
        return Response({
            'success': True,
            'message': f'Email de test envoyé à {test_email}'
        })
        
    except Exception as e:
        return Response(
            {'error': f'Erreur lors de l\'envoi de l\'email de test: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def email_config_verify(request):
    """
    POST /api/accounts/email-config/verify/
    
    Vérifie la connexion SMTP sans envoyer d'email
    """
    import smtplib
    
    organization = request.user.organization
    
    if not organization:
        return Response(
            {'error': 'User must belong to an organization'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        config = EmailConfiguration.objects.filter(organization=organization).first()
        
        if not config:
            return Response(
                {'error': 'Email configuration not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        password = config.get_decrypted_password()
        
        if not password:
            return Response(
                {'error': 'Could not decrypt password'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # S'assurer que le mot de passe et le nom d'utilisateur n'ont pas d'espaces superflus
        password = password.strip()
        username = config.smtp_username.strip()
        
        # Tester la connexion SMTP
        try:
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"SMTP verify: host={config.smtp_host}, port={config.smtp_port}, user={username}, password_length={len(password)}")
            
            if config.use_ssl:
                server = smtplib.SMTP_SSL(config.smtp_host, config.smtp_port)
            else:
                server = smtplib.SMTP(config.smtp_host, config.smtp_port)
            
            if config.use_tls and not config.use_ssl:
                server.starttls()
            
            server.login(username, password)
            server.quit()
            
            # Marquer comme vérifié
            from django.utils import timezone
            config.is_verified = True
            config.last_verified_at = timezone.now()
            config.save()
            
            return Response({
                'success': True,
                'message': 'Connexion SMTP vérifiée avec succès'
            })
            
        except smtplib.SMTPException as e:
            return Response(
                {'error': f'Erreur de connexion SMTP: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

