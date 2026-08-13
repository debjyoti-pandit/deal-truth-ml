#!/usr/bin/env bash
# Create local env files with empty placeholders. Never writes secrets.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .dev.vars ]; then
  cp .dev.vars.example .dev.vars
  echo "Created .dev.vars (INTERNAL_API_TOKEN empty = local auth off)"
else
  echo ".dev.vars already exists"
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env (fill CLOUDFLARE_API_TOKEN for Docker)"
else
  echo ".env already exists"
fi
