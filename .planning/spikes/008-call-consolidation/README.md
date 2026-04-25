---
spike: "008"
name: call-consolidation
type: research
validates: "Given complexSearch with addRecipeInformation+addRecipeNutrition, when used as a single call instead of complexSearch + getRecipeInformation, then enrichment goes from 2 calls/meal to 1 with a net quota reduction"
verdict: VALIDATED
related: ["005-spoonacular-recipe-shape", "006-spoonacular-param-audit", "007-ai-search-hints"]
tags: [spoonacular, api, optimization, quota]
---

# Spike 008: Call Consolidation

## What This Validates
Today's enrichment is two API calls per uncached meal: `complexSearch` (1.05 pt) +
`getRecipeInformation?includeNutrition=true` (~2 pt) ≈ 3 points. By upgrading the search
call with `addRecipeInformation=true&addRecipeNutrition=true`, the same data arrives in one
call. With spike 006 + 007 filters making the first match reliable, the variant ladder also
collapses, cutting effective per-meal cost from ~3 points to ~1.06.

## Research

### Sources
- `https://spoonacular.com/food-api/docs` — pricing, parameter semantics
- Existing two-call flow: `supabase/functions/trpc/index.ts:965-1006`
- Spike 005 — confirmed full field set is available via `getRecipeInformation`
- Web search confirmed `complexSearch` with `addRecipeInformation=true` returns extendedIngredients, analyzedInstructions, image, plus dietary flags. With `addRecipeNutrition=true`, full `nutrition.nutrients` array attaches.

### Field availability comparison

| DB field needed | `complexSearch` (today) | `getRecipeInformation` (today) | `complexSearch + addRecipeInformation + addRecipeNutrition` |
|-----------------|-------------------------|----------------------------------|-------------------------------------------------------------|
| `id` | ✓ | ✓ | ✓ |
| `title` | ✓ | ✓ | ✓ |
| `image` | ✓ | ✓ | ✓ |
| `extendedIngredients` | ✗ | ✓ | ✓ |
| `analyzedInstructions[].steps[].step` | ✗ | ✓ | ✓ |
| `nutrition.nutrients[]` | ✗ | ✓ (with `includeNutrition=true`) | ✓ (with `addRecipeNutrition=true`) |
| `cuisines`, `dishTypes`, dietary flags | ✗ | ✓ | ✓ |

**Conclusion:** the consolidated call returns every field spike 005 validated.

### Pricing model

Per-call costs (from docs):

```
complexSearch:
  base                            = 1.000
  per result                      = 0.010
  + addRecipeInformation          = 0.025/result
  + addRecipeNutrition            = 0.025/result
  + addRecipeInstructions         = 0.025/result   (subset of analyzedInstructions; not needed)
  + any nutrient min/max filter   = 1.000 flat
  + fillIngredients=true          = 0.025/result

getRecipeInformation:
  base                            = 1.000
  + includeNutrition=true         = ~1.000   (treated as separate analysis)
```

### Cost scenarios

**Scenario 1 — today, uncached miss, first-variant hit, with `getRecipeInformation`:**
```
complexSearch?number=5                                = 1 + 0.01×5 = 1.05
getRecipeInformation/{id}?includeNutrition=true       ≈ 2.00
TOTAL                                                 ≈ 3.05 points
```

**Scenario 2 — today, multi-variant fallback (spike 005 ladder), 3 variants tried before hit:**
```
3 × complexSearch?number=5                            = 3 × 1.05 = 3.15
getRecipeInformation                                   ≈ 2.00
TOTAL                                                 ≈ 5.15 points
```

**Scenario 3 — proposed (consolidated), with strong filters from 006+007, number=1:**
```
complexSearch?number=1&addRecipeInformation&addRecipeNutrition
  = 1 + (0.01 + 0.025 + 0.025) × 1
  = 1 + 0.06
  = 1.06 points
TOTAL                                                 = 1.06 points
```

**Scenario 4 — proposed, first-call miss, one fallback retry with relaxed soft filters:**
```
2 × consolidated complexSearch                        = 2 × 1.06 = 2.12 points
TOTAL                                                 = 2.12 points (still cheaper than today's happy path)
```

**Scenario 5 — proposed, all fallbacks miss (true no-match):**
```
2 × consolidated complexSearch (no recipe to fetch)   = 2.12 points
TOTAL                                                 = 2.12 points
(Today: would have been 1.05 × 6 ladder variants ≈ 6.30 because no getRecipeInformation runs without a match)
```

### Quota impact at 50 pt/day free tier

Daily-budget meal counts:

| Strategy | Points / meal | Meals enrichable / day |
|----------|---------------|------------------------|
| Today, happy path | 3.05 | ~16 |
| Today, with multi-variant fallback typical | 4.10 | ~12 |
| Proposed, hit on first call | 1.06 | ~47 |
| Proposed, with one retry | 2.12 | ~23 |

**Real-world meal count for the app:** 21 meals/plan. Today, a single plan can chew through
the entire daily quota even with cache hits. Proposed model lets a household enrich 2+ full
plans/day before hitting the cap.

### Variant ladder: keep or drop?

The 6-variant ladder in `buildSpoonacularSearchQueries` exists because **title-only search misses
often**. With spike 006 (household pre-filters) + spike 007 (LLM search hints supplying
`includeIngredients`, `cuisine`, `type`), the first call should hit reliably. Strong claim —
needs measurement post-implementation. Proposed approach:

- **Drop the ladder for the consolidated path.** Single call with all filters.
- **One escalation step on miss:** drop soft filters (`equipment`, `maxReadyTime`, `cuisine`),
  retry once. Never drop hard filters (`intolerances`, `excludeIngredients`, `diet`).
- **Telemetry:** log first-call hit rate. If it falls below ~80%, reconsider — but that would
  also indicate the LLM hints are weak and the response should be improved upstream.

### Edge cases & caveats

1. **`number=1` vs `number=5`.** `number=5` costs marginally more (1 + 0.06×5 = 1.30) but lets
   the post-filter `extractBlockedTerm` re-rank if needed. Recommendation: stick with `number=1`
   when filters are strong; bump to `number=3` only if telemetry shows the top result is rejected
   often by the post-filter safety net. Current code reads `results[0]` anyway — the extra
   results would be wasted bytes today.

2. **Dropping `getRecipeInformation` removes one safety net.** The dedicated endpoint historically
   has more complete `analyzedInstructions` than what `addRecipeInformation` returns. Need to
   verify after rollout: if a meaningful fraction of recipes return empty
   `analyzedInstructions` from the consolidated call, the fallback to a one-off
   `getRecipeInformation` for that recipe is fine — paid only when it happens, and the recipe
   gets cached in `spoonacular_cache` for future use.

3. **`includeNutrition` vs `addRecipeNutrition`.** Different parameter names for the two endpoints,
   same data. `addRecipeNutrition` auto-enables `addRecipeInformation` per docs — no need to set
   both, but explicit-is-better-than-implicit is the recommendation here.

4. **Cache compatibility.** `spoonacular_cache` schema (validated in spike 001) stores fields by
   name (`ingredients`, `nutrition`, `instructions`, `image_url`). Source of those fields is
   irrelevant — both call shapes produce the same cache payload. **Zero migration needed.**

5. **Quota header preservation.** `buildQuotaSnapshot` reads `x-api-quota-*` headers. The
   consolidated call returns the same headers — telemetry stays correct. Just delete the second
   `insertUsageEvent` call (`trpc/index.ts:1028-1038`); only the first one fires now.

### Recommended call shape (combining 006 + 007 + 008)

```
GET /recipes/complexSearch
  ?query={meal.title}
  &cuisine={search_hints.cuisine}                  # 007
  &type={search_hints.type ?? meal_type→type}      # 007
  &diet={household.shared_diet}                    # 006
  &intolerances={household.intolerances}           # 006
  &includeIngredients={search_hints.include}       # 007
  &excludeIngredients={household.avoidances ∪ search_hints.exclude}  # 006+007
  &equipment={household.equipment}                 # 006 (soft, droppable)
  &maxReadyTime={min(skill_cap, hints.max_ready)}  # 006+007 (soft, droppable)
  &instructionsRequired=true
  &number=1
  &sort=popularity
  &addRecipeInformation=true                       # 008
  &addRecipeNutrition=true                         # 008
```

Single network round-trip. Single quota debit. All data the existing `buildEnrichedMealPatch`
function expects, in one response. The post-filter `extractBlockedTerm` stays as a safety net
against rare false-positives from Spoonacular's own indexing.

### Migration risk

- **Code surface:** `findBestSpoonacularMatch` becomes a single call; the loop in
  `spoonacular-search.ts` collapses; the second `fetchSpoonacularJson` call inside
  `meal.enrich` (`trpc/index.ts:977-979`) is deleted.
- **Cache:** unchanged. Reads/writes the same `spoonacular_cache` rows.
- **Telemetry:** one `insertUsageEvent` per uncached enrichment instead of two. The
  `endpoint` field becomes `recipes/complexSearch?addRecipeInformation` for traceability.
- **Test fixtures:** `spoonacular-search.test.ts` keeps testing the query-builder logic;
  the deleted ladder variants need their tests removed. Edge-fn integration tests need
  fixture updates to a single-response shape.
- **Backward compatibility:** none required. Cached recipes already populated under the old
  flow read the same. New writes use the new shape but produce identical cache rows.

## Investigation Trail

- **Initial framing:** "Can we collapse the two-call flow?" Yes, by upgrading complexSearch.
- **First doubt:** does `addRecipeInformation` truly return `analyzedInstructions` and
  `extendedIngredients`? Confirmed via web search — yes, including the steps[] structure spike
  005 mapped to the `instructions text[]` column.
- **Second doubt:** is the cost actually lower? Did the math (above). Even with a fallback
  retry, the consolidated call beats today's happy path. The math shifts dramatically when
  combined with spike 006 + 007 filters that should remove the multi-variant ladder.
- **Surprise 1:** `number=5` adds 4× the per-result cost for results we never read (we already
  take `results[0]`). Recommendation: drop to `number=1` post-consolidation. ~1.06 pt/meal.
- **Surprise 2:** Worst-case cost (no match found, retry) is **lower** than today's worst-case
  (6 ladder variants × 1.05). Today's failure mode is more expensive than success.
- **Decision:** Recommend the full stack — adopt 006 (filters) + 007 (LLM hints) + 008
  (consolidated call) together. Each works alone, but together they multiply: better filters
  → fewer fallbacks → cheaper consolidated call carries the load. Rolling out 008 alone
  without 006/007 is still a win (~1.30 pt/meal with `number=5`) but leaves precision on the
  table.

## Results

VALIDATED — call consolidation is a quota and latency win. Combined with spikes 006 + 007:
- Effective cost: **3.05 pt/meal → 1.06 pt/meal** (~65% reduction)
- Network round-trips: **2 → 1** per uncached enrichment
- Worst-case (no match): **6.30 pt → 2.12 pt**
- Free-tier daily capacity: **~16 enrichments → ~47 enrichments** at 50 pt/day

**Action items emerging from this spike (not built here):**
- A1. Replace `findBestSpoonacularMatch` two-call flow with single consolidated call
- A2. Drop the multi-variant query ladder once 006/007 filters land; keep `buildSpoonacularSearchQueries`
      around for a soft-fallback retry that drops only soft constraints
- A3. Set `number=1` and reconsider only if telemetry justifies otherwise
- A4. Delete the second `insertUsageEvent` call in `meal.enrich`; consolidate to one event/meal
- A5. Update `spoonacular-search.test.ts` to drop ladder-variant tests
- A6. Telemetry: track first-call hit rate after rollout; alert if < 80%
- A7. Telemetry: track empty `analyzedInstructions` rate from consolidated call; if > ~5%,
      add a one-off `getRecipeInformation` patch step for that recipe (and cache it)

## Combined recommendation across spikes 006 + 007 + 008

The three spikes form a coherent package and should be implemented together as a single phase.
Independent rollouts have weaker payoffs and risk regressions:

- **006 alone:** filter-rich call, but still title-bound and still 2 calls/meal. Modest precision gain.
- **007 alone:** LLM emits hints but they're not used. Wasted tokens.
- **008 alone:** halves call count but doesn't fix precision; still wastes calls on bad matches.

**Together:** precision goes up, calls go down, quota stretches >2.5× further, post-filter
rejections become rare, and the regenerate path improves automatically (same prompt template).
The DB migration is a single jsonb column on `meals`. The code surface is one prompt change,
one normalize helper, and a flow simplification in `meal.enrich`.
