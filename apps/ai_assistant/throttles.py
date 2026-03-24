"""
Rate limiting pour les endpoints IA.
Protege contre l'abus et les couts excessifs.
"""
from rest_framework.throttling import UserRateThrottle, BaseThrottle
from django.core.cache import cache


class AIUserRateThrottle(UserRateThrottle):
    """100 requetes/heure par utilisateur sur les endpoints IA"""
    scope = 'ai_user'
    rate = '100/hour'


class AIOrgRateThrottle(BaseThrottle):
    """500 requetes/heure par organisation"""
    rate = '500/hour'
    cache_format = 'ai_org_throttle_%(ident)s'

    def __init__(self):
        self.num_requests, self.duration = self.parse_rate(self.rate)
        self.history = []

    def parse_rate(self, rate):
        num, period = rate.split('/')
        num_requests = int(num)
        duration = {'s': 1, 'm': 60, 'h': 3600, 'd': 86400}.get(period[0], 3600)
        return num_requests, duration

    def get_cache_key(self, request, view):
        org = getattr(request.user, 'organization', None)
        if not org:
            return None
        return self.cache_format % {'ident': org.id}

    def allow_request(self, request, view):
        key = self.get_cache_key(request, view)
        if not key:
            return True

        import time
        now = time.time()
        self.history = cache.get(key, [])
        # Purger les entrees expirees
        while self.history and self.history[-1] <= now - self.duration:
            self.history.pop()

        if len(self.history) >= self.num_requests:
            return False

        self.history.insert(0, now)
        cache.set(key, self.history, self.duration)
        return True

    def wait(self):
        if self.history:
            import time
            remaining = self.duration - (time.time() - self.history[-1])
            return max(0, remaining)
        return None


class AIBurstRateThrottle(UserRateThrottle):
    """10 requetes/minute anti-spam sur le chat"""
    scope = 'ai_burst'
    rate = '10/minute'
