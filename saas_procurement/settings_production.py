"""
Django settings - PRODUCTION (shim)
====================================

Ce module NE contient plus de configuration propre. Historiquement, c'était une
réimplémentation parallèle de `settings.py` qui a divergé (INSTALLED_APPS sans
`apps.accounting`, `TENANT_MODEL` inexistant, `FRONTEND_URL`/`VAPID_*`/`STRIPE_*`
absents alors que le code y accède...) — elle aurait planté au démarrage si on
l'avait activée, et créait deux sources de vérité impossibles à maintenir seul.

La production est désormais pilotée par UN SEUL module, `settings.py`, durci via
variables d'environnement (`DEBUG=False`, `SECRET_KEY`, `ALLOWED_HOSTS`, cookies
sécurisés, HSTS, limites d'upload — tout est activé dès que `DEBUG=False`).

Ce shim reste uniquement pour compatibilité avec les scripts/outils qui
référencent encore `saas_procurement.settings_production`
(deploy_mirlab.sh, Dockerfile, docker-compose). Il charge la config unique.
"""
from .settings import *  # noqa: F401,F403
