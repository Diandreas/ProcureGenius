"""
Tests smoke du routing IA (préfixe réel de production : /api/v1/ai/).

But : empêcher toute régression de routage. Le frontend consomme l'API via
baseURL `/api/v1` (frontend/src/services/api.js), donc les endpoints IA réels
vivent sous `/api/v1/ai/...` (apps/api/urls.py inclut apps.ai_assistant.api_urls).

Historiquement, les vues Push existaient mais n'étaient routées dans aucun fichier
d'URLs → 404 côté front. Ces tests verrouillent leur présence.
"""
import pytest
from django.urls import resolve


# (chemin réel, nom de la classe de vue attendue)
ROUTES = [
    ('/api/v1/ai/chat/', 'ChatView'),
    ('/api/v1/ai/conversations/', 'ConversationListView'),
    ('/api/v1/ai/push/vapid-key/', 'PushVapidKeyView'),
    ('/api/v1/ai/push/subscribe/', 'PushSubscribeView'),
    ('/api/v1/ai/push/unsubscribe/', 'PushUnsubscribeView'),
    ('/api/v1/ai/push/preferences/', 'NotificationPreferencesView'),
    ('/api/v1/ai/smart-alerts/', 'SmartAlertsView'),
    ('/api/v1/ai/generate/', 'GenerateTextView'),
    ('/api/v1/ai/suggestions/', 'ProactiveSuggestionsView'),
    ('/api/v1/ai/mcp/tools/', 'MCPToolsView'),
    ('/api/v1/ai/mcp/tools/call/', 'MCPToolsView'),
]


def _view_class_name(match):
    cls = getattr(match.func, 'view_class', None) or getattr(match.func, 'cls', None)
    return cls.__name__ if cls else None


@pytest.mark.parametrize('path,expected_view', ROUTES)
def test_route_resolves_to_expected_view(path, expected_view):
    match = resolve(path)
    assert _view_class_name(match) == expected_view, (
        f"{path} devrait router vers {expected_view}"
    )
