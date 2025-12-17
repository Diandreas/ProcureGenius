#!/bin/bash

# Script de déploiement du frontend React sur VPS
# Utilisation: ./deploy_frontend.sh

set -e

echo "🚀 Déploiement du frontend React/Vite"

# Vérifier que Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    echo "Installez Node.js depuis https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js trouvé: $(node --version)"
echo "✅ NPM trouvé: $(npm --version)"

# Aller dans le dossier frontend
cd frontend

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install

# Build de production
echo "🏗️ Build de production..."
npm run build

# Vérifier que le build a réussi
if [ ! -d "build" ]; then
    echo "❌ Le dossier build n'existe pas"
    exit 1
fi

# Vérifier les fichiers importants
echo "🔍 Vérification des fichiers générés..."
if [ ! -f "build/index.html" ]; then
    echo "❌ index.html manquant"
    exit 1
fi

if [ ! -f "build/manifest.json" ]; then
    echo "❌ manifest.json manquant"
    exit 1
fi

# Lister les fichiers générés
echo "📁 Fichiers générés:"
ls -la build/

echo "✅ Build terminé avec succès!"

# Instructions pour la configuration Nginx
echo ""
echo "🌐 Configuration Nginx requise:"
echo "=================================="
echo "1. Copiez nginx_frontend.conf dans /etc/nginx/sites-available/"
echo "2. Activez le site: ln -s /etc/nginx/sites-available/nginx_frontend.conf /etc/nginx/sites-enabled/"
echo "3. Testez: nginx -t"
echo "4. Redémarrez: systemctl restart nginx"
echo ""
echo "📍 Les fichiers sont dans: $(pwd)/build/"
echo "🔗 URL d'accès: http://votre-domaine.com"
