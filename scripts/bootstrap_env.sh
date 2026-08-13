#!/usr/bin/env bash
# Create local env files with empty placeholders. Never writes or prints secrets.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ensure_key() {
  local file="$1"
  local key="$2"
  local default="${3:-}"
  if [ ! -f "${file}" ]; then
    return 0
  fi
  if grep -qE "^${key}=" "${file}"; then
    return 0
  fi
  printf '\n%s=%s\n' "${key}" "${default}" >> "${file}"
}

if [ ! -f .dev.vars ]; then
  cp .dev.vars.example .dev.vars
  echo "Created .dev.vars (INTERNAL_API_TOKEN empty = local auth off)"
else
  echo ".dev.vars already exists"
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env"
else
  echo ".env already exists"
fi

ensure_key .env CLOUDFLARE_API_TOKEN
ensure_key .env CLOUDFLARE_ACCOUNT_ID
ensure_key .env ML_PORT 8081
ensure_key .env NGROK_AUTHTOKEN
ensure_key .env NGROK_AUTH_TOKEN
ensure_key .env NGROK_DOMAIN
ensure_key .env NGROK_INSPECTOR_PORT 4041
ensure_key .env NGROK_UPSTREAM "http://ml:8081"

# Reuse the API ngrok authtoken if this .env still has an empty token (never printed).
API_ENV="$(cd "${ROOT}/.." && pwd)/deal-truth/.env"
if [ -f "${API_ENV}" ]; then
  current="$(grep -E '^NGROK_AUTHTOKEN=' .env | head -1 | cut -d= -f2- || true)"
  if [ -z "${current}" ]; then
    sibling="$(grep -E '^NGROK_AUTHTOKEN=.' "${API_ENV}" | head -1 | cut -d= -f2- || true)"
    if [ -z "${sibling}" ]; then
      sibling="$(grep -E '^NGROK_AUTH_TOKEN=.' "${API_ENV}" | head -1 | cut -d= -f2- || true)"
    fi
    if [ -n "${sibling}" ]; then
      python3 - .env "${sibling}" <<'PY'
from pathlib import Path
import re, sys
path, token = Path(sys.argv[1]), sys.argv[2]
text = path.read_text(encoding="utf-8")
updated, n = re.subn(r"^NGROK_AUTHTOKEN=.*$", f"NGROK_AUTHTOKEN={token}", text, count=1, flags=re.M)
if n == 0:
    updated = text.rstrip() + f"\nNGROK_AUTHTOKEN={token}\n"
updated, n2 = re.subn(r"^NGROK_AUTH_TOKEN=.*$", f"NGROK_AUTH_TOKEN={token}", updated, count=1, flags=re.M)
if n2 == 0:
    updated = updated.rstrip() + f"\nNGROK_AUTH_TOKEN={token}\n"
path.write_text(updated, encoding="utf-8")
PY
      echo "Copied NGROK_AUTHTOKEN from sibling deal-truth/.env (not printed)"
    fi
  fi
fi
