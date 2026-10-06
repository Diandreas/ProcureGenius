"""Démonstration publique de l'assistant IA (page d'accueil, sans compte).

Garde-fous, du plus important au moins important :
  1. Données : les questions portent sur une organisation fictive isolée
     (`seed_public_demo`), jamais sur un client réel.
  2. Outils : seulement une liste explicite d'outils de LECTURE. Aucun outil
     qui crée, modifie, supprime ou envoie n'est proposé au modèle, et un appel
     à un outil hors liste est refusé même si le modèle l'invente.
  3. Coût : plafonds par visiteur, par adresse IP et global par jour (Redis),
     questions courtes, historique tronqué, rien n'est enregistré en base.
"""
import hashlib
import logging

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

logger = logging.getLogger(__name__)

DEMO_ORG_NAME = 'Démo Procura — Fournitures Wouri SARL'
DEMO_USERNAME = 'demo-public-ia'

# Outils de lecture autorisés (vérifiés : aucun n'écrit en base ni n'appelle
# de service externe). Toute la famille create_/update_/delete_/send_ est exclue.
OUTILS_AUTORISES = frozenset({
    'get_latest_invoice', 'list_clients', 'list_suppliers', 'search_client',
    'search_entity', 'search_invoice', 'search_product', 'search_purchase_order',
    'search_supplier', 'analyze_business', 'get_client_stats', 'get_insights',
    'get_invoice_stats', 'get_product_stats', 'get_statistics', 'get_stats',
    'get_stock_alerts', 'get_stock_stats', 'get_supplier_stats', 'predict_cashflow',
    'verify_price',
})

MAX_CARACTERES = 300
MAX_HISTORIQUE = 6


def _limite(nom, defaut):
    return int(getattr(settings, nom, defaut))


class DemoToolRegistry:
    """Vue en lecture seule du registre global (seules méthodes utilisées par l'orchestrateur)."""

    def __init__(self, base=None):
        if base is None:
            from apps.ai_assistant.services.registry.tool_registry import registry as base
        self._base = base

    def to_mistral_tools(self):
        return [s.to_mistral_tool() for s in self._base.all() if s.name in OUTILS_AUTORISES]

    async def call(self, name, arguments, user_ctx):
        nom = self._base.resolve_name(name, OUTILS_AUTORISES)
        if nom is None:
            return {
                'success': False,
                'internal': True,
                'error': "Cette action n'est pas disponible dans la démonstration : "
                         "créez un compte gratuit pour l'utiliser sur vos propres données.",
            }
        return await self._base.call(nom, arguments, user_ctx)


def _empreinte(texte):
    sel = getattr(settings, 'SECRET_KEY', '')
    return hashlib.sha256(f'{sel}:{texte}'.encode()).hexdigest()[:24]


def _ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
    return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', '')


def _consommer(cle, limite):
    """Incrémente un compteur journalier ; False si la limite est déjà atteinte."""
    cle = f"demo_ia:{timezone.now():%Y%m%d}:{cle}"
    try:
        cache.add(cle, 0, 60 * 60 * 26)
        if cache.get(cle, 0) >= limite:
            return False
        cache.incr(cle)
        return True
    except Exception:  # cache indisponible : on laisse passer plutôt que casser la démo
        return True


def _historique(brut):
    propre = []
    for m in (brut or [])[-MAX_HISTORIQUE:]:
        if not isinstance(m, dict):
            continue
        role = m.get('role')
        if role not in ('user', 'assistant'):
            continue
        propre.append({'role': role, 'content': str(m.get('content') or '')[:1500]})
    return propre


@api_view(['POST'])
@authentication_classes([])  # un vieux jeton expiré ne doit pas renvoyer le visiteur vers /login
@permission_classes([AllowAny])
def public_demo_chat(request):
    """POST {message, anon_id, history} -> {reply, suggested_followups, remaining}."""
    from apps.accounts.models import User
    from apps.ai_assistant._services_core import AsyncSafeUserContext
    from apps.ai_assistant.services.orchestrator import Orchestrator
    from asgiref.sync import async_to_sync

    data = request.data if isinstance(request.data, dict) else {}
    message = str(data.get('message') or '').strip()
    if not message:
        return Response({'error': 'Posez une question.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(message) > MAX_CARACTERES:
        return Response({'error': f'Question trop longue ({MAX_CARACTERES} caractères au maximum).'},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        demo = User.objects.select_related('organization').get(username=DEMO_USERNAME)
    except User.DoesNotExist:
        logger.error("Démo IA publique : organisation absente (lancer seed_public_demo).")
        return Response({'error': 'La démonstration est momentanément indisponible.'},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)

    par_visiteur = _limite('PUBLIC_AI_DEMO_PER_VISITOR', 5)
    visiteur = _empreinte(str(data.get('anon_id') or '')[:64]) if data.get('anon_id') else None
    limite_atteinte = {
        'error': 'limit_reached',
        'message': "Vous avez utilisé vos questions d'essai pour aujourd'hui. "
                   "Créez un compte gratuit pour continuer sur vos propres données.",
        'remaining': 0,
    }
    if visiteur and not _consommer(f'v:{visiteur}', par_visiteur):
        return Response(limite_atteinte, status=status.HTTP_429_TOO_MANY_REQUESTS)
    # Par adresse IP, plus large : beaucoup de visiteurs partagent l'IP de leur opérateur mobile.
    if not _consommer(f'ip:{_empreinte(_ip(request))}', _limite('PUBLIC_AI_DEMO_PER_IP', 30)):
        return Response(limite_atteinte, status=status.HTTP_429_TOO_MANY_REQUESTS)
    if not _consommer('global', _limite('PUBLIC_AI_DEMO_DAILY', 150)):
        return Response({'error': 'busy', 'message': "La démonstration a atteint son quota du jour. "
                         "Créez un compte gratuit pour essayer l'assistant tout de suite.", 'remaining': 0},
                        status=status.HTTP_429_TOO_MANY_REQUESTS)

    orchestrateur = Orchestrator(tool_registry=DemoToolRegistry())
    try:
        resultat = async_to_sync(orchestrateur.run)(
            message=message,
            user_ctx=AsyncSafeUserContext.from_user(demo),
            conversation_history=_historique(data.get('history')),
            page='/public-demo',
            user=demo,
        )
    except Exception:
        logger.exception("Démo IA publique : échec de l'orchestrateur")
        return Response({'error': 'La démonstration est momentanément indisponible.'},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)

    # Suivi du coût sur l'organisation de démo (tableau de bord des tokens).
    try:
        from apps.ai_assistant.views import _record_ai_usage
        _record_ai_usage(demo.organization, demo, resultat.tokens)
    except Exception:
        pass

    restant = None
    if visiteur:
        try:
            restant = max(par_visiteur - cache.get(f"demo_ia:{timezone.now():%Y%m%d}:v:{visiteur}", 0), 0)
        except Exception:
            restant = None
    return Response({
        'reply': resultat.reply,
        'suggested_followups': list(resultat.suggested_followups or [])[:3],
        'remaining': restant,
    })
