# Sauvegarde & restauration — Procura

Ce document décrit la stratégie de sauvegarde et la procédure de restauration
de la base PostgreSQL et des fichiers `media/` de Procura.

## Ce qui est sauvegardé

- **Base PostgreSQL** : dump quotidien au format `custom` (`pg_dump -Fc`), testé
  après création (`pg_restore --list`).
- **Fichiers `media/`** : archive `tar.gz` quotidienne.
- **Rétention** : 14 jours en local (`/home/mirlab-procura/backups`), +
  copie distante chiffrée optionnelle (Backblaze B2 via rclone).
- **Backup pré-migration** : un dump est créé automatiquement avant chaque
  `migrate` par `deploy_mirlab.sh` (rétention 5), dans `backups/pre_deploy/`.

## Installation sur le VPS

### 1. Répertoire de sauvegarde (hors `htdocs`)

```bash
mkdir -p /home/mirlab-procura/backups
```

### 2. Client PostgreSQL 16

```bash
pg_dump --version    # doit afficher 16.x ; sinon : apt install postgresql-client-16
```

### 3. Copie distante chiffrée (recommandé — Backblaze B2, 10 Go gratuits)

```bash
# a) créer un bucket B2 + une clé applicative sur backblaze.com
# b) configurer deux remotes rclone : le stockage, puis un overlay 'crypt'
rclone config
#   remote 1 : type = b2         (nom : b2procura)
#   remote 2 : type = crypt      (nom : b2crypt, remote = b2procura:procura-backups)
#              -> chiffre noms de fichiers ET contenu ; NOTER le mot de passe crypt
chmod 600 ~/.config/rclone/rclone.conf
```

> Le chiffrement est **obligatoire** : les dumps contiennent des données clients.
> Conserver le mot de passe crypt hors du VPS (sans lui, les backups distants
> sont irrécupérables).

### 4. Heartbeat (recommandé — healthchecks.io, gratuit)

Créer un check sur https://healthchecks.io, récupérer l'URL de ping.

### 5. Planifier le cron

```bash
crontab -e
```

```cron
# Sauvegarde quotidienne à 02h30
30 2 * * * RCLONE_REMOTE="b2crypt:" HEALTHCHECK_URL="https://hc-ping.com/<uuid>" \
  /home/mirlab-procura/htdocs/procura.mirlab.cloud/scripts/backup_procura.sh \
  >> /home/mirlab-procura/backups/backup.log 2>&1
```

## Vérifier qu'une sauvegarde fonctionne

```bash
# lancer manuellement
bash scripts/backup_procura.sh
ls -lh /home/mirlab-procura/backups/db/        # dump présent
ls -lh /home/mirlab-procura/backups/media/     # archive présente
rclone ls b2crypt:                             # objets distants (si rclone configuré)
```

## Test de restauration (mensuel, SANS toucher la prod)

À faire une fois par mois pour garantir que les backups sont réellement
restaurables (un backup jamais testé n'est pas un backup).

```bash
DUMP=/home/mirlab-procura/backups/db/procura_XXXX.dump

createdb -U postgres procura_restore_test
pg_restore --no-owner -d procura_restore_test "$DUMP"
psql -d procura_restore_test -c "SELECT count(*) FROM accounts_customuser;"
psql -d procura_restore_test -c "SELECT count(*) FROM invoicing_invoice;"
dropdb procura_restore_test
```

Restauration d'un backup distant chiffré :

```bash
rclone copy b2crypt:db/procura_XXXX.dump /tmp/
```

## Restauration réelle (incident de production)

> Coupe le service. À exécuter seulement en cas de perte/corruption avérée.

```bash
DUMP=/home/mirlab-procura/backups/db/procura_XXXX.dump
MEDIA=/home/mirlab-procura/backups/media/media_XXXX.tar.gz
APP_DIR=/home/mirlab-procura/htdocs/procura.mirlab.cloud

# 1. Arrêter l'app
pm2 stop procura-backend

# 2. Restaurer la base (recrée la base — adapter le nom réel via DATABASE_URL)
dropdb procura_db && createdb procura_db
pg_restore --no-owner -d procura_db "$DUMP"

# 3. Restaurer les fichiers media
tar -xzf "$MEDIA" -C "$APP_DIR"

# 4. Redémarrer
pm2 start procura-backend
curl -fsS https://procura.mirlab.cloud/api/v1/health/    # doit renvoyer "ok"
```

## Rollback d'un déploiement raté

Le backup pré-migration permet de revenir à l'état d'avant le déploiement :

```bash
git revert <sha>            # ou git reset --hard <sha_precedent>
DUMP=/home/mirlab-procura/backups/pre_deploy/pre_XXXX.dump
dropdb procura_db && createdb procura_db
pg_restore --no-owner -d procura_db "$DUMP"
pm2 restart procura-backend
```
