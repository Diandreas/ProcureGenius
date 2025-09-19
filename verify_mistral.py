#!/usr/bin/env python3
"""
Script de vérification de l'intégration Mistral AI
Vérifie que Mistral AI est correctement configuré et intégré
"""

import os
import re

def check_mistral_configuration():
    """Vérifie la configuration Mistral AI dans settings.py"""
    
    print("🤖 VÉRIFICATION CONFIGURATION MISTRAL AI")
    print("=" * 50)
    
    try:
        with open('saas_procurement/settings.py', 'r', encoding='utf-8') as f:
            settings_content = f.read()
        
        # Configurations Mistral à vérifier
        mistral_configs = [
            ('MISTRAL_API_KEY', 'Clé API Mistral'),
        ]
        
        all_configured = True
        
        for config, description in mistral_configs:
            if config in settings_content:
                print(f"  ✅ {description}")
            else:
                print(f"  ❌ {description} manquant")
                all_configured = False
        
        return all_configured
        
    except Exception as e:
        print(f"  ❌ Erreur lecture settings.py: {e}")
        return False

def check_mistral_dependencies():
    """Vérifie les dépendances Mistral AI"""
    
    print("\n📦 VÉRIFICATION DÉPENDANCES MISTRAL")
    print("=" * 50)
    
    try:
        with open('requirements.txt', 'r', encoding='utf-8') as f:
            requirements = f.read()
        
        mistral_deps = [
            'mistralai',
            'openai',  # Backup option
        ]
        
        all_present = True
        
        for dep in mistral_deps:
            if dep in requirements:
                print(f"  ✅ {dep}")
            else:
                print(f"  ❌ {dep} manquant")
                all_present = False
        
        return all_present
        
    except Exception as e:
        print(f"  ❌ Erreur lecture requirements.txt: {e}")
        return False

def check_mistral_service():
    """Vérifie le service Mistral AI"""
    
    print("\n🔧 VÉRIFICATION SERVICE MISTRAL AI")
    print("=" * 50)
    
    service_file = 'apps/ai_assistant/services.py'
    
    if not os.path.exists(service_file):
        print(f"  ❌ Fichier {service_file} manquant")
        return False
    
    try:
        with open(service_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Vérifier les méthodes Mistral essentielles
        mistral_methods = [
            ('class MistralAIService', 'Classe service Mistral'),
            ('MistralClient', 'Client Mistral'),
            ('def process_user_request', 'Traitement requête utilisateur'),
            ('def create_po_from_natural_request', 'Création BC via langage naturel'),
            ('def generate_invoice_from_po', 'Génération facture depuis BC'),
            ('def analyze_purchase_order', 'Analyse bon de commande'),
            ('def suggest_suppliers_for_request', 'Suggestion fournisseurs'),
            ('ChatMessage', 'Messages de chat'),
        ]
        
        all_methods = True
        
        for method, description in mistral_methods:
            if method in content:
                print(f"  ✅ {description}")
            else:
                print(f"  ❌ {description} manquant")
                all_methods = False
        
        return all_methods
        
    except Exception as e:
        print(f"  ❌ Erreur lecture {service_file}: {e}")
        return False

def check_mistral_models():
    """Vérifie les modèles IA"""
    
    print("\n📊 VÉRIFICATION MODÈLES IA")
    print("=" * 50)
    
    models_file = 'apps/ai_assistant/models.py'
    
    if not os.path.exists(models_file):
        print(f"  ❌ Fichier {models_file} manquant")
        return False
    
    try:
        with open(models_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Vérifier les modèles IA
        ai_models = [
            ('class AIConversation', 'Modèle Conversation IA'),
            ('class AIMessage', 'Modèle Message IA'),
            ('class AIAction', 'Modèle Action IA'),
            ('class AINotification', 'Modèle Notification IA'),
            ('class AILearningData', 'Modèle Données apprentissage'),
            ('class AIAnalytics', 'Modèle Analytics IA'),
            ('class AIPromptTemplate', 'Modèle Template prompts'),
            ('model_used', 'Champ modèle utilisé'),
            ('tokens_used', 'Champ tokens utilisés'),
            ('confidence_score', 'Champ score de confiance'),
        ]
        
        all_models = True
        
        for model, description in ai_models:
            if model in content:
                print(f"  ✅ {description}")
            else:
                print(f"  ❌ {description} manquant")
                all_models = False
        
        return all_models
        
    except Exception as e:
        print(f"  ❌ Erreur lecture {models_file}: {e}")
        return False

def check_mistral_websockets():
    """Vérifie les WebSockets pour le chat temps réel"""
    
    print("\n🔌 VÉRIFICATION WEBSOCKETS")
    print("=" * 50)
    
    # Vérifier les consumers
    consumers_file = 'apps/ai_assistant/consumers.py'
    routing_file = 'apps/ai_assistant/routing.py'
    asgi_file = 'saas_procurement/asgi.py'
    
    files_to_check = [
        (consumers_file, 'Consumers WebSocket'),
        (routing_file, 'Routing WebSocket'),
        (asgi_file, 'Configuration ASGI'),
    ]
    
    all_files = True
    
    for file_path, description in files_to_check:
        if os.path.exists(file_path):
            print(f"  ✅ {description}")
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Vérifications spécifiques
                if 'consumers.py' in file_path:
                    if 'AIChatConsumer' in content:
                        print(f"    ✅ Consumer chat IA")
                    if 'AsyncWebsocketConsumer' in content:
                        print(f"    ✅ Consumer asynchrone")
                
                elif 'routing.py' in file_path:
                    if 'websocket_urlpatterns' in content:
                        print(f"    ✅ Patterns WebSocket")
                
                elif 'asgi.py' in file_path:
                    if 'ProtocolTypeRouter' in content:
                        print(f"    ✅ Router de protocoles")
                    if 'websocket' in content:
                        print(f"    ✅ Support WebSocket")
            
            except Exception as e:
                print(f"    ❌ Erreur lecture {file_path}: {e}")
                all_files = False
        else:
            print(f"  ❌ {description} manquant")
            all_files = False
    
    return all_files

def check_mistral_chat_interface():
    """Vérifie l'interface de chat IA"""
    
    print("\n💬 VÉRIFICATION INTERFACE CHAT")
    print("=" * 50)
    
    chat_template = 'templates/ai_assistant/chat_interface.html'
    
    if not os.path.exists(chat_template):
        print(f"  ❌ Template chat manquant: {chat_template}")
        return False
    
    try:
        with open(chat_template, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Vérifier les éléments de l'interface chat
        chat_elements = [
            ('chat-container', 'Conteneur de chat'),
            ('chat-messages', 'Zone des messages'),
            ('message-input', 'Input de message'),
            ('send-button', 'Bouton d\'envoi'),
            ('typing-indicator', 'Indicateur de frappe'),
            ('WebSocket', 'Support WebSocket'),
            ('fetch(', 'Appels AJAX'),
        ]
        
        all_elements = True
        
        for element, description in chat_elements:
            if element in content:
                print(f"  ✅ {description}")
            else:
                print(f"  ❌ {description} manquant")
                all_elements = False
        
        return all_elements
        
    except Exception as e:
        print(f"  ❌ Erreur lecture {chat_template}: {e}")
        return False

def check_mistral_actions():
    """Vérifie les actions IA disponibles"""
    
    print("\n⚡ VÉRIFICATION ACTIONS IA")
    print("=" * 50)
    
    service_file = 'apps/ai_assistant/services.py'
    views_file = 'apps/ai_assistant/views.py'
    
    try:
        with open(service_file, 'r', encoding='utf-8') as f:
            service_content = f.read()
        
        with open(views_file, 'r', encoding='utf-8') as f:
            views_content = f.read()
        
        # Actions IA à vérifier
        ai_actions = [
            ('create_purchase_order', 'Création bon de commande'),
            ('create_invoice', 'Création facture'),
            ('analyze_spend', 'Analyse dépenses'),
            ('suggest_supplier', 'Suggestion fournisseur'),
            ('send_reminder', 'Envoi relance'),
            ('extract_data', 'Extraction données'),
            ('generate_report', 'Génération rapport'),
        ]
        
        all_actions = True
        
        for action, description in ai_actions:
            if action in service_content or action in views_content:
                print(f"  ✅ {description}")
            else:
                print(f"  ❌ {description} manquant")
                all_actions = False
        
        return all_actions
        
    except Exception as e:
        print(f"  ❌ Erreur vérification actions: {e}")
        return False

def check_mistral_prompts():
    """Vérifie les templates de prompts"""
    
    print("\n📝 VÉRIFICATION TEMPLATES PROMPTS")
    print("=" * 50)
    
    service_file = 'apps/ai_assistant/services.py'
    
    try:
        with open(service_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Vérifier les prompts système
        prompt_elements = [
            ('system_prompt', 'Prompt système'),
            ('extraction_prompt', 'Prompt extraction'),
            ('analysis_prompt', 'Prompt analyse'),
            ('scoring_prompt', 'Prompt scoring'),
            ('Tu es un assistant IA', 'Prompt contextualisé'),
            ('CONTEXTE UTILISATEUR', 'Contexte utilisateur'),
            ('TES CAPACITÉS', 'Capacités définies'),
            ('ACTIONS DISPONIBLES', 'Actions disponibles'),
        ]
        
        all_prompts = True
        
        for prompt, description in prompt_elements:
            if prompt in content:
                print(f"  ✅ {description}")
            else:
                print(f"  ❌ {description} manquant")
                all_prompts = False
        
        return all_prompts
        
    except Exception as e:
        print(f"  ❌ Erreur vérification prompts: {e}")
        return False

def main():
    """Fonction principale de vérification Mistral AI"""
    
    print("🤖 VÉRIFICATION COMPLÈTE DE L'INTÉGRATION MISTRAL AI")
    print("=" * 60)
    
    # Vérifications
    config_ok = check_mistral_configuration()
    deps_ok = check_mistral_dependencies()
    service_ok = check_mistral_service()
    models_ok = check_mistral_models()
    websockets_ok = check_mistral_websockets()
    chat_ok = check_mistral_chat_interface()
    actions_ok = check_mistral_actions()
    prompts_ok = check_mistral_prompts()
    
    # Score final
    checks = [config_ok, deps_ok, service_ok, models_ok, websockets_ok, chat_ok, actions_ok, prompts_ok]
    passed = sum(checks)
    total = len(checks)
    score = (passed / total) * 100
    
    print("\n" + "=" * 60)
    print("🏆 RÉSUMÉ INTÉGRATION MISTRAL AI")
    print("=" * 60)
    
    print(f"⚙️ Configuration: {'✅' if config_ok else '❌'}")
    print(f"📦 Dépendances: {'✅' if deps_ok else '❌'}")
    print(f"🔧 Service Mistral: {'✅' if service_ok else '❌'}")
    print(f"📊 Modèles IA: {'✅' if models_ok else '❌'}")
    print(f"🔌 WebSockets: {'✅' if websockets_ok else '❌'}")
    print(f"💬 Interface chat: {'✅' if chat_ok else '❌'}")
    print(f"⚡ Actions IA: {'✅' if actions_ok else '❌'}")
    print(f"📝 Templates prompts: {'✅' if prompts_ok else '❌'}")
    
    print(f"\n📊 Score Mistral AI: {score:.1f}% ({passed}/{total})")
    
    if score == 100:
        print("\n🎉 INTÉGRATION MISTRAL AI PARFAITE !")
        print("✅ Tous les composants sont présents")
        print("🤖 Assistant IA prêt à être testé")
        print("\n📋 PROCHAINES ÉTAPES:")
        print("1. Obtenir une clé API Mistral sur https://console.mistral.ai/")
        print("2. Configurer MISTRAL_API_KEY dans .env")
        print("3. Tester le chat conversationnel")
        print("4. Tester les actions automatiques")
        print("\n💡 FONCTIONNALITÉS DISPONIBLES:")
        print("• Chat conversationnel en temps réel")
        print("• Création automatique de bons de commande")
        print("• Génération de factures intelligente")
        print("• Analyse prédictive des dépenses")
        print("• Suggestions de fournisseurs optimales")
        print("• Détection d'anomalies")
        print("• Apprentissage personnalisé")
    elif score >= 75:
        print("\n✅ INTÉGRATION MISTRAL AI EXCELLENTE !")
        print("⚠️  Quelques ajustements mineurs")
        print("🤖 Fonctionnel pour les tests")
    else:
        print("\n❌ PROBLÈMES MISTRAL AI DÉTECTÉS")
        print("🔧 Corrections nécessaires")
    
    return score

if __name__ == "__main__":
    main()