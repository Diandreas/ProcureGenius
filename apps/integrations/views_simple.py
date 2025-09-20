from django.shortcuts import render
from django.http import JsonResponse


def integrations_list(request):
    """Liste des intégrations simplifiée"""
    return JsonResponse({'message': 'Integrations - Version simplifiée'})


def integration_config(request):
    """Configuration d'intégration simplifiée"""
    return JsonResponse({'message': 'Integration Config - Version simplifiée'})
