"""
Tests de la boucle agentique streamée (Orchestrator.run_stream) avec provider
et registry mockés.

Scénarios couverts :
  (a) réponse texte simple          -> deltas streamés puis final, aucun outil
  (b) chaînage narration + outils   -> thought / tool_start / tool_result émis,
                                       messages renvoyés au LLM au format natif
                                       (assistant tool_calls + role='tool')
  (c) chart produit                 -> événement 'chart' + final.charts
  (d) confirmation requise          -> final.pending_action, boucle suspendue
  (e) épuisement AGENT_MAX_STEPS    -> repli déterministe
  (f) circuit breaker dès l'appel 1 -> réponse fallback
"""
import pytest

from apps.ai_assistant.services.orchestrator import AGENT_MAX_STEPS, Orchestrator


# --------------------------------------------------------------------- fakes
def _usage(t=10):
    return {"prompt_tokens": t, "completion_tokens": t, "total_tokens": t}


def _final(content="", tool_calls=None, tokens=10, circuit_open=False, success=True):
    return {
        "type": "final", "success": success, "content": content,
        "tool_calls": tool_calls, "finish_reason": "tool_calls" if tool_calls else "stop",
        "usage": _usage(tokens), "circuit_open": circuit_open, "error": None,
    }


class FakeStreamProvider:
    """Provider scripté : chaque élément de `scripts` est la liste d'événements
    d'UN appel stream() (deltas puis final)."""

    def __init__(self, scripts):
        self._scripts = list(scripts)
        self.calls = []

    def stream(self, messages, tools=None, tool_choice="auto", **kw):
        # Copie défensive : l'orchestrateur mute `messages` entre les appels.
        self.calls.append({"messages": [dict(m) for m in messages], "tools": tools})
        script = self._scripts.pop(0) if self._scripts else [_final("", tokens=0)]
        yield from script


class FakeRegistry:
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
    orch._system_prompt = lambda page: "SYSTEM"
    return orch


def _run(orch, message="Question", **kw):
    events = list(orch.run_stream(message, user_ctx={"organization": None}, **kw))
    assert events[-1]["type"] == "final", "le flux doit TOUJOURS se terminer par 'final'"
    return events, events[-1]


def _types(events):
    return [e["type"] for e in events]


# ------------------------------------------------------------------- scenarios
def test_simple_text_streams_deltas_then_final():
    """(a) Pas d'outil : les deltas sont relayés et le final porte la réponse."""
    provider = FakeStreamProvider([
        [{"type": "delta", "content": "Bonjour, "},
         {"type": "delta", "content": "voici un conseil."},
         _final("Bonjour, voici un conseil.", tokens=12)],
    ])
    orch = _make_orchestrator(provider, FakeRegistry({}))

    events, final = _run(orch)

    deltas = [e["content"] for e in events if e["type"] == "text_delta"]
    assert "".join(deltas) == "Bonjour, voici un conseil."
    assert final["reply"] == "Bonjour, voici un conseil."
    assert final["tokens"] == 12
    assert final["steps"] == []
    assert len(provider.calls) == 1


def test_agent_chain_emits_steps_and_native_tool_messages():
    """(b) Narration -> outil -> synthèse : événements et chaînage natif corrects."""
    provider = FakeStreamProvider([
        # Appel 1 : narration + tool_call
        [{"type": "delta", "content": "Je recherche vos factures."},
         _final("Je recherche vos factures.", tool_calls=[
             {"id": "tc1", "function": "search_invoice",
              "arguments": {"status": "overdue"}, "arguments_json": '{"status": "overdue"}'}],
             tokens=20)],
        # Appel 2 : synthèse finale
        [{"type": "delta", "content": "Vous avez 3 factures impayées."},
         _final("Vous avez 3 factures impayées.", tokens=15)],
    ])
    registry = FakeRegistry({
        "search_invoice": {"success": True, "message": "3 factures trouvées",
                           "data": {"count": 3}},
    })
    orch = _make_orchestrator(provider, registry)

    events, final = _run(orch, "Mes impayés ?")

    types = _types(events)
    # La narration streamée est requalifiée en 'thought' quand des outils suivent.
    assert "thought" in types
    assert types.index("thought") < types.index("tool_start") < types.index("tool_result")

    tool_start = next(e for e in events if e["type"] == "tool_start")
    assert tool_start["name"] == "search_invoice"
    assert tool_start["label"]  # libellé humain non vide

    tool_result = next(e for e in events if e["type"] == "tool_result")
    assert tool_result["success"] is True
    assert "3 factures" in tool_result["summary"]

    # Chaînage : le 2e appel reçoit le message assistant (tool_calls) + role='tool'.
    second_call_messages = provider.calls[1]["messages"]
    assistant_msg = next(m for m in second_call_messages if m.get("tool_calls"))
    assert assistant_msg["tool_calls"][0]["function"]["name"] == "search_invoice"
    assert assistant_msg["tool_calls"][0]["function"]["arguments"] == '{"status": "overdue"}'
    tool_msg = next(m for m in second_call_messages if m.get("role") == "tool")
    assert tool_msg["tool_call_id"] == "tc1"
    assert "3 factures trouvées" in tool_msg["content"]

    assert final["reply"] == "Vous avez 3 factures impayées."
    assert final["tokens"] == 35
    # Trace persistable : narration + outil.
    kinds = [s["kind"] for s in final["steps"]]
    assert kinds == ["thought", "tool"]


def test_chart_event_emitted_and_collected():
    """(c) Un outil produisant un graphique émet 'chart' et remplit final.charts."""
    provider = FakeStreamProvider([
        [_final("", tool_calls=[
            {"id": "tc1", "function": "generate_visualization", "arguments": {}}])],
        [{"type": "delta", "content": "Voici vos ventes."},
         _final("Voici vos ventes.")],
    ])
    registry = FakeRegistry({
        "generate_visualization": {"success": True, "message": "Graphique généré",
            "data": {"chart_type": "pie", "chart_title": "Ventes",
                     "chart_data": [{"x": 1}], "chart_config": {}}},
    })
    orch = _make_orchestrator(provider, registry)

    events, final = _run(orch, "Camembert de mes ventes")

    chart_events = [e for e in events if e["type"] == "chart"]
    assert len(chart_events) == 1
    assert chart_events[0]["chart"]["chart_type"] == "pie"
    assert final["charts"][0]["chart_type"] == "pie"


def test_confirmation_suspends_loop():
    """(d) needs_confirmation -> final.pending_action, pas d'appel LLM suivant."""
    provider = FakeStreamProvider([
        [_final("", tool_calls=[
            {"id": "tc1", "function": "create_client", "arguments": {"name": "Acme"}}])],
    ])
    registry = FakeRegistry({
        "create_client": {"success": False, "needs_confirmation": True,
                          "entity_type": "client", "message": "Confirmez la création"},
    })
    orch = _make_orchestrator(provider, registry)

    events, final = _run(orch, "Crée un client Acme")

    assert len(provider.calls) == 1
    assert final["pending_action"] is not None
    assert final["pending_action"]["action"] == "create_client"
    assert final["reply"]  # résumé de la confirmation non vide


def test_max_steps_falls_back_to_deterministic_summary():
    """(e) Le modèle boucle sur des outils : la dernière itération force la synthèse
    (pas d'outils) et un script vide produit le repli déterministe."""
    looping_call = [_final("", tool_calls=[
        {"id": "tcX", "function": "search_invoice", "arguments": {}}])]
    provider = FakeStreamProvider([looping_call] * (AGENT_MAX_STEPS - 1)
                                  + [[_final("", tokens=0)]])
    registry = FakeRegistry({
        "search_invoice": {"success": True, "message": "5 factures trouvées", "data": {}},
    })
    orch = _make_orchestrator(provider, registry)

    events, final = _run(orch, "Mes factures")

    assert len(provider.calls) == AGENT_MAX_STEPS
    # Dernière itération : outils désactivés (synthèse forcée).
    assert provider.calls[-1]["tools"] is None
    # Réponse de repli déterministe basée sur les résultats d'outils.
    assert "5 factures trouvées" in final["reply"]


def test_circuit_breaker_on_first_call_yields_fallback():
    """(f) Circuit ouvert dès le 1er appel -> réponse fallback, flux clos proprement."""
    provider = FakeStreamProvider([
        [_final("", tokens=0, circuit_open=True)],
    ])
    orch = _make_orchestrator(provider, FakeRegistry({}))

    events, final = _run(orch, "Une question")

    assert final["reply"]
    assert final["success"] is True
    assert len(provider.calls) == 1


def test_per_request_token_cap_forces_synthesis():
    """(g) Plafond de tokens par requête atteint -> l'itération suivante force la
    synthèse (tools=None) au lieu de continuer à appeler des outils."""
    from django.test import override_settings

    # Étape 1 : narration + outil, coûte 20 tokens (> plafond 15).
    # Étape 2 : doit être appelée SANS outils (synthèse forcée) -> réponse finale.
    provider = FakeStreamProvider([
        [_final("Je cherche.", tool_calls=[
            {"id": "tc1", "function": "search_invoice", "arguments": {}}], tokens=20)],
        [{"type": "delta", "content": "Réponse finale après plafond."},
         _final("Réponse finale après plafond.", tokens=5)],
    ])
    registry = FakeRegistry({
        "search_invoice": {"success": True, "message": "ok", "data": {}},
    })
    orch = _make_orchestrator(provider, registry)

    with override_settings(AI_MAX_REQUEST_TOKENS=15):
        events, final = _run(orch, "Mes factures")

    # Deux appels LLM : le 2e a les outils désactivés (plafond atteint).
    assert len(provider.calls) == 2
    assert provider.calls[0]["tools"] is not None
    assert provider.calls[1]["tools"] is None
    # Un statut de finalisation a été émis quand le plafond a été franchi.
    assert any(e["type"] == "status" and "Finalisation" in e["message"] for e in events)
    assert final["reply"] == "Réponse finale après plafond."
