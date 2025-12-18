#!/bin/bash

# Script de déploiement pour CloudPanel
# Utilisation: ./deploy_cloudpanel.sh

set -e

echo "🚀 Déploiement ProcureGenius sur CloudPanel"

# Vérifier que nous sommes sur le bon domaine
if [[ ! -d "/home/mirhosty-procura/htdocs/procura.mirhosty.com" ]]; then
    echo "❌ Mauvais répertoire. Assurez-vous d'être dans /home/mirhosty-procura/htdocs/procura.mirhosty.com"
    exit 1
fi

cd /home/mirhosty-procura/htdocs/procura.mirhosty.com

# 1. Installer les dépendances Python
echo "📦 Installation des dépendances Python..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 2. Configuration Django
echo "⚙️ Configuration Django..."
if [ ! -f ".env" ]; then
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
    cat > .env << EOF
SECRET_KEY=$SECRET_KEY
DEBUG=False
DB_ENGINE=django.db.backends.sqlite3
DB_NAME=db.sqlite3
ALLOWED_HOSTS=procura.mirhosty.com,localhost,127.0.0.1
EOF
fi

# 3. Migrations et setup Django
echo "🗄️ Configuration de la base de données..."
python manage.py migrate
python manage.py collectstatic --noinput --clear

# Créer superutilisateur
echo "👤 Création du superutilisateur..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@procura.mirhosty.com', 'admin123')
    print('Superutilisateur créé')
else:
    print('Superutilisateur existe déjà')
"

# 4. Build du frontend
echo "🏗️ Build du frontend..."
cd frontend
npm install
npm run build
cd ..

# 5. Vérifications
echo "🔍 Vérifications finales..."

# Vérifier que les fichiers existent
if [ -f "frontend/build/index.html" ]; then
    echo "✅ Frontend build réussi"
else
    echo "❌ Frontend build échoué"
    exit 1
fi

if [ -f "db.sqlite3" ]; then
    echo "✅ Base de données créée"
else
    echo "❌ Base de données manquante"
fi

# 6. Instructions finales
echo ""
echo "🎉 DÉPLOIEMENT TERMINÉ !"
echo ""
echo "📋 PROCHAINES ÉTAPES DANS CLOUDPANEL:"
echo ""
echo "1. 🌐 Allez dans votre domaine procura.mirhosty.com"
echo "2. 📝 Onglet 'Nginx' > 'Custom Nginx Config'"
echo "3. 📄 Copiez le contenu de nginx_frontend.conf"
echo "4. 💾 Sauvegarder et redémarrer"
echo ""
echo "📋 CONFIGURATION SUPPLÉMENTAIRE:"
echo ""
echo "5. 🗂️ Créer un cron job pour Django:"
echo "   python manage.py runserver 0.0.0.0:8000 &"
echo ""
echo "6. 🔐 Modifier le mot de passe admin dans l'interface"
echo ""
echo "🌐 URLS D'ACCÈS:"
echo "   Frontend: https://procura.mirhosty.com"
echo "   API: https://procura.mirhosty.com/api/"
echo "   Admin: https://procura.mirhosty.com/admin/"
echo ""
echo "🔑 Identifiants par défaut:"
echo "   Utilisateur: admin"
echo "   Mot de passe: admin123"
echo ""
echo "✅ Configuration terminée !"
