---
phase: 7
slug: finalization-and-favorites
status: complete
created: 2026-04-22
---

# Phase 7 — Research

## Scope Summary

Phase 7 closes the loop on the persisted `/plan/:id` workflow by turning enriched meals into a finalized cooking plan with a practical shopping list and a reusable favorites library. The work should extend the existing plan route, right-side flyout shell, and authenticated tRPC layer rather than introducing a new primary route or client-only workflow.

## Pre-Flight Prerequisite

Execution should not begin until Phase 6's live Spoonacular verification gate is closed. `ROADMAP.md` marks Phase 7 as depending on Phase 6, and `STATE.md` still records Phase 6 as awaiting live verification. Phase 7 planning is valid now, but execution should treat that upstream sign-off as a blocking prerequisite.

## Existing Assets To Reuse

### Schema and persistence

- `meal_plans.generation_status` already supports `finalized`.
- `meal_plans.shopping_list` already exists and is the correct persistence target for the generated grocery artifact.
- `meals.is_favorite` already exists and can drive grid and flyout state.
- `favorite_meals` already exists for cross-plan persistence of recipe-backed favorites.
- Enriched meal payloads already live on `meals.ingredients`, `meals.nutrition`, `meals.instructions`, and `meals.image_url`, so Phase 7 does not need a new recipe store.

### Route and UI surfaces

- `src/routes/plan-page.tsx` already owns the persisted plan header, grid, selection-mode, and flyout orchestration.
- `src/components/generation/MealDetailFlyout.tsx` already provides the correct focus-trapped right-side panel shell to extend.
- `src/components/generation/MealCard.tsx` already exposes the primary per-meal action row where a favorite affordance can attach.
- `src/hooks/use-meal-plan.ts` already provides the correct TanStack Query + tRPC invalidation pattern for persisted plan mutations.

### Service-layer patterns

- `supabase/functions/trpc/index.ts` already uses caller-scoped reads/writes with service-role usage only where needed for shared tables.
- `meal.enrich` is the strongest analog for a Phase 7 server mutation: load owned plan data, validate business rules server-side, update persisted rows, invalidate via React Query on success.

## Implementation Constraints

### Finalization semantics

- Finalization must operate on enriched meals only.
- Draft meals must be removed from the finalized plan, not preserved as placeholders.
- Finalization therefore needs two persistent effects in the same server-owned flow:
  - update `meal_plans.generation_status` to `finalized`
  - generate and store `meal_plans.shopping_list`
  - remove draft `meals` rows from the plan
- The server path should refuse to finalize a plan with zero enriched meals, because `FINAL-02` and `FINAL-03` become meaningless otherwise.
- Existing mutable plan procedures (`meal.enrich`, `meal.delete`, `meal.regenerate`) currently need a finalized-state guard. Phase 7 should treat `finalized` as a hard server-side lock for draft-changing actions.

### Shopping-list aggregation

- Spoonacular ingredient payloads are already stored as JSON arrays on enriched meals.
- De-duplication should prefer stable identity in this order:
  - ingredient id when present
  - normalized name
  - normalized original text as a last-resort fallback
- Quantity rollups are safe only when the normalized unit matches. If units differ, the helper should preserve the ingredient as one grouped item with split quantity detail rather than silently combining incompatible units.
- Grouping should prefer Spoonacular aisle/category metadata when present and fall back to a stable label such as `Other ingredients`.

### Favorites persistence

- Favorites are recipe-backed only, so draft meals must never appear saved locally.
- The server mutation should persist both:
  - `meals.is_favorite = true` on the current plan row
  - a durable record in `favorite_meals`
- `favorite_meals` currently has no uniqueness guard, so Phase 7 should add an index or constraint on `(user_id, spoonacular_recipe_id)` to keep save actions idempotent.

### Read-path gaps to close

`mealPlan.get` currently omits Phase 7 state needed by the client:

- plan `generation_status`
- plan `shopping_list`
- meal `is_favorite`

Those fields should be added to the query and to `src/lib/generation/types.ts` before the route work starts.

## Suggested Plan Breakdown

### Wave 0

- Add a favorite-library uniqueness migration.
- Add shared shopping-list and favorite payload helpers plus unit tests.
- Extend shared persisted types and create test scaffolds for route/panel/E2E work.

### Wave 1

- Extend `mealPlan.get` to include finalized and favorite state.
- Add `mealPlan.finalize`, `meal.saveFavorite`, and `favorites.list` tRPC procedures.
- Add finalized-state guards to `meal.enrich`, `meal.delete`, and `meal.regenerate` so the route cannot keep mutating a finalized plan through older entry points.
- Extend `useMealPlan` with finalize/favorite/library wrappers and invalidation.

### Wave 2

- Add a plan-level finalization card and confirmation treatment.
- Add shopping-list and favorites right-side panels.
- Add favorite affordances to enriched cards and the flyout.
- Keep all orchestration on `/plan/:id`.

### Wave 3

- Finish unit/component/E2E coverage.
- Run one blocking human verification pass for clipboard and editorial panel behavior.

## Testing Implications

- Pure helper tests should cover:
  - de-duplication
  - quantity rollups
  - fallback grouping
  - favorite payload shaping / idempotency assumptions
- Hook tests should cover:
  - finalize invalidation
  - favorite save invalidation
  - favorites library query behavior
  - finalized-state guard behavior on mutation re-entry
- Component and route tests should cover:
  - finalize warning copy
  - finalized-state CTA swap
  - shopping-list panel rendering and copy feedback
  - disabled favorite affordance on draft meals
  - saved state on enriched meals
- E2E should cover:
  - finalize a mixed-state plan
  - draft meals disappear from finalized plan
  - shopping list opens and copies
  - favorites persist across plans / route revisits

## Risks And Assumptions

- `favorite_meals` stores recipe snapshots without explicit update semantics. Phase 7 should treat save as upsert-by-recipe-id and update the stored snapshot when a newer enriched payload is saved.
- Spoonacular ingredient units may not always be directly summable. The helper must fail safe rather than combine incompatible measurements.
- Finalization is intentionally irreversible at the workflow level in this phase. The UI copy and confirmation must state the draft-meal discard behavior plainly.
- Favorites library access is intentionally panel-based for Phase 7. Introducing a primary `/favorites` route would violate the locked context.
