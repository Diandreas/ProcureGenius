#!/bin/bash
# ============================================================
# SCRIPT DE DÉMARRAGE PRODUCTION - CENTRE DE SANTÉ JULIANNA
# Lance Frontend (port 3000) et Backend (port 8090)
# ============================================================

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour nettoyer les processus lors de l'arrêt
cleanup() {
    echo -e "\n${YELLOW}Arrêt des serveurs...${NC}"
    # Tuer tous les processus enfants
    pkill -P $$
    echo -e "${GREEN}Serveurs arrêtés.${NC}"
    exit 0
}

# Configurer le signal trap pour nettoyer lors de Ctrl+C
trap cleanup SIGINT SIGTERM

# Obtenir le répertoire du script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo ""
echo "========================================"
echo "  CENTRE DE SANTÉ JULIANNA - PRODUCTION"
echo "========================================"
echo ""

# Vérifier que le venv existe
if [ ! -d "venv" ]; then
    echo -e "${RED}ERREUR: Environnement virtuel non trouvé!${NC}"
    echo "Veuillez d'abord créer le venv:"
    echo "  python3 -m venv venv"
    echo "  source venv/bin/activate"
    echo "  pip install -r requirements.txt"
    exit 1
fi

# Vérifier que node_modules existe dans frontend
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${RED}ERREUR: Dépendances frontend non installées!${NC}"
    echo "Installation des dépendances frontend..."
    cd frontend
    npm install
    cd ..
fi

# Activer le venv
echo -e "${BLUE}[1/4] Activation de l'environnement virtuel...${NC}"
source venv/bin/activate

# Vérifier et appliquer les migrations
echo -e "${BLUE}[2/4] Vérification des migrations...${NC}"
if ! python manage.py migrate --check &> /dev/null; then
    echo -e "${YELLOW}Des migrations sont en attente. Application...${NC}"
    python manage.py migrate
fi

# Créer les dossiers de logs si nécessaire
mkdir -p logs

# Démarrer le backend Django sur le port 8090
echo -e "${BLUE}[3/4] Démarrage du backend Django (port 8090)...${NC}"
python manage.py runserver 0.0.0.0:8090 > logs/backend.log 2>&1 &
BACKEND_PID=$!

# Attendre que le backend démarre
sleep 3

# Vérifier que le backend a démarré
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}ERREUR: Le backend n'a pas pu démarrer!${NC}"
    echo "Consultez logs/backend.log pour plus de détails"
    cat logs/backend.log
    exit 1
fi

# Démarrer le frontend React sur le port 3000
echo -e "${BLUE}[4/4] Démarrage du frontend React (port 3000)...${NC}"
cd frontend
npm run start > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Attendre que le frontend démarre
sleep 3

# Vérifier que le frontend a démarré
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}ERREUR: Le frontend n'a pas pu démarrer!${NC}"
    echo "Consultez logs/frontend.log pour plus de détails"
    cat logs/frontend.log
    kill $BACKEND_PID
    exit 1
fi

echo ""
echo "========================================"
echo -e "${GREEN}  SERVEURS DÉMARRÉS AVEC SUCCÈS!${NC}"
echo "========================================"
echo ""
echo -e "${GREEN}Frontend:${NC} http://localhost:3000"
echo -e "${GREEN}Backend:${NC}  http://localhost:8090"
echo -e "${GREEN}Admin:${NC}    http://localhost:8090/admin"
echo ""
echo -e "${YELLOW}Logs disponibles dans:${NC}"
echo "  - logs/frontend.log"
echo "  - logs/backend.log"
echo ""
echo -e "${YELLOW}Comptes disponibles:${NC}"
echo "  - admin@csj.cm / julianna2025"
echo "  - reception@csj.cm / julianna2025"
echo "  - docteur@csj.cm / julianna2025"
echo "  - labo@csj.cm / julianna2025"
echo "  - pharma@csj.cm / julianna2025"
echo ""
echo -e "${RED}Appuyez sur Ctrl+C pour arrêter les serveurs${NC}"
echo "========================================"
echo ""

# Afficher les logs en temps réel
tail -f logs/backend.log logs/frontend.log &

# Attendre que les processus se terminent
wait $BACKEND_PID $FRONTEND_PID
