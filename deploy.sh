#!/bin/bash

# Script de déploiement ProcureGenius
# Ce script configure et démarre l'application complète

echo "🚀 Déploiement de ProcureGenius..."
echo "=================================="

# Vérifier les prérequis
echo "📋 Vérification des prérequis..."

# Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 n'est pas installé"
    exit 1
fi
echo "✅ Python 3 trouvé"

# Docker (optionnel)
if command -v docker &> /dev/null; then
    echo "✅ Docker trouvé"
    DOCKER_AVAILABLE=true
else
    echo "⚠️  Docker non trouvé (déploiement manuel)"
    DOCKER_AVAILABLE=false
fi

# PostgreSQL
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL trouvé"
else
    echo "⚠️  PostgreSQL non trouvé"
fi

# Redis
if command -v redis-cli &> /dev/null; then
    echo "✅ Redis trouvé"
else
    echo "⚠️  Redis non trouvé"
fi

echo ""

# Choix du mode de déploiement
if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "🐳 Déploiement avec Docker recommandé"
    read -p "Utiliser Docker ? (o/n): " use_docker
else
    use_docker="n"
fi

if [ "$use_docker" = "o" ] || [ "$use_docker" = "O" ]; then
    # Déploiement Docker
    echo "🐳 Déploiement avec Docker..."
    
    # Créer le fichier .env s'il n'existe pas
    if [ ! -f .env ]; then
        echo "📝 Création du fichier .env..."
        cp .env.example .env
        echo "⚠️  IMPORTANT: Configurez vos clés API dans le fichier .env"
        echo "   - MISTRAL_API_KEY"
        echo "   - PAYPAL_CLIENT_ID"
        echo "   - PAYPAL_CLIENT_SECRET"
        echo ""
        read -p "Appuyez sur Entrée après avoir configuré .env..."
    fi
    
    # Construire et démarrer les conteneurs
    echo "🔨 Construction des images Docker..."
    docker-compose build
    
    echo "🚀 Démarrage des services..."
    docker-compose up -d
    
    # Attendre que PostgreSQL soit prêt
    echo "⏳ Attente de PostgreSQL..."
    sleep 10
    
    # Migrations
    echo "📊 Application des migrations..."
    docker-compose exec web python manage.py migrate
    
    # Superutilisateur : NE JAMAIS créer de compte avec un mot de passe en dur.
    # Créez-le manuellement, avec un mot de passe fort, après le déploiement :
    echo "👤 Superutilisateur : créez-le manuellement après le déploiement :"
    echo "   docker-compose exec web python manage.py createsuperuser"

    # Charger les données de test
    echo "📦 Chargement des données de test..."
    docker-compose exec web python manage.py loaddata fixtures/initial_data.json 2>/dev/null || echo "Pas de fixtures trouvées"
    
    echo ""
    echo "✅ Déploiement Docker terminé !"
    echo "🌐 Application disponible sur: http://localhost:8000"
    echo "🔧 Admin disponible sur: http://localhost:8000/admin"
    
else
    # Déploiement manuel
    echo "⚙️  Déploiement manuel..."
    
    # Créer environnement virtuel
    if [ ! -d "venv" ]; then
        echo "📦 Création de l'environnement virtuel..."
        python3 -m venv venv
    fi
    
    # Activer l'environnement virtuel
    echo "🔄 Activation de l'environnement virtuel..."
    source venv/bin/activate
    
    # Installer les dépendances
    echo "📚 Installation des dépendances..."
    pip install -r requirements.txt
    
    # Créer le fichier .env
    if [ ! -f .env ]; then
        echo "📝 Création du fichier .env..."
        cp .env.example .env
        echo "⚠️  IMPORTANT: Configurez vos clés API dans le fichier .env"
    fi
    
    # Migrations
    echo "📊 Application des migrations..."
    python manage.py migrate
    
    # Collecte des fichiers statiques
    echo "📁 Collecte des fichiers statiques..."
    python manage.py collectstatic --noinput
    
    # Compilation des traductions
    echo "🌍 Compilation des traductions..."
    python manage.py compilemessages
    
    # Superutilisateur : NE JAMAIS créer de compte avec un mot de passe en dur.
    echo "👤 Superutilisateur : créez-le manuellement après le déploiement :"
    echo "   python manage.py createsuperuser"

    echo ""
    echo "✅ Déploiement manuel terminé !"
    echo "🚀 Pour démarrer l'application:"
    echo "   python manage.py runserver"
    echo ""
    echo "🌐 Application sera disponible sur: http://localhost:8000"
    echo "🔧 Admin sera disponible sur: http://localhost:8000/admin"
fi

echo ""
echo "📋 PROCHAINES ÉTAPES:"
echo "1. Configurez vos clés API dans .env"
echo "2. Testez les fonctionnalités principales"
echo "3. Configurez PayPal en mode sandbox"
echo "4. Testez l'IA avec votre clé Mistral"
echo "5. Personnalisez selon vos besoins"
echo ""
echo "📖 Documentation complète disponible dans README.md"