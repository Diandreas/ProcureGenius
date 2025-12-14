"""
Script de test pour vérifier les quick actions filtrées par module
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.accounts.models import CustomUser
from apps.ai_assistant.views import QuickActionsView
from apps.ai_assistant.action_manager import action_manager

def test_quick_actions():
    print("=" * 80)
    print("TEST DES QUICK ACTIONS FILTREES PAR MODULE")
    print("=" * 80)

    # Récupérer tous les utilisateurs
    users = CustomUser.objects.all()[:5]

    for user in users:
        print(f"\nUtilisateur: {user.username}")
        print(f"   - Superuser: {user.is_superuser}")
        print(f"   - Staff: {user.is_staff}")

        # Vérifier les préférences
        if hasattr(user, 'userpreferences') and user.userpreferences:
            prefs = user.userpreferences
            enabled_modules = set(prefs.enabled_modules or [])
            print(f"   - Modules actives: {enabled_modules}")
        else:
            print(f"   - WARNING: Pas de UserPreferences")
            enabled_modules = set(QuickActionsView.CATEGORY_TO_MODULE.values()) - {None}
            print(f"   - Par defaut, tous modules: {enabled_modules}")

        # Simuler le filtrage
        all_actions = action_manager.get_available_actions()
        filtered_count = 0

        for action in all_actions:
            action_category = action.get('category')
            required_module = QuickActionsView.CATEGORY_TO_MODULE.get(action_category)

            # Logique de filtrage
            if user.is_superuser or user.is_staff:
                should_show = True
            elif not required_module:
                should_show = True  # Pas de module requis
            elif required_module in enabled_modules:
                should_show = True
            else:
                should_show = False

            if should_show:
                filtered_count += 1

        print(f"   OK Actions visibles: {filtered_count} / {len(all_actions)}")

    print("\n" + "=" * 80)
    print("DÉTAIL DES CATÉGORIES ET MODULES")
    print("=" * 80)

    # Grouper les actions par catégorie
    categories = {}
    all_actions = action_manager.get_available_actions()

    for action in all_actions:
        cat = action.get('category', 'sans_categorie')
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(action['name'])

    for category, actions in sorted(categories.items()):
        required_module = QuickActionsView.CATEGORY_TO_MODULE.get(category, "? Non mappe")
        print(f"\nCategorie: {category}")
        print(f"   Module requis: {required_module}")
        print(f"   Actions ({len(actions)}):")
        for action_name in actions[:3]:  # Afficher max 3 actions par catégorie
            print(f"   - {action_name}")
        if len(actions) > 3:
            print(f"   ... et {len(actions) - 3} autre(s)")

if __name__ == '__main__':
    test_quick_actions()
