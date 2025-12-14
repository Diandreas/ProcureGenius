"""
Monitoring et alertes pour l'utilisation des tokens IA
Track la consommation et envoie des alertes si budget dépassé
"""
import logging
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings
from datetime import datetime, timedelta
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class TokenMonitor:
    """Surveille l'utilisation des tokens et génère des alertes"""

    # Budgets par défaut (tokens)
    DAILY_BUDGET = 100000  # 100K tokens/jour
    HOURLY_BUDGET = 10000  # 10K tokens/heure
    CRITICAL_THRESHOLD = 0.90  # 90% du budget
    WARNING_THRESHOLD = 0.75  # 75% du budget

    def __init__(self):
        self.daily_budget = getattr(settings, 'AI_DAILY_TOKEN_BUDGET', self.DAILY_BUDGET)
        self.hourly_budget = getattr(settings, 'AI_HOURLY_TOKEN_BUDGET', self.HOURLY_BUDGET)

    def track_usage(self, tokens_used: int, user_id: int, organization_id: int):
        """
        Enregistre l'utilisation de tokens et vérifie les budgets

        Args:
            tokens_used: Nombre de tokens utilisés
            user_id: ID de l'utilisateur
            organization_id: ID de l'organisation
        """
        now = datetime.now()
        hour_key = f"tokens_hour_{now.strftime('%Y%m%d_%H')}_{organization_id}"
        day_key = f"tokens_day_{now.strftime('%Y%m%d')}_{organization_id}"

        # Incrémenter les compteurs
        hourly_total = cache.get(hour_key, 0) + tokens_used
        daily_total = cache.get(day_key, 0) + tokens_used

        # Sauvegarder avec TTL
        cache.set(hour_key, hourly_total, 3700)  # 1h + buffer
        cache.set(day_key, daily_total, 86500)  # 24h + buffer

        # Vérifier les seuils
        self._check_thresholds(
            hourly_total, daily_total,
            organization_id, user_id
        )

        return {
            'hourly_usage': hourly_total,
            'daily_usage': daily_total,
            'hourly_budget': self.hourly_budget,
            'daily_budget': self.daily_budget
        }

    def _check_thresholds(self, hourly: int, daily: int, org_id: int, user_id: int):
        """Vérifie les seuils et envoie des alertes si nécessaire"""

        # Vérifier budget horaire
        hourly_percent = hourly / self.hourly_budget
        if hourly_percent >= self.CRITICAL_THRESHOLD:
            self._send_alert(
                level='CRITICAL',
                message=f"Budget horaire critique: {hourly}/{self.hourly_budget} tokens ({hourly_percent:.0%})",
                org_id=org_id,
                user_id=user_id
            )
        elif hourly_percent >= self.WARNING_THRESHOLD:
            self._send_alert(
                level='WARNING',
                message=f"Budget horaire warning: {hourly}/{self.hourly_budget} tokens ({hourly_percent:.0%})",
                org_id=org_id,
                user_id=user_id
            )

        # Vérifier budget journalier
        daily_percent = daily / self.daily_budget
        if daily_percent >= self.CRITICAL_THRESHOLD:
            self._send_alert(
                level='CRITICAL',
                message=f"Budget journalier critique: {daily}/{self.daily_budget} tokens ({daily_percent:.0%})",
                org_id=org_id,
                user_id=user_id
            )
        elif daily_percent >= self.WARNING_THRESHOLD:
            self._send_alert(
                level='WARNING',
                message=f"Budget journalier warning: {daily}/{self.daily_budget} tokens ({daily_percent:.0%})",
                org_id=org_id,
                user_id=user_id
            )

    def _send_alert(self, level: str, message: str, org_id: int, user_id: int):
        """Envoie une alerte par email et log"""

        # Logger
        log_func = logger.critical if level == 'CRITICAL' else logger.warning
        log_func(f"TOKEN_BUDGET_ALERT: {message}", extra={
            'organization_id': org_id,
            'user_id': user_id,
            'level': level
        })

        # Éviter spam: 1 email max par heure
        alert_key = f"alert_sent_{level}_{org_id}_{datetime.now().strftime('%Y%m%d_%H')}"
        if cache.get(alert_key):
            return

        cache.set(alert_key, True, 3600)

        # Envoyer email si configuré
        admin_email = getattr(settings, 'ADMIN_EMAIL', None)
        if admin_email:
            try:
                send_mail(
                    subject=f"[{level}] ProcureGenius - Budget Tokens IA",
                    message=f"{message}\n\nOrganization ID: {org_id}\nUser ID: {user_id}",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[admin_email],
                    fail_silently=False
                )
            except Exception as e:
                logger.error(f"Failed to send alert email: {e}")

    def get_usage_stats(self, organization_id: int) -> Dict:
        """Récupère les statistiques d'utilisation"""
        now = datetime.now()
        hour_key = f"tokens_hour_{now.strftime('%Y%m%d_%H')}_{organization_id}"
        day_key = f"tokens_day_{now.strftime('%Y%m%d')}_{organization_id}"

        hourly = cache.get(hour_key, 0)
        daily = cache.get(day_key, 0)

        return {
            'hourly_usage': hourly,
            'hourly_budget': self.hourly_budget,
            'hourly_percent': (hourly / self.hourly_budget * 100) if self.hourly_budget else 0,
            'daily_usage': daily,
            'daily_budget': self.daily_budget,
            'daily_percent': (daily / self.daily_budget * 100) if self.daily_budget else 0,
            'timestamp': now.isoformat()
        }


# Instance globale
token_monitor = TokenMonitor()
