from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, JSONParser
from django.utils import timezone
from asgiref.sync import async_to_sync
from .models import Conversation, Message
from .serializers import ChatRequestSerializer, ConversationSerializer, MessageSerializer
# Lazy imports to avoid module-level initialization errors
# from .services import MistralService, ActionExecutor
# from .ocr_service import OCRService
from .action_manager import action_manager
import asyncio
import logging

logger = logging.getLogger(__name__)


class ChatView(APIView):
    """Endpoint principal pour le chat avec l'IA"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Envoyer un message à l'IA"""
        serializer = ChatRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user_message = serializer.validated_data['message']
        conversation_id = serializer.validated_data.get('conversation_id')
        
        try:
            # Récupérer ou créer la conversation
            if conversation_id:
                conversation = Conversation.objects.get(
                    id=conversation_id,
                    user=request.user
                )
            else:
                conversation = Conversation.objects.create(
                    user=request.user,
                    title=user_message[:50] + "..." if len(user_message) > 50 else user_message
                )
            
            # Sauvegarder le message utilisateur
            user_msg = Message.objects.create(
                conversation=conversation,
                role='user',
                content=user_message
            )

            # NOUVEAU: Vérifier si c'est une réponse à une confirmation en attente
            last_assistant_msg = Message.objects.filter(
                conversation=conversation,
                role='assistant'
            ).order_by('-created_at').first()

            pending_confirmation = None
            if last_assistant_msg and last_assistant_msg.metadata:
                action_results_metadata = last_assistant_msg.metadata.get('action_results', [])
                for result in action_results_metadata:
                    if result.get('pending_confirmation'):
                        pending_confirmation = result['pending_confirmation']
                        break

            # Détecter les intentions de confirmation dans le message utilisateur
            user_message_lower = user_message.lower().strip()
            confirmation_detected = None

            if pending_confirmation:
                # Mots-clés pour "utiliser l'existant"
                if any(keyword in user_message_lower for keyword in ['utilise', 'utiliser', 'existant', 'premier', '1', 'recommandé', 'ok', 'oui', 'yes']):
                    confirmation_detected = 'use_existing'
                # Mots-clés pour "créer nouveau"
                elif any(keyword in user_message_lower for keyword in ['créer', 'créé', 'nouveau', 'new', 'force', '2', 'quand même']):
                    confirmation_detected = 'force_create'
                # Mots-clés pour "annuler"
                elif any(keyword in user_message_lower for keyword in ['annuler', 'annule', 'cancel', 'non', 'no', '3', 'stop']):
                    confirmation_detected = 'cancel'

            # Si une confirmation est détectée, exécuter l'action directement
            if confirmation_detected and pending_confirmation:
                logger.info(f"Confirmation detected: {confirmation_detected} for action: {pending_confirmation['action']}")

                from .services import ActionExecutor, AsyncSafeUserContext
                executor = ActionExecutor()
                user_context = AsyncSafeUserContext.from_user(request.user)

                action_result = None
                final_response = ""

                if confirmation_detected == 'cancel':
                    # Annulation
                    final_response = "✓ Opération annulée."
                    action_result = {
                        'success': True,
                        'message': 'Opération annulée par l\'utilisateur'
                    }
                else:
                    # Récupérer les paramètres originaux
                    import json
                    original_params = pending_confirmation.get('original_params', {})

                    # S'assurer que original_params est un dict
                    if isinstance(original_params, str):
                        try:
                            original_params = json.loads(original_params)
                        except:
                            logger.error(f"Failed to parse original_params: {original_params}")
                            original_params = {}
                    elif not isinstance(original_params, dict):
                        logger.error(f"original_params is not a dict: {type(original_params)}")
                        original_params = {}

                    # Ajouter les paramètres de confirmation selon le choix
                    choice_params = pending_confirmation.get('choices', {}).get(confirmation_detected, {})

                    # S'assurer que choice_params est un dict
                    if choice_params is None:
                        choice_params = {}
                    elif isinstance(choice_params, str):
                        try:
                            choice_params = json.loads(choice_params)
                        except:
                            logger.error(f"Failed to parse choice_params: {choice_params}")
                            choice_params = {}

                    # Fusionner les paramètres
                    confirmed_params = {**original_params, **choice_params}

                    logger.info(f"Executing action {pending_confirmation['action']} with confirmed params: {confirmed_params}")

                    # Exécuter l'action avec les paramètres confirmés
                    action_result = async_to_sync(executor.execute)(
                        action=pending_confirmation['action'],
                        params=confirmed_params,
                        user=user_context
                    )

                    # Formater la réponse
                    if action_result.get('success'):
                        message = action_result.get('message', 'Action exécutée avec succès')

                        # Messages spécifiques selon le type de confirmation
                        entity_type = pending_confirmation.get('entity_type', 'entité')
                        entity_names = {
                            'client': 'client',
                            'supplier': 'fournisseur',
                            'product': 'produit'
                        }
                        entity_name = entity_names.get(entity_type, 'entité')

                        if confirmation_detected == 'use_existing':
                            final_response = f"✓ Parfait ! J'ai utilisé le {entity_name} existant.\n\n{message}"
                        else:  # force_create
                            final_response = f"✓ D'accord ! J'ai créé un nouveau {entity_name}.\n\n{message}"

                        # Ajouter un lien si disponible
                        data = action_result.get('data', {})
                        if isinstance(data, dict) and data.get('url'):
                            final_response += f" [Voir les détails]({data['url']})"
                    else:
                        error = action_result.get('error', 'Erreur inconnue')
                        final_response = f"✗ Désolé, une erreur s'est produite : {error}"

                # Sauvegarder la réponse
                ai_msg = Message.objects.create(
                    conversation=conversation,
                    role='assistant',
                    content=final_response,
                    metadata={'action_results': [{'result': action_result}]} if action_result else None
                )

                conversation.last_message_at = timezone.now()
                conversation.save()

                return Response({
                    'conversation_id': str(conversation.id),
                    'message': MessageSerializer(ai_msg).data,
                    'action_result': action_result
                }, status=status.HTTP_200_OK)

            # Récupérer l'historique de la conversation
            history = Message.objects.filter(
                conversation=conversation
            ).order_by('created_at').values('role', 'content')
            
            # Appeler Mistral AI (lazy import)
            from .services import MistralService
            mistral_service = MistralService()

            # Utiliser async_to_sync au lieu de créer un event loop
            result = async_to_sync(mistral_service.chat)(
                message=user_message,
                conversation_history=list(history)[:-1],  # Exclure le dernier message
                user_context={'user_id': request.user.id}
            )
            
            # Exécuter les tool_calls si présents AVANT de sauvegarder la réponse
            action_results = []
            final_response = result['response']

            if result.get('tool_calls'):
                from .services import ActionExecutor, AsyncSafeUserContext
                executor = ActionExecutor()

                # IMPORTANT: Convert user to safe dict BEFORE entering async context
                # This prevents "You cannot call this from an async context" errors
                user_context = AsyncSafeUserContext.from_user(request.user)

                for tool_call in result['tool_calls']:
                    try:
                        # Normaliser les arguments - peut être un dict ou une liste
                        arguments = tool_call.get('arguments', {})
                        if isinstance(arguments, list):
                            # Si c'est une liste, essayer de la convertir en dict
                            if len(arguments) == 1 and isinstance(arguments[0], dict):
                                arguments = arguments[0]
                            else:
                                # Sinon, créer un dict vide et logger un avertissement
                                logger.warning(f"Arguments is a list, converting to dict: {arguments}")
                                arguments = {}
                        elif not isinstance(arguments, dict):
                            # Si ce n'est ni une liste ni un dict, essayer de parser comme JSON string
                            import json
                            try:
                                if isinstance(arguments, str):
                                    arguments = json.loads(arguments)
                                else:
                                    arguments = {}
                            except:
                                arguments = {}

                        # Utiliser async_to_sync au lieu de créer un event loop
                        # Récupérer le nom de la fonction correctement
                        # Dans services.py, tool_call est structuré comme:
                        # {'id': '...', 'function': 'nom_fonction', 'arguments': {...}}
                        function_name = tool_call.get('function', '')

                        # Si 'function' n'existe pas, essayer 'name'
                        if not function_name:
                            function_name = tool_call.get('name', '')

                        if not function_name:
                            logger.error(f"Cannot extract function name from tool_call: {tool_call}")

                        logger.info(f"Executing function: {function_name} with params: {arguments}")

                        action_result = async_to_sync(executor.execute)(
                            action=function_name,
                            params=arguments,
                            user=user_context
                        )

                        action_results.append({
                            'tool_call_id': tool_call['id'],
                            'function': tool_call['function'],
                            'result': action_result
                        })

                        # Ajouter le résultat à la réponse finale de manière plus naturelle
                        # S'assurer que action_result est un dict
                        if not isinstance(action_result, dict):
                            logger.error(f"Action result is not a dict: {type(action_result)} - {action_result}")
                            action_result = {'success': False, 'error': 'Format de réponse invalide'}
                        
                        if action_result.get('success'):
                            message = action_result.get('message', 'Action exécutée avec succès')
                            # Ajouter un lien si disponible
                            data = action_result.get('data', {})
                            if isinstance(data, dict) and data.get('url'):
                                message += f" [Voir les détails]({data['url']})"
                            final_response += f"\n\n✓ {message}"
                        else:
                            error = action_result.get('error', 'Erreur inconnue')
                            # Gestion améliorée des entités similaires trouvées
                            if 'similar_entities_found' in str(error):
                                similar = action_result.get('similar_entities', [])
                                entity_type = action_result.get('entity_type', 'entité')
                                suggested = action_result.get('suggested_action', {})

                                entity_names = {
                                    'client': 'client',
                                    'supplier': 'fournisseur',
                                    'product': 'produit'
                                }
                                entity_name = entity_names.get(entity_type, 'entité')

                                # Format response avec options claires
                                final_response += f"\n\n⚠️ **Attention**: J'ai trouvé {len(similar)} {entity_name}(s) similaire(s) :\n\n"

                                for i, entity in enumerate(similar, 1):
                                    final_response += f"**{i}. {entity['name']}**\n"
                                    if entity.get('email'):
                                        final_response += f"   - Email: {entity['email']}\n"
                                    if entity.get('phone'):
                                        final_response += f"   - Téléphone: {entity['phone']}\n"
                                    final_response += f"   - Similarité: {int(entity['similarity'])}%\n"
                                    final_response += f"   - Raison: {entity['reason']}\n\n"

                                final_response += f"\n**Comment souhaitez-vous procéder ?**\n\n"
                                final_response += f"**1️⃣ Utiliser {similar[0]['name']}** (recommandé)\n"
                                final_response += f"   → Tapez: `1` ou `utiliser l'existant`\n\n"
                                final_response += f"**2️⃣ Créer un nouveau {entity_name}**\n"
                                final_response += f"   → Tapez: `2` ou `créer nouveau`\n\n"
                                final_response += f"**3️⃣ Annuler**\n"
                                final_response += f"   → Tapez: `3` ou `annuler`"

                                # Ajouter les boutons d'action dans les métadonnées pour le frontend
                                action_results[-1]['action_buttons'] = [
                                    {
                                        'label': f"✓ Utiliser {similar[0]['name']}",
                                        'action': 'use_existing',
                                        'style': 'primary',
                                        'params': {
                                            f'use_existing_{entity_type}_id': suggested.get('use_existing'),
                                            'force_create': False
                                        }
                                    },
                                    {
                                        'label': f"+ Créer nouveau {entity_name}",
                                        'action': 'force_create',
                                        'style': 'secondary',
                                        'params': {
                                            f'force_create_{entity_type}': True
                                        }
                                    },
                                    {
                                        'label': "✗ Annuler",
                                        'action': 'cancel',
                                        'style': 'danger'
                                    }
                                ]

                                # Stocker le contexte de confirmation pour la suite
                                # Note: tool_call['function'] est le nom (string), tool_call['arguments'] sont les params (dict)
                                action_results[-1]['pending_confirmation'] = {
                                    'action': tool_call['function'],  # Nom de la fonction directement
                                    'original_params': arguments,  # Arguments déjà parsés plus haut
                                    'entity_type': entity_type,
                                    'suggested_entity_id': suggested.get('use_existing'),
                                    'choices': {
                                        'use_existing': {f'use_existing_{entity_type}_id': suggested.get('use_existing')},
                                        'force_create': {f'force_create_{entity_type}': True},
                                        'cancel': None
                                    }
                                }
                            else:
                                final_response += f"\n\n✗ Désolé, une erreur s'est produite : {error}"

                    except Exception as e:
                        logger.error(f"Tool call execution error: {e}")
                        action_results.append({
                            'tool_call_id': tool_call['id'],
                            'function': tool_call['function'],
                            'result': {
                                'success': False,
                                'error': str(e)
                            }
                        })
                        final_response += f"\n\n✗ Erreur lors de l'exécution: {str(e)}"

            # Sauvegarder la réponse de l'IA avec les résultats d'actions dans metadata
            ai_msg = Message.objects.create(
                conversation=conversation,
                role='assistant',
                content=final_response,
                tool_calls=result.get('tool_calls'),
                metadata={'action_results': action_results} if action_results else None
            )

            # Exécuter l'action legacy si nécessaire (compatibilité)
            action_result = None
            if result.get('action'):
                from .services import ActionExecutor, AsyncSafeUserContext
                executor = ActionExecutor()

                # IMPORTANT: Convert user to safe dict BEFORE entering async context
                user_context = AsyncSafeUserContext.from_user(request.user)

                # Utiliser async_to_sync au lieu de créer un event loop
                action_result = async_to_sync(executor.execute)(
                    action=result['action']['action'],
                    params=result['action']['params'],
                    user=user_context
                )

                # Ajouter le résultat de l'action à la conversation
                if action_result:
                    action_msg = f"\n\n[Action exécutée : {result['action']['action']}]"
                    if action_result.get('success'):
                        action_msg += f"\n✓ {action_result.get('message', 'Succès')}"
                    else:
                        action_msg += f"\n✗ Erreur : {action_result.get('error', 'Erreur inconnue')}"

                    ai_msg.content += action_msg
                    ai_msg.save()
            
            # Mettre à jour la conversation
            conversation.last_message_at = timezone.now()
            conversation.save()
            
            response_data = {
                'conversation_id': str(conversation.id),
                'message': MessageSerializer(ai_msg).data,
                'action_result': action_result,
                'action_results': action_results if action_results else None
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Conversation.DoesNotExist:
            return Response(
                {'error': 'Conversation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Chat error: {e}")
            return Response(
                {'error': 'An error occurred while processing your request'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ConversationListView(APIView):
    """Liste des conversations de l'utilisateur"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        conversations = Conversation.objects.filter(
            user=request.user
        ).order_by('-last_message_at')
        
        serializer = ConversationSerializer(conversations, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Créer une nouvelle conversation"""
        conversation = Conversation.objects.create(
            user=request.user,
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
    parser_classes = [MultiPartParser, JSONParser]
    
    def post(self, request):
        """Analyser un document"""
        # Cas 1: Image uploadée
        if 'image' in request.FILES:
            image_file = request.FILES['image']
            document_type = request.data.get('document_type', 'invoice')
            auto_create = request.data.get('auto_create', 'false').lower() == 'true'
            
            try:
                # Traiter le document avec OCR (lazy import)
                from .ocr_service import OCRService
                processor = OCRService()
                success, text_or_error, lang = processor.extract_text_from_image(image_file)

                if not success:
                    return Response(
                        {'error': text_or_error},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                result = {
                    'success': True,
                    'ocr_text': text_or_error,
                    'language': lang,
                    'extracted_data': {}
                }
                
                # Analyser avec Mistral pour une extraction plus intelligente
                from .services import MistralService
                mistral_service = MistralService()
                ai_result = mistral_service.analyze_document(
                    result['ocr_text'],
                    document_type
                )

                # Combiner les résultats
                final_result = {
                    'success': True,
                    'ocr_text': result['ocr_text'],
                    'extracted_data': result['extracted_data'],
                    'ai_extracted_data': ai_result.get('data') if ai_result['success'] else None,
                    'language': result['language']
                }
                
                # Créer automatiquement si demandé
                if auto_create and ai_result['success']:
                    creation_result = self._auto_create_entity(
                        document_type,
                        ai_result['data'],
                        request.user
                    )
                    final_result['creation_result'] = creation_result
                
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
                    # Optionnellement, créer automatiquement l'entité
                    if request.data.get('auto_create', False):
                        creation_result = self._auto_create_entity(
                            document_type,
                            result['data'],
                            request.user
                        )
                        result['creation_result'] = creation_result
                    
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
    
    def _auto_create_entity(self, document_type, data, user):
        """Crée automatiquement une entité basée sur les données extraites avec entity matching"""
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

    def get(self, request):
        """Retourner les actions rapides disponibles"""
        try:
            # Récupérer la catégorie depuis les paramètres de requête
            category = request.GET.get('category')

            # Obtenir les actions configurables
            available_actions = action_manager.get_available_actions(category)

            # Convertir en format compatible avec le frontend
            quick_actions = []
            for action in available_actions:
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