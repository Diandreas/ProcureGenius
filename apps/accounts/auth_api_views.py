"""
Authentication API Views
Handles user registration, login, and OAuth integration
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.utils.translation import gettext as _
from django.db import transaction

from .models import CustomUser, Organization, UserPreferences
from apps.subscriptions.models import SubscriptionPlan, Subscription
import requests
from django.utils import timezone
from datetime import timedelta


@api_view(['POST'])
@permission_classes([AllowAny])
def api_register(request):
    """
    Register a new user with email/password

    POST /api/accounts/register/

    Body:
        {
            "email": "user@example.com",
            "password": "securepassword",
            "first_name": "John",
            "last_name": "Doe",
            "organization_name": "ACME Corp"
        }
    """
    email = request.data.get('email', '').lower().strip()
    password = request.data.get('password', '')
    first_name = request.data.get('first_name', '').strip()
    last_name = request.data.get('last_name', '').strip()
    organization_name = request.data.get('organization_name', '').strip()

    # Validation
    errors = {}

    if not email:
        errors['email'] = ['Email est requis']
    elif CustomUser.objects.filter(email=email).exists():
        errors['email'] = ['Cet email est déjà utilisé']

    if not password:
        errors['password'] = ['Mot de passe est requis']
    elif len(password) < 8:
        errors['password'] = ['Le mot de passe doit contenir au moins 8 caractères']

    if not first_name:
        errors['first_name'] = ['Prénom est requis']

    if not last_name:
        errors['last_name'] = ['Nom est requis']

    if not organization_name:
        errors['organization_name'] = ['Nom de l\'organisation est requis']

    if errors:
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            # Create organization
            organization = Organization.objects.create(
                name=organization_name,
                subscription_type='free',  # Start with free plan
            )

            # Create OrganizationSettings automatically
            try:
                from apps.core.models import OrganizationSettings
                OrganizationSettings.objects.get_or_create(
                    organization=organization,
                    defaults={
                        'company_name': organization_name,  # Utiliser le nom de l'organisation comme fallback
                    }
                )
            except Exception as e:
                # Log error but don't fail user creation
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error creating OrganizationSettings: {e}")

            # Create user
            user = CustomUser.objects.create_user(
                username=email,  # Use email as username
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                organization=organization,
                role='admin',  # First user is admin
                email_verified=False,  # Will be verified via email
            )

            # Create free subscription
            try:
                free_plan = SubscriptionPlan.objects.get(code='free')
                from django.utils import timezone
                from datetime import timedelta
                # Set proper date fields required by Subscription model
                Subscription.objects.create(
                    organization=organization,
                    plan=free_plan,
                    billing_period='monthly',
                    status='active',  # Free plan is immediately active
                    current_period_start=timezone.now(),
                    current_period_end=timezone.now() + timedelta(days=365*10),  # Free plan never expires
                )
            except SubscriptionPlan.DoesNotExist:
                # If plans not yet created, skip subscription creation
                # This is OK for free tier, organization will still work
                import logging
                logging.getLogger(__name__).warning("Free subscription plan not found, skipping subscription creation")

            # UserPreferences and UserPermissions are created automatically by signals
            # DO NOT mark onboarding as completed - user will go through setup wizard

            # Generate auth token
            token, created = Token.objects.get_or_create(user=user)

            # TODO: Send email verification email
            # send_email_verification(user)

            return Response({
                'message': _('Inscription réussie! Configurons votre espace de travail.'),
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'organization': {
                        'id': str(organization.id),
                        'name': organization.name,
                    },
                },
                'token': token.key,
                'email_verification_required': False,
                'requires_onboarding': True,  # Frontend will redirect to /onboarding
            }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {'error': f'Erreur lors de l\'inscription: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def api_login(request):
    """
    Login with email/password

    POST /api/accounts/login/

    Body:
        {
            "email": "user@example.com",
            "password": "password"
        }
    """
    email = request.data.get('email', '').lower().strip()
    password = request.data.get('password', '')

    if not email or not password:
        return Response(
            {'error': 'Email et mot de passe requis'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Authenticate (username field is used for email)
    user = authenticate(username=email, password=password)

    if user is None:
        return Response(
            {'error': 'Email ou mot de passe incorrect'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if not user.is_active:
        return Response(
            {'error': 'Ce compte est désactivé'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Generate or get auth token
    token, _ = Token.objects.get_or_create(user=user)

    # Get user preferences
    preferences = UserPreferences.objects.filter(user=user).first()

    return Response({
        'token': token.key,
        'user': {
            'id': str(user.id),
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'email_verified': user.email_verified,
            'has_usable_password': user.has_usable_password(),
            'organization': {
                'id': str(user.organization.id) if user.organization else None,
                'name': user.organization.name if user.organization else None,
            },
            'preferences': {
                'currency': preferences.preferred_currency if preferences else 'EUR',
                'language': preferences.preferred_language if preferences else 'fr',
                'onboarding_completed': preferences.onboarding_completed if preferences else False,
            }
        },
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_logout(request):
    """
    Logout (delete auth token)

    POST /api/accounts/logout/
    """
    try:
        request.user.auth_token.delete()
        return Response({'message': 'Déconnexion réussie'})
    except:
        return Response({'message': 'Déconnexion réussie'})


@api_view(['POST'])
@permission_classes([AllowAny])
def api_verify_email(request):
    """
    Verify email with verification token

    POST /api/accounts/verify-email/

    Body:
        {
            "token": "verification-token-here"
        }
    """
    # TODO: Implement email verification logic
    # This would check the token and mark user.email_verified = True
    pass


@api_view(['POST'])
@permission_classes([AllowAny])
def api_forgot_password(request):
    """
    Request password reset

    POST /api/accounts/forgot-password/

    Body:
        {
            "email": "user@example.com"
        }
    """
    # TODO: Implement password reset email sending
    pass


@api_view(['POST'])
@permission_classes([AllowAny])
def api_reset_password(request):
    """
    Reset password with token

    POST /api/accounts/reset-password/

    Body:
        {
            "token": "reset-token",
            "new_password": "newpassword"
        }
    """
    # TODO: Implement password reset logic
    pass


@api_view(['POST'])
@permission_classes([AllowAny])
def api_google_login(request):
    """
    Login with Google Access Token
    
    POST /api/accounts/google/
    
    Body:
        {
            "token": "google_access_token"
        }
    """
    token = request.data.get('token')
    if not token:
        return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Verify token with Google
        google_response = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        if google_response.status_code != 200:
            return Response({'error': 'Invalid Google token'}, status=status.HTTP_400_BAD_REQUEST)
            
        google_data = google_response.json()
        email = google_data.get('email')
        
        if not email:
             return Response({'error': 'Email not found in Google data'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if user exists
        user = CustomUser.objects.filter(email=email).first()
        
        if not user:
            # Create new user
            with transaction.atomic():
                # Create organization (using email domain or default)
                org_name = f"Organization {google_data.get('given_name', 'User')}"
                organization = Organization.objects.create(
                    name=org_name,
                    subscription_type='free'
                )
                
                user = CustomUser.objects.create_user(
                    username=email,
                    email=email,
                    first_name=google_data.get('given_name', ''),
                    last_name=google_data.get('family_name', ''),
                    organization=organization,
                    role='admin',
                    email_verified=True,
                    password=CustomUser.objects.make_random_password()
                )
                
                # Create OrganizationSettings automatically
                try:
                    from apps.core.models import OrganizationSettings
                    OrganizationSettings.objects.get_or_create(
                        organization=organization,
                        defaults={
                            'company_name': org_name,  # Utiliser le nom de l'organisation comme fallback
                        }
                    )
                except Exception as e:
                    # Log error but don't fail user creation
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Error creating OrganizationSettings: {e}")
                
                # Create free subscription
                try:
                    free_plan = SubscriptionPlan.objects.get(code='free')
                    Subscription.objects.create(
                        organization=organization,
                        plan=free_plan,
                        billing_period='monthly',
                        status='active',
                        current_period_start=timezone.now(),
                        current_period_end=timezone.now() + timedelta(days=365*10),
                    )
                except SubscriptionPlan.DoesNotExist:
                    pass

        # Generate token
        token, _ = Token.objects.get_or_create(user=user)
        
        # Get preferences
        preferences = UserPreferences.objects.filter(user=user).first()
        
        return Response({
            'token': token.key,
            'user': {
                'id': str(user.id),
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'has_usable_password': user.has_usable_password(),
                'organization': {
                    'id': str(user.organization.id) if user.organization else None,
                    'name': user.organization.name if user.organization else None,
                },
                'preferences': {
                    'currency': preferences.preferred_currency if preferences else 'EUR',
                    'language': preferences.preferred_language if preferences else 'fr',
                    'onboarding_completed': preferences.onboarding_completed if preferences else False,
                }
            }
        })

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
