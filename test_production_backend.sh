#!/bin/bash
#
# Script de diagnostic du backend en production
# Usage: bash test_production_backend.sh
#

BACKEND_URL="https://appback.centrejulianna.com"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     DIAGNOSTIC BACKEND PRODUCTION - CENTRE DE SANTÉ JULIANNA   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Backend URL: $BACKEND_URL"
echo ""

# Test 1: Vérifier si le serveur répond
echo "═══ 1. TEST CONNECTIVITÉ ═══"
if curl -Is "$BACKEND_URL" > /dev/null 2>&1; then
    echo "✅ Serveur accessible"
else
    echo "❌ Serveur NON accessible"
    echo "   Vérifier que le serveur est démarré"
    exit 1
fi
echo ""

# Test 2: Tester la page d'accueil
echo "═══ 2. PAGE D'ACCUEIL ═══"
HOME_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BACKEND_URL/")
HTTP_CODE=$(echo "$HOME_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
echo "HTTP Status: $HTTP_CODE"
if [[ "$HOME_RESPONSE" == *"<!DOCTYPE"* ]]; then
    echo "⚠️  Réponse en HTML (normal pour la racine)"
else
    echo "✅ Réponse OK"
fi
echo ""

# Test 3: Tester l'endpoint API de santé (si existant)
echo "═══ 3. API HEALTH CHECK ═══"
API_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BACKEND_URL/api/v1/")
API_HTTP_CODE=$(echo "$API_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
echo "HTTP Status: $API_HTTP_CODE"
if [[ "$API_RESPONSE" == *"<!DOCTYPE"* ]]; then
    echo "❌ API renvoie du HTML au lieu de JSON!"
    echo "   Cela explique l'erreur frontend"
    echo ""
    echo "Début de la réponse:"
    echo "$API_RESPONSE" | head -10
else
    echo "✅ API répond correctement"
    echo "Réponse:"
    echo "$API_RESPONSE" | grep -v "HTTP_CODE"
fi
echo ""

# Test 4: Tester l'endpoint de login
echo "═══ 4. API AUTH TOKEN ═══"
AUTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BACKEND_URL/api/v1/auth/token/" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json")
AUTH_HTTP_CODE=$(echo "$AUTH_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
echo "HTTP Status: $AUTH_HTTP_CODE"
if [[ "$AUTH_RESPONSE" == *"<!DOCTYPE"* ]]; then
    echo "❌ Endpoint auth renvoie du HTML!"
    echo ""
    echo "Début de la réponse:"
    echo "$AUTH_RESPONSE" | head -10
else
    echo "✅ Endpoint auth OK (attend des credentials)"
    echo "Réponse:"
    echo "$AUTH_RESPONSE" | grep -v "HTTP_CODE"
fi
echo ""

# Test 5: Headers CORS
echo "═══ 5. HEADERS CORS ═══"
curl -sI "$BACKEND_URL/api/v1/" | grep -i "access-control"
if [ $? -eq 0 ]; then
    echo "✅ Headers CORS présents"
else
    echo "⚠️  Headers CORS absents (peut causer des erreurs)"
fi
echo ""

# Test 6: Vérifier le type de contenu
echo "═══ 6. CONTENT-TYPE ═══"
CONTENT_TYPE=$(curl -sI "$BACKEND_URL/api/v1/auth/token/" | grep -i "content-type")
echo "Content-Type: $CONTENT_TYPE"
if [[ "$CONTENT_TYPE" == *"application/json"* ]]; then
    echo "✅ Content-Type correct (JSON)"
else
    echo "❌ Content-Type incorrect (devrait être application/json)"
fi
echo ""

# Diagnostic final
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                        DIAGNOSTIC                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

if [[ "$API_RESPONSE" == *"<!DOCTYPE"* ]]; then
    echo "🔴 PROBLÈME IDENTIFIÉ:"
    echo "   Le backend renvoie du HTML au lieu de JSON"
    echo ""
    echo "CAUSES POSSIBLES:"
    echo "  1. Django en mode DEBUG avec page d'erreur HTML"
    echo "  2. Serveur web (nginx) mal configuré"
    echo "  3. URL API incorrecte"
    echo "  4. Application Django non démarrée (nginx sert une page statique)"
    echo ""
    echo "SOLUTIONS:"
    echo "  1. Vérifier que Django tourne:"
    echo "     ps aux | grep gunicorn"
    echo ""
    echo "  2. Vérifier les logs Django:"
    echo "     tail -f /path/to/logs/error.log"
    echo ""
    echo "  3. Vérifier la config nginx:"
    echo "     cat /etc/nginx/sites-enabled/appback.centrejulianna.com"
    echo ""
    echo "  4. Redémarrer l'application:"
    echo "     sudo systemctl restart gunicorn"
    echo "     sudo systemctl restart nginx"
else
    echo "✅ Backend semble fonctionnel"
fi
echo ""
