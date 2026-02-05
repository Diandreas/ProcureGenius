#!/bin/bash
# ============================================================
# CORRECTION RAPIDE DES MIGRATIONS - CENTRE DE SANTÉ JULIANNA
# ============================================================

echo "============================================================"
echo "  CORRECTION DES MIGRATIONS - CENTRE DE SANTÉ JULIANNA"
echo "============================================================"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "manage.py" ]; then
    echo -e "${RED}❌ Erreur: manage.py non trouvé!${NC}"
    echo "   Exécutez ce script depuis le dossier racine du projet."
    exit 1
fi

echo "[1/4] Vérification de l'environnement..."

# Activer le venv si présent
if [ -d "venv" ]; then
    echo "  ✓ Activation du venv..."
    source venv/bin/activate
fi

echo ""
echo "[2/4] Ajout de la migration manquante..."

# Exécuter le script Python de correction
python3 << 'EOF'
import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from django.db.migrations.recorder import MigrationRecorder

try:
    # Ajouter la migration manquante
    migration, created = MigrationRecorder.Migration.objects.get_or_create(
        app='invoicing',
        name='0020_warehouse_is_default_and_more'
    )

    if created:
        print("  ✅ Migration invoicing.0020 ajoutée avec succès!")
    else:
        print("  ℹ️  Migration invoicing.0020 déjà présente")

    sys.exit(0)
except Exception as e:
    print(f"  ❌ Erreur: {e}")
    sys.exit(1)
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Échec de l'ajout de la migration${NC}"
    exit 1
fi

echo ""
echo "[3/4] Application des migrations..."

# Appliquer les migrations
python manage.py migrate

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Échec de l'application des migrations${NC}"
    exit 1
fi

echo ""
echo "[4/4] Vérification finale..."

# Vérifier l'état des migrations
python manage.py showmigrations invoicing | grep "0020"
python manage.py showmigrations patients | head -3

echo ""
echo "============================================================"
echo -e "${GREEN}  ✅ CORRECTION TERMINÉE AVEC SUCCÈS!${NC}"
echo "============================================================"
echo ""
echo "Prochaines étapes:"
echo "  1. Charger les données: python manage.py create_julianna_production_data"
echo "  2. Démarrer le serveur: gunicorn ou ./start_dev.sh"
echo ""
