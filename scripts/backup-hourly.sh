#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/root/moi_otchety_web}"
BACKUP_DIR="${BACKUP_DIR:-/root/moi_otchety_backups}"
DB_NAME="${DB_NAME:-moi_otchety}"
DB_USER="${DB_USER:-moi_otchety_user}"
DATE="$(date +%Y-%m-%d_%H-00)"
FILE="$BACKUP_DIR/moi_otchety_$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"

# Берет пароль из DATABASE_URL/.pgpass/переменных окружения PostgreSQL.
# Если pg_dump просит пароль, добавьте файл /root/.pgpass с правами 600.
pg_dump -h localhost -U "$DB_USER" "$DB_NAME" | gzip > "$FILE"

# Храним локально 72 часовые копии.
find "$BACKUP_DIR" -type f -name 'moi_otchety_*.sql.gz' -mtime +3 -delete

# Опционально: выгрузка в удаленное облако через rclone.
# Настройте rclone remote, например: rclone config -> remote name moi-cloud
if command -v rclone >/dev/null 2>&1 && [ -n "${RCLONE_REMOTE:-}" ]; then
  rclone copy "$FILE" "$RCLONE_REMOTE" --quiet
fi

echo "Backup created: $FILE"
