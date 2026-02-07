#!/bin/bash
#
# Script de mise à jour des données du Centre Julianna
# Usage: bash update_julianna.sh
#

echo "🏥 Mise à jour des données du Centre Julianna"
echo "============================================="
echo ""

# Vérifier si on est dans le bon répertoire
if [ ! -f "manage.py" ]; then
    echo "❌ Erreur: manage.py non trouvé"
    echo "   Veuillez exécuter ce script depuis le répertoire racine du projet"
    exit 1
fi

# Vérifier si l'environnement virtuel est activé
if [ -z "$VIRTUAL_ENV" ]; then
    echo "⚠️  Environnement virtuel non activé"
    echo "   Tentative d'activation..."

    if [ -d "venv" ]; then
        source venv/bin/activate
        echo "✅ Environnement virtuel activé"
    elif [ -d "env" ]; then
        source env/bin/activate
        echo "✅ Environnement virtuel activé"
    else
        echo "❌ Environnement virtuel non trouvé (venv/ ou env/)"
        echo "   Continuons quand même..."
    fi
fi

echo ""
echo "📝 Exécution de la mise à jour..."
echo ""

# Exécuter le management command
python manage.py update_julianna_data

# Vérifier le code de sortie
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Mise à jour terminée avec succès!"
    echo ""
    echo "📋 Les informations suivantes ont été mises à jour:"
    echo "   - Téléphones: 655244149 / 679145198"
    echo "   - Adresse: Entrée Marie Lumière à côté du Consulat Honoraire d'Indonésie"
    echo "             Makepe Saint-Tropez - Douala"
else
    echo ""
    echo "❌ Erreur lors de la mise à jour"
    echo "   Veuillez vérifier les logs ci-dessus"
    exit 1
fi
