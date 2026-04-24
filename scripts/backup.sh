#!/usr/bin/env bash
# Manual database backup — reads connection from .env and dumps to backups/
# Usage: npm run backup
# Requires: PostgreSQL client tools installed (pg_dump at default Windows path)

PG_DUMP="/c/Program Files/PostgreSQL/16/bin/pg_dump.exe"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$ROOT_DIR/.env"
BACKUP_DIR="$ROOT_DIR/backups"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env not found at $ENV_FILE"
  exit 1
fi

# Load env vars
set -a; source "$ENV_FILE"; set +a

# Build connection string — prefer DATABASE_URL (prod), fall back to individual vars (dev)
if [ -n "$DATABASE_URL" ]; then
  CONN="$DATABASE_URL"
  echo "Using DATABASE_URL (production)"
elif [ -n "$DB_HOST" ]; then
  CONN="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT:-5432}/${DB_NAME}"
  echo "Using local DB ($DB_NAME)"
else
  echo "ERROR: No database connection found in .env (need DATABASE_URL or DB_HOST)"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
OUTPUT_FILE="$BACKUP_DIR/softwart_$TIMESTAMP.sql"

echo "Backing up database..."
"$PG_DUMP" --format=plain --file="$OUTPUT_FILE" "$CONN"

if [ $? -eq 0 ]; then
  SIZE=$(du -sh "$OUTPUT_FILE" | cut -f1)
  echo "Backup saved: backups/softwart_$TIMESTAMP.sql ($SIZE)"
else
  echo "ERROR: pg_dump failed"
  rm -f "$OUTPUT_FILE"
  exit 1
fi
