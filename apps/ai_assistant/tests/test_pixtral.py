"""
Tests pour Pixtral - analyse directe de documents (images)
"""
import pytest
from apps.ai_assistant.pixtral_service import PixtralService
from unittest.mock import Mock, patch
import base64


class TestPixtralService:
    """Tests du service Pixtral pour analyse de documents"""

    def setup_method(self):
        """Setup avant chaque test"""
        self.service = PixtralService()

    def test_pixtral_service_initialization(self):
        """Test: Initialisation du service"""
        assert self.service.PIXTRAL_MODEL == "pixtral-12b-latest"
        assert self.service.max_file_size == 10 * 1024 * 1024

    def test_build_prompt_invoice(self):
        """Test: Construction du prompt pour facture"""
        prompt = self.service._build_prompt("invoice")

        assert "facture" in prompt.lower()
        assert "invoice_number" in prompt
        assert "client_name" in prompt
        assert "items" in prompt
        assert "JSON" in prompt

    def test_build_prompt_purchase_order(self):
        """Test: Construction du prompt pour bon de commande"""
        prompt = self.service._build_prompt("purchase_order")

        assert "bon de commande" in prompt.lower() or "purchase order" in prompt.lower()
        assert "po_number" in prompt
        assert "supplier_name" in prompt

    def test_build_prompt_receipt(self):
        """Test: Construction du prompt pour reçu"""
        prompt = self.service._build_prompt("receipt")

        assert "reçu" in prompt.lower() or "ticket" in prompt.lower()
        assert "merchant_name" in prompt

    def test_clean_json_response_with_markdown(self):
        """Test: Nettoyage JSON avec markdown"""
        json_with_markdown = '```json\n{"test": "value"}\n```'
        cleaned = self.service._clean_json_response(json_with_markdown)

        assert cleaned == '{"test": "value"}'
        assert not cleaned.startswith('```')

    def test_clean_json_response_plain(self):
        """Test: Nettoyage JSON déjà propre"""
        json_plain = '{"test": "value"}'
        cleaned = self.service._clean_json_response(json_plain)

        assert cleaned == '{"test": "value"}'

    def test_prepare_image_from_bytes(self):
        """Test: Préparation image depuis bytes"""
        # Créer une petite image de test
        test_bytes = b'fake_image_data'
        base64_result = self.service._prepare_image(test_bytes)

        assert isinstance(base64_result, str)
        assert len(base64_result) > 0

        # Vérifier que c'est du base64 valide
        decoded = base64.b64decode(base64_result)
        assert decoded == test_bytes

    def test_prepare_image_too_large(self):
        """Test: Rejet image trop volumineuse"""
        # Image de 11MB
        large_bytes = b'x' * (11 * 1024 * 1024)

        with pytest.raises(ValueError, match="trop volumineuse"):
            self.service._prepare_image(large_bytes)

    @patch('apps.ai_assistant.pixtral_service.Mistral')
    def test_analyze_document_image_success(self, mock_mistral):
        """Test: Analyse réussie d'une image de facture"""
        # Mock de la réponse Mistral
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = '''```json
{
  "invoice_number": "FAC-2025-001",
  "date": "2025-01-15",
  "client_name": "Acme Corp",
  "total": 1500.00,
  "currency": "EUR"
}
```'''
        mock_response.usage = Mock()
        mock_response.usage.total_tokens = 350

        mock_mistral.return_value.chat.complete.return_value = mock_response

        # Créer un service avec le mock
        service = PixtralService()
        service.client = mock_mistral.return_value

        # Tester l'analyse
        test_image = b'fake_invoice_image'
        result = service.analyze_document_image(test_image, "invoice")

        # Vérifications
        assert result['success'] is True
        assert result['method'] == 'pixtral_vision'
        assert result['document_type'] == 'invoice'
        assert 'data' in result
        assert result['data']['invoice_number'] == "FAC-2025-001"
        assert result['data']['total'] == 1500.00
        assert result['tokens_used'] == 350

    @patch('apps.ai_assistant.pixtral_service.Mistral')
    def test_analyze_document_image_error(self, mock_mistral):
        """Test: Gestion d'erreur lors de l'analyse"""
        # Mock qui lève une exception
        mock_mistral.return_value.chat.complete.side_effect = Exception("API Error")

        service = PixtralService()
        service.client = mock_mistral.return_value

        test_image = b'fake_image'
        result = service.analyze_document_image(test_image, "invoice")

        # Vérifications
        assert result['success'] is False
        assert 'error' in result
        assert "API Error" in result['error']

    def test_compare_methods_structure(self):
        """Test: Structure de la comparaison de méthodes"""
        # Mock pour éviter appel API réel
        with patch.object(self.service, 'analyze_document_image') as mock_analyze:
            mock_analyze.return_value = {
                'success': True,
                'data': {'test': 'data'},
                'tokens_used': 300
            }

            test_image = b'test'
            comparison = self.service.compare_with_ocr_method(test_image, "invoice")

            # Vérifier structure
            assert 'pixtral' in comparison
            assert 'recommendation' in comparison
            assert 'result' in comparison['pixtral']
            assert 'time_seconds' in comparison['pixtral']
            assert 'tokens_used' in comparison['pixtral']
            assert 'cost_estimate' in comparison['pixtral']


@pytest.mark.integration
class TestPixtralIntegration:
    """Tests d'intégration avec l'API Mistral réelle (skip si pas de clé API)"""

    @pytest.mark.skip(reason="Nécessite une clé API Mistral valide")
    def test_real_invoice_analysis(self):
        """Test: Analyse réelle d'une facture (skip par défaut)"""
        # Ce test peut être décommenté pour tester avec une vraie image
        service = PixtralService()

        # Charger une image de facture de test
        # with open('test_invoice.jpg', 'rb') as f:
        #     image_bytes = f.read()

        # result = service.analyze_document_image(image_bytes, "invoice")

        # assert result['success'] is True
        # assert 'invoice_number' in result['data']
        pass
