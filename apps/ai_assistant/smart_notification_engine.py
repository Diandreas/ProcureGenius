"""
SmartNotificationEngine — Moteur de notifications adaptatif.

Analyse le profil réel de chaque utilisateur (modules utilisés, données en attente)
et envoie uniquement les notifications pertinentes via push et/ou email.

Règles :
- Jamais suggérer un module que l'utilisateur n'a jamais utilisé (sauf onboarding J1-J7)
- Max 1 push non-critique par jour par utilisateur
- Max 1 email de rétention par semaine (critiques : illimités)
- Chaque type de notification a son propre cooldown
"""
import logging
import calendar
from dataclasses import dataclass, field
from typing import List
from datetime import timedelta

from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)

PRIORITY_SCORE = {'critical': 100, 'important': 50, 'info': 10}


@dataclass
class Notification:
    notif_type: str
    title: str
    body: str
    url: str
    priority: str        # 'critical' | 'important' | 'info'
    channel: str         # 'push' | 'email' | 'both'
    reference_id: str = ''
    email_subject: str = ''
    email_html: str = ''

    @property
    def priority_score(self):
        return PRIORITY_SCORE.get(self.priority, 0)


class SmartNotificationEngine:

    def __init__(self, user):
        self.user = user
        self.org = getattr(user, 'organization', None)
        self.now = timezone.now()
        self.profile = {}

    # ── Profil comportemental ─────────────────────────────────────────────────

    def _build_profile(self) -> dict:
        p = {
            'uses_invoices': False,
            'uses_suppliers': False,
            'uses_pos': False,
            'uses_contracts': False,
            'uses_products': False,
            'uses_clients': False,
            'uses_esourcing': False,
            'uses_accounting': False,
            'uses_ai': False,
            'days_since_signup': (self.now - self.user.date_joined).days,
        }
        p['is_new'] = p['days_since_signup'] <= 7

        if not self.org:
            return p

        checks = [
            ('uses_invoices',   'apps.invoicing.models',       'Invoice',       {'organization': self.org}),
            ('uses_suppliers',  'apps.suppliers.models',        'Supplier',      {'organization': self.org}),
            ('uses_pos',        'apps.purchase_orders.models',  'PurchaseOrder', {'organization': self.org}),
            ('uses_contracts',  'apps.contracts.models',        'Contract',      {'organization': self.org}),
            ('uses_products',   'apps.invoicing.models',        'Product',       {'organization': self.org}),
            ('uses_clients',    'apps.accounts.models',         'Client',        {'organization': self.org}),
            ('uses_esourcing',  'apps.e_sourcing.models',       'SourcingEvent', {'organization': self.org}),
            ('uses_accounting', 'apps.accounting.models',       'JournalEntry',  {'created_by__organization': self.org}),
        ]
        for key, module_path, model_name, filters in checks:
            try:
                import importlib
                mod = importlib.import_module(module_path)
                model = getattr(mod, model_name)
                p[key] = model.objects.filter(**filters).exists()
            except Exception:
                pass

        try:
            from .models import Conversation
            p['uses_ai'] = Conversation.objects.filter(user=self.user).exists()
        except Exception:
            pass

        return p

    # ── Rate limiting ─────────────────────────────────────────────────────────

    def _recently_sent(self, notif_type: str, hours: int = 24) -> bool:
        try:
            from .models import NotificationLog
            cutoff = self.now - timedelta(hours=hours)
            return NotificationLog.objects.filter(
                user=self.user, notification_type=notif_type, sent_at__gte=cutoff,
            ).exists()
        except Exception:
            return False

    def _log(self, notif_type: str, channel: str, reference_id: str = ''):
        try:
            from .models import NotificationLog
            NotificationLog.objects.create(
                user=self.user, notification_type=notif_type,
                channel=channel, reference_id=reference_id or '',
            )
        except Exception as e:
            logger.error(f"NotificationLog write error: {e}")

    # ── Checkers par module ───────────────────────────────────────────────────

    def _check_invoices(self) -> List[Notification]:
        results = []
        try:
            from apps.invoicing.models import Invoice

            # Factures impayées > 7 jours — critique
            cutoff = self.now.date() - timedelta(days=7)
            overdue = Invoice.objects.filter(
                organization=self.org, status__in=['sent', 'overdue'], due_date__lt=cutoff,
            ).order_by('due_date')
            if overdue.exists() and not self._recently_sent('invoice_overdue', 48):
                worst = overdue.first()
                days_late = (self.now.date() - worst.due_date).days
                count = overdue.count()
                results.append(Notification(
                    notif_type='invoice_overdue',
                    title=f'⚠️ {count} facture(s) impayée(s)',
                    body=f'La plus ancienne ({worst.invoice_number}) est en retard de {days_late}j.',
                    url=f'/invoices/{worst.id}',
                    priority='critical', channel='both',
                    reference_id=str(worst.id),
                    email_subject=f'Action requise : {count} facture(s) impayée(s)',
                    email_html=self._tpl_invoice_overdue(overdue),
                ))

            # Brouillons > 24h — important
            drafts = Invoice.objects.filter(
                organization=self.org, status='draft',
                created_at__lt=self.now - timedelta(hours=24),
            )
            if drafts.exists() and not self._recently_sent('invoice_draft', 48):
                count = drafts.count()
                results.append(Notification(
                    notif_type='invoice_draft',
                    title=f'📄 {count} facture(s) non envoyée(s)',
                    body='Ces factures sont en brouillon depuis plus de 24h.',
                    url='/invoices?status=draft',
                    priority='important', channel='push',
                ))
        except Exception as e:
            logger.error(f"_check_invoices: {e}")
        return results

    def _check_products(self) -> List[Notification]:
        results = []
        try:
            from apps.invoicing.models import Product

            base = Product.objects.filter(organization=self.org, product_type='physical')

            # Rupture totale — critique
            rupture = base.filter(stock_quantity=0)
            if rupture.exists() and not self._recently_sent('stock_rupture', 24):
                count = rupture.count()
                first = rupture.first()
                body = (f'"{first.name}" et {count-1} autre(s) sont épuisés.'
                        if count > 1 else f'"{first.name}" est épuisé.')
                results.append(Notification(
                    notif_type='stock_rupture',
                    title=f'🔴 Rupture de stock : {count} produit(s)',
                    body=body,
                    url='/products?filter=out_of_stock',
                    priority='critical', channel='both',
                    email_subject=f'Rupture de stock : {count} produit(s) épuisé(s)',
                    email_html=self._tpl_stock_rupture(rupture),
                ))

            # Stock bas (pas encore à 0) — important
            low = [p for p in base.filter(stock_quantity__gt=0)
                   if p.stock_quantity <= (p.low_stock_threshold or 0)]
            if low and not self._recently_sent('stock_low', 48):
                results.append(Notification(
                    notif_type='stock_low',
                    title=f'🟠 {len(low)} produit(s) bientôt épuisé(s)',
                    body='Pensez à réapprovisionner avant la rupture.',
                    url='/products?filter=low_stock',
                    priority='important', channel='push',
                ))

            # Lots expirant dans 30 jours — important
            try:
                from apps.invoicing.models import ProductBatch
                today = self.now.date()
                expiring = ProductBatch.objects.filter(
                    product__organization=self.org,
                    expiration_date__gte=today,
                    expiration_date__lte=today + timedelta(days=30),
                    current_quantity__gt=0,
                )
                if expiring.exists() and not self._recently_sent('batch_expiring', 72):
                    batch = expiring.order_by('expiration_date').first()
                    days_left = (batch.expiration_date - today).days
                    results.append(Notification(
                        notif_type='batch_expiring',
                        title=f'⏰ Lot expirant dans {days_left} jours',
                        body=f'Lot {batch.batch_number} de "{batch.product.name}".',
                        url='/products',
                        priority='important', channel='push',
                    ))
            except Exception:
                pass
        except Exception as e:
            logger.error(f"_check_products: {e}")
        return results

    def _check_purchase_orders(self) -> List[Notification]:
        results = []
        try:
            from apps.purchase_orders.models import PurchaseOrder
            overdue = [
                po for po in PurchaseOrder.objects.filter(
                    organization=self.org, status__in=['sent', 'approved', 'confirmed']
                ) if getattr(po, 'is_overdue', False)
            ]
            if overdue and not self._recently_sent('po_overdue', 48):
                po = overdue[0]
                results.append(Notification(
                    notif_type='po_overdue',
                    title='📦 Bon de commande en retard',
                    body=f'{po.po_number} — la livraison attendue est dépassée.',
                    url=f'/purchase-orders/{po.id}',
                    priority='important', channel='push',
                    reference_id=str(po.id),
                ))
        except Exception as e:
            logger.error(f"_check_purchase_orders: {e}")
        return results

    def _check_contracts(self) -> List[Notification]:
        results = []
        try:
            from apps.contracts.models import Contract, ContractMilestone

            # Contrats expirés — critique
            expired = Contract.objects.filter(
                organization=self.org, status='active', end_date__lt=self.now.date(),
            )
            if expired.exists() and not self._recently_sent('contract_expired', 72):
                c = expired.first()
                results.append(Notification(
                    notif_type='contract_expired',
                    title=f'❌ {expired.count()} contrat(s) expiré(s)',
                    body='Des contrats actifs ont dépassé leur date de fin.',
                    url=f'/contracts/{c.id}',
                    priority='critical', channel='both',
                    email_subject='Contrats expirés — action requise',
                    email_html=self._tpl_contract_expired(expired),
                ))

            # Expiration dans 30 jours — important
            in_30 = self.now.date() + timedelta(days=30)
            expiring = Contract.objects.filter(
                organization=self.org, status__in=['active', 'expiring_soon'],
                end_date__gte=self.now.date(), end_date__lte=in_30,
            ).order_by('end_date')
            if expiring.exists() and not self._recently_sent('contract_expiring', 72):
                c = expiring.first()
                days_left = (c.end_date - self.now.date()).days
                results.append(Notification(
                    notif_type='contract_expiring',
                    title=f'⏰ Contrat à renouveler ({days_left}j)',
                    body=f'Un contrat expire dans {days_left} jours.',
                    url=f'/contracts/{c.id}',
                    priority='important', channel='both',
                    email_subject=f'Contrat expirant dans {days_left} jours',
                    email_html=self._tpl_contract_expiring(c, days_left),
                ))

            # Jalons en retard — important
            overdue_milestones = [
                m for m in ContractMilestone.objects.filter(
                    contract__organization=self.org, status='pending'
                ).select_related('contract')
                if getattr(m, 'is_overdue', False)
            ]
            if overdue_milestones and not self._recently_sent('contract_milestone', 72):
                m = overdue_milestones[0]
                results.append(Notification(
                    notif_type='contract_milestone',
                    title='📋 Jalon contractuel en retard',
                    body=f'Le jalon "{m.title}" devait être complété avant le {m.due_date}.',
                    url=f'/contracts/{m.contract_id}',
                    priority='important', channel='push',
                ))
        except Exception as e:
            logger.error(f"_check_contracts: {e}")
        return results

    def _check_esourcing(self) -> List[Notification]:
        results = []
        try:
            from apps.e_sourcing.models import SourcingEvent, SupplierBid

            # Appels d'offres qui ferment dans < 3 jours
            in_3 = self.now + timedelta(days=3)
            closing = SourcingEvent.objects.filter(
                organization=self.org, status__in=['published', 'in_progress'],
                submission_deadline__gte=self.now, submission_deadline__lte=in_3,
            )
            if closing.exists() and not self._recently_sent('esourcing_deadline', 24):
                event = closing.order_by('submission_deadline').first()
                hours_left = int((event.submission_deadline - self.now).total_seconds() / 3600)
                results.append(Notification(
                    notif_type='esourcing_deadline',
                    title=f'⏳ Appel d\'offres : {hours_left}h restantes',
                    body=f'"{event.title}" se ferme bientôt.',
                    url=f'/e-sourcing/events/{event.id}',
                    priority='important', channel='both',
                    email_subject=f'Appel d\'offres : clôture dans {hours_left}h',
                    email_html=self._tpl_esourcing_deadline(event, hours_left),
                ))

            # Nouvelles offres non évaluées
            unread = SupplierBid.objects.filter(
                sourcing_event__organization=self.org,
                status='submitted', evaluated_by__isnull=True,
            )
            if unread.exists() and not self._recently_sent('esourcing_bids', 24):
                count = unread.count()
                results.append(Notification(
                    notif_type='esourcing_bids',
                    title=f'📬 {count} nouvelle(s) offre(s) reçue(s)',
                    body='Des fournisseurs ont soumis leurs offres. Évaluez-les.',
                    url='/e-sourcing/events',
                    priority='important', channel='push',
                ))
        except Exception as e:
            logger.error(f"_check_esourcing: {e}")
        return results

    def _check_accounting(self) -> List[Notification]:
        results = []
        try:
            from apps.accounting.models import JournalEntry

            # Fin de mois dans 3 jours avec des brouillons en attente
            last_day = calendar.monthrange(self.now.year, self.now.month)[1]
            days_to_end = last_day - self.now.day
            if days_to_end <= 3 and not self._recently_sent('accounting_month_end', 72):
                drafts = JournalEntry.objects.filter(
                    created_by__organization=self.org, status='draft'
                ).count()
                if drafts > 0:
                    results.append(Notification(
                        notif_type='accounting_month_end',
                        title=f'📒 Clôture du mois dans {days_to_end}j',
                        body=f'{drafts} écriture(s) comptable(s) en brouillon à valider.',
                        url='/accounting',
                        priority='important', channel='push',
                    ))
        except Exception as e:
            logger.error(f"_check_accounting: {e}")
        return results

    def _check_clients(self) -> List[Notification]:
        """Clients réguliers qui n'ont pas été facturés depuis 30+ jours."""
        results = []
        try:
            from apps.invoicing.models import Invoice
            from apps.accounts.models import Client
            import django.db.models as djmodels

            cutoff = self.now - timedelta(days=30)
            # Clients ayant déjà au moins 1 facture mais rien depuis 30 jours
            active_clients = Client.objects.filter(organization=self.org, is_active=True)
            for client in active_clients[:20]:  # limite pour perf
                last_invoice = Invoice.objects.filter(
                    organization=self.org, client=client
                ).order_by('-created_at').first()
                if last_invoice and last_invoice.created_at < cutoff:
                    if not self._recently_sent(f'client_inactive_{client.id}', 168):
                        results.append(Notification(
                            notif_type=f'client_inactive_{client.id}',
                            title=f'💼 Relancer {client.name} ?',
                            body=f'Vous n\'avez pas facturé {client.name} depuis plus de 30 jours.',
                            url=f'/clients/{client.id}',
                            priority='info', channel='push',
                            reference_id=str(client.id),
                        ))
                        break  # 1 seul client à la fois
        except Exception as e:
            logger.error(f"_check_clients: {e}")
        return results

    def _check_onboarding(self) -> List[Notification]:
        """Suggestions adaptées aux nouveaux utilisateurs basées sur leur activité réelle."""
        results = []
        if not self.profile.get('is_new'):
            return results

        days = self.profile.get('days_since_signup', 0)

        try:
            p = self.profile

            # A des produits mais pas de facture → suggérer facture client
            if p['uses_products'] and not p['uses_invoices']:
                if not self._recently_sent('onboarding_invoice', 48):
                    results.append(Notification(
                        notif_type='onboarding_invoice',
                        title='💡 Envoyez votre première facture',
                        body='Vous avez des produits — créez une facture client en 2 minutes.',
                        url='/invoices/new', priority='info', channel='push',
                    ))

            # A des clients mais pas de facture
            elif p['uses_clients'] and not p['uses_invoices']:
                if not self._recently_sent('onboarding_invoice', 48):
                    results.append(Notification(
                        notif_type='onboarding_invoice',
                        title='💡 Facturez vos clients',
                        body='Vous avez des clients enregistrés — envoyez-leur une facture.',
                        url='/invoices/new', priority='info', channel='push',
                    ))

            # J+2 et rien fait du tout → suggérer la première facture
            elif days >= 2 and not any([p['uses_invoices'], p['uses_products'], p['uses_clients']]):
                if not self._recently_sent('onboarding_start', 72):
                    results.append(Notification(
                        notif_type='onboarding_start',
                        title='👋 Commencez par une facture',
                        body='Créez votre première facture — c\'est utile dès aujourd\'hui.',
                        url='/invoices/new', priority='info', channel='both',
                        email_subject='Votre première facture vous attend sur Procura',
                        email_html=self._tpl_onboarding_start(),
                    ))

            # J+3 : n'a pas encore utilisé l'IA
            if days >= 3 and not p['uses_ai'] and not self._recently_sent('onboarding_ai', 168):
                results.append(Notification(
                    notif_type='onboarding_ai',
                    title='🤖 Posez une question à votre assistant',
                    body='"Montre-moi mes factures du mois" — il répond en 10 secondes.',
                    url='/ai-chat', priority='info', channel='push',
                ))

        except Exception as e:
            logger.error(f"_check_onboarding: {e}")
        return results

    # ── Templates email (HTML inline) ────────────────────────────────────────

    def _email_base(self, title: str, content: str) -> str:
        name = self.user.first_name or self.user.username
        url = getattr(settings, 'FRONTEND_URL', 'https://app.procura.com')
        return f"""
<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f8fafc;">
  <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
    <h2 style="color:#0f172a;margin:0 0 4px;font-size:20px;">{title}</h2>
    <p style="color:#64748b;margin:0 0 20px;font-size:14px;">Bonjour {name},</p>
    {content}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="color:#94a3b8;font-size:12px;">
      Vous recevez cet email car vous avez un compte Procura.<br>
      <a href="{url}/settings" style="color:#2563eb;">Gérer mes notifications</a>
    </p>
  </div>
</div>"""

    def _btn(self, label: str, url_path: str) -> str:
        url = getattr(settings, 'FRONTEND_URL', 'https://app.procura.com')
        return (f'<a href="{url}{url_path}" style="display:inline-block;background:#2563eb;'
                f'color:white;padding:12px 24px;border-radius:8px;text-decoration:none;'
                f'font-weight:600;font-size:14px;">{label}</a>')

    def _tpl_invoice_overdue(self, invoices) -> str:
        rows = ''.join(
            f'<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">{i.invoice_number}</td>'
            f'<td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">{i.due_date}</td>'
            f'<td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#ef4444;font-weight:600;">'
            f'{(timezone.now().date() - i.due_date).days}j de retard</td></tr>'
            for i in invoices[:5]
        )
        content = f"""
<p style="color:#334155;margin:0 0 16px;">Vous avez des factures impayées qui nécessitent votre attention :</p>
<table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden;margin-bottom:20px;">
  <tr style="background:#e2e8f0;"><th style="padding:8px 12px;text-align:left;font-size:13px;">Facture</th>
  <th style="padding:8px 12px;text-align:left;font-size:13px;">Échéance</th>
  <th style="padding:8px 12px;text-align:left;font-size:13px;">Retard</th></tr>
  {rows}
</table>
{self._btn('Voir les factures impayées', '/invoices?status=overdue')}"""
        return self._email_base('Factures en retard de paiement', content)

    def _tpl_stock_rupture(self, products) -> str:
        names = ', '.join(f'"{p.name}"' for p in list(products)[:3])
        if products.count() > 3:
            names += f' et {products.count()-3} autre(s)'
        content = f"""
<p style="color:#334155;margin:0 0 8px;">Ces produits sont <strong style="color:#ef4444;">en rupture de stock</strong> :</p>
<p style="color:#334155;margin:0 0 16px;">{names}</p>
<p style="color:#64748b;margin:0 0 20px;font-size:14px;">Vos clients ne peuvent plus commander ces articles.</p>
{self._btn('Réapprovisionner maintenant', '/products?filter=out_of_stock')}"""
        return self._email_base('Rupture de stock détectée', content)

    def _tpl_contract_expired(self, contracts) -> str:
        content = f"""
<p style="color:#334155;margin:0 0 16px;">{contracts.count()} contrat(s) ont expiré et nécessitent votre attention.</p>
{self._btn('Gérer les contrats', '/contracts')}"""
        return self._email_base('Contrats expirés — action requise', content)

    def _tpl_contract_expiring(self, contract, days_left: int) -> str:
        content = f"""
<p style="color:#334155;margin:0 0 8px;">Un contrat expire dans <strong>{days_left} jours</strong>.</p>
<p style="color:#64748b;margin:0 0 20px;font-size:14px;">Pensez à le renouveler avant l'expiration pour éviter toute interruption.</p>
{self._btn('Voir le contrat', f'/contracts/{contract.id}')}"""
        return self._email_base(f'Contrat expirant dans {days_left} jours', content)

    def _tpl_esourcing_deadline(self, event, hours_left: int) -> str:
        content = f"""
<p style="color:#334155;margin:0 0 8px;">Votre appel d'offres <strong>"{event.title}"</strong> se ferme dans <strong>{hours_left} heures</strong>.</p>
<p style="color:#64748b;margin:0 0 20px;font-size:14px;">Consultez les offres reçues et prenez votre décision avant la clôture.</p>
{self._btn('Voir les offres', f'/e-sourcing/events/{event.id}')}"""
        return self._email_base(f"Appel d'offres : clôture dans {hours_left}h", content)

    def _tpl_onboarding_start(self) -> str:
        name = self.user.first_name or self.user.username
        content = f"""
<p style="color:#334155;margin:0 0 8px;">Votre compte Procura est prêt, {name}.</p>
<p style="color:#64748b;margin:0 0 16px;font-size:14px;">La première chose à faire c'est de créer une facture — vous pourrez la télécharger en PDF et l'envoyer à votre client immédiatement.</p>
{self._btn('Créer ma première facture', '/invoices/new')}"""
        return self._email_base('Commencez par envoyer une facture', content)

    # ── Envoi ─────────────────────────────────────────────────────────────────

    def _send_push(self, notif: Notification):
        try:
            from .web_push_service import send_push_to_user
            send_push_to_user(
                self.user, notif.notif_type,
                title=notif.title, body=notif.body,
                url=notif.url, tag=notif.notif_type,
            )
        except Exception as e:
            logger.error(f"Push send ({notif.notif_type}): {e}")

    def _send_email(self, notif: Notification):
        if not self.user.email:
            return
        try:
            send_mail(
                subject=notif.email_subject or notif.title,
                message=notif.body,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@procura.app'),
                recipient_list=[self.user.email],
                html_message=notif.email_html or None,
                fail_silently=True,
            )
        except Exception as e:
            logger.error(f"Email send ({notif.notif_type}): {e}")

    # ── Point d'entrée ────────────────────────────────────────────────────────

    def run(self):
        if not self.org:
            return

        self.profile = self._build_profile()
        p = self.profile
        candidates: List[Notification] = []

        # Checkers actifs uniquement pour les modules réellement utilisés
        if p['uses_invoices'] or p['is_new']:
            candidates += self._check_invoices()
        if p['uses_products']:
            candidates += self._check_products()
        if p['uses_pos']:
            candidates += self._check_purchase_orders()
        if p['uses_contracts']:
            candidates += self._check_contracts()
        if p['uses_esourcing']:
            candidates += self._check_esourcing()
        if p['uses_accounting']:
            candidates += self._check_accounting()
        if p['uses_clients'] and p['uses_invoices']:
            candidates += self._check_clients()

        candidates += self._check_onboarding()

        # Trier : critiques d'abord
        candidates.sort(key=lambda n: n.priority_score, reverse=True)

        # Rate limiting global : 1 push non-critique/jour, 1 email rétention/semaine
        push_daily_used = self._recently_sent('__push_daily__', 24)
        email_weekly_used = self._recently_sent('__email_weekly__', 168)

        for notif in candidates:
            is_critical = notif.priority == 'critical'
            do_push = notif.channel in ('push', 'both')
            do_email = notif.channel in ('email', 'both') and bool(notif.email_html)

            if do_push:
                if is_critical or not push_daily_used:
                    self._send_push(notif)
                    self._log(notif.notif_type, 'push', notif.reference_id)
                    if not is_critical:
                        self._log('__push_daily__', 'push')
                        push_daily_used = True

            if do_email:
                if is_critical or not email_weekly_used:
                    self._send_email(notif)
                    self._log(notif.notif_type, 'email', notif.reference_id)
                    if not is_critical:
                        self._log('__email_weekly__', 'email')
                        email_weekly_used = True
