---
phase: 7
slug: finalization-and-favorites
status: draft
threats_open: 1
asvs_level: 1
created: 2026-04-23
---

# Phase 7 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| stored Spoonacular ingredient payload -> shopping-list transform | Third-party recipe fields become grouped grocery data that the user can copy and act on | ingredient names, aisles, units, quantities |
| enriched meal state -> favorite payload | Per-plan meal state crosses into a cross-plan favorites library | recipe ids, titles, instructions, nutrition, image URLs |
| browser finalize action -> `mealPlan.finalize` | Untrusted client intent triggers a destructive plan-state transition | meal plan id, authenticated mutation intent |
| browser favorite action -> `meal.saveFavorite` | Untrusted UI actions request a persistent favorite save | meal id, authenticated mutation intent |
| persisted finalized state -> route panels | Server-owned state drives shopping-list and favorites affordances back into the route UI | shopping-list groups, saved-state flags, panel open/close flow |
| human verification -> phase sign-off | Real browser behavior is required before clipboard and panel-quality claims can be treated as complete | clipboard contents, layout/readability, disabled-state clarity |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-07-01 | T | shopping-list helper | mitigate | [shopping-list.ts](/Users/jabroni/Projects/aimeal-poc/src/lib/generation/shopping-list.ts) normalizes ingredient identity, groups by aisle/fallback, and combines only matching units; [shopping-list.test.ts](/Users/jabroni/Projects/aimeal-poc/src/lib/generation/shopping-list.test.ts) proves enriched-only aggregation and incompatible-unit preservation | closed |
| T-07-02 | T | favorite-library persistence | mitigate | [20260422000003_favorites_uniqueness.sql](/Users/jabroni/Projects/aimeal-poc/supabase/migrations/20260422000003_favorites_uniqueness.sql) adds recipe-backed uniqueness, and [favorites.ts](/Users/jabroni/Projects/aimeal-poc/src/lib/generation/favorites.ts) builds server-bound records from recipe ids only | closed |
| T-07-03 | E | `mealPlan.finalize` | mitigate | [trpc/index.ts](/Users/jabroni/Projects/aimeal-poc/supabase/functions/trpc/index.ts) scopes finalize reads to `id + user_id`, rejects already-finalized or zero-enriched plans, and calls [20260422000004_finalize_plan_rpc.sql](/Users/jabroni/Projects/aimeal-poc/supabase/migrations/20260422000004_finalize_plan_rpc.sql) for one transactional finalize path | closed |
| T-07-04 | T | `meal.saveFavorite` | mitigate | [trpc/index.ts](/Users/jabroni/Projects/aimeal-poc/supabase/functions/trpc/index.ts) rejects non-enriched/non-recipe meals, upserts `favorite_meals` on `user_id,spoonacular_recipe_id`, updates `meals.is_favorite`, and [use-meal-plan.ts](/Users/jabroni/Projects/aimeal-poc/src/hooks/use-meal-plan.ts) invalidates both plan and favorites queries | closed |
| T-07-05 | D | finalize/shopping-list UI | mitigate | [PlanFinalizationCard.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/PlanFinalizationCard.tsx), [FinalizePlanConfirmation.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/FinalizePlanConfirmation.tsx), and [ShoppingListPanel.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/ShoppingListPanel.tsx) keep finalization route-owned, require explicit discard confirmation, and expose `aria-live` copy feedback with component and route coverage in [plan-finalization.test.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/plan-finalization.test.tsx), [plan-page.test.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/plan-page.test.tsx), and [finalization-favorites.spec.ts](/Users/jabroni/Projects/aimeal-poc/tests/e2e/finalization-favorites.spec.ts) | closed |
| T-07-06 | T | favorite affordances | mitigate | [MealCard.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealCard.tsx), [MealDetailFlyout.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealDetailFlyout.tsx), and [plan-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/plan-page.tsx) gate active saves on enriched state and render saved state from persisted `is_favorite` / favorites-library data, with UI coverage in [meal-detail-flyout.test.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/meal-detail-flyout.test.tsx), [plan-page.test.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/plan-page.test.tsx), and [finalization-favorites.spec.ts](/Users/jabroni/Projects/aimeal-poc/tests/e2e/finalization-favorites.spec.ts) | closed |
| T-07-07 | R | regression coverage | mitigate | [07-VALIDATION.md](/Users/jabroni/Projects/aimeal-poc/.planning/phases/07-finalization-and-favorites/07-VALIDATION.md) maps each secure behavior to executable coverage, and the targeted Vitest plus Playwright runs completed green on 2026-04-23 | closed |
| T-07-08 | D | clipboard and panel usability | mitigate | [07-04-PLAN.md](/Users/jabroni/Projects/aimeal-poc/.planning/phases/07-finalization-and-favorites/07-04-PLAN.md), [07-VALIDATION.md](/Users/jabroni/Projects/aimeal-poc/.planning/phases/07-finalization-and-favorites/07-VALIDATION.md), and [07-04-SUMMARY.md](/Users/jabroni/Projects/aimeal-poc/.planning/phases/07-finalization-and-favorites/07-04-SUMMARY.md) all require a blocking human verification pass for real clipboard contents and editorial panel quality, but no approval artifact exists yet | open |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-23 | 8 | 7 | 1 | Codex (`$gsd-secure-phase 7`) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [ ] `threats_open: 0` confirmed
- [ ] `status: verified` set in frontmatter

**Approval:** pending human verification
