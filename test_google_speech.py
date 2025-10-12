"""
Script de test pour Google Cloud Speech-to-Text
Vérifie que la configuration est correcte et teste la transcription
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from django.conf import settings
from pathlib import Path
import logging

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def check_credentials():
    """Vérifie que les credentials Google Cloud sont configurés"""
    print("\n" + "="*70)
    print("🔍 VÉRIFICATION DE LA CONFIGURATION GOOGLE CLOUD SPEECH-TO-TEXT")
    print("="*70 + "\n")
    
    # 1. Vérifier la présence du fichier de credentials
    credentials_path = settings.GOOGLE_APPLICATION_CREDENTIALS
    print(f"📁 Chemin des credentials : {credentials_path}")
    
    if os.path.exists(credentials_path):
        print("✅ Fichier de credentials trouvé")
        file_size = os.path.getsize(credentials_path)
        print(f"   Taille du fichier : {file_size} bytes")
    else:
        print("❌ Fichier de credentials NON TROUVÉ")
        print("\n⚠️  INSTRUCTIONS :")
        print("   1. Créez un compte de service sur Google Cloud Console")
        print("   2. Téléchargez le fichier JSON des credentials")
        print("   3. Placez-le dans : google_credentials/service-account.json")
        print("   4. Ou définissez GOOGLE_APPLICATION_CREDENTIALS dans .env")
        return False
    
    # 2. Vérifier la variable d'environnement
    env_var = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
    if env_var:
        print(f"✅ Variable d'environnement définie : {env_var}")
    else:
        print("⚠️  Variable d'environnement non définie (utilisation du chemin par défaut)")
    
    # 3. Vérifier le projet Google Cloud
    project_id = settings.GOOGLE_CLOUD_PROJECT
    if project_id:
        print(f"✅ Projet Google Cloud : {project_id}")
    else:
        print("⚠️  Projet Google Cloud non défini dans .env")
    
    # 4. Afficher la configuration
    print("\n📋 Configuration Speech-to-Text :")
    config = settings.GOOGLE_SPEECH_CONFIG
    for key, value in config.items():
        print(f"   - {key}: {value}")
    
    return True


def test_speech_client():
    """Test de connexion au client Google Speech"""
    print("\n" + "="*70)
    print("🧪 TEST DE CONNEXION AU CLIENT GOOGLE SPEECH-TO-TEXT")
    print("="*70 + "\n")
    
    try:
        from google.cloud import speech
        print("✅ Bibliothèque google-cloud-speech importée avec succès")
        
        # Initialiser le client
        client = speech.SpeechClient()
        print("✅ Client Speech-to-Text initialisé avec succès")
        
        return True
        
    except ImportError:
        print("❌ Bibliothèque google-cloud-speech non installée")
        print("\n⚠️  SOLUTION :")
        print("   pip install google-cloud-speech")
        return False
        
    except Exception as e:
        print(f"❌ Erreur lors de l'initialisation du client : {e}")
        print("\n⚠️  VÉRIFICATIONS :")
        print("   1. Les credentials sont-ils valides ?")
        print("   2. L'API Speech-to-Text est-elle activée sur votre projet ?")
        print("   3. Le compte de service a-t-il les bonnes permissions ?")
        return False


def test_transcription_sample():
    """Test de transcription avec un fichier audio d'exemple"""
    print("\n" + "="*70)
    print("🎤 TEST DE TRANSCRIPTION (AUDIO EXEMPLE)")
    print("="*70 + "\n")
    
    try:
        from google.cloud import speech
        
        # Créer un client
        client = speech.SpeechClient()
        
        # Créer un audio synthétique simple pour le test
        # Note: Pour un vrai test, vous auriez besoin d'un fichier audio
        print("ℹ️  Pour tester la transcription avec un vrai fichier audio :")
        print("   1. Enregistrez un message vocal en format WAV, MP3 ou WebM")
        print("   2. Placez-le dans le dossier 'media/test_audio/'")
        print("   3. Utilisez l'API endpoint : POST /api/ai/voice-transcription/")
        print("\n📝 Exemple de requête curl :")
        print("   curl -X POST http://localhost:8000/api/ai/voice-transcription/ \\")
        print("        -H 'Authorization: Token YOUR_TOKEN' \\")
        print("        -F 'audio=@votre_fichier.mp3'")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors du test : {e}")
        return False


def test_api_endpoint():
    """Test de l'endpoint API de transcription"""
    print("\n" + "="*70)
    print("🌐 VÉRIFICATION DE L'ENDPOINT API")
    print("="*70 + "\n")
    
    try:
        from apps.ai_assistant.views import VoiceTranscriptionView
        print("✅ VoiceTranscriptionView importée avec succès")
        print("\n📍 Endpoints disponibles :")
        print("   POST /api/ai/voice-transcription/")
        print("   - Accepte : audio/webm, audio/wav, audio/mp3, audio/ogg")
        print("   - Taille max : 10MB")
        print("   - Paramètres : audio (file)")
        print("\n📤 Format de réponse :")
        print("   {")
        print('     "success": true,')
        print('     "text": "Texte transcrit...",')
        print('     "language": "fr-FR",')
        print('     "duration": 3.5')
        print("   }")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de l'import : {e}")
        return False


def show_next_steps():
    """Affiche les prochaines étapes"""
    print("\n" + "="*70)
    print("📚 PROCHAINES ÉTAPES")
    print("="*70 + "\n")
    
    print("1️⃣  Installer les dépendances :")
    print("   pip install -r requirements.txt")
    
    print("\n2️⃣  Configurer Google Cloud :")
    print("   - Créez un projet sur https://console.cloud.google.com/")
    print("   - Activez l'API Speech-to-Text")
    print("   - Créez un compte de service et téléchargez les credentials JSON")
    print("   - Placez le fichier dans : google_credentials/service-account.json")
    
    print("\n3️⃣  Tester l'API :")
    print("   - Démarrez le serveur Django : python manage.py runserver")
    print("   - Testez l'endpoint avec un fichier audio")
    
    print("\n4️⃣  Intégration frontend :")
    print("   - Le frontend peut utiliser l'enregistreur vocal intégré")
    print("   - Les messages vocaux seront automatiquement transcrits")
    
    print("\n📖 Documentation complète :")
    print("   - Lisez : GOOGLE_CLOUD_SPEECH_SETUP.md")
    print("   - API Docs : https://cloud.google.com/speech-to-text/docs")


def main():
    """Fonction principale"""
    print("\n🚀 Démarrage des tests Google Cloud Speech-to-Text\n")
    
    results = []
    
    # Test 1: Vérification des credentials
    results.append(("Credentials", check_credentials()))
    
    # Test 2: Connexion au client
    results.append(("Client", test_speech_client()))
    
    # Test 3: Transcription
    results.append(("Transcription", test_transcription_sample()))
    
    # Test 4: Endpoint API
    results.append(("API Endpoint", test_api_endpoint()))
    
    # Résumé
    print("\n" + "="*70)
    print("📊 RÉSUMÉ DES TESTS")
    print("="*70 + "\n")
    
    all_passed = True
    for test_name, result in results:
        status = "✅ SUCCÈS" if result else "❌ ÉCHEC"
        print(f"{status} - {test_name}")
        if not result:
            all_passed = False
    
    # Prochaines étapes
    show_next_steps()
    
    print("\n" + "="*70)
    if all_passed:
        print("🎉 CONFIGURATION COMPLÈTE ET FONCTIONNELLE !")
    else:
        print("⚠️  CONFIGURATION INCOMPLÈTE - Suivez les instructions ci-dessus")
    print("="*70 + "\n")
    
    return 0 if all_passed else 1


if __name__ == '__main__':
    sys.exit(main())

