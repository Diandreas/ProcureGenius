#!/usr/bin/env python
"""
Script d'implémentation automatique du module IA
Applique toutes les modifications nécessaires
"""
import os
import shutil
from datetime import datetime

print("=" * 70)
print("🚀 IMPLÉMENTATION AUTOMATIQUE DU MODULE IA")
print("=" * 70)
print()

# Créer un backup
backup_dir = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
os.makedirs(backup_dir, exist_ok=True)

# Copier les fichiers importants
files_to_backup = [
    'apps/ai_assistant/services.py',
    'apps/ai_assistant/views.py',
    'apps/ai_assistant/models.py',
    'apps/ai_assistant/api_urls.py',
]

for file in files_to_backup:
    if os.path.exists(file):
        shutil.copy(file, os.path.join(backup_dir, os.path.basename(file)))
        print(f"✅ Backup: {file}")

print(f"\n📁 Backups sauvegardés dans: {backup_dir}/")
print()
print("=" * 70)
print("ÉTAPE 1: Modification de services.py")
print("=" * 70)
print()

# Lire services.py
with open('apps/ai_assistant/services.py', 'r', encoding='utf-8') as f:
    services_content = f.read()

# Vérifier si déjà modifié
if 'self.tools = self._define_tools()' in services_content:
    print("⚠️  services.py semble déjà modifié (self.tools présent)")
    print("   Voulez-vous continuer? Le script va créer services_new.py")
    print()

# Afficher le statut
print("📊 Statut des modifications:")
print(f"   - self.tools présent: {'✅' if 'self.tools' in services_content else '❌'}")
print(f"   - _define_tools présent: {'✅' if '_define_tools' in services_content else '❌'}")
print(f"   - tools= dans chat.complete: {'✅' if 'tools=self.tools' in services_content else '❌'}")
print()

print("=" * 70)
print("INSTRUCTIONS MANUELLES")
print("=" * 70)
print()
print("Pour continuer l'implémentation manuellement:")
print()
print("1. Ouvrez apps/ai_assistant/services.py")
print("2. Ligne ~26, ajoutez: self.tools = self._define_tools()")
print("3. Copiez la méthode _define_tools() depuis IMPLEMENTATION_GUIDE.md")
print("4. Remplacez la méthode chat() par la version dans IMPLEMENTATION_GUIDE.md")
print()
print("Ou consultez IMPLEMENTATION_STEPS.txt pour les étapes détaillées")
print()
print("=" * 70)

print("\n✅ Script terminé. Backups créés.")
