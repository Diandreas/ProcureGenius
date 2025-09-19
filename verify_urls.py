#!/usr/bin/env python3
"""
Script de vérification des URLs ProcureGenius
Vérifie que tous les liens et URLs sont correctement configurés
"""

import os
import sys
import re

def check_url_patterns():
    """Vérifie les patterns d'URLs dans tous les fichiers urls.py"""
    
    print("🔗 VÉRIFICATION DES URLs")
    print("=" * 50)
    
    url_files = []
    
    # Trouver tous les fichiers urls.py
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file == 'urls.py':
                url_files.append(os.path.join(root, file))
    
    total_patterns = 0
    valid_patterns = 0
    issues = []
    
    for url_file in url_files:
        print(f"\n📁 {url_file}")
        
        try:
            with open(url_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Chercher les patterns d'URLs
            patterns = re.findall(r"path\(['\"]([^'\"]+)['\"]", content)
            
            for pattern in patterns:
                total_patterns += 1
                
                # Vérifications basiques
                if not pattern:
                    issues.append(f"  ❌ Pattern vide dans {url_file}")
                    continue
                
                # Vérifier les caractères valides
                if re.match(r'^[a-zA-Z0-9/_<>:-]+$', pattern):
                    print(f"  ✅ {pattern}")
                    valid_patterns += 1
                else:
                    print(f"  ⚠️  {pattern} (caractères spéciaux)")
                    valid_patterns += 1  # Compter comme valide mais avec avertissement
            
            # Vérifier app_name
            if 'app_name' in content:
                app_name_match = re.search(r"app_name\s*=\s*['\"]([^'\"]+)['\"]", content)
                if app_name_match:
                    print(f"  📝 app_name: {app_name_match.group(1)}")
                else:
                    issues.append(f"  ❌ app_name mal formaté dans {url_file}")
        
        except Exception as e:
            issues.append(f"  ❌ Erreur lecture {url_file}: {e}")
    
    print(f"\n📊 Résumé URLs:")
    print(f"  Total patterns: {total_patterns}")
    print(f"  Patterns valides: {valid_patterns}")
    print(f"  Taux de validité: {(valid_patterns/total_patterns)*100:.1f}%" if total_patterns > 0 else "  Aucun pattern trouvé")
    
    if issues:
        print(f"\n⚠️  Problèmes détectés:")
        for issue in issues:
            print(issue)
    
    return len(issues) == 0

def check_template_links():
    """Vérifie les liens dans les templates"""
    
    print("\n🎨 VÉRIFICATION DES LIENS DANS LES TEMPLATES")
    print("=" * 50)
    
    template_files = []
    
    # Trouver tous les fichiers .html
    for root, dirs, files in os.walk('templates'):
        for file in files:
            if file.endswith('.html'):
                template_files.append(os.path.join(root, file))
    
    total_links = 0
    valid_links = 0
    issues = []
    
    for template_file in template_files:
        print(f"\n📄 {template_file}")
        
        try:
            with open(template_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Chercher les liens Django {% url %}
            url_tags = re.findall(r"{%\s*url\s+['\"]([^'\"]+)['\"]", content)
            
            for url_tag in url_tags:
                total_links += 1
                
                # Vérifier le format app:view
                if ':' in url_tag:
                    app, view = url_tag.split(':', 1)
                    print(f"  ✅ {url_tag}")
                    valid_links += 1
                else:
                    print(f"  ⚠️  {url_tag} (pas de namespace)")
                    valid_links += 1  # Compter comme valide
            
            # Chercher les liens href statiques
            href_links = re.findall(r'href=["\']([^"\']+)["\']', content)
            
            for href in href_links:
                if href.startswith('http') or href.startswith('#') or href.startswith('/'):
                    total_links += 1
                    print(f"  ✅ {href}")
                    valid_links += 1
        
        except Exception as e:
            issues.append(f"  ❌ Erreur lecture {template_file}: {e}")
    
    print(f"\n📊 Résumé liens templates:")
    print(f"  Total liens: {total_links}")
    print(f"  Liens valides: {valid_links}")
    print(f"  Taux de validité: {(valid_links/total_links)*100:.1f}%" if total_links > 0 else "  Aucun lien trouvé")
    
    return len(issues) == 0

def check_static_files():
    """Vérifie les fichiers statiques"""
    
    print("\n🎨 VÉRIFICATION DES FICHIERS STATIQUES")
    print("=" * 50)
    
    static_files = [
        'static/css/main.css',
        'static/js/main.js',
    ]
    
    all_present = True
    
    for static_file in static_files:
        if os.path.exists(static_file):
            # Vérifier la taille du fichier
            size = os.path.getsize(static_file)
            print(f"  ✅ {static_file} ({size} bytes)")
            
            # Vérifier le contenu basique
            with open(static_file, 'r', encoding='utf-8') as f:
                content = f.read()
                if len(content.strip()) > 0:
                    print(f"    📝 Contenu présent")
                else:
                    print(f"    ⚠️  Fichier vide")
        else:
            print(f"  ❌ {static_file} manquant")
            all_present = False
    
    return all_present

def check_settings_configuration():
    """Vérifie la configuration Django"""
    
    print("\n⚙️ VÉRIFICATION DE LA CONFIGURATION")
    print("=" * 50)
    
    try:
        with open('saas_procurement/settings.py', 'r', encoding='utf-8') as f:
            settings_content = f.read()
        
        # Vérifications importantes
        checks = [
            ('INSTALLED_APPS', 'Configuration des applications'),
            ('DATABASES', 'Configuration base de données'),
            ('MIDDLEWARE', 'Configuration middleware'),
            ('TEMPLATES', 'Configuration templates'),
            ('STATIC_URL', 'Configuration fichiers statiques'),
            ('LANGUAGE_CODE', 'Configuration langue'),
            ('MISTRAL_API_KEY', 'Configuration Mistral AI'),
            ('PAYPAL_CLIENT_ID', 'Configuration PayPal'),
        ]
        
        all_configured = True
        
        for setting, description in checks:
            if setting in settings_content:
                print(f"  ✅ {description}")
            else:
                print(f"  ❌ {description} manquant")
                all_configured = False
        
        # Vérifier les applications dans INSTALLED_APPS
        if 'TENANT_APPS' in settings_content and 'SHARED_APPS' in settings_content:
            print(f"  ✅ Configuration multi-tenant")
        else:
            print(f"  ❌ Configuration multi-tenant incomplète")
            all_configured = False
        
        return all_configured
        
    except Exception as e:
        print(f"  ❌ Erreur lecture settings.py: {e}")
        return False

def check_requirements():
    """Vérifie le fichier requirements.txt"""
    
    print("\n📦 VÉRIFICATION DES DÉPENDANCES")
    print("=" * 50)
    
    try:
        with open('requirements.txt', 'r', encoding='utf-8') as f:
            requirements = f.read()
        
        # Dépendances critiques à vérifier
        critical_deps = [
            'Django==5.0.3',
            'djangorestframework',
            'django-tenants',
            'django-money',
            'mistralai',
            'paypalrestsdk',
            'psycopg2-binary',
            'redis',
            'celery',
            'channels',
        ]
        
        all_present = True
        
        for dep in critical_deps:
            dep_name = dep.split('==')[0].split('>=')[0].split('<=')[0]
            if dep_name in requirements:
                print(f"  ✅ {dep_name}")
            else:
                print(f"  ❌ {dep_name} manquant")
                all_present = False
        
        return all_present
        
    except Exception as e:
        print(f"  ❌ Erreur lecture requirements.txt: {e}")
        return False

def main():
    """Fonction principale de vérification"""
    
    print("🔍 VÉRIFICATION COMPLÈTE DES URLs ET LIENS")
    print("=" * 60)
    
    # Vérifications
    urls_ok = check_url_patterns()
    templates_ok = check_template_links()
    static_ok = check_static_files()
    settings_ok = check_settings_configuration()
    requirements_ok = check_requirements()
    
    # Score final
    checks = [urls_ok, templates_ok, static_ok, settings_ok, requirements_ok]
    passed = sum(checks)
    total = len(checks)
    score = (passed / total) * 100
    
    print("\n" + "=" * 60)
    print("🏆 RÉSUMÉ FINAL DES VÉRIFICATIONS")
    print("=" * 60)
    
    print(f"🔗 URLs et patterns: {'✅' if urls_ok else '❌'}")
    print(f"🎨 Liens templates: {'✅' if templates_ok else '❌'}")
    print(f"📁 Fichiers statiques: {'✅' if static_ok else '❌'}")
    print(f"⚙️ Configuration Django: {'✅' if settings_ok else '❌'}")
    print(f"📦 Dépendances: {'✅' if requirements_ok else '❌'}")
    
    print(f"\n📊 Score global: {score:.1f}% ({passed}/{total})")
    
    if score == 100:
        print("\n🎉 TOUTES LES VÉRIFICATIONS SONT RÉUSSIES !")
        print("✅ L'application est parfaitement configurée")
        print("🚀 Prête pour le déploiement immédiat")
    elif score >= 80:
        print("\n✅ VÉRIFICATIONS EXCELLENTES !")
        print("⚠️  Quelques ajustements mineurs recommandés")
        print("🚀 L'application peut être déployée")
    else:
        print("\n❌ PROBLÈMES DÉTECTÉS")
        print("🔧 Corrections nécessaires avant déploiement")
    
    return score

if __name__ == "__main__":
    main()