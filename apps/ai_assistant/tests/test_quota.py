"""
Tests de controle des quotas et budgets tokens :
- check_budget() bloque quand le budget est depasse
- check_budget() autorise quand dans les limites
- Integration avec QuotaService abonnement
"""
import pytest
from unittest.mock import patch, MagicMock


# ---------------------------------------------------------------------------
# 1. Token budget (token_monitor)
# ---------------------------------------------------------------------------

class TestTokenBudget:

    def test_check_budget_returns_allowed_when_no_usage(self):
        """Sans usage enregistre, le budget doit etre autorise."""
        from apps.ai_assistant.token_monitor import token_monitor

        with patch('apps.ai_assistant.token_monitor.cache') as mock_cache:
            mock_cache.get.return_value = 0  # No usage
            result = token_monitor.check_budget(organization_id=1)

        assert result['allowed'] is True
        assert 'reason' in result
        assert 'usage' in result

    def test_check_budget_blocks_when_hourly_exceeded(self):
        """Le budget horaire depasse doit bloquer la requete."""
        from apps.ai_assistant.token_monitor import token_monitor

        def mock_get(key, default=0):
            # Return hourly budget for hour key, 0 for daily key
            if 'hour' in key:
                return token_monitor.hourly_budget
            return 0

        with patch('apps.ai_assistant.token_monitor.cache') as mock_cache:
            mock_cache.get.side_effect = mock_get
            result = token_monitor.check_budget(organization_id=1)

        assert result['allowed'] is False
        assert 'horaire' in result['reason'].lower() or 'budget' in result['reason'].lower()

    def test_check_budget_blocks_when_daily_exceeded(self):
        """Le budget journalier depasse doit bloquer la requete."""
        from apps.ai_assistant.token_monitor import token_monitor

        def mock_get(key, default=0):
            # Return 0 for hourly, daily budget for daily key
            if 'day' in key:
                return token_monitor.daily_budget
            return 0

        with patch('apps.ai_assistant.token_monitor.cache') as mock_cache:
            mock_cache.get.side_effect = mock_get
            result = token_monitor.check_budget(organization_id=1)

        assert result['allowed'] is False
        assert 'journalier' in result['reason'].lower()

    def test_check_budget_returns_usage_values(self):
        """check_budget doit retourner les chiffres d'utilisation."""
        from apps.ai_assistant.token_monitor import token_monitor

        call_count = [0]
        def mock_get(key, default=0):
            call_count[0] += 1
            if 'hour' in key:
                return 5000
            return 50000

        with patch('apps.ai_assistant.token_monitor.cache') as mock_cache:
            mock_cache.get.side_effect = mock_get
            result = token_monitor.check_budget(organization_id=1)

        assert 'usage' in result
        assert result['usage']['hourly'] == 5000
        assert result['usage']['daily'] == 50000

    def test_check_budget_returns_dict_with_required_keys(self):
        """check_budget doit toujours retourner un dict avec 'allowed', 'reason', 'usage'."""
        from apps.ai_assistant.token_monitor import token_monitor

        with patch('apps.ai_assistant.token_monitor.cache') as mock_cache:
            mock_cache.get.return_value = 0
            result = token_monitor.check_budget(organization_id=99999)

        assert 'allowed' in result
        assert 'reason' in result
        assert 'usage' in result
        assert isinstance(result['allowed'], bool)

    def test_budget_thresholds_are_positive(self):
        """Les seuils de budget doivent etre positifs."""
        from apps.ai_assistant.token_monitor import token_monitor

        assert token_monitor.daily_budget > 0
        assert token_monitor.hourly_budget > 0
        assert token_monitor.hourly_budget < token_monitor.daily_budget


# ---------------------------------------------------------------------------
# 2. Quota abonnement (QuotaService)
# ---------------------------------------------------------------------------

class TestQuotaIntegration:

    def test_chat_view_checks_budget(self):
        """ChatView doit verifier le budget tokens."""
        from apps.ai_assistant.views import ChatView
        import inspect
        source = inspect.getsource(ChatView.post)
        assert 'check_budget' in source

    def test_chat_view_calls_quota_increment(self):
        """ChatView doit incrementer le quota apres succes."""
        from apps.ai_assistant.views import ChatView
        import inspect
        source = inspect.getsource(ChatView.post)
        assert 'increment_usage' in source

    def test_streaming_view_checks_budget(self):
        """StreamingChatView doit verifier le budget tokens."""
        from apps.ai_assistant.views import StreamingChatView
        import inspect
        source = inspect.getsource(StreamingChatView.post)
        assert 'check_budget' in source

    def test_chat_view_checks_quota_service(self):
        """ChatView doit verifier le QuotaService."""
        from apps.ai_assistant.views import ChatView
        import inspect
        source = inspect.getsource(ChatView.post)
        assert 'QuotaService' in source

    @pytest.mark.django_db
    def test_budget_exceeded_returns_429(self, client, user):
        """Un budget depasse doit retourner HTTP 429."""
        import json
        from django.contrib.auth import get_user_model
        User = get_user_model()

        client.force_login(user)

        with patch('apps.ai_assistant.views.token_monitor') as mock_monitor:
            mock_monitor.check_budget.return_value = {
                'allowed': False,
                'reason': 'Budget journalier atteint',
                'usage': {'hourly': 0, 'daily': 100000},
            }
            response = client.post(
                '/api/ai/chat/',
                data=json.dumps({'message': 'test'}),
                content_type='application/json',
            )

        assert response.status_code in [429, 402]
