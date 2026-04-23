---
phase: 09-compact-meal-card-refactor
plan: "01"
subsystem: ui
tags: [react, tailwind, vitest, accessibility, meal-card, icon-buttons, aria]

# Dependency graph
requires:
  - phase: 05-meal-plan-grid-and-management
    provides: MealCard component, delete confirmation flow, slot-level management model
  - phase: 06-enrichment-flow
    provides: Card-local status/enrichment behavior
  - phase: 07-finalization-and-favorites
    provides: isFinalized prop, existing favorite wiring in card
provides:
  - Compact MealCard with role="button" article wrapper firing onCardClick
  - Delete icon button (top-right, always visible) with aria-label and stopPropagation
  - Regenerate icon button with aria-label and stopPropagation
  - showMealTypeLabel prop to suppress meal_type label when layout provides context
  - onCardClick prop replacing onViewDetails (broadened to HTMLElement)
  - Removal of favoriteState, favoriteHelperText, onSaveFavorite, onOpenFavorites, onViewDetails props
  - Updated generation-components.test and meal-plan-management.test for compact card shape
  - 3 new propagation-guard tests confirming card click vs icon click isolation
affects:
  - 09-02 (MealPlanGrid wiring, plan-page integration)
  - 09-03 (flyout favorite affordance)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Clickable article wrapper: role=button + tabIndex + onKeyDown Enter/Space + onClick for onCardClick"
    - "Propagation guard: all icon buttons call e.stopPropagation() before own handler"
    - "Inline SVG icon buttons: aria-label + title tooltip + min-h/w-[44px] hit target + aria-hidden svg"
    - "Conditional meal-type label: showMealTypeLabel !== false guard"
    - "MealDeleteConfirmation wrapped in stopPropagation div to prevent confirmation clicks leaking"

key-files:
  created: []
  modified:
    - src/components/generation/MealCard.tsx
    - src/components/generation/generation-components.test.tsx
    - src/components/generation/meal-plan-management.test.tsx

key-decisions:
  - "Full article surface is the flyout entry point via onCardClick (D-07, D-09)"
  - "Delete icon always visible in top-right card chrome, not hover-only (D-16)"
  - "Regenerate stays as direct icon action on card (D-12)"
  - "Favorites removed from card surface entirely — moved to flyout in Plan 03 (D-11, D-18)"
  - "showMealTypeLabel defaults to true for standalone use; Plan 02 passes false for grid use (D-05, D-06)"
  - "Single MealCard component serves all contexts — no separate CompactMealCard.tsx (D-21)"
  - "p-4 (16px md spacing token) for compact padding per UI-SPEC"

patterns-established:
  - "Propagation guard pattern: every button inside clickable article calls e.stopPropagation() before handler"
  - "Clickable non-button element: article[role=button] + tabIndex=0 + onKeyDown for keyboard access"
  - "Icon-only button: type=button + aria-label + title + min-h/w-[44px] + aria-hidden svg"

requirements-completed:
  - CARD-02
  - CARD-03
  - CARD-04
  - CARD-05

# Metrics
duration: 3min
completed: 2026-04-23
---

# Phase 09 Plan 01: Compact MealCard Refactor Summary

**MealCard rewritten as compact card with inline SVG icon actions, clickable article wrapper for onCardClick, no description/favorites/View-details, and 7 new TDD tests confirming icon-click propagation isolation**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-23T15:26:00Z
- **Completed:** 2026-04-23T15:29:00Z
- **Tasks:** 2 (Task 1 TDD: RED+GREEN; Task 2: already covered by TDD test writes)
- **Files modified:** 3

## Accomplishments

- Rewrote MealCard.tsx: article wrapper with role="button" fires onCardClick on full-surface click
- Delete icon button (trash SVG) always visible top-right with aria-label="Delete meal" and stopPropagation
- Regenerate icon button (refresh SVG) in action area with aria-label="Regenerate meal" and stopPropagation
- Removed short_description rendering, View details button, and all favorite-related props (5 props removed)
- Added showMealTypeLabel prop (default true) to conditionally suppress meal_type label
- Updated generation-components.test.tsx: removed stale description/dinner assertions, added compact card assertions
- Added 3 propagation-guard tests to meal-plan-management.test.tsx confirming card click vs icon click isolation
- Full vitest suite: 159 tests passing (was 155+ target)

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: failing tests for compact MealCard** - `baa00e3` (test)
2. **Task 1 GREEN: implement compact MealCard** - `4e7d7b5` (feat)

_Task 2 test updates were written as part of TDD RED phase and covered by commit baa00e3._

## Files Created/Modified

- `src/components/generation/MealCard.tsx` - Compact card with role=button wrapper, delete/regenerate icon buttons, showMealTypeLabel prop, onCardClick prop
- `src/components/generation/generation-components.test.tsx` - Updated assertions: removed description/dinner text, added Draft chip, Delete meal, Regenerate meal, showMealTypeLabel={false} test
- `src/components/generation/meal-plan-management.test.tsx` - 3 new propagation-guard tests: card click fires onCardClick; delete/regenerate icon clicks do NOT fire onCardClick

## Decisions Made

- Wrote Task 2 test updates as part of the TDD RED phase since both tasks modify the same test files — avoids double-commit churn and satisfies both tasks atomically
- Used `showMealTypeLabel !== false` guard (rather than `=== true`) so explicit `showMealTypeLabel={false}` works while the default `true` is still treated as "show label" — consistent with the plan's intent

## Deviations from Plan

None — plan executed exactly as written. The TDD RED and GREEN commits cover both Task 1 and Task 2 since Task 2 updates the same test files written in RED.

## Issues Encountered

None. The `getByRole("button", { name: /herby salmon bowls/i })` ARIA name computation worked correctly — the article's accessible name is computed from its text content including the meal title.

## User Setup Required

None — no external service configuration required.

## Known Stubs

None. The compact MealCard renders real data from the slot prop. No hardcoded empty values or placeholder text introduced.

## Threat Flags

No new security-relevant surface introduced. This is a pure presentational refactor. All icon buttons are local UI controls with pre-wired callbacks. ARIA roles are presentational only (T-09-02 accepted). All icon-only buttons have aria-label per T-09-03 mitigation requirement (verified by acceptance criteria grep checks).

## Next Phase Readiness

- MealCard.tsx is ready for Plan 02 wiring: MealPlanGrid needs to pass `showMealTypeLabel={false}` and wire `onCardClick` to the flyout-open handler
- plan-page.tsx needs `flyoutTrigger` type broadened from `HTMLButtonElement` to `HTMLElement`
- MealPlanGrid.tsx needs favorite props removed from its interface and call sites
- No blockers for Plan 02 or Plan 03

---
*Phase: 09-compact-meal-card-refactor*
*Completed: 2026-04-23*
