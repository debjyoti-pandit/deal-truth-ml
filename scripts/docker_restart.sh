#!/usr/bin/env bash
# Fastest bounce after Worker code/config changes. Same idea as deal-truth `make restart`.
# Rebuilds the ml image, recreates ml + ngrok, waits until /health/live is green.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo ".env is missing — run make up first" >&2
  exit 1
fi

# shellcheck source=scripts/wrangler_config_dir.sh
source "${ROOT}/scripts/wrangler_config_dir.sh"

echo "Restarting deal-truth-ml so local changes load..."
echo "  wrangler config: ${WRANGLER_CONFIG_DIR}"

docker compose up -d --build --force-recreate --wait ml
docker compose up -d --force-recreate --no-deps ngrok

bash scripts/check_ready.sh http://127.0.0.1:8081 90

NGROK_INSPECTOR_PORT="$(grep -E '^NGROK_INSPECTOR_PORT=' .env | head -1 | cut -d= -f2- || true)"
NGROK_INSPECTOR_PORT="${NGROK_INSPECTOR_PORT:-4041}"
INSPECTOR="http://127.0.0.1:${NGROK_INSPECTOR_PORT}"
TUNNEL="$(bash scripts/print_ngrok_url.sh "${INSPECTOR}" 20 || true)"

echo ""
echo "Deal Truth ML restarted."
echo "  Health:  curl http://localhost:8081/health/live"
if [ -n "${TUNNEL}" ]; then
  echo "  Public:  ${TUNNEL}"
fi
echo "  Inspector: ${INSPECTOR}"
