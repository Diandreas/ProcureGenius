#!/bin/bash

# Script de diagnostic du frontend React/Vite
# Utilisation: ./check_frontend.sh

echo "🔍 Diagnostic du frontend React/Vite"
echo "====================================="

# Vérifier si Node.js est installé
echo "📦 Node.js:"
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
    echo "✅ NPM: $(npm --version)"
else
    echo "❌ Node.js n'est pas installé"
fi

# Vérifier le dossier frontend
echo ""
echo "📁 Structure frontend:"
if [ -d "frontend" ]; then
    echo "✅ Dossier frontend trouvé"
    cd frontend

    # Vérifier package.json
    if [ -f "package.json" ]; then
        echo "✅ package.json présent"
    else
        echo "❌ package.json manquant"
    fi

    # Vérifier le build
    if [ -d "build" ]; then
        echo "✅ Dossier build trouvé"
        echo "📊 Contenu du build:"
        ls -la build/

        # Vérifier les fichiers critiques
        if [ -f "build/index.html" ]; then
            echo "✅ index.html présent"
        else
            echo "❌ index.html manquant"
        fi

        if [ -f "build/manifest.json" ]; then
            echo "✅ manifest.json présent"
        else
            echo "❌ manifest.json manquant"
        fi

        # Vérifier les assets JS
        JS_FILES=$(find build -name "*.js" | wc -l)
        echo "📄 Fichiers JS: $JS_FILES"

    else
        echo "❌ Dossier build manquant"
        echo "💡 Lancez: npm run build"
    fi

    cd ..
else
    echo "❌ Dossier frontend manquant"
fi

# Vérifier la configuration Vite
echo ""
echo "⚙️ Configuration Vite:"
if [ -f "frontend/vite.config.js" ]; then
    echo "✅ vite.config.js présent"
    echo "📝 Configuration build:"
    grep -A 10 "build:" frontend/vite.config.js
else
    echo "❌ vite.config.js manquant"
fi

# Vérifier Nginx
echo ""
echo "🌐 Configuration Nginx:"
if command -v nginx &> /dev/null; then
    echo "✅ Nginx installé"

    # Vérifier la configuration
    if nginx -t 2>/dev/null; then
        echo "✅ Configuration Nginx valide"
    else
        echo "❌ Configuration Nginx invalide"
    fi

    # Vérifier si le site est actif
    if [ -L "/etc/nginx/sites-enabled/nginx_frontend.conf" ]; then
        echo "✅ Configuration frontend activée"
    else
        echo "❌ Configuration frontend non activée"
        echo "💡 Activez avec: ln -s /etc/nginx/sites-available/nginx_frontend.conf /etc/nginx/sites-enabled/"
    fi

else
    echo "❌ Nginx n'est pas installé"
fi

# Vérifier l'accès HTTP
echo ""
echo "🌍 Test d'accès HTTP:"
DOMAIN="procura.srv696182.hstgr.cloud"

if command -v curl &> /dev/null; then
    # Test HTTP
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN 2>/dev/null || echo "000")
    if [ "$HTTP_STATUS" = "200" ]; then
        echo "✅ Site accessible (HTTP 200)"
    elif [ "$HTTP_STATUS" = "000" ]; then
        echo "❌ Site non accessible (connexion impossible)"
    else
        echo "⚠️ Site répond avec HTTP $HTTP_STATUS"
    fi

    # Test HTTPS si disponible
    HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN 2>/dev/null || echo "000")
    if [ "$HTTPS_STATUS" = "200" ]; then
        echo "✅ Site accessible en HTTPS (HTTP 200)"
    elif [ "$HTTPS_STATUS" != "000" ]; then
        echo "⚠️ HTTPS répond avec HTTP $HTTPS_STATUS"
    fi
else
    echo "❌ curl non disponible pour les tests"
fi

# Recommandations
echo ""
echo "💡 RECOMMANDATIONS:"
echo "=================="

if [ ! -d "frontend/build" ]; then
    echo "1. 🔨 Construisez le frontend:"
    echo "   cd frontend && npm install && npm run build"
fi

if [ ! -L "/etc/nginx/sites-enabled/nginx_frontend.conf" ]; then
    echo "2. 🌐 Configurez Nginx:"
    echo "   sudo cp nginx_frontend.conf /etc/nginx/sites-available/"
    echo "   sudo ln -s /etc/nginx/sites-available/nginx_frontend.conf /etc/nginx/sites-enabled/"
    echo "   sudo nginx -t && sudo systemctl restart nginx"
fi

if [ "$HTTP_STATUS" != "200" ] && [ "$HTTPS_STATUS" != "200" ]; then
    echo "3. 🔍 Vérifiez les logs:"
    echo "   sudo tail -f /var/log/nginx/error.log"
    echo "   sudo tail -f /var/log/nginx/access.log"
fi

echo ""
echo "✅ Diagnostic terminé"
