# Spike Wrap-Up Summary

**Sessions:** 2026-04-19, 2026-04-25
**Spikes processed:** 8
**Feature areas:** local-dev-infrastructure, edge-functions-ai, spoonacular-enrichment, spoonacular-search-precision
**Skill output:** `./.claude/skills/spike-findings-aimeal-poc/`

## Included Spikes

| # | Name | Verdict | Feature Area |
|---|------|---------|--------------|
| 001 | supabase-local-schema | VALIDATED ✓ | local-dev-infrastructure |
| 002 | edge-fn-grok-json | PARTIAL ⚠ | edge-functions-ai |
| 003 | trpc-edge-fn-wiring | VALIDATED ✓ | edge-functions-ai |
| 004 | netlify-supabase-local | VALIDATED ✓ | local-dev-infrastructure |
| 005 | spoonacular-recipe-shape | VALIDATED ✓ | spoonacular-enrichment |
| 006 | spoonacular-param-audit | VALIDATED ✓ | spoonacular-search-precision |
| 007 | ai-search-hints | VALIDATED ✓ | spoonacular-search-precision |
| 008 | call-consolidation | VALIDATED ✓ | spoonacular-search-precision |

## Excluded Spikes
None.

## Key Findings

### Session 1 (2026-04-19, spikes 001–005)

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

### Session 2 (2026-04-25, spikes 006–008)

7. **UI captures most filter signal but sends none of it** — `intolerances`, `excludeIngredients`,
   `equipment`, `diet` are all derivable from existing household rows. Today only `query=title`
   is sent to `complexSearch`. Pre-filter params cost zero extra and replace the post-fetch
   `extractBlockedTerm` rejection path with fail-closed search.

8. **`diet_type` is free-text in DB; Spoonacular's `diet` is an 11-value enum** — needs UI
   dropdown or backend fuzzy-mapper. Allergies outside the 12-value `intolerances` enum
   (e.g. "strawberry") must route to `excludeIngredients` instead.

9. **The LLM already knows the cuisine and central ingredient** — both buried in
   `short_description`. Extending the JSON output with a `search_hints` block (cuisine, type,
   include_ingredients[], exclude_ingredients[], main_ingredient, max_ready_time_min)
   harvests this signal without a second LLM round-trip. Server-side normalize-and-drop
   handles enum non-compliance gracefully.

10. **`response_format=json_schema` is supported by Grok 4 family with streaming** — but the
    NDJSON-per-line pattern from spike 002 doesn't fit a single-root schema. Drop-on-invalid
    normalize is the recommended first cut; strict mode is a future hardening spike.

11. **`addRecipeInformation=true&addRecipeNutrition=true` returns every field spike 005
    validated** — the two-call enrichment flow is no longer needed. Combined with strong
    pre-filters from 006+007, the variant-ladder fallback also collapses to one call + one
    soft-filter retry.

12. **Compounded cost reduction:** ~3.05 pt → ~1.06 pt per uncached enrichment (~65%).
    Free-tier daily capacity goes from ~16 enrichments to ~47 at 50 pt/day.

13. **Implement 006 + 007 + 008 together as a single phase.** Independent rollouts have
    weak payoffs: filters without LLM hints leave precision on the table; LLM hints without
    consumption are wasted tokens; consolidated calls without strong filters cost slightly
    more per call. Together they multiply.
