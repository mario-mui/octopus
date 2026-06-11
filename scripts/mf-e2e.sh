#!/usr/bin/env bash
# One-command Module Federation end-to-end check: builds the host + remote,
# serves both with CORS, drives a headless browser to confirm the remote plugin
# is loaded, routed, and rendered (incl. shared-DI), then cleans up.
#
# Requires Chromium for Playwright:
#   npx playwright install chromium chromium-headless-shell
#   sudo npx playwright install-deps   # system libs
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> building remote + host"
pnpm --filter @octopus/plugin-remote-demo build >/dev/null
pnpm --filter @octopus/portal build >/dev/null

echo "==> serving remote :3001 and host :3000"
node scripts/static-server.cjs plugins/plugin-remote-demo/dist 3001 >/tmp/octopus-remote.log 2>&1 &
REMOTE_PID=$!
node scripts/static-server.cjs apps/portal/dist 3000 >/tmp/octopus-host.log 2>&1 &
HOST_PID=$!
trap 'kill $REMOTE_PID $HOST_PID 2>/dev/null || true' EXIT
sleep 2

echo "==> running browser e2e"
node scripts/mf-e2e.cjs
