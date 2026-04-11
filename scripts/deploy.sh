#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ ! -f ".env.local" ]]; then
  echo ".env.local is required" >&2
  exit 1
fi

set -a
source .env.local
set +a

npm ci
psql "${DATABASE_URL:?DATABASE_URL is required}" -f db/init.sql
npm run build

if pm2 describe webapp >/dev/null 2>&1; then
  pm2 restart webapp --update-env
else
  pm2 start ecosystem.config.cjs --env production
fi

pm2 save

echo "Deploy finished"
