#!/usr/bin/env sh
set -eu

export PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$HOME/.nvm/versions/node/v22.15.0/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"

if [ ! -f package.json ]; then
  echo "No package.json found; no e2e tests to run yet."
  exit 0
fi

if command -v pnpm >/dev/null 2>&1; then
  pnpm e2e
elif npm run | grep -q " e2e"; then
  npm run e2e
else
  echo "No npm e2e script found; skipping browser/e2e tests."
  exit 0
fi
