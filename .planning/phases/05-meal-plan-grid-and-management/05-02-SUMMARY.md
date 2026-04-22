---
phase: 05-meal-plan-grid-and-management
plan: "02"
subsystem: frontend
tags: [react, react-router, react-query, typescript, tdd, navigation, route-orchestration]

# Dependency graph
requires:
  - phase: 05-01
    provides: "useLatestMealPlan, useMealPlan, buildMealPlanSlots — all consumed by this plan"

provides:
  - "AppFrame Plan nav resolves to /plan/:id (latest) or /plan/new via useLatestMealPlan"
  - "PlanPage branches on id !== 'new' for persisted management vs generation modes"
  - "PersistedPlanView: useMealPlan + buildMealPlanSlots + Create new plan CTA + loading/error banners"
  - "GenerationView: existing /plan/new generation path isolated in its own component"

affects:
  - 05-03 (delete/regenerate mutations write to the same /plan/:id route surface)
  - 05-04 (flyout opens from card actions on the same PersistedPlanView)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Programmatic nav for Plan pill: useLatestMealPlan drives navigate() instead of static NavLink href"
    - "Route mode branching: id !== 'new' → PersistedPlanView; id === 'new' → GenerationView"
    - "Persisted grid render: PersistedMealPlan → buildMealPlanSlots → MealPlanGrid"
    - "TDD: RED failing test commit → GREEN implementation commit"

key-files:
  created:
    - src/routes/plan-page.test.tsx
  modified:
    - src/app/layout/AppFrame.tsx
    - src/routes/plan-page.tsx

key-decisions:
  - "handlePlanNavClick prevents default NavLink navigation and calls navigate() directly so latest-plan resolution is always fresh (T-05-04)"
  - "PlanPage route branches before mounting PersistedPlanView, so useMealPlan is never called on the /plan/new path — avoids spurious queries (T-05-05)"
  - "MealPlanSlot cast to unknown as MealSlot is intentional — MealPlanGrid slot rendering will be expanded in Plan 03 when card management actions are added"
  - "Create new plan CTA uses accent color and sits in the plan header card, secondary to the grid (D-03, UI-SPEC)"
  - "Page-level loading and error banners are separate from slot-local states reserved for Plans 03+ (T-05-06)"

# Metrics
duration: ~15min
completed: 2026-04-21
---

# Phase 05 Plan 02: Nav Resolution and Route Orchestration Summary

**Plan nav resolves to the user's latest saved plan via useLatestMealPlan; PlanPage branches on id !== "new" to hydrate persisted plans with useMealPlan + buildMealPlanSlots, while keeping /plan/new on the existing generation path**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-21T19:44:00Z
- **Completed:** 2026-04-21T19:47:00Z
- **Tasks:** 2 (both TDD)
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments

- Updated `AppFrame` to call `useLatestMealPlan` and replace the static `Plan` nav item with a programmatic `handlePlanNavClick` handler that routes to `/plan/${latestPlanId}` when present or `/plan/new` otherwise; error fallback is conservative (D-01, T-05-04)
- Rewrote `PlanPage` as a route orchestrator: `id !== "new"` mounts `PersistedPlanView` (which calls `useMealPlan`, normalizes via `buildMealPlanSlots`, renders the grid, and shows the `Create new plan` CTA); `id === "new"` mounts `GenerationView` (preserving all Phase 4 generation behavior) (D-02, D-03, T-05-05)
- Added page-level loading spinner and editorial error banner in `PersistedPlanView` for failed reads (T-05-06)
- Created `src/routes/plan-page.test.tsx` with 9 tests covering nav resolution (3) and persisted plan mode (6) following TDD RED → GREEN sequence

## Task Commits

1. **RED: Failing tests for plan nav and persisted mode** — `d0743bc` (test)
2. **GREEN: AppFrame nav resolution + PlanPage route orchestration** — `9dec219` (feat)

## Files Created/Modified

- `src/app/layout/AppFrame.tsx` — Added `useLatestMealPlan`, replaced static Plan nav entry with `handlePlanNavClick` programmatic navigation; preserved all existing nav pill styling classes
- `src/routes/plan-page.tsx` — Refactored into `PlanPage` orchestrator, `PersistedPlanView`, and `GenerationView`; added `useMealPlan`, `buildMealPlanSlots`, `Create new plan` CTA, loading/error banners
- `src/routes/plan-page.test.tsx` — New: 9 tests covering Plan nav routing and persisted plan hydration, including `routes the Plan nav to the latest saved plan`, `hydrates a persisted meal plan by route id`, and `shows Create new plan on a persisted plan`

## Decisions Made

- **Programmatic Plan nav click handler** — `handlePlanNavClick` calls `e.preventDefault()` and `navigate()` directly rather than relying on NavLink's static `to` prop, ensuring the latest-plan lookup is always evaluated at click time rather than rendered stale from mount.
- **Route branch before hook call** — `PlanPage` branches on `id !== "new"` before mounting `PersistedPlanView`, so `useMealPlan` is never invoked on the generation path. This is cleaner than passing `undefined` and relying on the `enabled` guard.
- **MealPlanSlot → MealSlot cast** — `buildMealPlanSlots` returns `MealPlanSlot` (the Phase 5 union), but `MealPlanGrid` currently types its `slots` prop as `Record<string, MealSlot>` (Phase 4 streaming type). A `as unknown as Record<string, MealSlot>` cast bridges the gap until Plan 03 expands `MealPlanGrid` to handle all four slot states with management actions.
- **Conservative error fallback** — when `useLatestMealPlan` errors, nav falls through to `/plan/new` rather than blocking the user with an error state in the nav bar.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect useMealPlan test assertion**
- **Found during:** GREEN phase test run
- **Issue:** Test `does not call useMealPlan when id is 'new'` expected `mockUseMealPlan` to be called with `undefined`, but the implementation branches before mounting `PersistedPlanView`, so the hook is never called at all (0 calls).
- **Fix:** Updated test assertion from `toHaveBeenCalledWith(undefined)` to `not.toHaveBeenCalled()` — which correctly pins the branching behavior.
- **Files modified:** `src/routes/plan-page.test.tsx`

## Known Stubs

- `MealPlanGrid` receives `MealPlanSlot` cast to `MealSlot` — filled slots will render with the Phase 4 card shell (title + description), but `empty`, `regenerating`, and `error` states are not yet visually handled. This is intentional: Plan 03 adds per-slot management actions and the expanded card variants.

## Threat Flags

No new threat surface beyond what is documented in the plan's threat model (T-05-04, T-05-05, T-05-06 all mitigated).

## Self-Check

Checking created/modified files and commits exist...
