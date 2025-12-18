#!/bin/bash

# Script de débogage pour vérifier la configuration serveur
# Utilisation: ./debug_server.sh

echo "🔍 DIAGNOSTIC SERVEUR CLOUDPANEL"
echo "================================="

DOMAIN="procura.mirhosty.com"
FRONTEND_PATH="/home/mirhosty-procura/htdocs/procura.mirhosty.com/frontend/build"

echo "🌐 Domaine: $DOMAIN"
echo "📁 Chemin frontend: $FRONTEND_PATH"
echo ""

# 1. Vérifier si les fichiers existent
echo "📁 VÉRIFICATION DES FICHIERS:"
echo "----------------------------"

if [ -f "$FRONTEND_PATH/index.html" ]; then
    echo "✅ index.html existe"
else
    echo "❌ index.html manquant"
fi

if [ -f "$FRONTEND_PATH/manifest.json" ]; then
    echo "✅ manifest.json existe"
else
    echo "❌ manifest.json manquant"
fi

# Compter les fichiers JS
JS_COUNT=$(find "$FRONTEND_PATH" -name "*.js" 2>/dev/null | wc -l)
echo "📄 Fichiers JS: $JS_COUNT"

if [ -d "$FRONTEND_PATH/assets" ]; then
    echo "✅ Dossier assets existe"
else
    echo "❌ Dossier assets manquant"
fi

echo ""

# 2. Tester les accès HTTP
echo "🌐 TESTS HTTP:"
echo "--------------"

# Test index.html
echo "Test index.html:"
curl -s -I "https://$DOMAIN/" | head -5

echo ""
echo "Test manifest.json:"
curl -s -I "https://$DOMAIN/manifest.json" | head -5

echo ""
echo "Test fichier JS (premier trouvé):"
FIRST_JS=$(find "$FRONTEND_PATH" -name "*.js" | head -1)
if [ -n "$FIRST_JS" ]; then
    BASENAME=$(basename "$FIRST_JS")
    echo "Test de: $BASENAME"
    curl -s -I "https://$DOMAIN/assets/$BASENAME" | head -5
else
    echo "❌ Aucun fichier JS trouvé"
fi

echo ""

# 3. Vérifier la configuration Nginx
echo "🌐 VÉRIFICATION NGINX:"
echo "----------------------"

# Vérifier si la configuration est chargée
if nginx -T 2>/dev/null | grep -q "procura.mirhosty.com"; then
    echo "✅ Configuration pour procura.mirhosty.com trouvée dans Nginx"
else
    echo "❌ Configuration manquante dans Nginx"
fi

# Vérifier le statut de Nginx
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx est actif"
else
    echo "❌ Nginx n'est pas actif"
fi

echo ""

# 4. Vérifier Django
echo "🐍 VÉRIFICATION DJANGO:"
echo "----------------------"

# Vérifier si Django tourne
if pgrep -f "python.*manage.py.*runserver" > /dev/null; then
    echo "✅ Django est en cours d'exécution"
    DJANGO_PID=$(pgrep -f "python.*manage.py.*runserver")
    echo "PID Django: $DJANGO_PID"
else
    echo "❌ Django n'est pas en cours d'exécution"
    echo "💡 Lancez: source venv/bin/activate && python manage.py runserver 0.0.0.0:8000 &"
fi

# Test API
echo ""
echo "Test API Django:"
curl -s -I "https://$DOMAIN/api/" | head -3

echo ""

# 5. Instructions de résolution
echo "🔧 INSTRUCTIONS DE RÉSOLUTION:"
echo "=============================="

if [ ! -f "$FRONTEND_PATH/manifest.json" ]; then
    echo "1. 🏗️ Reconstruire le frontend:"
    echo "   cd frontend && npm run build"
fi

if ! nginx -T 2>/dev/null | grep -q "procura.mirhosty.com"; then
    echo "2. 🌐 Appliquer la configuration Nginx:"
    echo "   - Aller dans CloudPanel > Domaines > procura.mirhosty.com > Nginx"
    echo "   - Remplacer la config par le contenu de nginx_frontend.conf"
    echo "   - Redémarrer le domaine et Nginx"
fi

if ! pgrep -f "python.*manage.py.*runserver" > /dev/null; then
    echo "3. 🐍 Démarrer Django:"
    echo "   source venv/bin/activate"
    echo "   python manage.py runserver 0.0.0.0:8000 &"
fi

echo "4. 🌐 Vider le cache du navigateur:"
echo "   Ctrl+Shift+R (hard reload)"

echo ""
echo "📞 COMMANDE DE TEST FINAL:"
echo "curl -I https://procura.mirhosty.com/assets/ | grep Content-Type"
