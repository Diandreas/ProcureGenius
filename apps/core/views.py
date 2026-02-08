"""
Vues simplifiées pour l'app core - sans dépendances externes
"""
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout
from django.contrib import messages
from django.http import JsonResponse
from django.utils import timezone


def home(request):
    """Page d'accueil simple"""
    if request.user.is_authenticated:
        return redirect('core:dashboard')
    
    return render(request, 'core/home.html')


@login_required
def dashboard(request):
    """Dashboard moderne et responsive"""
    context = {
        'user': request.user,
        'current_date': timezone.now().date(),
        'stats': {
            'total_users': 1,  # Placeholder
            'active_suppliers': 0,  # Placeholder
            'pending_orders': 0,  # Placeholder
            'total_invoices': 0,  # Placeholder
        }
    }
    return render(request, 'core/dashboard_modern.html', context)


def api_dashboard_stats(request):
    """API simple pour les statistiques"""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Non authentifié'}, status=401)
    
    stats = {
        'total_users': 1,
        'active_suppliers': 0,
        'pending_orders': 0,
        'total_invoices': 0,
        'monthly_total': 0,
        'recent_activities': []
    }
    
    return JsonResponse(stats)


def custom_404(request, exception):
    """Page d'erreur 404 personnalisée"""
    return render(request, 'core/404.html', status=404)


def custom_500(request):
    """Page d'erreur 500 personnalisée"""
    return render(request, 'core/500.html', status=500)