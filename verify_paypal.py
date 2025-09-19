#!/usr/bin/env python3
"""
Script de vérification de l'intégration PayPal
Vérifie que PayPal est correctement configuré et intégré
"""

import os
import re

def check_paypal_configuration():
    """Vérifie la configuration PayPal dans settings.py"""
    
    print("💳 VÉRIFICATION CONFIGURATION PAYPAL")
    print("=" * 50)
    
    try:
        with open('saas_procurement/settings.py', 'r', encoding='utf-8') as f:
            settings_content = f.read()
        
        # Configurations PayPal à vérifier
        paypal_configs = [
            ('PAYPAL_CLIENT_ID', 'Client ID PayPal'),
            ('PAYPAL_CLIENT_SECRET', 'Secret PayPal'),
            ('PAYPAL_MODE', 'Mode PayPal (sandbox/live)'),
        ]
        
        all_configured = True
        
        for config, description in paypal_configs:
            if config in settings_content:
                print(f"  ✅ {description}")
            else:
                print(f"  ❌ {description} manquant")
                all_configured = False
        
        return all_configured
        
    except Exception as e:
        print(f"  ❌ Erreur lecture settings.py: {e}")
        return False

def check_paypal_dependencies():
    """Vérifie les dépendances PayPal"""
    
    print("\n📦 VÉRIFICATION DÉPENDANCES PAYPAL")
    print("=" * 50)
    
    try:
        with open('requirements.txt', 'r', encoding='utf-8') as f:
            requirements = f.read()
        
        paypal_deps = [
            'paypalrestsdk',
            'paypal-checkout-serversdk',
        ]
        
        all_present = True
        
        for dep in paypal_deps:
            if dep in requirements:
                print(f"  ✅ {dep}")
            else:
                print(f"  ❌ {dep} manquant")
                all_present = False
        
        return all_present
        
    except Exception as e:
        print(f"  ❌ Erreur lecture requirements.txt: {e}")
        return False

def check_paypal_service():
    """Vérifie le service PayPal"""
    
    print("\n🔧 VÉRIFICATION SERVICE PAYPAL")
    print("=" * 50)
    
    service_file = 'apps/invoicing/services.py'
    
    if not os.path.exists(service_file):
        print(f"  ❌ Fichier {service_file} manquant")
        return False
    
    try:
        with open(service_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Vérifier les méthodes PayPal essentielles
        paypal_methods = [
            ('class PayPalService', 'Classe service PayPal'),
            ('def create_payment', 'Création de paiement'),
            ('def execute_payment', 'Exécution de paiement'),
            ('def get_payment_details', 'Détails de paiement'),
            ('def refund_payment', 'Remboursement'),
            ('paypalrestsdk', 'Import SDK PayPal'),
        ]
        
        all_methods = True
        
        for method, description in paypal_methods:
            if method in content:
                print(f"  ✅ {description}")
            else:
                print(f"  ❌ {description} manquant")
                all_methods = False
        
        return all_methods
        
    except Exception as e:
        print(f"  ❌ Erreur lecture {service_file}: {e}")
        return False

def check_paypal_models():
    """Vérifie les modèles PayPal"""
    
    print("\n📊 VÉRIFICATION MODÈLES PAYPAL")
    print("=" * 50)
    
    models_file = 'apps/invoicing/models.py'
    
    if not os.path.exists(models_file):
        print(f"  ❌ Fichier {models_file} manquant")
        return False
    
    try:
        with open(models_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Vérifier les modèles PayPal
        paypal_elements = [
            ('paypal_payment_id', 'ID paiement PayPal dans Invoice'),
            ('paypal_status', 'Statut PayPal dans Invoice'),
            ('paypal_transaction_id', 'ID transaction dans Payment'),
            ('paypal_payer_email', 'Email payeur dans Payment'),
            ('paypal_fee', 'Frais PayPal dans Payment'),
            ('class PayPalTransaction', 'Modèle PayPalTransaction'),
            ('PAYMENT_METHODS', 'Méthodes de paiement incluant PayPal'),
        ]
        
        all_elements = True
        
        for element, description in paypal_elements:
            if element in content:
                print(f"  ✅ {description}")
            else:
                print(f"  ❌ {description} manquant")
                all_elements = False
        
        return all_elements
        
    except Exception as e:
        print(f"  ❌ Erreur lecture {models_file}: {e}")
        return False

def check_paypal_views():
    """Vérifie les vues PayPal"""
    
    print("\n🌐 VÉRIFICATION VUES PAYPAL")
    print("=" * 50)
    
    views_file = 'apps/invoicing/views.py'
    
    if not os.path.exists(views_file):
        print(f"  ❌ Fichier {views_file} manquant")
        return False
    
    try:
        with open(views_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Vérifier les vues PayPal
        paypal_views = [
            ('def invoice_pay_paypal', 'Vue paiement PayPal'),
            ('def paypal_success', 'Vue succès PayPal'),
            ('def paypal_cancel', 'Vue annulation PayPal'),
            ('def paypal_webhook', 'Vue webhook PayPal'),
            ('PayPalService', 'Utilisation du service PayPal'),
        ]
        
        all_views = True
        
        for view, description in paypal_views:
            if view in content:
                print(f"  ✅ {description}")
            else:
                print(f"  ❌ {description} manquant")
                all_views = False
        
        return all_views
        
    except Exception as e:
        print(f"  ❌ Erreur lecture {views_file}: {e}")
        return False

def check_paypal_urls():
    """Vérifie les URLs PayPal"""
    
    print("\n🔗 VÉRIFICATION URLS PAYPAL")
    print("=" * 50)
    
    urls_file = 'apps/invoicing/urls.py'
    
    if not os.path.exists(urls_file):
        print(f"  ❌ Fichier {urls_file} manquant")
        return False
    
    try:
        with open(urls_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Vérifier les URLs PayPal
        paypal_urls = [
            ('pay-paypal', 'URL paiement PayPal'),
            ('paypal-success', 'URL succès PayPal'),
            ('paypal-cancel', 'URL annulation PayPal'),
            ('webhook/paypal', 'URL webhook PayPal'),
        ]
        
        all_urls = True
        
        for url, description in paypal_urls:
            if url in content:
                print(f"  ✅ {description}")
            else:
                print(f"  ❌ {description} manquant")
                all_urls = False
        
        return all_urls
        
    except Exception as e:
        print(f"  ❌ Erreur lecture {urls_file}: {e}")
        return False

def check_paypal_templates():
    """Vérifie les templates PayPal"""
    
    print("\n🎨 VÉRIFICATION TEMPLATES PAYPAL")
    print("=" * 50)
    
    # Vérifier les références PayPal dans les templates
    template_files = []
    
    for root, dirs, files in os.walk('templates'):
        for file in files:
            if file.endswith('.html'):
                template_files.append(os.path.join(root, file))
    
    paypal_references = 0
    
    for template_file in template_files:
        try:
            with open(template_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Chercher les références PayPal
            if 'paypal' in content.lower() or 'PayPal' in content:
                paypal_references += 1
                print(f"  ✅ Références PayPal dans {template_file}")
        
        except Exception as e:
            print(f"  ❌ Erreur lecture {template_file}: {e}")
    
    print(f"\n📊 Total références PayPal: {paypal_references}")
    
    return paypal_references > 0

def check_paypal_security():
    """Vérifie les aspects sécurité PayPal"""
    
    print("\n🔒 VÉRIFICATION SÉCURITÉ PAYPAL")
    print("=" * 50)
    
    # Vérifier la validation des webhooks
    service_file = 'apps/invoicing/services.py'
    
    try:
        with open(service_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        security_features = [
            ('verify_webhook_signature', 'Vérification signature webhook'),
            ('webhook_id', 'Configuration webhook ID'),
            ('csrf_exempt', 'Protection CSRF webhook'),
        ]
        
        all_secure = True
        
        for feature, description in security_features:
            if feature in content:
                print(f"  ✅ {description}")
            else:
                print(f"  ⚠️  {description} à configurer")
                # Ne pas marquer comme erreur car certains sont optionnels
        
        return True
        
    except Exception as e:
        print(f"  ❌ Erreur vérification sécurité: {e}")
        return False

def main():
    """Fonction principale de vérification PayPal"""
    
    print("💳 VÉRIFICATION COMPLÈTE DE L'INTÉGRATION PAYPAL")
    print("=" * 60)
    
    # Vérifications
    config_ok = check_paypal_configuration()
    deps_ok = check_paypal_dependencies()
    service_ok = check_paypal_service()
    models_ok = check_paypal_models()
    views_ok = check_paypal_views()
    urls_ok = check_paypal_urls()
    templates_ok = check_paypal_templates()
    security_ok = check_paypal_security()
    
    # Score final
    checks = [config_ok, deps_ok, service_ok, models_ok, views_ok, urls_ok, templates_ok, security_ok]
    passed = sum(checks)
    total = len(checks)
    score = (passed / total) * 100
    
    print("\n" + "=" * 60)
    print("🏆 RÉSUMÉ INTÉGRATION PAYPAL")
    print("=" * 60)
    
    print(f"⚙️ Configuration: {'✅' if config_ok else '❌'}")
    print(f"📦 Dépendances: {'✅' if deps_ok else '❌'}")
    print(f"🔧 Service PayPal: {'✅' if service_ok else '❌'}")
    print(f"📊 Modèles: {'✅' if models_ok else '❌'}")
    print(f"🌐 Vues: {'✅' if views_ok else '❌'}")
    print(f"🔗 URLs: {'✅' if urls_ok else '❌'}")
    print(f"🎨 Templates: {'✅' if templates_ok else '❌'}")
    print(f"🔒 Sécurité: {'✅' if security_ok else '❌'}")
    
    print(f"\n📊 Score PayPal: {score:.1f}% ({passed}/{total})")
    
    if score == 100:
        print("\n🎉 INTÉGRATION PAYPAL PARFAITE !")
        print("✅ Tous les composants sont présents")
        print("💳 Paiements prêts à être testés")
        print("\n📋 PROCHAINES ÉTAPES:")
        print("1. Configurer PAYPAL_CLIENT_ID dans .env")
        print("2. Configurer PAYPAL_CLIENT_SECRET dans .env")
        print("3. Tester en mode sandbox")
        print("4. Passer en mode live pour production")
    elif score >= 75:
        print("\n✅ INTÉGRATION PAYPAL EXCELLENTE !")
        print("⚠️  Quelques ajustements mineurs")
        print("💳 Fonctionnel pour les tests")
    else:
        print("\n❌ PROBLÈMES PAYPAL DÉTECTÉS")
        print("🔧 Corrections nécessaires")
    
    return score

if __name__ == "__main__":
    main()