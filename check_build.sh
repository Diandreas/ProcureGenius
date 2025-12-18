#!/bin/bash

# Script de vérification du build frontend
# Utilisation: ./check_build.sh

echo "🔍 Vérification du build frontend..."
echo "==================================="

# Vérifier si on est dans le bon répertoire
if [ ! -d "frontend" ]; then
    echo "❌ Dossier frontend non trouvé"
    exit 1
fi

cd frontend

# Vérifier Node.js et npm
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

echo "✅ Node.js: $(node --version)"
echo "✅ NPM: $(npm --version)"

# Vérifier package.json
if [ ! -f "package.json" ]; then
    echo "❌ package.json manquant"
    exit 1
fi

echo "✅ package.json présent"

# Installer les dépendances
echo ""
echo "📦 Installation des dépendances..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Échec de l'installation des dépendances"
    exit 1
fi

echo "✅ Dépendances installées"

# Vérifier la configuration Vite
echo ""
echo "⚙️ Vérification de la configuration Vite..."
if grep -q "format: 'es'" vite.config.js; then
    echo "✅ Configuration ES modules OK"
else
    echo "❌ Configuration ES modules manquante"
fi

if grep -q "target: 'esnext'" vite.config.js; then
    echo "✅ Target ESNext OK"
else
    echo "❌ Target ESNext manquant"
fi

# Nettoyer l'ancien build
echo ""
echo "🧹 Nettoyage de l'ancien build..."
rm -rf build
rm -rf dist

# Lancer le build
echo ""
echo "🏗️ Lancement du build..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Échec du build"
    exit 1
fi

echo "✅ Build réussi"

# Vérifier les fichiers générés
echo ""
echo "📁 Vérification des fichiers générés..."

if [ ! -d "build" ]; then
    echo "❌ Dossier build non créé"
    exit 1
fi

echo "✅ Dossier build créé"

# Vérifier index.html
if [ -f "build/index.html" ]; then
    echo "✅ index.html présent"
    if grep -q "type=\"module\"" build/index.html; then
        echo "✅ Modules ES détectés dans index.html"
    else
        echo "⚠️ Pas de modules ES détectés dans index.html"
    fi
else
    echo "❌ index.html manquant"
fi

# Vérifier manifest.json
if [ -f "build/manifest.json" ]; then
    echo "✅ manifest.json présent"
else
    echo "❌ manifest.json manquant"
fi

# Vérifier les fichiers JS
JS_FILES=$(find build -name "*.js" | wc -l)
if [ "$JS_FILES" -gt 0 ]; then
    echo "✅ $JS_FILES fichiers JavaScript générés"

    # Vérifier le premier fichier JS
    FIRST_JS=$(find build -name "*.js" | head -1)
    if [ -n "$FIRST_JS" ]; then
        echo "📄 Analyse du premier fichier JS: $(basename "$FIRST_JS")"
        if head -5 "$FIRST_JS" | grep -q "import\|export"; then
            echo "✅ Contient des imports/exports ES6"
        else
            echo "⚠️ Pas d'imports/exports ES6 détectés"
        fi
    fi
else
    echo "❌ Aucun fichier JavaScript généré"
fi

# Vérifier la structure
echo ""
echo "📊 Structure du build:"
ls -la build/

echo ""
echo "🎯 Instructions pour le déploiement:"
echo "===================================="
echo ""
echo "1. Les fichiers sont dans: $(pwd)/build/"
echo "2. Copiez tout le contenu du dossier build/"
echo "3. Assurez-vous que votre serveur web sert:"
echo "   - Les .js avec Content-Type: application/javascript"
echo "   - Les .json avec Content-Type: application/json"
echo "   - Activez CORS si nécessaire"
echo ""
echo "4. Testez avec: curl -I http://votre-domaine/"
echo ""
echo "✅ Vérification terminée!"
