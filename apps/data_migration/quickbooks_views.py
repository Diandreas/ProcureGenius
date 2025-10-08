"""
Views pour l'intégration QuickBooks OAuth
"""
import requests
import secrets
from datetime import timedelta
from django.conf import settings
from django.shortcuts import redirect
from django.utils import timezone
from django.http import JsonResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import QuickBooksConnection
from .quickbooks_service import QuickBooksService
import logging

logger = logging.getLogger(__name__)


# URLs QuickBooks
OAUTH_AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2"
OAUTH_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def quickbooks_auth_url(request):
    """
    Génère l'URL d'autorisation QuickBooks OAuth 2.0
    """
    # Génère un state pour la sécurité CSRF
    state = secrets.token_urlsafe(32)
    request.session['quickbooks_oauth_state'] = state

    # URL de callback (doit être configurée dans QuickBooks Developer Portal)
    redirect_uri = request.build_absolute_uri('/api/v1/migration/quickbooks/callback/')

    # Paramètres OAuth
    params = {
        'client_id': getattr(settings, 'QUICKBOOKS_CLIENT_ID', ''),
        'response_type': 'code',
        'scope': 'com.intuit.quickbooks.accounting',
        'redirect_uri': redirect_uri,
        'state': state,
    }

    # Construction de l'URL
    auth_url = f"{OAUTH_AUTHORIZE_URL}?" + "&".join([f"{k}={v}" for k, v in params.items()])

    return Response({
        'auth_url': auth_url,
        'state': state
    })


@api_view(['GET'])
def quickbooks_callback(request):
    """
    Callback OAuth QuickBooks - Échange le code contre des tokens
    """
    code = request.GET.get('code')
    state = request.GET.get('state')
    realm_id = request.GET.get('realmId')
    error = request.GET.get('error')

    # Vérification d'erreur
    if error:
        logger.error(f"Erreur OAuth QuickBooks: {error}")
        return redirect(f"/settings?error={error}")

    # Vérification du state (protection CSRF)
    stored_state = request.session.get('quickbooks_oauth_state')
    if state != stored_state:
        logger.error("State OAuth invalide")
        return redirect("/settings?error=invalid_state")

    # Échange du code contre des tokens
    try:
        redirect_uri = request.build_absolute_uri('/api/v1/migration/quickbooks/callback/')

        data = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': redirect_uri,
        }

        auth = (
            getattr(settings, 'QUICKBOOKS_CLIENT_ID', ''),
            getattr(settings, 'QUICKBOOKS_CLIENT_SECRET', '')
        )

        response = requests.post(
            OAUTH_TOKEN_URL,
            data=data,
            auth=auth,
            headers={'Accept': 'application/json'}
        )
        response.raise_for_status()

        tokens = response.json()

        # Sauvegarde de la connexion
        connection, created = QuickBooksConnection.objects.update_or_create(
            user=request.user,
            defaults={
                'realm_id': realm_id,
                'access_token': tokens['access_token'],
                'refresh_token': tokens['refresh_token'],
                'token_expires_at': timezone.now() + timedelta(seconds=tokens['expires_in']),
                'is_active': True,
            }
        )

        # Test de la connexion pour récupérer le nom de l'entreprise
        try:
            service = QuickBooksService(connection)
            service.test_connection()
        except Exception as e:
            logger.warning(f"Test de connexion échoué: {str(e)}")

        logger.info(f"Connexion QuickBooks établie pour {request.user.email}")

        # Nettoyage de la session
        request.session.pop('quickbooks_oauth_state', None)

        # Redirection vers les paramètres avec succès
        return redirect("/settings?tab=2&quickbooks=connected")

    except Exception as e:
        logger.error(f"Erreur lors de l'échange de tokens: {str(e)}")
        return redirect(f"/settings?error=token_exchange_failed")


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def quickbooks_status(request):
    """
    Retourne le statut de la connexion QuickBooks
    """
    try:
        connection = QuickBooksConnection.objects.get(user=request.user, is_active=True)

        return Response({
            'connected': True,
            'company_name': connection.company_name,
            'connected_at': connection.connected_at,
            'last_sync_at': connection.last_sync_at,
            'token_expired': connection.is_token_expired,
        })

    except QuickBooksConnection.DoesNotExist:
        return Response({
            'connected': False
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def quickbooks_disconnect(request):
    """
    Déconnecte QuickBooks
    """
    try:
        connection = QuickBooksConnection.objects.get(user=request.user)
        connection.is_active = False
        connection.save()

        logger.info(f"Connexion QuickBooks déconnectée pour {request.user.email}")

        return Response({
            'success': True,
            'message': 'QuickBooks déconnecté avec succès'
        })

    except QuickBooksConnection.DoesNotExist:
        return Response({
            'success': False,
            'message': 'Aucune connexion QuickBooks trouvée'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def quickbooks_test_connection(request):
    """
    Teste la connexion QuickBooks
    """
    try:
        connection = QuickBooksConnection.objects.get(user=request.user, is_active=True)
        service = QuickBooksService(connection)

        if service.test_connection():
            return Response({
                'success': True,
                'message': 'Connexion QuickBooks OK',
                'company_name': connection.company_name
            })
        else:
            return Response({
                'success': False,
                'message': 'Test de connexion échoué'
            }, status=status.HTTP_400_BAD_REQUEST)

    except QuickBooksConnection.DoesNotExist:
        return Response({
            'success': False,
            'message': 'QuickBooks non connecté'
        }, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.error(f"Erreur test connexion: {str(e)}")
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def quickbooks_preview_data(request):
    """
    Aperçu des données disponibles dans QuickBooks
    """
    entity_type = request.GET.get('entity_type', 'suppliers')

    try:
        connection = QuickBooksConnection.objects.get(user=request.user, is_active=True)
        service = QuickBooksService(connection)

        # Récupère un échantillon de données
        if entity_type == 'suppliers':
            data = service.get_vendors(max_results=10)
        elif entity_type == 'clients':
            data = service.get_customers(max_results=10)
        elif entity_type == 'products':
            data = service.get_items(max_results=10)
        elif entity_type == 'invoices':
            data = service.get_invoices(max_results=10)
        elif entity_type == 'purchase_orders':
            data = service.get_purchase_orders(max_results=10)
        else:
            return Response({
                'success': False,
                'message': 'Type d\'entité non supporté'
            }, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'success': True,
            'entity_type': entity_type,
            'count': len(data),
            'preview': data[:5],  # Premiers 5 pour l'aperçu
            'total_available': len(data)
        })

    except QuickBooksConnection.DoesNotExist:
        return Response({
            'success': False,
            'message': 'QuickBooks non connecté'
        }, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.error(f"Erreur aperçu données: {str(e)}")
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
