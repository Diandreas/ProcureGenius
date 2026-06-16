"""
Service de statistiques produit (admin/fondateur).

Calcule, à partir des données réelles, tout ce qui aide à comprendre
ce que font les utilisateurs et quoi améliorer :
  - Acquisition : visiteurs, sources, conversion visite -> inscription
  - Activation : funnel inscription -> 1re action -> organisation configurée
  - Rétention / churn : abonnements actifs, annulations, essais
  - Usage : utilisation réelle par fonctionnalité (factures, BC, IA...)
  - Revenu : MRR estimé, répartition par plan

Réservé aux superusers (voir admin_stats_view).
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

User = get_user_model()


def _safe_count(qs):
    try:
        return qs.count()
    except Exception:
        return 0


def _daily_series(qs, date_field, days, now):
    """Série quotidienne [{date, count}] sur `days` jours pour un queryset."""
    start = now - timedelta(days=days)
    rows = (
        qs.filter(**{f"{date_field}__gte": start})
        .annotate(d=TruncDate(date_field))
        .values('d')
        .annotate(c=Count('id'))
        .order_by('d')
    )
    by_day = {r['d'].isoformat(): r['c'] for r in rows if r['d']}
    series = []
    for i in range(days):
        day = (start + timedelta(days=i + 1)).date().isoformat()
        series.append({'date': day, 'count': by_day.get(day, 0)})
    return series


def get_admin_stats(days=30):
    now = timezone.now()
    since = now - timedelta(days=days)
    prev_since = since - timedelta(days=days)

    stats = {
        'generated_at': now.isoformat(),
        'period_days': days,
    }

    # ----------------------------------------------------------------
    # 1. ACQUISITION (visiteurs anonymes du site)
    # ----------------------------------------------------------------
    acquisition = {'available': False}
    try:
        from .models import Visit
        visits = Visit.objects.exclude(device_type='bot')
        period_visits = visits.filter(created_at__gte=since)
        uniques = period_visits.values('anon_id').distinct().count()

        top_sources = list(
            period_visits.exclude(referrer_domain='')
            .values('referrer_domain')
            .annotate(c=Count('id'))
            .order_by('-c')[:10]
        )
        top_utm = list(
            period_visits.exclude(utm_source='')
            .values('utm_source')
            .annotate(c=Count('id'))
            .order_by('-c')[:10]
        )
        devices = list(
            period_visits.values('device_type')
            .annotate(c=Count('id'))
            .order_by('-c')
        )
        converted = period_visits.filter(converted_user__isnull=False)\
            .values('anon_id').distinct().count()

        acquisition = {
            'available': True,
            'total_visits': period_visits.count(),
            'unique_visitors': uniques,
            'direct_visits': period_visits.filter(referrer_domain='').count(),
            'top_sources': top_sources,
            'top_utm_sources': top_utm,
            'devices': devices,
            'converted_visitors': converted,
            'visit_to_signup_rate': round(100 * converted / uniques, 1) if uniques else 0,
            'daily': _daily_series(visits, 'created_at', days, now),
        }
    except Exception as e:
        acquisition = {'available': False, 'error': str(e)}
    stats['acquisition'] = acquisition

    # ----------------------------------------------------------------
    # 2. INSCRIPTIONS / CROISSANCE
    # ----------------------------------------------------------------
    all_users = User.objects.all()
    new_period = all_users.filter(date_joined__gte=since).count()
    new_prev = all_users.filter(date_joined__gte=prev_since, date_joined__lt=since).count()
    growth = round(100 * (new_period - new_prev) / new_prev, 1) if new_prev else None

    stats['users'] = {
        'total': all_users.count(),
        'active_flag': all_users.filter(is_active=True).count(),
        'new_this_period': new_period,
        'new_previous_period': new_prev,
        'growth_pct': growth,
        'new_last_24h': all_users.filter(date_joined__gte=now - timedelta(days=1)).count(),
        'new_last_7d': all_users.filter(date_joined__gte=now - timedelta(days=7)).count(),
        'daily_signups': _daily_series(all_users, 'date_joined', days, now),
        'recent': [
            {
                'email': u.email or u.get_username(),
                'joined': u.date_joined.isoformat(),
                'is_active': u.is_active,
            }
            for u in all_users.order_by('-date_joined')[:15]
        ],
    }

    # ----------------------------------------------------------------
    # 3. ACTIVATION (funnel : inscrit -> a fait une vraie action)
    # ----------------------------------------------------------------
    activation = {}
    try:
        from apps.analytics.models import ActivityLog
        from apps.accounts.models import Organization

        signed_up = all_users.count()
        # A configuré une organisation
        orgs_configured = Organization.objects.count()
        # Utilisateurs ayant produit au moins une activité (action réelle)
        active_doers = ActivityLog.objects.filter(user__isnull=False)\
            .values('user').distinct().count()
        # Ont terminé l'onboarding
        try:
            from apps.accounts.models import UserPreferences
            onboarded = UserPreferences.objects.filter(onboarding_completed=True).count()
        except Exception:
            onboarded = None

        activation = {
            'signed_up': signed_up,
            'onboarding_completed': onboarded,
            'organizations_configured': orgs_configured,
            'users_with_real_action': active_doers,
            'activation_rate': round(100 * active_doers / signed_up, 1) if signed_up else 0,
        }
    except Exception as e:
        activation = {'error': str(e)}
    stats['activation'] = activation

    # ----------------------------------------------------------------
    # 4. ENGAGEMENT / ACTIFS RÉCURRENTS
    # ----------------------------------------------------------------
    engagement = {}
    try:
        from apps.analytics.models import ActivityLog
        wau = ActivityLog.objects.filter(
            created_at__gte=now - timedelta(days=7), user__isnull=False
        ).values('user').distinct().count()
        mau = ActivityLog.objects.filter(
            created_at__gte=now - timedelta(days=30), user__isnull=False
        ).values('user').distinct().count()
        dau = ActivityLog.objects.filter(
            created_at__gte=now - timedelta(days=1), user__isnull=False
        ).values('user').distinct().count()
        engagement = {
            'dau': dau, 'wau': wau, 'mau': mau,
            'stickiness_pct': round(100 * dau / mau, 1) if mau else 0,
            'activity_daily': _daily_series(
                ActivityLog.objects.all(), 'created_at', days, now
            ),
        }
    except Exception as e:
        engagement = {'error': str(e)}
    stats['engagement'] = engagement

    # ----------------------------------------------------------------
    # 5. USAGE PAR FONCTIONNALITÉ (ce que les gens font vraiment)
    # ----------------------------------------------------------------
    feature_usage = {}
    try:
        from apps.analytics.models import ActivityLog
        by_entity = list(
            ActivityLog.objects.filter(created_at__gte=since)
            .values('entity_type')
            .annotate(c=Count('id'))
            .order_by('-c')
        )
        by_action = list(
            ActivityLog.objects.filter(created_at__gte=since)
            .values('action_type')
            .annotate(c=Count('id'))
            .order_by('-c')
        )
        feature_usage = {'by_feature': by_entity, 'by_action': by_action}
    except Exception as e:
        feature_usage = {'error': str(e)}

    # Compteurs métier bruts (volume de données créées dans la période)
    try:
        from apps.invoicing.models import Invoice, Product
        from apps.purchase_orders.models import PurchaseOrder
        from apps.suppliers.models import Supplier
        from apps.ai_assistant.models import Conversation, Message
        from apps.accounts.models import Client
        feature_usage['volumes'] = {
            'invoices': _safe_count(Invoice.objects.all()),
            'purchase_orders': _safe_count(PurchaseOrder.objects.all()),
            'products': _safe_count(Product.objects.all()),
            'suppliers': _safe_count(Supplier.objects.all()),
            'clients': _safe_count(Client.objects.all()),
            'ai_conversations': _safe_count(Conversation.objects.all()),
            'ai_messages': _safe_count(Message.objects.all()),
            'ai_messages_period': _safe_count(
                Message.objects.filter(created_at__gte=since)
            ),
        }
    except Exception as e:
        feature_usage['volumes_error'] = str(e)
    stats['feature_usage'] = feature_usage

    # ----------------------------------------------------------------
    # 6. ABONNEMENTS / REVENU / CHURN
    # ----------------------------------------------------------------
    subscriptions = {}
    try:
        from apps.subscriptions.models import Subscription
        subs = Subscription.objects.select_related('plan')
        by_status = list(subs.values('status').annotate(c=Count('id')).order_by('-c'))
        by_plan = list(
            subs.values('plan__name', 'status').annotate(c=Count('id')).order_by('-c')
        )

        active = subs.filter(status='active')
        trial = subs.filter(status='trial')
        cancelled = subs.filter(status='cancelled')

        # MRR estimé : abonnements actifs, prix mensuel équivalent
        mrr = Decimal('0')
        for s in active.select_related('plan'):
            try:
                if s.billing_period == 'yearly' and s.plan.price_yearly:
                    mrr += Decimal(s.plan.price_yearly) / 12
                elif s.plan.price_monthly:
                    mrr += Decimal(s.plan.price_monthly)
            except Exception:
                continue

        total_paying = active.count()
        churn_base = total_paying + cancelled.count()
        subscriptions = {
            'by_status': by_status,
            'by_plan': by_plan,
            'active': total_paying,
            'trial': trial.count(),
            'cancelled': cancelled.count(),
            'mrr_estimate': float(round(mrr, 2)),
            'arr_estimate': float(round(mrr * 12, 2)),
            'churn_rate_pct': round(100 * cancelled.count() / churn_base, 1) if churn_base else 0,
            'trials_ending_7d': trial.filter(
                trial_ends_at__lte=now + timedelta(days=7),
                trial_ends_at__gte=now,
            ).count(),
        }
    except Exception as e:
        subscriptions = {'error': str(e)}
    stats['subscriptions'] = subscriptions

    return stats
