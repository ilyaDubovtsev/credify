#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${CREDIFY_APP_DIR:-/home/dubovtsev/apps/credify}"
COMPOSE_FILE="$APP_DIR/compose.prod.yaml"

exec 9>"/tmp/credify-deploy.lock"
flock -n 9 || exit 0

cd "$APP_DIR"
git fetch --quiet origin main

current_commit="$(git rev-parse HEAD)"
target_commit="$(git rev-parse origin/main)"

if [[ "$current_commit" == "$target_commit" ]]; then
  exit 0
fi

git checkout --quiet main
git merge --ff-only --quiet origin/main

sudo docker compose -f "$COMPOSE_FILE" build api
sudo docker compose -f "$COMPOSE_FILE" build web
sudo docker compose -f "$COMPOSE_FILE" pull caddy
sudo docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

curl --fail --silent --show-error --retry 5 --retry-delay 3 \
  https://credify.dubovtsev.com/api/health >/dev/null

echo "Credify deployed at $target_commit"

