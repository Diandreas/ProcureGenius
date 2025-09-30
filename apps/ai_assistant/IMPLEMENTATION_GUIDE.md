# 🚀 Guide d'Implémentation - Module IA avec Function Calling

## 📝 Résumé

Ce guide contient le code complet pour mettre à niveau `services.py` avec le function calling natif de Mistral AI.

---

## ✅ Étape 2 : MistralService avec Function Calling

### Modifications à apporter dans `services.py`

#### 1. Modifier la class `MistralService`

Ajouter dans `__init__`:
```python
self.tools = self._define_tools()
```

#### 2. Ajouter la méthode `_define_tools()`

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

#### 3. Remplacer la méthode `chat()`

```python
async def chat(self,
               message: str,
               conversation_history: List[Dict] = None,
               user_context: Dict = None) -> Dict[str, Any]:
    """
    Envoie un message à Mistral avec function calling et retourne la réponse

    Args:
        message: Message de l'utilisateur
        conversation_history: Historique de la conversation
        user_context: Contexte utilisateur (entreprise, permissions, etc.)

    Returns:
        Dict contenant la réponse, tool_calls éventuels, et métadonnées
    """
    try:
        # Construire les messages
        messages = [
            {"role": "system", "content": self.create_system_prompt()}
        ]

        # Ajouter l'historique si disponible
        if conversation_history:
            for msg in conversation_history[-10:]:  # Garder les 10 derniers messages
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
            tool_choice="auto",  # Mistral décide automatiquement
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

#### 4. Mettre à jour le System Prompt

```python
def create_system_prompt(self) -> str:
    """Crée le prompt système pour l'assistant"""
    return """Tu es ProcureGenius Assistant, un assistant IA expert en gestion d'entreprise.

Tu aides les utilisateurs à :
- Gérer les fournisseurs (créer, rechercher, modifier)
- Créer et gérer les factures avec leurs articles
- Créer et suivre les bons de commande
- Consulter les statistiques et analyses
- Analyser des documents scannés (factures, BC, registres)

Comportement :
1. Toujours répondre en français, de manière professionnelle mais amicale
2. Utiliser les fonctions disponibles pour exécuter les actions
3. Demander les informations manquantes de manière conversationnelle
4. Confirmer les actions importantes avant exécution
5. Proposer des actions de suivi pertinentes après chaque opération

Style : Concis, clair, et orienté action."""
```

---

## ✅ Étape 3 & 4 : ActionExecutor Complet

### Modifier la class `ActionExecutor`

```python
class ActionExecutor:
    """Exécute les actions demandées par l'IA via function calling"""

    def __init__(self):
        self.actions = {
            'create_supplier': self.create_supplier,
            'search_supplier': self.search_supplier,
            'create_invoice': self.create_invoice,
            'add_invoice_items': self.add_invoice_items,
            'search_invoice': self.search_invoice,
            'create_purchase_order': self.create_purchase_order,
            'search_purchase_order': self.search_purchase_order,
            'get_statistics': self.get_statistics,
        }

    async def execute(self, function_name: str, arguments: Dict, user) -> Dict[str, Any]:
        """Exécute une function call avec les arguments donnés"""

        if function_name not in self.actions:
            return {
                'success': False,
                'error': f"Fonction '{function_name}' non reconnue"
            }

        try:
            handler = self.actions[function_name]
            result = await handler(arguments, user)

            # Si l'action a réussi, générer les actions de suivi
            if result.get('success'):
                success_actions = action_manager.generate_success_actions(
                    function_name,
                    result.get('data', {})
                )
                result['success_actions'] = success_actions

            return result
        except Exception as e:
            logger.error(f"Action execution error ({function_name}): {e}")
            return {
                'success': False,
                'error': str(e)
            }
```

### Ajouter les méthodes manquantes

```python
async def add_invoice_items(self, params: Dict, user) -> Dict:
    """Ajoute des articles à une facture existante"""
    from apps.invoicing.models import Invoice, InvoiceItem

    try:
        invoice_id = params.get('invoice_id')
        invoice = Invoice.objects.get(id=invoice_id)

        items = params.get('items', [])
        added_count = 0

        for item_data in items:
            InvoiceItem.objects.create(
                invoice=invoice,
                description=item_data.get('description', ''),
                quantity=item_data.get('quantity', 1),
                unit_price=item_data.get('unit_price', 0)
            )
            added_count += 1

        # Recalculer le total
        invoice.save()

        return {
            'success': True,
            'message': f"{added_count} article(s) ajouté(s) à la facture",
            'data': {
                'invoice_id': str(invoice.id),
                'invoice_number': invoice.invoice_number,
                'total_amount': str(invoice.total_amount),
                'items_count': added_count
            }
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

async def search_invoice(self, params: Dict, user) -> Dict:
    """Recherche des factures"""
    from apps.invoicing.models import Invoice
    from django.db.models import Q

    query = params.get('query', '')
    status = params.get('status')

    qs = Invoice.objects.all()

    if query:
        qs = qs.filter(
            Q(invoice_number__icontains=query) |
            Q(client__name__icontains=query) |
            Q(description__icontains=query)
        )

    if status:
        qs = qs.filter(status=status)

    invoices = qs[:10]

    results = [{
        'id': str(i.id),
        'invoice_number': i.invoice_number,
        'client_name': i.client.name,
        'total_amount': str(i.total_amount),
        'status': i.status,
        'due_date': str(i.due_date)
    } for i in invoices]

    return {
        'success': True,
        'data': results,
        'count': len(results),
        'message': f"Trouvé {len(results)} facture(s)"
    }

async def create_purchase_order(self, params: Dict, user) -> Dict:
    """Crée un bon de commande"""
    from apps.purchase_orders.models import PurchaseOrder, PurchaseOrderItem
    from apps.suppliers.models import Supplier
    from datetime import datetime

    try:
        # Trouver le fournisseur
        supplier_name = params.get('supplier_name')
        supplier = Supplier.objects.filter(name__icontains=supplier_name).first()

        if not supplier:
            return {
                'success': False,
                'error': f"Fournisseur '{supplier_name}' non trouvé. Créez-le d'abord."
            }

        # Date de livraison
        delivery_date = params.get('delivery_date')
        if delivery_date:
            delivery_date = datetime.strptime(delivery_date, '%Y-%m-%D').date()

        po = PurchaseOrder.objects.create(
            supplier=supplier,
            description=params.get('description', ''),
            delivery_date=delivery_date,
            notes=params.get('notes', ''),
            created_by=user
        )

        # Ajouter les articles si fournis
        items = params.get('items', [])
        for item_data in items:
            PurchaseOrderItem.objects.create(
                purchase_order=po,
                description=item_data.get('description', ''),
                quantity=item_data.get('quantity', 1),
                unit_price=item_data.get('unit_price', 0)
            )

        return {
            'success': True,
            'message': f"Bon de commande '{po.po_number}' créé avec succès",
            'data': {
                'id': str(po.id),
                'po_number': po.po_number,
                'supplier_name': supplier.name,
                'total_amount': str(po.total_amount),
                'entity_type': 'purchase_order'
            }
        }
    except Exception as e:
        logger.error(f"Create purchase order error: {e}")
        return {
            'success': False,
            'error': str(e)
        }

async def get_statistics(self, params: Dict, user) -> Dict:
    """Récupère les statistiques"""
    from apps.suppliers.models import Supplier
    from apps.invoicing.models import Invoice
    from apps.purchase_orders.models import PurchaseOrder
    from django.db.models import Sum, Count, Q
    from datetime import datetime, timedelta

    period = params.get('period', 'month')
    category = params.get('category', 'all')

    # Calculer la date de début selon la période
    now = datetime.now()
    if period == 'today':
        start_date = now.replace(hour=0, minute=0, second=0)
    elif period == 'week':
        start_date = now - timedelta(days=7)
    elif period == 'month':
        start_date = now - timedelta(days=30)
    else:  # year
        start_date = now - timedelta(days=365)

    stats = {}

    if category in ['all', 'suppliers']:
        stats['suppliers'] = {
            'total': Supplier.objects.count(),
            'active': Supplier.objects.filter(status='active').count(),
            'pending': Supplier.objects.filter(status='pending').count(),
        }

    if category in ['all', 'invoices', 'revenue']:
        invoice_stats = Invoice.objects.filter(created_at__gte=start_date).aggregate(
            total_count=Count('id'),
            paid_count=Count('id', filter=Q(status='paid')),
            total_revenue=Sum('total_amount', filter=Q(status='paid'))
        )
        stats['invoices'] = {
            'total': invoice_stats['total_count'],
            'paid': invoice_stats['paid_count'],
            'unpaid': Invoice.objects.filter(status='sent').count(),
            'overdue': Invoice.objects.filter(status='overdue').count(),
            'total_revenue': float(invoice_stats['total_revenue'] or 0)
        }

    if category in ['all', 'purchase_orders']:
        po_stats = PurchaseOrder.objects.filter(created_at__gte=start_date).aggregate(
            total_count=Count('id'),
            total_amount=Sum('total_amount')
        )
        stats['purchase_orders'] = {
            'total': po_stats['total_count'],
            'total_amount': float(po_stats['total_amount'] or 0)
        }

    return {
        'success': True,
        'data': stats,
        'period': period,
        'message': f"Statistiques pour la période : {period}"
    }
```

---

## 📋 Checklist d'Implémentation

- [ ] Backup du fichier `services.py` actuel
- [ ] Ajouter `self.tools = self._define_tools()` dans `__init__`
- [ ] Ajouter la méthode `_define_tools()`
- [ ] Remplacer la méthode `chat()` par la nouvelle version
- [ ] Mettre à jour `create_system_prompt()`
- [ ] Supprimer `parse_ai_response()` (n'est plus nécessaire)
- [ ] Mettre à jour `ActionExecutor.execute()` pour utiliser `function_name` au lieu de `action`
- [ ] Ajouter les méthodes manquantes dans `ActionExecutor`
- [ ] Tester avec un appel simple : "Crée un fournisseur Test Corp"

---

## 🧪 Tests Rapides

```python
# Test 1: Création fournisseur
mistral_service = MistralService()
result = await mistral_service.chat("Crée un fournisseur Tech Solutions avec email contact@tech.com")
print(result['tool_calls'])  # Doit afficher create_supplier

# Test 2: Recherche
result = await mistral_service.chat("Trouve les fournisseurs actifs")
print(result['tool_calls'])  # Doit afficher search_supplier

# Test 3: Statistiques
result = await mistral_service.chat("Montre-moi les stats du mois")
print(result['tool_calls'])  # Doit afficher get_statistics
```

---

## 📖 Prochaines Étapes

Après avoir implémenté ce code :
1. ✅ Tester les function calls de base
2. → Passer à l'Étape 5 : OCR Service
3. → Passer à l'Étape 6 : Frontend FloatingAIAssistant
4. → Passer à l'Étape 7 : Composants UI

---

**Note :** Ce document contient tout le code nécessaire pour les Étapes 2, 3 et 4 du plan d'action.