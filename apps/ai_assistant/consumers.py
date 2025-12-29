import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Conversation, Message
from .services import MistralService

User = get_user_model()


class AIChatConsumer(AsyncWebsocketConsumer):
    """Consumer WebSocket pour le chat IA en temps réel"""
    
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'ai_chat_{self.conversation_id}'
        self.user = self.scope["user"]
        
        # Vérifier que l'utilisateur a accès à cette conversation
        if not await self.user_has_access():
            await self.close()
            return
        
        # Rejoindre le groupe
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        # Quitter le groupe
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Traite les messages reçus du client"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type', 'message')
            
            if message_type == 'message':
                await self.handle_user_message(data)
            elif message_type == 'typing':
                await self.handle_typing_indicator(data)
            elif message_type == 'rate_message':
                await self.handle_message_rating(data)
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Format JSON invalide'
            }))
    
    async def handle_user_message(self, data):
        """Traite un message utilisateur"""
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return
        
        try:
            # Sauvegarder le message utilisateur
            user_msg = await self.save_user_message(user_message)
            
            # Diffuser le message utilisateur
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': {
                        'id': str(user_msg.id),
                        'role': 'user',
                        'content': user_message,
                        'timestamp': user_msg.created_at.isoformat()
                    }
                }
            )
            
            # Indicateur de frappe de l'IA
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_indicator',
                    'user': 'assistant',
                    'typing': True
                }
            )
            
            # Traiter avec l'IA
            ai_response = await self.process_with_ai(user_message)
            
            # Arrêter l'indicateur de frappe
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_indicator',
                    'user': 'assistant',
                    'typing': False
                }
            )
            
            # Sauvegarder et diffuser la réponse IA
            ai_msg = await self.save_ai_message(ai_response)
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': {
                        'id': str(ai_msg.id),
                        'role': 'assistant',
                        'content': ai_response['message'],
                        'timestamp': ai_msg.created_at.isoformat(),
                        'action_result': ai_response.get('action_result'),
                        'tokens_used': ai_response.get('tokens', 0)
                    }
                }
            )
            
        except Exception as e:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'error_message',
                    'error': str(e)
                }
            )
    
    async def handle_typing_indicator(self, data):
        """Gère les indicateurs de frappe"""
        typing = data.get('typing', False)
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_indicator',
                'user': 'user',
                'typing': typing
            }
        )
    
    async def handle_message_rating(self, data):
        """Gère la notation des messages IA"""
        message_id = data.get('message_id')
        rating = data.get('rating')
        feedback = data.get('feedback', '')
        
        if message_id and rating:
            await self.rate_ai_message(message_id, rating, feedback)
    
    # Handlers pour les événements du groupe
    async def chat_message(self, event):
        """Envoie un message de chat au WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': event['message']
        }))
    
    async def typing_indicator(self, event):
        """Envoie un indicateur de frappe"""
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'user': event['user'],
            'typing': event['typing']
        }))
    
    async def error_message(self, event):
        """Envoie un message d'erreur"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': event['error']
        }))
    
    # Méthodes d'accès à la base de données
    @database_sync_to_async
    def user_has_access(self):
        """Vérifie si l'utilisateur a accès à cette conversation"""
        try:
            conversation = Conversation.objects.get(
                id=self.conversation_id,
                user=self.user
            )
            return True
        except Conversation.DoesNotExist:
            return False
    
    @database_sync_to_async
    def save_user_message(self, content):
        """Sauvegarde un message utilisateur"""
        conversation = Conversation.objects.get(id=self.conversation_id)
        return Message.objects.create(
            conversation=conversation,
            role='user',
            content=content
        )
    
    @database_sync_to_async
    def save_ai_message(self, ai_response):
        """Sauvegarde un message IA"""
        conversation = Conversation.objects.get(id=self.conversation_id)

        # Stocker les métadonnées dans le champ metadata JSON
        metadata = {
            'model_used': ai_response.get('model', 'mistral-large'),
            'tokens_used': ai_response.get('tokens', 0),
            'response_time_ms': ai_response.get('response_time', 0),
            'action_triggered': ai_response.get('action'),
            'action_result': ai_response.get('action_result')
        }

        # Ajouter pending_confirmation si présent dans action_result
        if ai_response.get('action_result'):
            for result in ai_response['action_result']:
                if result.get('result', {}).get('pending_confirmation'):
                    metadata['pending_confirmation'] = result['result']['pending_confirmation']
                    break

        return Message.objects.create(
            conversation=conversation,
            role='assistant',
            content=ai_response['message'],
            metadata=metadata
        )
    
    @database_sync_to_async
    def process_with_ai(self, user_message):
        """Traite le message avec l'IA"""
        ai_service = MistralService()

        # Construire le contexte
        conversation = Conversation.objects.get(id=self.conversation_id)

        # Récupérer le dernier message assistant pour pending_confirmation
        last_assistant_msg = conversation.messages.filter(role='assistant').order_by('-created_at').first()
        pending_confirmation = None
        if last_assistant_msg and last_assistant_msg.metadata:
            pending_confirmation = last_assistant_msg.metadata.get('pending_confirmation')

        # IMPORTANT: Extract all user data synchronously to avoid 
        # "You cannot call this from an async context" errors
        # Access user attributes NOW while in sync context
        user_id = self.user.id
        organization = self.user.organization if hasattr(self.user, 'organization') else None
        is_superuser = self.user.is_superuser
        
        user_context = {
            'user_id': user_id,
            'organization': organization,
            'is_superuser': is_superuser,
            'conversation_history': [
                {'role': msg.role, 'content': msg.content}
                for msg in conversation.messages.order_by('created_at')[-10:]
            ],
            'pending_confirmation': pending_confirmation
        }

        return ai_service.process_user_request(user_message, user_context)
    
    @database_sync_to_async
    def rate_ai_message(self, message_id, rating, feedback):
        """Note un message IA"""
        try:
            message = Message.objects.get(
                id=message_id,
                conversation__user=self.user,
                role='assistant'
            )
            # Stocker le rating dans metadata
            if not message.metadata:
                message.metadata = {}
            message.metadata['user_rating'] = int(rating)
            message.metadata['feedback'] = feedback
            message.save()
            return True
        except (Message.DoesNotExist, ValueError):
            return False


# TODO: Phase 4 - Réactiver quand le modèle AINotification sera créé
# Le consumer ci-dessous est désactivé car le modèle AINotification n'existe pas encore
# Fonctionnalité planifiée: notifications temps réel pour alertes stock, rapports générés, etc.

# class AINotificationConsumer(AsyncWebsocketConsumer):
#     """Consumer pour les notifications IA en temps réel"""
#
#     async def connect(self):
#         self.user = self.scope["user"]
#         self.room_group_name = f'ai_notifications_{self.user.id}'
#
#         # Rejoindre le groupe des notifications
#         await self.channel_layer.group_add(
#             self.room_group_name,
#             self.channel_name
#         )
#
#         await self.accept()
#
#     async def disconnect(self, close_code):
#         # Quitter le groupe
#         await self.channel_layer.group_discard(
#             self.room_group_name,
#             self.channel_name
#         )
#
#     async def receive(self, text_data):
#         """Traite les messages reçus (mark as read, etc.)"""
#         try:
#             data = json.loads(text_data)
#             action = data.get('action')
#
#             if action == 'mark_read':
#                 notification_id = data.get('notification_id')
#                 if notification_id:
#                     await self.mark_notification_read(notification_id)
#
#         except json.JSONDecodeError:
#             pass
#
#     # Handler pour les nouvelles notifications
#     async def ai_notification(self, event):
#         """Envoie une nouvelle notification"""
#         await self.send(text_data=json.dumps({
#             'type': 'notification',
#             'notification': event['notification']
#         }))
#
#     @database_sync_to_async
#     def mark_notification_read(self, notification_id):
#         """Marque une notification comme lue"""
#         try:
#             notification = AINotification.objects.get(
#                 id=notification_id,
#                 user=self.user
#             )
#             notification.mark_as_read()
#             return True
#         except AINotification.DoesNotExist:
#             return False