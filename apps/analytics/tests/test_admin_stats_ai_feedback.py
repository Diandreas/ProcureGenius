"""Tests de la section ai_feedback de get_admin_stats (dashboard feedback IA)."""
import pytest

from apps.accounts.models import Organization, CustomUser
from apps.ai_assistant.models import Conversation, Message, MessageFeedback
from apps.analytics.admin_stats_service import get_admin_stats


@pytest.fixture
def organization(db):
    return Organization.objects.create(name="Org AdminStats")


@pytest.fixture
def user(organization):
    return CustomUser.objects.create_user(
        username="statsuser", email="stats@example.com",
        password="testpass123", organization=organization,
    )


def _message_with_feedback(user, organization, rating, comment=''):
    conv = Conversation.objects.create(user=user, organization=organization, title="Conv")
    msg = Message.objects.create(conversation=conv, role='assistant', content="Réponse de test")
    return MessageFeedback.objects.create(message=msg, user=user, rating=rating, comment=comment)


@pytest.mark.django_db
class TestAdminStatsAiFeedback:
    def test_no_feedback_available_but_no_crash(self):
        stats = get_admin_stats(days=30)
        assert stats['ai_feedback']['available'] is True
        assert stats['ai_feedback']['total'] == 0
        assert stats['ai_feedback']['satisfaction_pct'] is None

    def test_satisfaction_percentage_computed(self, user, organization):
        _message_with_feedback(user, organization, rating=1)
        _message_with_feedback(user, organization, rating=1)
        _message_with_feedback(user, organization, rating=-1)

        stats = get_admin_stats(days=30)
        fb = stats['ai_feedback']
        assert fb['total'] == 3
        assert fb['positive'] == 2
        assert fb['negative'] == 1
        assert fb['satisfaction_pct'] == pytest.approx(66.7, abs=0.1)

    def test_recent_negative_includes_comment_and_excerpt(self, user, organization):
        _message_with_feedback(user, organization, rating=-1, comment="Chiffres faux")

        stats = get_admin_stats(days=30)
        negatives = stats['ai_feedback']['recent_negative']
        assert len(negatives) == 1
        assert negatives[0]['comment'] == "Chiffres faux"
        assert "Réponse de test" in negatives[0]['message_excerpt']
        assert negatives[0]['user'] == 'stats@example.com'

    def test_positive_feedback_excluded_from_recent_negative(self, user, organization):
        _message_with_feedback(user, organization, rating=1, comment="Top")

        stats = get_admin_stats(days=30)
        assert stats['ai_feedback']['recent_negative'] == []
