"""Démonstration publique de l'IA : données isolées, lecture seule, plafonds."""
from datetime import timedelta
from unittest import mock

import pytest
from django.core.cache import cache
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.ai_assistant.public_demo import DEMO_ORG_NAME, DEMO_USERNAME, OUTILS_AUTORISES, DemoToolRegistry

URL = '/api/v1/ai/public-demo/'


@pytest.fixture(autouse=True)
def cache_vide():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def demo(db):
    call_command('seed_public_demo')
    from apps.accounts.models import User
    return User.objects.get(username=DEMO_USERNAME)


@pytest.mark.django_db
def test_seed_cree_une_organisation_isolee(demo):
    from apps.invoicing.models import Invoice, Product
    assert demo.organization.name == DEMO_ORG_NAME
    assert not demo.has_usable_password()
    assert Invoice.objects.filter(organization=demo.organization).count() == 48
    assert Product.objects.filter(organization=demo.organization, stock_quantity=0).exists()
    derniere = Invoice.objects.filter(organization=demo.organization).latest('created_at').created_at
    assert timezone.now() - derniere < timedelta(days=3)


@pytest.mark.django_db
def test_seed_relance_ne_duplique_pas_et_rafraichit(demo):
    from apps.invoicing.models import Invoice
    org = demo.organization
    Invoice.objects.filter(organization=org).update(created_at=timezone.now() - timedelta(days=60))
    call_command('seed_public_demo', '--refresh')
    assert Invoice.objects.filter(organization=org).count() == 48
    derniere = Invoice.objects.filter(organization=org).latest('created_at').created_at
    assert timezone.now() - derniere < timedelta(days=3)


def test_registre_ne_propose_que_la_lecture():
    noms = {t['function']['name'] for t in DemoToolRegistry().to_mistral_tools()}
    assert noms <= OUTILS_AUTORISES
    assert not any(n.startswith(('create_', 'update_', 'delete_', 'send_', 'adjust_')) for n in noms)


@pytest.mark.django_db
async def test_outil_d_ecriture_refuse_meme_si_invente():
    base = mock.Mock()
    base.resolve_name.side_effect = lambda name, valid: name if name in valid else None
    base.call = mock.AsyncMock(return_value={'success': True})
    res = await DemoToolRegistry(base).call('create_invoice', {}, {})
    assert res['success'] is False
    base.call.assert_not_called()


def _reponse(**kw):
    from apps.ai_assistant.services.orchestrator import OrchestratorResult
    return OrchestratorResult(reply='3 produits en rupture.', tokens=10, success=True, **kw)


@pytest.mark.django_db
@override_settings(PUBLIC_AI_DEMO_PER_VISITOR=2)
def test_reponse_puis_plafond_par_visiteur(demo):
    c = APIClient()
    with mock.patch('apps.ai_assistant.services.orchestrator.Orchestrator.run',
                    new=mock.AsyncMock(return_value=_reponse())) as run:
        r1 = c.post(URL, {'message': 'Quels produits sont en rupture ?', 'anon_id': 'a1'}, format='json')
        r2 = c.post(URL, {'message': 'Et les factures en retard ?', 'anon_id': 'a1'}, format='json')
        r3 = c.post(URL, {'message': 'Encore une ?', 'anon_id': 'a1'}, format='json')
    assert r1.status_code == 200 and r1.data['reply'] == '3 produits en rupture.'
    assert r1.data['remaining'] == 1 and r2.data['remaining'] == 0
    assert r3.status_code == 429 and r3.data['error'] == 'limit_reached'
    assert run.await_count == 2
    # L'orchestrateur travaille bien sur l'utilisateur de démo, avec la consigne de démo.
    assert run.await_args.kwargs['user'] == demo
    assert run.await_args.kwargs['page'] == '/public-demo'


@pytest.mark.django_db
def test_vieux_jeton_ne_renvoie_pas_vers_la_connexion(demo):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION='Token jeton-expire-inexistant')
    with mock.patch('apps.ai_assistant.services.orchestrator.Orchestrator.run',
                    new=mock.AsyncMock(return_value=_reponse())):
        r = c.post(URL, {'message': 'Bonjour', 'anon_id': 'a2'}, format='json')
    assert r.status_code == 200


@pytest.mark.django_db
def test_question_trop_longue(demo):
    r = APIClient().post(URL, {'message': 'x' * 301}, format='json')
    assert r.status_code == 400


@pytest.mark.django_db
def test_demo_absente_503(db):
    r = APIClient().post(URL, {'message': 'Bonjour'}, format='json')
    assert r.status_code == 503


@pytest.mark.django_db
async def test_synthese_sans_message_assistant_vide():
    """L'appel 2 ne doit pas contenir de message assistant vide (refusé par Mistral)."""
    from apps.ai_assistant.services.orchestrator import Orchestrator

    vus = []

    class Provider:
        def complete(self, messages, tools=None, tool_choice='auto', temperature=0.7, max_tokens=2500):
            vus.append(messages)
            return {'success': True, 'content': 'Deux produits sont en rupture.', 'tool_calls': None,
                    'usage': {'total_tokens': 5}, 'circuit_open': False}

    orch = Orchestrator(provider=Provider(), tool_registry=mock.Mock())
    texte, _ = await orch._synthesize([{'role': 'user', 'content': 'Ruptures ?'}],
                                      {'content': '', 'tool_calls': [{'id': '1'}]},
                                      [{'function': 'get_stock_alerts', 'result': {'success': True}}])
    assert texte == 'Deux produits sont en rupture.'
    assert not any(m['role'] == 'assistant' and not m.get('content') for m in vus[0])
