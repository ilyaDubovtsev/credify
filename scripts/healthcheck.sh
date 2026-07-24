#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${CREDIFY_APP_DIR:-/home/dubovtsev/apps/credify}"
HEALTH_URL="https://credify.dubovtsev.com/api/health"

if curl --fail --silent --show-error --max-time 15 "$HEALTH_URL" >/dev/null; then
  echo "Credify health check passed"
  exit 0
fi

echo "Credify is unavailable; restarting the production stack" >&2
cd "$APP_DIR"
sudo docker compose -f compose.prod.yaml up -d
sleep 10
curl --fail --silent --show-error --max-time 15 "$HEALTH_URL" >/dev/null
echo "Credify recovered after restart"

