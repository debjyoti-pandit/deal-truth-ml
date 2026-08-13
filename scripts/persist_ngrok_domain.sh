#!/usr/bin/env bash
# Pin NGROK_DOMAIN in .env from a public HTTPS URL. Never prints secrets.
set -euo pipefail

PUBLIC_URL="${1:-}"
ENV_PATH="${2:-}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_PATH="${ENV_PATH:-${ROOT}/.env}"

if [ -z "${PUBLIC_URL}" ]; then
  echo "usage: persist_ngrok_domain.sh <https-url> [env-path]" >&2
  exit 1
fi
if [ ! -f "${ENV_PATH}" ]; then
  echo "missing .env" >&2
  exit 1
fi

HOST="$(python3 -c 'from urllib.parse import urlparse; import sys
raw=sys.argv[1].strip()
raw = raw if "://" in raw else "https://"+raw
p=urlparse(raw)
h=(p.hostname or "").lower()
bad={"","localhost","127.0.0.1","::1"}
print(h if h not in bad and not p.username else "")
' "${PUBLIC_URL}")"

if [ -z "${HOST}" ]; then
  echo "could not pin NGROK_DOMAIN" >&2
  exit 1
fi

API_DOMAIN=""
API_ENV="$(cd "${ROOT}/.." && pwd)/deal-truth/.env"
if [ -f "${API_ENV}" ]; then
  API_DOMAIN="$(grep -E '^NGROK_DOMAIN=' "${API_ENV}" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
  API_DOMAIN="${API_DOMAIN#https://}"
  API_DOMAIN="${API_DOMAIN#http://}"
  API_DOMAIN="${API_DOMAIN%%/*}"
fi

if [ "${HOST}" = "deal-truth-ngrok.ngrok-free.app" ] || { [ -n "${API_DOMAIN}" ] && [ "${HOST}" = "${API_DOMAIN}" ]; }; then
  echo "refusing to pin NGROK_DOMAIN=${HOST} (already used by deal-truth API)" >&2
  exit 1
fi

# Ephemeral *.ngrok.app hostnames die with the session; pinning them causes the next start to fail.
case "${HOST}" in
  *.ngrok-free.app|*.ngrok.dev) ;;
  *.ngrok.app|*.ngrok.io)
    exit 0
    ;;
esac

current="$(grep -E '^NGROK_DOMAIN=' "${ENV_PATH}" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
current="${current#https://}"
current="${current#http://}"
current="${current%%/*}"

if [ "${current}" = "deal-truth-ngrok.ngrok-free.app" ] || { [ -n "${API_DOMAIN}" ] && [ "${current}" = "${API_DOMAIN}" ]; }; then
  current=""
fi

if [ -n "${current}" ]; then
  echo "NGROK_DOMAIN=${current}"
  exit 0
fi

if grep -qE '^NGROK_DOMAIN=' "${ENV_PATH}"; then
  python3 - "${ENV_PATH}" "${HOST}" <<'PY'
from pathlib import Path
import re, sys
path, host = Path(sys.argv[1]), sys.argv[2]
text = path.read_text(encoding="utf-8")
updated, n = re.subn(r"^NGROK_DOMAIN=.*$", f"NGROK_DOMAIN={host}", text, count=1, flags=re.M)
if n == 0:
    updated = text.rstrip() + f"\nNGROK_DOMAIN={host}\n"
path.write_text(updated, encoding="utf-8")
PY
else
  printf '\nNGROK_DOMAIN=%s\n' "${HOST}" >> "${ENV_PATH}"
fi

echo "pinned NGROK_DOMAIN=${HOST}"
