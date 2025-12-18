#!/bin/bash
# Script pour mettre à jour WeasyPrint sur le serveur Ubuntu
# Résout l'erreur: TypeError: PDF.__init__() takes 1 positional argument but 3 were given

echo "=========================================="
echo "Mise à jour de WeasyPrint pour corriger l'erreur de compatibilité pydyf"
echo "=========================================="

# Activer l'environnement virtuel si présent
if [ -d "venv" ]; then
    echo "Activation de l'environnement virtuel..."
    source venv/bin/activate
elif [ -d ".venv" ]; then
    echo "Activation de l'environnement virtuel..."
    source .venv/bin/activate
fi

# Mettre à jour WeasyPrint vers une version compatible
echo "Mise à jour de WeasyPrint..."
pip install --upgrade "weasyprint>=62.2"

# Vérifier la version installée
echo ""
echo "Version de WeasyPrint installée:"
pip show weasyprint | grep Version

# Vérifier la version de pydyf
echo ""
echo "Version de pydyf installée:"
pip show pydyf | grep Version || echo "pydyf (dépendance de WeasyPrint)"

echo ""
echo "=========================================="
echo "Mise à jour terminée!"
echo "Redémarrez votre application PM2:"
echo "  pm2 restart procura-django"
echo "=========================================="

