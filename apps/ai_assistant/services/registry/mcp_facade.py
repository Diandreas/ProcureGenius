"""
Façade MCP (Model Context Protocol) interne.

Expose le ToolRegistry selon les primitives MCP `tools/list` et `tools/call`,
sans monter de serveur MCP séparé : la même source d'outils sert Mistral ET MCP.

  - `list_tools()`  -> équivalent de `tools/list` (introspection, lecture seule).
  - `call_tool()`   -> équivalent de `tools/call` (exécution d'un outil par nom).

Cette façade est consommée par la vue HTTP `MCPToolsView` (apps/ai_assistant/views.py)
montée sous /api/v1/ai/mcp/, et peut servir de point d'intégration pour un futur
connecteur MCP externe.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


def list_tools() -> List[Dict[str, Any]]:
    """Retourne la liste des outils au format MCP `tools/list`."""
    from apps.ai_assistant.services.registry.tool_registry import registry
    return registry.mcp_list()


async def call_tool(name: str, arguments: Dict[str, Any], user_ctx: Dict[str, Any]) -> Dict[str, Any]:
    """Exécute un outil par son nom (MCP `tools/call`) et renvoie un résultat MCP.

    Le format de retour suit l'esprit MCP : `isError` + `content` textuel, tout en
    conservant `raw` (le dict métier d'origine) pour les consommateurs internes.
    """
    from apps.ai_assistant.services.registry.tool_registry import registry

    result = await registry.call(name, arguments, user_ctx)
    is_error = not result.get("success", False)
    text = result.get("message") or result.get("error") or ""

    return {
        "isError": is_error,
        "content": [{"type": "text", "text": str(text)}],
        "raw": result,
    }
