#!/usr/bin/env bash
# Print the ngrok HTTPS public URL from the inspector API. Never prints tokens.
set -euo pipefail

API_URL="${1:-http://127.0.0.1:4041}"
WAIT="${2:-30}"
DEADLINE=$((SECONDS + WAIT))

fetch() {
  python3 - "$API_URL" <<'PY'
import json, sys, urllib.request
api = sys.argv[1].rstrip("/") + "/api/tunnels"
try:
    with urllib.request.urlopen(api, timeout=2) as response:
        payload = json.loads(response.read().decode())
except Exception:
    sys.exit(2)
tunnels = payload.get("tunnels") if isinstance(payload, dict) else None
if not isinstance(tunnels, list):
    sys.exit(1)
for tunnel in tunnels:
    if not isinstance(tunnel, dict):
        continue
    url = tunnel.get("public_url")
    if isinstance(url, str) and url.startswith("https://"):
        print(url.rstrip("/"))
        sys.exit(0)
sys.exit(1)
PY
}

while (( SECONDS < DEADLINE )); do
  if url="$(fetch 2>/dev/null)"; then
    echo "${url}"
    exit 0
  fi
  sleep 1
done

# Fall back to pinned domain in .env (hostname only). Never use the API reserved hostname.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DOMAIN=""
API_ENV="$(cd "${ROOT}/.." && pwd)/deal-truth/.env"
if [ -f "${API_ENV}" ]; then
  API_DOMAIN="$(grep -E '^NGROK_DOMAIN=' "${API_ENV}" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
  API_DOMAIN="${API_DOMAIN#https://}"
  API_DOMAIN="${API_DOMAIN#http://}"
  API_DOMAIN="${API_DOMAIN%%/*}"
fi
if [ -f "${ROOT}/.env" ]; then
  domain="$(grep -E '^NGROK_DOMAIN=' "${ROOT}/.env" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
  domain="${domain#https://}"
  domain="${domain#http://}"
  domain="${domain%%/*}"
  if [ "${domain}" = "deal-truth-ngrok.ngrok-free.app" ] || { [ -n "${API_DOMAIN}" ] && [ "${domain}" = "${API_DOMAIN}" ]; }; then
    domain=""
  fi
  if [ -n "${domain}" ] && [ "${domain}" != "localhost" ]; then
    echo "https://${domain}"
    exit 0
  fi
fi

echo "ngrok tunnel URL not ready (set NGROK_AUTHTOKEN and NGROK_DOMAIN in .env)" >&2
exit 1
