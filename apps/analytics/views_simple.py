from django.shortcuts import render
from django.http import JsonResponse


def analytics_dashboard(request):
    """Tableau de bord analytics simplifié"""
    return JsonResponse({'message': 'Analytics dashboard - Version simplifiée'})


def reports(request):
    """Rapports simplifiés"""
    return JsonResponse({'message': 'Reports - Version simplifiée'})
