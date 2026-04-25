---
spike: "006"
name: spoonacular-param-audit
type: research
validates: "Given UI household data, when mapped against complexSearch params, then a complete mapping exists with all gaps and normalization needs flagged"
verdict: VALIDATED
related: ["005-spoonacular-recipe-shape"]
tags: [spoonacular, api, search, research]
---

# Spike 006: Spoonacular Param Audit

## What This Validates
Map every household-data field captured in the UI to the corresponding `complexSearch`
parameter, identify gaps where UI data has no API equivalent (and vice versa), and surface
normalization layers needed to bridge free-text UI inputs to API enums.

## Research

### Sources
- `https://spoonacular.com/food-api/docs` — endpoint params + pricing
- `https://spoonacular.com/application/frontend/downloads/api-blueprint.txt` — enum values
- Existing code: `supabase/functions/trpc/index.ts:343-402`, `supabase/functions/trpc/spoonacular-search.ts`
- Spike 005 — confirmed two-call enrichment flow

### `complexSearch` parameter inventory

**Filter / matching**

| Param | Type | Accepts | Notes |
|-------|------|---------|-------|
| `query` | string | free text | currently the only param sent |
| `cuisine` | string | comma-list (OR) | enum: african, chinese, japanese, korean, vietnamese, thai, indian, british, irish, french, italian, mexican, spanish, middle eastern, jewish, american, cajun, southern, greek, german, nordic, eastern european, caribbean, latin american |
| `excludeCuisine` | string | comma-list (AND) | same enum, exclusion |
| `diet` | string | comma-list (AND/OR via `\|`) | enum: gluten free, ketogenic, vegetarian, lacto-vegetarian, ovo-vegetarian, vegan, pescetarian, paleo, primal, low FODMAP, whole30 |
| `intolerances` | string | comma-list (AND) | enum: dairy, egg, gluten, grain, peanut, seafood, sesame, shellfish, soy, sulfite, tree nut, wheat |
| `type` | string | single | enum: main course, side dish, dessert, appetizer, salad, bread, breakfast, soup, beverage, sauce, marinade, fingerfood, snack, drink |
| `equipment` | string | comma-list (OR) | enum lookup needed (~50 values, e.g. blender, frying pan, oven, slow cooker) |
| `includeIngredients` | string | comma-list | must contain |
| `excludeIngredients` | string | comma-list | must NOT contain |
| `titleMatch` | string | substring | post-filter on title |
| `maxReadyTime` | number | minutes | hard cap |
| `min/max{Calories,Protein,Carbs,Fat,Sodium,Fiber,Sugar,...}` | number | per-nutrient min/max | 30+ nutrients |

**Result shape control**

| Param | Effect | Cost delta |
|-------|--------|------------|
| `addRecipeInformation` | inline full recipe | +0.025/result |
| `addRecipeNutrition` | inline nutrition (auto-enables `addRecipeInformation`) | +0.025/result |
| `addRecipeInstructions` | inline analyzed instructions | +0.025/result |
| `fillIngredients` | also resolves ingredient match metadata | +0.025/result |
| `instructionsRequired` | drop recipes without instructions | free |
| `ignorePantry` | ignore common pantry items in include/exclude | free |
| `number` / `offset` | paginate (1–100 / 0–900) | base scales by results |
| `sort` | popularity, healthiness, price, time, random, max-used-ingredients, min-missing-ingredients, calories, protein, carbs, fat, fiber, sodium, sugar, ... | free |
| `sortDirection` | asc / desc | free |

**Pricing (per call)**
- Base `complexSearch`: 1 point + 0.01/result
- Nutrient-filter applied: +1 point
- Each `add*` flag: +0.025/result
- `getRecipeInformation`: 1 point + 0.01/result (separate)

### UI → Spoonacular mapping

Source: `households` + `household_members` rows.

| UI field | Type | Maps to | Confidence | Normalization needed |
|----------|------|---------|------------|----------------------|
| `member.allergies[]` | text[] | `intolerances` | **partial** | text → 12-value enum. Words outside enum (e.g. "strawberry") fall through to `excludeIngredients` |
| `member.avoidances[]` | text[] | `excludeIngredients` | high | direct comma-join after lowercase |
| `member.diet_type` | free-text string | `diet` | **partial** | text → 11-value enum. Unknown values discarded |
| `household.appliances[]` | text[] | `equipment` | **partial** | text → equipment enum. Soft signal — pass as `equipment` only if all members agree |
| `household.cooking_skill_level` | enum (beginner/intermediate/advanced) | `maxReadyTime` (heuristic) | low | beginner→30min, intermediate→60min, advanced→none |
| (no UI field) | — | `cuisine` | — | not captured; would need LLM hint (spike 007) |
| (no UI field) | — | `includeIngredients` | — | not captured; LLM hint candidate |
| (no UI field) | — | `type` (breakfast/lunch/dinner) | — | already in `meals.meal_type` row — easy add |
| (no UI field) | — | `min/maxCalories` etc. | — | not captured; future feature |

### Aggregation across members

Households have multiple members. Restrictions must aggregate:

- `intolerances` → **union** of all members' allergies (any member's allergy blocks the recipe)
- `excludeIngredients` → **union** of all members' avoidances
- `diet` → **intersection** when all members share the same diet enum; else omit (no diet filter)
  - Edge case: one member vegan + one omnivore → cannot pass `diet=vegan`, but vegan member's "meat" avoidance must be honored via `excludeIngredients`
  - Reality: meal generation is per-household, so the LLM already chose a meal that satisfies everyone. Pre-filter Spoonacular against the strictest member's diet only when shared.

### Aggregation rules — proposed

```
diet = intersect(members.diet_type) → single enum or null
intolerances = union(members.allergies) ∩ KNOWN_INTOLERANCE_ENUM
excludeIngredients = union(members.allergies, members.avoidances) − ingredients_already_in_intolerances
includeIngredients = (none from UI; LLM-emitted in spike 007)
type = mealType (already on meals row: breakfast/lunch/dinner — direct map)
equipment = union(household.appliances) ∩ KNOWN_EQUIPMENT_ENUM
maxReadyTime = skill→{beginner:30, intermediate:60, advanced:null}
```

### Gaps the audit revealed

1. **`diet_type` is free-text** in DB, not enum (`household_members.diet_type text`). UI must offer a curated dropdown OR backend must fuzzy-match to the 11-value enum. Free-text "lactose intolerant" today maps to no diet but should be `intolerances=dairy`.
2. **No cuisine signal** anywhere. Strong candidate for LLM hint (spike 007) — without it, every meal title gets the "popular" cuisine bias.
3. **No ingredient-level signal**. LLM produces `title` + `short_description` but not the central ingredient. `includeIngredients` is the highest-leverage param we are not sending.
4. **Allergy text may be specific** (e.g. "strawberry", "pine nut") and not in the 12-value `intolerances` enum. These fall through to `excludeIngredients` — a softer filter (Spoonacular only matches against tagged extended ingredients, not free narrative).
5. **`extractBlockedTerm` is post-filter**. Currently runs after `getRecipeInformation` returns — wastes the second call if the recipe was bad. Pre-filtering via `intolerances` + `excludeIngredients` should fail-closed at search time, freeing the post-filter to be a final safety net.
6. **Skill level is unused** for time bounding. Beginners get the same complex 90-minute recipes as advanced cooks.
7. **`appliances` is unused**. Slow-cooker household gets sheet-pan recipes with no oven? Edge case, but `equipment` filter is free.

## Recommended call shape

For an enrichment search of meal "Ginger Chicken Stir-Fry" in a household {vegan member, gluten-free member, blender + frying pan, intermediate skill, dinner slot, avoids: peanuts, allergies: shellfish}:

```
GET /recipes/complexSearch
  ?query=ginger chicken stir-fry
  &diet=vegan,gluten free                    # AND-joined when shared (here: not shared, drop)
  &intolerances=shellfish,peanut             # union of allergies, mapped to enum
  &excludeIngredients=shellfish,peanut       # belt-and-suspenders for narrative match
  &equipment=blender,frying pan              # union of household appliances
  &type=main course                          # mapped from meals.meal_type=dinner
  &maxReadyTime=60                           # from intermediate skill
  &instructionsRequired=true                 # never enrich a recipe with no steps
  &number=5                                  # match current behavior
  &sort=popularity                           # bias toward known-good recipes
```

Cost: 1 (base) + 0.01 × 5 (results) = **1.05 points** — same as today's single search. Nutrient filters not used here (would add +1).

### Multi-pass fallback

Current `buildSpoonacularSearchQueries` already produces 6 query variants and stops at first hit. Keep that pattern but apply the **filters consistently across all variants** — never relax filters to find a match. Empty result with strict filters is correct; relaxing filters returns recipes that violate household constraints.

Optional escalation if all variants miss:
1. drop `equipment` (soft constraint)
2. drop `maxReadyTime` (soft constraint)
3. drop `cuisine` if added (LLM hint, soft)
4. NEVER drop `intolerances`, `excludeIngredients`, `diet`

## Investigation Trail

- **Initial assumption:** UI captures enough to send all useful params. **Reality:** UI captures ~5 of ~10 useful filter dimensions. Cuisine and central-ingredient are the big misses — both LLM-derivable (spike 007).
- **Surprise 1:** `diet_type` is free-text in DB. Surfaced because the audit forced enum lookup. UI dropdown is a small, separate task; backend fuzzy-mapper is a fallback.
- **Surprise 2:** Spoonacular's `intolerances` is only 12 values. "Strawberry allergy" must route to `excludeIngredients`. Allergy data needs a two-bucket split: enum match → `intolerances`, free text → `excludeIngredients`.
- **Surprise 3:** `addRecipeInformation` + `addRecipeNutrition` together inline everything spike 005 fetched in a second call. Promoted to separate spike 008.
- **Surprise 4:** The post-hoc `extractBlockedTerm` filter is doing work that pre-filter params (`intolerances`, `excludeIngredients`) would do for free at search time. Keep it as defense-in-depth, but it should rarely fire after pre-filters land.
- **Decision:** Keep the existing query-variant fallback ladder, but never relax restriction params (intolerances, excludeIngredients, diet). Only soft signals (equipment, maxReadyTime, cuisine) may be dropped.

## Results

VALIDATED — full mapping table produced. UI captures direct mappings for `intolerances`, `excludeIngredients`, `equipment` (with enum normalization), and indirect mapping for `diet` and `maxReadyTime`. Two high-leverage params (`cuisine`, `includeIngredients`) have no UI source — handed to spike 007.

**Action items emerging from this spike (not built here, per "don't change code"):**
- A1. Add `MAP_DIET_TYPE`, `MAP_INTOLERANCE`, `MAP_EQUIPMENT` constant tables on the edge-fn side
- A2. Build `aggregateHouseholdRestrictions(household)` helper that produces a normalized restriction object
- A3. Extend `buildSpoonacularSearchQueries` to accept the restriction object and bake it into every variant
- A4. Convert `diet_type` UI input from free-text to dropdown (separate frontend task)
- A5. Keep `extractBlockedTerm` as post-filter safety net but expect near-zero false positives once pre-filter params ship
