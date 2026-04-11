#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

chmod +x scripts/*.sh

cp ops/systemd/gympulse-backup.service /etc/systemd/system/
cp ops/systemd/gympulse-backup.timer /etc/systemd/system/
cp ops/systemd/gympulse-doctor.service /etc/systemd/system/
cp ops/systemd/gympulse-doctor.timer /etc/systemd/system/

systemctl daemon-reload
systemctl enable --now gympulse-backup.timer
systemctl enable --now gympulse-doctor.timer

pm2 save
pm2 startup systemd -u "$(id -un)" --hp "${HOME}"

echo "Production runtime finalized"
