# Resolve host wrangler OAuth dir (macOS is not ~/.wrangler).
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
