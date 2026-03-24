"""
Tests de resilience du module IA :
- Retry avec backoff exponentiel
- Circuit breaker (module-level, Redis-based)
- Degradation gracieuse (fallback)
"""
import time
import pytest
from unittest.mock import patch, MagicMock
from apps.ai_assistant.resilience import (
    retry_with_backoff,
    _record_failure,
    _record_success,
    _check_circuit_breaker,
    _is_retryable,
    _CB_FAILURES_KEY,
    _CB_OPEN_UNTIL_KEY,
    _CB_MAX_FAILURES,
    FALLBACK_RESPONSE_FR,
)


# ---------------------------------------------------------------------------
# 1. Retry avec backoff exponentiel
# ---------------------------------------------------------------------------

class TestRetryWithBackoff:

    def test_success_first_try(self):
        """Une fonction qui reussit au premier essai ne doit pas etre retentee."""
        call_count = 0

        @retry_with_backoff(max_retries=3, base_delay=0)
        def always_succeeds():
            nonlocal call_count
            call_count += 1
            return "ok"

        with patch('apps.ai_assistant.resilience._check_circuit_breaker', return_value=True):
            result = always_succeeds()

        assert result == "ok"
        assert call_count == 1

    def test_retries_on_connection_error(self):
        """La fonction doit etre retentee apres une ConnectionError."""
        call_count = 0

        @retry_with_backoff(max_retries=3, base_delay=0)
        def fails_twice():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ConnectionError("Network error")
            return "recovered"

        with patch('apps.ai_assistant.resilience._check_circuit_breaker', return_value=True), \
             patch('apps.ai_assistant.resilience._record_success'), \
             patch('apps.ai_assistant.resilience._record_failure', return_value=False), \
             patch('time.sleep'):
            result = fails_twice()

        assert result == "recovered"
        assert call_count == 3

    def test_raises_after_max_retries(self):
        """Apres max_retries tentatives, l'exception doit etre propagee."""
        call_count = 0

        @retry_with_backoff(max_retries=2, base_delay=0)
        def always_fails():
            nonlocal call_count
            call_count += 1
            raise ConnectionError("Always fails")

        with patch('apps.ai_assistant.resilience._check_circuit_breaker', return_value=True), \
             patch('apps.ai_assistant.resilience._record_failure', return_value=False), \
             patch('time.sleep'):
            with pytest.raises(ConnectionError):
                always_fails()

        assert call_count == 3  # 1 initial + 2 retries

    def test_no_retry_on_non_retriable(self):
        """Une erreur non retriable (ex: ValueError) ne doit pas etre retentee."""
        call_count = 0

        @retry_with_backoff(max_retries=3, base_delay=0)
        def raises_value_error():
            nonlocal call_count
            call_count += 1
            raise ValueError("Not retryable")

        with patch('apps.ai_assistant.resilience._check_circuit_breaker', return_value=True):
            with pytest.raises(ValueError):
                raises_value_error()

        assert call_count == 1

    def test_returns_none_when_circuit_open(self):
        """Quand le circuit est ouvert, la fonction doit retourner None."""
        @retry_with_backoff(max_retries=3, base_delay=0)
        def my_func():
            return "should not be called"

        with patch('apps.ai_assistant.resilience._check_circuit_breaker', return_value=False):
            result = my_func()

        assert result is None

    def test_fallback_response_defined(self):
        """FALLBACK_RESPONSE_FR doit etre une chaine non vide."""
        assert isinstance(FALLBACK_RESPONSE_FR, str)
        assert len(FALLBACK_RESPONSE_FR) > 10


# ---------------------------------------------------------------------------
# 2. is_retryable
# ---------------------------------------------------------------------------

class TestIsRetryable:

    def test_connection_error_is_retryable(self):
        assert _is_retryable(ConnectionError("network down"))

    def test_timeout_error_is_retryable(self):
        assert _is_retryable(TimeoutError("timeout"))

    def test_value_error_is_not_retryable(self):
        assert not _is_retryable(ValueError("bad input"))

    def test_http_429_is_retryable(self):
        err = Exception("rate limited")
        err.status_code = 429
        assert _is_retryable(err)

    def test_http_500_is_retryable(self):
        err = Exception("server error")
        err.status_code = 500
        assert _is_retryable(err)

    def test_http_400_is_not_retryable(self):
        err = Exception("bad request")
        err.status_code = 400
        assert not _is_retryable(err)

    def test_http_401_is_not_retryable(self):
        err = Exception("unauthorized")
        err.status_code = 401
        assert not _is_retryable(err)


# ---------------------------------------------------------------------------
# 3. Circuit breaker
# ---------------------------------------------------------------------------

class TestCircuitBreaker:

    def test_circuit_closed_initially(self):
        """Sans echecs, le circuit doit etre ferme (autorise)."""
        with patch('apps.ai_assistant.resilience.cache') as mock_cache:
            mock_cache.get.return_value = None  # No open_until timestamp
            assert _check_circuit_breaker() is True

    def test_circuit_open_when_open_until_in_future(self):
        """Si open_until est dans le futur, le circuit doit etre ouvert."""
        with patch('apps.ai_assistant.resilience.cache') as mock_cache:
            mock_cache.get.return_value = time.time() + 999  # In the future
            assert _check_circuit_breaker() is False

    def test_circuit_closed_when_open_until_expired(self):
        """Si open_until est dans le passe, le circuit doit etre ferme."""
        with patch('apps.ai_assistant.resilience.cache') as mock_cache:
            mock_cache.get.return_value = time.time() - 1  # In the past
            assert _check_circuit_breaker() is True

    def test_record_failure_opens_circuit_at_threshold(self):
        """Apres _CB_MAX_FAILURES echecs, le circuit doit s'ouvrir."""
        now = time.time()
        # Simulate failures already at threshold
        existing_failures = [now] * (_CB_MAX_FAILURES - 1)

        with patch('apps.ai_assistant.resilience.cache') as mock_cache:
            mock_cache.get.side_effect = lambda key, default=None: (
                existing_failures if key == _CB_FAILURES_KEY else default
            )
            opened = _record_failure()

        # The circuit should have opened
        assert opened is True
        mock_cache.set.assert_called()

    def test_record_success_resets_failures(self):
        """record_success doit supprimer le compteur d'echecs."""
        with patch('apps.ai_assistant.resilience.cache') as mock_cache:
            _record_success()
            mock_cache.delete.assert_called_with(_CB_FAILURES_KEY)


# ---------------------------------------------------------------------------
# 4. Degradation gracieuse
# ---------------------------------------------------------------------------

class TestGracefulDegradation:

    def test_fallback_response_is_french(self):
        """La reponse de fallback doit mentionner l'indisponibilite en francais."""
        assert any(
            word in FALLBACK_RESPONSE_FR.lower()
            for word in ['indisponible', 'reessayer', 'instants', 'disponible']
        )

    def test_chat_stream_yields_error_chunk_on_exception(self):
        """chat_stream doit yielder un chunk 'error' si Mistral est indisponible."""
        from apps.ai_assistant._services_core import MistralService

        service = MistralService.__new__(MistralService)
        service.model = 'mistral-large-latest'

        # Simulate client raising exception on stream
        service.client = MagicMock()
        service.client.chat.stream.side_effect = ConnectionError("Network down")

        with patch.object(service, 'create_system_prompt', return_value="test prompt"), \
             patch('apps.ai_assistant._services_core.cache'):
            chunks = list(service.chat_stream(message="test"))

        error_chunks = [c for c in chunks if c['type'] == 'error']
        assert len(error_chunks) == 1
