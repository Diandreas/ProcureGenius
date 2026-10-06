"""Non-régression : notifications IA en double, `_` dans send_push_to_user,
raccourci statistiques (ordre des arguments + détection stricte)."""
from unittest import mock

import pytest
from django.db import IntegrityError, transaction

from apps.ai_assistant.models import AINotification
from apps.ai_assistant.services.stats_response_service import StatsResponseService
from apps.ai_assistant.suggestion_matcher import SuggestionMatcher
from apps.ai_assistant.web_push_service import send_push_to_user


INSIGHT = {
    'title': '📝 5 facture(s) brouillon en attente',
    'message': 'Pensez à les envoyer.',
    'type': 'suggestion',
    'action_url': '/invoices',
    'priority': 9,
}


@pytest.mark.django_db
def test_insight_repete_ne_cree_quune_notification(user):
    # Le titre contient un emoji, retiré à l'enregistrement : avant le
    # correctif, la recherche de doublon ne trouvait jamais rien.
    with mock.patch('apps.ai_assistant.web_push_service.send_push', return_value=False):
        for _ in range(5):
            SuggestionMatcher._create_notification(user, INSIGHT)
    assert AINotification.objects.filter(user=user, is_read=False).count() == 1
    assert AINotification.objects.get(user=user).title == '5 facture(s) brouillon en attente'


@pytest.mark.django_db
def test_contrainte_unicite_sur_les_non_lues(user):
    AINotification.objects.create(user=user, notification_type='alert', title='Stock bas', message='m')
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            AINotification.objects.create(user=user, notification_type='alert', title='Stock bas', message='m')
    # Une fois lue, la même notification peut revenir.
    AINotification.objects.filter(user=user).update(is_read=True)
    AINotification.objects.create(user=user, notification_type='alert', title='Stock bas', message='m')
    assert AINotification.objects.filter(user=user).count() == 2


@pytest.mark.django_db
def test_send_push_to_user_cree_la_notification_avec_libelle(user):
    # Avant : `pref_field, _ = ...` rendait `_` local -> UnboundLocalError sur
    # `_("Voir")`, la notification n'était jamais créée.
    with mock.patch('apps.ai_assistant.web_push_service.send_push', return_value=False):
        send_push_to_user(user, 'stock_bas', title='Stock bas : Ventilateur', body='2 restants',
                          url='/products/1', tag='stock_bas_1')
    notif = AINotification.objects.get(user=user)
    assert notif.action_label == 'Voir'
    assert notif.notification_type == 'alert'


@pytest.mark.django_db
def test_send_push_to_user_doublon_ignore(user):
    with mock.patch('apps.ai_assistant.web_push_service.send_push', return_value=False):
        send_push_to_user(user, 'stock_bas', title='Stock bas', body='x', url='/p', tag='a')
        send_push_to_user(user, 'stock_bas', title='Stock bas', body='x', url='/p', tag='b')
    assert AINotification.objects.filter(user=user).count() == 1


@pytest.mark.parametrize('message', [
    'Montre-moi mes statistiques',
    'Affiche le tableau de bord',
    'Donne-moi mes stats',
    'Un aperçu général de mon activité',
])
def test_demandes_de_statistiques_pures(message):
    assert StatsResponseService.is_pure_stats_request(message)


@pytest.mark.parametrize('message', [
    'Génère une relance pour une facture impayée',
    'Vérifie le prix du marché pour un produit',
    "Peux-tu m'aider avec mes tâches quotidiennes ?",
    "Analyse le comportement de mes clients et leurs habitudes d'achat.",
    'Crée une facture pour Acme',
    'Combien de factures ce mois ?',
    'Statistiques des ventes de septembre',
    'hello',
])
def test_les_autres_demandes_vont_a_l_assistant(message):
    assert not StatsResponseService.is_pure_stats_request(message)


def test_raccourci_stats_appelle_le_service_dans_le_bon_ordre():
    from apps.ai_assistant.services.orchestrator import Orchestrator

    orch = Orchestrator.__new__(Orchestrator)
    user = object()
    with mock.patch.object(StatsResponseService, 'generate_stats_response',
                           return_value='ok') as gen:
        assert orch._try_stats_shortcut_sync('Montre-moi mes statistiques', user) == 'ok'
    gen.assert_called_once_with(user, 'Montre-moi mes statistiques')
