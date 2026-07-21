#!/bin/sh

set -eu

: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"
: "${BACKUP_FILE:?BACKUP_FILE is required}"

if [ "${RESTORE_ACK:-}" != "I_ACKNOWLEDGE_DESTRUCTIVE_ISOLATED_RESTORE" ]; then
  echo "Restore acknowledgement is required." >&2
  exit 78
fi
case "$RESTORE_DATABASE_URL" in
  *restore_*|*rehearsal_*) ;;
  *) echo "Restore destination database name must contain restore_ or rehearsal_." >&2; exit 78 ;;
esac

shasum -a 256 -c "$BACKUP_FILE.sha256"
pg_restore --dbname="$RESTORE_DATABASE_URL" --clean --if-exists --no-owner --no-privileges "$BACKUP_FILE"
DATABASE_URL="$RESTORE_DATABASE_URL" npx prisma migrate status
DATABASE_URL="$RESTORE_DATABASE_URL" npx tsx scripts/verify-audit.ts
