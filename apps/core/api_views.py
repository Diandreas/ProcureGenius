"""
Core API Views
Includes currency endpoints and other system-wide utilities
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from .currencies import (
    CURRENCY_CHOICES,
    CURRENCY_SYMBOLS,
    CURRENCY_NAMES,
    get_currency_info,
    format_currency,
)


@api_view(['GET'])
@permission_classes([AllowAny])
def api_currencies_list(request):
    """
    List all available currencies

    GET /api/v1/core/currencies/

    Returns list of all supported currencies with symbols and names
    """
    currencies = []
    for code, display_name in CURRENCY_CHOICES:
        currencies.append({
            'code': code,
            'name': CURRENCY_NAMES.get(code, code),
            'symbol': CURRENCY_SYMBOLS.get(code, code),
            'display_name': display_name,
        })

    return Response({
        'currencies': currencies,
        'count': len(currencies)
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def api_currency_info(request, currency_code):
    """
    Get detailed information about a specific currency

    GET /api/v1/core/currencies/<code>/

    Returns complete currency information including formatting rules
    """
    currency_code = currency_code.upper()

    # Check if currency exists
    if currency_code not in CURRENCY_SYMBOLS:
        return Response(
            {'error': f'Currency {currency_code} not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    info = get_currency_info(currency_code)

    return Response(info)


@api_view(['POST'])
@permission_classes([AllowAny])
def api_format_currency(request):
    """
    Format a number as currency

    POST /api/v1/core/currencies/format/

    Body:
        {
            "amount": 1234.56,
            "currency": "EUR"
        }

    Returns:
        {
            "formatted": "1.234,56 €",
            "amount": 1234.56,
            "currency": "EUR"
        }
    """
    amount = request.data.get('amount')
    currency_code = request.data.get('currency', 'EUR').upper()

    if amount is None:
        return Response(
            {'error': 'Amount is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        amount = float(amount)
    except (ValueError, TypeError):
        return Response(
            {'error': 'Invalid amount'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if currency_code not in CURRENCY_SYMBOLS:
        return Response(
            {'error': f'Currency {currency_code} not found'},
            status=status.HTTP_400_BAD_REQUEST
        )

    formatted = format_currency(amount, currency_code)

    return Response({
        'formatted': formatted,
        'amount': amount,
        'currency': currency_code,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_module_notification_counts(request):
    """
    Lightweight endpoint returning pending item counts per healthcare module.
    Used for sidebar badges and auto-refresh triggers.

    GET /api/v1/core/module-counts/
    """
    from django.utils import timezone
    from django.db.models import Q, Count

    user = request.user
    org = user.organization
    today = timezone.now().date()

    result = {}

    # Consultations counts (today only)
    try:
        from apps.consultations.models import Consultation
        consultation_qs = Consultation.objects.filter(
            organization=org,
            consultation_date__date=today,
        )
        waiting = consultation_qs.filter(
            status__in=['waiting', 'vitals_pending', 'ready_for_doctor']
        ).count()
        active = consultation_qs.filter(status='in_consultation').count()
        result['consultations'] = {'waiting': waiting, 'active': active}
    except Exception:
        result['consultations'] = {'waiting': 0, 'active': 0}

    # Laboratory counts
    try:
        from apps.laboratory.models import LabOrder
        lab_qs = LabOrder.objects.filter(organization=org)
        pending = lab_qs.filter(status='pending').count()
        in_progress = lab_qs.filter(
            status__in=['sample_collected', 'in_progress']
        ).count()
        results_ready = lab_qs.filter(
            status__in=['completed', 'results_ready']
        ).count()
        result['laboratory'] = {
            'pending': pending,
            'in_progress': in_progress,
            'results_ready': results_ready,
        }
    except Exception:
        result['laboratory'] = {'pending': 0, 'in_progress': 0, 'results_ready': 0}

    # Pharmacy counts
    try:
        from apps.pharmacy.models import PharmacyDispensing
        pending_disp = PharmacyDispensing.objects.filter(
            organization=org, status='pending'
        ).count()
        result['pharmacy'] = {'pending': pending_disp}
    except Exception:
        result['pharmacy'] = {'pending': 0}

    # Reception counts (today's visits still waiting)
    try:
        from apps.patients.models import PatientVisit
        waiting_visits = PatientVisit.objects.filter(
            organization=org,
            arrived_at__date=today,
            status__in=['registered', 'waiting_consultation'],
        ).count()
        result['reception'] = {'waiting': waiting_visits}
    except Exception:
        result['reception'] = {'waiting': 0}

    result['timestamp'] = timezone.now().isoformat()

    return Response(result)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def api_user_currency_preference(request):
    """
    Get or update user's preferred currency

    GET /api/v1/core/user/currency/
    PUT /api/v1/core/user/currency/

    PUT Body:
        {
            "currency": "XOF"
        }
    """
    user = request.user
    preferences = user.preferences

    if request.method == 'GET':
        return Response({
            'currency': preferences.preferred_currency,
            'info': get_currency_info(preferences.preferred_currency)
        })

    elif request.method == 'PUT':
        currency_code = request.data.get('currency', '').upper()

        if not currency_code:
            return Response(
                {'error': 'Currency code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if currency_code not in CURRENCY_SYMBOLS:
            return Response(
                {'error': f'Currency {currency_code} is not supported'},
                status=status.HTTP_400_BAD_REQUEST
            )

        preferences.preferred_currency = currency_code
        preferences.save()

        return Response({
            'message': 'Currency preference updated successfully',
            'currency': preferences.preferred_currency,
            'info': get_currency_info(preferences.preferred_currency)
        })
