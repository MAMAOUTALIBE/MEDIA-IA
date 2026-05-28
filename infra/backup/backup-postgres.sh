#!/usr/bin/env bash
# Daily Postgres backup — pg_dump from the running container into a local
# directory, compressed with gzip. Keeps the last 7 daily + 4 weekly + 3 monthly.
#
# Usage:
#   ./infra/backup/backup-postgres.sh
#
# Cron (recommended — install via `./infra/backup/install-cron.sh`):
#   0 2 * * *  /opt/cmr/infra/backup/backup-postgres.sh >> /var/log/cmr-backup.log 2>&1

set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/cmr}"
PG_CONTAINER="${PG_CONTAINER:-cmr-pg}"
PG_USER="${POSTGRES_USER:-cmr}"
PG_DB="${POSTGRES_DB:-cmr_prod}"
RETAIN_DAILY=7
RETAIN_WEEKLY=4
RETAIN_MONTHLY=3

mkdir -p "$BACKUP_ROOT/daily" "$BACKUP_ROOT/weekly" "$BACKUP_ROOT/monthly"

TS=$(date -u +"%Y%m%dT%H%M%SZ")
OUT="$BACKUP_ROOT/daily/cmr-$TS.sql.gz"

echo "[$(date -Iseconds)] Starting backup → $OUT"

# Stream the dump directly to gzip — no intermediate plaintext file on disk.
# Use --clean --if-exists so the dump is restorable into an existing DB.
docker exec "$PG_CONTAINER" pg_dump \
  --username="$PG_USER" \
  --dbname="$PG_DB" \
  --clean \
  --if-exists \
  --format=plain \
  --no-owner \
  --no-acl \
  | gzip -9 > "$OUT"

# Size + integrity check — a successful pg_dump always emits a -- PostgreSQL
# database dump complete trailer. Verify it landed.
SIZE=$(stat -c%s "$OUT" 2>/dev/null || stat -f%z "$OUT")
gunzip -c "$OUT" | tail -n 5 | grep -q "PostgreSQL database dump complete" || {
  echo "❌ Backup trailer missing — dump likely truncated"
  rm -f "$OUT"
  exit 1
}

echo "[$(date -Iseconds)] ✓ Backup OK ($SIZE bytes)"

# ──────────────────────────────────────────────────────────────────────────────
# Promotion — Sunday daily → weekly, 1st of month daily → monthly
# ──────────────────────────────────────────────────────────────────────────────
DOW=$(date -u +%u)   # 1=Mon..7=Sun
DOM=$(date -u +%d)
if [ "$DOW" = "7" ]; then
  cp "$OUT" "$BACKUP_ROOT/weekly/cmr-$TS.sql.gz"
  echo "[$(date -Iseconds)] → promoted to weekly"
fi
if [ "$DOM" = "01" ]; then
  cp "$OUT" "$BACKUP_ROOT/monthly/cmr-$TS.sql.gz"
  echo "[$(date -Iseconds)] → promoted to monthly"
fi

# ──────────────────────────────────────────────────────────────────────────────
# Rotation
# ──────────────────────────────────────────────────────────────────────────────
trim_dir() {
  local dir="$1" keep="$2"
  # ls -1t lists newest first; tail -n +N+1 drops the first N.
  (cd "$dir" && ls -1t | tail -n +$((keep + 1)) | xargs -r rm -f --)
}
trim_dir "$BACKUP_ROOT/daily"   "$RETAIN_DAILY"
trim_dir "$BACKUP_ROOT/weekly"  "$RETAIN_WEEKLY"
trim_dir "$BACKUP_ROOT/monthly" "$RETAIN_MONTHLY"

echo "[$(date -Iseconds)] Rotation done. Daily/Weekly/Monthly retained: $RETAIN_DAILY/$RETAIN_WEEKLY/$RETAIN_MONTHLY"
