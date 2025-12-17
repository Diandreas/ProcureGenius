#!/bin/bash

# Script de vérification du statut de ProcureGenius
# Utilisation: ./check_app_status.sh

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

echo_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

echo_error() {
    echo -e "${RED}[✗]${NC} $1"
}

echo_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

echo ""
echo "🔍 VÉRIFICATION DU STATUT DE PROCUREGENIUS"
echo "=========================================="

# 1. Vérifier si le répertoire du projet existe
if [ ! -d "venv" ]; then
    echo_error "Environnement virtuel non trouvé"
    echo_info "Lancez d'abord: ./deploy_linux_shared.sh"
    exit 1
fi

# 2. Vérifier si l'environnement virtuel fonctionne
echo_info "Vérification de l'environnement virtuel..."
if source venv/bin/activate && python --version > /dev/null 2>&1; then
    echo_success "Environnement virtuel OK"
    PYTHON_VERSION=$(python --version 2>&1)
    echo_info "Python: $PYTHON_VERSION"
else
    echo_error "Environnement virtuel défaillant"
    exit 1
fi

# 3. Vérifier les dépendances Python
echo_info "Vérification des dépendances Python..."
if python -c "import django; print('Django OK')" > /dev/null 2>&1; then
    DJANGO_VERSION=$(python -c "import django; print(django.VERSION)")
    echo_success "Django installé: $DJANGO_VERSION"
else
    echo_error "Django non installé"
    exit 1
fi

# 4. Vérifier la configuration Django
echo_info "Vérification de la configuration Django..."
if [ -f ".env" ]; then
    echo_success "Fichier .env présent"
else
    echo_warning "Fichier .env manquant"
fi

# 5. Vérifier la base de données
echo_info "Vérification de la base de données..."
if [ -f "db.sqlite3" ]; then
    DB_SIZE=$(du -h db.sqlite3 | cut -f1)
    echo_success "Base de données SQLite présente ($DB_SIZE)"
else
    echo_error "Base de données non trouvée"
fi

# 6. Vérifier les fichiers statiques
echo_info "Vérification des fichiers statiques..."
if [ -d "staticfiles" ]; then
    STATIC_COUNT=$(find staticfiles -type f | wc -l)
    echo_success "$STATIC_COUNT fichiers statiques collectés"
else
    echo_warning "Fichiers statiques non collectés"
fi

# 7. Tester Django
echo_info "Test de Django..."
if python manage.py check > /dev/null 2>&1; then
    echo_success "Configuration Django valide"
else
    echo_error "Problèmes de configuration Django"
    python manage.py check
fi

# 8. Vérifier les migrations
echo_info "Vérification des migrations..."
MIGRATION_STATUS=$(python manage.py showmigrations --list 2>/dev/null | grep "\[ \]" | wc -l)
if [ "$MIGRATION_STATUS" -eq 0 ]; then
    echo_success "Toutes les migrations sont appliquées"
else
    echo_warning "$MIGRATION_STATUS migration(s) non appliquée(s)"
fi

# 9. Vérifier si l'application tourne
echo_info "Vérification si l'application tourne..."
if pgrep -f "python.*manage.py.*runserver" > /dev/null; then
    SERVER_PID=$(pgrep -f "python.*manage.py.*runserver")
    echo_success "Serveur Django en cours d'exécution (PID: $SERVER_PID)"
else
    echo_warning "Serveur Django non détecté"
fi

# 10. Test d'accès HTTP
echo_info "Test d'accès HTTP..."
if command -v curl > /dev/null; then
    # Test localhost
    if curl -s --max-time 5 http://localhost:8000 > /dev/null 2>&1; then
        echo_success "Application accessible sur http://localhost:8000"
    else
        echo_warning "Application non accessible sur localhost:8000"
    fi

    # Test domaine (si applicable)
    if curl -s --max-time 5 http://procura.srv696182.hstgr.cloud > /dev/null 2>&1; then
        echo_success "Application accessible sur le domaine"
    else
        echo_info "Domaine non accessible (normal si pas configuré)"
    fi
else
    echo_info "curl non disponible pour les tests HTTP"
fi

# 11. Informations système
echo ""
echo "📊 INFORMATIONS SYSTÈME"
echo "======================="
echo "Utilisateur: $(whoami)"
echo "Répertoire: $(pwd)"
echo "Espace disque: $(df -h . | tail -1 | awk '{print $4}') disponible"
echo "Mémoire: $(free -h | grep "^Mem:" | awk '{print $4}') disponible"

# 12. Instructions
echo ""
echo "🚀 COMMANDES UTILES"
echo "==================="
echo ""
echo "# Démarrer l'application:"
echo "source venv/bin/activate"
echo "python manage.py runserver 0.0.0.0:8000"
echo ""
echo "# Ou utiliser le script:"
echo "./start_server.sh"
echo ""
echo "# Créer un superutilisateur:"
echo "python manage.py createsuperuser"
echo ""
echo "# Collecter les statiques:"
echo "python manage.py collectstatic --noinput"
echo ""
echo "# Appliquer les migrations:"
echo "python manage.py migrate"
echo ""
echo "# Vérifier les logs:"
echo "tail -f logs/django.log 2>/dev/null || echo 'Pas de fichier de logs'"

echo ""
echo "✅ VÉRIFICATION TERMINÉE"

