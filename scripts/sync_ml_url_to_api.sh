#!/usr/bin/env bash
# Write ML_NGROK_DOMAIN into sibling deal-truth/.env so the API can reach this Worker.
# Never prints secrets. Does not overwrite a working local ML_SERVICE_BASE_URL.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_ENV="$(cd "${ROOT}/.." && pwd)/deal-truth/.env"
HOST="${1:-}"

if [ -z "${HOST}" ]; then
  HOST="$(grep -E '^NGROK_DOMAIN=' "${ROOT}/.env" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
fi
HOST="${HOST#https://}"
HOST="${HOST#http://}"
HOST="${HOST%%/*}"

if [ -z "${HOST}" ] || [ "${HOST}" = "deal-truth-ngrok.ngrok-free.app" ]; then
  echo "skip API sync: ML NGROK_DOMAIN is missing or is the API hostname" >&2
  exit 0
fi
case "${HOST}" in
  *.ngrok.app|*.ngrok.io)
    echo "skip API sync: ephemeral hostname ${HOST}" >&2
    exit 0
    ;;
esac

if [ ! -f "${API_ENV}" ]; then
  echo "skip API sync: ${API_ENV} not found" >&2
  exit 0
fi

python3 - "${API_ENV}" "${HOST}" <<'PY'
from pathlib import Path
import re, sys
path, host = Path(sys.argv[1]), sys.argv[2]
text = path.read_text(encoding="utf-8")
if re.search(r"^ML_NGROK_DOMAIN=", text, re.M):
    text = re.sub(r"^ML_NGROK_DOMAIN=.*$", f"ML_NGROK_DOMAIN={host}", text, count=1, flags=re.M)
else:
    text = text.rstrip() + f"\nML_NGROK_DOMAIN={host}\n"
path.write_text(text, encoding="utf-8")
print(f"deal-truth/.env ML_NGROK_DOMAIN={host}")
PY
