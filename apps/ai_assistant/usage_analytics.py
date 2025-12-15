"""
Service d'analytics pour l'utilisation de l'IA
"""
from django.db.models import Sum, Count, Avg
from datetime import datetime, timedelta
from .models import AIUsageLog


class UsageAnalytics:
    """Service pour calculer les statistiques d'utilisation AI"""

    # Prix Mistral AI (euros par 1M tokens) - à jour en 2024
    PRICING = {
        'mistral-large-latest': {
            'prompt': 0.003,  # €3 per 1M tokens
            'completion': 0.009  # €9 per 1M tokens
        },
        'mistral-small-latest': {
            'prompt': 0.001,
            'completion': 0.003
        },
        'pixtral-12b-latest': {
            'prompt': 0.00015,
            'completion': 0.00015
        }
    }

    @staticmethod
    def calculate_cost(prompt_tokens: int, completion_tokens: int, model: str) -> float:
        """Calcule le coût estimé en euros"""
        pricing = UsageAnalytics.PRICING.get(model, UsageAnalytics.PRICING['mistral-large-latest'])

        prompt_cost = (prompt_tokens / 1_000_000) * pricing['prompt']
        completion_cost = (completion_tokens / 1_000_000) * pricing['completion']

        return round(prompt_cost + completion_cost, 6)

    @staticmethod
    def get_usage_stats(organization_id, period='month', user_id=None):
        """
        Récupère les statistiques d'utilisation pour une période donnée

        Args:
            organization_id: ID de l'organisation
            period: 'day', 'week', 'month', ou 'year'
            user_id: ID utilisateur optionnel pour filtrer

        Returns:
            Dict avec summary, breakdown, top_users, daily_trend
        """
        # Calculer date de début selon période
        now = datetime.now()
        if period == 'day':
            start_date = now - timedelta(days=1)
        elif period == 'week':
            start_date = now - timedelta(weeks=1)
        elif period == 'year':
            start_date = now - timedelta(days=365)
        else:  # month (défaut)
            start_date = now - timedelta(days=30)

        # Query de base
        qs = AIUsageLog.objects.filter(
            organization_id=organization_id,
            created_at__gte=start_date
        )

        # Filtrer par utilisateur si spécifié
        if user_id:
            qs = qs.filter(user_id=user_id)

        # Agrégations principales
        stats = qs.aggregate(
            total_tokens=Sum('total_tokens'),
            total_cost=Sum('estimated_cost'),
            total_requests=Count('id'),
            avg_tokens_per_request=Avg('total_tokens'),
            avg_response_time=Avg('response_time_ms')
        )

        # Convertir None en 0 pour l'affichage
        stats = {k: v if v is not None else 0 for k, v in stats.items()}

        # Breakdown par type d'action
        breakdown = list(qs.values('action_type').annotate(
            count=Count('id'),
            tokens=Sum('total_tokens'),
            cost=Sum('estimated_cost')
        ).order_by('-tokens'))

        # Top utilisateurs (seulement si pas filtré par user)
        top_users = []
        if not user_id:
            top_users = list(qs.values(
                'user__username',
                'user__first_name',
                'user__last_name'
            ).annotate(
                tokens=Sum('total_tokens'),
                requests=Count('id'),
                cost=Sum('estimated_cost')
            ).order_by('-tokens')[:10])

        # Tendance quotidienne
        daily_trend = list(qs.extra(
            select={'day': "date(created_at)"}
        ).values('day').annotate(
            tokens=Sum('total_tokens'),
            requests=Count('id'),
            cost=Sum('estimated_cost')
        ).order_by('day'))

        # Breakdown par modèle utilisé
        model_breakdown = list(qs.values('model_used').annotate(
            count=Count('id'),
            tokens=Sum('total_tokens'),
            cost=Sum('estimated_cost')
        ).order_by('-count'))

        return {
            'summary': stats,
            'breakdown_by_action': breakdown,
            'breakdown_by_model': model_breakdown,
            'top_users': top_users,
            'daily_trend': daily_trend,
            'period': period,
            'start_date': start_date.isoformat(),
            'end_date': now.isoformat()
        }

    @staticmethod
    def get_user_usage_summary(user_id, days=30):
        """Résumé d'utilisation pour un utilisateur spécifique"""
        start_date = datetime.now() - timedelta(days=days)

        qs = AIUsageLog.objects.filter(
            user_id=user_id,
            created_at__gte=start_date
        )

        summary = qs.aggregate(
            total_tokens=Sum('total_tokens'),
            total_cost=Sum('estimated_cost'),
            total_requests=Count('id')
        )

        # Activité par jour
        daily_activity = list(qs.extra(
            select={'day': "date(created_at)"}
        ).values('day').annotate(
            requests=Count('id')
        ).order_by('-day')[:7])  # 7 derniers jours

        return {
            'summary': summary,
            'daily_activity': daily_activity,
            'days': days
        }

    @staticmethod
    def get_organization_budget_status(organization_id):
        """
        Vérifie le statut du budget pour une organisation
        Intègre avec TokenMonitor pour les limites
        """
        from .token_monitor import TokenMonitor
        from django.core.cache import cache

        now = datetime.now()

        # Clés Redis pour tokens actuels
        hour_key = f"tokens_hour_{now.strftime('%Y%m%d_%H')}_{organization_id}"
        day_key = f"tokens_day_{now.strftime('%Y%m%d')}_{organization_id}"

        hourly_usage = cache.get(hour_key, 0)
        daily_usage = cache.get(day_key, 0)

        # Limites (depuis TokenMonitor)
        monitor = TokenMonitor()
        hourly_limit = monitor.HOURLY_BUDGET
        daily_limit = monitor.DAILY_BUDGET

        # Calculer statut
        def get_status(usage, limit):
            percentage = (usage / limit * 100) if limit > 0 else 0
            if percentage >= 90:
                return 'critical'
            elif percentage >= 75:
                return 'warning'
            else:
                return 'ok'

        return {
            'hourly': {
                'used': hourly_usage,
                'limit': hourly_limit,
                'remaining': max(0, hourly_limit - hourly_usage),
                'percentage': round((hourly_usage / hourly_limit * 100) if hourly_limit > 0 else 0, 2),
                'status': get_status(hourly_usage, hourly_limit)
            },
            'daily': {
                'used': daily_usage,
                'limit': daily_limit,
                'remaining': max(0, daily_limit - daily_usage),
                'percentage': round((daily_usage / daily_limit * 100) if daily_limit > 0 else 0, 2),
                'status': get_status(daily_usage, daily_limit)
            }
        }
