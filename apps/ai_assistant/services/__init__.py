# Services pour le module AI Assistant
# Export depuis le fichier services.py parent
# Ce fichier résout le conflit entre le fichier services.py et le package services/

import sys
import os
from pathlib import Path
import importlib.util

# Obtenir le chemin du fichier services.py
_current_file = Path(__file__)
_parent_dir = _current_file.parent.parent
_services_py = _parent_dir / 'services.py'

if not _services_py.exists():
    raise ImportError(f"services.py not found at {_services_py}")

# Pour que les imports relatifs fonctionnent, il faut que le module
# soit chargé dans le bon contexte. On va manipuler sys.modules
# pour créer le contexte nécessaire avant de charger le module.

# S'assurer que apps et apps.ai_assistant existent dans sys.modules
if 'apps' not in sys.modules:
    import types
    apps_module = types.ModuleType('apps')
    sys.modules['apps'] = apps_module

if 'apps.ai_assistant' not in sys.modules:
    import types
    ai_assistant_module = types.ModuleType('apps.ai_assistant')
    ai_assistant_module.__path__ = [str(_parent_dir)]
    sys.modules['apps.ai_assistant'] = ai_assistant_module

# Ajouter le répertoire parent au sys.path pour les imports absolus
_project_root = _parent_dir.parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

# Maintenant charger le module services.py
_module_name = 'apps.ai_assistant._services_module'

# Vérifier si déjà chargé
if _module_name in sys.modules:
    _services_module = sys.modules[_module_name]
else:
    spec = importlib.util.spec_from_file_location(_module_name, _services_py)
    if not spec or not spec.loader:
        raise ImportError(f"Could not create spec for {_services_py}")
    
    _services_module = importlib.util.module_from_spec(spec)
    
    # Configurer le module pour les imports relatifs
    _services_module.__package__ = 'apps.ai_assistant'
    _services_module.__name__ = _module_name
    _services_module.__file__ = str(_services_py)
    
    # Ajouter au sys.modules AVANT l'exécution pour permettre les imports circulaires
    sys.modules[_module_name] = _services_module
    
    # Maintenant exécuter le module
    try:
        spec.loader.exec_module(_services_module)
    except Exception as e:
        # Nettoyer en cas d'erreur
        if _module_name in sys.modules:
            del sys.modules[_module_name]
        raise ImportError(f"Error loading services.py: {e}") from e

# Exporter les classes nécessaires
try:
    MistralService = _services_module.MistralService
    ActionExecutor = _services_module.ActionExecutor
    AsyncSafeUserContext = _services_module.AsyncSafeUserContext
    __all__ = ['MistralService', 'ActionExecutor', 'AsyncSafeUserContext']
except AttributeError as e:
    raise ImportError(f"Missing class in services.py: {e}")
