"""
Tests d'intégration de ChatStreamView (POST /api/v1/ai/chat/stream/).

Le provider LLM est scripté (aucun appel réseau). On vérifie :
- l'authentification et la validation d'entrée,
- le framing SSE (data: {...}\n\n) et la séquence d'événements,
- l'événement terminal 'done' (contrat unifié identique à ChatView),
- la persistance des messages + de la trace agent (metadata.agent_steps).
"""
import json
import pytest
from unittest.mock import patch

from apps.ai_assistant.services.orchestrator import Orchestrator


URL = '/api/v1/ai/chat/stream/'


def _usage(t=10):
    return {"prompt_tokens": t, "completion_tokens": t, "total_tokens": t}


def _final(content="", tool_calls=None, tokens=10):
    return {
        "type": "final", "success": True, "content": content,
        "tool_calls": tool_calls, "finish_reason": "tool_calls" if tool_calls else "stop",
        "usage": _usage(tokens), "circuit_open": False, "error": None,
    }


class _ScriptedStreamProvider:
    def __init__(self, scripts):
        self._scripts = list(scripts)

    def stream(self, messages, tools=None, tool_choice="auto", **kw):
        script = self._scripts.pop(0) if self._scripts else [_final("", tokens=0)]
        yield from script


class _FakeRegistry:
    def __init__(self, results_by_name):
        self._results = results_by_name

    def to_mistral_tools(self):
        return [{"type": "function", "function": {"name": n, "description": n,
                 "parameters": {"type": "object", "properties": {}}}} for n in self._results]

    async def call(self, name, arguments, user_ctx):
        return self._results.get(name) or {"success": False, "error": "unknown"}


def patch_stream_orchestrator(scripts, registry_results=None):
    provider = _ScriptedStreamProvider(scripts)
    orch = Orchestrator(provider=provider, tool_registry=_FakeRegistry(registry_results or {}))
    orch._system_prompt = lambda page: "SYSTEM"
    return patch('apps.ai_assistant.services.get_orchestrator', return_value=orch)


def _read_events(response):
    """Consomme le flux SSE et parse chaque bloc 'data: {...}'."""
    body = b"".join(response.streaming_content).decode('utf-8')
    events = []
    for block in body.split('\n\n'):
        lines = [l[6:] for l in block.split('\n') if l.startswith('data: ')]
        if lines:
            events.append(json.loads('\n'.join(lines)))
    return events


@pytest.mark.django_db
class TestChatStreamView:

    def test_unauthenticated_returns_401(self, client):
        response = client.post(URL, data=json.dumps({'message': 'hello'}),
                               content_type='application/json')
        assert response.status_code in [401, 403]

    def test_missing_message_returns_400(self, client, user):
        client.force_login(user)
        response = client.post(URL, data=json.dumps({}),
                               content_type='application/json')
        assert response.status_code == 400

    def test_simple_text_stream(self, client, user):
        """Texte simple : text_delta puis done avec le contrat unifié."""
        client.force_login(user)
        scripts = [[
            {"type": "delta", "content": "Bonjour, "},
            {"type": "delta", "content": "ravi de vous aider."},
            _final("Bonjour, ravi de vous aider.", tokens=9),
        ]]

        with patch_stream_orchestrator(scripts):
            response = client.post(URL, data=json.dumps({'message': 'Salut'}),
                                   content_type='application/json')

        assert response.status_code == 200
        assert response['Content-Type'].startswith('text/event-stream')

        events = _read_events(response)
        types = [e['type'] for e in events]
        assert types[0] == 'status'
        assert 'text_delta' in types
        assert types[-1] == 'done'

        done = events[-1]
        assert done['reply'] == "Bonjour, ravi de vous aider."
        assert done['conversation_id']
        assert done['message']['role'] == 'assistant'

    def test_agentic_stream_persists_steps(self, client, user):
        """Boucle agentique : étapes émises en SSE et persistées en metadata."""
        from apps.ai_assistant.models import Conversation, Message

        client.force_login(user)
        scripts = [
            # Appel 1 : narration + outil
            [{"type": "delta", "content": "Je consulte vos factures."},
             _final("Je consulte vos factures.", tool_calls=[
                 {"id": "tc1", "function": "search_invoice", "arguments": {},
                  "arguments_json": "{}"}])],
            # Appel 2 : synthèse
            [{"type": "delta", "content": "Vous avez 2 factures en retard."},
             _final("Vous avez 2 factures en retard.")],
        ]
        registry_results = {
            "search_invoice": {"success": True, "message": "2 factures trouvées",
                               "data": {"count": 2}},
        }

        with patch_stream_orchestrator(scripts, registry_results):
            response = client.post(URL, data=json.dumps({'message': 'Mes retards ?'}),
                                   content_type='application/json')

        events = _read_events(response)
        types = [e['type'] for e in events]
        assert 'thought' in types
        assert 'tool_start' in types
        assert 'tool_result' in types

        done = events[-1]
        assert done['type'] == 'done'
        assert done['reply'] == "Vous avez 2 factures en retard."
        assert [s['kind'] for s in done['agent_steps']] == ['thought', 'tool']

        # Persistance : user + assistant, trace agent dans metadata.
        conversation = Conversation.objects.get(id=done['conversation_id'])
        messages = list(Message.objects.filter(conversation=conversation).order_by('created_at'))
        assert [m.role for m in messages] == ['user', 'assistant']
        assert messages[1].content == "Vous avez 2 factures en retard."
        assert [s['kind'] for s in messages[1].metadata['agent_steps']] == ['thought', 'tool']
        assert messages[1].metadata['action_results'][0]['function'] == 'search_invoice'

    def test_tokens_are_recorded_for_budget_tracking(self, client, user):
        """Les tokens consommés alimentent token_monitor (sinon check_budget
        lirait des compteurs jamais incrémentés -> limite de budget morte)."""
        client.force_login(user)
        scripts = [[
            {"type": "delta", "content": "Bonjour."},
            _final("Bonjour.", tokens=123),
        ]]

        with patch_stream_orchestrator(scripts), \
                patch('apps.ai_assistant.views.token_monitor.track_usage') as track:
            response = client.post(URL, data=json.dumps({'message': 'Salut'}),
                                   content_type='application/json')
            # Consommer le flux : le générateur enregistre l'usage à la fin.
            _read_events(response)

        assert track.called
        kwargs = track.call_args.kwargs
        assert kwargs['tokens_used'] == 123
        assert kwargs['organization_id'] == user.organization.id

    def test_orchestrator_crash_emits_error_event(self, client, user):
        """Une exception pendant le flux émet un événement 'error' (pas de 500 brut)."""
        client.force_login(user)

        orch = Orchestrator(provider=None, tool_registry=None)

        def boom(*a, **kw):
            raise RuntimeError("boom")
            yield  # pragma: no cover

        orch.run_stream = boom

        with patch('apps.ai_assistant.services.get_orchestrator', return_value=orch):
            response = client.post(URL, data=json.dumps({'message': 'Salut'}),
                                   content_type='application/json')

        assert response.status_code == 200
        events = _read_events(response)
        assert events[-1]['type'] == 'error'
        assert events[-1]['message']
