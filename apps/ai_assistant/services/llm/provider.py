"""
Fournisseur LLM bas niveau (Mistral AI).

Encapsule UNIQUEMENT l'appel au modèle : initialisation du client (compatible
plusieurs versions du SDK mistralai), appel `chat.complete` protégé par le retry +
circuit breaker existant (apps/ai_assistant/resilience.py), et normalisation de la
réponse en un dict simple et stable.

Cette couche ne connaît NI les outils métier NI l'orchestration : elle reçoit des
`messages` (+ éventuellement des `tools`) et renvoie le contenu, les tool_calls
parsés et l'usage. L'Orchestrator s'appuie dessus pour ses deux appels (récupération
puis synthèse).
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Optional

from django.conf import settings

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "mistral-large-latest"


def _build_client(api_key: str):
    """Instancie le client Mistral en tolérant les variations de packaging du SDK."""
    try:
        from mistralai.client import Mistral
        return Mistral(api_key=api_key)
    except ImportError:
        pass
    try:
        from mistralai import Mistral
        return Mistral(api_key=api_key)
    except ImportError:
        # Anciennes versions (v0.x)
        from mistralai.client import MistralClient
        return MistralClient(api_key=api_key)


class MistralProvider:
    """Appel LLM Mistral normalisé, résilient et sans logique métier."""

    def __init__(self, model: Optional[str] = None, api_key: Optional[str] = None):
        key = api_key or getattr(settings, "MISTRAL_API_KEY", None) or os.getenv("MISTRAL_API_KEY")
        if not key:
            raise ValueError("MISTRAL_API_KEY not configured")
        self.client = _build_client(key)
        self.model = model or getattr(settings, "MISTRAL_MODEL", DEFAULT_MODEL)

    # ------------------------------------------------------------------ public
    def complete(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        tool_choice: str = "auto",
        temperature: float = 0.7,
        max_tokens: int = 2500,
    ) -> Dict[str, Any]:
        """Un appel LLM. Retourne un dict normalisé.

        Forme du retour :
            {
              'success': bool,
              'content': str,                 # texte (peut être vide si tool_calls)
              'tool_calls': list | None,      # [{'id','function','arguments'(dict)}]
              'finish_reason': str | None,
              'usage': {'prompt_tokens','completion_tokens','total_tokens'},
              'circuit_open': bool,           # True si le circuit breaker a coupé
              'error': str | None,
            }
        """
        from apps.ai_assistant.resilience import retry_with_backoff

        @retry_with_backoff(max_retries=3)
        def _call():
            kwargs = dict(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            if tools:
                kwargs["tools"] = tools
                kwargs["tool_choice"] = tool_choice
            return self.client.chat.complete(**kwargs)

        try:
            response = _call()
        except Exception as exc:  # pragma: no cover - robustesse runtime
            import traceback
            logger.error("Erreur LLM Mistral : %s", exc)
            logger.error(traceback.format_exc())
            return self._empty_result(success=False, error=str(exc))

        # Circuit breaker ouvert -> le décorateur renvoie None
        if response is None:
            return self._empty_result(success=True, circuit_open=True)

        return self._normalize(response)

    # ----------------------------------------------------------------- helpers
    @staticmethod
    def _empty_result(success: bool, circuit_open: bool = False, error: Optional[str] = None) -> Dict[str, Any]:
        return {
            "success": success,
            "content": "",
            "tool_calls": None,
            "finish_reason": None,
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            "circuit_open": circuit_open,
            "error": error,
        }

    def _normalize(self, response) -> Dict[str, Any]:
        choice = response.choices[0]
        msg = choice.message

        usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        if getattr(response, "usage", None):
            usage = {
                "prompt_tokens": getattr(response.usage, "prompt_tokens", 0) or 0,
                "completion_tokens": getattr(response.usage, "completion_tokens", 0) or 0,
                "total_tokens": getattr(response.usage, "total_tokens", 0) or 0,
            }

        tool_calls = None
        if getattr(msg, "tool_calls", None):
            tool_calls = []
            for tc in msg.tool_calls:
                try:
                    arguments: Dict[str, Any] = {}
                    raw = getattr(tc.function, "arguments", None)
                    if raw:
                        try:
                            arguments = json.loads(raw) if isinstance(raw, str) else raw
                        except json.JSONDecodeError as exc:
                            logger.warning("Arguments tool_call non parsables : %s", exc)
                            arguments = {}
                    tool_calls.append({
                        "id": getattr(tc, "id", None),
                        "function": tc.function.name,
                        "arguments": arguments if isinstance(arguments, dict) else {},
                    })
                except Exception as exc:  # pragma: no cover
                    logger.error("tool_call ignoré (parsing) : %s", exc)
                    continue

        return {
            "success": True,
            "content": msg.content or "",
            "tool_calls": tool_calls,
            "finish_reason": choice.finish_reason,
            "usage": usage,
            "circuit_open": False,
            "error": None,
        }
