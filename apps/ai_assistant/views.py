from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework.decorators import action
from django.utils import timezone
from asgiref.sync import async_to_sync
from .models import Conversation, Message, AIUsageLog, ProactiveSuggestion, UserSuggestionHistory
from .serializers import ChatRequestSerializer, ConversationSerializer, MessageSerializer, AIUsageLogSerializer
# Lazy imports to avoid module-level initialization errors
# from .services import MistralService, ActionExecutor
# from .ocr_service import OCRService
from .action_manager import action_manager
from .throttles import AIUserRateThrottle, AIOrgRateThrottle, AIBurstRateThrottle
from .sanitizer import sanitize_user_input, detect_injection_attempt
from .token_monitor import token_monitor
import asyncio
import logging

logger = logging.getLogger(__name__)


def _get_or_create_conversation(user, conversation_id, first_message):
    """Récupère ou crée la conversation (isolation multi-tenant)."""
    user_org = getattr(user, 'organization', None)
    if conversation_id:
        conv_filter = {'id': conversation_id, 'user': user}
        if user_org:
            conv_filter['organization'] = user_org
        return Conversation.objects.get(**conv_filter)
    title = first_message[:50] + "..." if len(first_message) > 50 else first_message
    return Conversation.objects.create(user=user, organization=user_org, title=title)


def _run_legacy_confirmation(orchestrator, confirmation_data, user_ctx):
    """Compat : exécute directement une création confirmée (ancien format front).

    Détecte l'action à partir de `entity_type` puis exécute via le registry.
    Partagé entre ChatView et ChatStreamView.
    """
    from .services import OrchestratorResult
    entity_type = confirmation_data.get('entity_type')
    action_name = f'create_{entity_type}' if entity_type else None
    if not action_name:
        return OrchestratorResult(
            reply="Je n'ai pas pu déterminer le type d'élément à créer. Veuillez préciser.",
            success=False,
        )
    result = async_to_sync(orchestrator.registry.call)(action_name, confirmation_data, user_ctx)
    if result.get('success'):
        reply = result.get('message', 'Création réussie.')
    else:
        reply = f"Erreur : {result.get('error', 'inconnue')}"
    return OrchestratorResult(
        reply=reply,
        tool_results=[{'function': action_name, 'result': result}],
        success=result.get('success', False),
    )


def _record_ai_usage(org, user, tokens):
    """Comptabilise les tokens consommés pour le suivi de budget.

    Indispensable : `token_monitor.check_budget` (vérifié AVANT chaque requête)
    lit des compteurs que SEUL `track_usage` incrémente. Sans cet appel, la limite
    de budget tokens ne se déclencherait jamais pour le flux orchestrateur.
    """
    if not org or not tokens:
        return
    try:
        token_monitor.track_usage(
            tokens_used=int(tokens),
            user_id=getattr(user, 'id', None),
            organization_id=org.id,
        )
    except Exception:  # le suivi ne doit jamais casser la réponse
        logger.warning("token_monitor.track_usage a échoué", exc_info=True)


def _persist_ai_message(conversation, *, reply, tool_results=None, charts=None,
                        pending_action=None, tokens=0, agent_steps=None):
    """Persiste le message assistant et construit le contrat de réponse UNIFIÉ.

    Partagé entre ChatView (réponse JSON classique) et ChatStreamView (événement
    SSE 'done'). `reply` est TOUJOURS une string non vide. `agent_steps` est la
    trace de la boucle agentique (timeline), persistée dans metadata pour rester
    visible au rechargement de la conversation.
    """
    from apps.core.text_utils import strip_emojis
    reply = strip_emojis((reply or "").strip()) or "Je n'ai pas de réponse à fournir pour le moment."

    # action_results au format attendu par MessageContent.jsx (charts inclus)
    action_results = tool_results or None

    # action_buttons : extraits des success_actions éventuels présents dans les résultats
    action_buttons = None
    if action_results:
        for ar in action_results:
            res = ar.get('result', {}) if isinstance(ar, dict) else {}
            if isinstance(res, dict) and res.get('success_actions'):
                action_buttons = res['success_actions']
                break

    metadata = {}
    if action_results:
        metadata['action_results'] = action_results
    if pending_action:
        metadata['pending_action'] = pending_action
    if agent_steps:
        metadata['agent_steps'] = agent_steps

    ai_msg = Message.objects.create(
        conversation=conversation,
        role='assistant',
        content=reply,
        metadata=metadata or None,
    )

    conversation.last_message_at = timezone.now()
    conversation.save()

    # chart top-level = miroir du premier graphique (confort front)
    chart = charts[0] if charts else None

    return {
        'status': 'success',
        'conversation_id': str(conversation.id),
        'reply': reply,                       # source de vérité
        'ai_response': reply,                 # compat
        'message': MessageSerializer(ai_msg).data,
        'action_results': action_results,
        'action_buttons': action_buttons,
        'chart': chart,
        'needs_confirmation': pending_action,
        'tokens_used': tokens,
        'agent_steps': agent_steps or [],
    }


class ChatView(APIView):
    """Endpoint principal pour le chat avec l'IA"""
    permission_classes = [IsAuthenticated]
    throttle_classes = [AIUserRateThrottle, AIOrgRateThrottle, AIBurstRateThrottle]

    def post(self, request):
        """Envoyer un message à l'IA.

        Délègue toute l'orchestration à l'Orchestrator (flux à 2 appels LLM :
        récupération des données via les outils puis synthèse). Retourne un
        contrat de réponse UNIFIÉ dont le champ `reply` (string non vide) est la
        source de vérité pour l'affichage côté frontend.
        """
        from .services import get_orchestrator, AsyncSafeUserContext

        serializer = ChatRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user_message = serializer.validated_data['message']
        conversation_id = serializer.validated_data.get('conversation_id')
        confirmation_data = serializer.validated_data.get('confirmation_data') or {}
        page = serializer.validated_data.get('page')

        # Sanitisation anti-injection (sur le message brut, avant nettoyage)
        detect_injection_attempt(serializer.validated_data['message'])
        user_message = sanitize_user_input(user_message)

        # Quota / budget IA (inchangé)
        org = getattr(request.user, 'organization', None)
        if org:
            try:
                from apps.subscriptions.quota_service import QuotaService
                quota = QuotaService.check_quota(org, 'ai_requests', raise_exception=False)
                if not quota['can_proceed']:
                    return Response({
                        'error': 'quota_exceeded',
                        'message': "Quota de requetes IA atteint pour ce mois. Passez au plan superieur.",
                    }, status=status.HTTP_402_PAYMENT_REQUIRED)
            except Exception:
                pass

            budget_status = token_monitor.check_budget(org.id)
            if not budget_status['allowed']:
                return Response({
                    'error': 'budget_exceeded',
                    'message': budget_status['reason'],
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        try:
            # Récupérer ou créer la conversation (isolation multi-tenant)
            conversation = self._get_or_create_conversation(request.user, conversation_id, user_message)

            # Message utilisateur persisté
            Message.objects.create(conversation=conversation, role='user', content=user_message)

            orchestrator = get_orchestrator()
            user_ctx = AsyncSafeUserContext.from_user(request.user)

            # --- Confirmation structurée par token (nouveau format) ---
            token = confirmation_data.get('token')
            choice = confirmation_data.get('choice')
            if token and choice:
                result = async_to_sync(orchestrator.run_confirmation)(
                    token=token, choice=choice, user_ctx=user_ctx,
                )
            # --- Compatibilité : ancien format force_create direct ---
            elif confirmation_data.get('force_create'):
                result = self._run_legacy_confirmation(orchestrator, confirmation_data, user_ctx)
            else:
                # --- Flux normal : orchestration 2 appels LLM ---
                history = list(
                    Message.objects.filter(conversation=conversation)
                    .order_by('created_at')
                    .values('role', 'content')
                )[:-1]
                result = async_to_sync(orchestrator.run)(
                    message=user_message,
                    user_ctx=user_ctx,
                    conversation_history=history,
                    page=page,
                    user=request.user,
                )

            response_data = self._persist_and_build_response(conversation, result)

            # Comptabiliser les tokens consommés (alimente check_budget) + quota IA.
            _record_ai_usage(org, request.user, result.tokens)
            if org:
                try:
                    from apps.subscriptions.quota_service import QuotaService
                    QuotaService.increment_usage(org, 'ai_requests')
                except Exception:
                    pass

            return Response(response_data, status=status.HTTP_200_OK)

        except Conversation.DoesNotExist:
            return Response(
                {'error': 'conversation_not_found', 'message': 'Conversation introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.error(f"Chat error: {e}", exc_info=True)
            return Response(
                {'error': 'service_unavailable', 'message': "Une erreur est survenue. Veuillez reessayer."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # ------------------------------------------------------------------ helpers
    def _get_or_create_conversation(self, user, conversation_id, first_message):
        return _get_or_create_conversation(user, conversation_id, first_message)

    def _run_legacy_confirmation(self, orchestrator, confirmation_data, user_ctx):
        """Compat ancien format de confirmation (voir _run_legacy_confirmation module)."""
        return _run_legacy_confirmation(orchestrator, confirmation_data, user_ctx)

    def _persist_and_build_response(self, conversation, result):
        """Persiste la réponse IA et construit le contrat unifié (voir _persist_ai_message)."""
        return _persist_ai_message(
            conversation,
            reply=result.reply,
            tool_results=result.tool_results,
            charts=result.charts,
            pending_action=result.pending_action,
            tokens=result.tokens,
        )


class ChatStreamView(APIView):
    """Chat IA en streaming (SSE) — boucle agentique avec étapes visibles.

    POST /ai/chat/stream/ : même contrat d'entrée que ChatView. La réponse est
    un flux `text/event-stream` d'événements JSON (`data: {...}\\n\\n`) :

        status / text_delta / thought / tool_start / tool_result / chart
        done   -> payload identique à la réponse JSON de ChatView (+ agent_steps)
        error  -> message d'erreur affichable

    Le frontend (AIChat.jsx) consomme ce flux via fetch + ReadableStream et
    affiche la timeline des étapes au fur et à mesure. Les confirmations
    (token + choice) passent aussi par cet endpoint : elles n'émettent qu'un
    événement 'done' (pas d'étapes intermédiaires).
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [AIUserRateThrottle, AIOrgRateThrottle, AIBurstRateThrottle]

    def post(self, request):
        import json as json_mod
        from django.http import StreamingHttpResponse
        from .services import get_orchestrator, AsyncSafeUserContext

        serializer = ChatRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user_message = serializer.validated_data['message']
        conversation_id = serializer.validated_data.get('conversation_id')
        confirmation_data = serializer.validated_data.get('confirmation_data') or {}
        page = serializer.validated_data.get('page')

        detect_injection_attempt(serializer.validated_data['message'])
        user_message = sanitize_user_input(user_message)

        # Quota / budget IA : refus AVANT d'ouvrir le flux (réponses JSON classiques)
        org = getattr(request.user, 'organization', None)
        if org:
            try:
                from apps.subscriptions.quota_service import QuotaService
                quota = QuotaService.check_quota(org, 'ai_requests', raise_exception=False)
                if not quota['can_proceed']:
                    return Response({
                        'error': 'quota_exceeded',
                        'message': "Quota de requetes IA atteint pour ce mois. Passez au plan superieur.",
                    }, status=status.HTTP_402_PAYMENT_REQUIRED)
            except Exception:
                pass

            budget_status = token_monitor.check_budget(org.id)
            if not budget_status['allowed']:
                return Response({
                    'error': 'budget_exceeded',
                    'message': budget_status['reason'],
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        try:
            conversation = _get_or_create_conversation(request.user, conversation_id, user_message)
        except Conversation.DoesNotExist:
            return Response(
                {'error': 'conversation_not_found', 'message': 'Conversation introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        Message.objects.create(conversation=conversation, role='user', content=user_message)

        orchestrator = get_orchestrator()
        user_ctx = AsyncSafeUserContext.from_user(request.user)
        user = request.user

        def sse(payload):
            return f"data: {json_mod.dumps(payload, ensure_ascii=False, default=str)}\n\n"

        def event_stream():
            tokens_this_request = 0
            try:
                token = confirmation_data.get('token')
                choice = confirmation_data.get('choice')
                if token and choice:
                    # Confirmation : exécution directe, un seul événement 'done'.
                    yield sse({'type': 'status', 'message': "Exécution de l'action confirmée"})
                    result = async_to_sync(orchestrator.run_confirmation)(
                        token=token, choice=choice, user_ctx=user_ctx,
                    )
                    tokens_this_request = result.tokens
                    payload = _persist_ai_message(
                        conversation,
                        reply=result.reply,
                        tool_results=result.tool_results,
                        charts=result.charts,
                        pending_action=result.pending_action,
                        tokens=result.tokens,
                    )
                    yield sse({'type': 'done', **payload})
                elif confirmation_data.get('force_create'):
                    # Compat : ancien format de confirmation (création forcée directe).
                    yield sse({'type': 'status', 'message': "Exécution de l'action confirmée"})
                    result = _run_legacy_confirmation(orchestrator, confirmation_data, user_ctx)
                    tokens_this_request = result.tokens
                    payload = _persist_ai_message(
                        conversation,
                        reply=result.reply,
                        tool_results=result.tool_results,
                        charts=result.charts,
                        tokens=result.tokens,
                    )
                    yield sse({'type': 'done', **payload})
                else:
                    history = list(
                        Message.objects.filter(conversation=conversation)
                        .order_by('created_at')
                        .values('role', 'content')
                    )[:-1]
                    for event in orchestrator.run_stream(
                        message=user_message,
                        user_ctx=user_ctx,
                        conversation_history=history,
                        page=page,
                        user=user,
                    ):
                        if event['type'] == 'final':
                            # Terminal : persistance + contrat unifié (jamais relayé brut).
                            tokens_this_request = event['tokens']
                            payload = _persist_ai_message(
                                conversation,
                                reply=event['reply'],
                                tool_results=event['tool_results'],
                                charts=event['charts'],
                                pending_action=event['pending_action'],
                                tokens=event['tokens'],
                                agent_steps=event['steps'],
                            )
                            yield sse({'type': 'done', **payload})
                        else:
                            yield sse(event)

                # Comptabiliser les tokens (alimente check_budget) + quota IA.
                # Toujours exécuté même si le client coupe la connexion (le
                # générateur poursuit jusqu'à épuisement côté serveur).
                _record_ai_usage(org, user, tokens_this_request)
                if org:
                    try:
                        from apps.subscriptions.quota_service import QuotaService
                        QuotaService.increment_usage(org, 'ai_requests')
                    except Exception:
                        pass
            except Exception as e:
                logger.error(f"Chat stream error: {e}", exc_info=True)
                yield sse({'type': 'error',
                           'message': "Une erreur est survenue. Veuillez reessayer."})

        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'  # désactive le buffering Nginx
        return response


class ConversationListView(APIView):
    """Liste des conversations de l'utilisateur"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user_org = getattr(request.user, 'organization', None)
        conv_filter = {'user': request.user}
        if user_org:
            conv_filter['organization'] = user_org
        conversations = Conversation.objects.filter(
            **conv_filter
        ).order_by('-last_message_at')

        serializer = ConversationSerializer(conversations, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Créer une nouvelle conversation"""
        conversation = Conversation.objects.create(
            user=request.user,
            organization=getattr(request.user, 'organization', None),
            title=request.data.get('title', 'Nouvelle conversation')
        )
        serializer = ConversationSerializer(conversation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ConversationDetailView(APIView):
    """Détail d'une conversation avec ses messages"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, conversation_id):
        try:
            conversation = Conversation.objects.get(
                id=conversation_id,
                user=request.user
            )
            messages = Message.objects.filter(
                conversation=conversation
            ).order_by('created_at')
            
            data = {
                'conversation': ConversationSerializer(conversation).data,
                'messages': MessageSerializer(messages, many=True).data
            }
            
            return Response(data)
            
        except Conversation.DoesNotExist:
            return Response(
                {'error': 'Conversation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def delete(self, request, conversation_id):
        """Supprimer une conversation"""
        try:
            conversation = Conversation.objects.get(
                id=conversation_id,
                user=request.user
            )
            conversation.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except Conversation.DoesNotExist:
            return Response(
                {'error': 'Conversation not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class DocumentAnalysisView(APIView):
    """Analyse de documents (factures, bons de commande scannés)"""
    permission_classes = [IsAuthenticated]
    throttle_classes = [AIUserRateThrottle, AIOrgRateThrottle]
    parser_classes = [MultiPartParser, JSONParser]
    
    def post(self, request):
        """Analyser un document"""
        # Cas 1: Image uploadée
        if 'image' in request.FILES:
            image_file = request.FILES['image']
            document_type = request.data.get('document_type', 'invoice')
            
            # Valider que le fichier est bien présent
            if not image_file:
                return Response(
                    {'error': 'No image file provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            auto_create = request.data.get('auto_create', 'false').lower() == 'true'
            
            try:
                # 🚀 ANALYSE DIRECTE AVEC PIXTRAL (Vision AI)
                # +30% précision, -50% coûts, 2x plus rapide vs OCR+Mistral
                from .pixtral_service import pixtral_service, PDF_SUPPORT
                
                # Vérifier si c'est un PDF et si le support est disponible
                is_pdf = (
                    image_file.content_type == 'application/pdf' or
                    image_file.name.lower().endswith('.pdf')
                )
                
                if is_pdf and not PDF_SUPPORT:
                    return Response(
                        {
                            'error': 'Les PDFs nécessitent PyMuPDF. Installez-le avec: pip install PyMuPDF',
                            'requires_pymupdf': True
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                ai_result = pixtral_service.analyze_document_image(
                    image=image_file,
                    document_type=document_type
                )

                if not ai_result['success']:
                    return Response(
                        {'error': ai_result.get('error', 'Analyse Pixtral échouée')},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Résultat final avec données Pixtral
                final_result = {
                    'success': True,
                    'ai_extracted_data': ai_result.get('data'),
                    'tokens_used': ai_result.get('tokens_used', 0),
                    'processing_method': 'pixtral_vision'  # Pour tracking
                }
                
                # TOUJOURS créer un ImportReview (plus de création automatique directe)
                if ai_result['success']:
                    review_result = self._create_import_review(
                        document_type,
                        ai_result['data'],
                        request.user,
                        request.FILES.get('image')
                    )
                    final_result['review_id'] = review_result.get('review_id')
                    final_result['review_created'] = review_result.get('success', False)
                
                return Response(final_result)
                
            except Exception as e:
                logger.error(f"Document processing error: {e}")
                return Response(
                    {'error': f'Erreur lors du traitement: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # Cas 2: Texte fourni directement
        elif 'text' in request.data:
            text = request.data.get('text', '')
            document_type = request.data.get('document_type', 'invoice')
            
            if not text:
                return Response(
                    {'error': 'No text provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                from .services import MistralService
                mistral_service = MistralService()
                result = mistral_service.analyze_document(text, document_type)
                
                if result['success']:
                    # TOUJOURS créer un ImportReview
                    review_result = self._create_import_review(
                        document_type,
                        result['data'],
                        request.user,
                        None  # Pas d'image pour le texte
                    )
                    result['review_id'] = review_result.get('review_id')
                    result['review_created'] = review_result.get('success', False)
                    
                    return Response(result)
                else:
                    return Response(
                        {'error': result.get('error', 'Analysis failed')},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
            except Exception as e:
                logger.error(f"Document analysis error: {e}")
                return Response(
                    {'error': 'An error occurred during analysis'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        else:
            return Response(
                {'error': 'No image or text provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def _create_import_review(self, document_type, data, user, image_file=None):
        """Crée un ImportReview au lieu de créer directement l'entité"""
        from .models import ImportReview, DocumentScan
        from django.utils import timezone
        import os
        
        # Mapper les types de documents du frontend vers les types acceptés par le backend
        document_type_mapping = {
            'invoice': 'invoice',
            'purchase_order': 'purchase_order',
            'supplier_list': 'supplier',
            'product_catalog': 'product',
            'contract': 'invoice',  # Les contrats sont traités comme des factures
            'financial_report': 'invoice',  # Les rapports financiers sont traités comme des factures
            'mixed_document': 'invoice',  # Les documents mixtes sont traités comme des factures
        }
        
        # Convertir le type de document
        mapped_type = document_type_mapping.get(document_type, 'invoice')
        
        try:
            # Créer un DocumentScan si image fournie
            document_scan = None
            if image_file:
                # Sauvegarder le fichier (simplifié - à améliorer avec storage)
                file_path = f"documents/{user.id}/{image_file.name}"
                document_scan = DocumentScan.objects.create(
                    user=user,
                    document_type=document_type,  # Garder le type original pour DocumentScan
                    original_filename=image_file.name,
                    file_path=file_path,
                    extracted_data=data,
                    is_processed=False
                )
            
            # Vérifier que l'utilisateur a une organisation
            if not user.organization:
                return {
                    'success': False,
                    'error': 'User has no organization assigned'
                }
            
            # Créer l'ImportReview avec le type mappé
            review = ImportReview.objects.create(
                user=user,
                organization=user.organization,
                entity_type=mapped_type,  # Utiliser le type mappé
                extracted_data=data,
                source_document=document_scan,
                status='pending'
            )
            
            return {
                'success': True,
                'review_id': str(review.id),
                'message': 'Import créé, en attente de validation'
            }
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            logger.error(f"Error creating import review: {e}\n{error_trace}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _auto_create_entity(self, document_type, data, user):
        """Crée automatiquement une entité basée sur les données extraites avec entity matching (DEPRECATED - utilise ImportReview)"""
        try:
            if document_type == 'invoice':
                from apps.invoicing.models import Invoice, Client, InvoiceItem
                from .entity_matcher import entity_matcher
                import logging
                logger = logging.getLogger(__name__)

                # Trouver ou créer le client avec entity matching amélioré
                client_name = data.get('client_name', 'Client inconnu')
                client_email = data.get('client_email')

                # Utiliser le matching amélioré
                similar_clients = entity_matcher.find_similar_clients(
                    first_name=client_name,
                    last_name='',
                    email=client_email if client_email else None,
                    company=client_name
                )

                if similar_clients:
                    # Utiliser le meilleur match pour l'auto-création
                    client = similar_clients[0][0]
                    logger.info(f"Auto-selected existing client: {client.name} (similarity: {similar_clients[0][1]*100:.0f}%)")
                else:
                    # Créer seulement si aucun similaire trouvé
                    client = Client.objects.create(name=client_name, email=client_email)
                    logger.info(f"Auto-created new client: {client_name}")
                
                # Créer la facture
                invoice = Invoice.objects.create(
                    title=f"Facture {data.get('invoice_number', '')}",
                    client=client,
                    created_by=user
                )
                
                # Ajouter les items si présents
                for item in data.get('items', []):
                    InvoiceItem.objects.create(
                        invoice=invoice,
                        description=item.get('description', ''),
                        quantity=item.get('quantity', 1),
                        unit_price=item.get('unit_price', 0)
                    )
                
                invoice.recalculate_totals()
                
                return {
                    'success': True,
                    'entity_type': 'invoice',
                    'entity_id': str(invoice.id),
                    'message': f'Facture {invoice.invoice_number} créée avec succès'
                }
                
            elif document_type == 'purchase_order':
                from apps.purchase_orders.models import PurchaseOrder, Supplier
                from .entity_matcher import entity_matcher
                import logging
                logger = logging.getLogger(__name__)

                # Trouver ou créer le fournisseur avec entity matching amélioré
                supplier_name = data.get('supplier_name', 'Fournisseur inconnu')
                supplier_email = data.get('supplier_email')
                supplier_phone = data.get('supplier_phone')

                # Utiliser le matching amélioré
                similar_suppliers = entity_matcher.find_similar_suppliers(
                    name=supplier_name,
                    email=supplier_email if supplier_email else None,
                    phone=supplier_phone if supplier_phone else None
                )

                if similar_suppliers:
                    # Utiliser le meilleur match pour l'auto-création
                    supplier = similar_suppliers[0][0]
                    logger.info(f"Auto-selected existing supplier: {supplier.name} (similarity: {similar_suppliers[0][1]*100:.0f}%)")
                else:
                    # Créer seulement si aucun similaire trouvé
                    supplier = Supplier.objects.create(
                        name=supplier_name,
                        email=supplier_email,
                        phone=supplier_phone
                    )
                    logger.info(f"Auto-created new supplier: {supplier_name}")
                
                po = PurchaseOrder.objects.create(
                    title=f"BC {data.get('po_number', '')}",
                    supplier=supplier,
                    created_by=user
                )
                
                return {
                    'success': True,
                    'entity_type': 'purchase_order',
                    'entity_id': str(po.id),
                    'message': f'Bon de commande {po.po_number} créé avec succès'
                }
                
        except Exception as e:
            logger.error(f"Auto-creation error: {e}")
            return {
                'success': False,
                'error': str(e)
            }


class QuickActionsView(APIView):
    """Actions rapides prédéfinies depuis la configuration JSON"""
    permission_classes = [IsAuthenticated]

    # Mapping entre catégories d'actions et modules requis
    # Note: Si une catégorie n'est pas dans ce dict, l'action sera toujours affichée
    CATEGORY_TO_MODULE = {
        'suppliers': 'suppliers',
        'invoices': 'invoices',
        'purchase_orders': 'purchase-orders',
        'clients': 'clients',
        'products': 'products',
        'dashboard': None,  # Toujours accessible (pas de module requis)
        'reports': 'analytics',
        'stock': 'products',
        'search': None,  # Recherche générale toujours accessible
    }

    def get(self, request):
        """Retourner les actions rapides disponibles filtrées selon les modules activés"""
        try:
            from apps.core.modules import get_user_accessible_modules

            # Récupérer la catégorie depuis les paramètres de requête
            category = request.GET.get('category')

            # Obtenir les modules accessibles pour l'utilisateur
            # Cette fonction gère Organization.enabled_modules ET UserPermissions.module_access
            user = request.user
            enabled_modules = set(get_user_accessible_modules(user))

            logger.info(f"User {user.username} accessible modules: {enabled_modules}")

            # Obtenir les actions configurables
            available_actions = action_manager.get_available_actions(category)
            logger.info(f"Total available actions: {len(available_actions)}")

            # Filtrer les actions selon les modules activés
            filtered_actions = []
            for action in available_actions:
                action_category = action.get('category')
                required_module = self.CATEGORY_TO_MODULE.get(action_category)

                # Si l'action n'a pas de module requis OU si le module est activé
                if not required_module or required_module in enabled_modules:
                    filtered_actions.append(action)
                    logger.debug(f"Action '{action['name']}' included (category: {action_category}, module: {required_module})")
                else:
                    logger.debug(f"Action '{action['name']}' filtered out (category: {action_category}, module: {required_module})")

            logger.info(f"Filtered actions: {len(filtered_actions)} out of {len(available_actions)}")

            # Convertir en format compatible avec le frontend
            quick_actions = []
            for action in filtered_actions:
                # Créer un prompt basé sur la configuration
                prompt = action_manager.create_ai_prompt(
                    action['id'],
                    'extract'
                )
                if not prompt:
                    prompt = f"Je veux {action['name'].lower()}"

                quick_actions.append({
                    'id': action['id'],
                    'title': action['name'],
                    'icon': action['icon'],
                    'prompt': prompt,
                    'description': action['description'],
                    'category': action['category']
                })

            # Ajouter les réponses rapides contextuelles si une catégorie est spécifiée
            if category:
                quick_responses = action_manager.get_quick_responses(category)
                for response in quick_responses:
                    quick_actions.append({
                        'id': f'quick_response_{len(quick_actions)}',
                        'title': response,
                        'icon': 'chat',
                        'prompt': response,
                        'category': category
                    })

            return Response({
                'actions': quick_actions,
                'total': len(quick_actions),
                'category': category,
                'summary': action_manager.get_action_summary()
            })
        except Exception as e:
            logger.error(f"Error in QuickActionsView: {e}")
            # Return empty response instead of crashing
            return Response({
                'actions': [],
                'total': 0,
                'category': request.GET.get('category'),
                'error': 'Failed to load quick actions'
            }, status=status.HTTP_200_OK)  # Return 200 with empty data instead of 503


class VoiceTranscriptionView(APIView):
    """Transcription de messages vocaux pour l'assistant IA"""
    permission_classes = [IsAuthenticated]
    throttle_classes = [AIUserRateThrottle, AIOrgRateThrottle]
    parser_classes = [MultiPartParser]

    def post(self, request):
        """Transcrire un fichier audio en texte"""
        if 'audio' not in request.FILES:
            return Response(
                {'error': 'No audio file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        audio_file = request.FILES['audio']

        try:
            # Vérifier le type de fichier
            allowed_types = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg']
            if audio_file.content_type not in allowed_types:
                return Response(
                    {'error': f'Invalid audio type. Allowed types: {", ".join(allowed_types)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Vérifier la taille du fichier (max 10MB)
            if audio_file.size > 10 * 1024 * 1024:
                return Response(
                    {'error': 'Audio file too large. Maximum size: 10MB'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Utiliser l'API Mistral pour la transcription
            # Note: Mistral AI supporte la transcription audio via leur API
            from .services import MistralService
            mistral_service = MistralService()

            # Lire le contenu du fichier
            audio_content = audio_file.read()

            # Appeler l'API de transcription
            # Pour l'instant, utilisons une méthode de fallback avec whisper ou Google Speech
            transcription_result = self._transcribe_audio(audio_content, audio_file.content_type)

            if transcription_result['success']:
                return Response({
                    'success': True,
                    'text': transcription_result['text'],
                    'language': transcription_result.get('language', 'fr'),
                    'duration': transcription_result.get('duration')
                }, status=status.HTTP_200_OK)
            else:
                return Response(
                    {'error': transcription_result.get('error', 'Transcription failed')},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except Exception as e:
            logger.error(f"Voice transcription error: {e}")
            return Response(
                {'error': 'An error occurred during transcription'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _transcribe_audio(self, audio_content, content_type):
        """
        Transcrire l'audio en utilisant Google Speech-to-Text
        """
        try:
            from google.cloud import speech
            from django.conf import settings
            import base64

            # Vérifier que les credentials Google Cloud sont configurés
            if not hasattr(settings, 'GOOGLE_APPLICATION_CREDENTIALS'):
                return {
                    'success': False,
                    'error': 'Google Cloud credentials not configured. Please set GOOGLE_APPLICATION_CREDENTIALS in settings.'
                }

            # Initialiser le client Google Speech-to-Text
            client = speech.SpeechClient()

            # Mapper les types MIME vers les encodings Google Speech
            encoding_map = {
                'audio/webm': speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
                'audio/wav': speech.RecognitionConfig.AudioEncoding.LINEAR16,
                'audio/mp3': speech.RecognitionConfig.AudioEncoding.MP3,
                'audio/mpeg': speech.RecognitionConfig.AudioEncoding.MP3,
                'audio/ogg': speech.RecognitionConfig.AudioEncoding.OGG_OPUS,
            }

            encoding = encoding_map.get(content_type, speech.RecognitionConfig.AudioEncoding.WEBM_OPUS)

            # Configuration de la reconnaissance
            config = speech.RecognitionConfig(
                encoding=encoding,
                sample_rate_hertz=48000,  # Taux d'échantillonnage standard pour WebM
                language_code="fr-FR",  # Français
                enable_automatic_punctuation=True,  # Ponctuation automatique
                model="default",  # Modèle par défaut (ou "latest_long" pour audio long)
                use_enhanced=True,  # Utiliser le modèle amélioré si disponible
            )

            # Préparer l'audio
            audio = speech.RecognitionAudio(content=audio_content)

            # Effectuer la transcription
            response = client.recognize(config=config, audio=audio)

            # Extraire le texte transcrit
            if not response.results:
                return {
                    'success': False,
                    'error': 'No speech detected in the audio file'
                }

            # Combiner tous les résultats
            transcription_text = ' '.join([
                result.alternatives[0].transcript
                for result in response.results
            ])

            # Obtenir la confiance moyenne
            confidence = sum([
                result.alternatives[0].confidence
                for result in response.results
            ]) / len(response.results) if response.results else 0

            return {
                'success': True,
                'text': transcription_text,
                'language': 'fr-FR',
                'confidence': confidence
            }

        except ImportError:
            return {
                'success': False,
                'error': 'Google Cloud Speech library not installed. Run: pip install google-cloud-speech'
            }
        except Exception as e:
            logger.error(f"Google Speech-to-Text error: {e}")
            return {
                'success': False,
                'error': f'Transcription error: {str(e)}'
            }


class AIUsageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API ViewSet pour consulter les statistiques d'utilisation de l'IA
    Endpoints backend pour le monitoring et contrôle d'utilisation
    """
    serializer_class = AIUsageLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filtrer par organisation de l'utilisateur"""
        return AIUsageLog.objects.filter(
            organization=self.request.user.organization
        )

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        GET /api/ai/usage/stats/?period=day|week|month&user_id=X

        Retourne les statistiques agrégées d'utilisation AI
        """
        from .usage_analytics import UsageAnalytics

        period = request.query_params.get('period', 'month')
        user_id = request.query_params.get('user_id')

        # Vérifier permissions: seuls les admins peuvent voir stats des autres users
        if user_id and user_id != str(request.user.id):
            if not request.user.is_staff:
                return Response({
                    'error': 'Permission denied. Only admins can view other users stats.'
                }, status=status.HTTP_403_FORBIDDEN)

        try:
            stats = UsageAnalytics.get_usage_stats(
                organization_id=request.user.organization_id,
                period=period,
                user_id=user_id
            )

            return Response(stats)

        except Exception as e:
            logger.error(f"Error getting AI usage stats: {e}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def logs(self, request):
        """
        GET /api/ai/usage/logs/?action_type=X&page=1

        Liste paginée des logs d'utilisation AI
        """
        qs = self.get_queryset()

        # Filtres
        action_type = request.query_params.get('action_type')
        if action_type:
            qs = qs.filter(action_type=action_type)

        user_id = request.query_params.get('user_id')
        if user_id:
            # Vérifier permissions
            if user_id != str(request.user.id) and not request.user.is_staff:
                return Response({
                    'error': 'Permission denied'
                }, status=status.HTTP_403_FORBIDDEN)
            qs = qs.filter(user_id=user_id)

        # Pagination
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def budget_status(self, request):
        """
        GET /api/ai/usage/budget-status/

        Retourne l'état actuel du budget tokens (horaire et journalier)
        """
        from .usage_analytics import UsageAnalytics

        try:
            status_data = UsageAnalytics.get_organization_budget_status(
                organization_id=request.user.organization_id
            )

            return Response(status_data)

        except Exception as e:
            logger.error(f"Error getting budget status: {e}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def my_usage(self, request):
        """
        GET /api/ai/usage/my-usage/?days=30

        Résumé d'utilisation pour l'utilisateur connecté
        """
        from .usage_analytics import UsageAnalytics

        days = int(request.query_params.get('days', 30))

        try:
            usage_summary = UsageAnalytics.get_user_usage_summary(
                user_id=request.user.id,
                days=days
            )

            return Response(usage_summary)

        except Exception as e:
            logger.error(f"Error getting user usage summary: {e}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        GET /api/ai/usage/summary/

        Résumé rapide pour le header AIChat (tokens aujourd'hui, coût, notifications)
        """
        from django.utils import timezone
        from datetime import timedelta
        from decimal import Decimal
        from .models import AINotification

        try:
            today = timezone.now().date()
            this_month_start = today.replace(day=1)

            # Stats d'aujourd'hui
            today_logs = AIUsageLog.objects.filter(
                user=request.user,
                created_at__date=today
            )
            today_tokens = sum(log.total_tokens for log in today_logs)
            today_cost = sum(log.estimated_cost for log in today_logs)

            # Stats du mois
            month_logs = AIUsageLog.objects.filter(
                user=request.user,
                created_at__date__gte=this_month_start
            )
            month_tokens = sum(log.total_tokens for log in month_logs)
            month_cost = sum(log.estimated_cost for log in month_logs)

            # Nombre de notifications non lues
            notifications_count = AINotification.objects.filter(
                user=request.user,
                is_read=False
            ).count()

            # Nombre de suggestions actives
            from .suggestion_matcher import suggestion_matcher
            suggestions = suggestion_matcher.get_suggestions_for_user(request.user, include_intelligent=True)
            suggestions_count = len(suggestions) if suggestions else 0

            return Response({
                'today': {
                    'tokens': today_tokens,
                    'cost': float(today_cost),
                    'requests': today_logs.count()
                },
                'month': {
                    'tokens': month_tokens,
                    'cost': float(month_cost),
                    'requests': month_logs.count()
                },
                'notifications_count': notifications_count,
                'suggestions_count': suggestions_count
            })

        except Exception as e:
            logger.error(f"Error getting usage summary: {e}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ProactiveSuggestionsView(APIView):
    """
    API endpoints pour les suggestions proactives
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        GET /api/ai/suggestions/

        Retourne les suggestions actives pour l'utilisateur connecté
        Inclut les ProactiveSuggestions et les ProactiveConversations avec actions d'envoi d'email
        """
        from .suggestion_matcher import suggestion_matcher
        from .models import ProactiveConversation

        try:
            # Récupérer suggestions pour l'utilisateur
            suggestions = suggestion_matcher.get_suggestions_for_user(request.user)

            # Marquer comme affichées
            for suggestion in suggestions:
                suggestion_matcher.mark_suggestion_displayed(request.user, suggestion)

            # Sérialiser
            suggestions_data = []
            for suggestion in suggestions:
                if isinstance(suggestion, dict):
                    suggestions_data.append({
                        'id': suggestion.get('id', 'intelligent_insight'),
                        'type': suggestion.get('type', 'intelligent'),
                        'title': suggestion.get('title', ''),
                        'message': suggestion.get('message', ''),
                        'action_label': suggestion.get('action_label', ''),
                        'action_url': suggestion.get('action_url', ''),
                        'priority': suggestion.get('priority', 5)
                    })
                else:
                    suggestions_data.append({
                        'id': str(suggestion.id),
                        'type': getattr(suggestion, 'suggestion_type', 'suggestion'),
                        'title': getattr(suggestion, 'title', ''),
                        'message': getattr(suggestion, 'message', ''),
                        'action_label': getattr(suggestion, 'action_label', ''),
                        'action_url': getattr(suggestion, 'action_url', ''),
                        'priority': getattr(suggestion, 'priority', 5)
                    })

            # Ajouter les ProactiveConversations avec actions d'envoi d'email
            email_conversations = ProactiveConversation.objects.filter(
                user=request.user,
                status='pending',
                context_data__template_key__in=['invoices_to_send', 'invoices_followup', 'purchase_orders_to_send']
            ).order_by('-created_at')[:5]

            for conv in email_conversations:
                template_key = conv.context_data.get('template_key')
                context = conv.context_data.get('analysis_context', {})
                
                # Créer les actions selon le type
                actions = []
                if template_key == 'invoices_to_send':
                    for invoice in context.get('invoices', []):
                        actions.append({
                            'type': 'send_invoice_email',
                            'label': f"Envoyer {invoice.get('number', '')}",
                            'invoice_id': invoice.get('id'),
                            'invoice_number': invoice.get('number'),
                            'client_name': invoice.get('client_name')
                        })
                elif template_key == 'invoices_followup':
                    for invoice in context.get('invoices', []):
                        actions.append({
                            'type': 'send_invoice_email',
                            'label': f"Relancer {invoice.get('number', '')}",
                            'invoice_id': invoice.get('id'),
                            'invoice_number': invoice.get('number'),
                            'client_name': invoice.get('client_name')
                        })
                elif template_key == 'purchase_orders_to_send':
                    for po in context.get('purchase_orders', []):
                        actions.append({
                            'type': 'send_purchase_order_email',
                            'label': f"Envoyer {po.get('number', '')}",
                            'po_id': po.get('id'),
                            'po_number': po.get('number'),
                            'supplier_name': po.get('supplier_name')
                        })

                suggestions_data.append({
                    'id': f"conv_{conv.id}",
                    'type': 'email_action',
                    'title': conv.title,
                    'message': conv.starter_message,
                    'action_label': 'Envoyer maintenant',
                    'action_url': None,
                    'priority': conv.context_data.get('priority', 7),
                    'actions': actions,
                    'template_key': template_key
                })

            return Response({
                'suggestions': suggestions_data,
                'count': len(suggestions_data)
            })

        except Exception as e:
            logger.error(f"Error getting suggestions: {e}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SuggestionDismissView(APIView):
    """Rejeter une suggestion"""
    permission_classes = [IsAuthenticated]

    def post(self, request, suggestion_id):
        """
        POST /api/ai/suggestions/{id}/dismiss/

        Marque une suggestion comme rejetée
        """
        from .suggestion_matcher import suggestion_matcher

        try:
            success = suggestion_matcher.mark_suggestion_dismissed(
                request.user,
                suggestion_id
            )

            if success:
                return Response({'success': True})
            else:
                return Response({
                    'error': 'Suggestion not found'
                }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"Error dismissing suggestion: {e}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SuggestionActionTakenView(APIView):
    """Marquer l'action d'une suggestion comme effectuée"""
    permission_classes = [IsAuthenticated]

    def post(self, request, suggestion_id):
        """
        POST /api/ai/suggestions/{id}/action-taken/

        Marque l'action de la suggestion comme effectuée
        """
        from .suggestion_matcher import suggestion_matcher

        try:
            success = suggestion_matcher.mark_action_taken(
                request.user,
                suggestion_id
            )

            if success:
                return Response({'success': True})
            else:
                return Response({
                    'error': 'Suggestion not found'
                }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"Error marking action taken: {e}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SuggestionsCountView(APIView):
    """Compte de suggestions actives disponibles"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        GET /api/ai/suggestions/count/

        Retourne le nombre de suggestions actives disponibles
        """
        from .suggestion_matcher import suggestion_matcher

        try:
            count = suggestion_matcher.get_active_suggestions_count(request.user)

            return Response({
                'count': count,
                'has_suggestions': count > 0
            })

        except Exception as e:
            logger.error(f"Error getting suggestions count: {e}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AINotificationsView(APIView):
    """API pour récupérer les notifications push IA"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        GET /api/ai/notifications/?unread_only=true

        Récupère les notifications pour l'utilisateur
        """
        from .models import AINotification

        unread_only = request.query_params.get('unread_only', 'true').lower() == 'true'

        try:
            notifications = AINotification.objects.filter(user=request.user)

            if unread_only:
                notifications = notifications.filter(is_read=False)

            notifications = notifications.order_by('-created_at')[:20]  # Max 20 dernières

            data = [{
                'id': str(notif.id),
                'type': notif.notification_type,
                'title': notif.title,
                'message': notif.message,
                'action_label': notif.action_label,
                'action_url': notif.action_url,
                'is_read': notif.is_read,
                'created_at': notif.created_at.isoformat(),
                'data': notif.data
            } for notif in notifications]

            return Response({
                'notifications': data,
                'count': len(data)
            })

        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            logger.error(f"Error fetching notifications: {e}\n{error_trace}")
            return Response({
                'error': str(e),
                'detail': 'Vérifiez que les migrations ont été appliquées: python manage.py migrate'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AINotificationMarkReadView(APIView):
    """Marquer une notification comme lue"""
    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        """
        POST /api/ai/notifications/{id}/mark-read/

        Marque une notification comme lue
        """
        from .models import AINotification

        try:
            notification = AINotification.objects.get(
                id=notification_id,
                user=request.user
            )

            notification.mark_as_read()

            return Response({'success': True})

        except AINotification.DoesNotExist:
            return Response({
                'error': 'Notification not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error marking notification as read: {e}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AINotificationsCountView(APIView):
    """Compte de notifications non lues"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        GET /api/ai/notifications/count/

        Retourne le nombre de notifications non lues
        """
        from .models import AINotification

        try:
            count = AINotification.objects.filter(
                user=request.user,
                is_read=False
            ).count()

            return Response({
                'count': count,
                'has_notifications': count > 0
            })

        except Exception as e:
            logger.error(f"Error getting notifications count: {e}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ImportReviewListView(APIView):
    """Liste des imports en attente de révision"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        GET /api/ai/import-reviews/?status=pending

        Liste les imports en attente de révision
        """
        from .models import ImportReview

        status_filter = request.query_params.get('status', 'pending')
        
        reviews = ImportReview.objects.filter(
            user=request.user,
            status=status_filter
        ).order_by('-created_at')

        data = [{
            'id': str(review.id),
            'entity_type': review.entity_type,
            'status': review.status,
            'extracted_data': review.extracted_data,
            'modified_data': review.modified_data,
            'notes': review.notes,
            'created_at': review.created_at.isoformat(),
            'updated_at': review.updated_at.isoformat(),
            'source_document_id': str(review.source_document.id) if review.source_document else None,
        } for review in reviews]

        return Response({
            'reviews': data,
            'count': len(data)
        })


class ImportReviewDetailView(APIView):
    """Détails d'un import review"""
    permission_classes = [IsAuthenticated]

    def get(self, request, review_id):
        """
        GET /api/ai/import-reviews/{id}/

        Récupère les détails d'un import review
        """
        from .models import ImportReview

        try:
            review = ImportReview.objects.get(id=review_id, user=request.user)
            
            return Response({
                'id': str(review.id),
                'entity_type': review.entity_type,
                'status': review.status,
                'extracted_data': review.extracted_data,
                'modified_data': review.modified_data,
                'notes': review.notes,
                'created_at': review.created_at.isoformat(),
                'updated_at': review.updated_at.isoformat(),
                'reviewed_at': review.reviewed_at.isoformat() if review.reviewed_at else None,
                'created_entity_id': str(review.created_entity_id) if review.created_entity_id else None,
                'source_document_id': str(review.source_document.id) if review.source_document else None,
            })
        except ImportReview.DoesNotExist:
            return Response({
                'error': 'Import review not found'
            }, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, review_id):
        """
        PATCH /api/ai/import-reviews/{id}/

        Modifie les données extraites
        """
        from .models import ImportReview

        try:
            review = ImportReview.objects.get(id=review_id, user=request.user)
            
            if review.status != 'pending':
                return Response({
                    'error': 'Cannot modify a review that is not pending'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Mettre à jour les données modifiées
            if 'modified_data' in request.data:
                review.modified_data = request.data['modified_data']
                review.status = 'modified'
            
            if 'notes' in request.data:
                review.notes = request.data['notes']

            review.save()

            return Response({
                'success': True,
                'review': {
                    'id': str(review.id),
                    'status': review.status,
                    'modified_data': review.modified_data,
                }
            })
        except ImportReview.DoesNotExist:
            return Response({
                'error': 'Import review not found'
            }, status=status.HTTP_404_NOT_FOUND)


class ImportReviewApproveView(APIView):
    """Approuver un import et créer l'entité"""
    permission_classes = [IsAuthenticated]

    def post(self, request, review_id):
        """
        POST /api/ai/import-reviews/{id}/approve/

        Approuve l'import et crée l'entité
        """
        from .models import ImportReview
        from django.utils import timezone

        try:
            review = ImportReview.objects.get(id=review_id, user=request.user)
            
            if review.status != 'pending' and review.status != 'modified':
                return Response({
                    'error': 'Can only approve pending or modified reviews'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Utiliser les données modifiées si disponibles, sinon les données extraites
            data_to_use = review.modified_data if review.modified_data else review.extracted_data

            # Créer l'entité
            creation_result = self._create_entity_from_review(review.entity_type, data_to_use, request.user)

            if creation_result['success']:
                review.status = 'approved'
                review.reviewed_at = timezone.now()
                review.created_entity_id = creation_result.get('entity_id')
                review.save()

                return Response({
                    'success': True,
                    'message': creation_result.get('message', 'Entity created successfully'),
                    'entity_id': str(review.created_entity_id),
                    'entity_type': review.entity_type
                })
            else:
                return Response({
                    'error': creation_result.get('error', 'Failed to create entity')
                }, status=status.HTTP_400_BAD_REQUEST)

        except ImportReview.DoesNotExist:
            return Response({
                'error': 'Import review not found'
            }, status=status.HTTP_404_NOT_FOUND)

    def _create_entity_from_review(self, entity_type, data, user):
        """Crée l'entité à partir des données du review"""
        try:
            if entity_type == 'invoice':
                from apps.invoicing.models import Invoice, Client, InvoiceItem
                from .entity_matcher import entity_matcher

                client_name = data.get('client_name', 'Client inconnu')
                client_email = data.get('client_email')

                similar_clients = entity_matcher.find_similar_clients(
                    first_name=client_name,
                    last_name='',
                    email=client_email if client_email else None,
                    company=client_name
                )

                if similar_clients:
                    client = similar_clients[0][0]
                else:
                    client = Client.objects.create(name=client_name, email=client_email)

                invoice = Invoice.objects.create(
                    title=f"Facture {data.get('invoice_number', '')}",
                    client=client,
                    created_by=user
                )

                for item in data.get('items', []):
                    InvoiceItem.objects.create(
                        invoice=invoice,
                        description=item.get('description', ''),
                        quantity=item.get('quantity', 1),
                        unit_price=item.get('unit_price', 0)
                    )

                invoice.recalculate_totals()

                return {
                    'success': True,
                    'entity_id': invoice.id,
                    'message': f'Facture {invoice.invoice_number} créée avec succès'
                }

            elif entity_type == 'purchase_order':
                from apps.purchase_orders.models import PurchaseOrder, Supplier
                from .entity_matcher import entity_matcher

                supplier_name = data.get('supplier_name', 'Fournisseur inconnu')
                supplier_email = data.get('supplier_email')
                supplier_phone = data.get('supplier_phone')

                similar_suppliers = entity_matcher.find_similar_suppliers(
                    name=supplier_name,
                    email=supplier_email if supplier_email else None,
                    phone=supplier_phone if supplier_phone else None
                )

                if similar_suppliers:
                    supplier = similar_suppliers[0][0]
                else:
                    supplier = Supplier.objects.create(
                        name=supplier_name,
                        email=supplier_email,
                        phone=supplier_phone
                    )

                po = PurchaseOrder.objects.create(
                    title=f"BC {data.get('po_number', '')}",
                    supplier=supplier,
                    created_by=user
                )

                return {
                    'success': True,
                    'entity_id': po.id,
                    'message': f'Bon de commande {po.po_number} créé avec succès'
                }

            else:
                return {
                    'success': False,
                    'error': f'Entity type {entity_type} not supported yet'
                }

        except Exception as e:
            logger.error(f"Error creating entity from review: {e}")
            return {
                'success': False,
                'error': str(e)
            }


class ProactiveConversationListView(APIView):
    """Liste des conversations proactives disponibles"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        GET /api/v1/ai/proactive-conversations/

        Liste les conversations proactives en attente pour l'utilisateur
        """
        from .models import ProactiveConversation

        conversations = ProactiveConversation.objects.filter(
            user=request.user,
            status='pending'
        ).order_by('-created_at')

        data = [{
            'id': str(conv.id),
            'title': conv.title,
            'starter_message': conv.starter_message,
            'context_data': conv.context_data,
            'created_at': conv.created_at.isoformat(),
        } for conv in conversations]

        return Response({
            'conversations': data,
            'count': len(data)
        })


class ProactiveConversationAcceptView(APIView):
    """Accepter une conversation proactive"""
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        """
        POST /api/v1/ai/proactive-conversations/{id}/accept/

        Accepte la conversation proactive et crée la conversation
        """
        from .models import ProactiveConversation

        try:
            proactive_conv = ProactiveConversation.objects.get(
                id=conversation_id,
                user=request.user,
                status='pending'
            )
        except ProactiveConversation.DoesNotExist:
            return Response({
                'error': 'Conversation proactive non trouvée'
            }, status=status.HTTP_404_NOT_FOUND)

        try:
            conversation = proactive_conv.accept()
            
            return Response({
                'success': True,
                'conversation_id': str(conversation.id),
                'message': 'Conversation créée avec succès'
            })
        except Exception as e:
            logger.error(f"Error accepting proactive conversation: {e}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ProactiveConversationDismissView(APIView):
    """Ignorer une conversation proactive"""
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        """
        POST /api/v1/ai/proactive-conversations/{id}/dismiss/

        Ignore la conversation proactive
        """
        from .models import ProactiveConversation

        try:
            proactive_conv = ProactiveConversation.objects.get(
                id=conversation_id,
                user=request.user,
                status='pending'
            )
        except ProactiveConversation.DoesNotExist:
            return Response({
                'error': 'Conversation proactive non trouvée'
            }, status=status.HTTP_404_NOT_FOUND)

        try:
            proactive_conv.dismiss()
            
            return Response({
                'success': True,
                'message': 'Conversation ignorée'
            })
        except Exception as e:
            logger.error(f"Error dismissing proactive conversation: {e}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ImportReviewRejectView(APIView):
    """Rejeter un import"""
    permission_classes = [IsAuthenticated]

    def post(self, request, review_id):
        """
        POST /api/ai/import-reviews/{id}/reject/

        Rejette l'import
        """
        from .models import ImportReview
        from django.utils import timezone

        try:
            review = ImportReview.objects.get(id=review_id, user=request.user)
            
            if review.status != 'pending':
                return Response({
                    'error': 'Can only reject pending reviews'
                }, status=status.HTTP_400_BAD_REQUEST)

            review.status = 'rejected'
            review.reviewed_at = timezone.now()
            if 'notes' in request.data:
                review.notes = request.data['notes']
            review.save()

            return Response({
                'success': True,
                'message': 'Import rejected'
            })

        except ImportReview.DoesNotExist:
            return Response({
                'error': 'Import review not found'
            }, status=status.HTTP_404_NOT_FOUND)


class GenerateTextView(APIView):
    """Endpoint for direct text/JSON generation without tool calling (used by contract form, etc.)"""
    permission_classes = [IsAuthenticated]
    throttle_classes = [AIUserRateThrottle, AIOrgRateThrottle]

    def post(self, request):
        prompt = request.data.get('prompt', '')
        max_tokens = min(int(request.data.get('max_tokens', 4000)), 8000)

        if not prompt:
            return Response({'error': 'prompt is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            import os
            # Support mistralai v2.0+, v1.0+ and older versions
            try:
                from mistralai.client import Mistral
            except ImportError:
                try:
                    from mistralai import Mistral
                except ImportError:
                    from mistralai.client import MistralClient as Mistral

            api_key = os.getenv('MISTRAL_API_KEY')
            if not api_key:
                from django.conf import settings
                api_key = getattr(settings, 'MISTRAL_API_KEY', None)

            if not api_key:
                return Response({'error': 'MISTRAL_API_KEY not configured'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            client = Mistral(api_key=api_key)
            response = client.chat.complete(
                model='mistral-large-latest',
                messages=[{'role': 'user', 'content': prompt}],
                temperature=0.7,
                max_tokens=max_tokens,
            )

            content = response.choices[0].message.content
            return Response({'content': content})

        except Exception as e:
            logger.error(f"GenerateTextView error: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────────────────────
# Web Push Notifications
# ─────────────────────────────────────────────────────────────────────────────

class PushSubscribeView(APIView):
    """POST /api/ai/push/subscribe/ — Enregistre une subscription push navigateur."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .models import PushSubscription
        from django.conf import settings

        endpoint = request.data.get('endpoint')
        p256dh = request.data.get('p256dh')
        auth = request.data.get('auth')

        if not all([endpoint, p256dh, auth]):
            return Response({'error': 'endpoint, p256dh et auth sont requis.'}, status=400)

        user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]
        # Détecter un nom d'appareil lisible
        if 'Chrome' in user_agent:
            browser = 'Chrome'
        elif 'Firefox' in user_agent:
            browser = 'Firefox'
        elif 'Safari' in user_agent:
            browser = 'Safari'
        elif 'Edge' in user_agent:
            browser = 'Edge'
        else:
            browser = 'Navigateur'

        if 'Windows' in user_agent:
            os_name = 'Windows'
        elif 'Android' in user_agent:
            os_name = 'Android'
        elif 'iPhone' in user_agent or 'iPad' in user_agent:
            os_name = 'iOS'
        elif 'Mac' in user_agent:
            os_name = 'macOS'
        elif 'Linux' in user_agent:
            os_name = 'Linux'
        else:
            os_name = ''

        device_name = f"{browser}{' — ' + os_name if os_name else ''}"

        sub, created = PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={
                'user': request.user,
                'organization': getattr(request.user, 'organization', None),
                'p256dh': p256dh,
                'auth': auth,
                'user_agent': user_agent,
                'device_name': device_name,
                'is_active': True,
            }
        )

        return Response({
            'success': True,
            'created': created,
            'device_name': device_name,
            'vapid_public_key': getattr(settings, 'VAPID_PUBLIC_KEY', ''),
        }, status=201 if created else 200)


class PushUnsubscribeView(APIView):
    """POST /api/ai/push/unsubscribe/ — Désactive une subscription push."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .models import PushSubscription
        endpoint = request.data.get('endpoint')
        if not endpoint:
            return Response({'error': 'endpoint requis.'}, status=400)

        PushSubscription.objects.filter(
            user=request.user, endpoint=endpoint
        ).update(is_active=False)

        return Response({'success': True})


class PushVapidKeyView(APIView):
    """GET /api/ai/push/vapid-key/ — Retourne la clé publique VAPID."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.conf import settings
        return Response({'vapid_public_key': getattr(settings, 'VAPID_PUBLIC_KEY', '')})


class NotificationPreferencesView(APIView):
    """GET/PUT /api/ai/push/preferences/ — Lit et met à jour les préférences push."""
    permission_classes = [IsAuthenticated]

    PREF_FIELDS = [
        'push_stock_rupture', 'push_quota_atteint', 'push_facture_retard',
        'push_stock_bas', 'push_facture_brouillon', 'push_bc_retard',
        'push_lot_expirant', 'push_insight_ia',
        'push_resume_hebdo', 'resume_hebdo_jour', 'resume_hebdo_heure',
    ]

    def get(self, request):
        from .models import NotificationPreferences
        prefs = NotificationPreferences.get_or_create_for_user(request.user)
        data = {f: getattr(prefs, f) for f in self.PREF_FIELDS}
        return Response(data)

    def put(self, request):
        from .models import NotificationPreferences
        prefs = NotificationPreferences.get_or_create_for_user(request.user)
        for field in self.PREF_FIELDS:
            if field in request.data:
                val = request.data[field]
                # Forcer bool pour les champs booléens
                if field.startswith('push_'):
                    val = bool(val)
                setattr(prefs, field, val)
        prefs.save()
        data = {f: getattr(prefs, f) for f in self.PREF_FIELDS}
        return Response(data)


class SmartAlertsView(APIView):
    """
    Alertes business calculées par algo pur (sans IA/Mistral).
    Retourne les alertes triées par priorité pour le widget dashboard.
    GET /api/v1/ai/smart-alerts/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .smart_alerts_service import SmartAlertsService
        service = SmartAlertsService(request.user)
        alerts = service.get_alerts()
        return Response({'alerts': alerts, 'total': len(alerts)})


class MCPToolsView(APIView):
    """Façade MCP du registre d'outils IA.

    GET  /api/v1/ai/mcp/tools/        -> tools/list (introspection des outils)
    POST /api/v1/ai/mcp/tools/call/   -> tools/call (exécution d'un outil)

    La même source d'outils (ToolRegistry) sert l'IA (Mistral tool-calling) ET
    cette façade MCP, sans serveur MCP séparé. L'exécution passe par le contexte
    utilisateur sécurisé et l'isolation multi-tenant des handlers.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .services.registry.mcp_facade import list_tools
        tools = list_tools()
        return Response({'tools': tools, 'total': len(tools)})

    def post(self, request):
        from .services.registry.mcp_facade import call_tool
        from .services import AsyncSafeUserContext

        name = request.data.get('name')
        arguments = request.data.get('arguments', {}) or {}
        if not name:
            return Response({'error': 'Le champ `name` est requis.'}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(arguments, dict):
            return Response({'error': '`arguments` doit être un objet.'}, status=status.HTTP_400_BAD_REQUEST)

        user_ctx = AsyncSafeUserContext.from_user(request.user)
        result = async_to_sync(call_tool)(name, arguments, user_ctx)
        return Response(result, status=status.HTTP_200_OK)
