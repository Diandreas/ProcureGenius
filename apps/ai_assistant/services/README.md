# Module IA — Architecture du package `services/`

Ce package est la **couche d'orchestration** de l'assistant IA. Il a été refondu
pour être robuste, testable et MCP-compatible, tout en réutilisant les ~50 handlers
métier existants sans les réécrire.

## Vue d'ensemble du flux (2 appels LLM)

```
ChatView.post (views.py)
   │  (quota/budget, persistance message, contexte utilisateur sécurisé)
   ▼
Orchestrator.run()                      ← services/orchestrator.py
   │
   ├─ 0. Court-circuit stats (StatsResponseService)   → réponse directe, 0 appel LLM
   │
   ├─ 1. Appel 1 (planification)        ← MistralProvider.complete(tools=registry.to_mistral_tools())
   │      L'IA choisit QUELLES fonctions appeler.
   │
   ├─    (aucun tool_call) ─────────────→ reply = contenu appel 1   (1 seul appel)
   │
   ├─ 2. Exécution des tool_calls       ← ToolRegistry.call() → ActionExecutor handlers
   │      Récupération des DONNÉES réelles.
   │
   ├─    (confirmation requise) ────────→ PendingAction token (services/confirmation.py)
   │                                       pas de 2e appel ; le front renvoie {token, choice}
   │
   └─ 3. Appel 2 (synthèse)             ← MistralProvider.complete(données réelles)
          Réponse finale analysée. Fallback déterministe si LLM indisponible.
```

Principe directeur : **l'IA ne devine jamais — elle répond sur la base des données
réellement récupérées.**

## Composants

| Fichier | Rôle |
|---|---|
| `orchestrator.py` | Point d'entrée unique : `run()` (chat) et `run_confirmation()` (token). |
| `llm/provider.py` | `MistralProvider` : appel LLM bas niveau, résilient, sans logique métier. |
| `registry/tool_registry.py` | `ToolRegistry` : source unique des outils (Mistral + MCP). Wrappe les handlers existants. |
| `registry/mcp_facade.py` | Façade MCP `tools/list` / `tools/call` (exposée par `MCPToolsView`). |
| `confirmation.py` | `PendingAction` : confirmation par token signé (remplace la détection par mots-clés). |
| `tools/` | Emplacement cible pour le découpage futur des handlers par catégorie. |
| `__init__.py` | **Façade de compatibilité** : ré-exporte tout (les imports historiques `from .services import ...` restent valides). |

## Réutilisation (non réécrit)

- **Handlers métier** : `ActionExecutor` (`_services_core.py`) et ses ~50 méthodes restent
  intacts. Le registre les référence par `executor.actions[name]`.
- **Schémas d'outils** : lus depuis `MistralService._define_tools()` (+ compléments
  dans `SUPPLEMENTAL_SCHEMAS` pour les handlers qui n'avaient pas de schéma).
- **Validation** : `tool_schemas.validate_tool_params`, `action_manager`.
- **Résilience** : `resilience.py` (retry + circuit breaker).
- **Stats / charts** : `StatsResponseService`, `chart_helpers`. Contrat chart préservé
  (`action_results[].result.data` → `MessageContent.jsx`).

## Contrat de réponse `/api/v1/ai/chat/`

`reply` (string non vide) est la **source de vérité** pour l'affichage. Champs :
`reply`, `ai_response` (=reply, compat), `message` (objet), `action_results`,
`action_buttons`, `chart` (miroir), `needs_confirmation` ({token, options}), `tokens_used`.

## Migration restante (non bloquante)

Le découpage physique de `_services_core.py` (déplacer les handlers vers
`tools/<catégorie>.py`) peut se faire **par lots**, chacun validé par
`tests/test_registry.py` (parité registre ↔ handlers). `__init__.py` restant la
façade, aucun import existant ne casse.

## Tests

`tests/test_registry.py`, `tests/test_orchestrator.py`, `tests/test_confirmation.py`,
`tests/test_routing.py`, `tests/test_views.py` (contrat), + suites existantes
(`test_quota`, `test_security`, `test_resilience`).
