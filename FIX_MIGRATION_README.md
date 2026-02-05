# 🔧 Guide de correction des migrations

## Problème rencontré

```
django.db.migrations.exceptions.InconsistentMigrationHistory:
Migration patients.0001_initial is applied before its dependency
invoicing.0020_warehouse_is_default_and_more on database 'default'.
```

## 🚀 Solutions disponibles

### Option 1: Script Python automatique (RECOMMANDÉ)

Ce script analyse le problème et applique la correction appropriée:

```bash
# Sur le serveur de production
cd /home/centrejulianna-appback/htdocs/appback.centrejulianna.com
source venv/bin/activate
python fix_migration_order.py
```

**Avantages:**
- ✅ Analyse intelligente du problème
- ✅ Vérifie l'état des tables
- ✅ Correction sûre et automatique
- ✅ Messages détaillés

### Option 2: Script Bash rapide

Correction en une seule commande:

```bash
# Sur le serveur
cd /home/centrejulianna-appback/htdocs/appback.centrejulianna.com
source venv/bin/activate
chmod +x fix_migration_quick.sh
./fix_migration_quick.sh
```

### Option 3: Commande manuelle unique

Une seule ligne pour tout corriger:

```bash
python -c "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings'); django.setup(); from django.db.migrations.recorder import MigrationRecorder; MigrationRecorder.Migration.objects.get_or_create(app='invoicing', name='0020_warehouse_is_default_and_more'); print('✅ Migration ajoutée!')" && python manage.py migrate
```

### Option 4: Correction SQL directe

Si vous préférez SQL:

```bash
# Accéder à PostgreSQL
python manage.py dbshell
```

```sql
-- Ajouter la migration manquante
INSERT INTO django_migrations (app, name, applied)
VALUES ('invoicing', '0020_warehouse_is_default_and_more', NOW())
ON CONFLICT DO NOTHING;

-- Vérifier
SELECT app, name FROM django_migrations
WHERE app IN ('invoicing', 'patients')
ORDER BY app, id;

-- Quitter
\q
```

```bash
# Puis appliquer les migrations
python manage.py migrate
```

## 📋 Étapes après correction

Une fois la migration corrigée:

```bash
# 1. Vérifier l'état des migrations
python manage.py showmigrations

# 2. Appliquer les migrations restantes
python manage.py migrate

# 3. Charger les données de production
python manage.py create_julianna_production_data --reset

# 4. Vérifier que tout fonctionne
python manage.py check
```

## 🔍 Diagnostic du problème

### Pourquoi ce problème survient?

Ce problème survient quand:
1. Les migrations ont été appliquées dans le mauvais ordre
2. La base de données a été créée avec d'anciennes migrations
3. De nouvelles dépendances ont été ajoutées après coup

### Quelle est la migration concernée?

La migration `invoicing.0020_warehouse_is_default_and_more`:
- Ajoute le champ `is_default` au modèle `Warehouse`
- Modifie le champ `header_address` du modèle `PrintTemplate`

C'est une migration simple et non-destructive.

## ⚠️ Prévention future

Pour éviter ce problème à l'avenir:

1. **Toujours appliquer les migrations dans l'ordre:**
   ```bash
   python manage.py migrate
   ```

2. **Ne pas supprimer de migrations déjà appliquées**

3. **Utiliser `--fake` avec précaution:**
   ```bash
   # Seulement si vous savez ce que vous faites
   python manage.py migrate --fake
   ```

4. **Sauvegarder avant les migrations importantes:**
   ```bash
   pg_dump julianna_db > backup_avant_migration.sql
   ```

## 🆘 Si rien ne fonctionne

En dernier recours (⚠️ PERTE DE DONNÉES):

```bash
# 1. Sauvegarder d'abord!
pg_dump -U julianna_user julianna_db > backup_complet.sql

# 2. Réinitialiser les migrations
python manage.py dbshell
DELETE FROM django_migrations;
\q

# 3. Réappliquer tout
python manage.py migrate --fake-initial

# 4. Recharger les données
python manage.py create_julianna_production_data --reset
```

## 📞 Support

Si le problème persiste:

1. Vérifiez les logs: `tail -f logs/django.log`
2. Vérifiez les services: `systemctl status postgresql`
3. Testez la connexion DB: `python manage.py dbshell`

---

**Créé le:** 2025-02-05
**Pour:** Centre de Santé JULIANNA
**Application:** ProcureGenius Healthcare
