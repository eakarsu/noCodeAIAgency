#!/bin/sh

set -eu

: "${BACKUP_DATABASE_URL:?BACKUP_DATABASE_URL is required and must be libpq-compatible}"
: "${BACKUP_DIR:?BACKUP_DIR is required}"

umask 077
mkdir -p "$BACKUP_DIR"
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
backup="$BACKUP_DIR/governed-ai-$timestamp.dump"
manifest="$backup.sha256"

pg_dump --dbname="$BACKUP_DATABASE_URL" --format=custom --no-owner --no-privileges --file="$backup"
shasum -a 256 "$backup" > "$manifest"
chmod 600 "$backup" "$manifest"
printf '%s\n' "$backup"
