#!/bin/bash
# ============================================================
# SCRIPT DE DÉMARRAGE RAPIDE - CENTRE DE SANTÉ JULIANNA
# ============================================================

echo ""
echo "========================================"
echo "  CENTRE DE SANTÉ JULIANNA"
echo "  Démarrage du serveur de développement"
echo "========================================"
echo ""

# Obtenir le répertoire du script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Vérifier que le venv existe
if [ ! -d "venv" ]; then
    echo "ERREUR: Environnement virtuel non trouvé!"
    echo "Veuillez d'abord créer le venv:"
    echo "  python3 -m venv venv"
    echo "  source venv/bin/activate"
    echo "  pip install -r requirements.txt"
    echo ""
    exit 1
fi

# Activer le venv
echo "[1/3] Activation de l'environnement virtuel..."
source venv/bin/activate

# Vérifier les migrations
echo "[2/3] Vérification des migrations..."
if ! python manage.py migrate --check &> /dev/null; then
    echo ""
    echo "AVERTISSEMENT: Des migrations sont en attente!"
    echo "Exécution des migrations..."
    python manage.py migrate
fi

# Démarrer le serveur
echo "[3/3] Démarrage du serveur Django..."
echo ""
echo "========================================"
echo "  Serveur démarré sur:"
echo "  http://localhost:8000"
echo "  http://127.0.0.1:8000"
echo ""
echo "  Admin: http://localhost:8000/admin"
echo ""
echo "  Comptes disponibles:"
echo "  - admin@csj.cm / julianna2025"
echo "  - reception@csj.cm / julianna2025"
echo "  - docteur@csj.cm / julianna2025"
echo "  - labo@csj.cm / julianna2025"
echo "  - pharma@csj.cm / julianna2025"
echo ""
echo "  Appuyez sur Ctrl+C pour arrêter"
echo "========================================"
echo ""

python manage.py runserver 0.0.0.0:8000

# Si le serveur s'arrête
echo ""
echo "Serveur arrêté."
