#!/usr/bin/env python
"""
Script d'implémentation automatique complète du module IA
"""
import os
import sys
import shutil
from datetime import datetime

print("="*80)
print(" IMPLEMENTATION AUTOMATIQUE COMPLETE DU MODULE IA PROCUREGENIUS")
print("="*80)
print()

# Créer backup
backup_dir = f"backup_complete_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
os.makedirs(backup_dir, exist_ok=True)
print(f"Creation du dossier backup: {backup_dir}/")

# Fichiers à backuper
files_to_backup = {
    'apps/ai_assistant/services.py': 'services.py',
    'apps/ai_assistant/models.py': 'models.py',
    'apps/ai_assistant/views.py': 'views.py',
    'apps/ai_assistant/api_urls.py': 'api_urls.py',
}

for src, dst in files_to_backup.items():
    if os.path.exists(src):
        shutil.copy(src, os.path.join(backup_dir, dst))
        print(f"  OK Backup: {src}")

print(f"\nBackups crees dans: {backup_dir}/")
print()

# Lire services.py
print("="*80)
print("PHASE 1: MODIFICATION DE services.py")
print("="*80)

with open('apps/ai_assistant/services.py', 'r', encoding='utf-8') as f:
    services_content = f.read()

# Vérifier état actuel
has_tools = 'self.tools = self._define_tools()' in services_content
has_define_tools = 'def _define_tools(self)' in services_content
has_tools_in_complete = 'tools=self.tools' in services_content

print(f"\nEtat actuel de services.py:")
print(f"  - self.tools dans __init__: {'OUI' if has_tools else 'NON'}")
print(f"  - Methode _define_tools: {'OUI' if has_define_tools else 'NON'}")
print(f"  - tools dans chat.complete: {'OUI' if has_tools_in_complete else 'NON'}")

if not has_tools or not has_define_tools:
    print("\n! services.py NECESSITE des modifications manuelles")
    print("\n  Consultez COPY_PASTE_CODE.md pour le code exact a copier")
    print("  Ou IMPLEMENTATION_GUIDE.md pour les details")
else:
    print("\n✓ services.py semble deja modifie")

print()

# Lire models.py
print("="*80)
print("PHASE 2: MODIFICATION DE models.py")
print("="*80)

with open('apps/ai_assistant/models.py', 'r', encoding='utf-8') as f:
    models_content = f.read()

has_tool_calls = 'tool_calls = models.JSONField' in models_content
has_metadata = 'metadata = models.JSONField' in models_content

print(f"\nEtat actuel de models.py:")
print(f"  - Champ tool_calls: {'OUI' if has_tool_calls else 'NON'}")
print(f"  - Champ metadata: {'OUI' if has_metadata else 'NON'}")

if not has_tool_calls or not has_metadata:
    print("\n! models.py NECESSITE des modifications")
    print("\n  Dans la classe Message, ajoutez:")
    print("    tool_calls = models.JSONField(null=True, blank=True)")
    print("    metadata = models.JSONField(null=True, blank=True)")
else:
    print("\n✓ models.py semble deja modifie")

print()

# Résumé
print("="*80)
print("RESUME ET PROCHAINES ETAPES")
print("="*80)
print()
print("Backups: " + backup_dir + "/")
print()
print("Pour continuer l'implementation:")
print()
print("1. Si services.py n'est pas modifie:")
print("   -> Ouvrez COPY_PASTE_CODE.md")
print("   -> Copiez le code des sections 1.1, 1.2, 1.3")
print()
print("2. Si models.py n'est pas modifie:")
print("   -> Ajoutez les 2 champs dans la classe Message")
print()
print("3. Ensuite, executez:")
print("   py manage.py makemigrations ai_assistant")
print("   py manage.py migrate ai_assistant")
print()
print("4. Consultez IMPLEMENTATION_STEPS.txt pour la suite complete")
print()
print("="*80)
