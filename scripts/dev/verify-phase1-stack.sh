#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")/../.."

NETLIFY_PID=""
STALE_VITE_PID=""

cleanup() {
  if [[ -n "${STALE_VITE_PID}" ]] && kill -0 "${STALE_VITE_PID}" 2>/dev/null; then
    kill "${STALE_VITE_PID}" 2>/dev/null || true
    wait "${STALE_VITE_PID}" 2>/dev/null || true
  fi
  if [[ -n "${NETLIFY_PID}" ]] && kill -0 "${NETLIFY_PID}" 2>/dev/null; then
    kill "${NETLIFY_PID}" 2>/dev/null || true
    wait "${NETLIFY_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT

npm run build
npm run test:unit -- --run

if ! supabase status >/dev/null 2>&1; then
  supabase start
fi

# Clear the Phase 1 spike server if it is still occupying the IPv6 side of 5173.
STALE_VITE_PID="$({ lsof -tiTCP:5173 -sTCP:LISTEN -a -c node 2>/dev/null || true; } | while read -r pid; do
  if ps -p "$pid" -o command= | grep -q '.planning/spikes/004-netlify-supabase-local/node_modules/.bin/vite'; then
    echo "$pid"
    break
  fi
done)"

if [[ -n "${STALE_VITE_PID}" ]]; then
  kill "${STALE_VITE_PID}" 2>/dev/null || true
  wait "${STALE_VITE_PID}" 2>/dev/null || true
  STALE_VITE_PID=""
fi

netlify dev --port 8888 >/tmp/planplate-phase1-netlify.log 2>&1 &
NETLIFY_PID=$!

for _ in {1..60}; do
  if curl -fsS "http://127.0.0.1:8888" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

curl -fsS "http://127.0.0.1:8888" >/dev/null

npm run test:e2e -- --project=chromium --grep "ping smoke"
