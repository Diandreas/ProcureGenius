#!/usr/bin/env python3
"""
Script de validation de la structure ProcureGenius
Vérifie que tous les fichiers et modules sont présents
"""

import os
import sys

def check_file_exists(filepath, description):
    """Vérifie qu'un fichier existe"""
    exists = os.path.exists(filepath)
    status = "✅" if exists else "❌"
    print(f"  {status} {description}: {filepath}")
    return exists

def check_directory_exists(dirpath, description):
    """Vérifie qu'un répertoire existe"""
    exists = os.path.isdir(dirpath)
    status = "✅" if exists else "❌"
    print(f"  {status} {description}: {dirpath}")
    return exists

def validate_structure():
    """Valide la structure complète du projet"""
    
    print("🔍 VALIDATION DE LA STRUCTURE PROCUREGENIUS")
    print("=" * 60)
    
    total_checks = 0
    passed_checks = 0
    
    # Configuration principale
    print("\n📁 Configuration principale:")
    files_to_check = [
        ("manage.py", "Script de gestion Django"),
        ("requirements.txt", "Dépendances Python"),
        ("docker-compose.yml", "Configuration Docker"),
        ("Dockerfile", "Image Docker"),
        (".env.example", "Exemple variables d'environnement"),
        ("deploy.sh", "Script de déploiement"),
        ("README.md", "Documentation"),
    ]
    
    for filepath, description in files_to_check:
        total_checks += 1
        if check_file_exists(filepath, description):
            passed_checks += 1
    
    # Configuration Django
    print("\n⚙️ Configuration Django:")
    django_files = [
        ("saas_procurement/__init__.py", "Package principal"),
        ("saas_procurement/settings.py", "Configuration Django"),
        ("saas_procurement/urls.py", "URLs principales"),
        ("saas_procurement/wsgi.py", "WSGI"),
        ("saas_procurement/asgi.py", "ASGI"),
    ]
    
    for filepath, description in django_files:
        total_checks += 1
        if check_file_exists(filepath, description):
            passed_checks += 1
    
    # Applications Django
    print("\n📦 Applications Django:")
    apps = [
        "accounts", "core", "suppliers", "purchase_orders", 
        "invoicing", "ai_assistant", "analytics", "integrations", "api"
    ]
    
    for app in apps:
        app_files = [
            (f"apps/{app}/__init__.py", f"Package {app}"),
            (f"apps/{app}/models.py", f"Modèles {app}"),
            (f"apps/{app}/views.py", f"Vues {app}"),
            (f"apps/{app}/urls.py", f"URLs {app}"),
            (f"apps/{app}/admin.py", f"Admin {app}"),
            (f"apps/{app}/apps.py", f"Config {app}"),
        ]
        
        for filepath, description in app_files:
            total_checks += 1
            if check_file_exists(filepath, description):
                passed_checks += 1
    
    # Templates
    print("\n🎨 Templates:")
    template_dirs = [
        "templates",
        "templates/base",
        "templates/accounts", 
        "templates/core",
        "templates/suppliers",
    ]
    
    for dirpath in template_dirs:
        total_checks += 1
        if check_directory_exists(dirpath, f"Répertoire {dirpath}"):
            passed_checks += 1
    
    template_files = [
        ("templates/base.html", "Template de base"),
        ("templates/core/dashboard.html", "Dashboard principal"),
        ("templates/accounts/profile.html", "Profil utilisateur"),
        ("templates/suppliers/supplier_list.html", "Liste fournisseurs"),
    ]
    
    for filepath, description in template_files:
        total_checks += 1
        if check_file_exists(filepath, description):
            passed_checks += 1
    
    # Assets statiques
    print("\n🎨 Assets statiques:")
    static_files = [
        ("static/css/main.css", "CSS principal"),
        ("static/js/main.js", "JavaScript principal"),
    ]
    
    for filepath, description in static_files:
        total_checks += 1
        if check_file_exists(filepath, description):
            passed_checks += 1
    
    # Internationalisation
    print("\n🌍 Internationalisation:")
    i18n_files = [
        ("locale/fr/LC_MESSAGES/django.po", "Traductions françaises"),
        ("locale/en/LC_MESSAGES/django.po", "Traductions anglaises"),
    ]
    
    for filepath, description in i18n_files:
        total_checks += 1
        if check_file_exists(filepath, description):
            passed_checks += 1
    
    # Résumé final
    print("\n" + "=" * 60)
    print("📋 RÉSUMÉ DE LA VALIDATION")
    print("=" * 60)
    
    success_rate = (passed_checks / total_checks) * 100
    
    print(f"Total des vérifications: {total_checks}")
    print(f"✅ Réussies: {passed_checks}")
    print(f"❌ Échouées: {total_checks - passed_checks}")
    print(f"📊 Taux de réussite: {success_rate:.1f}%")
    
    if success_rate == 100:
        print("\n🎉 STRUCTURE PARFAITE !")
        print("✅ Tous les fichiers sont présents")
        print("🚀 L'application est prête pour le déploiement")
    elif success_rate >= 90:
        print("\n✅ STRUCTURE EXCELLENTE !")
        print("⚠️  Quelques fichiers mineurs manquants")
        print("🚀 L'application peut être déployée")
    elif success_rate >= 75:
        print("\n⚠️  STRUCTURE ACCEPTABLE")
        print("🔧 Quelques ajustements nécessaires")
    else:
        print("\n❌ STRUCTURE INCOMPLÈTE")
        print("🛠️  Développement supplémentaire requis")
    
    return success_rate

def check_python_syntax():
    """Vérifie la syntaxe Python de tous les fichiers .py"""
    print("\n🐍 Vérification de la syntaxe Python:")
    
    import ast
    
    python_files = []
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith('.py'):
                python_files.append(os.path.join(root, file))
    
    syntax_errors = 0
    
    for py_file in python_files:
        try:
            with open(py_file, 'r', encoding='utf-8') as f:
                content = f.read()
                ast.parse(content)
            print(f"  ✅ {py_file}")
        except SyntaxError as e:
            print(f"  ❌ {py_file}: {e}")
            syntax_errors += 1
        except Exception as e:
            print(f"  ⚠️  {py_file}: {e}")
    
    if syntax_errors == 0:
        print(f"\n✅ Tous les {len(python_files)} fichiers Python ont une syntaxe correcte !")
    else:
        print(f"\n❌ {syntax_errors} fichiers avec des erreurs de syntaxe")
    
    return syntax_errors == 0

def main():
    """Fonction principale"""
    print("🔍 VALIDATION COMPLÈTE DE PROCUREGENIUS")
    print("=" * 60)
    
    # Validation de la structure
    structure_score = validate_structure()
    
    # Validation de la syntaxe
    syntax_ok = check_python_syntax()
    
    # Score final
    print("\n" + "=" * 60)
    print("🏆 SCORE FINAL")
    print("=" * 60)
    
    final_score = (structure_score + (100 if syntax_ok else 0)) / 2
    
    print(f"📊 Score de structure: {structure_score:.1f}%")
    print(f"🐍 Syntaxe Python: {'✅ OK' if syntax_ok else '❌ Erreurs'}")
    print(f"🎯 Score final: {final_score:.1f}%")
    
    if final_score >= 95:
        print("\n🎉 APPLICATION EXCELLENTE !")
        print("🚀 Prête pour le déploiement en production")
    elif final_score >= 85:
        print("\n✅ APPLICATION TRÈS BONNE !")
        print("🚀 Prête pour le déploiement avec tests")
    elif final_score >= 75:
        print("\n⚠️  APPLICATION ACCEPTABLE")
        print("🔧 Quelques améliorations recommandées")
    else:
        print("\n❌ APPLICATION INCOMPLÈTE")
        print("🛠️  Développement supplémentaire requis")

if __name__ == "__main__":
    main()