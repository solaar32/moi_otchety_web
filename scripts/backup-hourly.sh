#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/root/moi_otchety_web}"
BACKUP_DIR="${BACKUP_DIR:-/root/moi_otchety_backups}"
DB_NAME="${DB_NAME:-moi_otchety}"
DB_USER="${DB_USER:-moi_otchety_user}"
DATE="$(date +%Y-%m-%d_%H-00)"
FILE="$BACKUP_DIR/moi_otchety_$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"

pg_dump -h localhost -U "$DB_USER" "$DB_NAME" | gzip > "$FILE"

# Храним локально 168 часовых копий: 7 дней.
find "$BACKUP_DIR" -type f -name 'moi_otchety_*.sql.gz' -mtime +7 -delete

# Удаленное облако через rclone, например:
# export RCLONE_REMOTE="yandex:backups/moi-otchety" или "b2:bucket/moi-otchety"
if command -v rclone >/dev/null 2>&1 && [ -n "${RCLONE_REMOTE:-}" ]; then
  rclone copy "$FILE" "$RCLONE_REMOTE" --quiet
fi

echo "Backup created: $FILE"
