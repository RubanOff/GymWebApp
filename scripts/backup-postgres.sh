#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
OUTPUT_FILE="${BACKUP_DIR}/gympulse-${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

pg_dump "${DATABASE_URL}" | gzip > "${OUTPUT_FILE}"

echo "Backup written to ${OUTPUT_FILE}"
