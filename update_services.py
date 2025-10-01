"""
Script pour mettre à jour services.py avec le function calling
"""
import os
import shutil
from datetime import datetime

# Chemins
SERVICES_PATH = "apps/ai_assistant/services.py"
BACKUP_PATH = f"apps/ai_assistant/services_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.py"

# Créer un backup
shutil.copy(SERVICES_PATH, BACKUP_PATH)
print(f"✅ Backup créé : {BACKUP_PATH}")

# Lire le fichier actuel
with open(SERVICES_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# Nouvelle version du __init__
new_init = '''    def __init__(self):
        api_key = getattr(settings, 'MISTRAL_API_KEY', os.getenv('MISTRAL_API_KEY'))
        if not api_key:
            raise ValueError("MISTRAL_API_KEY not configured")

        self.client = Mistral(api_key=api_key)
        self.model = getattr(settings, 'MISTRAL_MODEL', 'mistral-large-latest')
        self.tools = self._define_tools()  # AJOUTÉ'''

# Remplacer l'ancien __init__
old_init = '''    def __init__(self):
        api_key = getattr(settings, 'MISTRAL_API_KEY', os.getenv('MISTRAL_API_KEY'))
        if not api_key:
            raise ValueError("MISTRAL_API_KEY not configured")

        self.client = Mistral(api_key=api_key)
        self.model = getattr(settings, 'MISTRAL_MODEL', 'mistral-large-latest')'''

content = content.replace(old_init, new_init)

print(f"✅ __init__ mis à jour")

# Sauvegarder
with open(SERVICES_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ Fichier services.py mis à jour !")
print(f"📁 Backup disponible : {BACKUP_PATH}")
