#!/usr/bin/env bash
# Wait until the ML worker answers /health/live.
set -euo pipefail

BASE="${1:-http://127.0.0.1:8081}"
WAIT="${2:-60}"
DEADLINE=$((SECONDS + WAIT))

while (( SECONDS < DEADLINE )); do
  if curl -fsS "${BASE}/health/live" >/dev/null 2>&1; then
    echo "ML live at ${BASE}"
    curl -fsS "${BASE}/health/ready"
    echo
    exit 0
  fi
  sleep 2
done

echo "ML did not become ready at ${BASE} within ${WAIT}s" >&2
exit 1
