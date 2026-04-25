# Spoonacular Search Precision

The original two-call enrichment flow (spike 005) proved Spoonacular returns the right
fields. Spikes 006–008 took the next layer: how to **find the right recipe in the first
place**, using all the household data the UI already collects, plus structured hints harvested
from the LLM, and how to deliver it in one network round-trip instead of two.

This blueprint folds 006 + 007 + 008 into a single recipe. They are coupled — implement together.

## Requirements

- Cache-first reuse stays mandatory (free-tier 50 pt/day budget). Existing `spoonacular_cache`
  schema is unchanged.
- Hard household restrictions (`intolerances`, `excludeIngredients`, `diet`) are non-negotiable.
  Never relax them in fallback retries.
- The LLM (`grok-4-1-fast-non-reasoning`) is the source of truth for recipe-specific search
  hints. The household table is the source of truth for cross-recipe restrictions.
- Backwards-compatible with existing cached recipes. No data migration risk.

## How to Build It

### Step 1: Server-side enum constants and mappers

Add to `supabase/functions/trpc/` (or extract to `_shared/spoonacular-mappings.ts` so both
`generate-draft` and `trpc` can import).

```ts
export const CUISINE_ENUM = new Set([
  "african","american","british","cajun","caribbean","chinese","eastern european",
  "french","german","greek","indian","irish","italian","japanese","jewish","korean",
  "latin american","mexican","middle eastern","nordic","southern","spanish","thai","vietnamese",
]);

export const TYPE_ENUM = new Set([
  "main course","side dish","dessert","appetizer","salad","bread","breakfast","soup",
  "beverage","sauce","marinade","fingerfood","snack","drink",
]);

export const DIET_ENUM = new Set([
  "gluten free","ketogenic","vegetarian","lacto-vegetarian","ovo-vegetarian","vegan",
  "pescetarian","paleo","primal","low fodmap","whole30",
]);

export const INTOLERANCE_ENUM = new Set([
  "dairy","egg","gluten","grain","peanut","seafood","sesame","shellfish","soy","sulfite",
  "tree nut","wheat",
]);

// Equipment enum is large (~50 values). Hardcode the subset the UI dropdown actually offers.
export const EQUIPMENT_ENUM = new Set([
  "blender","oven","frying pan","slow cooker","pressure cooker","grill","microwave",
  "food processor","stand mixer","immersion blender","wok","dutch oven",
]);

const MEAL_TYPE_TO_SPOONACULAR: Record<string, string> = {
  breakfast: "breakfast",
  lunch: "main course",
  dinner: "main course",
};

export function mealTypeToSpoonacularType(mealType: string): string | null {
  return MEAL_TYPE_TO_SPOONACULAR[mealType] ?? null;
}
```

### Step 2: Aggregate household restrictions

```ts
type Member = { allergies: string[]; avoidances: string[]; diet_type: string | null };
type HouseholdRestrictions = {
  diet: string | null;          // single enum value when all members agree, else null
  intolerances: string[];       // enum values, union across members
  excludeIngredients: string[]; // free-text avoidances + non-enum allergies
  equipment: string[];          // enum values from household.appliances
  maxReadyTime: number | null;  // derived from skill level
};

const SKILL_TIME_CAP: Record<string, number | null> = {
  beginner: 30,
  intermediate: 60,
  advanced: null,
};

export function aggregateHouseholdRestrictions(
  members: Member[],
  appliances: string[],
  skillLevel: string
): HouseholdRestrictions {
  const intolerances = new Set<string>();
  const excludeIngredients = new Set<string>();
  const memberDiets = new Set<string>();

  for (const m of members) {
    for (const a of m.allergies) {
      const lower = a.trim().toLowerCase();
      if (INTOLERANCE_ENUM.has(lower)) intolerances.add(lower);
      else if (lower) excludeIngredients.add(lower);
    }
    for (const a of m.avoidances) {
      const lower = a.trim().toLowerCase();
      if (lower) excludeIngredients.add(lower);
    }
    if (m.diet_type) {
      const lower = m.diet_type.trim().toLowerCase();
      if (DIET_ENUM.has(lower)) memberDiets.add(lower);
    }
  }

  const diet = memberDiets.size === 1 ? [...memberDiets][0] : null;
  const equipment = appliances
    .map((a) => a.trim().toLowerCase())
    .filter((a) => EQUIPMENT_ENUM.has(a));

  return {
    diet,
    intolerances: [...intolerances],
    excludeIngredients: [...excludeIngredients],
    equipment,
    maxReadyTime: SKILL_TIME_CAP[skillLevel] ?? null,
  };
}
```

### Step 3: LLM prompt extension (search hints)

Update `buildSystemPrompt` in `supabase/functions/generate-draft/index.ts` AND
`buildSingleSlotSystemPrompt` in `supabase/functions/trpc/index.ts`:

```
Output ONLY one JSON object per line — no markdown, no wrapper array, no explanation:
{
  "day_of_week":"Monday","meal_type":"breakfast",
  "title":"...","short_description":"...","rationale":"...",
  "search_hints":{
    "main_ingredient":"...",
    "include_ingredients":["...","..."],
    "cuisine":"<one of: african,american,british,cajun,caribbean,chinese,eastern european,french,german,greek,indian,irish,italian,japanese,jewish,korean,latin american,mexican,middle eastern,nordic,southern,spanish,thai,vietnamese> or \"\"",
    "type":"<one of: main course,side dish,dessert,appetizer,salad,bread,breakfast,soup,beverage,sauce,marinade,fingerfood,snack,drink>",
    "max_ready_time_min":30,
    "exclude_ingredients":["..."]
  }
}
Constraints:
- include_ingredients: 1–4 ingredients present in this recipe
- max_ready_time_min: integer 5..120
- exclude_ingredients: ingredients THIS recipe must NOT contain (in addition to per-household avoidances)
Output exactly N lines, one per meal slot.
```

### Step 4: Normalize hints server-side (drop on invalid)

```ts
type SearchHints = {
  cuisine: string | null;
  type: string | null;
  includeIngredients: string[];
  excludeIngredients: string[];
  maxReadyTime: number | null;
  mainIngredient: string | null;
};

export function normalizeSearchHints(raw: unknown): SearchHints | null {
  if (!isRecord(raw)) return null;

  const cuisineRaw = typeof raw.cuisine === "string" ? raw.cuisine.trim().toLowerCase() : "";
  const typeRaw = typeof raw.type === "string" ? raw.type.trim().toLowerCase() : "";

  return {
    cuisine: CUISINE_ENUM.has(cuisineRaw) ? cuisineRaw : null,
    type: TYPE_ENUM.has(typeRaw) ? typeRaw : null,
    includeIngredients: Array.isArray(raw.include_ingredients)
      ? raw.include_ingredients
          .filter((s): s => typeof s === "string" && s.trim().length > 0)
          .map((s: string) => s.trim().toLowerCase())
          .slice(0, 4)
      : [],
    excludeIngredients: Array.isArray(raw.exclude_ingredients)
      ? raw.exclude_ingredients
          .filter((s): s => typeof s === "string" && s.trim().length > 0)
          .map((s: string) => s.trim().toLowerCase())
          .slice(0, 8)
      : [],
    maxReadyTime: typeof raw.max_ready_time_min === "number" && raw.max_ready_time_min > 0
      ? Math.min(120, Math.max(5, Math.trunc(raw.max_ready_time_min)))
      : null,
    mainIngredient: typeof raw.main_ingredient === "string" && raw.main_ingredient.trim().length > 0
      ? raw.main_ingredient.trim().toLowerCase()
      : null,
  };
}
```

Drop the entire hints object on any structural failure. Never throw — fall through to a
title-only call.

### Step 5: Persist hints alongside meal

Migration:
```sql
ALTER TABLE meals ADD COLUMN search_hints jsonb;
```

Update `writeMealToDB` (`generate-draft/index.ts`) and the regenerate insert
(`trpc/index.ts`) to include `search_hints: normalizeSearchHints(parsed.search_hints)`.

Pass-through in `mealPlan.get` query — read it, return it as-is. Frontend ignores the field
today; it's only used server-side at enrich time.

### Step 6: Consolidated complexSearch call

Replace `findBestSpoonacularMatch` and the two-call sequence in `meal.enrich`:

```ts
async function searchAndEnrich(
  meal: { title: string; meal_type: string; search_hints: SearchHints | null },
  household: HouseholdRestrictions,
  retryWithRelaxedFilters = false,
) {
  const hints = meal.search_hints;
  const params: Record<string, string> = {
    query: meal.title,
    number: "1",
    instructionsRequired: "true",
    sort: "popularity",
    addRecipeInformation: "true",
    addRecipeNutrition: "true",
  };

  // Hard filters — never dropped
  if (household.diet) params.diet = household.diet;
  if (household.intolerances.length > 0) params.intolerances = household.intolerances.join(",");
  const excludes = [...new Set([...household.excludeIngredients, ...(hints?.excludeIngredients ?? [])])];
  if (excludes.length > 0) params.excludeIngredients = excludes.join(",");

  // LLM-derived recipe-specific filters
  if (hints?.includeIngredients.length) params.includeIngredients = hints.includeIngredients.join(",");
  if (hints?.cuisine) params.cuisine = hints.cuisine;

  const typeValue = hints?.type ?? mealTypeToSpoonacularType(meal.meal_type);
  if (typeValue) params.type = typeValue;

  // Soft filters — droppable on retry
  if (!retryWithRelaxedFilters) {
    if (household.equipment.length > 0) params.equipment = household.equipment.join(",");
    const timeCap = hints?.maxReadyTime != null && household.maxReadyTime != null
      ? Math.min(hints.maxReadyTime, household.maxReadyTime)
      : (hints?.maxReadyTime ?? household.maxReadyTime);
    if (timeCap != null) params.maxReadyTime = String(timeCap);
  }

  const response = await fetchSpoonacularJson("/recipes/complexSearch", params);
  const result = response.json?.results?.[0];

  if (!result?.id) {
    if (retryWithRelaxedFilters) return null;
    return searchAndEnrich(meal, household, true);
  }

  // result is the full recipe — extendedIngredients, nutrition, analyzedInstructions inline
  return { recipe: result, response };
}
```

### Step 7: Single usage event

Delete the second `insertUsageEvent` call (the one tagged `recipes/{id}/information`).
The consolidated call produces one event tagged `recipes/complexSearch?addRecipeInformation`.

### Step 8: Telemetry

Add three soft KPIs to dev-page diagnostics:

- **First-call hit rate** — `count(cache_hit=false AND retryWithRelaxedFilters=false) / total enrichments`
- **Enum drop rate** — count of `cuisine`/`type` values from the LLM that didn't match enums (log once per drop)
- **Empty instructions rate** — count of recipes returned with `analyzedInstructions=[]`

If first-call hit rate < ~80% in production telemetry, the LLM hints are weak — fix upstream
in the prompt rather than relaxing filters.

## What to Avoid

- **Do not relax `intolerances`, `excludeIngredients`, or `diet` in retries.** A "no match"
  outcome is correct when household constraints can't be met. Falling back to a wider search
  returns recipes that violate restrictions — same bug class as today's `extractBlockedTerm`
  rejections, just silent.
- **Do not trust the LLM's `cuisine` / `type` values without enum check.** Grok will emit
  "asian fusion" or "main course (vegetarian)" — both must be dropped. Drop-on-invalid is the
  rule; never coerce.
- **Do not leave `diet_type` as free-text in the UI long-term.** Backend fuzzy-mapping is a
  stopgap. Eventually the UI should offer a curated dropdown matching the 11-value enum.
- **Do not bump `number` above 1 without telemetry justification.** Each result costs +0.06
  pt with `addRecipeInformation+addRecipeNutrition` enabled. The first result at `sort=popularity`
  is what we use — extra results are wasted bytes.
- **Do not drop the post-fetch `extractBlockedTerm` filter.** Pre-filters should make it rarely
  fire, but Spoonacular's own ingredient indexing has gaps. Keep it as defense-in-depth.
- **Do not skip the `instructionsRequired=true` flag.** Recipes without analyzed instructions
  break the `instructions text[]` mapping (validated in spike 005).
- **Do not roll out 008 (call consolidation) without 006 + 007.** The consolidated call without
  strong filters costs slightly more per call; the win comes from removing the variant ladder,
  which only happens once filters reliably hit on first try.

## Constraints

- **Spoonacular daily quota:** 50 points free tier. With 006+007+008, ~47 enrichments/day
  (vs ~16 today's happy path). Cache hit cost is 0.
- **`complexSearch` pricing:**
  - Base 1 point + 0.01/result
  - `addRecipeInformation` +0.025/result
  - `addRecipeNutrition` +0.025/result (auto-enables `addRecipeInformation`)
  - Any nutrient min/max filter +1 flat (we don't use these today)
  - `instructionsRequired=true` is free
- **`diet` parameter:** comma-separated list is AND-joined when all members share the same
  diet. Pass single enum or omit; never partial multi-member.
- **`intolerances` parameter:** 12-value enum. Allergies outside the enum (e.g. "strawberry")
  must route to `excludeIngredients` instead.
- **`number=1`:** correct for our usage pattern (we read `results[0]` and discard the rest).
- **LLM token cost:** ~50–80 extra tokens per meal for `search_hints`. ~1500 extra tokens
  per 21-meal plan. Acceptable on `grok-4-1-fast-non-reasoning`.
- **Streaming compatibility:** the per-line NDJSON streaming pattern from spike 002 still
  works — `search_hints` is just more bytes on the same line. Newline remains the chunk
  delimiter.
- **`response_format=json_schema` strict mode:** Grok 4 family supports it with streaming, but
  the current NDJSON-per-line pattern doesn't fit a single-root schema. Defer to a future
  hardening spike unless drop-on-invalid normalize proves insufficient.

## Origin

Synthesized from spikes: 006, 007, 008
Source files available in: `sources/006-spoonacular-param-audit/`, `sources/007-ai-search-hints/`, `sources/008-call-consolidation/`

Builds on spike 005 (`references/spoonacular-enrichment.md` for the foundational two-call
flow that this package replaces).
