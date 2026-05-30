"""
Tests pour le système de matching d'entités (fuzzy matching).

Aligné sur l'API réelle de EnhancedEntityMatcher :
  - find_similar_clients(first_name, last_name='', company=..., min_score=...)
  - find_similar_suppliers(name, ..., min_score=...)
Chacune renvoie une liste de tuples (entité, score, details), triée par score
décroissant. Le filtrage par organisation est fait côté appelant (cf.
_services_core.py), donc on l'applique ici de la même façon.
"""
import pytest
from django.test import TestCase
from apps.ai_assistant.entity_matcher import EnhancedEntityMatcher
from apps.accounts.models import Organization, Client
from apps.suppliers.models import Supplier


def _filter_org(matches, organization):
    """Reproduit le filtrage par organisation appliqué par les appelants."""
    return [
        (entity, score, details)
        for entity, score, details in matches
        if entity.organization_id == organization.id
    ]


@pytest.mark.django_db
class TestEntityMatcher(TestCase):
    """Tests du fuzzy matching pour éviter les doublons"""

    def setUp(self):
        self.org = Organization.objects.create(name="Test Org")
        self.matcher = EnhancedEntityMatcher(threshold=0.50)

        self.suppliers = [
            Supplier.objects.create(name="Gérard Dupont", organization=self.org),
            Supplier.objects.create(name="ACME Corporation", organization=self.org),
            Supplier.objects.create(name="Tech Solutions Inc", organization=self.org),
        ]
        self.clients = [
            Client.objects.create(name="Marie Martin", organization=self.org),
            Client.objects.create(name="Société Générale", organization=self.org),
        ]

    def test_fuzzy_match_partial_name(self):
        """Match 'Gérard' avec 'Gérard Dupont'"""
        matches = self.matcher.find_similar_suppliers("Gérard")
        assert len(matches) > 0
        supplier, score, _ = matches[0]
        assert supplier.name == "Gérard Dupont"
        assert score >= 0.50

    def test_fuzzy_match_case_insensitive(self):
        """Match insensible à la casse"""
        matches = self.matcher.find_similar_suppliers("acme corporation")
        assert len(matches) > 0
        assert matches[0][0].name == "ACME Corporation"

    def test_fuzzy_match_accents(self):
        """Match avec/sans accents"""
        matches = self.matcher.find_similar_suppliers("Gerard Dupont")
        assert len(matches) > 0
        assert "Gérard" in matches[0][0].name

    def test_no_match_below_threshold(self):
        """Pas de match pour un nom complètement différent"""
        matches = self.matcher.find_similar_suppliers("Completely Different Name XYZ")
        assert all(score < 0.60 for _, score, _ in matches) if matches else True

    def test_exact_match_100_percent(self):
        """Match exact = 100%"""
        matches = self.matcher.find_similar_clients(
            first_name="Marie", last_name="Martin", company="Marie Martin"
        )
        assert len(matches) > 0
        client, score, _ = matches[0]
        assert client.name == "Marie Martin"
        assert score >= 0.95

    def test_match_respects_organization(self):
        """Le filtrage par organisation (côté appelant) isole bien les orgs"""
        other_org = Organization.objects.create(name="Other Org")
        Supplier.objects.create(name="Gérard Dupont", organization=other_org)

        matches = _filter_org(self.matcher.find_similar_suppliers("Gérard"), self.org)
        assert matches
        assert all(s.organization_id == self.org.id for s, _, _ in matches)

    def test_threshold_configurable(self):
        """Le threshold est configurable"""
        strict_matcher = EnhancedEntityMatcher(threshold=0.80)
        matches = strict_matcher.find_similar_suppliers("Gérard")
        assert all(score >= 0.80 for _, score, _ in matches)

    def test_normalize_text(self):
        """Normalisation du texte (minuscules, sans accents)"""
        normalized = self.matcher.normalize_text("  Société GÉNÉRALE  ")
        assert normalized == "societe generale"

    def test_performance_with_many_entities(self):
        """Performance avec beaucoup d'entités (< 2 s)"""
        for i in range(100):
            Supplier.objects.create(name=f"Supplier {i}", organization=self.org)

        import time
        start = time.time()
        matches = self.matcher.find_similar_suppliers("Supplier 50")
        duration = time.time() - start

        assert duration < 2.0
        assert len(matches) > 0
