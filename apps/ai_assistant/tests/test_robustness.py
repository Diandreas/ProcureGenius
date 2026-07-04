"""Tests des renforts de robustesse du module IA.

  - mémoire longue : digest déterministe des messages au-delà de la fenêtre ;
  - fallback multi-modèle du provider quand le modèle principal échoue.
"""
from unittest.mock import MagicMock, patch

import pytest

from apps.ai_assistant.services.orchestrator import _compress_history


# ── Mémoire longue (_compress_history) ───────────────────────────────────────

class TestCompressHistory:
    def _history(self, n):
        return [
            {"role": "user" if i % 2 == 0 else "assistant", "content": f"message {i}"}
            for i in range(n)
        ]

    def test_short_history_untouched(self):
        history = self._history(6)
        assert _compress_history(history) == history

    def test_long_history_gets_digest(self):
        history = self._history(20)
        result = _compress_history(history, max_recent=8)
        # 1 digest system + les 8 derniers messages intacts
        assert len(result) == 9
        assert result[0]["role"] == "system"
        assert "RAPPEL" in result[0]["content"]
        assert result[1:] == history[-8:]
        # Les faits anciens sont préservés dans le digest
        assert "message 0" in result[0]["content"]

    def test_digest_capped(self):
        history = [
            {"role": "user", "content": "x" * 500} for _ in range(50)
        ] + self._history(8)
        result = _compress_history(history, max_recent=8)
        assert len(result[0]["content"]) < 3000

    def test_empty_older_messages_skipped(self):
        history = [{"role": "user", "content": ""}] * 5 + self._history(8)
        result = _compress_history(history, max_recent=8)
        # Rien à résumer -> pas de digest
        assert result == history[-8:]


# ── Fallback multi-modèle (MistralProvider.complete) ─────────────────────────

class TestProviderFallback:
    def _provider(self, client):
        with patch("apps.ai_assistant.services.llm.provider._build_client", return_value=client):
            from apps.ai_assistant.services.llm.provider import MistralProvider
            return MistralProvider(api_key="test-key", model="mistral-large-latest")

    def _response(self, text):
        msg = MagicMock(content=text, tool_calls=None)
        choice = MagicMock(message=msg, finish_reason="stop")
        usage = MagicMock(prompt_tokens=10, completion_tokens=5, total_tokens=15)
        return MagicMock(choices=[choice], usage=usage)

    @patch("apps.ai_assistant.resilience._record_failure", return_value=False)
    @patch("apps.ai_assistant.resilience._check_circuit_breaker", return_value=True)
    def test_fallback_model_used_on_failure(self, _cb, _rf):
        client = MagicMock()
        calls = []

        def fake_complete(**kwargs):
            calls.append(kwargs["model"])
            if kwargs["model"] == "mistral-large-latest":
                raise RuntimeError("model down")  # non-retriable -> raise direct
            return self._response("réponse de secours")

        client.chat.complete.side_effect = fake_complete
        provider = self._provider(client)

        result = provider.complete([{"role": "user", "content": "bonjour"}])

        assert result["success"] is True
        assert result["content"] == "réponse de secours"
        assert calls[0] == "mistral-large-latest"
        assert calls[-1] == "mistral-small-latest"

    @patch("apps.ai_assistant.resilience._record_failure", return_value=False)
    @patch("apps.ai_assistant.resilience._check_circuit_breaker", return_value=True)
    def test_error_returned_if_fallback_also_fails(self, _cb, _rf):
        client = MagicMock()
        client.chat.complete.side_effect = RuntimeError("all down")
        provider = self._provider(client)

        result = provider.complete([{"role": "user", "content": "bonjour"}])

        assert result["success"] is False
        assert result["error"]


# ── Feedback sur les réponses IA (MessageFeedbackView) ───────────────────────

@pytest.mark.django_db
class TestMessageFeedback:
    def _setup_message(self, user, role='assistant'):
        from apps.ai_assistant.models import Conversation, Message
        conv = Conversation.objects.create(
            user=user, organization=getattr(user, 'organization', None), title="Test",
        )
        return Message.objects.create(conversation=conv, role=role, content="Réponse IA")

    def _url(self, message):
        return f'/api/v1/ai/messages/{message.id}/feedback/'

    def test_post_creates_feedback(self, client, user):
        from apps.ai_assistant.models import MessageFeedback
        client.force_login(user)
        msg = self._setup_message(user)

        resp = client.post(self._url(msg), data={'rating': 1}, content_type='application/json')
        assert resp.status_code == 200
        fb = MessageFeedback.objects.get(message=msg, user=user)
        assert fb.rating == 1

    def test_post_updates_existing_feedback(self, client, user):
        from apps.ai_assistant.models import MessageFeedback
        client.force_login(user)
        msg = self._setup_message(user)
        client.post(self._url(msg), data={'rating': 1}, content_type='application/json')
        client.post(self._url(msg), data={'rating': -1, 'comment': 'chiffres faux'},
                    content_type='application/json')

        assert MessageFeedback.objects.filter(message=msg).count() == 1
        fb = MessageFeedback.objects.get(message=msg)
        assert fb.rating == -1
        assert fb.comment == 'chiffres faux'

    def test_user_message_rejected(self, client, user):
        client.force_login(user)
        msg = self._setup_message(user, role='user')
        resp = client.post(self._url(msg), data={'rating': 1}, content_type='application/json')
        assert resp.status_code == 400

    def test_other_users_message_not_found(self, client, user, organization):
        from apps.accounts.models import User
        other = User.objects.create_user(
            username="otheruser", email="other@example.com",
            password="testpass123", organization=organization,
        )
        other_msg = self._setup_message(other)

        client.force_login(user)
        resp = client.post(self._url(other_msg), data={'rating': 1}, content_type='application/json')
        assert resp.status_code == 404

    def test_delete_removes_feedback(self, client, user):
        from apps.ai_assistant.models import MessageFeedback
        client.force_login(user)
        msg = self._setup_message(user)
        client.post(self._url(msg), data={'rating': 1}, content_type='application/json')

        resp = client.delete(self._url(msg))
        assert resp.status_code == 204
        assert not MessageFeedback.objects.filter(message=msg).exists()

    def test_invalid_rating_rejected(self, client, user):
        client.force_login(user)
        msg = self._setup_message(user)
        resp = client.post(self._url(msg), data={'rating': 5}, content_type='application/json')
        assert resp.status_code == 400
