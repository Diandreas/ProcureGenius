#!/usr/bin/env python3
"""
Script de migration automatique vers les composants Safe
Remplace Tab, Button, BottomNavigationAction, ListItemText par leurs versions sécurisées
"""

import re
import sys
from pathlib import Path

def migrate_file(file_path):
    """Migre un fichier vers les composants Safe"""
    print(f"Traitement de {file_path}...")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    changes = []

    # 1. Remplacer les imports de Tab
    if "import { Tab } from '@mui/material'" in content:
        content = content.replace(
            "import { Tab } from '@mui/material'",
            "import { SafeTab } from '../components/safe'"
        )
        changes.append("Import Tab -> SafeTab")

    # Pattern pour les imports multiples avec Tab
    import_pattern = r"import\s*{([^}]+)}\s*from\s*'@mui/material'"

    def replace_import(match):
        imports = match.group(1)
        if 'Tab' in imports and 'Tabs' not in imports:
            # Retirer Tab de l'import MUI
            new_imports = ', '.join([imp.strip() for imp in imports.split(',') if 'Tab' not in imp or 'Tabs' in imp])
            # Ajouter l'import SafeTab
            return f"import {{ {new_imports} }} from '@mui/material';\nimport {{ SafeTab }} from '../components/safe'"
        elif ' Tab,' in imports or ', Tab ' in imports or imports.strip() == 'Tab':
            # Cas où Tab est dans une liste d'imports
            parts = [p.strip() for p in imports.split(',')]
            new_parts = []
            has_tab = False
            for part in parts:
                if part == 'Tab':
                    has_tab = True
                else:
                    new_parts.append(part)
            if has_tab:
                result = f"import {{ {', '.join(new_parts)} }} from '@mui/material'"
                if new_parts:
                    result += f";\nimport {{ SafeTab }} from '../components/safe'"
                else:
                    result = f"import {{ SafeTab }} from '../components/safe'"
                return result
        return match.group(0)

    content = re.sub(import_pattern, replace_import, content)

    # 2. Remplacer <Tab par <SafeTab dans le JSX
    if '<Tab ' in content or '<Tab\n' in content:
        content = re.sub(r'<Tab\s', '<SafeTab ', content)
        content = re.sub(r'</Tab>', '</SafeTab>', content)
        changes.append("JSX: <Tab> -> <SafeTab>")

    # 3. Sauvegarder si des changements ont été faits
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  [OK] Migre: {', '.join(changes)}")
        return True
    else:
        print(f"  - Aucun changement nécessaire")
        return False

def main():
    """Fonction principale"""
    files_to_migrate = [
        'frontend/src/components/DocumentScanner.jsx',
        'frontend/src/pages/ai-chat/AIChat.jsx',
        'frontend/src/pages/analytics/StockAnalytics.jsx',
        'frontend/src/pages/clients/ClientDetail.jsx',
        'frontend/src/pages/healthcare/analytics/HealthcareAnalyticsDashboard.jsx',
        'frontend/src/pages/healthcare/analytics/RevenueAnalyticsDashboard.jsx',
        'frontend/src/pages/healthcare/laboratory/LabQueueDashboard.jsx',
        'frontend/src/pages/healthcare/patients/PatientDetail.jsx',
        'frontend/src/pages/healthcare/pharmacy/MedicationDetail.jsx',
        'frontend/src/pages/inventory/analytics/MovementAnalytics.jsx',
    ]

    migrated_count = 0
    for file_path in files_to_migrate:
        if Path(file_path).exists():
            if migrate_file(file_path):
                migrated_count += 1
        else:
            print(f"[WARN] Fichier non trouve: {file_path}")

    print(f"\n[DONE] Migration terminee: {migrated_count} fichiers migres")

if __name__ == '__main__':
    main()
