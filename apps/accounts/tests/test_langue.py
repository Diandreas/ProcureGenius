"""Langue de l'interface : propre à chaque personne, choisie dès l'inscription."""
import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts.models import CustomUser, UserPreferences

MOT_DE_PASSE = 'Tr0ub4dour&3xplore'


@pytest.fixture(autouse=True)
def _cache_vide():
    cache.clear()
    yield
    cache.clear()


def _inscrire(email, **entetes):
    r = APIClient().post('/api/v1/auth/register/', {
        'email': email, 'password': MOT_DE_PASSE,
        'first_name': 'A', 'last_name': 'B', 'organization_name': 'Org',
    }, **entetes)
    assert r.status_code in (200, 201), r.data
    return CustomUser.objects.get(email=email)


@pytest.mark.django_db
def test_inscription_en_anglais_garde_l_anglais():
    u = _inscrire('en@example.com', HTTP_ACCEPT_LANGUAGE='en')
    assert UserPreferences.objects.get(user=u).preferred_language == 'en'


@pytest.mark.django_db
def test_inscription_sans_langue_reconnue_en_francais():
    u = _inscrire('xx@example.com', HTTP_ACCEPT_LANGUAGE='es-ES,es;q=0.9')
    assert UserPreferences.objects.get(user=u).preferred_language == 'fr'


@pytest.mark.django_db
def test_inscription_en_allemand():
    u = _inscrire('de@example.com', HTTP_ACCEPT_LANGUAGE='de-DE,de;q=0.9')
    assert UserPreferences.objects.get(user=u).preferred_language == 'de'


@pytest.mark.django_db
def test_langue_propre_a_chaque_personne():
    a = _inscrire('a@example.com', HTTP_ACCEPT_LANGUAGE='fr')
    b = CustomUser.objects.create_user(username='b@example.com', email='b@example.com',
                                       password=MOT_DE_PASSE, organization=a.organization)
    ca, cb = APIClient(), APIClient()
    ca.force_authenticate(a)
    cb.force_authenticate(b)

    r = ca.patch('/api/v1/settings/all/', {'language': 'en'}, format='json')
    assert r.status_code == 200 and r.data['language'] == 'en'
    assert ca.get('/api/v1/settings/all/').data['language'] == 'en'
    assert cb.get('/api/v1/settings/all/').data['language'] == 'fr'
    assert ca.patch('/api/v1/settings/all/', {'language': 'de'}, format='json').data['language'] == 'de'
    assert ca.patch('/api/v1/settings/all/', {'language': 'es'}, format='json').status_code == 400
