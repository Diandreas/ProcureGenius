#!/bin/bash
#
# Script de diagnostic pour vérifier les permissions admin en production
#

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         DIAGNOSTIC ADMIN - CENTRE DE SANTÉ JULIANNA           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# 1. Vérifier qu'on est dans le bon répertoire
if [ ! -f "manage.py" ]; then
    echo "❌ Erreur: manage.py non trouvé"
    echo "   Veuillez exécuter ce script depuis le répertoire racine du projet"
    exit 1
fi

echo "📍 Répertoire: $(pwd)"
echo ""

# 2. Vérifier la version du code
echo "═══ 1. VERSION DU CODE ═══"
git log --oneline -3
echo ""

# 3. Vérifier l'admin dans la base de données
echo "═══ 2. VÉRIFICATION ADMIN EN BASE ═══"
python manage.py shell << 'PYEOF'
from django.contrib.auth import get_user_model
User = get_user_model()

admin = User.objects.filter(username='julianna_admin').first()

if not admin:
    print("❌ Admin NON TROUVÉ!")
    print("\nUtilisateurs existants:")
    for u in User.objects.all()[:10]:
        print(f"  - {u.username} ({u.email}) - role:{u.role} - staff:{u.is_staff} - super:{u.is_superuser}")
else:
    print(f"✅ Admin trouvé: {admin.username}")
    print(f"   Email: {admin.email}")
    print(f"   Nom: {admin.get_full_name()}")
    print(f"   Role: {admin.role}")
    print(f"   is_staff: {admin.is_staff}")
    print(f"   is_superuser: {admin.is_superuser}")
    print(f"   is_active: {admin.is_active}")
    print("")

    if admin.is_staff and admin.is_superuser and admin.role == 'admin':
        print("✅ PERMISSIONS OK!")
    else:
        print("❌ PERMISSIONS INCORRECTES!")
        print("   CORRECTION NÉCESSAIRE")
PYEOF

echo ""

# 4. Vérifier les modules de l'organisation
echo "═══ 3. MODULES ACTIVÉS ═══"
python manage.py shell << 'PYEOF'
from apps.accounts.models import Organization

org = Organization.objects.filter(name__icontains='JULIANNA').first()
if org:
    print(f"Organisation: {org.name}")
    print(f"Type: {org.subscription_type}")
    print(f"Modules activés: {len(org.enabled_modules)}")
    for module in org.enabled_modules:
        print(f"  - {module}")
else:
    print("❌ Organisation non trouvée")
PYEOF

echo ""

# 5. Test de connexion à l'admin Django
echo "═══ 4. TEST ACCÈS ADMIN DJANGO ═══"
echo "URL Admin: /admin/"
echo "Pour tester manuellement:"
echo "  1. Aller sur https://appback.centrejulianna.com/admin"
echo "  2. Se connecter avec: julianna_admin / julianna2025"
echo "  3. Vérifier l'accès"
echo ""

# 6. Recommandations
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                      RECOMMANDATIONS                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Si les permissions sont incorrectes, exécuter:"
echo "  python manage.py fix_admin_permissions"
echo ""
echo "Si l'admin n'existe pas du tout, exécuter:"
echo "  python manage.py create_julianna_production_data --reset"
echo "  (⚠️  Attention: supprime toutes les données!)"
echo ""
