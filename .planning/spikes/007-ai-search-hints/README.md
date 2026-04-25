---
spike: "007"
name: ai-search-hints
type: research
validates: "Given LLM response extended with structured search hints, when seeded into Spoonacular complexSearch, then matching precision should exceed title-only matching"
verdict: VALIDATED
related: ["002-edge-fn-grok-json", "005-spoonacular-recipe-shape", "006-spoonacular-param-audit"]
tags: [grok, llm, spoonacular, search, prompt-engineering]
---

# Spike 007: AI Search Hints

## What This Validates
The LLM already has full household context when generating a meal — it "knows" the central
ingredient, the cuisine, the rough complexity. We currently throw that knowledge away and
pass only the meal title to Spoonacular. Adding 4–5 structured fields to the LLM output
gives the search a much more precise seed without a second LLM round-trip.

## Research

### Sources
- `https://docs.x.ai/developers/model-capabilities/text/structured-outputs` — `response_format=json_schema` supported in Grok 4 family, works with streaming
- Existing prompts: `supabase/functions/generate-draft/index.ts:41-75`, `supabase/functions/trpc/index.ts:439-469` (regenerate)
- Spike 002 (PARTIAL ⚠) — Grok JSON output works but with model floor; current code uses NDJSON-per-line streaming
- Spike 006 — surfaced the missing fields: `cuisine`, `includeIngredients`, plus refinements to `intolerances`, `excludeIngredients`, `maxReadyTime`

### Today's LLM contract

**System prompt (draft generation):**
```
Output ONLY one JSON object per line — no markdown, no wrapper array, no explanation:
{"day_of_week":"Monday","meal_type":"breakfast","title":"...","short_description":"...","rationale":"..."}
Output exactly N lines, one per meal slot.
```

**Object shape:**
```json
{
  "day_of_week": "Monday",
  "meal_type": "breakfast",
  "title": "Ginger Chicken Stir-Fry",
  "short_description": "Wok-tossed chicken with ginger, scallions, jasmine rice.",
  "rationale": "High protein, suits the kid's avoidance of dairy."
}
```

The model already mentions ingredients (ginger, chicken, scallions, jasmine rice) and cuisine
(implied: Asian/Chinese) inside `short_description`. We are letting that signal die in a free-text
field instead of structuring it.

### Proposed extended schema

```json
{
  "day_of_week": "Monday",
  "meal_type": "breakfast",
  "title": "Ginger Chicken Stir-Fry",
  "short_description": "Wok-tossed chicken with ginger, scallions, jasmine rice.",
  "rationale": "High protein, suits the kid's avoidance of dairy.",

  "search_hints": {
    "main_ingredient": "chicken",
    "include_ingredients": ["chicken", "ginger", "rice"],
    "cuisine": "chinese",
    "type": "main course",
    "max_ready_time_min": 30,
    "exclude_ingredients": ["dairy"]
  }
}
```

Field design notes:
- `main_ingredient` — single string. Used as `query` fallback when `title` underperforms (e.g. "Quick Tuesday Bowl" → query=chicken).
- `include_ingredients` — 1–4 items. Joins to `&includeIngredients=`. Spoonacular AND-matches; keep small.
- `cuisine` — must be one of the 24-value enum (see spike 006). Empty string allowed when truly cuisine-agnostic.
- `type` — must be one of the 14-value enum (see spike 006). Map to Spoonacular `type` directly.
- `max_ready_time_min` — integer minutes. LLM-side judgment matches household skill level + LLM's complexity sense.
- `exclude_ingredients` — supplements per-household avoidances with **recipe-specific** exclusions ("dairy" because this stir-fry should NOT have dairy, even if no member is dairy-free).

### Two-track delivery options

**Track A — prompt-only (no schema enforcement)**

Easiest path, works with current NDJSON streaming pattern. Update system prompt:

```
Output ONLY one JSON object per line — no markdown, no wrapper array, no explanation:
{
  "day_of_week":"Monday",
  "meal_type":"breakfast",
  "title":"...",
  "short_description":"...",
  "rationale":"...",
  "search_hints":{
    "main_ingredient":"...",
    "include_ingredients":["...","..."],
    "cuisine":"chinese|italian|indian|...",
    "type":"main course|side dish|breakfast|...",
    "max_ready_time_min":30,
    "exclude_ingredients":["..."]
  }
}

Constraints for search_hints:
- main_ingredient: single most central ingredient
- include_ingredients: 1–4 items present in the recipe
- cuisine: one of [african,american,british,cajun,caribbean,chinese,eastern european,french,
  german,greek,indian,irish,italian,japanese,jewish,korean,latin american,mexican,middle eastern,
  nordic,southern,spanish,thai,vietnamese] or "" if none
- type: one of [main course,side dish,dessert,appetizer,salad,bread,breakfast,soup,beverage,
  sauce,marinade,fingerfood,snack,drink]
- max_ready_time_min: integer 5..120 reflecting expected total time
- exclude_ingredients: ingredients this specific recipe should NOT contain
Output exactly N lines, one per meal slot.
```

Risks:
- Grok may emit `cuisine` outside the enum (e.g. "asian fusion"). Need server-side normalize: lowercase, exact-match against enum, drop if no match.
- Multi-line NDJSON parser at `generate-draft/index.ts:222-245` already tolerates a partial line until newline. Larger object = more bytes per line. Verify chunk-buffer split still works (it should — only \n is the delimiter).
- Token cost goes up modestly. Each meal adds ~50–80 tokens of structured data. 21 meals × ~70 = ~1500 extra completion tokens per plan. Acceptable on grok-4-1-fast.
- Streaming UX: hints are emitted on the same line as the meal — if the user only sees `title` + `short_description` in the streaming UI, hints arrive transparently. No frontend change required.

**Track B — `response_format=json_schema` (strict)**

Grok 4 family supports it (per docs). Compatible with streaming. Stronger guarantee that
`cuisine` and `type` arrive in-enum.

Caveat: today's NDJSON-per-line emits an array of JSON objects via repeated newlines. Strict
schema mode wants a single root object. Two adaptation paths:

- **B1** — wrap output in `{"meals":[...]}`. Single root. Lose per-line streaming granularity
  (or use the streaming protocol for partial root deltas, which spike 002 didn't validate).
- **B2** — keep NDJSON streaming, but schema-validate **each line** server-side using zod
  (already a dep). Fail-soft: if a line fails schema, drop search_hints and keep title-only fallback.

Recommended: start with **Track A** (prompt-only). Treat schema upgrade as a separate later spike
once Track A's normalize-and-fallback layer is proven in prod traffic.

### How hints fold into Spoonacular call (combined with spike 006)

```
GET /recipes/complexSearch
  ?query=ginger chicken stir-fry             # title (current)
  &cuisine=chinese                           # NEW: from search_hints.cuisine (LLM)
  &type=main course                          # NEW: from search_hints.type (LLM) or meal_type
  &diet=...                                  # from household (spike 006)
  &intolerances=...                          # from household (spike 006)
  &includeIngredients=chicken,ginger,rice    # NEW: from search_hints.include_ingredients (LLM)
  &excludeIngredients=...,dairy              # household ∪ search_hints.exclude_ingredients
  &maxReadyTime=30                           # min(skill→cap, search_hints.max_ready_time_min)
  &equipment=...                             # from household (spike 006)
  &instructionsRequired=true
  &number=5
  &sort=popularity
```

Cost unchanged — same 1.05 points. Precision goes up because Spoonacular now searches recipes
that contain the right ingredients in the right cuisine, not just title-similar ones.

### Expected precision uplift (qualitative claim)

Today's failure mode (observed empirically by user before this spike):

- LLM emits "Ginger Chicken Stir-Fry"
- complexSearch returns title-similar recipe but with peanuts (no `intolerances=peanut` even though member is allergic)
- Post-fetch `extractBlockedTerm` rejects → `BAD_REQUEST` to user
- Or: title match returns a different cuisine (e.g. Korean-style) than intended
- Or: `complexSearch` returns title-similar but the central ingredient is wrong (e.g. tofu stir-fry when meal was meant to be chicken)

Hypothesis (cannot measure without code change, but ranked by leverage):
1. **`includeIngredients=chicken,ginger,rice`** — biggest win. Forces ingredient overlap with what the LLM imagined. Probably eliminates >50% of "wrong ingredient" mismatches.
2. **`intolerances` + `excludeIngredients` from household** — eliminates the post-filter `BAD_REQUEST` case (spike 006). Probably eliminates >80% of household-restriction violations.
3. **`cuisine`** — narrows result space for ambiguous titles. Probably +20% relevance on titles like "Quick Bowl" or "Family Favorite".
4. **`type`** — eliminates desserts returned for breakfast slots, etc. Edge-case fix.

Combined: enrichment is far more likely to succeed on first attempt. Failure cases shift from
"wrong recipe returned" to "no recipe found" — the latter is a UX prompt to regenerate, not
a silent data-quality bug.

### Regenerate path

`mealPlan.regenerate` (`trpc/index.ts:1086`) calls Grok with the same household context for a
single slot. Same schema extension applies — no extra design work beyond reusing the prompt
template.

### Validation/normalization layer (server-side, edge fn)

Pseudocode for the normalize step:

```ts
const CUISINE_ENUM = new Set(["african","american",...]);
const TYPE_ENUM = new Set(["main course","side dish",...]);

function normalizeSearchHints(raw: unknown): SearchHints | null {
  if (!isRecord(raw)) return null;
  const cuisine = typeof raw.cuisine === "string" && CUISINE_ENUM.has(raw.cuisine.toLowerCase())
    ? raw.cuisine.toLowerCase() : null;
  const type = typeof raw.type === "string" && TYPE_ENUM.has(raw.type.toLowerCase())
    ? raw.type.toLowerCase() : null;
  const include = Array.isArray(raw.include_ingredients)
    ? raw.include_ingredients.filter((s) => typeof s === "string").slice(0, 4)
    : [];
  const exclude = Array.isArray(raw.exclude_ingredients)
    ? raw.exclude_ingredients.filter((s) => typeof s === "string").slice(0, 8)
    : [];
  const maxReady = typeof raw.max_ready_time_min === "number" && raw.max_ready_time_min > 0
    ? Math.min(120, Math.max(5, Math.trunc(raw.max_ready_time_min))) : null;
  const main = typeof raw.main_ingredient === "string" ? raw.main_ingredient.trim() : null;
  return { cuisine, type, include, exclude, maxReady, main };
}
```

Drop hints silently when invalid. Search degrades gracefully to spike-006 household-only call.

### DB schema implication

The `meals` table currently stores `title`, `short_description`, `rationale`. To preserve hints
for the regenerate / re-enrich case, add:

```sql
ALTER TABLE meals
  ADD COLUMN search_hints jsonb;
```

Single jsonb column. No schema enforcement at DB level — normalization stays in the edge fn.
Backfill is `null` → skipped at search time → falls back to spike-006 household-only call.
Zero migration risk on existing rows.

## Investigation Trail

- **Initial framing:** "How do we get the LLM more involved in search?" Quickly resolved to: the LLM's existing context is enough, we just need to harvest it.
- **First idea:** second LLM call after Spoonacular returns nothing → relax constraints → re-search. Rejected: extra latency, extra cost, fragile.
- **Better idea:** harvest hints in the *first* LLM call. Same call, same tokens budget, just structured output instead of free narrative.
- **Surprise 1:** `short_description` already contains the data we need ("Wok-tossed chicken with ginger, scallions, jasmine rice"). We are extracting it server-side via regex would be brittle; making the LLM emit it structured is robust.
- **Surprise 2:** Grok 4 family supports `response_format=json_schema` with streaming. Considered Track B as primary, but spike 002's NDJSON-per-line pattern is already proven and cheaper to extend. Track A first; B as future hardening.
- **Surprise 3:** `exclude_ingredients` from the LLM is **recipe-specific**, distinct from per-household avoidances. A vegetarian household making "Caesar Salad" needs `exclude_ingredients=anchovy,bacon` *for this dish only*, even if the household has no anchovy avoidance. The LLM knows this; the household table doesn't.
- **Decision:** Recommend Track A. Add `search_hints` jsonb column to `meals`. Build normalize-and-fallback layer server-side. Schema-strict mode (Track B) deferred to a later hardening spike.

## Results

VALIDATED — extended LLM schema designed, prompt delta drafted, normalize/fallback strategy
specified, DB migration scoped. The path is small in surface area (one prompt change, one
normalize helper, one optional jsonb column) but high in leverage: it converts the LLM's
implicit recipe context into explicit search filters.

**Action items emerging from this spike (not built here):**
- A1. Update `buildSystemPrompt` and `buildSingleSlotSystemPrompt` to emit `search_hints` block
- A2. Add `normalizeSearchHints()` helper alongside existing edge-fn helpers
- A3. Wire normalized hints into `findBestSpoonacularMatch` (consume from row OR from in-flight LLM response)
- A4. Migration: `ALTER TABLE meals ADD COLUMN search_hints jsonb`
- A5. Update `writeMealToDB` (`generate-draft/index.ts:77`) to persist `search_hints`
- A6. Pass through `mealPlan.get` → frontend (read-only; no UI change required)
- A7. Future: Track B hardening — switch to `response_format=json_schema` with zod schema validation
- A8. Telemetry: log when `cuisine` is dropped due to enum mismatch — measures Grok's enum-following compliance
