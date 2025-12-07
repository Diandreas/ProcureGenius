#!/bin/bash

echo "=========================================="
echo "SETUP PROFILE SYSTEM - QUICK START"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Étape 1: Application des migrations Django${NC}"
python manage.py migrate
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migrations appliquées${NC}"
else
    echo -e "${YELLOW}⚠ Erreur lors des migrations${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Étape 2: Migration des données et création des profils de test${NC}"
python setup_profile_data.py
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Données migrées et profils créés${NC}"
else
    echo -e "${YELLOW}⚠ Erreur lors de la migration des données${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ INSTALLATION TERMINÉE${NC}"
echo "=========================================="
echo ""
echo "📋 Comptes de test créés:"
echo "----------------------------------------"
echo "FREE:         demo.free@procuregenius.com"
echo "BILLING:      demo.billing@procuregenius.com"
echo "PROCUREMENT:  demo.procurement@procuregenius.com"
echo "PROFESSIONAL: demo.professional@procuregenius.com"
echo "STRATEGIC:    demo.strategic@procuregenius.com"
echo "ENTERPRISE:   demo.enterprise@procuregenius.com"
echo ""
echo "🔑 Mot de passe pour tous: Demo123!"
echo "----------------------------------------"
echo ""
echo "🚀 Pour démarrer le serveur:"
echo "   python manage.py runserver"
echo ""
echo "📖 Documentation complète:"
echo "   Consultez PROFILE_SYSTEM_GUIDE.md"
echo ""





