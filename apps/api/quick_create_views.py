"""
Vues API pour la création rapide d'entités avec détection de doublons
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.contrib.auth import get_user_model

from apps.suppliers.models import Supplier
from apps.invoicing.models import Product
from apps.accounts.models import Client
from apps.ai_assistant.entity_matcher import entity_matcher
from .serializers import SupplierSerializer, ProductSerializer, ClientSerializer

User = get_user_model()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def quick_create_client(request):
    """
    Création rapide d'un client avec détection des doublons

    Body:
        - name: string (required)
        - email: string
        - phone: string
        - address: string
        - contact_person: string
        - force_create: boolean (pour forcer la création malgré les similarités)
    """
    data = request.data
    force_create = data.get('force_create', False)

    # Validation des champs requis
    name = data.get('name', '').strip()
    if not name:
        return Response(
            {'error': 'Le nom est requis'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Vérifier les similarités sauf si force_create
    if not force_create:
        similar_clients = entity_matcher.find_similar_clients(
            first_name=name,  # Utiliser name comme first_name pour la recherche
            email=data.get('email'),
            phone=data.get('phone')
        )

        if similar_clients:
            return Response({
                'error': 'similar_entities_found',
                'similar_entities': [
                    {
                        'id': str(client.id),
                        'name': client.name,
                        'email': client.email or '',
                        'phone': client.phone or '',
                        'similarity': score,
                        'reason': reason
                    }
                    for client, score, reason in similar_clients
                ],
                'message': entity_matcher.create_similarity_message('client', similar_clients)
            }, status=status.HTTP_409_CONFLICT)

    # Créer le client
    try:
        with transaction.atomic():
            # Récupérer l'organisation de l'utilisateur
            organization = request.user.organization if hasattr(request.user, 'organization') else None

            # Créer le client
            client = Client.objects.create(
                organization=organization,
                name=name,
                email=data.get('email', ''),
                phone=data.get('phone', ''),
                address=data.get('address', ''),
                contact_person=data.get('contact_person', ''),
            )

            serializer = ClientSerializer(client)
            return Response({
                'success': True,
                'data': serializer.data,
                'message': f'Client {client.name} créé avec succès'
            }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def quick_create_supplier(request):
    """
    Création rapide d'un fournisseur avec détection des doublons

    Body:
        - name: string (required)
        - contact_person: string
        - email: string
        - phone: string
        - address: string
        - city: string
        - province: string
        - force_create: boolean
    """
    data = request.data
    force_create = data.get('force_create', False)

    # Validation
    name = data.get('name', '').strip()
    if not name:
        return Response(
            {'error': 'Le nom du fournisseur est requis'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Vérifier les similarités
    if not force_create:
        similar_suppliers = entity_matcher.find_similar_suppliers(
            name=name,
            email=data.get('email'),
            phone=data.get('phone')
        )

        if similar_suppliers:
            return Response({
                'error': 'similar_entities_found',
                'similar_entities': [
                    {
                        'id': str(supplier.id),
                        'name': supplier.name,
                        'email': supplier.email or '',
                        'phone': supplier.phone or '',
                        'similarity': score,
                        'reason': reason
                    }
                    for supplier, score, reason in similar_suppliers
                ],
                'message': entity_matcher.create_similarity_message('supplier', similar_suppliers)
            }, status=status.HTTP_409_CONFLICT)

    # Créer le fournisseur
    try:
        with transaction.atomic():
            supplier = Supplier.objects.create(
                name=name,
                contact_person=data.get('contact_person', ''),
                email=data.get('email', ''),
                phone=data.get('phone', ''),
                address=data.get('address', ''),
                city=data.get('city', ''),
                province=data.get('province', '')
            )

            serializer = SupplierSerializer(supplier)
            return Response({
                'success': True,
                'data': serializer.data,
                'message': f'Fournisseur {supplier.name} créé avec succès'
            }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def quick_create_product(request):
    """
    Création rapide d'un produit avec détection des doublons

    Body:
        - name: string (required)
        - product_type: string (physical|service|digital)
        - source_type: string (purchased|manufactured|resale)
        - supplier_id: uuid (si source_type = purchased)
        - price: decimal (prix de vente)
        - cost_price: decimal (prix d'achat)
        - stock_quantity: integer
        - description: string
        - force_create: boolean
    """
    data = request.data
    force_create = data.get('force_create', False)

    # Validation
    name = data.get('name', '').strip()
    if not name:
        return Response(
            {'error': 'Le nom du produit est requis'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Vérifier les similarités
    if not force_create:
        similar_products = entity_matcher.find_similar_products(
            name=name,
            reference=data.get('reference'),
            barcode=data.get('barcode')
        )

        if similar_products:
            return Response({
                'error': 'similar_entities_found',
                'similar_entities': [
                    {
                        'id': str(product.id),
                        'product_name': product.name,
                        'reference': product.reference or '',
                        'price': float(product.price),
                        'product_type': product.get_product_type_display(),
                        'similarity': score,
                        'reason': reason
                    }
                    for product, score, reason in similar_products
                ],
                'message': entity_matcher.create_similarity_message('product', similar_products)
            }, status=status.HTTP_409_CONFLICT)

    # Créer le produit
    try:
        with transaction.atomic():
            # Récupérer le fournisseur si spécifié
            supplier = None
            if data.get('supplier_id'):
                try:
                    supplier = Supplier.objects.get(id=data['supplier_id'])
                except Supplier.DoesNotExist:
                    return Response(
                        {'error': 'Fournisseur non trouvé'},
                        status=status.HTTP_404_NOT_FOUND
                    )

            product = Product.objects.create(
                name=name,
                description=data.get('description', ''),
                product_type=data.get('product_type', 'physical'),
                source_type=data.get('source_type', 'purchased'),
                supplier=supplier,
                price=data.get('price', 0),
                cost_price=data.get('cost_price', 0),
                stock_quantity=data.get('stock_quantity', 0),
                reference=data.get('reference', ''),
                barcode=data.get('barcode', '')
            )

            serializer = ProductSerializer(product)
            return Response({
                'success': True,
                'data': serializer.data,
                'message': f'Produit {product.name} créé avec succès'
            }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
