---
spike: "003"
name: trpc-edge-fn-wiring
validates: "Given a tRPC router in a Supabase Edge Function, when called from a browser client, then procedures resolve with full type inference"
verdict: VALIDATED
related: ["002-edge-fn-grok-json", "004-netlify-supabase-local"]
tags: [trpc, edge-functions, deno, fetch-adapter]
---

# Spike 003: tRPC → Edge Function Wiring

## What This Validates
Does the tRPC fetch adapter work inside Deno's edge runtime? Can a plain browser
fetch call hit a tRPC procedure and get typed results back?

## How to Run

1. Serve the tRPC edge function:
   ```bash
   supabase functions serve trpc
   ```

2. Open the test page in a browser:
   ```bash
   open .planning/spikes/003-trpc-edge-fn-wiring/test.html
   ```

3. Click **ping** → expect `{ pong: true, ts: <timestamp> }`
4. Click **generateDraft** → expect stub response with mealPlanId UUID

## What to Expect
Both buttons return green "PASS" with JSON. No CORS errors. Round trip < 500ms.

## Key Risk
tRPC `npm:` imports in Deno edge runtime may fail — this is the highest-risk
dependency in the whole stack.

## Results
VALIDATED. tRPC npm imports (v11) resolve cleanly in Deno edge runtime.
ping → `{"result":{"data":{"pong":true,"ts":...}}}` ✓
generateDraft mutation → correct typed response ✓

Critical path discovery: the Supabase edge runtime strips `/functions/v1/` and exposes
the path as `/<function-name>/...`. Set `endpoint: "/<function-name>"` in fetchRequestHandler,
NOT `/functions/v1/<function-name>`. This is non-obvious and not documented clearly.
