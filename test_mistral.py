"""
Script de test simple pour l'API Mistral
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

from apps.ai_assistant.services import MistralService
import asyncio

async def test_mistral():
    """Test simple de l'API Mistral"""
    try:
        print("Initialisation du service Mistral...")
        service = MistralService()
        print("OK Service initialise")
        print(f"Modèle: {service.model}")
        print(f"Nombre de tools: {len(service.tools)}")

        print("\nTest 1: Message simple sans extraction")
        result = await service.chat(
            message="Bonjour, comment vas-tu?",
            conversation_history=[],
            user_context={'user_id': 1}
        )

        print(f"Succès: {result.get('success')}")
        print(f"Réponse: {result.get('response')}")
        if not result.get('success'):
            print(f"Erreur: {result.get('error')}")
            print(f"Détails: {result.get('error_details', 'N/A')}")

        print("\n" + "="*50)
        print("Test 2: Extraction d'informations de fournisseur")
        result2 = await service.chat(
            message="Extrait les informations du fournisseur: CYNTHIA, =237620287935, david@gmail.com, yaounde. Crée moi un fournisseur.",
            conversation_history=[],
            user_context={'user_id': 1}
        )

        print(f"Succès: {result2.get('success')}")
        print(f"Réponse: {result2.get('response')}")
        print(f"Tool calls: {result2.get('tool_calls')}")
        if not result2.get('success'):
            print(f"Erreur: {result2.get('error')}")
            print(f"Détails: {result2.get('error_details', 'N/A')}")

    except Exception as e:
        import traceback
        print(f"Erreur lors du test: {e}")
        print(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(test_mistral())
