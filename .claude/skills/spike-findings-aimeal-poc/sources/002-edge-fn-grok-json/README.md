---
spike: "002"
name: edge-fn-grok-json
validates: "Given a Supabase Edge Function with XAI_API_KEY, when called with a household config, then Grok returns valid 21-meal JSON in under 8 seconds"
verdict: PARTIAL
related: ["001-supabase-local-schema", "003-trpc-edge-fn-wiring"]
tags: [grok, edge-functions, llm, json]
---

# Spike 002: Edge Function → Grok JSON

## What This Validates
Can a Supabase Edge Function call the Grok API (OpenAI-compatible) and get back
structured JSON with exactly 21 meals covering 7 days × 3 meal types, within the
8-second budget?

## Prerequisites
- Spike 001 complete (Supabase running on port 54331)
- XAI API key from https://console.x.ai

## How to Run

1. Add your key to `supabase/functions/.env`:
   ```
   XAI_API_KEY=xai-...
   ```

2. Serve the function:
   ```bash
   supabase functions serve generate-draft --env-file supabase/functions/.env
   ```

3. In another terminal, call it:
   ```bash
   curl -s http://127.0.0.1:54331/functions/v1/generate-draft | jq '{ok,valid,meal_count,elapsed_ms,tokens_used}'
   ```

## What to Expect
```json
{
  "ok": true,
  "valid": true,
  "meal_count": 21,
  "elapsed_ms": "<8000",
  "tokens_used": "<2000"
}
```

## Results
PARTIAL. JSON shape and count validated. Latency is a concern.

```json
{ "ok": true, "valid": true, "meal_count": 21, "elapsed_ms": 39433, "tokens_used": 2756 }
```

- meal_count: 21 ✓ (all 7 days × 3 meal types covered)
- valid: true ✓ (all day/meal_type combos present)
- tokens_used: 2756 — within budget
- elapsed_ms: 39433 ⚠ — 39 seconds, far above the < 8s target in architecture.md

Model progression tested:
- grok-3-mini: 39s (reasoning model — avoid for this use case)
- grok-4-fast-non-reasoning: 13s
- grok-4-1-fast-non-reasoning: 11s
- grok-4-1-fast-non-reasoning (no rationale field): 9.7s / 1645 tokens ← current best

~10s is the API floor for batch JSON generation of 21 meals.
The architecture's "< 2s" UX goal requires streaming — stream tokens from Grok → Edge Function
→ client and render each meal card as JSON objects complete. Batch call is PoC-acceptable with
a loading spinner. Streaming is the real implementation path.
