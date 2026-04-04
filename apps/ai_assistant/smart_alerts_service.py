"""
Smart Alerts Service — Alertes business calculées par algo pur (sans IA/Mistral).
Utilisé par SmartAlertsView pour le widget dashboard.
"""
from datetime import date, timedelta
from django.db.models import Count, Q
import logging

logger = logging.getLogger(__name__)


class SmartAlertsService:
    """Calcule les alertes business prioritaires par ORM pur."""

    def __init__(self, user):
        self.user = user
        self.organization = getattr(user, 'organization', None)
        self.today = date.today()

    def get_alerts(self):
        """
        Retourne la liste des alertes triées par priorité décroissante.
        Chaque alerte : { id, type, category, title, detail, count, action_label, action_url, priority }
        """
        if not self.organization:
            return []

        alerts = []
        try:
            alerts += self._overdue_invoices()
        except Exception as e:
            logger.warning(f"SmartAlerts overdue_invoices error: {e}")
        try:
            alerts += self._overdue_pos()
        except Exception as e:
            logger.warning(f"SmartAlerts overdue_pos error: {e}")
        try:
            alerts += self._expired_quotes()
        except Exception as e:
            logger.warning(f"SmartAlerts expired_quotes error: {e}")
        try:
            alerts += self._duplicate_invoices()
        except Exception as e:
            logger.warning(f"SmartAlerts duplicates error: {e}")
        try:
            alerts += self._low_stock()
        except Exception as e:
            logger.warning(f"SmartAlerts low_stock error: {e}")

        alerts.sort(key=lambda a: a['priority'], reverse=True)
        return alerts

    # ── 1. Factures en retard > 7 jours ──────────────────────────────────────

    def _overdue_invoices(self):
        from apps.invoicing.models import Invoice
        cutoff = self.today - timedelta(days=7)
        qs = Invoice.objects.filter(
            created_by__organization=self.organization,
            status__in=['sent', 'overdue'],
            due_date__lt=cutoff,
        ).order_by('due_date')

        count = qs.count()
        if count == 0:
            return []

        oldest = qs.first()
        days_late = (self.today - oldest.due_date).days
        total = sum(float(inv.get_balance_due()) for inv in qs[:20])

        return [{
            'id': 'overdue_invoices',
            'type': 'error',
            'category': 'invoices',
            'title': f"{count} facture{'s' if count > 1 else ''} en retard",
            'detail': f"Total : {total:,.0f} € — Plus ancienne : {days_late} jours de retard",
            'count': count,
            'action_label': 'Voir les impayés',
            'action_url': '/invoices?status=overdue',
            'priority': 9,
        }]

    # ── 2. Bons de commande en retard ────────────────────────────────────────

    def _overdue_pos(self):
        from apps.purchase_orders.models import PurchaseOrder
        qs = PurchaseOrder.objects.filter(
            created_by__organization=self.organization,
            status__in=['draft', 'pending', 'approved', 'sent'],
            required_date__lt=self.today,
        ).order_by('required_date')

        count = qs.count()
        if count == 0:
            return []

        oldest = qs.first()
        days_late = (self.today - oldest.required_date).days

        return [{
            'id': 'overdue_pos',
            'type': 'warning',
            'category': 'purchase_orders',
            'title': f"{count} bon{'s' if count > 1 else ''} de commande en retard",
            'detail': f"Plus ancien : {days_late} jours de retard — {oldest.supplier.name if oldest.supplier else 'fournisseur inconnu'}",
            'count': count,
            'action_label': 'Voir les BCs',
            'action_url': '/purchase-orders?overdue=true',
            'priority': 7,
        }]

    # ── 3. Devis expirés cette semaine ───────────────────────────────────────

    def _expired_quotes(self):
        from apps.invoicing.models import Invoice
        week_ago = self.today - timedelta(days=7)
        qs = Invoice.objects.filter(
            created_by__organization=self.organization,
            status='quote',
            valid_until__lt=self.today,
            valid_until__gte=week_ago,
        )

        count = qs.count()
        if count == 0:
            return []

        return [{
            'id': 'expired_quotes',
            'type': 'warning',
            'category': 'invoices',
            'title': f"{count} devis expiré{'s' if count > 1 else ''} cette semaine",
            'detail': 'Ces devis ne sont plus valables — relancer les clients concernés',
            'count': count,
            'action_label': 'Voir les devis',
            'action_url': '/invoices?status=quote',
            'priority': 6,
        }]

    # ── 4. Doublons potentiels (même client + montant sur 15 jours) ──────────

    def _duplicate_invoices(self):
        from apps.invoicing.models import Invoice
        cutoff = self.today - timedelta(days=15)
        duplicates = (
            Invoice.objects.filter(
                created_by__organization=self.organization,
                status__in=['draft', 'sent', 'quote'],
                created_at__date__gte=cutoff,
                client__isnull=False,
            )
            .values('client', 'total_amount')
            .annotate(cnt=Count('id'))
            .filter(cnt__gt=1)
        )

        count = duplicates.count()
        if count == 0:
            return []

        return [{
            'id': 'duplicate_invoices',
            'type': 'error',
            'category': 'invoices',
            'title': f"{count} doublon{'s' if count > 1 else ''} potentiel{'s' if count > 1 else ''} détecté{'s' if count > 1 else ''}",
            'detail': 'Même client et même montant dans les 15 derniers jours — vérifier avant paiement',
            'count': count,
            'action_label': 'Vérifier',
            'action_url': '/invoices',
            'priority': 8,
        }]

    # ── 5. Stock critique ────────────────────────────────────────────────────

    def _low_stock(self):
        from apps.invoicing.models import Product
        from django.db.models import F

        low_products = Product.objects.filter(
            organization=self.organization,
            product_type='physical',
            is_active=True,
            stock_quantity__lte=F('low_stock_threshold'),
        )

        out_of_stock = low_products.filter(stock_quantity=0).count()
        low_count = low_products.count()

        if low_count == 0:
            return []

        alerts = []
        if out_of_stock > 0:
            alerts.append({
                'id': 'out_of_stock',
                'type': 'error',
                'category': 'stock',
                'title': f"{out_of_stock} produit{'s' if out_of_stock > 1 else ''} en rupture de stock",
                'detail': 'Stock à zéro — commande urgente requise',
                'count': out_of_stock,
                'action_label': 'Voir le stock',
                'action_url': '/products?stock=out',
                'priority': 10,
            })

        low_only = low_count - out_of_stock
        if low_only > 0:
            alerts.append({
                'id': 'low_stock',
                'type': 'warning',
                'category': 'stock',
                'title': f"{low_only} produit{'s' if low_only > 1 else ''} en stock bas",
                'detail': 'Niveau sous le seuil minimum — penser à réapprovisionner',
                'count': low_only,
                'action_label': 'Voir le stock',
                'action_url': '/products?stock=low',
                'priority': 7,
            })

        return alerts
