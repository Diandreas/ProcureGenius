# 🌐 Étape 8 : API Endpoints & Contexte Conversationnel

## 🎯 Objectif

Créer tous les endpoints API nécessaires pour le module IA et gérer le contexte conversationnel.

---

## 📋 Endpoints à Créer

```
POST   /api/v1/ai/chat/                        # Chat principal
POST   /api/v1/ai/analyze-document/            # Analyse de documents
GET    /api/v1/ai/quick-actions/               # Actions rapides
GET    /api/v1/ai/conversations/               # Liste conversations
GET    /api/v1/ai/conversations/:id/history/   # Historique conversation
DELETE /api/v1/ai/conversations/:id/           # Supprimer conversation
POST   /api/v1/ai/execute-action/              # Exécuter une action manuellement
GET    /api/v1/ai/suggestions/                 # Suggestions intelligentes
```

---

## 🔧 Code à Ajouter dans `views.py`

### 1. Mettre à jour ChatView (existant)

```python
class ChatView(APIView):
    """Endpoint principal pour le chat avec l'IA"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Envoyer un message à l'IA avec function calling"""
        serializer = ChatRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user_message = serializer.validated_data['message']
        conversation_id = serializer.validated_data.get('conversation_id')
        context_data = request.data.get('context', {})

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
            ).order_by('created_at').values('role', 'content', 'tool_calls')

            # Appeler Mistral AI
            mistral_service = MistralService()
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            try:
                result = loop.run_until_complete(
                    mistral_service.chat(
                        message=user_message,
                        conversation_history=list(history)[:-1],  # Exclure le dernier message
                        user_context={'user_id': request.user.id, **context_data}
                    )
                )
            finally:
                loop.close()

            # Sauvegarder la réponse de l'IA
            ai_msg = Message.objects.create(
                conversation=conversation,
                role='assistant',
                content=result['response'],
                tool_calls=result.get('tool_calls')
            )

            # Exécuter les tool calls si présents
            action_result = None
            success_actions = []

            if result.get('tool_calls'):
                executor = ActionExecutor()

                # Exécuter chaque tool call
                for tool_call in result['tool_calls']:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)

                    try:
                        action_result = loop.run_until_complete(
                            executor.execute(
                                function_name=tool_call['function'],
                                arguments=tool_call['arguments'],
                                user=request.user
                            )
                        )
                    finally:
                        loop.close()

                    # Récupérer les actions de suivi
                    if action_result and action_result.get('success'):
                        success_actions.extend(action_result.get('success_actions', []))

                # Sauvegarder le résultat de l'action dans la conversation
                if action_result:
                    Message.objects.create(
                        conversation=conversation,
                        role='system',
                        content=f"Action result: {action_result.get('message', '')}",
                        metadata={'action_result': action_result}
                    )

            return Response({
                'conversation_id': str(conversation.id),
                'response': result['response'],
                'tool_calls': result.get('tool_calls'),
                'action_result': action_result,
                'success_actions': success_actions,
                'finish_reason': result.get('finish_reason')
            }, status=status.HTTP_200_OK)

        except Conversation.DoesNotExist:
            return Response(
                {'error': 'Conversation non trouvée'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Chat error: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
```

### 2. QuickActionsView (nouveau)

```python
class QuickActionsView(APIView):
    """Endpoint pour récupérer les actions rapides"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Récupère les actions rapides selon le contexte

        Query params:
        - category: Catégorie (suppliers, invoices, purchase_orders, etc.)
        """
        try:
            category = request.query_params.get('category')

            # Récupérer depuis la configuration
            quick_responses = action_manager.get_quick_responses(category) if category else []

            # Si aucune action configurée, retourner des actions génériques
            if not quick_responses:
                quick_responses = [
                    "Créer un nouveau fournisseur",
                    "Rechercher une facture",
                    "Afficher les statistiques du mois",
                    "Analyser un document"
                ]

            # Formatter les actions
            actions = []
            for response in quick_responses:
                action_type = 'create' if 'créer' in response.lower() or 'nouveau' in response.lower() else \
                              'search' if 'rechercher' in response.lower() or 'trouver' in response.lower() else \
                              'stats' if 'statistiques' in response.lower() else \
                              'document' if 'document' in response.lower() else 'other'

                actions.append({
                    'label': response,
                    'type': action_type
                })

            return Response({
                'actions': actions,
                'category': category
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Quick actions error: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
```

### 3. ConversationListView (nouveau)

```python
class ConversationListView(APIView):
    """Liste les conversations de l'utilisateur"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Récupère toutes les conversations de l'utilisateur"""
        try:
            conversations = Conversation.objects.filter(
                user=request.user
            ).order_by('-updated_at')

            # Serializer
            data = []
            for conv in conversations:
                # Compter les messages
                message_count = conv.message_set.count()

                # Dernier message
                last_message = conv.message_set.order_by('-created_at').first()

                data.append({
                    'id': str(conv.id),
                    'title': conv.title,
                    'message_count': message_count,
                    'last_message': last_message.content[:100] if last_message else None,
                    'created_at': conv.created_at,
                    'updated_at': conv.updated_at
                })

            return Response({
                'conversations': data,
                'count': len(data)
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Conversation list error: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
```

### 4. ConversationHistoryView (nouveau)

```python
class ConversationHistoryView(APIView):
    """Récupère l'historique d'une conversation"""
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id):
        """
        Récupère tous les messages d'une conversation

        Path params:
        - conversation_id: ID de la conversation
        """
        try:
            conversation = Conversation.objects.get(
                id=conversation_id,
                user=request.user
            )

            messages = Message.objects.filter(
                conversation=conversation
            ).order_by('created_at')

            # Serializer
            data = []
            for msg in messages:
                data.append({
                    'id': str(msg.id),
                    'role': msg.role,
                    'content': msg.content,
                    'tool_calls': msg.tool_calls,
                    'metadata': msg.metadata,
                    'created_at': msg.created_at
                })

            return Response({
                'conversation_id': str(conversation.id),
                'messages': data,
                'count': len(data)
            }, status=status.HTTP_200_OK)

        except Conversation.DoesNotExist:
            return Response(
                {'error': 'Conversation non trouvée'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Conversation history error: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request, conversation_id):
        """Supprime une conversation"""
        try:
            conversation = Conversation.objects.get(
                id=conversation_id,
                user=request.user
            )

            conversation.delete()

            return Response(
                {'message': 'Conversation supprimée avec succès'},
                status=status.HTTP_200_OK
            )

        except Conversation.DoesNotExist:
            return Response(
                {'error': 'Conversation non trouvée'},
                status=status.HTTP_404_NOT_FOUND
            )
```

### 5. ExecuteActionView (nouveau)

```python
class ExecuteActionView(APIView):
    """Exécute une action manuellement (sans l'IA)"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Exécute une action directement

        Body:
        - function_name: Nom de la fonction
        - arguments: Arguments de la fonction
        """
        try:
            function_name = request.data.get('function_name')
            arguments = request.data.get('arguments', {})

            if not function_name:
                return Response(
                    {'error': 'function_name est requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            executor = ActionExecutor()
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            try:
                result = loop.run_until_complete(
                    executor.execute(
                        function_name=function_name,
                        arguments=arguments,
                        user=request.user
                    )
                )
            finally:
                loop.close()

            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Execute action error: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
```

### 6. SuggestionsView (nouveau)

```python
class SuggestionsView(APIView):
    """Génère des suggestions intelligentes"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Génère des suggestions basées sur le contexte utilisateur

        Query params:
        - page: Page actuelle (suppliers, invoices, etc.)
        - entity_id: ID de l'entité actuelle
        """
        try:
            page = request.query_params.get('page')
            entity_id = request.query_params.get('entity_id')

            suggestions = []

            # Suggestions basées sur la page
            if page == 'suppliers':
                suggestions = [
                    "Créer un bon de commande pour ce fournisseur",
                    "Voir les statistiques de ce fournisseur",
                    "Rechercher d'autres fournisseurs similaires"
                ]
            elif page == 'invoices':
                suggestions = [
                    "Envoyer cette facture au client",
                    "Marquer comme payée",
                    "Créer une facture similaire"
                ]
            elif page == 'dashboard':
                suggestions = [
                    "Afficher les statistiques du mois",
                    "Voir les factures impayées",
                    "Analyser les revenus de l'année"
                ]

            # Suggestions basées sur l'historique utilisateur
            recent_conversations = Conversation.objects.filter(
                user=request.user
            ).order_by('-updated_at')[:5]

            # Analyser les actions fréquentes
            if recent_conversations.exists():
                # TODO: Implémenter analyse ML pour suggestions personnalisées
                pass

            return Response({
                'suggestions': suggestions,
                'page': page
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Suggestions error: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
```

---

## 📡 Mettre à Jour `api_urls.py`

```python
from django.urls import path
from .views import (
    ChatView,
    DocumentAnalysisView,
    QuickActionsView,
    ConversationListView,
    ConversationHistoryView,
    ExecuteActionView,
    SuggestionsView,
)

urlpatterns = [
    # Chat principal
    path('chat/', ChatView.as_view(), name='ai-chat'),

    # Documents
    path('analyze-document/', DocumentAnalysisView.as_view(), name='analyze-document'),

    # Quick actions
    path('quick-actions/', QuickActionsView.as_view(), name='quick-actions'),

    # Conversations
    path('conversations/', ConversationListView.as_view(), name='conversation-list'),
    path('conversations/<str:conversation_id>/history/', ConversationHistoryView.as_view(), name='conversation-history'),
    path('conversations/<str:conversation_id>/', ConversationHistoryView.as_view(), name='conversation-delete'),

    # Actions manuelles
    path('execute-action/', ExecuteActionView.as_view(), name='execute-action'),

    # Suggestions
    path('suggestions/', SuggestionsView.as_view(), name='suggestions'),
]
```

---

## 🗄️ Modèles - Ajouter Métadonnées dans `models.py`

```python
class Message(models.Model):
    """Message dans une conversation"""
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=[
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System')
    ])
    content = models.TextField()
    tool_calls = models.JSONField(null=True, blank=True)  # AJOUTER CE CHAMP
    metadata = models.JSONField(null=True, blank=True)    # AJOUTER CE CHAMP
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.role}: {self.content[:50]}"
```

Créer une migration :
```bash
py manage.py makemigrations ai_assistant
py manage.py migrate
```

---

## 🧪 Tests des Endpoints

### Test 1: Chat avec function calling
```bash
curl -X POST http://localhost:8000/api/v1/ai/chat/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Crée un fournisseur Tech Corp avec email contact@tech.com"
  }'
```

### Test 2: Quick actions
```bash
curl -X GET "http://localhost:8000/api/v1/ai/quick-actions/?category=suppliers" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 3: Historique conversation
```bash
curl -X GET http://localhost:8000/api/v1/ai/conversations/CONVERSATION_ID/history/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 4: Exécuter une action manuellement
```bash
curl -X POST http://localhost:8000/api/v1/ai/execute-action/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "function_name": "get_statistics",
    "arguments": {
      "period": "month",
      "category": "all"
    }
  }'
```

---

## ✅ Checklist d'Implémentation

- [ ] Mettre à jour `ChatView` avec tool calling
- [ ] Créer `QuickActionsView`
- [ ] Créer `ConversationListView`
- [ ] Créer `ConversationHistoryView`
- [ ] Créer `ExecuteActionView`
- [ ] Créer `SuggestionsView`
- [ ] Mettre à jour `api_urls.py`
- [ ] Ajouter champs `tool_calls` et `metadata` dans modèle `Message`
- [ ] Créer et appliquer les migrations
- [ ] Tester chaque endpoint

---

## 🎯 Résultat Final

Après cette étape, vous aurez :

✅ Chat avec function calling complet
✅ Gestion des conversations persistantes
✅ Actions rapides contextuelles
✅ Historique des conversations
✅ Exécution manuelle d'actions
✅ Système de suggestions
✅ API RESTful complète

---

**Prochaine étape :** Workflows multi-étapes et suggestions intelligentes avancées.
