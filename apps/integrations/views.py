from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.utils.translation import gettext as _
from .models import Integration, SyncLog, WebhookEndpoint, APIConnection


@login_required
def integration_list(request):
    """Liste des intégrations configurées"""
    
    if request.user.role not in ['admin', 'manager']:
        messages.error(request, _('Accès non autorisé.'))
        return redirect('core:dashboard')
    
    integrations = Integration.objects.filter(
        is_active=True
    ).order_by('integration_type', 'name')
    
    # Statistiques
    stats = {
        'total_integrations': integrations.count(),
        'active_integrations': integrations.filter(status='active').count(),
        'error_integrations': integrations.filter(status='error').count(),
    }
    
    context = {
        'integrations': integrations,
        'stats': stats,
    }
    
    return render(request, 'integrations/list.html', context)


@login_required
def integration_detail(request, pk):
    """Détail d'une intégration"""
    
    integration = get_object_or_404(Integration, pk=pk)
    
    # Logs récents
    recent_logs = integration.sync_logs.order_by('-started_at')[:20]
    
    context = {
        'integration': integration,
        'recent_logs': recent_logs,
        'can_edit': request.user.role in ['admin', 'manager'],
    }
    
    return render(request, 'integrations/detail.html', context)


@csrf_exempt
def webhook_handler(request, endpoint_path):
    """Handler générique pour les webhooks"""
    
    try:
        webhook = WebhookEndpoint.objects.get(
            endpoint_path=endpoint_path,
            is_active=True
        )
        
        # Vérifier l'IP si configuré
        if webhook.allowed_ips:
            client_ip = request.META.get('REMOTE_ADDR')
            if client_ip not in webhook.allowed_ips:
                return JsonResponse({'error': 'IP not allowed'}, status=403)
        
        # Traiter le webhook
        # Logique de traitement selon le processor_class
        
        webhook.request_count += 1
        webhook.last_request = timezone.now()
        webhook.save()
        
        return JsonResponse({'status': 'success'})
        
    except WebhookEndpoint.DoesNotExist:
        return JsonResponse({'error': 'Webhook not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)