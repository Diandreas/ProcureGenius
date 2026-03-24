"""
WebPushService — Envoi de push notifications natives via VAPID/Web Push Protocol.

Catégories :
  CRITIQUE  : stock_rupture, quota_atteint, facture_retard
  IMPORTANT : stock_bas, facture_brouillon, bc_retard, lot_expirant, insight_ia
  RESUME    : resume_hebdo
"""
import json
import logging
import base64
from typing import Optional

from django.conf import settings
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()

# Mapping type → champ préférence utilisateur
PUSH_TYPE_TO_PREF = {
    'stock_rupture':     ('push_stock_rupture',   'critique'),
    'quota_atteint':     ('push_quota_atteint',   'critique'),
    'facture_retard':    ('push_facture_retard',   'critique'),
    'stock_bas':         ('push_stock_bas',        'important'),
    'facture_brouillon': ('push_facture_brouillon','important'),
    'bc_retard':         ('push_bc_retard',        'important'),
    'lot_expirant':      ('push_lot_expirant',     'important'),
    'insight_ia':        ('push_insight_ia',       'important'),
    'resume_hebdo':      ('push_resume_hebdo',     'resume'),
}

# Icônes par catégorie
PUSH_ICONS = {
    'critique':  '/icon-192.png',
    'important': '/icon-192.png',
    'resume':    '/icon-192.png',
}

# Badges (petite icône dans la barre de statut Android)
PUSH_BADGE = '/badge-72.png'


def _get_webpush_sender():
    """Retourne une instance WebPusher configurée avec les clés VAPID."""
    try:
        from pywebpush import WebPusher
        return WebPusher
    except ImportError:
        logger.error("pywebpush n'est pas installé. Lancez: pip install pywebpush")
        return None


def _build_payload(title: str, body: str, push_type: str, url: str = '/', tag: str = None, data: dict = None) -> str:
    """Construit le payload JSON envoyé au service worker."""
    _, category = PUSH_TYPE_TO_PREF.get(push_type, ('', 'important'))
    payload = {
        'title': title,
        'body': body,
        'icon': PUSH_ICONS.get(category, '/icon-192.png'),
        'badge': PUSH_BADGE,
        'tag': tag or push_type,          # même tag = remplace la notif précédente du même type
        'url': url,
        'type': push_type,
        'category': category,
        'data': data or {},
        'requireInteraction': category == 'critique',  # reste visible jusqu'au clic
        'vibrate': [200, 100, 200] if category == 'critique' else [100],
    }
    return json.dumps(payload)


def send_push(subscription, title: str, body: str, push_type: str,
              url: str = '/', tag: str = None, data: dict = None) -> bool:
    """
    Envoie un push à une PushSubscription Django.
    Retourne True si succès, False sinon.
    """
    WebPusher = _get_webpush_sender()
    if not WebPusher:
        return False

    vapid_private_b64 = settings.VAPID_PRIVATE_KEY
    vapid_claims_email = settings.VAPID_CLAIMS_EMAIL

    if not vapid_private_b64:
        logger.warning("VAPID_PRIVATE_KEY non configurée — push ignoré")
        return False

    try:
        # Décoder la clé privée PEM depuis base64
        pem_bytes = base64.urlsafe_b64decode(vapid_private_b64 + '==')
        vapid_private_pem = pem_bytes.decode('utf-8')
    except Exception as e:
        logger.error(f"Erreur décodage VAPID_PRIVATE_KEY: {e}")
        return False

    subscription_info = {
        "endpoint": subscription.endpoint,
        "keys": {
            "p256dh": subscription.p256dh,
            "auth": subscription.auth,
        }
    }

    payload = _build_payload(title, body, push_type, url, tag, data)

    try:
        webpusher = WebPusher(subscription_info)
        response = webpusher.send(
            data=payload,
            vapid_private_key=vapid_private_pem,
            vapid_claims={"sub": f"mailto:{vapid_claims_email}"},
        )

        if response.status_code in (200, 201):
            return True
        elif response.status_code == 410:
            # Subscription expirée — désactiver
            subscription.is_active = False
            subscription.save(update_fields=['is_active'])
            logger.info(f"Subscription {subscription.id} expirée, désactivée.")
            return False
        else:
            logger.warning(f"Push failed [{response.status_code}]: {response.text}")
            return False

    except Exception as e:
        logger.error(f"Erreur envoi push: {e}")
        return False


def send_push_to_user(user, push_type: str, title: str, body: str,
                      url: str = '/', tag: str = None, data: dict = None) -> int:
    """
    Envoie un push à tous les appareils actifs d'un utilisateur.
    Vérifie les préférences avant envoi.
    Retourne le nombre de pushs envoyés avec succès.
    """
    from .models import PushSubscription, NotificationPreferences

    # Vérifier les préférences
    pref_field, _ = PUSH_TYPE_TO_PREF.get(push_type, ('', ''))
    if pref_field:
        try:
            prefs = NotificationPreferences.get_or_create_for_user(user)
            if not getattr(prefs, pref_field, True):
                logger.debug(f"Push '{push_type}' désactivé pour {user.username}")
                return 0
        except Exception:
            pass  # Si erreur lecture prefs, on envoie quand même

    subscriptions = PushSubscription.objects.filter(user=user, is_active=True)
    sent = 0
    for sub in subscriptions:
        if send_push(sub, title, body, push_type, url, tag, data):
            sent += 1

    return sent


def send_push_to_organization(organization, push_type: str, title: str, body: str,
                               url: str = '/', tag: str = None, data: dict = None) -> int:
    """Envoie un push à tous les membres actifs d'une organisation."""
    users = User.objects.filter(organization=organization, is_active=True)
    total = 0
    for user in users:
        total += send_push_to_user(user, push_type, title, body, url, tag, data)
    return total


# ─────────────────────────────────────────────────────────────────────────────
# Fonctions spécialisées par type de notification
# ─────────────────────────────────────────────────────────────────────────────

def notify_stock_rupture(user, product_name: str, product_id=None):
    return send_push_to_user(
        user, 'stock_rupture',
        title='🚨 Rupture de stock',
        body=f'{product_name} est en rupture de stock.',
        url=f'/products/{product_id}' if product_id else '/products',
        tag=f'stock_rupture_{product_id}',
        data={'product_id': str(product_id) if product_id else None},
    )


def notify_stock_bas(user, product_name: str, qty: int, threshold: int, product_id=None):
    return send_push_to_user(
        user, 'stock_bas',
        title='⚠️ Stock bas',
        body=f'{product_name} : {qty} unité(s) restantes (seuil : {threshold}).',
        url=f'/products/{product_id}' if product_id else '/products',
        tag=f'stock_bas_{product_id}',
    )


def notify_quota_atteint(user, quota_type: str, used: int, limit: int):
    labels = {
        'invoices': 'Factures', 'purchase_orders': 'Bons de commande',
        'ai_requests': 'Requêtes IA', 'clients': 'Clients',
        'suppliers': 'Fournisseurs', 'products': 'Produits',
    }
    label = labels.get(quota_type, quota_type)
    pct = int(used / limit * 100) if limit else 100
    return send_push_to_user(
        user, 'quota_atteint',
        title='🔴 Quota atteint',
        body=f'{label} : {used}/{limit} ({pct}%). Passez à un plan supérieur.',
        url='/settings?tab=subscription',
        tag=f'quota_{quota_type}',
    )


def notify_facture_retard(user, invoice_ref: str, days_late: int, invoice_id=None):
    return send_push_to_user(
        user, 'facture_retard',
        title='🔴 Facture en retard',
        body=f'Facture {invoice_ref} en retard de {days_late} jour(s).',
        url=f'/invoices/{invoice_id}' if invoice_id else '/invoices',
        tag=f'facture_retard_{invoice_id}',
    )


def notify_facture_brouillon(user, count: int):
    return send_push_to_user(
        user, 'facture_brouillon',
        title='📄 Factures brouillon',
        body=f'{count} facture(s) en brouillon depuis plus de 24h.',
        url='/invoices?status=draft',
        tag='facture_brouillon',
    )


def notify_bc_retard(user, po_ref: str, days_late: int, po_id=None):
    return send_push_to_user(
        user, 'bc_retard',
        title='⏰ Bon de commande en retard',
        body=f'BC {po_ref} non reçu depuis {days_late} jour(s).',
        url=f'/purchase-orders/{po_id}' if po_id else '/purchase-orders',
        tag=f'bc_retard_{po_id}',
    )


def notify_lot_expirant(user, product_name: str, days_left: int, product_id=None):
    return send_push_to_user(
        user, 'lot_expirant',
        title='📅 Lot expirant bientôt',
        body=f'{product_name} expire dans {days_left} jour(s).',
        url=f'/products/{product_id}' if product_id else '/products',
        tag=f'lot_expirant_{product_id}',
    )


def notify_insight_ia(user, title: str, message: str, url: str = '/ai-chat'):
    return send_push_to_user(
        user, 'insight_ia',
        title=f'💡 {title}',
        body=message[:120] + ('…' if len(message) > 120 else ''),
        url=url,
        tag='insight_ia',
    )


def notify_resume_hebdo(user, ca_semaine: float, factures_attente: int, alertes_stock: int):
    parts = []
    if ca_semaine > 0:
        parts.append(f'CA : {ca_semaine:,.0f} €')
    if factures_attente > 0:
        parts.append(f'{factures_attente} facture(s) en attente')
    if alertes_stock > 0:
        parts.append(f'{alertes_stock} alerte(s) stock')
    body = ' · '.join(parts) if parts else 'Tout est à jour cette semaine ✅'
    return send_push_to_user(
        user, 'resume_hebdo',
        title='📊 Résumé de la semaine',
        body=body,
        url='/dashboard',
        tag='resume_hebdo',
    )
