---
phase: 06-enrichment-flow
plan: "03"
subsystem: frontend
tags: [react, flyout, dev-tools, playwright, vitest, ui]
requires:
  - phase: 06-enrichment-flow
    provides: `meal.enrich`, usage query, batch enrichment hook
provides:
  - Explicit selection mode with batch enrichment controls on `/plan/:id`
  - Enriched-card status, retry affordance, and recipe-first flyout content
  - Real Spoonacular usage surface on `/dev`
affects: [plan-page, meal-grid, flyout, dev-page, e2e]
tech-stack:
  added: [selection action bar, Spoonacular usage query hook]
  patterns: [route-level batch controls, recipe-first flyout layering, diagnostics cards on /dev]
key-files:
  created:
    - src/components/generation/SelectionActionBar.tsx
    - src/hooks/use-spoonacular-usage.ts
  modified:
    - src/routes/plan-page.tsx
    - src/components/generation/MealPlanGrid.tsx
    - src/components/generation/MealCard.tsx
    - src/components/generation/MealDetailFlyout.tsx
    - src/routes/dev-page.tsx
    - src/routes/plan-page.test.tsx
    - src/components/generation/meal-detail-flyout.test.tsx
    - src/routes/dev-page.test.tsx
key-decisions:
  - "Selection mode stays explicit and route-owned rather than persisting UI state to the database."
  - "The existing right-side flyout remains the recipe surface; enriched content layers into the same shell instead of introducing a new route or modal."
patterns-established:
  - "Desktop and mobile grids share the same card state model for selection, enrichment, and retry."
  - "The `/dev` page presents both top-line budget posture and recent per-call diagnostics from the same persisted usage query."
requirements-completed: [ENRCH-01, ENRCH-04, ENRCH-05, DEVT-04]
duration: 47min
completed: 2026-04-22
---

# Phase 06 Plan 03 Summary

**The persisted plan route now supports explicit batch enrichment, enriched recipe rendering in the existing flyout, and a real Spoonacular diagnostics surface on `/dev`.**

## Accomplishments

- Added an explicit selection-mode control bar with `Select all`, `Done selecting`, and `Enrich selected meals`, while keeping `/plan/:id` as the management surface.
- Extended meal cards and the grid to show `Draft`, `Enriching`, and `Enriched` states plus card-local retry affordances.
- Expanded the flyout into a recipe-first detail panel and replaced the old `/dev` Spoonacular placeholder with live usage totals and recent-call rows.

## Verification

- `npx vitest run src/hooks/use-meal-enrichment.test.ts src/routes/plan-page.test.tsx src/components/generation/meal-detail-flyout.test.tsx src/routes/dev-page.test.tsx`
- `rg -n 'Select meals|Select all|Enrich selected meals|Retry enrichment|Enriched' src/routes/plan-page.tsx src/components/generation`
- `rg -n 'Spoonacular Usage|Cache hits|Cache misses' src/routes/dev-page.tsx`

## Notes

- The route-level tests intentionally keep `Select all` and `Enrich selected meals` outside the grid internals so Phase 6 regressions fail fast even if card layout evolves later.
- The flyout preserves Phase 5 focus-trap behavior while adding recipe content in the priority order locked by the Phase 6 context.
