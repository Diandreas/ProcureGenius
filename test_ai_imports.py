"""
Test script to verify AI assistant imports work correctly
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
sys.path.insert(0, os.path.dirname(__file__))

try:
    django.setup()
    print("[OK] Django setup successful")
except Exception as e:
    print(f"[ERROR] Django setup failed: {e}")
    sys.exit(1)

# Test imports
try:
    from apps.ai_assistant.services import MistralService, ActionExecutor
    print("[OK] Services import successful")
except Exception as e:
    print(f"[ERROR] Services import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test ActionExecutor initialization
try:
    executor = ActionExecutor()
    print(f"[OK] ActionExecutor initialized with {len(executor.actions)} actions")
    print(f"   Actions: {', '.join(sorted(executor.actions.keys()))}")
except Exception as e:
    print(f"[ERROR] ActionExecutor initialization failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test MistralService initialization
try:
    mistral = MistralService()
    print(f"[OK] MistralService initialized with {len(mistral.tools)} tools")
except Exception as e:
    print(f"[ERROR] MistralService initialization failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test actions_config loading
try:
    from apps.ai_assistant.action_manager import action_manager
    actions = action_manager.get_all_actions()
    print(f"[OK] Action manager loaded {len(actions)} actions from config")
except Exception as e:
    print(f"[ERROR] Action manager failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test models
try:
    from apps.ai_assistant.models import ActionHistory
    entity_types = [choice[0] for choice in ActionHistory.ENTITY_TYPES]
    print(f"[OK] ActionHistory model loaded with entity types: {', '.join(entity_types)}")
except Exception as e:
    print(f"[ERROR] Models import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n[SUCCESS] All AI assistant components loaded successfully!")
print("\n[SUMMARY]")
print(f"   - {len(executor.actions)} executor actions")
print(f"   - {len(mistral.tools)} Mistral tools")
print(f"   - {len(actions)} config actions")
print(f"   - {len(entity_types)} entity types for ActionHistory")
