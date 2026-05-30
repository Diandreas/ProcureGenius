"""
Tests de l'Orchestrator (flux à 2 appels LLM) avec provider et registry mockés.

Scénarios couverts (cf. plan) :
  (a) question simple sans tool      -> 1 seul appel, reply = contenu appel 1
  (b) récupération + synthèse        -> 2 appels, reply basé sur les données
  (c) création -> confirmation       -> pas de 2e appel, token de confirmation émis
  (d) visualisation -> chart extrait
  (e) circuit breaker sur l'appel 2  -> fallback déterministe
"""
import pytest
from asgiref.sync import async_to_sync

from apps.ai_assistant.services.orchestrator import Orchestrator


# --------------------------------------------------------------------- fakes
def _usage(t=10):
    return {"prompt_tokens": t, "completion_tokens": t, "total_tokens": t}


class FakeProvider:
    """Provider qui renvoie des réponses scriptées, une par appel `complete`."""
    def __init__(self, responses):
        self._responses = list(responses)
        self.calls = []

    def complete(self, messages, tools=None, tool_choice="auto", **kw):
        self.calls.append({"messages": messages, "tools": tools})
        if self._responses:
            return self._responses.pop(0)
        # défaut : réponse texte vide
        return {"success": True, "content": "", "tool_calls": None,
                "finish_reason": "stop", "usage": _usage(0), "circuit_open": False, "error": None}


class FakeRegistry:
    """Registry minimal : tools statiques + dispatch vers des handlers scriptés."""
    def __init__(self, results_by_name):
        self._results = results_by_name

    def to_mistral_tools(self):
        return [{"type": "function", "function": {"name": n, "description": n,
                 "parameters": {"type": "object", "properties": {}}}} for n in self._results]

    async def call(self, name, arguments, user_ctx):
        res = self._results.get(name)
        if callable(res):
            return res(arguments, user_ctx)
        return res or {"success": False, "error": "unknown"}


def _make_orchestrator(provider, registry):
    orch = Orchestrator(provider=provider, tool_registry=registry)
    # Neutraliser la dépendance au system prompt (évite MistralService/clé API).
    orch._system_prompt = lambda page: "SYSTEM"
    return orch


# ------------------------------------------------------------------- scenarios
def test_simple_reply_single_call():
    """(a) Aucun tool_call -> un seul appel LLM, reply = contenu."""
    provider = FakeProvider([
        {"success": True, "content": "Bonjour, voici un conseil.", "tool_calls": None,
         "finish_reason": "stop", "usage": _usage(12), "circuit_open": False, "error": None},
    ])
    orch = _make_orchestrator(provider, FakeRegistry({}))

    result = async_to_sync(orch.run)("Donne-moi un conseil", user_ctx={"organization": None})

    assert result.reply == "Bonjour, voici un conseil."
    assert len(provider.calls) == 1            # un seul appel
    assert result.tokens == 12


def test_retrieval_then_synthesis_two_calls():
    """(b) tool_call -> exécution -> 2e appel de synthèse basé sur les données."""
    provider = FakeProvider([
        # appel 1 : décide d'appeler search_invoice
        {"success": True, "content": "", "tool_calls": [
            {"id": "t1", "function": "search_invoice", "arguments": {"status": "overdue"}}],
         "finish_reason": "tool_calls", "usage": _usage(20), "circuit_open": False, "error": None},
        # appel 2 : synthèse
        {"success": True, "content": "Vous avez 3 factures impayées pour 4500€.", "tool_calls": None,
         "finish_reason": "stop", "usage": _usage(15), "circuit_open": False, "error": None},
    ])
    registry = FakeRegistry({
        "search_invoice": {"success": True, "message": "3 factures trouvées",
                            "data": {"count": 3, "total": 4500}},
    })
    orch = _make_orchestrator(provider, registry)

    result = async_to_sync(orch.run)("Mes impayés ?", user_ctx={"organization": None})

    assert len(provider.calls) == 2            # deux appels
    assert "impayées" in result.reply
    assert result.tokens == 35
    assert result.tool_results[0]["function"] == "search_invoice"


def test_creation_triggers_confirmation_no_second_call():
    """(c) Handler demande confirmation -> token émis, pas de 2e appel."""
    provider = FakeProvider([
        {"success": True, "content": "", "tool_calls": [
            {"id": "t1", "function": "create_client", "arguments": {"name": "Acme"}}],
         "finish_reason": "tool_calls", "usage": _usage(10), "circuit_open": False, "error": None},
    ])
    registry = FakeRegistry({
        "create_client": {"success": False, "needs_confirmation": True,
                          "entity_type": "client", "message": "Confirmez la création"},
    })
    orch = _make_orchestrator(provider, registry)

    result = async_to_sync(orch.run)("Crée un client Acme", user_ctx={"organization": None})

    assert len(provider.calls) == 1            # pas de 2e appel
    assert result.pending_action is not None
    assert result.pending_action["action"] == "create_client"
    assert any(o["choice"] == "force_create" for o in result.pending_action["options"])


def test_visualization_extracts_chart():
    """(d) Un résultat avec chart_type -> chart extrait dans result.charts."""
    provider = FakeProvider([
        {"success": True, "content": "", "tool_calls": [
            {"id": "t1", "function": "generate_visualization", "arguments": {}}],
         "finish_reason": "tool_calls", "usage": _usage(10), "circuit_open": False, "error": None},
        {"success": True, "content": "Voici l'évolution de vos ventes.", "tool_calls": None,
         "finish_reason": "stop", "usage": _usage(8), "circuit_open": False, "error": None},
    ])
    registry = FakeRegistry({
        "generate_visualization": {"success": True, "message": "Graphique généré",
            "data": {"chart_type": "line", "chart_title": "Ventes",
                     "chart_data": [{"x": 1, "y": 2}], "chart_config": {"color": "#000"}}},
    })
    orch = _make_orchestrator(provider, registry)

    result = async_to_sync(orch.run)("Montre l'évolution de mes ventes", user_ctx={"organization": None})

    assert len(result.charts) == 1
    assert result.charts[0]["chart_type"] == "line"
    assert "ventes" in result.reply.lower()


def test_synthesis_circuit_breaker_falls_back_to_deterministic():
    """(e) Appel 2 indisponible (circuit ouvert) -> résumé déterministe."""
    provider = FakeProvider([
        {"success": True, "content": "", "tool_calls": [
            {"id": "t1", "function": "search_invoice", "arguments": {}}],
         "finish_reason": "tool_calls", "usage": _usage(10), "circuit_open": False, "error": None},
        # appel 2 : circuit ouvert
        {"success": True, "content": "", "tool_calls": None,
         "finish_reason": None, "usage": _usage(0), "circuit_open": True, "error": None},
    ])
    registry = FakeRegistry({
        "search_invoice": {"success": True, "message": "5 factures trouvées", "data": {"count": 5}},
    })
    orch = _make_orchestrator(provider, registry)

    result = async_to_sync(orch.run)("Mes factures", user_ctx={"organization": None})

    assert len(provider.calls) == 2
    # Fallback déterministe : reprend le message du résultat d'outil.
    assert "5 factures trouvées" in result.reply
    assert result.success is True


def test_first_call_circuit_breaker_returns_fallback():
    """Robustesse : circuit ouvert dès l'appel 1 -> réponse fallback, aucun crash."""
    provider = FakeProvider([
        {"success": True, "content": "", "tool_calls": None,
         "finish_reason": None, "usage": _usage(0), "circuit_open": True, "error": None},
    ])
    orch = _make_orchestrator(provider, FakeRegistry({}))

    result = async_to_sync(orch.run)("Une question", user_ctx={"organization": None})

    assert result.reply  # message de repli non vide
    assert result.success is True


# --------------------------------------------------------------- confirmation
def test_run_confirmation_executes_action():
    """run_confirmation ré-exécute l'action avec les params fusionnés du choix."""
    from apps.ai_assistant.services.confirmation import build_creation_confirmation, issue_token

    executed = {}

    def handler(args, user_ctx):
        executed.update(args)
        return {"success": True, "message": "Client créé", "data": {"id": "42"}}

    registry = FakeRegistry({"create_client": handler})
    orch = _make_orchestrator(FakeProvider([]), registry)

    pending = build_creation_confirmation("create_client", {"name": "Acme"}, "client", similar=None)
    token = issue_token(pending)

    result = async_to_sync(orch.run_confirmation)(token, "force_create", user_ctx={"organization": None})

    assert result.success is True
    assert "créé" in result.reply.lower()
    assert executed.get("force_create") is True
    assert executed.get("name") == "Acme"


def test_run_confirmation_cancel():
    orch = _make_orchestrator(FakeProvider([]), FakeRegistry({}))
    from apps.ai_assistant.services.confirmation import build_creation_confirmation, issue_token
    token = issue_token(build_creation_confirmation("create_client", {"name": "X"}, "client"))

    result = async_to_sync(orch.run_confirmation)(token, "cancel", user_ctx={})
    assert result.success is True
    assert "annul" in result.reply.lower()
