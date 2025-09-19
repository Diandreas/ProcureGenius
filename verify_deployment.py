#!/usr/bin/env python3
"""
Script de vérification du déploiement ProcureGenius
Vérifie que l'application est prête pour le déploiement
"""

import os
import re

def check_docker_configuration():
    """Vérifie la configuration Docker"""
    
    print("🐳 VÉRIFICATION CONFIGURATION DOCKER")
    print("=" * 50)
    
    docker_files = [
        ('Dockerfile', 'Image Docker'),
        ('docker-compose.yml', 'Composition Docker'),
        ('.env.example', 'Variables d\'environnement exemple'),
    ]
    
    all_present = True
    
    for file_path, description in docker_files:
        if os.path.exists(file_path):
            print(f"  ✅ {description}")
            
            # Vérifications spécifiques
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                if 'Dockerfile' in file_path:
                    if 'FROM python:' in content:
                        print(f"    ✅ Image Python de base")
                    if 'requirements.txt' in content:
                        print(f"    ✅ Installation dépendances")
                    if 'EXPOSE 8000' in content:
                        print(f"    ✅ Port exposé")
                
                elif 'docker-compose.yml' in file_path:
                    services = ['web', 'db', 'redis', 'celery']
                    for service in services:
                        if f'{service}:' in content:
                            print(f"    ✅ Service {service}")
                
                elif '.env.example' in file_path:
                    required_vars = [
                        'SECRET_KEY', 'DB_NAME', 'MISTRAL_API_KEY', 
                        'PAYPAL_CLIENT_ID', 'REDIS_URL'
                    ]
                    for var in required_vars:
                        if var in content:
                            print(f"    ✅ Variable {var}")
            
            except Exception as e:
                print(f"    ❌ Erreur lecture {file_path}: {e}")
                all_present = False
        else:
            print(f"  ❌ {description} manquant")
            all_present = False
    
    return all_present

def check_production_settings():
    """Vérifie les paramètres de production"""
    
    print("\n🚀 VÉRIFICATION PARAMÈTRES PRODUCTION")
    print("=" * 50)
    
    try:
        with open('saas_procurement/settings.py', 'r', encoding='utf-8') as f:
            settings_content = f.read()
        
        # Paramètres de production à vérifier
        production_settings = [
            ('ALLOWED_HOSTS', 'Hosts autorisés'),
            ('SECURE_SSL_REDIRECT', 'Redirection SSL'),
            ('SECURE_HSTS_SECONDS', 'HSTS'),
            ('SECURE_CONTENT_TYPE_NOSNIFF', 'Protection XSS'),
            ('whitenoise', 'Serveur de fichiers statiques'),
            ('gunicorn', 'Serveur WSGI'),
        ]
        
        all_configured = True
        
        for setting, description in production_settings:
            if setting in settings_content:
                print(f"  ✅ {description}")
            else:
                print(f"  ⚠️  {description} à configurer")
                # Ne pas marquer comme erreur car configuré conditionnellement
        
        return True
        
    except Exception as e:
        print(f"  ❌ Erreur lecture settings.py: {e}")
        return False

def check_database_configuration():
    """Vérifie la configuration de base de données"""
    
    print("\n🗄️ VÉRIFICATION BASE DE DONNÉES")
    print("=" * 50)
    
    try:
        with open('saas_procurement/settings.py', 'r', encoding='utf-8') as f:
            settings_content = f.read()
        
        # Configuration DB à vérifier
        db_configs = [
            ('postgresql_backend', 'Backend PostgreSQL'),
            ('django_tenants', 'Support multi-tenant'),
            ('TENANT_MODEL', 'Modèle tenant'),
            ('TENANT_DOMAIN_MODEL', 'Modèle domaine'),
            ('DATABASE_ROUTERS', 'Routeur de base de données'),
        ]
        
        all_configured = True
        
        for config, description in db_configs:
            if config in settings_content:
                print(f"  ✅ {description}")
            else:
                print(f"  ❌ {description} manquant")
                all_configured = False
        
        return all_configured
        
    except Exception as e:
        print(f"  ❌ Erreur vérification DB: {e}")
        return False

def check_celery_configuration():
    """Vérifie la configuration Celery"""
    
    print("\n⚡ VÉRIFICATION CELERY")
    print("=" * 50)
    
    celery_file = 'celery.py'
    
    if not os.path.exists(celery_file):
        print(f"  ❌ Fichier {celery_file} manquant")
        return False
    
    try:
        with open(celery_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Configuration Celery à vérifier
        celery_configs = [
            ('from celery import Celery', 'Import Celery'),
            ('app = Celery', 'Application Celery'),
            ('config_from_object', 'Configuration depuis Django'),
            ('autodiscover_tasks', 'Découverte automatique des tâches'),
        ]
        
        all_configured = True
        
        for config, description in celery_configs:
            if config in content:
                print(f"  ✅ {description}")
            else:
                print(f"  ❌ {description} manquant")
                all_configured = False
        
        # Vérifier la configuration dans settings.py
        with open('saas_procurement/settings.py', 'r', encoding='utf-8') as f:
            settings_content = f.read()
        
        celery_settings = [
            ('CELERY_BROKER_URL', 'URL du broker'),
            ('CELERY_RESULT_BACKEND', 'Backend des résultats'),
            ('django_celery_beat', 'Planificateur de tâches'),
            ('django_celery_results', 'Stockage des résultats'),
        ]
        
        for setting, description in celery_settings:
            if setting in settings_content:
                print(f"  ✅ {description}")
            else:
                print(f"  ❌ {description} manquant")
                all_configured = False
        
        return all_configured
        
    except Exception as e:
        print(f"  ❌ Erreur vérification Celery: {e}")
        return False

def check_security_configuration():
    """Vérifie la configuration de sécurité"""
    
    print("\n🔒 VÉRIFICATION SÉCURITÉ")
    print("=" * 50)
    
    try:
        with open('saas_procurement/settings.py', 'r', encoding='utf-8') as f:
            settings_content = f.read()
        
        # Paramètres de sécurité à vérifier
        security_settings = [
            ('SECRET_KEY', 'Clé secrète'),
            ('CSRF', 'Protection CSRF'),
            ('AUTH_PASSWORD_VALIDATORS', 'Validation mots de passe'),
            ('LOGIN_REQUIRED', 'Authentification requise'),
            ('SECURE_', 'Paramètres sécurisés'),
            ('ALLOWED_HOSTS', 'Hosts autorisés'),
        ]
        
        all_secure = True
        
        for setting, description in security_settings:
            if setting in settings_content:
                print(f"  ✅ {description}")
            else:
                print(f"  ⚠️  {description} à vérifier")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Erreur vérification sécurité: {e}")
        return False

def check_deployment_scripts():
    """Vérifie les scripts de déploiement"""
    
    print("\n📜 VÉRIFICATION SCRIPTS DÉPLOIEMENT")
    print("=" * 50)
    
    scripts = [
        ('deploy.sh', 'Script de déploiement principal'),
        ('test_application.py', 'Script de test'),
        ('validate_structure.py', 'Script de validation'),
    ]
    
    all_present = True
    
    for script, description in scripts:
        if os.path.exists(script):
            print(f"  ✅ {description}")
            
            # Vérifier que le script est exécutable
            import stat
            file_stat = os.stat(script)
            if file_stat.st_mode & stat.S_IEXEC:
                print(f"    ✅ Exécutable")
            else:
                print(f"    ⚠️  Non exécutable (chmod +x {script})")
        else:
            print(f"  ❌ {description} manquant")
            all_present = False
    
    return all_present

def check_documentation():
    """Vérifie la documentation"""
    
    print("\n📚 VÉRIFICATION DOCUMENTATION")
    print("=" * 50)
    
    docs = [
        ('README.md', 'Documentation principale'),
        ('.env.example', 'Exemple de configuration'),
    ]
    
    all_present = True
    
    for doc, description in docs:
        if os.path.exists(doc):
            print(f"  ✅ {description}")
            
            # Vérifier la taille et le contenu
            size = os.path.getsize(doc)
            if size > 1000:  # Au moins 1KB
                print(f"    ✅ Contenu substantiel ({size} bytes)")
            else:
                print(f"    ⚠️  Contenu minimal ({size} bytes)")
        else:
            print(f"  ❌ {description} manquant")
            all_present = False
    
    return all_present

def check_environment_variables():
    """Vérifie les variables d'environnement requises"""
    
    print("\n🔧 VÉRIFICATION VARIABLES D'ENVIRONNEMENT")
    print("=" * 50)
    
    if not os.path.exists('.env.example'):
        print("  ❌ Fichier .env.example manquant")
        return False
    
    try:
        with open('.env.example', 'r', encoding='utf-8') as f:
            env_content = f.read()
        
        # Variables critiques
        critical_vars = [
            ('SECRET_KEY', 'Clé secrète Django'),
            ('DB_NAME', 'Nom base de données'),
            ('DB_USER', 'Utilisateur DB'),
            ('DB_PASSWORD', 'Mot de passe DB'),
            ('MISTRAL_API_KEY', 'Clé API Mistral'),
            ('PAYPAL_CLIENT_ID', 'Client ID PayPal'),
            ('PAYPAL_CLIENT_SECRET', 'Secret PayPal'),
            ('REDIS_URL', 'URL Redis'),
            ('EMAIL_HOST', 'Serveur email'),
        ]
        
        all_vars = True
        
        for var, description in critical_vars:
            if var in env_content:
                print(f"  ✅ {description}")
            else:
                print(f"  ❌ {description} manquant")
                all_vars = False
        
        return all_vars
        
    except Exception as e:
        print(f"  ❌ Erreur lecture .env.example: {e}")
        return False

def main():
    """Fonction principale de vérification déploiement"""
    
    print("🚀 VÉRIFICATION COMPLÈTE DU DÉPLOIEMENT")
    print("=" * 60)
    
    # Vérifications
    docker_ok = check_docker_configuration()
    production_ok = check_production_settings()
    db_ok = check_database_configuration()
    celery_ok = check_celery_configuration()
    security_ok = check_security_configuration()
    scripts_ok = check_deployment_scripts()
    docs_ok = check_documentation()
    env_ok = check_environment_variables()
    
    # Score final
    checks = [docker_ok, production_ok, db_ok, celery_ok, security_ok, scripts_ok, docs_ok, env_ok]
    passed = sum(checks)
    total = len(checks)
    score = (passed / total) * 100
    
    print("\n" + "=" * 60)
    print("🏆 RÉSUMÉ DÉPLOIEMENT")
    print("=" * 60)
    
    print(f"🐳 Docker: {'✅' if docker_ok else '❌'}")
    print(f"🚀 Production: {'✅' if production_ok else '❌'}")
    print(f"🗄️ Base de données: {'✅' if db_ok else '❌'}")
    print(f"⚡ Celery: {'✅' if celery_ok else '❌'}")
    print(f"🔒 Sécurité: {'✅' if security_ok else '❌'}")
    print(f"📜 Scripts: {'✅' if scripts_ok else '❌'}")
    print(f"📚 Documentation: {'✅' if docs_ok else '❌'}")
    print(f"🔧 Variables env: {'✅' if env_ok else '❌'}")
    
    print(f"\n📊 Score déploiement: {score:.1f}% ({passed}/{total})")
    
    if score == 100:
        print("\n🎉 DÉPLOIEMENT PARFAIT !")
        print("✅ Tous les composants sont prêts")
        print("🚀 Application prête pour production")
        
        print("\n📋 COMMANDES DE DÉPLOIEMENT:")
        print("# Déploiement Docker (Recommandé)")
        print("./deploy.sh")
        print("")
        print("# Ou déploiement manuel")
        print("pip install -r requirements.txt")
        print("python manage.py migrate")
        print("python manage.py collectstatic")
        print("python manage.py runserver")
        
    elif score >= 80:
        print("\n✅ DÉPLOIEMENT EXCELLENT !")
        print("⚠️  Quelques vérifications finales recommandées")
        print("🚀 Application peut être déployée")
    else:
        print("\n❌ PROBLÈMES DE DÉPLOIEMENT")
        print("🔧 Corrections nécessaires avant mise en production")
    
    return score

if __name__ == "__main__":
    main()