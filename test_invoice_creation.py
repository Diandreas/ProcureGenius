"""
Test de création de facture
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

async def test_invoice():
    """Test de création de facture"""
    try:
        # Récupérer un utilisateur
        user = await sync_to_async(User.objects.first)()
        if not user:
            print("Aucun utilisateur trouvé.")
            return

        print(f"Utilisateur de test: {user.email}")
        print("="*60)

        # Test: Création de facture
        print("\nTest: Création de facture")
        print("-" * 60)

        service = MistralService()
        result = await service.chat(
            message='Crée une facture pour le client "Entreprise ABC", montant 2500€, description "Services de développement web"',
            conversation_history=[],
            user_context={'user_id': user.id}
        )

        print(f"Réponse IA: {result.get('response')}")
        print(f"Tool calls: {result.get('tool_calls')}")

        if result.get('tool_calls'):
            executor = ActionExecutor()

            for tool_call in result['tool_calls']:
                print(f"\nExécution: {tool_call['function']}")
                print(f"Paramètres: {tool_call['arguments']}")

                action_result = await executor.execute(
                    action=tool_call['function'],
                    params=tool_call['arguments'],
                    user=user
                )

                print(f"Résultat: {'✓ Succès' if action_result.get('success') else '✗ Échec'}")
                print(f"Message: {action_result.get('message', action_result.get('error', 'N/A'))}")

                if action_result.get('success'):
                    print(f"Facture créée: {action_result.get('data', {}).get('invoice_number', 'N/A')}")

        print("\n" + "="*60)
        print("✓ Test terminé!")

    except Exception as e:
        import traceback
        print(f"\n✗ Erreur: {e}")
        print(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(test_invoice())
