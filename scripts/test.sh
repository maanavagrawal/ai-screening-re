#!/usr/bin/env sh
set -eu

export PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$HOME/.nvm/versions/node/v22.15.0/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"

if [ ! -f package.json ]; then
  echo "No package.json found; no tests to run yet."
  exit 0
fi

status=0

if command -v pnpm >/dev/null 2>&1; then
  pnpm lint || status=$?
  pnpm typecheck || status=$?
  pnpm test || status=$?
  exit "$status"
fi

if npm run | grep -q " lint"; then
  npm run lint || status=$?
else
  echo "No npm lint script found; skipping lint."
fi

if npm run | grep -q " typecheck"; then
  npm run typecheck || status=$?
else
  echo "No npm typecheck script found; skipping typecheck."
fi

if npm run | grep -q " test"; then
  npm run test || status=$?
else
  echo "No npm test script found; skipping unit tests."
fi

exit "$status"
