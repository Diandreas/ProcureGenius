"""Démonstration publique de l'IA : données isolées, lecture seule, plafonds."""
from datetime import timedelta
from unittest import mock

import pytest
from django.core.cache import cache
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.ai_assistant.public_demo import DEMO_ORG_NAME, DEMO_USERNAME, OUTIL_APERCU, OUTILS_AUTORISES, DemoToolRegistry

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
    assert noms <= OUTILS_AUTORISES | {OUTIL_APERCU}
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


@pytest.mark.django_db(transaction=True)
def test_prevision_tresorerie_fonctionne_sur_la_demo(demo):
    """predict_cashflow plantait : Client n'a pas de champ company_name."""
    from asgiref.sync import async_to_sync
    from apps.ai_assistant._services_core import AsyncSafeUserContext
    from apps.ai_assistant.services.registry.tool_registry import registry

    res = async_to_sync(registry.call)('predict_cashflow', {}, AsyncSafeUserContext.from_user(demo))
    assert res.get('success') is True, res


class _ProviderFacture:
    """Faux modèle : demande un aperçu de facture, puis rédige la réponse."""

    def __init__(self):
        self.appels = 0

    def complete(self, messages, tools=None, tool_choice='auto', temperature=0.7, max_tokens=2500):
        self.appels += 1
        if self.appels == 1:
            assert OUTIL_APERCU in {t['function']['name'] for t in tools}
            return {'success': True, 'content': '', 'circuit_open': False, 'usage': {'total_tokens': 5},
                    'tool_calls': [{'id': 't1', 'function': OUTIL_APERCU, 'arguments': {
                        'client_name': 'Akwa', 'items': [{'description': 'Ramette papier A4', 'quantity': 10},
                                                         {'description': 'Livraison', 'quantity': 1, 'unit_price': 5000}]}}]}
        return {'success': True, 'content': 'Votre facture est prête.', 'tool_calls': None,
                'usage': {'total_tokens': 5}, 'circuit_open': False}


@pytest.mark.django_db(transaction=True)
def test_facture_d_apercu_affichee_sans_rien_enregistrer(demo):
    from apps.invoicing.models import Invoice
    from apps.accounts.models import Client
    from apps.ai_assistant.services.orchestrator import Orchestrator

    avant = (Invoice.objects.count(), Client.objects.count())
    vrai_init = Orchestrator.__init__

    def init(self, provider=None, tool_registry=None):
        vrai_init(self, provider=_ProviderFacture(), tool_registry=tool_registry)

    with mock.patch.object(Orchestrator, '__init__', init):
        r = APIClient().post(URL, {'message': "Fais une facture pour l'Hôtel Akwa Plaza", 'anon_id': 'f1'}, format='json')
    assert r.status_code == 200, r.data
    f = r.data['invoice_preview']
    assert f['client']['name'] == 'Hôtel Akwa Plaza'
    assert [l['description'] for l in f['items']] == ['Ramette papier A4 80 g', 'Livraison']
    assert f['subtotal'] == 40000 and f['tax_rate'] == 19.25 and f['total'] == 47700
    assert r.data['suggested_followups'] == []
    assert (Invoice.objects.count(), Client.objects.count()) == avant


@pytest.mark.django_db
def test_apercu_sans_prix_connu(demo):
    from apps.ai_assistant.public_demo import build_invoice_preview
    r = build_invoice_preview(demo.organization, {'client_name': 'Nouveau client', 'items': [{'description': 'licorne'}]})
    assert r['success'] is False and 'licorne' in r['error']
    r = build_invoice_preview(demo.organization, {'client_name': 'Nouveau client',
                                                  'items': [{'description': 'Conseil', 'quantity': 2, 'unit_price': 25000}]})
    assert r['success'] and r['invoice']['client']['name'] == 'Nouveau client' and r['invoice']['subtotal'] == 50000
