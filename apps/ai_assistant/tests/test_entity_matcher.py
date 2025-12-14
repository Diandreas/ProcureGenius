"""
Tests pour le système de matching d'entités (fuzzy matching)
"""
import pytest
from django.test import TestCase
from apps.ai_assistant.entity_matcher import EnhancedEntityMatcher
from apps.organizations.models import Organization
from apps.suppliers.models import Supplier
from apps.clients.models import Client


@pytest.mark.django_db
class TestEntityMatcher(TestCase):
    """Tests du fuzzy matching pour éviter les doublons"""

    def setUp(self):
        self.org = Organization.objects.create(
            name="Test Org",
            slug="test-org"
        )
        self.matcher = EnhancedEntityMatcher(threshold=0.50)

        # Créer des entités de test
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
        """Test: Match 'Gérard' avec 'Gérard Dupont'"""
        matches = self.matcher.fuzzy_match_supplier(
            "Gérard",
            self.org.id
        )

        assert len(matches) > 0
        assert matches[0]['name'] == "Gérard Dupont"
        assert matches[0]['similarity_score'] >= 0.50

    def test_fuzzy_match_case_insensitive(self):
        """Test: Match insensible à la casse"""
        matches = self.matcher.fuzzy_match_supplier(
            "acme corporation",
            self.org.id
        )

        assert len(matches) > 0
        assert matches[0]['name'] == "ACME Corporation"

    def test_fuzzy_match_accents(self):
        """Test: Match avec/sans accents"""
        matches = self.matcher.fuzzy_match_supplier(
            "Gerard Dupont",
            self.org.id
        )

        assert len(matches) > 0
        assert "Gérard" in matches[0]['name']

    def test_no_match_below_threshold(self):
        """Test: Pas de match si score < 50%"""
        matches = self.matcher.fuzzy_match_supplier(
            "Completely Different Name XYZ",
            self.org.id
        )

        # Ne doit pas matcher avec des noms complètement différents
        assert all(m['similarity_score'] < 0.60 for m in matches) if matches else True

    def test_exact_match_100_percent(self):
        """Test: Match exact = 100%"""
        matches = self.matcher.fuzzy_match_client(
            "Marie Martin",
            self.org.id
        )

        assert len(matches) > 0
        assert matches[0]['name'] == "Marie Martin"
        assert matches[0]['similarity_score'] >= 0.95

    def test_match_respects_organization(self):
        """Test: Ne match que les entités de la même organisation"""
        # Créer une autre organisation
        other_org = Organization.objects.create(
            name="Other Org",
            slug="other-org"
        )
        Supplier.objects.create(name="Gérard Dupont", organization=other_org)

        matches = self.matcher.fuzzy_match_supplier(
            "Gérard",
            self.org.id
        )

        # Ne doit trouver que celui de self.org
        assert all(m['organization_id'] == self.org.id for m in matches)

    def test_threshold_configurable(self):
        """Test: Le threshold est configurable"""
        strict_matcher = EnhancedEntityMatcher(threshold=0.80)

        matches = strict_matcher.fuzzy_match_supplier(
            "Gérard",
            self.org.id
        )

        # Avec threshold strict, moins de matches
        assert all(m['similarity_score'] >= 0.80 for m in matches)

    def test_normalize_text(self):
        """Test: Normalisation du texte"""
        text = "  Société GÉNÉRALE  "
        normalized = self.matcher.normalize_text(text)

        assert normalized == "societe generale"
        assert " " not in normalized.strip()

    def test_performance_with_many_entities(self):
        """Test: Performance avec beaucoup d'entités"""
        # Créer 100 fournisseurs
        for i in range(100):
            Supplier.objects.create(
                name=f"Supplier {i}",
                organization=self.org
            )

        import time
        start = time.time()
        matches = self.matcher.fuzzy_match_supplier(
            "Supplier 50",
            self.org.id
        )
        duration = time.time() - start

        # Doit être rapide (< 1 seconde)
        assert duration < 1.0
        assert len(matches) > 0
