"""Démonstration publique de l'assistant IA (page d'accueil, sans compte).

Garde-fous, du plus important au moins important :
  1. Données : les questions portent sur une organisation fictive isolée
     (`seed_public_demo`), jamais sur un client réel.
  2. Outils : seulement une liste explicite d'outils de LECTURE. Aucun outil
     qui crée, modifie, supprime ou envoie n'est proposé au modèle, et un appel
     à un outil hors liste est refusé même si le modèle l'invente. Seule
     exception : `preview_invoice`, propre à la démo, qui CALCULE un aperçu de
     facture (rien n'est enregistré) ; le visiteur crée un compte pour la garder.
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


# Aperçu de facture : calculé à partir des données de la démo, jamais enregistré.
OUTIL_APERCU = 'preview_invoice'
APERCU_SCHEMA = {
    "type": "function",
    "function": {
        "name": OUTIL_APERCU,
        "description": (
            "Prépare une facture pour un client et l'affiche au visiteur (aperçu de démonstration, "
            "rien n'est enregistré). À utiliser dès qu'on demande de faire, créer ou préparer une "
            "facture. Les prix des produits du catalogue sont retrouvés automatiquement : ne donne "
            "unit_price que si le visiteur l'indique."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "client_name": {"type": "string", "description": "Nom du client"},
                "items": {
                    "type": "array",
                    "description": "Articles facturés",
                    "items": {
                        "type": "object",
                        "properties": {
                            "description": {"type": "string", "description": "Produit ou service"},
                            "quantity": {"type": "number"},
                            "unit_price": {"type": "number", "description": "Prix unitaire HT en FCFA, si connu"},
                        },
                        "required": ["description"],
                    },
                },
            },
            "required": ["client_name", "items"],
        },
    },
}
MAX_LIGNES = 10


def _arrondi(montant):
    from decimal import Decimal, ROUND_HALF_UP
    return Decimal(montant).quantize(Decimal('1'), rounding=ROUND_HALF_UP)


def _produit(organization, libelle):
    """Produit du catalogue de la démo correspondant au libellé (nom complet, puis premier mot)."""
    from apps.invoicing.models import Product
    qs = Product.objects.filter(organization=organization, is_active=True)
    trouve = qs.filter(name__icontains=libelle).first()
    if trouve or not libelle.split():
        return trouve
    mots = [m for m in libelle.split() if len(m) > 3]
    for mot in mots:
        trouve = qs.filter(name__icontains=mot).first()
        if trouve:
            return trouve
    return None


def build_invoice_preview(organization, arguments):
    """Calcule un aperçu de facture (client, lignes, TVA, totaux) sans rien écrire en base."""
    from datetime import timedelta
    from decimal import Decimal, InvalidOperation
    from apps.accounts.models import Client
    from apps.core.countries import org_currency, org_tax_rate

    nom_client = str(arguments.get('client_name') or '').strip()[:120]
    lignes_brutes = arguments.get('items') or []
    if not nom_client or not isinstance(lignes_brutes, list) or not lignes_brutes:
        return {'success': False, 'error': "Indiquez le client et au moins un article."}

    client = Client.objects.filter(organization=organization, name__icontains=nom_client).first()
    lignes, inconnus = [], []
    for brut in lignes_brutes[:MAX_LIGNES]:
        if not isinstance(brut, dict):
            continue
        libelle = str(brut.get('description') or '').strip()[:150]
        if not libelle:
            continue
        try:
            quantite = Decimal(str(brut.get('quantity') or 1))
        except (InvalidOperation, ValueError):
            quantite = Decimal('1')
        quantite = min(max(quantite, Decimal('1')), Decimal('10000'))
        prix_donne = None
        if brut.get('unit_price') not in (None, ''):
            try:
                prix_donne = Decimal(str(brut['unit_price']))
            except (InvalidOperation, ValueError):
                prix_donne = None
        produit = None if prix_donne is not None else _produit(organization, libelle)
        prix = prix_donne if prix_donne is not None else (produit.price if produit else None)
        if prix is None or prix < 0:
            inconnus.append(libelle)
            continue
        prix = min(prix, Decimal('100000000'))
        lignes.append({
            'reference': produit.reference if produit else '',
            'description': produit.name if produit else libelle,
            'quantity': float(quantite),
            'unit_price': float(_arrondi(prix)),
            'total': float(_arrondi(prix * quantite)),
        })
    if not lignes:
        return {'success': False, 'unknown_items': inconnus,
                'error': "Prix introuvable pour : " + ", ".join(inconnus[:3]) + ". Demandez le prix unitaire."}

    taux = Decimal(str(org_tax_rate(organization) or 0))
    sous_total = sum(Decimal(str(l['total'])) for l in lignes)
    tva = _arrondi(sous_total * taux / Decimal('100'))
    aujourd_hui = timezone.localdate()
    reglages = getattr(organization, 'settings', None)
    facture = {
        'number': 'APERÇU',
        'issue_date': aujourd_hui.isoformat(),
        'due_date': (aujourd_hui + timedelta(days=30)).isoformat(),
        'currency': org_currency(organization),
        'company': {
            'name': getattr(reglages, 'company_name', '') or organization.name,
            'address': getattr(reglages, 'company_address', '') or 'Douala, Cameroun',
            'phone': getattr(reglages, 'company_phone', '') or '',
        },
        'client': {
            'name': client.name if client else nom_client,
            'address': (getattr(client, 'address', '') or '') if client else '',
        },
        'items': lignes,
        'subtotal': float(sous_total),
        'tax_rate': float(taux),
        'tax_amount': float(tva),
        'total': float(sous_total + tva),
        'unknown_items': inconnus,
    }
    return {
        'success': True,
        'preview': True,
        'invoice': facture,
        'message': (f"Aperçu de facture prêt pour {facture['client']['name']} : {len(lignes)} ligne(s), "
                    f"total TTC {facture['total']:.0f} {facture['currency']}. Rien n'est enregistré : "
                    "le visiteur doit créer un compte gratuit pour la télécharger en PDF, l'envoyer "
                    "par WhatsApp et la garder."
                    + (f" Prix inconnu pour : {', '.join(inconnus)}." if inconnus else "")),
    }


class DemoToolRegistry:
    """Vue en lecture seule du registre global (seules méthodes utilisées par l'orchestrateur)."""

    def __init__(self, base=None):
        if base is None:
            from apps.ai_assistant.services.registry.tool_registry import registry as base
        self._base = base

    def to_mistral_tools(self):
        return [s.to_mistral_tool() for s in self._base.all() if s.name in OUTILS_AUTORISES] + [APERCU_SCHEMA]

    async def call(self, name, arguments, user_ctx):
        if name == OUTIL_APERCU:
            from asgiref.sync import sync_to_async
            from apps.accounts.models import Organization

            def apercu():
                org = Organization.objects.get(pk=user_ctx.get('organization_id'))
                return build_invoice_preview(org, arguments or {})
            try:
                return await sync_to_async(apercu, thread_sensitive=True)()
            except Exception:
                logger.exception("Démo IA publique : aperçu de facture impossible")
                return {'success': False, 'error': "L'aperçu de facture n'est pas disponible pour le moment."}
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
    apercu = next((tr['result']['invoice'] for tr in (resultat.tool_results or [])
                   if tr.get('function') == OUTIL_APERCU and isinstance(tr.get('result'), dict)
                   and tr['result'].get('success')), None)
    return Response({
        'reply': resultat.reply,
        'suggested_followups': [] if apercu else list(resultat.suggested_followups or [])[:3],
        'remaining': restant,
        'invoice_preview': apercu,
    })
