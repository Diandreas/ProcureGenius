#!/bin/bash
#
# Script d'initialisation de la base de données de production
# Centre de Santé JULIANNA
#

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  INITIALISATION BASE DE DONNÉES - CENTRE DE SANTÉ JULIANNA    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Vérifications préliminaires
if [ ! -f "manage.py" ]; then
    echo "❌ Erreur: manage.py non trouvé"
    echo "   Veuillez exécuter ce script depuis le répertoire racine du projet"
    exit 1
fi

# Activer l'environnement virtuel si nécessaire
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
        echo "❌ Environnement virtuel non trouvé"
        echo "   Veuillez créer un environnement virtuel : python -m venv venv"
        exit 1
    fi
fi

echo ""
echo "📋 Configuration:"
echo "   - Organisation: Centre de Santé JULIANNA"
echo "   - Téléphones: 655244149 / 679145198"
echo "   - Adresse: Entrée Marie Lumière, Makepe Saint-Tropez - Douala"
echo ""

# Demander confirmation
read -p "⚠️  Cette opération va RÉINITIALISER la base de données. Continuer? (oui/non): " confirm

if [ "$confirm" != "oui" ]; then
    echo "❌ Opération annulée"
    exit 0
fi

echo ""
echo "🔄 Lancement de l'initialisation..."
echo ""

# Exécuter la commande
python manage.py create_julianna_production_data --reset

# Vérifier le résultat
if [ $? -eq 0 ]; then
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║              ✅ INITIALISATION RÉUSSIE !                      ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "📝 Identifiants créés:"
    echo "   Admin:      julianna_admin / julianna2025"
    echo "   Réception:  julianna_reception / julianna2025"
    echo "   Docteur:    julianna_doctor / julianna2025"
    echo "   Labo:       julianna_lab / julianna2025"
    echo "   Pharmacien: julianna_pharmacist / julianna2025"
    echo ""
    echo "⚠️  N'oubliez pas de changer ces mots de passe !"
    echo ""
else
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║              ❌ ERREUR LORS DE L'INITIALISATION               ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Veuillez vérifier les logs ci-dessus pour plus de détails."
    exit 1
fi
