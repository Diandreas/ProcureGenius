from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, JSONParser
from django.utils import timezone
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
            
            # Récupérer l'historique de la conversation
            history = Message.objects.filter(
                conversation=conversation
            ).order_by('created_at').values('role', 'content')
            
            # Appeler Mistral AI (lazy import)
            from .services import MistralService
            mistral_service = MistralService()
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                result = loop.run_until_complete(
                    mistral_service.chat(
                        message=user_message,
                        conversation_history=list(history)[:-1],  # Exclure le dernier message
                        user_context={'user_id': request.user.id}
                    )
                )
            finally:
                loop.close()
            
            # Exécuter les tool_calls si présents AVANT de sauvegarder la réponse
            action_results = []
            final_response = result['response']

            if result.get('tool_calls'):
                from .services import ActionExecutor
                executor = ActionExecutor()

                for tool_call in result['tool_calls']:
                    try:
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)

                        action_result = loop.run_until_complete(
                            executor.execute(
                                action=tool_call['function'],
                                params=tool_call['arguments'],
                                user=request.user
                            )
                        )
                        loop.close()

                        action_results.append({
                            'tool_call_id': tool_call['id'],
                            'function': tool_call['function'],
                            'result': action_result
                        })

                        # Ajouter le résultat à la réponse finale
                        if action_result.get('success'):
                            final_response += f"\n\n✓ {action_result.get('message', 'Action exécutée avec succès')}"
                        else:
                            final_response += f"\n\n✗ Erreur: {action_result.get('error', 'Erreur inconnue')}"

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
                from .services import ActionExecutor
                executor = ActionExecutor()
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

                try:
                    action_result = loop.run_until_complete(
                        executor.execute(
                            action=result['action']['action'],
                            params=result['action']['params'],
                            user=request.user
                        )
                    )
                finally:
                    loop.close()

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
        """Crée automatiquement une entité basée sur les données extraites"""
        try:
            if document_type == 'invoice':
                from apps.invoicing.models import Invoice, Client, InvoiceItem
                
                # Trouver ou créer le client
                client_name = data.get('client_name', 'Client inconnu')
                client = Client.objects.filter(name=client_name).first()
                if not client:
                    client = Client.objects.create(name=client_name)
                
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
                
                # Similaire pour les bons de commande
                supplier_name = data.get('supplier_name', 'Fournisseur inconnu')
                supplier = Supplier.objects.filter(name=supplier_name).first()
                if not supplier:
                    supplier = Supplier.objects.create(name=supplier_name)
                
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