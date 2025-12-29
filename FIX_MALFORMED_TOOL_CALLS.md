# Fix: Malformed Tool Call Names

## Problème Identifié

L'IA Mistral génère parfois des noms de tool calls malformés:

```
❌ Nom généré: "recherche en cours...asterxmlsearch_product"
✅ Nom attendu: "search_product"
```

**Erreur**: 
```
Action 'recherche en cours...asterxmlsearch_product' non reconnue
```

---

## Cause

Mistral AI peut occasionnellement préfixer ou suffixer le nom de fonction avec du texte supplémentaire, probablement dû à:
- Un problème de parsing interne
- Texte généré avant le tool call
- Format de réponse non standard

---

## Solution Implémentée

**Fichier**: `apps/ai_assistant/services.py` (lignes 1482-1541)

**Changements**:

### 1. Validation des Actions
```python
valid_actions = executor.actions.keys()
```

### 2. Sanitization du Nom
```python
# AVANT le fix:
function_name = tool_call.get('function')

# APRÈS le fix:
function_name = tool_call.get('function', '')
original_function_name = function_name

# Extraire le vrai nom d'action
for valid_action in valid_actions:
    if valid_action in function_name:
        function_name = valid_action
        logger.warning(f"Sanitized: '{original_function_name}' -> '{function_name}'")
        break
```

### 3. Gestion d'Erreur Améliorée
```python
if function_name not in valid_actions:
    logger.error(f"Invalid function name: '{original_function_name}'")
    action_results.append({
        'result': {
            'success': False,
            'error': f"Action '{original_function_name}' non reconnue. ..."
        }
    })
    continue  # Skip cette action malformée
```

---

## Exemple de Comportement

### Avant le Fix:
```
User: "recherche produit lenovo"
→ Mistral génère: "recherche en cours...asterxmlsearch_product"
→ ❌ Erreur: Action non reconnue
→ Aucun résultat
```

### Après le Fix:
```
User: "recherche produit lenovo"
→ Mistral génère: "recherche en cours...asterxmlsearch_product"
→ ⚠️  Détection: Nom malformé
→ ✅ Nettoyage: Extrait "search_product"
→ ✅ Exécution: search_product(query="lenovo")
→ ✅ Résultats affichés
```

---

## Logging

Le système log maintenant:

**Warning** (nom nettoyé avec succès):
```
WARNING: Sanitized malformed function name: 
'recherche en cours...asterxmlsearch_product' -> 'search_product'
```

**Error** (impossible de nettoyer):
```
ERROR: Invalid function name even after sanitization: 
'unmapped_action_xyz'
```

---

## Test de Validation

### Test 1: Nom Malformé avec Action Valide
```python
function_name = "recherche en cours...asterxmlsearch_product"
# → Nettoyé en "search_product" ✅
```

### Test 2: Nom Complètement Invalide
```python
function_name = "action_inexistante_123"
# → Erreur gracieuse, pas de crash ✅
```

### Test 3: Nom Normal
```python
function_name = "search_product"
# → Passe directement ✅
```

---

## Impact

✅ **Robustesse**: L'IA ne crashe plus sur noms malformés
✅ **Résilience**: Extraction automatique du nom correct
✅ **Diagnostic**: Logs pour debugging
✅ **UX**: Utilisateur reçoit résultats au lieu d'erreur

---

## Actions Valides Supportées

Le système valide contre cette liste:
```python
[
    'add_invoice_items', 'add_po_items', 'adjust_stock',
    'analyze_business', 'create_client', 'create_invoice',
    'create_product', 'create_purchase_order', 'create_supplier',
    'delete_client', 'delete_invoice', 'delete_product',
    'delete_purchase_order', 'delete_report', 'delete_supplier',
    'generate_report', 'generate_visualization', 'get_latest_invoice',
    'get_report_status', 'get_statistics', 'get_stats',
    'get_stock_alerts', 'list_clients', 'search_client',
    'search_entity', 'search_invoice', 'search_product',
    'search_purchase_order', 'search_report', 'search_supplier',
    'send_invoice', 'send_purchase_order', 'undo_last_action',
    'update_client', 'update_invoice', 'update_product',
    'update_purchase_order', 'update_supplier'
]
```

---

## Monitoring Recommandé

Surveiller les logs pour:
1. **Fréquence des sanitizations**: Si trop fréquent → problème avec Mistral prompts
2. **Patterns**: Identifier quelles actions sont souvent malformées
3. **Taux d'échec**: Actions invalides même après sanitization

---

**Date**: 29 décembre 2025, 03:20
**Status**: ✅ Fix déployé et testé
