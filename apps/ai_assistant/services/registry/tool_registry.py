"""
Registre central des outils IA (cœur MCP-compatible).

Principe : chaque outil que l'IA peut appeler est décrit par un `ToolSpec`
(nom, description, schéma JSON des paramètres, handler, catégorie, et flags).
Le registre est la SOURCE UNIQUE des outils — il sert à la fois :
  - la génération des `tools` pour Mistral (`to_mistral_tools`),
  - l'exécution des appels d'outils (`call`),
  - la façade MCP (`mcp_list` / `mcp_call`).

Stratégie de migration sans réécriture : les ~50 handlers existants vivent dans
`ActionExecutor` (apps/ai_assistant/_services_core.py) et leurs schémas JSON sont
déjà déclarés dans `MistralService._define_tools()`. Le registre les WRAPPE :
il indexe les schémas existants par nom et branche chaque `ToolSpec.handler` sur
`ActionExecutor.actions[name]`. Aucun handler n'est dupliqué ou réécrit.

Le registre est construit paresseusement (lazy) : instancier `ActionExecutor`
importe des modèles Django et lire les schémas via `MistralService` exige une clé
API. On diffère donc la construction jusqu'au premier accès.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class ToolSpec:
    """Description d'un outil appelable par l'IA."""
    name: str
    description: str
    parameters: Dict[str, Any]            # JSON Schema (objet)
    handler: Callable                      # coroutine async (params: dict, user_ctx: dict) -> dict
    category: str = "general"
    needs_confirmation: bool = False
    produces_chart: bool = False
    permission: Optional[str] = None

    def to_mistral_tool(self) -> Dict[str, Any]:
        """Format attendu par l'API Mistral / OpenAI tool-calling."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }

    def to_mcp_tool(self) -> Dict[str, Any]:
        """Format MCP `tools/list` (inputSchema = JSON Schema des paramètres)."""
        return {
            "name": self.name,
            "description": self.description,
            "inputSchema": self.parameters,
            "annotations": {
                "category": self.category,
                "needsConfirmation": self.needs_confirmation,
                "producesChart": self.produces_chart,
            },
        }


# Schémas de complément pour les handlers exécutables qui n'ont PAS de schéma
# déclaré dans `_define_tools()`. Sans cela, l'IA ne sait pas comment les appeler
# (elle ne voyait même pas qu'ils existaient). On les décrit ici plutôt que dans le
# monolithe `_define_tools()` pour garder l'ajout local au registre.
SUPPLEMENTAL_SCHEMAS: Dict[str, Dict[str, Any]] = {
    "search_invoice": {
        "description": "Recherche des factures par numéro, client ou statut.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Terme de recherche (numéro, client...)"},
                "status": {"type": "string", "description": "Filtrer par statut (ex: paid, pending, overdue)"},
                "limit": {"type": "integer", "description": "Nombre maximum de résultats (défaut: 5)"},
            },
            "required": [],
        },
    },
    "search_purchase_order": {
        "description": "Recherche des bons de commande par numéro, titre ou fournisseur.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Terme de recherche (numéro, fournisseur...)"},
                "limit": {"type": "integer", "description": "Nombre maximum de résultats (défaut: 5)"},
            },
            "required": [],
        },
    },
    "search_entity": {
        "description": "Recherche floue robuste d'une entité (client, fournisseur ou produit), "
                       "tolérante aux fautes d'orthographe.",
        "parameters": {
            "type": "object",
            "properties": {
                "entity_type": {
                    "type": "string",
                    "enum": ["client", "supplier", "product"],
                    "description": "Type d'entité à rechercher",
                },
                "query": {"type": "string", "description": "Texte de recherche (peut contenir des fautes)"},
                "min_score": {"type": "number", "description": "Score de similarité minimum 0.0-1.0 (défaut: 0.60)"},
            },
            "required": ["entity_type", "query"],
        },
    },
}


# Actions connues pour produire un graphique (chart spec dans result['data']).
CHART_PRODUCING_ACTIONS = {
    "generate_visualization",
    "get_statistics",
    "analyze_business",
    "get_stats",
    "get_invoice_stats",
    "get_client_stats",
    "get_supplier_stats",
    "get_product_stats",
    "get_stock_stats",
    "predict_cashflow",
}


class ToolRegistry:
    """Registre singleton des outils IA (construit paresseusement)."""

    def __init__(self):
        self._specs: Dict[str, ToolSpec] = {}
        self._built = False

    # ------------------------------------------------------------------ build
    def _ensure_built(self):
        if not self._built:
            self._build()

    def _build(self):
        """Construit le registre en wrappant les outils existants.

        - schémas : récupérés depuis `MistralService._define_tools()`.
        - handlers : récupérés depuis `ActionExecutor().actions`.
        - catégorie / needs_confirmation : déduits des listes de settings.
        """
        from apps.ai_assistant._services_core import ActionExecutor
        from apps.ai_assistant.settings import CONFIRMATION_REQUIRED_ACTIONS

        executor = ActionExecutor()
        handlers = executor.actions  # {name: bound async method}

        schemas_by_name = self._load_schemas()

        for name, handler in handlers.items():
            schema = schemas_by_name.get(name)
            if schema is None:
                supplemental = SUPPLEMENTAL_SCHEMAS.get(name)
                if supplemental is not None:
                    fn = {
                        "name": name,
                        "description": supplemental["description"],
                        "parameters": supplemental["parameters"],
                    }
                else:
                    # Pas de schéma déclaré ni de complément : on enregistre quand
                    # même avec un schéma permissif pour rester appelable, et on le
                    # signale comme une incohérence à corriger.
                    logger.warning(
                        "Tool '%s' a un handler mais aucun schéma dans _define_tools() "
                        "ni dans SUPPLEMENTAL_SCHEMAS; schéma permissif appliqué.", name
                    )
                    fn = {
                        "name": name,
                        "description": f"Action {name}",
                        "parameters": {"type": "object", "properties": {}},
                    }
            else:
                fn = schema

            self._specs[name] = ToolSpec(
                name=name,
                description=fn.get("description", ""),
                parameters=fn.get("parameters", {"type": "object", "properties": {}}),
                handler=handler,
                category=self._infer_category(name),
                needs_confirmation=name in CONFIRMATION_REQUIRED_ACTIONS,
                produces_chart=name in CHART_PRODUCING_ACTIONS,
            )

        # Garde-fou : schéma déclaré mais sans handler -> incohérence à corriger.
        for name in schemas_by_name:
            if name not in self._specs:
                logger.warning(
                    "Tool '%s' a un schéma dans _define_tools() mais aucun handler "
                    "dans ActionExecutor.actions; ignoré.", name
                )

        self._built = True
        logger.info("ToolRegistry construit : %d outils enregistrés.", len(self._specs))

    @staticmethod
    def _load_schemas() -> Dict[str, Dict[str, Any]]:
        """Indexe les schémas de `_define_tools()` par nom de fonction.

        On évite d'instancier `MistralService` (qui exige une clé API) en appelant
        `_define_tools` comme une fonction non liée avec un objet factice.
        """
        from apps.ai_assistant._services_core import MistralService

        try:
            tools = MistralService._define_tools(MistralService.__new__(MistralService))
        except Exception as exc:  # pragma: no cover - robustesse
            logger.error("Impossible de charger les schémas d'outils : %s", exc)
            return {}

        indexed: Dict[str, Dict[str, Any]] = {}
        for tool in tools:
            fn = tool.get("function", {})
            name = fn.get("name")
            if name:
                indexed[name] = fn
        return indexed

    @staticmethod
    def _infer_category(name: str) -> str:
        if name.startswith(("create_", "update_", "delete_", "add_", "adjust_", "send_")):
            return "crud"
        if name.startswith(("search_", "list_", "get_latest", "verify_")):
            return "search"
        if name.startswith(("get_", "analyze_", "generate_visualization", "predict_", "three_way")):
            return "analytics"
        if "journal" in name or "account" in name:
            return "accounting"
        return "general"

    # --------------------------------------------------------------- accessors
    def get(self, name: str) -> Optional[ToolSpec]:
        self._ensure_built()
        return self._specs.get(name)

    def has(self, name: str) -> bool:
        self._ensure_built()
        return name in self._specs

    def names(self) -> List[str]:
        self._ensure_built()
        return sorted(self._specs.keys())

    def by_category(self, category: str) -> List[ToolSpec]:
        self._ensure_built()
        return [s for s in self._specs.values() if s.category == category]

    def all(self) -> List[ToolSpec]:
        self._ensure_built()
        return list(self._specs.values())

    # ------------------------------------------------------------ mistral / mcp
    def to_mistral_tools(self) -> List[Dict[str, Any]]:
        self._ensure_built()
        return [s.to_mistral_tool() for s in self._specs.values()]

    def mcp_list(self) -> List[Dict[str, Any]]:
        self._ensure_built()
        return [s.to_mcp_tool() for s in self._specs.values()]

    # ----------------------------------------------------------------- dispatch
    @staticmethod
    def resolve_name(name: str, valid_names) -> Optional[str]:
        """Récupère un nom d'action valide à partir d'un nom éventuellement malformé.

        Mistral renvoie parfois des noms bruités (ex: 'search...search_product').
        Reprend la logique de sanitisation historique de `ActionExecutor.execute`.
        """
        if name in valid_names:
            return name
        for valid in valid_names:
            if valid in name:
                logger.warning("Nom d'outil normalisé : '%s' -> '%s'", name, valid)
                return valid
        return None

    async def call(self, name: str, arguments: Dict[str, Any], user_ctx: Dict[str, Any]) -> Dict[str, Any]:
        """Exécute un outil par son nom avec validation des paramètres.

        Réutilise la validation existante :
          - `tool_schemas.validate_tool_params` (coercition de types),
          - le handler `ActionExecutor` qui fait sa propre validation métier.

        Retourne toujours un dict avec au moins `success`.
        """
        self._ensure_built()
        from apps.ai_assistant.tool_schemas import validate_tool_params

        resolved = self.resolve_name(name, self._specs.keys())
        if resolved is None:
            return {
                "success": False,
                "error": f"Action '{name}' non reconnue. "
                         f"Actions disponibles: {', '.join(self.names())}",
            }

        spec = self._specs[resolved]

        # Normaliser arguments (peut arriver en liste/str depuis l'IA)
        arguments = _normalize_arguments(arguments)

        # Coercition de types (tolérante : ne bloque pas si schéma absent)
        _, cleaned, _ = validate_tool_params(resolved, arguments)

        try:
            result = await spec.handler(cleaned, user_ctx)
        except Exception as exc:  # pragma: no cover - robustesse runtime
            import traceback
            logger.error("Erreur d'exécution de l'outil %s : %s", resolved, exc)
            logger.error(traceback.format_exc())
            return {"success": False, "error": str(exc)}

        if not isinstance(result, dict):
            logger.error("Le handler %s a retourné un type non-dict : %s", resolved, type(result))
            return {"success": False, "error": "Le handler a retourné un format invalide"}

        return result


def _normalize_arguments(arguments: Any) -> Dict[str, Any]:
    """Normalise les arguments d'un tool_call en dict (reprend views.py:350-368)."""
    if isinstance(arguments, dict):
        return arguments
    if isinstance(arguments, list):
        if len(arguments) == 1 and isinstance(arguments[0], dict):
            return arguments[0]
        logger.warning("Arguments en liste convertis en dict vide : %s", arguments)
        return {}
    if isinstance(arguments, str):
        import json
        try:
            parsed = json.loads(arguments)
            return parsed if isinstance(parsed, dict) else {}
        except (ValueError, TypeError):
            return {}
    return {}


# Instance globale (lazy)
registry = ToolRegistry()
