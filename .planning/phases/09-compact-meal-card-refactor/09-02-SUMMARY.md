---
plan: 09-02
phase: 09-compact-meal-card-refactor
status: complete
completed: 2026-04-23
---

# Plan 09-02 Summary: Wire MealPlanGrid and plan-page to Compact Card Interface

## What Was Built

MealPlanGrid and plan-page.tsx fully wired to the new compact MealCard API produced in Plan 09-01. Favorite prop pass-through removed from the grid layer. flyoutTrigger type broadened to HTMLElement. card-click-opens-flyout test added.

## Key Changes

### MealPlanGrid.tsx
- Removed from props type: `favoriteStateByMealId`, `favoriteHelperTextByMealId`, `onSaveFavorite`, `onOpenFavorites`
- Changed `onViewDetails` trigger type: `HTMLButtonElement` → `HTMLElement`
- All MealCard renders now pass `showMealTypeLabel={false}`
- All MealCard renders use `onCardClick={(trigger) => onViewDetails?.(slot.slotKey, trigger)}` instead of `onViewDetails`
- Phase 8 layout improvements (responsive gaps, leftRailWidth, adaptive label classes) preserved

### plan-page.tsx
- `flyoutTrigger` state type changed from `HTMLButtonElement | null` → `HTMLElement | null`
- `handleViewDetails` signature changed from `HTMLButtonElement` → `HTMLElement` trigger
- MealPlanGrid call: removed `favoriteStateByMealId`, `favoriteHelperTextByMealId`, `onSaveFavorite`, `onOpenFavorites` props
- MealDetailFlyout still receives all favorite props (correct — favorites live in flyout now)

### plan-page.test.tsx
- MealPlanGrid mock updated to expose `onViewDetails` via clickable slot buttons (`data-testid="mock-card-{slotKey}"`)
- New test: "clicking a meal card opens the meal detail flyout" — verifies `dialog` role appears after card click

## Self-Check: PASSED

- MealPlanGrid passes `showMealTypeLabel={false}` to every MealCard render ✓
- MealPlanGrid passes `onCardClick` replacing `onViewDetails` on MealCard ✓
- No favorite props passed from MealPlanGrid to MealCard ✓
- `flyoutTrigger` typed as `HTMLElement | null` ✓
- `handleViewDetails` accepts `HTMLElement` trigger ✓
- MealDetailFlyout still receives favorite props ✓
- Card-click-opens-flyout test present ✓
- 166/166 tests passing ✓
