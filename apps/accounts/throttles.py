"""
Throttles anti brute-force pour les endpoints d'authentification publics.

Ces endpoints (login, register, mot de passe oublié/réinitialisé, contact) ne
passaient par AUCUN rate limiting : un attaquant pouvait tester des mots de
passe sans limite. On applique des limites par IP (AnonRateThrottle) via des
scopes déclarés dans REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] (settings.py).

Prérequis : cache partagé Redis (settings CACHES) — sinon chaque worker
gunicorn compte séparément. NUM_PROXIES=1 est réglé pour lire la vraie IP
derrière nginx (X-Forwarded-For).
"""
from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    scope = 'auth_login'


class RegisterRateThrottle(AnonRateThrottle):
    scope = 'auth_register'


class PasswordResetRateThrottle(AnonRateThrottle):
    scope = 'auth_password'


class ContactRateThrottle(AnonRateThrottle):
    scope = 'contact'
