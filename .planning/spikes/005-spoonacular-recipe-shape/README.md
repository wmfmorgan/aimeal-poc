---
spike: "005"
name: spoonacular-recipe-shape
validates: "Given a meal title, when calling complexSearch + getRecipeInformation, then all required fields (title, image, ingredients, nutrition, instructions) are present"
verdict: VALIDATED
related: ["001-supabase-local-schema"]
tags: [spoonacular, api, enrichment]
---

# Spike 005: Spoonacular Recipe Shape

## What This Validates
Does Spoonacular's `complexSearch` + `getRecipeInformation?includeNutrition=true` return
all the fields the architecture needs to populate the `spoonacular_cache` table?

## How to Run
```bash
SPOONACULAR_API_KEY=<your_key> node probe.mjs
```

## What to Expect
All fields marked ✓, verdict VALIDATED.

## Results
VALIDATED. All required fields confirmed for "Ginger Chicken Stir-Fry" (id: 644571):
- title ✓
- image (image_url) ✓
- extendedIngredients [10 items] ✓ — shape: { name, amount, unit, original }
- nutrition.nutrients [32 nutrients] ✓ — Calories, Fat, Saturated Fat, etc.
- analyzedInstructions [1 step group] ✓ — steps[].step is the text

Field mapping for schema:
- ingredients → jsonb: store extendedIngredients array
- nutrition → jsonb: store nutrition.nutrients array
- instructions → text[]: map analyzedInstructions[0].steps[].step
- image_url → text: info.image
- spoonacular_recipe_id → bigint: info.id (number, safe as bigint)
