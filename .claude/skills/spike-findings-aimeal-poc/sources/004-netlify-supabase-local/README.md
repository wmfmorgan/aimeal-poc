---
spike: "004"
name: netlify-supabase-local
validates: "Given netlify dev running, when React app calls tRPC and Supabase REST via relative URLs, then requests proxy through Netlify to local Supabase on port 54331"
verdict: VALIDATED
related: ["003-trpc-edge-fn-wiring", "001-supabase-local-schema"]
tags: [netlify, supabase, proxy, vite, react]
---

# Spike 004: Netlify ↔ Supabase Local Dev

## What This Validates
Does `netlify dev` correctly proxy `/functions/v1/*` and `/rest/v1/*` to the local
Supabase instance? Can the React app use relative URLs and hit the right backend?

## How to Run

```bash
cd .planning/spikes/004-netlify-supabase-local

# Install deps
npm install

# In another terminal, serve the tRPC edge function
supabase functions serve trpc --no-verify-jwt

# Start Netlify dev (proxies to Supabase on 54331)
netlify dev
```

Open http://localhost:8888 and click all three buttons.

## What to Expect
All three buttons show green PASS:
- `tRPC ping` → `{ pong: true, ts: ... }`
- `tRPC generateDraft` → stub response with UUID
- `Supabase REST` → `[]` (empty array, RLS blocks anon — but 200 proves proxy works)

## Results
VALIDATED. Netlify dev (port 8888) proxies correctly to Supabase (port 54331).
- `/functions/v1/trpc/ping` → `{"result":{"data":{"pong":true}}}` ✓
- `/rest/v1/households` → `[]` (200 + RLS blocks anon — proxy confirmed) ✓

The [[redirects]] block in netlify.toml is the only wiring needed. No code changes required.
