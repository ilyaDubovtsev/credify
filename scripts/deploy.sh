#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${CREDIFY_APP_DIR:-/home/dubovtsev/apps/credify}"
COMPOSE_FILE="$APP_DIR/compose.prod.yaml"
DEPLOYED_COMMIT_FILE="$APP_DIR/.deployed-commit"

exec 9>"/tmp/credify-deploy.lock"
flock -n 9 || exit 0

cd "$APP_DIR"
git fetch --quiet origin main

target_commit="$(git rev-parse origin/main)"
deployed_commit="$(cat "$DEPLOYED_COMMIT_FILE" 2>/dev/null || true)"

if [[ "$deployed_commit" == "$target_commit" ]]; then
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

printf "%s\n" "$target_commit" >"$DEPLOYED_COMMIT_FILE"
echo "Credify deployed at $target_commit"
