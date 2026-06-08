#!/usr/bin/env bash
# Backup database Tokopudidi (pg_dump terkompresi) dari container postgres.
#
# Pakai di VPS via cron, mis. harian jam 02:00:
#   0 2 * * * /opt/tokopudidi/scripts/backup-db.sh >> /opt/tokopudidi/backups/backup.log 2>&1
#
# Env opsional:
#   BACKUP_DIR      (default: <repo>/backups)
#   RETENTION_DAYS  (default: 14) — backup lebih tua dari ini dihapus.
set -euo pipefail

# Pindah ke root repo (script ada di scripts/).
cd "$(dirname "$0")/.."

BACKUP_DIR="${BACKUP_DIR:-$(pwd)/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
COMPOSE="docker compose --env-file .env.production -f docker-compose.prod.yml"

mkdir -p "$BACKUP_DIR"

# Ambil kredensial DB dari .env.production (tidak masuk git).
set -a
# shellcheck disable=SC1091
. ./.env.production
set +a

ts="$(date +%Y%m%d-%H%M%S)"
out="$BACKUP_DIR/tokopudidi-$ts.sql.gz"

echo "[$(date -Iseconds)] mulai backup -> $out"
$COMPOSE exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$out"
echo "[$(date -Iseconds)] selesai: $out ($(du -h "$out" | cut -f1))"

# Rotasi: hapus backup lebih tua dari retensi.
find "$BACKUP_DIR" -name 'tokopudidi-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
echo "[$(date -Iseconds)] rotasi selesai (simpan $RETENTION_DAYS hari terakhir)"
