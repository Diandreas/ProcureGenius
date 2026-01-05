"""
Test du flux complet : API Mistral + Exécution d'actions
"""
import os
import django
import sys

# Fix encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Configure Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.ai_assistant.services import MistralService, ActionExecutor
from django.contrib.auth import get_user_model
from asgiref.sync import sync_to_async
import asyncio

User = get_user_model()

async def test_full_flow():
    """Test du flux complet"""
    try:
        # Récupérer ou créer un utilisateur de test (utiliser sync_to_async)
        user = await sync_to_async(User.objects.first)()
        if not user:
            print("Aucun utilisateur trouvé. Créez un utilisateur d'abord.")
            return

        print(f"Utilisateur de test: {user.email}")
        print("="*60)

        # Test 1: Extraction et création de fournisseur
        print("\n🔍 TEST 1: Extraction d'informations et création de fournisseur")
        print("-" * 60)

        service = MistralService()
        result = await service.chat(
            message="Extrait les informations du fournisseur: CYNTHIA, =237620287935, david@gmail.com, yaounde. Crée moi un fournisseur.",
            conversation_history=[],
            user_context={'user_id': user.id}
        )

        print(f"✓ Réponse IA: {result.get('response')}")
        print(f"✓ Tool calls détectés: {len(result.get('tool_calls', []))}")

        if result.get('tool_calls'):
            executor = ActionExecutor()

            for tool_call in result['tool_calls']:
                print(f"\n📝 Exécution: {tool_call['function']}")
                print(f"   Paramètres: {tool_call['arguments']}")

                action_result = await executor.execute(
                    action=tool_call['function'],
                    params=tool_call['arguments'],
                    user=user
                )

                print(f"   Résultat: {'✓ Succès' if action_result.get('success') else '✗ Échec'}")
                print(f"   Message: {action_result.get('message', action_result.get('error', 'N/A'))}")

                if action_result.get('success'):
                    print(f"   ID créé: {action_result.get('data', {}).get('id', 'N/A')}")
                    print(f"   Nom: {action_result.get('data', {}).get('name', 'N/A')}")

        # Test 2: Recherche de fournisseur
        print("\n" + "="*60)
        print("\n🔍 TEST 2: Recherche de fournisseur")
        print("-" * 60)

        result2 = await service.chat(
            message="Recherche le fournisseur CYNTHIA",
            conversation_history=[],
            user_context={'user_id': user.id}
        )

        print(f"✓ Réponse IA: {result2.get('response')}")

        if result2.get('tool_calls'):
            for tool_call in result2['tool_calls']:
                print(f"\n📝 Exécution: {tool_call['function']}")
                print(f"   Paramètres: {tool_call['arguments']}")

                action_result = await executor.execute(
                    action=tool_call['function'],
                    params=tool_call['arguments'],
                    user=user
                )

                print(f"   Résultats trouvés: {action_result.get('count', 0)}")
                if action_result.get('data'):
                    for supplier in action_result['data']:
                        print(f"   - {supplier.get('name')} ({supplier.get('email')})")

        print("\n" + "="*60)
        print("✓ Tests terminés avec succès!")

    except Exception as e:
        import traceback
        print(f"\n✗ Erreur lors du test: {e}")
        print(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(test_full_flow())
