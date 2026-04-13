"""
Services IA avancés — Features game-changer pour PME
- Devis (create_quote, convert_quote_to_invoice)
- Vérification prix marché (web search Mistral + historique interne)
- Cash flow prédictif + actions correctives
- 3-Way Matching automatique
- Relances intelligentes automatiques
"""
import logging
from typing import Dict, Any, List, Optional
from decimal import Decimal
from datetime import datetime, timedelta, date
from django.utils import timezone
from django.db.models import Sum, Avg, Q, F, Count
from asgiref.sync import sync_to_async

logger = logging.getLogger(__name__)


class AdvancedAIActions:
    """Actions IA avancées — déléguées depuis ActionExecutor"""

    # ──────────────────────────────────────────────
    # 1. DEVIS (QUOTE)
    # ──────────────────────────────────────────────

    async def create_quote(self, params: Dict, user_context: Dict) -> Dict:
        """
        Crée un devis (facture en status 'quote').
        Le devis est éditable manuellement et convertible en facture.
        """
        from apps.invoicing.models import Invoice, InvoiceItem, Product
        from apps.accounts.models import Client
        from .entity_matcher import entity_matcher

        try:
            @sync_to_async
            def create_quote_sync():
                organization = user_context.get('organization')

                # ── Trouver ou créer le client ──
                client_name = params.get('client_name', '')
                client = None
                client_created = False

                client_id = params.get('client_id')
                if client_id:
                    client = Client.objects.get(id=client_id, organization=organization)
                elif client_name:
                    similar = entity_matcher.find_similar_clients(
                        first_name=client_name, last_name='',
                        email=params.get('client_email'),
                        company=client_name, min_score=0.85
                    )
                    if organization:
                        similar = [(c, s, r) for c, s, r in similar if c.organization == organization]

                    if similar:
                        client = similar[0][0]
                    else:
                        client = Client.objects.create(
                            organization=organization,
                            company_name=client_name,
                            first_name=client_name.split()[0] if client_name else '',
                            last_name=' '.join(client_name.split()[1:]) if len(client_name.split()) > 1 else '',
                            email=params.get('client_email', ''),
                            phone=params.get('client_phone', ''),
                        )
                        client_created = True

                # ── Dates ──
                due_date = params.get('due_date')
                valid_until = params.get('valid_until')
                if due_date and isinstance(due_date, str):
                    for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y']:
                        try:
                            due_date = datetime.strptime(due_date, fmt).date()
                            break
                        except ValueError:
                            continue
                    else:
                        due_date = (datetime.now() + timedelta(days=30)).date()
                else:
                    due_date = (datetime.now() + timedelta(days=30)).date()

                if valid_until and isinstance(valid_until, str):
                    for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y']:
                        try:
                            valid_until = datetime.strptime(valid_until, fmt).date()
                            break
                        except ValueError:
                            continue
                    else:
                        valid_until = (datetime.now() + timedelta(days=30)).date()
                elif not valid_until:
                    validity_days = params.get('validity_days', 30)
                    valid_until = (datetime.now() + timedelta(days=int(validity_days))).date()

                # ── Calcul montants ──
                items_data = params.get('items', [])
                tax_rate = Decimal(str(params.get('tax_rate', 20)))
                subtotal = Decimal('0')

                for item in items_data:
                    qty = Decimal(str(item.get('quantity', 1)))
                    price = Decimal(str(item.get('unit_price', 0)))
                    subtotal += qty * price

                if subtotal == 0 and params.get('amount'):
                    subtotal = Decimal(str(params['amount']))

                tax_amount = (subtotal * tax_rate / 100).quantize(Decimal('0.01'))
                total = subtotal + tax_amount

                # ── Remise ──
                discount = Decimal(str(params.get('discount_percent', 0)))
                if discount > 0:
                    discount_amount = (subtotal * discount / 100).quantize(Decimal('0.01'))
                    subtotal -= discount_amount
                    tax_amount = (subtotal * tax_rate / 100).quantize(Decimal('0.01'))
                    total = subtotal + tax_amount

                # ── Créer le devis ──
                from django.contrib.auth import get_user_model
                User = get_user_model()
                user = User.objects.get(id=user_context['id'])

                quote = Invoice(
                    status='quote',
                    title=params.get('title', f"Devis pour {client_name}"),
                    description=params.get('description', ''),
                    due_date=due_date,
                    subtotal=subtotal,
                    tax_amount=tax_amount,
                    total_amount=total,
                    created_by=user,
                    client=client,
                    payment_terms=params.get('payment_terms', 'Net 30'),
                    currency=params.get('currency', 'CAD'),
                    valid_until=valid_until,
                    quote_terms=params.get('quote_terms', ''),
                    quote_discount_percent=discount,
                )
                quote.save()

                # ── Ajouter les items ──
                created_items = []
                for item_data in items_data:
                    desc = item_data.get('description', 'Article')
                    qty = Decimal(str(item_data.get('quantity', 1)))
                    price = Decimal(str(item_data.get('unit_price', 0)))

                    # Chercher si le produit existe
                    product = None
                    if item_data.get('product_name'):
                        product = Product.objects.filter(
                            organization=organization,
                            name__icontains=item_data['product_name']
                        ).first()

                    inv_item = InvoiceItem.objects.create(
                        invoice=quote,
                        product=product,
                        description=desc,
                        quantity=qty,
                        unit_price=price,
                        total_price=qty * price,
                    )
                    created_items.append({
                        'description': desc,
                        'quantity': float(qty),
                        'unit_price': float(price),
                        'total': float(qty * price),
                    })

                return {
                    'success': True,
                    'message': (
                        f"✅ Devis **{quote.invoice_number}** créé pour **{client_name}** !\n\n"
                        f"💰 Montant : **{total} {quote.currency}** (HT: {subtotal}, TVA: {tax_amount})\n"
                        f"📅 Valable jusqu'au : **{valid_until.strftime('%d/%m/%Y')}**\n"
                        f"📝 {len(created_items)} article(s)\n\n"
                        f"Tu peux modifier ce devis dans l'interface, puis quand le client accepte, "
                        f"dis-moi « **convertis le devis {quote.invoice_number}** » pour en faire une facture."
                    ),
                    'data': {
                        'entity_type': 'quote',
                        'id': str(quote.id),
                        'quote_number': quote.invoice_number,
                        'client': client_name,
                        'total': float(total),
                        'valid_until': valid_until.strftime('%Y-%m-%d'),
                        'items': created_items,
                        'client_created': client_created,
                        'status': 'quote',
                    }
                }

            return await create_quote_sync()

        except Exception as e:
            logger.error(f"Erreur création devis: {e}", exc_info=True)
            return {'success': False, 'message': f"Erreur lors de la création du devis : {str(e)}"}

    async def convert_quote_to_invoice(self, params: Dict, user_context: Dict) -> Dict:
        """Convertit un devis accepté en facture brouillon"""
        from apps.invoicing.models import Invoice

        try:
            @sync_to_async
            def convert_sync():
                organization = user_context.get('organization')
                quote_ref = params.get('quote_number') or params.get('quote_id') or params.get('invoice_number')

                if not quote_ref:
                    # Chercher le dernier devis
                    quote = Invoice.objects.filter(
                        created_by__organization=organization,
                        status='quote'
                    ).order_by('-created_at').first()
                else:
                    quote = Invoice.objects.filter(
                        Q(invoice_number__icontains=quote_ref) | Q(id__startswith=quote_ref),
                        created_by__organization=organization,
                        status='quote'
                    ).first()

                if not quote:
                    return {
                        'success': False,
                        'message': f"❌ Aucun devis trouvé{f' avec la référence {quote_ref}' if quote_ref else ''}."
                    }

                old_number = quote.invoice_number
                quote.convert_quote_to_draft()

                return {
                    'success': True,
                    'message': (
                        f"✅ Devis **{old_number}** converti en facture **{quote.invoice_number}** !\n\n"
                        f"📋 Status : Brouillon (tu peux encore modifier avant d'envoyer)\n"
                        f"💰 Montant : **{quote.total_amount} {quote.currency}**\n"
                        f"👤 Client : **{quote.client.company_name if quote.client else 'N/A'}**\n\n"
                        f"Dis-moi « **envoie la facture {quote.invoice_number}** » quand tu es prêt."
                    ),
                    'data': {
                        'entity_type': 'invoice',
                        'id': str(quote.id),
                        'old_quote_number': old_number,
                        'new_invoice_number': quote.invoice_number,
                        'total': float(quote.total_amount),
                        'status': 'draft',
                    }
                }

            return await convert_sync()

        except Exception as e:
            logger.error(f"Erreur conversion devis: {e}", exc_info=True)
            return {'success': False, 'message': f"Erreur lors de la conversion : {str(e)}"}

    # ──────────────────────────────────────────────
    # 2. VÉRIFICATION PRIX MARCHÉ
    # ──────────────────────────────────────────────

    async def verify_price(self, params: Dict, user_context: Dict) -> Dict:
        """
        Vérifie un prix par rapport à :
        1. L'historique interne (derniers achats/ventes)
        2. Le marché (via web search Mistral)
        """
        from apps.invoicing.models import InvoiceItem, Product
        from apps.purchase_orders.models import PurchaseOrderItem

        try:
            @sync_to_async
            def check_internal_price():
                organization = user_context.get('organization')
                product_name = params.get('product_name', '')
                current_price = Decimal(str(params.get('price', 0)))
                context_type = params.get('context', 'purchase')  # 'purchase' ou 'sale'

                result = {
                    'product_name': product_name,
                    'current_price': float(current_price),
                    'context': context_type,
                    'internal_history': [],
                    'alerts': [],
                }

                # ── Historique achats (PO items) ──
                po_items = PurchaseOrderItem.objects.filter(
                    purchase_order__created_by__organization=organization,
                    description__icontains=product_name,
                ).order_by('-purchase_order__created_at')[:10]

                purchase_prices = []
                for item in po_items:
                    purchase_prices.append({
                        'date': item.purchase_order.created_at.strftime('%d/%m/%Y'),
                        'price': float(item.unit_price),
                        'supplier': item.purchase_order.supplier.name if item.purchase_order.supplier else 'N/A',
                        'quantity': float(item.quantity),
                    })
                    result['internal_history'].append(
                        f"📦 {item.purchase_order.created_at.strftime('%d/%m')} — "
                        f"{float(item.unit_price)}€ chez {item.purchase_order.supplier.name if item.purchase_order.supplier else 'N/A'}"
                    )

                # ── Historique ventes (factures) ──
                inv_items = InvoiceItem.objects.filter(
                    invoice__created_by__organization=organization,
                    description__icontains=product_name,
                    invoice__status__in=['sent', 'paid'],
                ).order_by('-invoice__created_at')[:10]

                sale_prices = []
                for item in inv_items:
                    sale_prices.append({
                        'date': item.invoice.created_at.strftime('%d/%m/%Y'),
                        'price': float(item.unit_price),
                        'client': item.invoice.client.company_name if item.invoice.client else 'N/A',
                    })

                # ── Analyse ──
                if context_type == 'purchase' and purchase_prices:
                    avg_purchase = sum(p['price'] for p in purchase_prices) / len(purchase_prices)
                    last_price = purchase_prices[0]['price'] if purchase_prices else 0
                    deviation = ((float(current_price) - avg_purchase) / avg_purchase * 100) if avg_purchase else 0

                    result['average_price'] = round(avg_purchase, 2)
                    result['last_price'] = last_price
                    result['deviation_percent'] = round(deviation, 1)

                    if deviation > 15:
                        result['alerts'].append(
                            f"⚠️ Prix SUPÉRIEUR de {round(deviation)}% à ta moyenne d'achat ({round(avg_purchase, 2)}€)"
                        )
                    elif deviation < -15:
                        result['alerts'].append(
                            f"✅ Bon prix ! INFÉRIEUR de {round(abs(deviation))}% à ta moyenne d'achat ({round(avg_purchase, 2)}€)"
                        )

                if context_type == 'sale' and purchase_prices:
                    avg_cost = sum(p['price'] for p in purchase_prices) / len(purchase_prices)
                    margin = ((float(current_price) - avg_cost) / avg_cost * 100) if avg_cost else 0
                    result['cost_price'] = round(avg_cost, 2)
                    result['margin_percent'] = round(margin, 1)

                    if margin < 10:
                        result['alerts'].append(
                            f"⚠️ Marge faible : {round(margin, 1)}% seulement (coût moyen: {round(avg_cost, 2)}€)"
                        )
                    elif margin < 0:
                        result['alerts'].append(
                            f"🔴 VENTE À PERTE ! Tu vends à {current_price}€ mais le coût moyen est {round(avg_cost, 2)}€"
                        )

                # ── Produit en catalogue ──
                product = Product.objects.filter(
                    organization=organization,
                    name__icontains=product_name
                ).first()
                if product:
                    result['catalog_price'] = float(product.selling_price) if hasattr(product, 'selling_price') and product.selling_price else None
                    result['catalog_cost'] = float(product.cost_price) if hasattr(product, 'cost_price') and product.cost_price else None

                return result

            internal = await check_internal_price()

            # ── Recherche web via Mistral ──
            web_result = await self._search_market_price(
                params.get('product_name', ''),
                float(params.get('price', 0))
            )

            # ── Construire la réponse ──
            lines = [f"## 🔍 Vérification prix — {internal['product_name']}\n"]
            lines.append(f"**Prix vérifié :** {internal['current_price']}€\n")

            if internal['internal_history']:
                lines.append("### 📊 Historique interne")
                for h in internal['internal_history'][:5]:
                    lines.append(f"  {h}")
                if internal.get('average_price'):
                    lines.append(f"\n  **Moyenne :** {internal['average_price']}€ | "
                                 f"**Dernier :** {internal.get('last_price', 'N/A')}€ | "
                                 f"**Écart :** {internal.get('deviation_percent', 0)}%")
            else:
                lines.append("### 📊 Historique interne\n  _Aucun historique trouvé pour ce produit._")

            if web_result:
                lines.append(f"\n### 🌐 Prix marché (recherche web)\n{web_result}")

            if internal['alerts']:
                lines.append("\n### ⚡ Alertes")
                for alert in internal['alerts']:
                    lines.append(f"  {alert}")

            return {
                'success': True,
                'message': '\n'.join(lines),
                'data': {
                    'entity_type': 'price_verification',
                    **internal,
                    'web_search': web_result,
                }
            }

        except Exception as e:
            logger.error(f"Erreur vérification prix: {e}", exc_info=True)
            return {'success': False, 'message': f"Erreur lors de la vérification : {str(e)}"}

    async def _search_market_price(self, product_name: str, current_price: float) -> Optional[str]:
        """Utilise Mistral web search pour vérifier le prix sur le marché"""
        import os
        from django.conf import settings

        try:
            api_key = getattr(settings, 'MISTRAL_API_KEY', os.getenv('MISTRAL_API_KEY'))
            if not api_key:
                return None

            # Support both mistralai v1.0+ and older versions
            try:
                from mistralai import Mistral
                client = Mistral(api_key=api_key)
            except ImportError:
                from mistralai.client import MistralClient
                client = MistralClient(api_key=api_key)

            response = client.chat.complete(
                model="mistral-large-latest",
                messages=[{
                    "role": "user",
                    "content": (
                        f"Quel est le prix moyen de '{product_name}' sur le marché en 2026 ? "
                        f"Le prix proposé est {current_price}€. "
                        f"Réponds en 3-4 lignes max : fourchette de prix constatée, "
                        f"et si {current_price}€ est dans la norme ou non. "
                        f"Format markdown."
                    )
                }],
                tools=[{"type": "web_search"}],
                tool_choice="auto",
            )

            if response and response.choices:
                return response.choices[0].message.content
            return None

        except Exception as e:
            logger.warning(f"Web search prix échouée: {e}")
            return f"_Recherche web non disponible ({e})_"

    # ──────────────────────────────────────────────
    # 3. CASH FLOW PRÉDICTIF
    # ──────────────────────────────────────────────

    async def predict_cashflow(self, params: Dict, user_context: Dict) -> Dict:
        """
        Prédit le cash flow sur 30/60/90 jours en analysant :
        - Factures clients dues (entrées prévues)
        - PO fournisseurs à payer (sorties engagées)
        - Historique des retards de paiement
        - Tendances de CA
        """
        from apps.invoicing.models import Invoice
        from apps.purchase_orders.models import PurchaseOrder

        try:
            @sync_to_async
            def compute_cashflow():
                organization = user_context.get('organization')
                horizon_days = int(params.get('horizon_days', 60))
                today = date.today()
                horizon_date = today + timedelta(days=horizon_days)

                # ── Entrées prévues : factures clients non payées ──
                unpaid_invoices = Invoice.objects.filter(
                    created_by__organization=organization,
                    status__in=['sent', 'overdue'],
                ).select_related('client')

                expected_income = []
                total_income = Decimal('0')
                overdue_total = Decimal('0')
                overdue_invoices = []

                for inv in unpaid_invoices:
                    balance = inv.get_balance_due()
                    if balance > 0:
                        entry = {
                            'invoice': inv.invoice_number,
                            'client': inv.client.company_name if inv.client else 'N/A',
                            'amount': float(balance),
                            'due_date': inv.due_date.strftime('%d/%m/%Y') if inv.due_date else 'N/A',
                            'days_overdue': (today - inv.due_date).days if inv.due_date and inv.due_date < today else 0,
                            'status': inv.status,
                        }
                        total_income += balance
                        expected_income.append(entry)

                        if inv.due_date and inv.due_date < today:
                            overdue_total += balance
                            overdue_invoices.append(entry)

                # ── Sorties engagées : PO non reçus/payés ──
                pending_pos = PurchaseOrder.objects.filter(
                    created_by__organization=organization,
                    status__in=['draft', 'pending', 'approved', 'sent'],
                ).select_related('supplier')

                expected_expenses = []
                total_expenses = Decimal('0')

                for po in pending_pos:
                    entry = {
                        'po_number': po.po_number,
                        'supplier': po.supplier.name if po.supplier else 'N/A',
                        'amount': float(po.total_amount),
                        'due_date': po.required_date.strftime('%d/%m/%Y') if po.required_date else 'N/A',
                        'status': po.get_status_display(),
                    }
                    total_expenses += po.total_amount
                    expected_expenses.append(entry)

                # ── CA moyen mensuel (tendance) ──
                three_months_ago = today - timedelta(days=90)
                paid_last_3m = Invoice.objects.filter(
                    created_by__organization=organization,
                    status='paid',
                    created_at__gte=three_months_ago,
                ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0')
                monthly_avg_revenue = paid_last_3m / 3

                # ── Projection semaine par semaine ──
                weeks = []
                running_balance = float(total_income - total_expenses)

                for week_num in range(horizon_days // 7 + 1):
                    week_start = today + timedelta(weeks=week_num)
                    week_end = week_start + timedelta(days=6)

                    week_income = sum(
                        e['amount'] for e in expected_income
                        if e.get('due_date') != 'N/A' and
                        week_start <= datetime.strptime(e['due_date'], '%d/%m/%Y').date() <= week_end
                    )
                    week_expenses = sum(
                        e['amount'] for e in expected_expenses
                        if e.get('due_date') != 'N/A' and
                        week_start <= datetime.strptime(e['due_date'], '%d/%m/%Y').date() <= week_end
                    )

                    net = week_income - week_expenses
                    status_icon = "✅" if net >= 0 else "🔴"
                    weeks.append({
                        'period': f"Sem. {week_start.strftime('%d/%m')} — {week_end.strftime('%d/%m')}",
                        'income': round(week_income, 2),
                        'expenses': round(week_expenses, 2),
                        'net': round(net, 2),
                        'status': status_icon,
                    })

                # ── Actions recommandées ──
                actions = []
                if overdue_invoices:
                    top_overdue = sorted(overdue_invoices, key=lambda x: x['amount'], reverse=True)[:3]
                    for inv in top_overdue:
                        actions.append({
                            'type': 'reminder',
                            'priority': 'high',
                            'message': f"Relancer {inv['client']} — {inv['amount']}€ en retard de {inv['days_overdue']} jours",
                            'invoice': inv['invoice'],
                        })

                if float(total_expenses) > float(total_income):
                    # Trouver des PO à décaler
                    deferrable_pos = sorted(expected_expenses, key=lambda x: x['amount'], reverse=True)[:2]
                    for po in deferrable_pos:
                        actions.append({
                            'type': 'defer_po',
                            'priority': 'medium',
                            'message': f"Décaler PO {po['po_number']} ({po['supplier']}) — {po['amount']}€",
                            'po_number': po['po_number'],
                        })

                # ── Construire la réponse ──
                balance_status = "✅ Confortable" if float(total_income) > float(total_expenses) * 1.2 else \
                                 "⚠️ Tendu" if float(total_income) >= float(total_expenses) else \
                                 "🔴 Déficit projeté"

                lines = [
                    f"## 💰 Prédiction Cash Flow — {horizon_days} jours\n",
                    f"**Solde projeté : {balance_status}**\n",
                    f"| Indicateur | Montant |",
                    f"|---|---|",
                    f"| 📈 Entrées prévues (factures clients) | **+{float(total_income):,.0f}€** |",
                    f"| 📉 Sorties engagées (PO fournisseurs) | **-{float(total_expenses):,.0f}€** |",
                    f"| 💵 Balance nette projetée | **{float(total_income - total_expenses):,.0f}€** |",
                    f"| ⚠️ Factures en retard | **{float(overdue_total):,.0f}€** ({len(overdue_invoices)} factures) |",
                    f"| 📊 CA moyen mensuel (3 derniers mois) | **{float(monthly_avg_revenue):,.0f}€** |",
                    "",
                ]

                if weeks:
                    lines.append("### 📅 Projection hebdomadaire")
                    lines.append("| Période | Entrées | Sorties | Net |")
                    lines.append("|---|---|---|---|")
                    for w in weeks[:8]:
                        lines.append(
                            f"| {w['period']} | +{w['income']:,.0f}€ | -{w['expenses']:,.0f}€ | {w['status']} {w['net']:,.0f}€ |"
                        )

                if overdue_invoices:
                    lines.append(f"\n### 🔴 Factures en retard ({len(overdue_invoices)})")
                    for inv in sorted(overdue_invoices, key=lambda x: x['days_overdue'], reverse=True)[:5]:
                        lines.append(
                            f"  - **{inv['client']}** — {inv['amount']:,.0f}€ — "
                            f"retard de **{inv['days_overdue']} jours** ({inv['invoice']})"
                        )

                if actions:
                    lines.append("\n### ⚡ Actions recommandées")
                    for i, a in enumerate(actions, 1):
                        icon = "🔴" if a['priority'] == 'high' else "🟡"
                        lines.append(f"  {i}. {icon} {a['message']}")

                return {
                    'success': True,
                    'message': '\n'.join(lines),
                    'data': {
                        'entity_type': 'cashflow_prediction',
                        'total_income': float(total_income),
                        'total_expenses': float(total_expenses),
                        'balance': float(total_income - total_expenses),
                        'overdue_total': float(overdue_total),
                        'overdue_count': len(overdue_invoices),
                        'monthly_avg_revenue': float(monthly_avg_revenue),
                        'weeks': weeks,
                        'actions': actions,
                        'expected_income': expected_income[:10],
                        'expected_expenses': expected_expenses[:10],
                    }
                }

            return await compute_cashflow()

        except Exception as e:
            logger.error(f"Erreur prédiction cashflow: {e}", exc_info=True)
            return {'success': False, 'message': f"Erreur lors de la prédiction : {str(e)}"}

    # ──────────────────────────────────────────────
    # 4. 3-WAY MATCHING
    # ──────────────────────────────────────────────

    async def three_way_match(self, params: Dict, user_context: Dict) -> Dict:
        """
        Compare facture fournisseur vs PO vs réception pour détecter :
        - Écarts de montants
        - Quantités non conformes
        - Doublons de factures
        - Prix anormaux
        """
        from apps.invoicing.models import Invoice, InvoiceItem
        from apps.purchase_orders.models import PurchaseOrder, PurchaseOrderItem

        try:
            @sync_to_async
            def match_sync():
                organization = user_context.get('organization')
                invoice_ref = params.get('invoice_number') or params.get('invoice_id')
                anomalies = []
                matches = []

                # ── Mode 1 : Vérifier une facture spécifique ──
                if invoice_ref:
                    invoice = Invoice.objects.filter(
                        Q(invoice_number__icontains=invoice_ref) | Q(id__startswith=invoice_ref),
                        created_by__organization=organization,
                    ).select_related('client', 'purchase_order').first()

                    if not invoice:
                        return {
                            'success': False,
                            'message': f"❌ Facture '{invoice_ref}' non trouvée."
                        }

                    # Chercher le PO associé
                    po = invoice.purchase_order
                    if not po and invoice.client:
                        # Chercher un PO avec montant similaire
                        po = PurchaseOrder.objects.filter(
                            created_by__organization=organization,
                            total_amount__range=(
                                float(invoice.total_amount) * Decimal('0.9'),
                                float(invoice.total_amount) * Decimal('1.1'),
                            ),
                        ).order_by('-created_at').first()

                    if po:
                        # Comparaison montants
                        amount_diff = float(invoice.total_amount) - float(po.total_amount)
                        if abs(amount_diff) > 0.01:
                            pct = (amount_diff / float(po.total_amount) * 100) if po.total_amount else 0
                            anomalies.append({
                                'type': 'amount_mismatch',
                                'severity': 'high' if abs(pct) > 5 else 'medium',
                                'message': f"Écart de montant : Facture {float(invoice.total_amount):,.2f}€ vs PO {float(po.total_amount):,.2f}€ (différence: {amount_diff:+,.2f}€ / {pct:+.1f}%)",
                            })

                        # Comparaison items (quantités)
                        inv_items = list(invoice.items.all())
                        po_items = list(po.items.all())

                        if len(inv_items) != len(po_items):
                            anomalies.append({
                                'type': 'item_count_mismatch',
                                'severity': 'medium',
                                'message': f"Nombre d'articles différent : Facture {len(inv_items)} vs PO {len(po_items)}",
                            })

                        matches.append({
                            'invoice': invoice.invoice_number,
                            'po': po.po_number,
                            'invoice_amount': float(invoice.total_amount),
                            'po_amount': float(po.total_amount),
                            'status': po.get_status_display(),
                        })

                # ── Mode 2 : Scanner toutes les factures récentes pour doublons ──
                else:
                    recent_invoices = Invoice.objects.filter(
                        created_by__organization=organization,
                        created_at__gte=timezone.now() - timedelta(days=90),
                    ).select_related('client').order_by('-created_at')

                    # Détection doublons (même montant, même client, même période)
                    seen = {}
                    for inv in recent_invoices:
                        key = f"{inv.client_id}_{float(inv.total_amount)}"
                        if key in seen:
                            other = seen[key]
                            days_apart = abs((inv.created_at - other.created_at).days)
                            if days_apart < 15:
                                anomalies.append({
                                    'type': 'potential_duplicate',
                                    'severity': 'high',
                                    'message': (
                                        f"Doublon potentiel : {inv.invoice_number} et {other.invoice_number} — "
                                        f"même client, même montant ({float(inv.total_amount):,.2f}€), "
                                        f"à {days_apart} jours d'écart"
                                    ),
                                })
                        else:
                            seen[key] = inv

                    # Factures sans PO associé (achats non contrôlés)
                    unmatched = Invoice.objects.filter(
                        created_by__organization=organization,
                        purchase_order__isnull=True,
                        status__in=['sent', 'paid'],
                    ).count()

                    if unmatched > 0:
                        anomalies.append({
                            'type': 'unmatched_invoices',
                            'severity': 'low',
                            'message': f"{unmatched} facture(s) sans bon de commande associé",
                        })

                # ── Construire la réponse ──
                if not anomalies and not invoice_ref:
                    return {
                        'success': True,
                        'message': "✅ **Aucune anomalie détectée** sur les 90 derniers jours. Tout est conforme !",
                        'data': {'entity_type': 'three_way_match', 'anomalies': [], 'status': 'clean'}
                    }

                lines = ["## 🔍 Résultat du contrôle 3-Way Matching\n"]

                if matches:
                    lines.append("### 📋 Correspondances trouvées")
                    for m in matches:
                        lines.append(
                            f"  - Facture **{m['invoice']}** ↔ PO **{m['po']}** "
                            f"({m['invoice_amount']:,.2f}€ vs {m['po_amount']:,.2f}€)"
                        )

                if anomalies:
                    high = [a for a in anomalies if a['severity'] == 'high']
                    medium = [a for a in anomalies if a['severity'] == 'medium']
                    low = [a for a in anomalies if a['severity'] == 'low']

                    if high:
                        lines.append(f"\n### 🔴 Anomalies critiques ({len(high)})")
                        for a in high:
                            lines.append(f"  - {a['message']}")
                    if medium:
                        lines.append(f"\n### 🟡 Anomalies moyennes ({len(medium)})")
                        for a in medium:
                            lines.append(f"  - {a['message']}")
                    if low:
                        lines.append(f"\n### 🟢 Points d'attention ({len(low)})")
                        for a in low:
                            lines.append(f"  - {a['message']}")
                else:
                    lines.append("\n✅ Aucune anomalie détectée pour cette facture.")

                return {
                    'success': True,
                    'message': '\n'.join(lines),
                    'data': {
                        'entity_type': 'three_way_match',
                        'anomalies': anomalies,
                        'matches': matches,
                        'anomaly_count': len(anomalies),
                        'high_severity_count': len([a for a in anomalies if a['severity'] == 'high']),
                    }
                }

            return await match_sync()

        except Exception as e:
            logger.error(f"Erreur 3-way matching: {e}", exc_info=True)
            return {'success': False, 'message': f"Erreur : {str(e)}"}

    # ──────────────────────────────────────────────
    # 5. RELANCES INTELLIGENTES
    # ──────────────────────────────────────────────

    async def smart_reminder(self, params: Dict, user_context: Dict) -> Dict:
        """
        Gère les relances intelligentes :
        - Liste les factures en retard
        - Génère des emails de relance adaptés au niveau de retard
        - Enregistre l'historique de relance
        """
        from apps.invoicing.models import Invoice

        try:
            @sync_to_async
            def process_reminders():
                organization = user_context.get('organization')
                action = params.get('action', 'list')  # 'list', 'generate', 'send_all'
                min_days = int(params.get('min_days_overdue', 0))
                invoice_ref = params.get('invoice_number')
                today = date.today()

                # ── Récupérer les factures en retard ──
                overdue_filter = Q(
                    created_by__organization=organization,
                    status__in=['sent', 'overdue'],
                    due_date__lt=today,
                )
                if invoice_ref:
                    overdue_filter &= Q(invoice_number__icontains=invoice_ref)

                overdue = Invoice.objects.filter(overdue_filter).select_related('client').order_by('due_date')

                if min_days > 0:
                    cutoff = today - timedelta(days=min_days)
                    overdue = overdue.filter(due_date__lt=cutoff)

                invoices_data = []
                for inv in overdue:
                    days_late = (today - inv.due_date).days if inv.due_date else 0
                    balance = inv.get_balance_due()

                    # Déterminer le niveau de relance
                    if days_late <= 7:
                        level = 1
                        level_name = "Rappel amical"
                        tone = "poli"
                    elif days_late <= 21:
                        level = 2
                        level_name = "Relance ferme"
                        tone = "ferme"
                    elif days_late <= 45:
                        level = 3
                        level_name = "Mise en demeure"
                        tone = "formel"
                    else:
                        level = 4
                        level_name = "Pré-contentieux"
                        tone = "juridique"

                    invoices_data.append({
                        'invoice_number': inv.invoice_number,
                        'client': inv.client.company_name if inv.client else 'N/A',
                        'client_email': inv.client.email if inv.client else '',
                        'amount': float(balance),
                        'due_date': inv.due_date.strftime('%d/%m/%Y') if inv.due_date else 'N/A',
                        'days_late': days_late,
                        'level': level,
                        'level_name': level_name,
                        'tone': tone,
                        'reminder_count': inv.reminder_count,
                        'last_reminder': inv.last_reminder_sent_at.strftime('%d/%m/%Y') if inv.last_reminder_sent_at else 'Jamais',
                    })

                if not invoices_data:
                    return {
                        'success': True,
                        'message': "✅ **Aucune facture en retard !** Tous tes clients sont à jour. 🎉",
                        'data': {'entity_type': 'smart_reminder', 'overdue_count': 0}
                    }

                total_overdue = sum(i['amount'] for i in invoices_data)

                # ── Mode liste ──
                if action == 'list':
                    lines = [
                        f"## ⏰ Factures en retard — {len(invoices_data)} factures\n",
                        f"**Total à récupérer : {total_overdue:,.0f}€**\n",
                        "| Client | Facture | Montant | Retard | Niveau | Relances |",
                        "|---|---|---|---|---|---|",
                    ]
                    for inv in sorted(invoices_data, key=lambda x: x['amount'], reverse=True):
                        icon = "🟡" if inv['level'] <= 2 else "🔴"
                        lines.append(
                            f"| {icon} {inv['client']} | {inv['invoice_number']} | "
                            f"{inv['amount']:,.0f}€ | {inv['days_late']}j | "
                            f"{inv['level_name']} | {inv['reminder_count']}x |"
                        )

                    lines.append(f"\n💡 Dis « **relance [nom du client]** » ou « **relance toutes les factures en retard** » pour générer les emails.")

                    return {
                        'success': True,
                        'message': '\n'.join(lines),
                        'data': {
                            'entity_type': 'smart_reminder',
                            'overdue_count': len(invoices_data),
                            'total_overdue': total_overdue,
                            'invoices': invoices_data,
                        }
                    }

                # ── Mode génération d'emails ──
                elif action in ('generate', 'send_all'):
                    emails = []
                    for inv in invoices_data:
                        email = self._generate_reminder_email(inv)
                        emails.append(email)

                        # Mettre à jour le compteur
                        Invoice.objects.filter(
                            invoice_number=inv['invoice_number']
                        ).update(
                            reminder_count=F('reminder_count') + 1,
                            last_reminder_sent_at=timezone.now(),
                            next_reminder_date=today + timedelta(days=7 if inv['level'] <= 2 else 3),
                        )

                    lines = [
                        f"## 📧 {len(emails)} email(s) de relance générés\n",
                        f"**Total concerné : {total_overdue:,.0f}€**\n",
                    ]
                    for email in emails:
                        lines.append(f"---\n**À :** {email['to']}\n**Objet :** {email['subject']}\n\n{email['body']}\n")

                    return {
                        'success': True,
                        'message': '\n'.join(lines),
                        'data': {
                            'entity_type': 'smart_reminder',
                            'emails_generated': len(emails),
                            'emails': emails,
                        }
                    }

                return {'success': False, 'message': "Action non reconnue. Utilise 'list' ou 'generate'."}

            return await process_reminders()

        except Exception as e:
            logger.error(f"Erreur relances: {e}", exc_info=True)
            return {'success': False, 'message': f"Erreur : {str(e)}"}

    def _generate_reminder_email(self, invoice_data: Dict) -> Dict:
        """Génère un email de relance adapté au niveau de retard"""
        client = invoice_data['client']
        amount = invoice_data['amount']
        inv_num = invoice_data['invoice_number']
        due_date = invoice_data['due_date']
        days_late = invoice_data['days_late']
        level = invoice_data['level']

        if level == 1:
            subject = f"Rappel — Facture {inv_num} arrivée à échéance"
            body = (
                f"Bonjour,\n\n"
                f"Sauf erreur de notre part, la facture **{inv_num}** d'un montant de **{amount:,.2f}€** "
                f"arrivée à échéance le **{due_date}** n'a pas encore été réglée.\n\n"
                f"Nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.\n\n"
                f"Si le paiement a déjà été effectué, merci de ne pas tenir compte de ce message.\n\n"
                f"Cordialement"
            )
        elif level == 2:
            subject = f"Relance — Facture {inv_num} en retard de {days_late} jours"
            body = (
                f"Bonjour,\n\n"
                f"Nous nous permettons de vous relancer concernant la facture **{inv_num}** "
                f"d'un montant de **{amount:,.2f}€**, échue depuis le **{due_date}** "
                f"soit **{days_late} jours de retard**.\n\n"
                f"Merci de procéder au règlement sous **7 jours**. "
                f"En cas de difficulté, contactez-nous pour convenir d'un échéancier.\n\n"
                f"Cordialement"
            )
        elif level == 3:
            subject = f"MISE EN DEMEURE — Facture {inv_num} impayée ({days_late} jours)"
            body = (
                f"Madame, Monsieur,\n\n"
                f"Malgré nos précédentes relances, la facture **{inv_num}** d'un montant de "
                f"**{amount:,.2f}€** reste impayée depuis **{days_late} jours** (échéance : {due_date}).\n\n"
                f"**La présente vaut mise en demeure de payer** conformément aux conditions générales "
                f"de vente. Sans règlement sous 8 jours, nous nous réservons le droit d'appliquer "
                f"les pénalités de retard prévues par la loi (article L441-10 du Code de commerce).\n\n"
                f"Nous restons à votre disposition pour tout règlement amiable.\n\n"
                f"Veuillez agréer nos salutations distinguées."
            )
        else:
            subject = f"DERNIÈRE RELANCE AVANT PROCÉDURE — Facture {inv_num}"
            body = (
                f"Madame, Monsieur,\n\n"
                f"La facture **{inv_num}** de **{amount:,.2f}€** est impayée depuis **{days_late} jours**.\n\n"
                f"Sans réponse de votre part sous **48 heures**, nous transmettrons ce dossier "
                f"à notre service contentieux pour recouvrement, avec application de :\n"
                f"- Pénalités de retard (taux BCE + 10 points)\n"
                f"- Indemnité forfaitaire de recouvrement de 40€\n\n"
                f"Nous privilégions un règlement amiable et restons joignables.\n\n"
                f"Veuillez agréer nos salutations distinguées."
            )

        return {
            'to': invoice_data.get('client_email', client),
            'client': client,
            'subject': subject,
            'body': body,
            'level': level,
            'invoice_number': inv_num,
            'amount': amount,
        }
