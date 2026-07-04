"""Tests du durcissement de l'authentification (Phase 2).

  - throttling anti brute-force sur login/register ;
  - politique de mot de passe (validate_password) sur register/reset/change ;
  - endpoint /api/v1/health/.

Le cache est forcé en LocMem (isolé, sans dépendance Redis) et vidé entre les
tests pour que les compteurs de throttle repartent de zéro.
"""
import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts.models import Organization, CustomUser

@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api():
    return APIClient()


# ── Throttling ───────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestAuthThrottling:
    def test_login_throttled_after_limit(self, api):
        # auth_login = 10/minute : la 11e tentative doit être bloquée (429).
        codes = []
        for _ in range(12):
            r = api.post('/api/v1/auth/token/', {'username': 'x@y.z', 'password': 'wrong'})
            codes.append(r.status_code)
        assert 429 in codes, f"attendu un 429 après 10 tentatives, obtenu {codes}"
        assert codes[-1] == 429

    def test_register_throttled_after_limit(self, api):
        # auth_register = 10/hour.
        codes = []
        for i in range(12):
            r = api.post('/api/v1/auth/register/', {
                'email': f'user{i}@example.com', 'password': 'x',
                'first_name': 'A', 'last_name': 'B', 'organization_name': 'Org',
            })
            codes.append(r.status_code)
        assert codes.count(429) >= 1


# ── Politique de mot de passe ────────────────────────────────────────────────

@pytest.mark.django_db
class TestPasswordPolicy:
    def test_register_rejects_weak_password(self, api):
        r = api.post('/api/v1/auth/register/', {
            'email': 'weak@example.com', 'password': 'password',  # trop courant
            'first_name': 'A', 'last_name': 'B', 'organization_name': 'Org',
        })
        assert r.status_code == 400
        assert 'password' in r.data

    def test_register_accepts_strong_password(self, api):
        r = api.post('/api/v1/auth/register/', {
            'email': 'strong@example.com', 'password': 'Tr0ub4dour&3xplore',
            'first_name': 'A', 'last_name': 'B', 'organization_name': 'Org',
        })
        assert r.status_code in (200, 201), r.data
        assert CustomUser.objects.filter(email='strong@example.com').exists()

    def test_register_rejects_too_short(self, api):
        r = api.post('/api/v1/auth/register/', {
            'email': 'short@example.com', 'password': 'Ab1!',
            'first_name': 'A', 'last_name': 'B', 'organization_name': 'Org',
        })
        assert r.status_code == 400
        assert 'password' in r.data


# ── Healthcheck ──────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestHealthCheck:
    def test_health_ok(self, api):
        r = api.get('/api/v1/health/')
        assert r.status_code == 200
        assert r.data['status'] == 'ok'
        assert r.data['db'] == 'ok'
        assert r.data['cache'] == 'ok'
        assert 'version' in r.data

    def test_health_no_auth_required(self, api):
        # Aucun token fourni -> doit quand même répondre 200 (pas 401/403).
        r = api.get('/api/v1/health/')
        assert r.status_code == 200
