#!/usr/bin/env bash
# Bring up Deal Truth ML in Docker (wrangler dev → Workers AI).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi

bash scripts/bootstrap_env.sh

if [ ! -f .env ]; then
  echo ".env is missing" >&2
  exit 1
fi

TOKEN_SET="$(grep -E '^CLOUDFLARE_API_TOKEN=.+' .env | grep -v '^CLOUDFLARE_API_TOKEN=$' || true)"

HOST_LOGIN=0
if npx wrangler whoami >/dev/null 2>&1; then
  HOST_LOGIN=1
fi

if [ -z "${TOKEN_SET}" ] && [ "${HOST_LOGIN}" -ne 1 ]; then
  echo "Cloudflare auth is missing." >&2
  echo "  Option A: make login" >&2
  echo "  Option B: set CLOUDFLARE_API_TOKEN in .env" >&2
  echo "            https://dash.cloudflare.com/profile/api-tokens" >&2
  exit 1
fi

if [ -z "${WRANGLER_CONFIG_DIR:-}" ]; then
  if [ -d "${HOME}/Library/Preferences/.wrangler" ]; then
    export WRANGLER_CONFIG_DIR="${HOME}/Library/Preferences/.wrangler"
  elif [ -d "${HOME}/.config/.wrangler" ]; then
    export WRANGLER_CONFIG_DIR="${HOME}/.config/.wrangler"
  else
    mkdir -p "${HOME}/.wrangler"
    export WRANGLER_CONFIG_DIR="${HOME}/.wrangler"
  fi
fi

echo "Starting deal-truth-ml on port 8081..."
echo "  wrangler config: ${WRANGLER_CONFIG_DIR}"
docker rm -f deal-truth-ml deal-truth-ml-ngrok >/dev/null 2>&1 || true
docker compose up --build -d --wait --remove-orphans

echo ""
echo "Deal Truth ML is up."
echo "  Health:  curl http://localhost:8081/health/live"
echo "  Ready:   curl http://localhost:8081/health/ready"
echo "  Compat:  POST http://localhost:8081/classify"
echo "  Point deal-truth/.env:"
echo "    ML_SERVICE_BASE_URL=http://localhost:8081   (API on host)"
echo "    ML_SERVICE_BASE_URL=http://host.docker.internal:8081   (API in Docker)"
echo "    ML_SERVICE_API_KEY=   (empty unless INTERNAL_API_TOKEN is set)"
echo "Stop with: make down"

bash scripts/check_ready.sh http://127.0.0.1:8081 90

NGROK_INSPECTOR_PORT="$(grep -E '^NGROK_INSPECTOR_PORT=' .env | head -1 | cut -d= -f2- || true)"
NGROK_INSPECTOR_PORT="${NGROK_INSPECTOR_PORT:-4041}"
INSPECTOR="http://127.0.0.1:${NGROK_INSPECTOR_PORT}"
TUNNEL="$(bash scripts/print_ngrok_url.sh "${INSPECTOR}" 45 || true)"
echo ""
if [ -n "${TUNNEL}" ]; then
  echo "  Public ML:  ${TUNNEL}"
  echo "  Inspector:  ${INSPECTOR}"
  echo "  Same-machine API (Docker):"
  echo "    ML_SERVICE_BASE_URL=http://host.docker.internal:8081"
  echo "    ML_NGROK_DOMAIN  is written to sibling deal-truth/.env"
  case "${TUNNEL}" in
    *://*.ngrok-free.app|*://*.ngrok.dev)
      echo "  Remote API:"
      echo "    ML_SERVICE_BASE_URL=${TUNNEL}"
      bash scripts/persist_ngrok_domain.sh "${TUNNEL}" || true
      bash scripts/sync_ml_url_to_api.sh "${TUNNEL}" || true
      ;;
    *)
      echo "  Public ML this session: ${TUNNEL} (ephemeral; not pinned)."
      bash scripts/sync_ml_url_to_api.sh || true
      ;;
  esac
else
  echo "  Public ML:  (ngrok not ready — set NGROK_AUTHTOKEN in .env)"
  echo "  Domain:     NGROK_DOMAIN must differ from the API domain"
  echo "  Inspector:  ${INSPECTOR}"
fi
