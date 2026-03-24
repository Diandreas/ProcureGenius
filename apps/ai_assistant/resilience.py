"""
Resilience pour les appels API Mistral.
Retry avec backoff exponentiel + circuit breaker simple.
"""
import time
import random
import logging
import functools
from django.core.cache import cache

logger = logging.getLogger(__name__)

# Exceptions Mistral retriables
RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}

FALLBACK_RESPONSE_FR = (
    "Je suis momentanement indisponible. "
    "Veuillez reessayer dans quelques instants."
)

# Circuit breaker keys
_CB_FAILURES_KEY = 'ai_circuit_breaker_failures'
_CB_OPEN_UNTIL_KEY = 'ai_circuit_breaker_open_until'
_CB_MAX_FAILURES = 5
_CB_OPEN_DURATION = 30  # secondes
_CB_WINDOW = 300  # 5 minutes


def _is_retryable(exception):
    """Determine si une exception Mistral est retriable."""
    # SDKError de Mistral
    status_code = getattr(exception, 'status_code', None)
    if status_code and status_code in RETRYABLE_STATUS_CODES:
        return True

    # Erreurs reseau
    exc_name = type(exception).__name__
    if exc_name in ('ConnectionError', 'TimeoutError', 'ReadTimeout', 'ConnectTimeout'):
        return True

    # HTTPStatusError (httpx)
    response = getattr(exception, 'response', None)
    if response and hasattr(response, 'status_code'):
        if response.status_code in RETRYABLE_STATUS_CODES:
            return True

    return False


def _check_circuit_breaker():
    """Verifie si le circuit breaker est ouvert."""
    open_until = cache.get(_CB_OPEN_UNTIL_KEY)
    if open_until and time.time() < open_until:
        return False  # Circuit ouvert, pas autorise
    return True  # Circuit ferme, autorise


def _record_failure():
    """Enregistre un echec pour le circuit breaker."""
    now = time.time()
    failures = cache.get(_CB_FAILURES_KEY, [])

    # Garder seulement les echecs dans la fenetre
    failures = [t for t in failures if t > now - _CB_WINDOW]
    failures.append(now)
    cache.set(_CB_FAILURES_KEY, failures, _CB_WINDOW)

    if len(failures) >= _CB_MAX_FAILURES:
        # Ouvrir le circuit
        cache.set(_CB_OPEN_UNTIL_KEY, now + _CB_OPEN_DURATION, _CB_OPEN_DURATION + 10)
        logger.critical(
            f"Circuit breaker OPEN: {len(failures)} failures in {_CB_WINDOW}s. "
            f"Blocking for {_CB_OPEN_DURATION}s."
        )
        return True  # Circuit vient de s'ouvrir
    return False


def _record_success():
    """Reset le compteur d'echecs apres un succes."""
    cache.delete(_CB_FAILURES_KEY)


def retry_with_backoff(max_retries=3, base_delay=1.0, max_delay=10.0):
    """
    Decorateur pour retry avec backoff exponentiel et circuit breaker.

    Usage:
        @retry_with_backoff(max_retries=3)
        def call_mistral(...):
            return client.chat.complete(...)
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Verifier circuit breaker
            if not _check_circuit_breaker():
                logger.warning("Circuit breaker is OPEN, returning fallback")
                return None  # L'appelant doit gerer le None comme fallback

            last_exception = None
            for attempt in range(max_retries + 1):
                try:
                    result = func(*args, **kwargs)
                    _record_success()
                    return result
                except Exception as e:
                    last_exception = e
                    if not _is_retryable(e):
                        logger.error(f"Non-retryable error: {type(e).__name__}: {e}")
                        raise

                    if attempt < max_retries:
                        delay = min(base_delay * (2 ** attempt), max_delay)
                        jitter = random.uniform(0, delay * 0.3)
                        wait_time = delay + jitter
                        logger.warning(
                            f"Retryable error (attempt {attempt + 1}/{max_retries + 1}): "
                            f"{type(e).__name__}. Retrying in {wait_time:.1f}s"
                        )
                        time.sleep(wait_time)
                    else:
                        logger.error(
                            f"All {max_retries + 1} attempts failed: {type(e).__name__}: {e}"
                        )
                        circuit_opened = _record_failure()
                        if circuit_opened:
                            return None  # Fallback
                        raise

            raise last_exception

        return wrapper
    return decorator


def retry_with_backoff_async(max_retries=3, base_delay=1.0, max_delay=10.0):
    """Version async du decorateur retry."""
    import asyncio

    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            if not _check_circuit_breaker():
                logger.warning("Circuit breaker is OPEN, returning fallback")
                return None

            last_exception = None
            for attempt in range(max_retries + 1):
                try:
                    result = await func(*args, **kwargs)
                    _record_success()
                    return result
                except Exception as e:
                    last_exception = e
                    if not _is_retryable(e):
                        logger.error(f"Non-retryable error: {type(e).__name__}: {e}")
                        raise

                    if attempt < max_retries:
                        delay = min(base_delay * (2 ** attempt), max_delay)
                        jitter = random.uniform(0, delay * 0.3)
                        wait_time = delay + jitter
                        logger.warning(
                            f"Retryable error (attempt {attempt + 1}/{max_retries + 1}): "
                            f"{type(e).__name__}. Retrying in {wait_time:.1f}s"
                        )
                        await asyncio.sleep(wait_time)
                    else:
                        logger.error(
                            f"All {max_retries + 1} attempts failed: {type(e).__name__}: {e}"
                        )
                        circuit_opened = _record_failure()
                        if circuit_opened:
                            return None
                        raise

            raise last_exception

        return wrapper
    return decorator
