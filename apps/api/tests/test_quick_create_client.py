"""Création rapide de client : une saisie invalide doit répondre 400, pas 500."""
import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Client, Organization, User

URL = '/api/v1/quick-create/client/'


@pytest.fixture
def api(db):
    org = Organization.objects.create(name='Org test creation rapide')
    user = User.objects.create_user(username='qc', email='qc@example.com', password='x', organization=org)
    client = APIClient()
    client.force_authenticate(user=user)
    return client, org


def test_email_invalide_renvoie_400(api):
    client, org = api
    rep = client.post(URL, {'name': 'Nouveau client', 'email': 'pas-un-email', 'force_create': True}, format='json')
    assert rep.status_code == 400
    assert rep.data['error']
    assert not Client.objects.filter(organization=org, name='Nouveau client').exists()


def test_champs_null_acceptes(api):
    client, org = api
    rep = client.post(URL, {'name': 'Client sans contact', 'email': None, 'phone': None,
                            'address': None, 'force_create': True}, format='json')
    assert rep.status_code == 201, rep.data
    assert Client.objects.get(organization=org, name='Client sans contact').email == ''


def test_nom_null_renvoie_400(api):
    client, _ = api
    rep = client.post(URL, {'name': None}, format='json')
    assert rep.status_code == 400
