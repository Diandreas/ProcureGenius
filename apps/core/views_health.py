"""
Endpoint de santé applicatif — /api/v1/health/

Vérifie que l'application peut réellement servir : accès base de données et
cache. Non authentifié et sans throttling (un monitor externe type UptimeRobot
doit pouvoir l'appeler à intervalle régulier). Ne divulgue AUCUN détail
sensible (juste ok/fail par composant + version).

Retourne 200 si tout est OK, 503 si un composant est en panne — de sorte que le
monitoring déclenche une alerte automatiquement.
"""
from django.conf import settings
from django.core.cache import cache
from django.db import connection
from rest_framework.decorators import (
    api_view, permission_classes, authentication_classes, throttle_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(['GET'])
@authentication_classes([])   # pas d'auth : un token expiré ne doit pas donner 401 au monitor
@permission_classes([AllowAny])
@throttle_classes([])          # jamais throttlé
def health_check(request):
    """Sonde légère : DB + cache. 200 = ok, 503 = degraded."""
    db_ok = False
    cache_ok = False

    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            db_ok = cursor.fetchone()[0] == 1
    except Exception:
        db_ok = False

    try:
        cache.set('health_probe', '1', 5)
        cache_ok = cache.get('health_probe') == '1'
    except Exception:
        cache_ok = False

    ok = db_ok and cache_ok
    payload = {
        'status': 'ok' if ok else 'degraded',
        'db': 'ok' if db_ok else 'fail',
        'cache': 'ok' if cache_ok else 'fail',
        'version': getattr(settings, 'GIT_SHA', '') or 'unknown',
    }
    return Response(payload, status=200 if ok else 503)
