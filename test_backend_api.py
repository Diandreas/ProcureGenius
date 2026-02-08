#!/usr/bin/env python3
"""
Script de test du backend API en production
Usage: python test_backend_api.py
"""

import requests
import json
from datetime import datetime

BACKEND_URL = "https://appback.centrejulianna.com"
ENDPOINTS = [
    "/api/v1/",
    "/api/v1/auth/token/",
    "/api/v1/auth/profile/",
    "/admin/",
]

def test_endpoint(url, method="GET", data=None):
    """Test un endpoint et retourne le résultat"""
    try:
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        else:
            response = requests.post(url, headers=headers, json=data, timeout=10)

        content_type = response.headers.get('Content-Type', '')

        result = {
            'url': url,
            'status_code': response.status_code,
            'content_type': content_type,
            'is_json': 'application/json' in content_type,
            'is_html': 'text/html' in content_type or response.text.strip().startswith('<!DOCTYPE'),
            'response_preview': response.text[:500] if len(response.text) < 500 else response.text[:500] + "...",
        }

        return result

    except requests.exceptions.Timeout:
        return {'url': url, 'error': 'Timeout (> 10s)'}
    except requests.exceptions.ConnectionError:
        return {'url': url, 'error': 'Connexion impossible'}
    except Exception as e:
        return {'url': url, 'error': str(e)}

def print_separator(char="=", length=70):
    print(char * length)

def print_result(result):
    """Affiche le résultat d'un test de manière lisible"""
    if 'error' in result:
        print(f"❌ {result['url']}")
        print(f"   Erreur: {result['error']}")
    else:
        status_emoji = "✅" if 200 <= result['status_code'] < 300 else "⚠️" if 400 <= result['status_code'] < 500 else "❌"
        print(f"{status_emoji} {result['url']}")
        print(f"   Status: {result['status_code']}")
        print(f"   Content-Type: {result['content_type']}")

        if result['is_html'] and not result['url'].endswith('/admin/'):
            print(f"   ⚠️  PROBLÈME: Renvoie du HTML au lieu de JSON!")
            print(f"   Aperçu: {result['response_preview'][:200]}")
        elif result['is_json']:
            print(f"   ✅ Répond correctement en JSON")
            try:
                json_data = json.loads(result['response_preview'])
                print(f"   JSON: {json.dumps(json_data, indent=2)[:200]}")
            except:
                pass
        else:
            print(f"   Aperçu: {result['response_preview'][:100]}")

def main():
    print("╔════════════════════════════════════════════════════════════════╗")
    print("║         TEST BACKEND API - CENTRE DE SANTÉ JULIANNA            ║")
    print("╚════════════════════════════════════════════════════════════════╝")
    print(f"\n🌐 Backend URL: {BACKEND_URL}")
    print(f"⏰ Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    print_separator()
    print("1. TEST CONNEXION SERVEUR")
    print_separator()

    try:
        response = requests.get(BACKEND_URL, timeout=5)
        print(f"✅ Serveur accessible (HTTP {response.status_code})")
    except Exception as e:
        print(f"❌ Serveur non accessible: {e}")
        print("\n🔴 Le serveur ne répond pas. Vérifier:")
        print("   1. Que le serveur est démarré")
        print("   2. Que le DNS pointe vers la bonne IP")
        print("   3. Que le firewall autorise les connexions HTTPS")
        return

    print()
    print_separator()
    print("2. TEST ENDPOINTS API")
    print_separator()
    print()

    results = []
    for endpoint in ENDPOINTS:
        url = f"{BACKEND_URL}{endpoint}"
        result = test_endpoint(url)
        results.append(result)
        print_result(result)
        print()

    # Test avec login
    print_separator()
    print("3. TEST LOGIN (avec credentials invalides)")
    print_separator()
    print()

    login_result = test_endpoint(
        f"{BACKEND_URL}/api/v1/auth/token/",
        method="POST",
        data={"username": "test", "password": "test"}
    )
    print_result(login_result)
    print()

    # Diagnostic
    print_separator()
    print("4. DIAGNOSTIC")
    print_separator()
    print()

    api_results = [r for r in results if '/api/' in r['url'] and 'error' not in r]
    html_responses = [r for r in api_results if r.get('is_html', False)]

    if html_responses:
        print("🔴 PROBLÈME IDENTIFIÉ:")
        print("   Les endpoints API renvoient du HTML au lieu de JSON!")
        print()
        print("   Endpoints affectés:")
        for r in html_responses:
            print(f"   - {r['url']}")
        print()
        print("🔧 CAUSES POSSIBLES:")
        print("   1. Django n'est pas démarré (nginx sert une page d'erreur)")
        print("   2. Nginx mal configuré (ne proxi pas vers Django)")
        print("   3. Django en mode DEBUG avec page d'erreur HTML")
        print("   4. Mauvaise configuration des URLs Django")
        print()
        print("📋 ACTIONS À FAIRE SUR LE SERVEUR:")
        print("   1. Vérifier que Django tourne:")
        print("      $ ps aux | grep gunicorn")
        print()
        print("   2. Vérifier les logs:")
        print("      $ sudo journalctl -u gunicorn -n 50")
        print()
        print("   3. Redémarrer si nécessaire:")
        print("      $ sudo systemctl restart gunicorn")
        print("      $ sudo systemctl restart nginx")
    elif not api_results:
        print("🔴 ERREUR:")
        print("   Impossible de se connecter aux endpoints API")
        print()
        print("   Vérifier la connectivité réseau et DNS")
    else:
        print("✅ BACKEND OK:")
        print("   Tous les endpoints API répondent correctement en JSON")
        print()
        print("   Le problème vient peut-être d'ailleurs:")
        print("   - Authentification/tokens côté frontend")
        print("   - CORS")
        print("   - Cache navigateur")

    print()
    print_separator()
    print("5. RÉSUMÉ")
    print_separator()
    print()

    success_count = len([r for r in results if 'error' not in r and 200 <= r.get('status_code', 0) < 300])
    error_count = len([r for r in results if 'error' in r or r.get('status_code', 0) >= 400])

    print(f"   Total endpoints testés: {len(results)}")
    print(f"   ✅ Succès: {success_count}")
    print(f"   ❌ Erreurs: {error_count}")
    print()

    if html_responses:
        print("   🔴 ACTION REQUISE: Corriger la configuration backend")
        print()
        print("   📖 Voir PRODUCTION_BACKEND_DEBUG.md pour le guide complet")
    else:
        print("   ✅ Backend fonctionnel")

    print()

if __name__ == "__main__":
    main()
