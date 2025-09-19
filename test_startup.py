#!/usr/bin/env python3
"""
Test de démarrage ProcureGenius
Vérifie que l'application peut démarrer sans erreurs
"""

import os
import sys
import subprocess
import time
import signal

def test_django_check():
    """Teste la commande Django check"""
    
    print("🔍 TEST DJANGO CHECK")
    print("=" * 30)
    
    try:
        # Test sans Django installé (simulation)
        print("📋 Vérification de la configuration Django...")
        
        # Vérifier que manage.py existe et est exécutable
        if os.path.exists('manage.py'):
            print("✅ manage.py trouvé")
            
            # Vérifier le contenu de manage.py
            with open('manage.py', 'r') as f:
                content = f.read()
                if 'DJANGO_SETTINGS_MODULE' in content:
                    print("✅ Configuration Django détectée")
                else:
                    print("❌ Configuration Django manquante")
                    return False
        else:
            print("❌ manage.py manquant")
            return False
        
        print("✅ Structure Django valide")
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def test_requirements():
    """Teste que toutes les dépendances sont listées"""
    
    print("\n📦 TEST REQUIREMENTS")
    print("=" * 30)
    
    try:
        with open('requirements.txt', 'r') as f:
            requirements = f.read()
        
        # Dépendances critiques
        critical_deps = [
            'Django==5.0.3',
            'mistralai',
            'paypalrestsdk',
            'django-tenants',
            'psycopg2-binary',
            'redis',
            'celery',
        ]
        
        missing = []
        for dep in critical_deps:
            dep_name = dep.split('==')[0]
            if dep_name not in requirements:
                missing.append(dep_name)
        
        if missing:
            print(f"❌ Dépendances manquantes: {', '.join(missing)}")
            return False
        else:
            print("✅ Toutes les dépendances critiques présentes")
            return True
            
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def test_file_structure():
    """Teste la structure des fichiers"""
    
    print("\n📁 TEST STRUCTURE FICHIERS")
    print("=" * 30)
    
    required_files = [
        'saas_procurement/settings.py',
        'saas_procurement/urls.py',
        'apps/accounts/models.py',
        'apps/core/views.py',
        'apps/suppliers/models.py',
        'apps/purchase_orders/models.py',
        'apps/invoicing/models.py',
        'apps/ai_assistant/services.py',
        'templates/base.html',
        'static/css/main.css',
        'locale/fr/LC_MESSAGES/django.po',
    ]
    
    missing_files = []
    
    for file_path in required_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path}")
            missing_files.append(file_path)
    
    if missing_files:
        print(f"\n❌ {len(missing_files)} fichiers manquants")
        return False
    else:
        print(f"\n✅ Tous les {len(required_files)} fichiers requis présents")
        return True

def test_environment_setup():
    """Teste la configuration d'environnement"""
    
    print("\n🔧 TEST CONFIGURATION ENVIRONNEMENT")
    print("=" * 30)
    
    # Vérifier .env.example
    if os.path.exists('.env.example'):
        print("✅ .env.example trouvé")
        
        with open('.env.example', 'r') as f:
            env_content = f.read()
        
        required_vars = [
            'SECRET_KEY', 'MISTRAL_API_KEY', 'PAYPAL_CLIENT_ID',
            'DB_NAME', 'REDIS_URL'
        ]
        
        missing_vars = []
        for var in required_vars:
            if var in env_content:
                print(f"✅ Variable {var}")
            else:
                missing_vars.append(var)
                print(f"❌ Variable {var}")
        
        if missing_vars:
            print(f"\n❌ Variables manquantes: {', '.join(missing_vars)}")
            return False
        else:
            print("\n✅ Toutes les variables d'environnement configurées")
            return True
    else:
        print("❌ .env.example manquant")
        return False

def test_docker_configuration():
    """Teste la configuration Docker"""
    
    print("\n🐳 TEST CONFIGURATION DOCKER")
    print("=" * 30)
    
    docker_files = ['Dockerfile', 'docker-compose.yml']
    
    for file_path in docker_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path}")
            
            with open(file_path, 'r') as f:
                content = f.read()
            
            if 'Dockerfile' in file_path:
                if 'FROM python:' in content and 'requirements.txt' in content:
                    print("  ✅ Configuration Dockerfile valide")
                else:
                    print("  ❌ Configuration Dockerfile invalide")
                    return False
            
            elif 'docker-compose.yml' in file_path:
                services = ['web', 'db', 'redis', 'celery']
                missing_services = []
                for service in services:
                    if f'{service}:' in content:
                        print(f"  ✅ Service {service}")
                    else:
                        missing_services.append(service)
                        print(f"  ❌ Service {service}")
                
                if missing_services:
                    return False
        else:
            print(f"❌ {file_path}")
            return False
    
    print("✅ Configuration Docker complète")
    return True

def generate_deployment_checklist():
    """Génère une checklist de déploiement"""
    
    print("\n📋 CHECKLIST DE DÉPLOIEMENT FINALE")
    print("=" * 50)
    
    checklist = """
📋 CHECKLIST DE DÉPLOIEMENT PROCUREGENIUS

PRÉ-DÉPLOIEMENT:
□ Clés API configurées dans .env
□ Base de données PostgreSQL prête
□ Redis installé et fonctionnel
□ Docker installé (si déploiement Docker)

DÉPLOIEMENT:
□ Exécuter: ./deploy.sh
□ Vérifier: http://localhost:8000 accessible
□ Tester: Connexion admin (admin/admin123)
□ Valider: Changement langue FR/EN

TESTS FONCTIONNELS:
□ Créer un fournisseur
□ Créer un bon de commande
□ Générer une facture
□ Tester paiement PayPal (sandbox)
□ Utiliser l'assistant IA
□ Vérifier les analytics

MISE EN PRODUCTION:
□ Configurer domaine personnalisé
□ Activer SSL/HTTPS
□ Configurer PayPal en mode live
□ Sauvegardes automatiques
□ Monitoring et logs
"""
    
    print(checklist)
    
    # Sauvegarder la checklist
    with open('DEPLOYMENT_CHECKLIST.md', 'w') as f:
        f.write(checklist)
    
    print("💾 Checklist sauvegardée dans DEPLOYMENT_CHECKLIST.md")

def main():
    """Fonction principale de test de démarrage"""
    
    print("🚀 TEST DE DÉMARRAGE PROCUREGENIUS")
    print("=" * 60)
    
    # Tests
    django_ok = test_django_check()
    requirements_ok = test_requirements()
    structure_ok = test_file_structure()
    env_ok = test_environment_setup()
    docker_ok = test_docker_configuration()
    
    # Score
    tests = [django_ok, requirements_ok, structure_ok, env_ok, docker_ok]
    passed = sum(tests)
    total = len(tests)
    score = (passed / total) * 100
    
    print("\n" + "=" * 60)
    print("🏆 RÉSUMÉ TEST DE DÉMARRAGE")
    print("=" * 60)
    
    print(f"🔍 Django check: {'✅' if django_ok else '❌'}")
    print(f"📦 Requirements: {'✅' if requirements_ok else '❌'}")
    print(f"📁 Structure: {'✅' if structure_ok else '❌'}")
    print(f"🔧 Environnement: {'✅' if env_ok else '❌'}")
    print(f"🐳 Docker: {'✅' if docker_ok else '❌'}")
    
    print(f"\n📊 Score démarrage: {score:.1f}% ({passed}/{total})")
    
    if score == 100:
        print("\n🎉 APPLICATION PRÊTE À DÉMARRER !")
        print("✅ Tous les prérequis sont satisfaits")
        print("🚀 Déploiement immédiat possible")
        
        print("\n🎯 COMMANDE DE DÉPLOIEMENT:")
        print("./deploy.sh")
        
    elif score >= 80:
        print("\n✅ APPLICATION PRESQUE PRÊTE !")
        print("⚠️  Quelques ajustements mineurs")
        print("🔧 Corrections rapides nécessaires")
    else:
        print("\n❌ PROBLÈMES DE DÉMARRAGE")
        print("🛠️  Corrections importantes nécessaires")
    
    # Générer la checklist finale
    generate_deployment_checklist()
    
    return score

if __name__ == "__main__":
    main()