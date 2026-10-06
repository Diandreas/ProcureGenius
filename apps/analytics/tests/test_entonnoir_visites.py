"""Entonnoir des visiteurs anonymes : accueil -> tarifs -> inscription -> compte."""
import pytest
from rest_framework.test import APIClient

from apps.analytics.admin_stats_service import get_admin_stats
from apps.analytics.models import Visit

NAVIGATEUR = 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120 Safari/537.36'


def _ping(client, anon_id, path, referrer=''):
    return client.post('/api/v1/track/', {'anon_id': anon_id, 'path': path, 'referrer': referrer},
                       format='json', HTTP_USER_AGENT=NAVIGATEUR)


@pytest.mark.django_db
def test_entonnoir_compte_les_visiteurs_par_etape():
    c = APIClient()
    for i in range(4):
        _ping(c, f'v{i}', '/', 'https://www.linkedin.com/feed/')
    for i in range(2):
        _ping(c, f'v{i}', '/pricing')
        _ping(c, f'v{i}', '/pricing')  # deux vues, un seul visiteur
    _ping(c, 'v0', '/register')

    funnel = {e['step']: e['visitors'] for e in get_admin_stats(days=30)['acquisition']['funnel']}
    assert funnel == {'landing': 4, 'demo_ai': 0, 'pricing': 2, 'register': 1, 'signup': 0}
    assert Visit.objects.filter(path='/pricing').count() == 4


@pytest.mark.django_db
def test_robot_ignore():
    c = APIClient()
    c.post('/api/v1/track/', {'anon_id': 'b', 'path': '/pricing'}, format='json',
           HTTP_USER_AGENT='Mozilla/5.0 (compatible; Googlebot/2.1)')
    assert not Visit.objects.exists()
