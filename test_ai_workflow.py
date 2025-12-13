"""
Script de test pour valider le workflow IA sans appels API réels

Usage:
    python test_ai_workflow.py
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.ai_assistant.services import MistralService


def test_parse_confirmation_response():
    """Test du parsing des réponses de confirmation"""
    print("\n=== Test Parse Confirmation Response ===")

    service = MistralService()

    # Simulation d'un pending_confirmation
    pending_confirmation = {
        'action': 'create_invoice',
        'original_params': {'client_name': 'Gérard', 'amount': 15000},
        'options': [
            {'id': 'use_existing', 'label': 'Utiliser Gérard Dupont', 'client_id': 'uuid-123'},
            {'id': 'force_create', 'label': 'Créer nouveau'},
            {'id': 'cancel', 'label': 'Annuler'}
        ]
    }

    # Test réponses numériques
    test_cases = [
        ("1", "use_existing"),
        ("2", "force_create"),
        ("3", "cancel"),
        ("utiliser", "use_existing"),
        ("créer nouveau", "force_create"),
        ("annuler", "cancel"),
        ("message random", None),  # Ne devrait pas matcher
    ]

    for user_input, expected_option in test_cases:
        result = service._parse_confirmation_response(user_input, pending_confirmation)

        if expected_option is None:
            status = "✓ PASS" if result is None else "✗ FAIL"
            print(f"{status}: '{user_input}' → None (attendu: None)")
        elif expected_option == "cancel":
            status = "✓ PASS" if result and result.get('cancel') else "✗ FAIL"
            print(f"{status}: '{user_input}' → Cancel")
        else:
            status = "✓ PASS" if result and result.get('selected_option') == expected_option else "✗ FAIL"
            expected_action = result.get('action') if result else None
            print(f"{status}: '{user_input}' → {expected_option} (action: {expected_action})")

    print("\n=== Test Completed ===\n")


def test_system_prompt_cache():
    """Test du caching du system prompt"""
    print("\n=== Test System Prompt Cache ===")

    from django.core.cache import cache

    # Nettoyer le cache
    cache.clear()

    service1 = MistralService()

    # Premier appel - doit générer le prompt
    prompt1 = service1.create_system_prompt()
    print(f"✓ Prompt généré ({len(prompt1)} caractères)")

    # Vérifier qu'il est en cache
    cached = cache.get(service1.SYSTEM_PROMPT_CACHE_KEY)
    if cached:
        print("✓ Prompt stocké dans Redis cache")
    else:
        print("✗ FAIL: Prompt non trouvé dans cache")

    # Second appel - doit charger du cache
    service2 = MistralService()
    prompt2 = service2.create_system_prompt()

    if prompt1 == prompt2:
        print("✓ Prompt identique (cache hit)")
    else:
        print("✗ FAIL: Prompts différents")

    # Vérifier le contenu du nouveau prompt
    if "WORKFLOW AUTOMATIQUE" in prompt1:
        print("✓ Nouveau workflow présent dans le prompt")
    else:
        print("✗ FAIL: Nouveau workflow absent")

    print("\n=== Test Completed ===\n")


def test_tool_descriptions():
    """Test des descriptions des tools"""
    print("\n=== Test Tool Descriptions ===")

    service = MistralService()

    # Trouver create_invoice et search_client dans les tools
    create_invoice_tool = None
    search_client_tool = None

    for tool in service.tools:
        if tool['function']['name'] == 'create_invoice':
            create_invoice_tool = tool
        elif tool['function']['name'] == 'search_client':
            search_client_tool = tool

    # Vérifier create_invoice
    if create_invoice_tool:
        desc = create_invoice_tool['function']['description']
        if "DIRECTEMENT" in desc and "N'utilise PAS search_client" in desc:
            print("✓ create_invoice: Description améliorée présente")
        else:
            print("✗ FAIL: create_invoice description non améliorée")
            print(f"  Description actuelle: {desc}")
    else:
        print("✗ FAIL: create_invoice tool non trouvé")

    # Vérifier search_client
    if search_client_tool:
        desc = search_client_tool['function']['description']
        if "UNIQUEMENT" in desc and "N'utilise PAS cette fonction avant create_invoice" in desc:
            print("✓ search_client: Description améliorée présente")
        else:
            print("✗ FAIL: search_client description non améliorée")
            print(f"  Description actuelle: {desc}")
    else:
        print("✗ FAIL: search_client tool non trouvé")

    print("\n=== Test Completed ===\n")


def main():
    """Exécute tous les tests"""
    print("\n" + "="*60)
    print("  TEST WORKFLOW IA - ProcureGenius")
    print("="*60)

    try:
        test_parse_confirmation_response()
        test_system_prompt_cache()
        test_tool_descriptions()

        print("\n" + "="*60)
        print("  TOUS LES TESTS TERMINÉS")
        print("="*60 + "\n")

    except Exception as e:
        print(f"\n✗ ERREUR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
