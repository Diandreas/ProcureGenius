"""
Service de génération de conversations proactives
Analyse les données utilisateur et crée des conversations initiées par l'IA
"""
import logging
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count, Avg, Q, F
from django.db import models
from apps.ai_assistant.models import ProactiveConversation, Conversation, Message
from apps.ai_assistant.prompts.conversation_starters import format_conversation_starter
from apps.invoicing.models import Invoice, InvoiceItem
from apps.purchase_orders.models import PurchaseOrder
from apps.suppliers.models import Supplier
from apps.accounts.models import Client

logger = logging.getLogger(__name__)
User = get_user_model()


class ProactiveConversationService:
    """Service pour générer des conversations proactives"""

    @staticmethod
    def generate_conversations_for_all_users():
        """
        Génère des conversations proactives pour tous les utilisateurs actifs
        À appeler via une tâche cron quotidienne
        """
        users = User.objects.filter(
            is_active=True,
            organization__isnull=False
        ).select_related('organization')

        total_conversations = 0

        for user in users:
            try:
                conversations_created = ProactiveConversationService.generate_conversations_for_user(user)
                total_conversations += conversations_created
            except Exception as e:
                logger.error(f"Error generating conversations for user {user.username}: {e}", exc_info=True)

        logger.info(f"Generated {total_conversations} proactive conversations for {users.count()} users")
        return {
            'users_processed': users.count(),
            'conversations_created': total_conversations
        }

    @staticmethod
    def generate_conversations_for_user(user):
        """
        Génère des conversations proactives pour un utilisateur spécifique
        
        Returns:
            int: Nombre de conversations créées
        """
        if not user.organization:
            logger.warning(f"User {user.username} has no organization, skipping")
            return 0

        # Vérifier si on doit générer de nouvelles conversations
        # (éviter de générer trop souvent - max 1 par jour)
        last_conversation = ProactiveConversation.objects.filter(
            user=user,
            status='pending'
        ).order_by('-created_at').first()

        if last_conversation:
            time_since_last = timezone.now() - last_conversation.created_at
            if time_since_last < timedelta(days=1):
                logger.debug(f"Skipping user {user.username}, conversation generated recently")
                return 0

        # Analyser les données et générer des conversations
        conversations_created = 0

        # 1. Analyser les ventes
        sales_analysis = ProactiveConversationService._analyze_sales(user)
        if sales_analysis:
            conv = ProactiveConversationService._create_conversation(user, sales_analysis)
            if conv:
                conversations_created += 1

        # 2. Analyser les factures en retard
        overdue_analysis = ProactiveConversationService._analyze_overdue_invoices(user)
        if overdue_analysis:
            conv = ProactiveConversationService._create_conversation(user, overdue_analysis)
            if conv:
                conversations_created += 1

        # 3. Analyser la concentration des fournisseurs
        supplier_analysis = ProactiveConversationService._analyze_supplier_concentration(user)
        if supplier_analysis:
            conv = ProactiveConversationService._create_conversation(user, supplier_analysis)
            if conv:
                conversations_created += 1

        # 4. Analyser les stocks
        stock_analysis = ProactiveConversationService._analyze_stock_levels(user)
        if stock_analysis:
            conv = ProactiveConversationService._create_conversation(user, stock_analysis)
            if conv:
                conversations_created += 1

        # 5. Analyser la rentabilité
        profitability_analysis = ProactiveConversationService._analyze_profitability(user)
        if profitability_analysis:
            conv = ProactiveConversationService._create_conversation(user, profitability_analysis)
            if conv:
                conversations_created += 1

        # 6. Analyser les factures à envoyer
        invoice_send_analysis = ProactiveConversationService._analyze_invoices_to_send(user)
        if invoice_send_analysis:
            conv = ProactiveConversationService._create_conversation(user, invoice_send_analysis)
            if conv:
                conversations_created += 1

        # 7. Analyser les factures en retard à relancer
        invoice_followup_analysis = ProactiveConversationService._analyze_invoices_followup(user)
        if invoice_followup_analysis:
            conv = ProactiveConversationService._create_conversation(user, invoice_followup_analysis)
            if conv:
                conversations_created += 1

        # 8. Analyser les bons de commande à envoyer
        po_send_analysis = ProactiveConversationService._analyze_purchase_orders_to_send(user)
        if po_send_analysis:
            conv = ProactiveConversationService._create_conversation(user, po_send_analysis)
            if conv:
                conversations_created += 1

        return conversations_created

    @staticmethod
    def _analyze_sales(user):
        """Analyse les ventes et détecte les patterns intéressants"""
        organization = user.organization
        
        # Comparer ce mois avec le mois dernier
        now = timezone.now()
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)
        last_month_end = this_month_start - timedelta(seconds=1)

        this_month_invoices = Invoice.objects.filter(
            organization=organization,
            created_at__gte=this_month_start
        )
        last_month_invoices = Invoice.objects.filter(
            organization=organization,
            created_at__gte=last_month_start,
            created_at__lte=last_month_end
        )

        this_month_total = this_month_invoices.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        last_month_total = last_month_invoices.aggregate(Sum('total_amount'))['total_amount__sum'] or 0

        if last_month_total > 0 and this_month_total > 0:
            percentage_change = ((this_month_total - last_month_total) / last_month_total) * 100
            
            # Si augmentation significative (>15%)
            if percentage_change > 15:
                return {
                    'template_key': 'sales_increase',
                    'context': {
                        'percentage': round(percentage_change, 1),
                        'period': 'ce mois'
                    },
                    'priority': 8
                }
            # Si baisse significative (>20%)
            elif percentage_change < -20:
                return {
                    'template_key': 'profitability_decrease',
                    'context': {
                        'percentage': round(abs(percentage_change), 1),
                        'period': 'ce mois'
                    },
                    'priority': 9
                }

        return None

    @staticmethod
    def _analyze_overdue_invoices(user):
        """Analyse les factures en retard de paiement"""
        organization = user.organization
        
        # Factures en retard (date d'échéance passée et non payées)
        overdue_invoices = Invoice.objects.filter(
            organization=organization,
            status__in=['sent', 'pending'],
            due_date__lt=timezone.now().date()
        )

        count = overdue_invoices.count()
        if count > 0:
            total_amount = overdue_invoices.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
            
            return {
                'template_key': 'overdue_invoices',
                'context': {
                    'count': count,
                    'total_amount': round(total_amount, 2)
                },
                'priority': 9
            }

        return None

    @staticmethod
    def _analyze_supplier_concentration(user):
        """Analyse la concentration des fournisseurs"""
        organization = user.organization
        
        # Calculer le total des achats par fournisseur
        from apps.purchase_orders.models import PurchaseOrder
        
        supplier_totals = PurchaseOrder.objects.filter(
            organization=organization,
            status__in=['approved', 'sent', 'received']
        ).values('supplier__name').annotate(
            total=Sum('total_amount')
        ).order_by('-total')

        if supplier_totals:
            total_all = sum(item['total'] for item in supplier_totals)
            if total_all > 0:
                top_supplier = supplier_totals[0]
                percentage = (top_supplier['total'] / total_all) * 100
                
                # Si un fournisseur représente plus de 60% des achats
                if percentage > 60:
                    return {
                        'template_key': 'supplier_concentration',
                        'context': {
                            'supplier_name': top_supplier['supplier__name'] or 'Votre fournisseur principal',
                            'percentage': round(percentage, 1)
                        },
                        'priority': 7
                    }

        return None

    @staticmethod
    def _analyze_stock_levels(user):
        """Analyse les niveaux de stock"""
        organization = user.organization
        
        # Vérifier les produits avec stock faible
        from apps.invoicing.models import Product
        
        low_stock_products = Product.objects.filter(
            organization=organization,
            stock_quantity__gt=0,
            stock_quantity__lte=F('reorder_level')
        )

        count = low_stock_products.count()
        if count > 0:
            return {
                'template_key': 'low_stock_alert',
                'context': {
                    'product_count': count
                },
                'priority': 8
            }

        return None

    @staticmethod
    def _analyze_profitability(user):
        """Analyse la rentabilité"""
        organization = user.organization
        
        # Comparer les marges ce mois vs mois dernier
        now = timezone.now()
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)
        last_month_end = this_month_start - timedelta(seconds=1)

        this_month_items = InvoiceItem.objects.filter(
            invoice__client__organization=organization,
            invoice__created_at__gte=this_month_start
        )
        last_month_items = InvoiceItem.objects.filter(
            invoice__client__organization=organization,
            invoice__created_at__gte=last_month_start,
            invoice__created_at__lte=last_month_end
        )

        # Calculer les marges (simplifié) - utilise product__cost_price car InvoiceItem n'a pas cost_price
        this_month_margin = this_month_items.filter(product__isnull=False).aggregate(
            margin=Sum(F('unit_price') - F('product__cost_price'), output_field=models.DecimalField())
        )['margin'] or 0

        last_month_margin = last_month_items.filter(product__isnull=False).aggregate(
            margin=Sum(F('unit_price') - F('product__cost_price'), output_field=models.DecimalField())
        )['margin'] or 0

        if last_month_margin > 0 and this_month_margin > 0:
            percentage_change = ((this_month_margin - last_month_margin) / last_month_margin) * 100
            
            # Si baisse significative (>15%)
            if percentage_change < -15:
                return {
                    'template_key': 'profitability_decrease',
                    'context': {
                        'percentage': round(abs(percentage_change), 1),
                        'period': 'ce mois'
                    },
                    'priority': 9
                }

        return None

    @staticmethod
    def _analyze_invoices_to_send(user):
        """Analyse les factures en brouillon qui devraient être envoyées"""
        organization = user.organization
        
        # Factures en draft depuis plus de 3 jours
        three_days_ago = timezone.now() - timedelta(days=3)
        draft_invoices = Invoice.objects.filter(
            organization=organization,
            status='draft',
            created_at__lt=three_days_ago
        ).select_related('client')

        count = draft_invoices.count()
        if count > 0:
            # Filtrer celles qui ont un client avec email
            invoices_with_email = [inv for inv in draft_invoices if inv.client and hasattr(inv.client, 'email') and inv.client.email]
            
            if invoices_with_email:
                return {
                    'template_key': 'invoices_to_send',
                    'context': {
                        'count': len(invoices_with_email),
                        'invoice_numbers': [inv.invoice_number for inv in invoices_with_email[:5]],
                        'invoices': [
                            {
                                'id': str(inv.id),
                                'number': inv.invoice_number,
                                'client_name': inv.client.name if inv.client else 'Client',
                                'amount': float(inv.total_amount) if inv.total_amount else 0
                            }
                            for inv in invoices_with_email[:5]
                        ]
                    },
                    'priority': 7
                }

        return None

    @staticmethod
    def _analyze_invoices_followup(user):
        """Analyse les factures envoyées depuis plus de X jours sans paiement"""
        organization = user.organization
        
        # Factures envoyées depuis plus de 7 jours sans paiement
        seven_days_ago = timezone.now() - timedelta(days=7)
        sent_invoices = Invoice.objects.filter(
            organization=organization,
            status='sent',
            created_at__lt=seven_days_ago
        ).select_related('client')

        count = sent_invoices.count()
        if count > 0:
            total_amount = sent_invoices.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
            
            # Filtrer celles qui ont un client avec email
            invoices_with_email = [inv for inv in sent_invoices if inv.client and hasattr(inv.client, 'email') and inv.client.email]
            
            if invoices_with_email:
                return {
                    'template_key': 'invoices_followup',
                    'context': {
                        'count': len(invoices_with_email),
                        'total_amount': round(float(total_amount), 2),
                        'invoices': [
                            {
                                'id': str(inv.id),
                                'number': inv.invoice_number,
                                'client_name': inv.client.name if inv.client else 'Client',
                                'amount': float(inv.total_amount) if inv.total_amount else 0,
                                'days_since_sent': (timezone.now().date() - (inv.created_at.date() if inv.created_at else timezone.now().date())).days
                            }
                            for inv in invoices_with_email[:5]
                        ]
                    },
                    'priority': 8
                }

        return None

    @staticmethod
    def _analyze_purchase_orders_to_send(user):
        """Analyse les bons de commande approuvés qui devraient être envoyés"""
        organization = user.organization
        
        # Bons de commande approuvés depuis plus de 2 jours non envoyés
        two_days_ago = timezone.now() - timedelta(days=2)
        approved_pos = PurchaseOrder.objects.filter(
            organization=organization,
            status='approved',
            created_at__lt=two_days_ago
        ).select_related('supplier')

        count = approved_pos.count()
        if count > 0:
            # Filtrer ceux qui ont un fournisseur avec email
            pos_with_email = [po for po in approved_pos if po.supplier and hasattr(po.supplier, 'email') and po.supplier.email]
            
            if pos_with_email:
                return {
                    'template_key': 'purchase_orders_to_send',
                    'context': {
                        'count': len(pos_with_email),
                        'po_numbers': [po.po_number for po in pos_with_email[:5]],
                        'purchase_orders': [
                            {
                                'id': str(po.id),
                                'number': po.po_number,
                                'supplier_name': po.supplier.name if po.supplier else 'Fournisseur',
                                'amount': float(po.total_amount) if po.total_amount else 0
                            }
                            for po in pos_with_email[:5]
                        ]
                    },
                    'priority': 7
                }

        return None

    @staticmethod
    def _create_conversation(user, analysis_data):
        """
        Crée une conversation proactive basée sur les données d'analyse
        
        Args:
            user: Utilisateur
            analysis_data: Dict avec template_key, context, priority
            
        Returns:
            ProactiveConversation créée ou None
        """
        try:
            # Formater le template
            formatted = format_conversation_starter(
                analysis_data['template_key'],
                analysis_data['context']
            )

            # Vérifier si une conversation similaire existe déjà
            existing = ProactiveConversation.objects.filter(
                user=user,
                title=formatted['title'],
                status='pending'
            ).first()

            if existing:
                return None

            # Créer la conversation proactive
            conversation = ProactiveConversation.objects.create(
                user=user,
                organization=user.organization,
                title=formatted['title'],
                starter_message=formatted['message'],
                context_data={
                    'template_key': analysis_data['template_key'],
                    'analysis_context': analysis_data['context'],
                    'priority': analysis_data.get('priority', 5)
                },
                status='pending'
            )

            logger.info(f"Created proactive conversation for user {user.username}: {formatted['title']}")
            return conversation

        except Exception as e:
            logger.error(f"Error creating proactive conversation: {e}", exc_info=True)
            return None

