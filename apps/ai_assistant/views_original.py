from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.translation import gettext as _
from django.utils import timezone
from django.core.paginator import Paginator
from django.db.models import Count, Avg, Sum, Q
from datetime import timedelta
import json

from .models import AIConversation, AIMessage, AIAction, AINotification, AIAnalytics, AIPromptTemplate
from .services import MistralAIService
from .forms import AIPromptTemplateForm, AIActionApprovalForm


# ===== VUES PRINCIPALES =====

@login_required
def ai_chat_interface(request):
    """Interface principale du chat IA"""
    
    # Conversations récentes
    recent_conversations = AIConversation.objects.filter(
        user=request.user,
        is_active=True
    ).order_by('-updated_at')[:10]
    
    # Notifications IA non lues
    notifications = AINotification.objects.filter(
        user=request.user,
        is_read=False
    ).order_by('-created_at')[:5]
    
    # Actions IA en attente d'approbation
    pending_actions = AIAction.objects.filter(
        user=request.user,
        requires_approval=True,
        approved__isnull=True
    ).order_by('-executed_at')[:10]
    
    # Suggestions du jour basées sur l'activité
    daily_suggestions = _get_daily_ai_suggestions(request.user)
    
    # Templates de prompts populaires
    popular_templates = AIPromptTemplate.objects.filter(
        is_active=True
    ).order_by('-usage_count')[:5]
    
    context = {
        'recent_conversations': recent_conversations,
        'notifications': notifications,
        'pending_actions': pending_actions,
        'daily_suggestions': daily_suggestions,
        'popular_templates': popular_templates,
        'ai_enabled': getattr(request.user, 'preferences', None) and 
                     getattr(request.user.preferences, 'ai_notifications', True),
    }
    
    return render(request, 'ai_assistant/chat_interface.html', context)


@login_required
def ai_conversation_detail(request, conversation_id):
    """Détail d'une conversation IA"""
    
    try:
        conversation = AIConversation.objects.get(
            id=conversation_id,
            user=request.user
        )
    except AIConversation.DoesNotExist:
        messages.error(request, _('Conversation introuvable.'))
        return redirect('ai_assistant:chat_interface')
    
    messages_list = conversation.messages.order_by('timestamp')
    
    # Marquer la conversation comme active
    conversation.updated_at = timezone.now()
    conversation.save()
    
    context = {
        'conversation': conversation,
        'messages': messages_list,
    }
    
    return render(request, 'ai_assistant/conversation_detail.html', context)


@login_required
@csrf_exempt
@require_http_methods(["POST"])
def ai_process_message(request):
    """Traite un message utilisateur via IA Mistral"""
    
    try:
        data = json.loads(request.body)
        user_message = data.get('message')
        conversation_id = data.get('conversation_id')
        
        if not user_message:
            return JsonResponse({'error': _('Message requis')}, status=400)
        
        # Récupérer ou créer conversation
        if conversation_id:
            try:
                conversation = AIConversation.objects.get(
                    id=conversation_id,
                    user=request.user
                )
            except AIConversation.DoesNotExist:
                return JsonResponse({'error': _('Conversation introuvable')}, status=404)
        else:
            # Détecter le type de conversation
            conversation_type = _detect_conversation_type(user_message)
            
            conversation = AIConversation.objects.create(
                user=request.user,
                title=user_message[:50] + ('...' if len(user_message) > 50 else ''),
                conversation_type=conversation_type
            )
        
        # Sauvegarder message utilisateur
        user_msg = AIMessage.objects.create(
            conversation=conversation,
            role='user',
            content=user_message
        )
        
        # Traitement par IA Mistral
        ai_service = MistralAIService()
        
        # Contexte utilisateur enrichi
        user_context = {
            'user_id': request.user.id,
            'user_role': request.user.role,
            'user_language': request.user.language,
            'tenant_name': getattr(request, 'tenant', {}).get('name', 'Unknown'),
            'conversation_history': [
                {'role': msg.role, 'content': msg.content}
                for msg in conversation.messages.order_by('timestamp')[-10:]
            ],
            'conversation_type': conversation.conversation_type,
            'user_preferences': _get_user_ai_preferences(request.user)
        }
        
        ai_response = ai_service.process_user_request(user_message, user_context)
        
        # Sauvegarder réponse IA
        ai_msg = AIMessage.objects.create(
            conversation=conversation,
            role='assistant',
            content=ai_response['message'],
            model_used=ai_response.get('model', 'mistral-medium'),
            tokens_used=ai_response.get('tokens', 0),
            response_time_ms=ai_response.get('response_time', 0)
        )
        
        # Exécuter action si demandée
        action_result = None
        if ai_response.get('action'):
            try:
                action_result = _execute_ai_action(
                    ai_response['action'],
                    ai_response.get('parameters', {}),
                    request.user,
                    conversation
                )
                
                # Enregistrer l'action
                ai_action = AIAction.objects.create(
                    user=request.user,
                    conversation=conversation,
                    action_type=ai_response['action'],
                    parameters=ai_response.get('parameters', {}),
                    result=action_result,
                    success=action_result.get('success', False),
                    requires_approval=action_result.get('requires_approval', False),
                    confidence_score=ai_response.get('confidence', 0.8)
                )
                
                # Mettre à jour le message IA
                ai_msg.action_triggered = ai_response['action']
                ai_msg.action_result = action_result
                ai_msg.save()
                
            except Exception as e:
                action_result = {
                    'success': False,
                    'error': str(e)
                }
        
        # Mettre à jour conversation
        conversation.updated_at = timezone.now()
        conversation.save()
        
        # Enregistrer les analytics
        _record_ai_analytics(request.user, ai_response)
        
        response_data = {
            'status': 'success',
            'conversation_id': str(conversation.id),
            'message_id': str(ai_msg.id),
            'ai_response': ai_response['message'],
            'action_result': action_result,
            'timestamp': ai_msg.timestamp.isoformat(),
            'tokens_used': ai_response.get('tokens', 0)
        }
        
        return JsonResponse(response_data)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': _('JSON invalide')}, status=400)
    except Exception as e:
        logger.error(f"Erreur traitement message IA: {str(e)}")
        return JsonResponse({'error': _('Erreur serveur: %(error)s') % {'error': str(e)}}, status=500)


@login_required
@require_http_methods(["POST"])
def ai_approve_action(request, action_id):
    """Approuve ou rejette une action IA en attente"""
    
    try:
        ai_action = AIAction.objects.get(
            id=action_id,
            user=request.user,
            requires_approval=True,
            approved__isnull=True
        )
    except AIAction.DoesNotExist:
        return JsonResponse({'error': _('Action introuvable')}, status=404)
    
    approve = request.POST.get('approve') == 'true'
    comments = request.POST.get('comments', '')
    
    ai_action.approved = approve
    ai_action.approved_by = request.user
    ai_action.approved_at = timezone.now()
    ai_action.status = 'approved' if approve else 'rejected'
    ai_action.save()
    
    if approve:
        # Exécuter l'action maintenant qu'elle est approuvée
        try:
            result = _execute_ai_action(
                ai_action.action_type,
                ai_action.parameters,
                request.user,
                ai_action.conversation,
                skip_approval=True
            )
            ai_action.result = result
            ai_action.success = result.get('success', False)
            ai_action.status = 'executed' if result.get('success') else 'failed'
            ai_action.save()
            
            message = _('Action approuvée et exécutée avec succès.')
            
            # Créer une notification de succès
            AINotification.objects.create(
                user=request.user,
                notification_type='action_completed',
                title=_('Action IA exécutée'),
                message=f"L'action '{ai_action.get_action_type_display()}' a été exécutée avec succès.",
                priority='medium'
            )
            
        except Exception as e:
            ai_action.error_message = str(e)
            ai_action.success = False
            ai_action.status = 'failed'
            ai_action.save()
            message = _('Action approuvée mais échec execution: %(error)s') % {'error': str(e)}
    else:
        message = _('Action refusée.')
    
    return JsonResponse({
        'status': 'success',
        'message': message
    })


@login_required
def ai_notifications_list(request):
    """Liste des notifications IA"""
    
    notifications = AINotification.objects.filter(
        user=request.user
    ).order_by('-created_at')
    
    # Marquer comme lues les notifications affichées
    unread_notifications = notifications.filter(is_read=False)
    for notification in unread_notifications[:20]:  # Limiter pour performance
        notification.mark_as_read()
    
    # Pagination
    paginator = Paginator(notifications, 25)
    page_number = request.GET.get('page')
    notifications_page = paginator.get_page(page_number)
    
    context = {
        'notifications': notifications_page,
    }
    
    return render(request, 'ai_assistant/notifications_list.html', context)


@login_required
def ai_dashboard(request):
    """Dashboard IA avec statistiques d'usage"""
    
    # Période d'analyse : 30 derniers jours
    thirty_days_ago = timezone.now() - timedelta(days=30)
    
    # Statistiques personnelles
    stats = {
        'conversations_count': AIConversation.objects.filter(
            user=request.user,
            created_at__gte=thirty_days_ago
        ).count(),
        
        'messages_count': AIMessage.objects.filter(
            conversation__user=request.user,
            timestamp__gte=thirty_days_ago,
            role='user'
        ).count(),
        
        'actions_executed': AIAction.objects.filter(
            user=request.user,
            executed_at__gte=thirty_days_ago,
            success=True
        ).count(),
        
        'avg_response_time': AIMessage.objects.filter(
            conversation__user=request.user,
            timestamp__gte=thirty_days_ago,
            role='assistant'
        ).aggregate(avg_time=Avg('response_time_ms'))['avg_time'] or 0,
        
        'tokens_used': AIMessage.objects.filter(
            conversation__user=request.user,
            timestamp__gte=thirty_days_ago,
            role='assistant'
        ).aggregate(total_tokens=Sum('tokens_used'))['total_tokens'] or 0,
    }
    
    # Actions par type
    action_breakdown = AIAction.objects.filter(
        user=request.user,
        executed_at__gte=thirty_days_ago
    ).values('action_type').annotate(
        count=Count('id')
    ).order_by('-count')
    
    # Satisfaction utilisateur (basée sur les notes)
    satisfaction_data = AIMessage.objects.filter(
        conversation__user=request.user,
        timestamp__gte=thirty_days_ago,
        role='assistant',
        user_rating__isnull=False
    ).aggregate(
        avg_rating=Avg('user_rating'),
        total_ratings=Count('user_rating')
    )
    
    # Économies estimées
    estimated_savings = _calculate_ai_time_savings(request.user, thirty_days_ago)
    
    # Graphique d'utilisation quotidienne
    daily_usage = AIMessage.objects.filter(
        conversation__user=request.user,
        timestamp__gte=thirty_days_ago,
        role='user'
    ).extra(
        select={'day': 'date(timestamp)'}
    ).values('day').annotate(
        count=Count('id')
    ).order_by('day')
    
    context = {
        'stats': stats,
        'action_breakdown': action_breakdown,
        'satisfaction_data': satisfaction_data,
        'estimated_savings': estimated_savings,
        'daily_usage': list(daily_usage),
    }
    
    return render(request, 'ai_assistant/dashboard.html', context)


@login_required
def ai_actions_list(request):
    """Liste des actions IA exécutées"""
    
    actions = AIAction.objects.filter(
        user=request.user
    ).select_related('conversation', 'approved_by').order_by('-executed_at')
    
    # Filtres
    status_filter = request.GET.get('status')
    action_type_filter = request.GET.get('action_type')
    
    if status_filter:
        actions = actions.filter(status=status_filter)
    
    if action_type_filter:
        actions = actions.filter(action_type=action_type_filter)
    
    # Pagination
    paginator = Paginator(actions, 25)
    page_number = request.GET.get('page')
    actions_page = paginator.get_page(page_number)
    
    # Données pour filtres
    action_types = AIAction.ACTION_TYPES
    status_choices = AIAction.ACTION_STATUS
    
    context = {
        'actions': actions_page,
        'action_types': action_types,
        'status_choices': status_choices,
        'current_filters': {
            'status': status_filter,
            'action_type': action_type_filter,
        }
    }
    
    return render(request, 'ai_assistant/actions_list.html', context)


@login_required
def ai_settings(request):
    """Paramètres de l'assistant IA"""
    
    if request.method == 'POST':
        # Mettre à jour les préférences IA de l'utilisateur
        ai_notifications = request.POST.get('ai_notifications') == 'on'
        auto_approve_limit = request.POST.get('auto_approve_limit')
        
        request.user.ai_notifications = ai_notifications
        if auto_approve_limit:
            request.user.ai_auto_approve_limit = float(auto_approve_limit)
        request.user.save()
        
        # Mettre à jour les préférences dans UserPreferences
        preferences = getattr(request.user, 'preferences', None)
        if preferences:
            ai_settings = preferences.notification_settings.get('ai_settings', {})
            ai_settings.update({
                'auto_suggestions': request.POST.get('auto_suggestions') == 'on',
                'proactive_insights': request.POST.get('proactive_insights') == 'on',
                'learning_enabled': request.POST.get('learning_enabled') == 'on',
                'preferred_model': request.POST.get('preferred_model', 'mistral-medium'),
                'response_style': request.POST.get('response_style', 'professional'),
            })
            preferences.notification_settings['ai_settings'] = ai_settings
            preferences.save()
        
        messages.success(request, _('Paramètres IA mis à jour avec succès.'))
        return redirect('ai_assistant:settings')
    
    # Récupérer les paramètres actuels
    preferences = getattr(request.user, 'preferences', None)
    ai_settings = {}
    if preferences:
        ai_settings = preferences.notification_settings.get('ai_settings', {})
    
    context = {
        'ai_settings': ai_settings,
        'user': request.user,
        'available_models': [
            ('mistral-small', 'Mistral Small (Rapide)'),
            ('mistral-medium', 'Mistral Medium (Équilibré)'),
            ('mistral-large', 'Mistral Large (Avancé)'),
        ],
        'response_styles': [
            ('professional', _('Professionnel')),
            ('friendly', _('Amical')),
            ('concise', _('Concis')),
            ('detailed', _('Détaillé')),
        ]
    }
    
    return render(request, 'ai_assistant/settings.html', context)


@login_required
def ai_training_data(request):
    """Interface de gestion des données d'apprentissage"""
    
    if request.user.role not in ['admin', 'manager']:
        messages.error(request, _('Accès non autorisé.'))
        return redirect('ai_assistant:chat_interface')
    
    # Données d'apprentissage par type
    learning_data = AILearningData.objects.filter(
        user=request.user
    ).values('data_type').annotate(
        count=Count('id'),
        avg_confidence=Avg('confidence_level')
    ).order_by('-count')
    
    # Données récentes
    recent_data = AILearningData.objects.filter(
        user=request.user
    ).order_by('-created_at')[:20]
    
    context = {
        'learning_data': learning_data,
        'recent_data': recent_data,
    }
    
    return render(request, 'ai_assistant/training_data.html', context)


@login_required
@require_http_methods(["POST"])
def ai_rate_message(request, message_id):
    """Noter un message de l'IA"""
    
    try:
        message = AIMessage.objects.get(
            id=message_id,
            conversation__user=request.user,
            role='assistant'
        )
    except AIMessage.DoesNotExist:
        return JsonResponse({'error': _('Message introuvable')}, status=404)
    
    rating = request.POST.get('rating')
    feedback = request.POST.get('feedback', '')
    
    try:
        rating = int(rating)
        if 1 <= rating <= 5:
            message.user_rating = rating
            message.feedback = feedback
            message.save()
            
            # Enregistrer dans les données d'apprentissage
            AILearningData.objects.create(
                data_type='user_preferences',
                data={
                    'message_id': str(message.id),
                    'rating': rating,
                    'feedback': feedback,
                    'message_content': message.content[:200],
                    'action_triggered': message.action_triggered
                },
                confidence_level=rating / 5.0,
                user=request.user,
                source_action=None
            )
            
            return JsonResponse({
                'status': 'success',
                'message': _('Merci pour votre évaluation !')
            })
        else:
            return JsonResponse({'error': _('Note invalide')}, status=400)
            
    except ValueError:
        return JsonResponse({'error': _('Note invalide')}, status=400)


# ===== VUES UTILITAIRES =====

@login_required
def ai_extract_invoice_data(request):
    """Extraction de données de facture via IA"""
    
    if request.method == 'POST' and request.FILES.get('document'):
        try:
            document = request.FILES['document']
            
            # Lire le contenu du document (simplifié - en réalité utiliser OCR)
            content = document.read().decode('utf-8', errors='ignore')
            
            # Utiliser l'IA pour extraire les données
            ai_service = MistralAIService()
            extracted_data = ai_service.extract_invoice_data_from_document(content)
            
            return JsonResponse({
                'status': 'success',
                'data': extracted_data
            })
            
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            })
    
    return render(request, 'ai_assistant/extract_invoice_data.html')


@login_required
def ai_analyze_document(request):
    """Analyse de document via IA"""
    
    if request.method == 'POST':
        document_text = request.POST.get('document_text', '')
        analysis_type = request.POST.get('analysis_type', 'general')
        
        if document_text:
            try:
                ai_service = MistralAIService()
                
                # Prompt d'analyse selon le type
                analysis_prompts = {
                    'contract': "Analyse ce contrat et identifie les points clés, risques et recommandations.",
                    'invoice': "Analyse cette facture et vérifie sa conformité et exactitude.",
                    'report': "Analyse ce rapport et fournis un résumé avec les points importants.",
                    'general': "Analyse ce document et fournis un résumé structuré."
                }
                
                prompt = analysis_prompts.get(analysis_type, analysis_prompts['general'])
                full_prompt = f"{prompt}\n\nDOCUMENT:\n{document_text}"
                
                # Traitement IA
                messages = [
                    ChatMessage(role="system", content="Tu es un expert en analyse de documents d'affaires."),
                    ChatMessage(role="user", content=full_prompt)
                ]
                
                response = ai_service.client.chat(
                    model="mistral-medium",
                    messages=messages,
                    temperature=0.4,
                    max_tokens=2000
                )
                
                analysis = response.choices[0].message.content
                
                return JsonResponse({
                    'status': 'success',
                    'analysis': analysis
                })
                
            except Exception as e:
                return JsonResponse({
                    'status': 'error',
                    'message': str(e)
                })
    
    context = {
        'analysis_types': [
            ('general', _('Analyse générale')),
            ('contract', _('Contrat')),
            ('invoice', _('Facture')),
            ('report', _('Rapport')),
        ]
    }
    
    return render(request, 'ai_assistant/analyze_document.html', context)


# ===== FONCTIONS UTILITAIRES =====

def _execute_ai_action(action_type, parameters, user, conversation, skip_approval=False):
    """Exécute une action IA selon son type"""
    
    try:
        if action_type == 'create_purchase_order':
            return _ai_create_purchase_order(parameters, user)
        elif action_type == 'create_invoice':
            return _ai_create_invoice(parameters, user)
        elif action_type == 'send_reminder':
            return _ai_send_reminder(parameters, user)
        elif action_type == 'analyze_spend':
            return _ai_analyze_spend(parameters, user)
        elif action_type == 'suggest_supplier':
            return _ai_suggest_supplier(parameters, user)
        elif action_type == 'search_products':
            return _ai_search_products(parameters, user)
        elif action_type == 'generate_report':
            return _ai_generate_report(parameters, user)
        else:
            return {
                'success': False,
                'error': _('Action inconnue: %(action)s') % {'action': action_type}
            }
            
    except Exception as e:
        logger.error(f"Erreur exécution action IA {action_type}: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


def _ai_create_purchase_order(parameters, user):
    """Création de bon de commande par IA"""
    try:
        from apps.purchase_orders.models import PurchaseOrder, PurchaseOrderItem
        from apps.suppliers.models import Supplier
        
        # Validation des paramètres
        supplier_id = parameters.get('supplier_id')
        items = parameters.get('items', [])
        
        if not supplier_id:
            # Essayer de trouver un fournisseur approprié
            requirements = parameters.get('supplier_requirements', '')
            ai_service = MistralAIService()
            suggestions = ai_service.suggest_suppliers_for_request(requirements)
            
            if suggestions:
                supplier_id = suggestions[0]['supplier'].id
            else:
                return {
                    'success': False,
                    'error': _('Aucun fournisseur approprié trouvé'),
                    'requires_approval': True
                }
        
        supplier = Supplier.objects.get(id=supplier_id)
        
        # Vérifier les limites d'approbation
        estimated_total = sum(
            item.get('quantity', 1) * item.get('estimated_unit_price', 0)
            for item in items
            if item.get('estimated_unit_price')
        )
        
        requires_approval = (
            estimated_total > (user.ai_auto_approve_limit.amount if user.ai_auto_approve_limit else 1000)
        )
        
        if requires_approval and not parameters.get('skip_approval'):
            return {
                'success': False,
                'requires_approval': True,
                'message': _('Cette commande nécessite une approbation manuelle (montant: %(amount)s$)') % {
                    'amount': estimated_total
                }
            }
        
        # Créer le bon de commande
        po = PurchaseOrder.objects.create(
            supplier=supplier,
            created_by=user,
            status='draft',
            order_date=timezone.now().date(),
            expected_delivery=parameters.get('expected_delivery'),
            priority=parameters.get('priority', 'medium'),
            notes=parameters.get('notes', ''),
            created_by_ai=True,
            ai_confidence_score=parameters.get('confidence', 0.8),
            shipping_address=getattr(user, 'tenant', {}).get('address', ''),
            billing_address=getattr(user, 'tenant', {}).get('address', ''),
        )
        
        # Ajouter les articles
        for item_data in items:
            PurchaseOrderItem.objects.create(
                purchase_order=po,
                description=item_data['description'],
                quantity=item_data['quantity'],
                unit=item_data.get('unit', 'unité'),
                unit_price=item_data.get('estimated_unit_price', 0),
                suggested_by_ai=True
            )
        
        # Recalculer les totaux
        po.calculate_totals()
        po.save()
        
        return {
            'success': True,
            'purchase_order_id': str(po.id),
            'purchase_order_number': po.number,
            'message': _('Bon de commande %(number)s créé avec succès') % {'number': po.number},
            'url': po.get_absolute_url()
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': _('Erreur création BC: %(error)s') % {'error': str(e)}
        }


def _ai_create_invoice(parameters, user):
    """Création de facture par IA"""
    try:
        from apps.invoicing.models import Invoice, InvoiceItem
        from apps.suppliers.models import Client
        
        client_id = parameters.get('client_id')
        if not client_id:
            return {
                'success': False,
                'error': _('Client requis pour créer une facture')
            }
        
        client = Client.objects.get(id=client_id)
        
        # Créer la facture
        invoice = Invoice.objects.create(
            client=client,
            created_by=user,
            status='draft',
            invoice_date=timezone.now().date(),
            billing_address=client.billing_address,
            payment_terms=client.payment_terms,
            generated_by_ai=True,
            notes=parameters.get('notes', '')
        )
        
        # Ajouter les lignes
        for item_data in parameters.get('items', []):
            InvoiceItem.objects.create(
                invoice=invoice,
                description=item_data['description'],
                quantity=item_data['quantity'],
                unit_price=item_data['unit_price']
            )
        
        # Recalculer les totaux
        invoice.calculate_totals()
        invoice.save()
        
        return {
            'success': True,
            'invoice_id': str(invoice.id),
            'invoice_number': invoice.number,
            'message': _('Facture %(number)s créée avec succès') % {'number': invoice.number},
            'url': invoice.get_absolute_url()
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': _('Erreur création facture: %(error)s') % {'error': str(e)}
        }


def _ai_analyze_spend(parameters, user):
    """Analyse des dépenses par IA"""
    try:
        from apps.purchase_orders.models import PurchaseOrder
        from django.db.models import TruncMonth
        
        # Récupérer les données de dépenses
        period_months = parameters.get('period_months', 12)
        start_date = timezone.now() - timedelta(days=period_months * 30)
        
        spend_data = PurchaseOrder.objects.filter(
            created_at__gte=start_date,
            status__in=['approved', 'sent', 'received', 'completed']
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            total_amount=Sum('total_amount'),
            count=Count('id')
        ).order_by('month')
        
        # Utiliser l'IA pour analyser
        ai_service = MistralAIService()
        analysis = ai_service.generate_spend_analysis(list(spend_data))
        
        return {
            'success': True,
            'analysis': analysis,
            'data': list(spend_data),
            'message': _('Analyse des dépenses générée avec succès')
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': _('Erreur analyse dépenses: %(error)s') % {'error': str(e)}
        }


def _detect_conversation_type(user_message):
    """Détecte le type de conversation basé sur le message initial"""
    
    message_lower = user_message.lower()
    
    if any(word in message_lower for word in ['bon', 'commande', 'commander', 'acheter']):
        return 'purchase_order'
    elif any(word in message_lower for word in ['facture', 'facturer', 'paiement']):
        return 'invoice'
    elif any(word in message_lower for word in ['fournisseur', 'supplier']):
        return 'supplier'
    elif any(word in message_lower for word in ['analyse', 'rapport', 'statistique']):
        return 'analytics'
    else:
        return 'general'


def _get_user_ai_preferences(user):
    """Récupère les préférences IA de l'utilisateur"""
    
    preferences = getattr(user, 'preferences', None)
    if preferences:
        return preferences.notification_settings.get('ai_settings', {})
    
    return {
        'auto_suggestions': True,
        'proactive_insights': True,
        'learning_enabled': True,
        'preferred_model': 'mistral-medium',
        'response_style': 'professional'
    }


def _get_daily_ai_suggestions(user):
    """Génère des suggestions quotidiennes personnalisées"""
    
    suggestions = []
    
    # Vérifier les factures en retard
    from apps.invoicing.models import Invoice
    overdue_count = Invoice.objects.filter(
        status__in=['sent', 'viewed', 'partial'],
        due_date__lt=timezone.now().date()
    ).count()
    
    if overdue_count > 0:
        suggestions.append({
            'type': 'alert',
            'title': _('Factures en retard'),
            'message': _('%(count)s factures nécessitent un suivi') % {'count': overdue_count},
            'action_url': '/invoicing/?overdue=true',
            'priority': 'high'
        })
    
    # Vérifier les bons de commande en attente
    from apps.purchase_orders.models import PurchaseOrder
    pending_count = PurchaseOrder.objects.filter(status='pending').count()
    
    if pending_count > 0 and user.role in ['admin', 'manager']:
        suggestions.append({
            'type': 'action',
            'title': _('Approbations en attente'),
            'message': _('%(count)s bons de commande à approuver') % {'count': pending_count},
            'action_url': '/purchase-orders/?status=pending',
            'priority': 'medium'
        })
    
    return suggestions


def _record_ai_analytics(user, ai_response):
    """Enregistre les analytics d'utilisation IA"""
    
    today = timezone.now().date()
    
    # Enregistrer les métriques
    metrics = [
        ('token_usage', ai_response.get('tokens', 0)),
        ('response_time', ai_response.get('response_time', 0)),
    ]
    
    for metric_type, value in metrics:
        AIAnalytics.objects.update_or_create(
            metric_type=metric_type,
            user=user,
            date=today,
            period='daily',
            defaults={
                'value': value,
                'metadata': {
                    'model_used': ai_response.get('model', 'mistral-medium'),
                    'action_triggered': ai_response.get('action')
                }
            }
        )


def _calculate_ai_time_savings(user, since_date):
    """Calcule les économies de temps grâce à l'IA"""
    
    # Estimation du temps économisé par action (en minutes)
    time_savings_minutes = {
        'create_purchase_order': 15,
        'create_invoice': 10,
        'send_reminder': 5,
        'analyze_spend': 30,
        'suggest_supplier': 20,
        'search_products': 10,
        'generate_report': 45,
    }
    
    actions = AIAction.objects.filter(
        user=user,
        executed_at__gte=since_date,
        success=True
    ).values('action_type').annotate(count=Count('id'))
    
    total_minutes_saved = sum(
        action['count'] * time_savings_minutes.get(action['action_type'], 0)
        for action in actions
    )
    
    return {
        'minutes_saved': total_minutes_saved,
        'hours_saved': round(total_minutes_saved / 60, 1),
        'estimated_cost_savings': round(total_minutes_saved * 0.5, 2)  # 0.50$/min
    }