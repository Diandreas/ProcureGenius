#!/bin/bash
# ============================================================
# SAUVEGARDE QUOTIDIENNE — Procura (procura.mirlab.cloud)
# ============================================================
# À installer sur le VPS dans le crontab de l'utilisateur applicatif :
#   30 2 * * * /home/mirlab-procura/htdocs/procura.mirlab.cloud/scripts/backup_procura.sh >> /home/mirlab-procura/backups/backup.log 2>&1
#
# Sauvegarde : dump PostgreSQL (format custom) + archive de media/,
# rotation 14 jours, test d'intégrité, copie distante chiffrée (rclone),
# et heartbeat healthchecks.io (alerte si le cron ne s'exécute pas).
#
# Prérequis VPS :
#   - client pg_dump/pg_restore en version 16 (postgresql-client-16)
#   - rclone configuré avec un remote chiffré (voir RESTORE.md) — OPTIONNEL
#   - variable DATABASE_URL présente dans le .env de l'app
# ============================================================
set -euo pipefail

# ---- CONFIGURATION (adapter si l'arborescence change) --------------------
APP_DIR="${APP_DIR:-/home/mirlab-procura/htdocs/procura.mirlab.cloud}"
BACKUP_DIR="${BACKUP_DIR:-/home/mirlab-procura/backups}"   # HORS htdocs : survit aux déploiements
RETENTION_DAYS="${RETENTION_DAYS:-14}"

# Copie distante chiffrée (laisser vide pour désactiver).
# Exemple : "b2crypt:procura-backups"  (remote rclone de type crypt)
RCLONE_REMOTE="${RCLONE_REMOTE:-}"

# URL de ping healthchecks.io (laisser vide pour désactiver).
# Exemple : "https://hc-ping.com/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-}"

# ---- DÉRIVÉS -------------------------------------------------------------
DATE="$(date +%F_%H%M)"
DB_DIR="$BACKUP_DIR/db"
MEDIA_DIR="$BACKUP_DIR/media"
DUMP_FILE="$DB_DIR/procura_${DATE}.dump"
MEDIA_FILE="$MEDIA_DIR/media_${DATE}.tar.gz"

log() { echo "[$(date +%F' '%T)] $*"; }
fail() { log "ERREUR: $*"; exit 1; }

mkdir -p "$DB_DIR" "$MEDIA_DIR"

# ---- Récupérer DATABASE_URL depuis le .env de l'app ----------------------
ENV_FILE="$APP_DIR/.env"
[ -f "$ENV_FILE" ] || fail ".env introuvable : $ENV_FILE"
DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -n1 | cut -d= -f2- || true)"
[ -n "$DATABASE_URL" ] || fail "DATABASE_URL absent de $ENV_FILE"

# ---- 1. Dump PostgreSQL (format custom, compressé) -----------------------
log "Dump PostgreSQL -> $DUMP_FILE"
pg_dump --format=custom --no-owner --dbname="$DATABASE_URL" --file="$DUMP_FILE" \
    || fail "pg_dump a échoué"

# ---- 2. Test d'intégrité du dump (lecture de la table des matières) ------
log "Vérification d'intégrité du dump"
pg_restore --list "$DUMP_FILE" > /dev/null || fail "dump corrompu (pg_restore --list)"

# ---- 3. Archive de media/ ------------------------------------------------
if [ -d "$APP_DIR/media" ]; then
    log "Archive media/ -> $MEDIA_FILE"
    tar -czf "$MEDIA_FILE" -C "$APP_DIR" media || fail "tar media/ a échoué"
else
    log "media/ absent : archive ignorée"
fi

# ---- 4. Rotation locale --------------------------------------------------
log "Rotation locale (> $RETENTION_DAYS jours)"
find "$DB_DIR" -name '*.dump' -mtime +"$RETENTION_DAYS" -delete
find "$MEDIA_DIR" -name '*.tar.gz' -mtime +"$RETENTION_DAYS" -delete

# ---- 5. Copie distante chiffrée (optionnelle) ----------------------------
if [ -n "$RCLONE_REMOTE" ] && command -v rclone > /dev/null 2>&1; then
    log "Copie distante -> $RCLONE_REMOTE"
    rclone copy "$DB_DIR" "$RCLONE_REMOTE/db" --transfers 2 --max-age "${RETENTION_DAYS}d" \
        || log "AVERTISSEMENT: rclone db a échoué (copie locale conservée)"
    rclone copy "$MEDIA_DIR" "$RCLONE_REMOTE/media" --transfers 2 --max-age "${RETENTION_DAYS}d" \
        || log "AVERTISSEMENT: rclone media a échoué (copie locale conservée)"
else
    log "Copie distante désactivée (RCLONE_REMOTE vide ou rclone absent)"
fi

# ---- 6. Heartbeat (alerte si absence d'exécution) ------------------------
if [ -n "$HEALTHCHECK_URL" ]; then
    curl -fsS -m 10 "$HEALTHCHECK_URL" > /dev/null 2>&1 || log "AVERTISSEMENT: ping healthcheck échoué"
fi

log "Sauvegarde terminée : $(du -h "$DUMP_FILE" | cut -f1) (db)"
