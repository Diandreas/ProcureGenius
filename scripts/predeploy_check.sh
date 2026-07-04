#!/bin/bash
# ============================================================
# GARDE ANTI-RÉGRESSION — à exécuter AVANT tout déploiement
# ============================================================
# Lance les tests backend + le build front. Sort en erreur (code != 0) si un
# test échoue ou si le front ne compile pas — pour ne jamais pousser du code
# cassé en production.
#
# Usage (depuis la racine du repo) :
#   bash scripts/predeploy_check.sh
#
# La CI GitHub Actions (.github/workflows/ci.yml) fait la même chose côté
# serveur à chaque push ; ce script permet de vérifier AVANT de pousser.
# ============================================================
set -e
cd "$(dirname "$0")/.."

# Interpréteur Python : py (Windows) sinon python3/python.
if command -v py > /dev/null 2>&1; then
    PY="py"
elif command -v python3 > /dev/null 2>&1; then
    PY="python3"
else
    PY="python"
fi

echo "=========================================="
echo "  1/2 — Tests backend"
echo "=========================================="
# Cache LocMem (pas de dépendance Redis en local) ; on exclut les tests
# d'intégration (LLM réel) et le module pixtral (SDK incompatible en local).
DISABLE_REDIS_CACHE=true "$PY" -m pytest -q -m "not integration" \
    --ignore=apps/ai_assistant/tests/test_pixtral.py

echo ""
echo "=========================================="
echo "  2/2 — Build frontend"
echo "=========================================="
( cd frontend && npm run build )

echo ""
echo "=========================================="
echo "  OK — les tests passent et le front compile. Prêt à déployer."
echo "=========================================="
