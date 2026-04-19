# Spoonacular Enrichment

## Validated Patterns

### Two-call enrichment flow
```
complexSearch(title) → recipe id → getRecipeInformation(id, includeNutrition=true)
```

```javascript
// Step 1: find recipe id
const search = await fetch(
  `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(title)}&number=1&apiKey=${KEY}`
);
const { results } = await search.json();
const recipeId = results[0].id;

// Step 2: get full data
const info = await fetch(
  `https://api.spoonacular.com/recipes/${recipeId}/information?includeNutrition=true&apiKey=${KEY}`
).then(r => r.json());
```

### Confirmed field mapping to DB schema
All fields required by `spoonacular_cache` table are present:

| DB column | Spoonacular field | Notes |
|-----------|-------------------|-------|
| `spoonacular_recipe_id` | `info.id` | number → safe as bigint |
| `title` | `info.title` | string |
| `image_url` | `info.image` | full URL, e.g. `https://img.spoonacular.com/recipes/644571-556x370.jpg` |
| `ingredients` | `info.extendedIngredients` | array → store as jsonb |
| `nutrition` | `info.nutrition.nutrients` | array of 32 nutrients → store as jsonb |
| `instructions` | `info.analyzedInstructions[0].steps[].step` | map to text[] |

### Ingredient object shape
```json
{
  "name": "broccoli",
  "amount": 16,
  "unit": "ounces",
  "original": "16 ounces broccoli (frozen)"
}
```
Store `extendedIngredients` array directly as jsonb — `original` is the human-readable string.

### Nutrition object shape
```json
{ "name": "Calories", "amount": 319.62, "unit": "kcal" }
```
32 nutrients returned including: Calories, Fat, Saturated Fat, Carbohydrates, Sugar, Fiber,
Protein, Sodium, etc.

### Instructions extraction
```javascript
const instructions = info.analyzedInstructions[0]?.steps?.map(s => s.step) ?? [];
```
Returns text[] compatible with the DB `instructions text[]` column.

## Landmines

- **`complexSearch` returns title match, not exact match** — "Chicken Stir Fry" returns
  "Ginger Chicken Stir-Fry". Cache by `spoonacular_recipe_id`, not by LLM-generated title.
- **`includeNutrition=true` is required** — without it, `nutrition` is null.
- **`analyzedInstructions` can be empty array** — some recipes have no structured instructions.
  Always guard with `?.[0]?.steps ?? []`.

## Constraints

- Free tier: 150 API calls/day. Aggressive caching in `spoonacular_cache` is essential.
- Cache hit check must happen before every Spoonacular call — never call twice for the same id.
- Spoonacular recipe ids are stable — safe to cache indefinitely.
- Max 5 concurrent enrichment calls to respect free-tier rate limits (per architecture).

## Origin
Synthesized from spike: 005
Source files: `sources/005-spoonacular-recipe-shape/`
