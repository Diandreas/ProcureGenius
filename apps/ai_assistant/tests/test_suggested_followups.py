"""Tests des questions de suivi suggérées (orchestrator._suggested_followups).

Déterministe, zéro appel LLM : suggestions dérivées des outils réellement
utilisés dans la réponse.
"""
from apps.ai_assistant.services.orchestrator import _suggested_followups


class TestSuggestedFollowups:
    def test_empty_tool_results_returns_empty(self):
        assert _suggested_followups([]) == []

    def test_unknown_tool_returns_empty(self):
        results = [{"function": "some_unmapped_tool", "result": {"success": True}}]
        assert _suggested_followups(results) == []

    def test_known_tool_returns_suggestions(self):
        results = [{"function": "get_invoice_stats", "result": {"success": True}}]
        suggestions = _suggested_followups(results)
        assert len(suggestions) > 0
        assert all(isinstance(s, str) for s in suggestions)

    def test_preserves_call_order(self):
        results = [
            {"function": "create_invoice", "result": {"success": True}},
            {"function": "get_stock_stats", "result": {"success": True}},
        ]
        suggestions = _suggested_followups(results)
        # Les suggestions de create_invoice doivent apparaitre avant celles
        # de get_stock_stats (ordre d'appel preserve).
        create_invoice_suggestions = set(_suggested_followups([results[0]]))
        assert suggestions[0] in create_invoice_suggestions

    def test_deduplicates_across_multiple_calls(self):
        # Deux appels au meme outil ne doivent pas dupliquer les suggestions.
        results = [
            {"function": "get_statistics", "result": {"success": True}},
            {"function": "get_stats", "result": {"success": True}},  # meme famille de suggestions
        ]
        suggestions = _suggested_followups(results)
        assert len(suggestions) == len(set(suggestions))

    def test_caps_at_max_count(self):
        # Plusieurs outils differents generant beaucoup de suggestions.
        results = [
            {"function": "create_invoice", "result": {}},
            {"function": "get_stock_stats", "result": {}},
            {"function": "create_supplier", "result": {}},
            {"function": "get_account_list", "result": {}},
        ]
        suggestions = _suggested_followups(results, max_count=3)
        assert len(suggestions) <= 3

    def test_no_followups_for_generic_search(self):
        # search_entity n'est pas dans la table de mapping -> pas de suggestion
        # fantaisiste, mieux vaut ne rien afficher que quelque chose de non pertinent.
        results = [{"function": "search_entity", "result": {"success": True}}]
        assert _suggested_followups(results) == []
