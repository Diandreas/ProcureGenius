# 📋 CODE À COPIER-COLLER - Implémentation Module IA

## ✅ Backups créés dans: `backup_20251001_004918/`

---

## 🔧 ÉTAPE 1: Modifier apps/ai_assistant/services.py

### 1.1 Dans __init__, ligne ~26, REMPLACER:

```python
        self.client = Mistral(api_key=api_key)
        self.model = getattr(settings, 'MISTRAL_MODEL', 'mistral-large-latest')
```

**PAR:**

```python
        self.client = Mistral(api_key=api_key)
        self.model = getattr(settings, 'MISTRAL_MODEL', 'mistral-large-latest')
        self.tools = self._define_tools()
```

### 1.2 Après create_system_prompt(), AJOUTER cette méthode complète:

```python
    def _define_tools(self) -> List[Dict]:
        """Définit tous les tools/functions disponibles pour Mistral"""
        return [
            {
                "type": "function",
                "function": {
                    "name": "create_supplier",
                    "description": "Crée un nouveau fournisseur dans le système",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "Nom du fournisseur (obligatoire)"},
                            "contact_person": {"type": "string", "description": "Nom de la personne de contact"},
                            "email": {"type": "string", "description": "Adresse email du fournisseur"},
                            "phone": {"type": "string", "description": "Numéro de téléphone"},
                            "address": {"type": "string", "description": "Adresse complète"},
                            "city": {"type": "string", "description": "Ville"},
                            "website": {"type": "string", "description": "Site web"},
                            "notes": {"type": "string", "description": "Notes additionnelles"}
                        },
                        "required": ["name"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_supplier",
                    "description": "Recherche des fournisseurs par nom, contact ou email",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "Terme de recherche"},
                            "status": {
                                "type": "string",
                                "enum": ["active", "pending", "inactive"],
                                "description": "Filtrer par statut"
                            },
                            "limit": {"type": "integer", "description": "Nombre maximum de résultats (défaut: 5)"}
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "create_invoice",
                    "description": "Crée une nouvelle facture pour un client",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "client_name": {"type": "string", "description": "Nom du client"},
                            "description": {"type": "string", "description": "Description de la facture"},
                            "amount": {"type": "number", "description": "Montant total"},
                            "due_date": {"type": "string", "description": "Date d'échéance (format: YYYY-MM-DD)"},
                            "items": {
                                "type": "array",
                                "description": "Liste des articles/services",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "description": {"type": "string"},
                                        "quantity": {"type": "number"},
                                        "unit_price": {"type": "number"}
                                    }
                                }
                            },
                            "tax_rate": {"type": "number", "description": "Taux de TVA (défaut: 20)"}
                        },
                        "required": ["client_name", "description"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "create_purchase_order",
                    "description": "Crée un nouveau bon de commande pour un fournisseur",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "supplier_name": {"type": "string", "description": "Nom du fournisseur"},
                            "description": {"type": "string", "description": "Description de la commande"},
                            "total_amount": {"type": "number", "description": "Montant total"},
                            "delivery_date": {"type": "string", "description": "Date de livraison souhaitée (YYYY-MM-DD)"},
                            "items": {
                                "type": "array",
                                "description": "Liste des articles commandés",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "description": {"type": "string"},
                                        "quantity": {"type": "number"},
                                        "unit_price": {"type": "number"}
                                    }
                                }
                            },
                            "notes": {"type": "string", "description": "Notes pour le fournisseur"}
                        },
                        "required": ["supplier_name", "description"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_statistics",
                    "description": "Affiche les statistiques de l'entreprise",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "period": {
                                "type": "string",
                                "enum": ["today", "week", "month", "year"],
                                "description": "Période des statistiques"
                            },
                            "category": {
                                "type": "string",
                                "enum": ["suppliers", "invoices", "revenue", "purchase_orders", "all"],
                                "description": "Catégorie de statistiques"
                            }
                        },
                        "required": ["period"]
                    }
                }
            }
        ]
```

### 1.3 REMPLACER toute la méthode async def chat():

**SUPPRIMER l'ancienne méthode et REMPLACER par:**

```python
    async def chat(self,
                   message: str,
                   conversation_history: List[Dict] = None,
                   user_context: Dict = None) -> Dict[str, Any]:
        """
        Envoie un message à Mistral avec function calling et retourne la réponse
        """
        try:
            # Construire les messages
            messages = [
                {"role": "system", "content": self.create_system_prompt()}
            ]

            # Ajouter l'historique si disponible
            if conversation_history:
                for msg in conversation_history[-10:]:
                    messages.append({
                        "role": msg.get('role', 'user'),
                        "content": msg.get('content', '') if msg.get('content') else None,
                        "tool_calls": msg.get('tool_calls') if msg.get('tool_calls') else None
                    })

            # Ajouter le message actuel
            messages.append({"role": "user", "content": message})

            # Appeler Mistral avec tools
            response = self.client.chat.complete(
                model=self.model,
                messages=messages,
                tools=self.tools,
                tool_choice="auto",
                temperature=0.7,
                max_tokens=1500
            )

            # Extraire la réponse
            choice = response.choices[0]
            message_response = choice.message

            result = {
                'success': True,
                'response': message_response.content if message_response.content else "",
                'tool_calls': None,
                'finish_reason': choice.finish_reason
            }

            # Si l'IA a décidé d'appeler des fonctions
            if message_response.tool_calls:
                result['tool_calls'] = [
                    {
                        'id': tool_call.id,
                        'function': tool_call.function.name,
                        'arguments': json.loads(tool_call.function.arguments)
                    }
                    for tool_call in message_response.tool_calls
                ]

            return result

        except Exception as e:
            logger.error(f"Mistral API error: {e}")
            return {
                'response': "Désolé, j'ai rencontré une erreur. Veuillez réessayer.",
                'tool_calls': None,
                'success': False,
                'error': str(e)
            }
```

### 1.4 SUPPRIMER la méthode parse_ai_response() (elle n'est plus nécessaire)

---

## ✅ Vérification services.py

Après ces modifications, services.py doit avoir:
- [ ] `self.tools = self._define_tools()` dans `__init__`
- [ ] Méthode `_define_tools()` qui retourne 5 tools
- [ ] Nouvelle méthode `chat()` avec `tools=self.tools`
- [ ] `parse_ai_response()` supprimée

---

## 📝 ÉTAPE 2: Modifier apps/ai_assistant/models.py

### Dans la classe Message, AJOUTER ces 2 champs:

**Trouver la classe Message et ajouter AVANT `created_at`:**

```python
    tool_calls = models.JSONField(null=True, blank=True)
    metadata = models.JSONField(null=True, blank=True)
```

**Exemple complet:**
```python
class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE)
    role = models.CharField(max_length=20)
    content = models.TextField()
    tool_calls = models.JSONField(null=True, blank=True)  # NOUVEAU
    metadata = models.JSONField(null=True, blank=True)     # NOUVEAU
    created_at = models.DateTimeField(auto_now_add=True)
```

---

## 🔄 ÉTAPE 3: Créer et appliquer migrations

**Dans le terminal:**

```bash
cd d:/project/BFMa/ProcureGenius
py manage.py makemigrations ai_assistant
py manage.py migrate ai_assistant
```

---

## ✅ ÉTAPE 4: Tester

### 4.1 Démarrer le serveur:

```bash
py manage.py runserver
```

### 4.2 Tester avec Python:

```bash
py manage.py shell
```

Puis dans le shell:

```python
from apps.ai_assistant.services import MistralService
import asyncio

# Créer le service
mistral = MistralService()

# Vérifier les tools
print(f"Nombre de tools: {len(mistral.tools)}")

# Tester un appel
async def test():
    result = await mistral.chat("Bonjour")
    print("Response:", result['response'])
    print("Tool calls:", result.get('tool_calls'))

asyncio.run(test())
```

### 4.3 Test function calling:

```python
async def test_function_calling():
    result = await mistral.chat("Crée un fournisseur Test Corp avec email test@corp.com")
    print("Response:", result['response'])
    print("Tool calls:", result.get('tool_calls'))
    # Devrait afficher: {'function': 'create_supplier', 'arguments': {'name': 'Test Corp', ...}}

asyncio.run(test_function_calling())
```

---

## 🎯 Résultat Attendu

Après ces modifications, vous devez avoir:

✅ MistralService avec function calling fonctionnel
✅ 5 tools définis (create_supplier, search_supplier, create_invoice, create_purchase_order, get_statistics)
✅ Modèle Message avec champs tool_calls et metadata
✅ Migrations appliquées
✅ Tests passants

---

## 📞 Prochaines Étapes

Après validation de cette étape:
1. Compléter ActionExecutor (IMPLEMENTATION_GUIDE.md)
2. Mettre à jour views.py (BACKEND_ENDPOINTS.md)
3. Créer les composants frontend (FRONTEND_IMPLEMENTATION.md)

Consultez IMPLEMENTATION_STEPS.txt pour la suite détaillée.

---

**Backups disponibles dans: backup_20251001_004918/**
