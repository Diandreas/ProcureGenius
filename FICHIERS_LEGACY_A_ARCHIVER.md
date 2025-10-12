# Fichiers Legacy à Archiver

## Fichiers à Déplacer vers `_legacy/`

Ces fichiers contiennent des versions obsolètes des modèles et doivent être archivés pour éviter la confusion:

### apps/suppliers/
- models_original.py (contient ancien Product et Client)
- admin_original.py
- views_original.py
- urls_original.py
- models_simple.py
- admin_simple.py
- views_simple.py
- urls_simple.py

### apps/invoicing/
- models_original.py
- models_simple.py
- admin_original.py
- admin_simple.py
- views_original.py
- views_simple.py
- urls_original.py
- urls_simple.py
- signals_original.py
- signals_simple.py
- forms_simple.py

### apps/purchase_orders/
- models_original.py
- models_simple.py
- admin_original.py
- admin_simple.py
- views_original.py
- views_simple.py
- urls_original.py
- urls_simple.py
- forms_original.py (si existe)

### apps/accounts/
- models_original.py
- models_simple.py
- admin_original.py
- admin_simple.py
- views_original.py
- views_simple.py
- urls_original.py
- urls_simple.py

### apps/analytics/
- models_original.py
- models_simple.py
- admin_original.py
- admin_simple.py
- views_original.py
- views_simple.py
- urls_original.py
- urls_simple.py

### apps/ai_assistant/
- models_original.py
- models_simple.py
- admin_original.py
- admin_simple.py
- views_original.py
- views_simple.py
- urls_original.py
- urls_simple.py

### apps/integrations/
- models_original.py
- models_simple.py
- admin_original.py
- admin_simple.py
- views_original.py
- views_simple.py
- urls_original.py
- urls_simple.py

### apps/core/
- models_original.py
- models_simple.py
- admin_original.py
- admin_simple.py
- views_original.py
- views_simple.py
- urls_original.py
- urls_simple.py

## Note

Ces fichiers sont conservés dans `_legacy/` comme référence historique mais ne sont plus utilisés dans le code actif.

Pour les archiver, créer un dossier `_legacy/` dans chaque app et y déplacer les fichiers listés.

**Ne PAS supprimer** - Garder comme backup et référence.

