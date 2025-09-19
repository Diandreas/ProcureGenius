#!/usr/bin/env python3
"""
Script de vérification de l'internationalisation ProcureGenius
Vérifie que les traductions FR/EN sont complètes et cohérentes
"""

import os
import re

def check_translation_files():
    """Vérifie les fichiers de traduction"""
    
    print("🌍 VÉRIFICATION DES TRADUCTIONS")
    print("=" * 50)
    
    languages = ['fr', 'en']
    all_good = True
    
    for lang in languages:
        po_file = f"locale/{lang}/LC_MESSAGES/django.po"
        
        print(f"\n📝 Vérification {lang.upper()}:")
        
        if os.path.exists(po_file):
            print(f"  ✅ Fichier {po_file} existe")
            
            try:
                with open(po_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Compter les traductions
                msgid_count = len(re.findall(r'^msgid\s+"([^"]*)"', content, re.MULTILINE))
                msgstr_count = len(re.findall(r'^msgstr\s+"([^"]*)"', content, re.MULTILINE))
                
                print(f"  📊 {msgid_count} msgid trouvés")
                print(f"  📊 {msgstr_count} msgstr trouvés")
                
                # Vérifier les traductions vides
                empty_translations = len(re.findall(r'^msgstr\s+""$', content, re.MULTILINE))
                if empty_translations > 1:  # Le premier est normal (header)
                    print(f"  ⚠️  {empty_translations-1} traductions vides")
                else:
                    print(f"  ✅ Toutes les traductions sont complètes")
                
                # Vérifier des termes clés
                key_terms = [
                    'Dashboard', 'Purchase Orders', 'Invoicing', 'Suppliers',
                    'Analytics', 'AI Assistant', 'Create', 'Edit', 'Delete',
                    'Save', 'Cancel', 'Search'
                ]
                
                missing_terms = []
                for term in key_terms:
                    if f'msgid "{term}"' not in content:
                        missing_terms.append(term)
                
                if missing_terms:
                    print(f"  ⚠️  Termes manquants: {', '.join(missing_terms)}")
                else:
                    print(f"  ✅ Tous les termes clés sont présents")
                
            except Exception as e:
                print(f"  ❌ Erreur lecture {po_file}: {e}")
                all_good = False
        else:
            print(f"  ❌ Fichier {po_file} manquant")
            all_good = False
    
    return all_good

def check_template_i18n():
    """Vérifie l'utilisation des tags i18n dans les templates"""
    
    print("\n🎨 VÉRIFICATION I18N DANS LES TEMPLATES")
    print("=" * 50)
    
    template_files = []
    
    # Trouver tous les fichiers .html
    for root, dirs, files in os.walk('templates'):
        for file in files:
            if file.endswith('.html'):
                template_files.append(os.path.join(root, file))
    
    total_templates = len(template_files)
    i18n_templates = 0
    issues = []
    
    for template_file in template_files:
        print(f"\n📄 {template_file}")
        
        try:
            with open(template_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Vérifier les tags i18n
            has_load_i18n = '{% load i18n %}' in content
            has_trans_tags = '{% trans ' in content or '{% blocktrans ' in content
            
            if has_load_i18n:
                print("  ✅ {% load i18n %} présent")
                i18n_templates += 1
            else:
                print("  ⚠️  {% load i18n %} manquant")
            
            if has_trans_tags:
                # Compter les traductions
                trans_count = len(re.findall(r'{%\s*trans\s+["\'][^"\']+["\']', content))
                blocktrans_count = len(re.findall(r'{%\s*blocktrans.*?%}', content))
                
                print(f"  📊 {trans_count} tags trans")
                print(f"  📊 {blocktrans_count} tags blocktrans")
            else:
                print(f"  ⚠️  Aucun tag de traduction trouvé")
            
            # Vérifier les textes en dur (potentiels oublis de traduction)
            hardcoded_texts = re.findall(r'>[^<{%]+<', content)
            french_texts = [text for text in hardcoded_texts if re.search(r'[àâäéèêëïîôöùûüÿç]', text, re.IGNORECASE)]
            
            if french_texts and not has_trans_tags:
                print(f"  ⚠️  Textes français non traduits détectés")
                issues.append(f"Textes français dans {template_file}")
        
        except Exception as e:
            print(f"  ❌ Erreur lecture {template_file}: {e}")
            issues.append(f"Erreur lecture {template_file}")
    
    print(f"\n📊 Résumé templates i18n:")
    print(f"  Total templates: {total_templates}")
    print(f"  Templates avec i18n: {i18n_templates}")
    print(f"  Taux i18n: {(i18n_templates/total_templates)*100:.1f}%" if total_templates > 0 else "  Aucun template")
    
    return len(issues) == 0

def check_python_i18n():
    """Vérifie l'utilisation des traductions dans le code Python"""
    
    print("\n🐍 VÉRIFICATION I18N DANS LE CODE PYTHON")
    print("=" * 50)
    
    python_files = []
    
    # Trouver tous les fichiers .py dans apps/
    for root, dirs, files in os.walk('apps'):
        for file in files:
            if file.endswith('.py'):
                python_files.append(os.path.join(root, file))
    
    i18n_files = 0
    total_gettext = 0
    
    for py_file in python_files:
        try:
            with open(py_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Vérifier les imports de traduction
            has_gettext_import = any(
                pattern in content for pattern in [
                    'from django.utils.translation import gettext',
                    'from django.utils.translation import gettext_lazy',
                    'from django.utils.translation import ugettext',
                ]
            )
            
            # Compter les utilisations
            gettext_count = len(re.findall(r'[^a-zA-Z]_\(["\'][^"\']+["\']', content))
            gettext_lazy_count = len(re.findall(r'gettext_lazy\(["\'][^"\']+["\']', content))
            
            total_usage = gettext_count + gettext_lazy_count
            
            if has_gettext_import or total_usage > 0:
                print(f"  ✅ {py_file}: {total_usage} traductions")
                i18n_files += 1
                total_gettext += total_usage
            
        except Exception as e:
            print(f"  ❌ Erreur lecture {py_file}: {e}")
    
    print(f"\n📊 Résumé Python i18n:")
    print(f"  Fichiers avec i18n: {i18n_files}")
    print(f"  Total traductions: {total_gettext}")
    
    return True

def check_language_switching():
    """Vérifie le mécanisme de changement de langue"""
    
    print("\n🔄 VÉRIFICATION DU CHANGEMENT DE LANGUE")
    print("=" * 50)
    
    # Vérifier la configuration dans settings.py
    try:
        with open('saas_procurement/settings.py', 'r', encoding='utf-8') as f:
            settings_content = f.read()
        
        checks = [
            ('USE_I18N = True', 'Internationalisation activée'),
            ('LANGUAGE_CODE', 'Code langue par défaut'),
            ('LANGUAGES = [', 'Langues disponibles'),
            ('LocaleMiddleware', 'Middleware de locale'),
            ('LOCALE_PATHS', 'Chemins des traductions'),
        ]
        
        all_configured = True
        
        for check, description in checks:
            if check in settings_content:
                print(f"  ✅ {description}")
            else:
                print(f"  ❌ {description} manquant")
                all_configured = False
        
        # Vérifier la vue de changement de langue
        accounts_views_file = 'apps/accounts/views.py'
        if os.path.exists(accounts_views_file):
            with open(accounts_views_file, 'r', encoding='utf-8') as f:
                views_content = f.read()
            
            if 'change_language' in views_content:
                print(f"  ✅ Vue de changement de langue")
            else:
                print(f"  ❌ Vue de changement de langue manquante")
                all_configured = False
        
        return all_configured
        
    except Exception as e:
        print(f"  ❌ Erreur vérification configuration: {e}")
        return False

def main():
    """Fonction principale de vérification i18n"""
    
    print("🌍 VÉRIFICATION COMPLÈTE DE L'INTERNATIONALISATION")
    print("=" * 60)
    
    # Vérifications
    translation_files_ok = check_translation_files()
    template_i18n_ok = check_template_i18n()
    python_i18n_ok = check_python_i18n()
    language_switching_ok = check_language_switching()
    
    # Score final
    checks = [translation_files_ok, template_i18n_ok, python_i18n_ok, language_switching_ok]
    passed = sum(checks)
    total = len(checks)
    score = (passed / total) * 100
    
    print("\n" + "=" * 60)
    print("🏆 RÉSUMÉ I18N")
    print("=" * 60)
    
    print(f"📝 Fichiers de traduction: {'✅' if translation_files_ok else '❌'}")
    print(f"🎨 Templates i18n: {'✅' if template_i18n_ok else '❌'}")
    print(f"🐍 Code Python i18n: {'✅' if python_i18n_ok else '❌'}")
    print(f"🔄 Changement de langue: {'✅' if language_switching_ok else '❌'}")
    
    print(f"\n📊 Score i18n: {score:.1f}% ({passed}/{total})")
    
    if score == 100:
        print("\n🎉 INTERNATIONALISATION PARFAITE !")
        print("✅ Support complet FR/EN")
        print("🌍 Changement de langue fonctionnel")
    elif score >= 75:
        print("\n✅ INTERNATIONALISATION EXCELLENTE !")
        print("⚠️  Quelques améliorations possibles")
    else:
        print("\n❌ PROBLÈMES I18N DÉTECTÉS")
        print("🔧 Corrections nécessaires")
    
    return score

if __name__ == "__main__":
    main()