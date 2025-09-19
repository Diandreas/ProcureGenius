from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils.translation import gettext as _

# Placeholder pour les ViewSets API
# Les ViewSets seront créés dans chaque module selon les besoins

class APIHealthCheckView:
    """Vue de vérification de l'état de l'API"""
    
    def get(self, request):
        return Response({
            'status': 'healthy',
            'version': '1.0.0',
            'message': _('API ProcureGenius fonctionnelle')
        })