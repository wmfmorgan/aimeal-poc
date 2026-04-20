#!/usr/bin/env bash
#
# verify-phase2-auth.sh
#
# Single-command Phase 2 auth verification run.
#
# Runs:
#   1. npm run build                      — confirms TypeScript compiles cleanly
#   2. npm run test:unit (auth files)     — fast unit coverage for auth logic
#   3. Supabase startup check             — ensures local stack is running
#   4. netlify dev on port 8888           — serves the built app with proxy rules
#   5. npm run test:e2e (auth + smoke)    — Playwright auth-flow and ping-smoke suites
#   6. cleanup                            — kills background Netlify process on exit
#
# Usage:
#   bash scripts/dev/verify-phase2-auth.sh
#
# Assumptions:
#   - Local Supabase stack configured on ports 54331–54339 (see supabase/config.toml)
#   - netlify CLI installed (npm install -g netlify-cli or project devDependency)
#   - Playwright browsers installed (npx playwright install chromium)
#   - .env.local or equivalent env vars set for VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY

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

# ---------------------------------------------------------------------------
# 1. Build
# ---------------------------------------------------------------------------
echo "==> Building..."
npm run build

# ---------------------------------------------------------------------------
# 2. Unit tests (auth files only)
# ---------------------------------------------------------------------------
echo "==> Running auth unit tests..."
npm run test:unit -- --run \
  src/components/auth/ProtectedRoute.test.tsx \
  src/lib/auth/validation.test.ts \
  src/routes/auth-page.test.tsx

# ---------------------------------------------------------------------------
# 3. Ensure Supabase stack is running
# ---------------------------------------------------------------------------
echo "==> Checking Supabase..."
if ! supabase status >/dev/null 2>&1; then
  echo "    Supabase not running — starting..."
  supabase start
fi

# ---------------------------------------------------------------------------
# 4. Clear any stale Vite dev server on port 5173 (leftover from spike scripts)
# ---------------------------------------------------------------------------
STALE_VITE_PID="$({ lsof -tiTCP:5173 -sTCP:LISTEN -a -c node 2>/dev/null || true; } | while read -r pid; do
  if ps -p "$pid" -o command= | grep -q '.planning/spikes/004-netlify-supabase-local/node_modules/.bin/vite'; then
    echo "$pid"
    break
  fi
done)"

if [[ -n "${STALE_VITE_PID}" ]]; then
  echo "    Killing stale spike Vite server (PID ${STALE_VITE_PID})..."
  kill "${STALE_VITE_PID}" 2>/dev/null || true
  wait "${STALE_VITE_PID}" 2>/dev/null || true
  STALE_VITE_PID=""
fi

# ---------------------------------------------------------------------------
# 5. Start netlify dev
# ---------------------------------------------------------------------------
echo "==> Starting netlify dev on port 8888..."
netlify dev --port 8888 >/tmp/planplate-phase2-netlify.log 2>&1 &
NETLIFY_PID=$!

for _ in {1..60}; do
  if curl -fsS "http://127.0.0.1:8888" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

curl -fsS "http://127.0.0.1:8888" >/dev/null

# ---------------------------------------------------------------------------
# 6. Run Playwright E2E: auth flow + ping smoke
# ---------------------------------------------------------------------------
echo "==> Running auth E2E and ping smoke tests..."
npm run test:e2e -- --project=chromium --grep "auth flow|ping smoke"

echo ""
echo "==> Phase 2 auth verification PASSED"
