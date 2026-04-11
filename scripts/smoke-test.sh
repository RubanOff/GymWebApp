#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:3000}"

echo "Checking ${BASE_URL}/api/health"
curl -fsS "${BASE_URL%/}/api/health"
echo

echo "Checking ${BASE_URL}/login"
STATUS_CODE="$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL%/}/login")"
if [[ "${STATUS_CODE}" != "200" ]]; then
  echo "Unexpected status for /login: ${STATUS_CODE}" >&2
  exit 1
fi

echo "Checking ${BASE_URL}/"
ROOT_CODE="$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL%/}/")"
if [[ "${ROOT_CODE}" != "200" && "${ROOT_CODE}" != "307" && "${ROOT_CODE}" != "308" ]]; then
  echo "Unexpected status for /: ${ROOT_CODE}" >&2
  exit 1
fi

echo "Smoke test passed"
