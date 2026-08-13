#!/bin/sh
# HTTPS tunnel to Deal Truth ML (compose service ml:8081).
# Inspector is published on host 4041 so it does not collide with deal-truth API ngrok (4040).
set -eu

if [ -z "${NGROK_AUTHTOKEN:-}" ] && [ -n "${NGROK_AUTH_TOKEN:-}" ]; then
  NGROK_AUTHTOKEN="${NGROK_AUTH_TOKEN}"
  export NGROK_AUTHTOKEN
fi

if [ -z "${NGROK_AUTHTOKEN:-}" ]; then
  echo "ngrok skipped: NGROK_AUTHTOKEN / NGROK_AUTH_TOKEN is empty." >&2
  echo "Add a token from https://dashboard.ngrok.com/get-started/your-authtoken to .env" >&2
  echo "Without it, a remote deal-truth API cannot reach this ML worker." >&2
  exec sleep infinity
fi

ADDR="${NGROK_UPSTREAM:-http://ml:8081}"
APP_NAME="${APP_NAME:-deal-truth-ml}"

DOMAIN="${NGROK_DOMAIN:-}"
if [ -z "${DOMAIN}" ]; then
  DOMAIN="${APP_NAME}-ngrok.ngrok-free.app"
fi
case "${DOMAIN}" in
  https://*|http://*) URL="${DOMAIN}" ;;
  "") URL="" ;;
  *) URL="https://${DOMAIN}" ;;
esac

# Never steal the deal-truth API reserved hostname (ERR_NGROK_334).
HOST="$(printf '%s' "${URL}" | sed -e 's#^https://##' -e 's#^http://##' -e 's#/.*##')"
if [ "${HOST}" = "deal-truth-ngrok.ngrok-free.app" ]; then
  echo "NGROK_DOMAIN is the API hostname (${HOST}); using ${APP_NAME}-ngrok.ngrok-free.app instead." >&2
  URL="https://${APP_NAME}-ngrok.ngrok-free.app"
  HOST="${APP_NAME}-ngrok.ngrok-free.app"
fi

if [ -n "${URL}" ]; then
  echo "ngrok using stable domain ${URL} -> ${ADDR}" >&2
  exec ngrok http --config=/ngrok.yml --url="${URL}" --log=stdout --log-format=json "${ADDR}"
fi

echo "ngrok NGROK_DOMAIN is empty; starting without a pinned URL." >&2
echo "After the first tunnel, make up writes NGROK_DOMAIN so later restarts stay stable." >&2
echo "Use a *different* Dev Domain than the API (https://dashboard.ngrok.com/domains)." >&2
exec ngrok http --config=/ngrok.yml --log=stdout --log-format=json "${ADDR}"
