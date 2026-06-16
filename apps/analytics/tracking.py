"""
Tracking des visiteurs anonymes du site public (landing, pricing...).

Deux entrées :
- VisitTrackingMiddleware : capte les requêtes HTML non authentifiées (best-effort).
- track_visit (vue publique) : ping JS explicite depuis la landing React (fiable).

RGPD : aucune donnée nominative, IP jamais stockée en clair (hash tronqué),
pas de cookie tiers. L'anon_id est généré côté client et stocké en localStorage.
"""
import hashlib
import re
from urllib.parse import urlparse

from django.conf import settings
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

from .models import Visit


class TrackThrottle(SimpleRateThrottle):
    """
    Limite le ping de tracking par IP (anti-spam), avec un taux propre
    indépendant de la config DRF globale (qui ne définit pas de scope 'anon').
    """
    scope = 'track'
    rate = '120/min'

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }


# Chemins applicatifs (déjà couverts par ActivityLog) — on ne tracke pas comme "visite".
_APP_PREFIXES = (
    '/api/', '/admin/', '/static/', '/media/', '/health',
    '/favicon', '/robots', '/.well-known',
)

_BOT_RE = re.compile(
    r'bot|crawl|spider|slurp|bing|google|yandex|duckduck|baidu|'
    r'facebookexternalhit|whatsapp|telegram|preview|monitor|uptime|curl|wget|python-requests',
    re.IGNORECASE,
)
_MOBILE_RE = re.compile(r'Mobile|Android|iPhone|iPod', re.IGNORECASE)
_TABLET_RE = re.compile(r'iPad|Tablet', re.IGNORECASE)


def hash_ip(ip: str) -> str:
    """Hash tronqué de l'IP, salé avec SECRET_KEY. Jamais l'IP en clair."""
    if not ip:
        return ''
    salt = getattr(settings, 'SECRET_KEY', '')
    return hashlib.sha256(f"{salt}:{ip}".encode()).hexdigest()[:32]


def get_client_ip(request) -> str:
    xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


def detect_device(user_agent: str) -> str:
    if not user_agent:
        return 'unknown'
    if _BOT_RE.search(user_agent):
        return 'bot'
    if _TABLET_RE.search(user_agent):
        return 'tablet'
    if _MOBILE_RE.search(user_agent):
        return 'mobile'
    return 'desktop'


def referrer_domain(referrer: str) -> str:
    if not referrer:
        return ''
    try:
        return (urlparse(referrer).netloc or '').lower().replace('www.', '')[:255]
    except Exception:
        return ''


def is_app_path(path: str) -> bool:
    return any(path.startswith(p) for p in _APP_PREFIXES)


def _record_visit(*, anon_id, path, referrer, user_agent, ip,
                  utm_source='', utm_medium='', utm_campaign='',
                  country='', language=''):
    """Crée une ligne Visit. Tolérant aux erreurs (ne casse jamais la requête)."""
    try:
        Visit.objects.create(
            anon_id=(anon_id or 'unknown')[:64],
            path=(path or '/')[:500],
            referrer=(referrer or '')[:500],
            referrer_domain=referrer_domain(referrer),
            utm_source=(utm_source or '')[:100],
            utm_medium=(utm_medium or '')[:100],
            utm_campaign=(utm_campaign or '')[:100],
            device_type=detect_device(user_agent),
            country=(country or '')[:2],
            ip_hash=hash_ip(ip),
            user_agent=(user_agent or '')[:300],
            language=(language or '')[:20],
        )
    except Exception:
        # Le tracking ne doit JAMAIS faire échouer une page.
        pass


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([TrackThrottle])
def track_visit(request):
    """
    Ping JS depuis la landing.
    Body JSON: { anon_id, path, referrer, utm_source, utm_medium, utm_campaign, language }
    """
    data = request.data if isinstance(request.data, dict) else {}
    ua = request.META.get('HTTP_USER_AGENT', '')

    # On ignore les bots pour ne pas polluer les stats de visiteurs réels.
    if detect_device(ua) == 'bot':
        return Response({'ok': True, 'ignored': 'bot'})

    _record_visit(
        anon_id=data.get('anon_id'),
        path=data.get('path') or request.META.get('HTTP_REFERER', '/'),
        referrer=data.get('referrer') or request.META.get('HTTP_REFERER', ''),
        user_agent=ua,
        ip=get_client_ip(request),
        utm_source=data.get('utm_source', ''),
        utm_medium=data.get('utm_medium', ''),
        utm_campaign=data.get('utm_campaign', ''),
        country=request.META.get('HTTP_CF_IPCOUNTRY', ''),  # Cloudflare si présent
        language=data.get('language', '')
        or request.META.get('HTTP_ACCEPT_LANGUAGE', '')[:20],
    )
    return Response({'ok': True})


def mark_conversion(user, anon_id=None, request=None):
    """
    À appeler lors d'une inscription réussie : relie la ou les visites anonymes
    de ce visiteur au compte créé (mesure de conversion landing -> signup).
    """
    try:
        qs = Visit.objects.filter(converted_user__isnull=True)
        if anon_id:
            qs = qs.filter(anon_id=anon_id)
        elif request is not None:
            qs = qs.filter(ip_hash=hash_ip(get_client_ip(request)))
        else:
            return 0
        return qs.update(converted_user=user, converted_at=timezone.now())
    except Exception:
        return 0
