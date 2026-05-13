#!/usr/bin/env sh
set -eu

export PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$HOME/.nvm/versions/node/v22.15.0/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"

if [ ! -f package.json ]; then
  echo "No package.json found; add an app package before starting a dev server."
  exit 1
fi

if command -v pnpm >/dev/null 2>&1; then
  pnpm dev
elif npm run | grep -q " dev"; then
  npm run dev
else
  echo "No dev script found in package.json."
  exit 1
fi
