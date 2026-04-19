# Spike Wrap-Up Summary

**Date:** 2026-04-19
**Spikes processed:** 5
**Feature areas:** local-dev-infrastructure, edge-functions-ai, spoonacular-enrichment
**Skill output:** `./.claude/skills/spike-findings-aimeal-poc/`

## Included Spikes

| # | Name | Verdict | Feature Area |
|---|------|---------|--------------|
| 001 | supabase-local-schema | VALIDATED ✓ | local-dev-infrastructure |
| 002 | edge-fn-grok-json | PARTIAL ⚠ | edge-functions-ai |
| 003 | trpc-edge-fn-wiring | VALIDATED ✓ | edge-functions-ai |
| 004 | netlify-supabase-local | VALIDATED ✓ | local-dev-infrastructure |
| 005 | spoonacular-recipe-shape | VALIDATED ✓ | spoonacular-enrichment |

## Excluded Spikes
None.

## Key Findings

1. **Local Supabase port conflict** — Two projects can't share default ports. This project
   uses 54331–54339. Must be configured in `supabase/config.toml` before first `supabase start`.

2. **tRPC endpoint path in edge runtime** — Supabase strips `/functions/v1/` prefix before
   the handler. Set `endpoint: "/<function-name>"` in `fetchRequestHandler`, not the full path.
   Silent failure (404) if wrong.

3. **Grok model selection** — `grok-3-mini` is a reasoning model and takes 39s for 21-meal JSON.
   Use `grok-4-1-fast-non-reasoning`. Batch floor is ~10s for this payload.

4. **Streaming is required for < 2s UX** — Architecture's "< 2 seconds" target is not achievable
   with a batch API call. Real implementation must stream tokens from Grok → Edge Function → client.

5. **Netlify proxy = one-liner** — `[[redirects]]` with `force = true` in `netlify.toml` routes
   all Supabase traffic. No code changes, no env switching between local and prod.

6. **Spoonacular field mapping confirmed** — All 5 required fields present. `instructions` must be
   extracted as `analyzedInstructions[0].steps[].step`. Cache by `spoonacular_recipe_id`, not title.
