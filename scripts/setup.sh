#!/usr/bin/env sh
set -eu

export PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$HOME/.nvm/versions/node/v22.15.0/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"

if [ ! -f package.json ]; then
  echo "No package.json found; nothing to install yet."
  exit 0
fi

if command -v pnpm >/dev/null 2>&1; then
  if [ -f pnpm-lock.yaml ]; then
    pnpm install --frozen-lockfile
  else
    pnpm install
  fi
elif [ -f yarn.lock ] && command -v yarn >/dev/null 2>&1; then
  yarn install --frozen-lockfile
elif [ -f bun.lockb ] && command -v bun >/dev/null 2>&1; then
  bun install --frozen-lockfile
elif [ -f package-lock.json ]; then
  npm ci
elif command -v npm >/dev/null 2>&1; then
  npm install
else
  echo "No package manager found. Install pnpm or npm, then rerun setup."
  exit 1
fi
