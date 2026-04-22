---
phase: 05-meal-plan-grid-and-management
plan: "01"
subsystem: api
tags: [trpc, react-query, typescript, supabase, deno, rls, tdd]

# Dependency graph
requires:
  - phase: 04-draft-generation-with-streaming
    provides: "MealSlot/MealType/DayOfWeek types, buildSlotKey contract, tRPC router with mealPlan.create"

provides:
  - "PersistedMeal, PersistedMealPlan, MealPlanSlotState, MealPlanSlot union types in types.ts"
  - "buildMealPlanSlotKey and buildMealPlanSlots helpers in plan-slots.ts"
  - "mealPlan.latest authedProcedure (RLS-scoped, ordered by updated_at desc)"
  - "mealPlan.get authedProcedure (UUID input, returns plan + meals with rationale)"
  - "useLatestMealPlan React Query hook (query key: [meal-plan, latest])"
  - "useMealPlan(planId) React Query hook (query key: [meal-plan, planId])"

affects:
  - 05-02 (plan nav/route hydration consumes useLatestMealPlan and useMealPlan)
  - 05-03 (delete/regenerate mutations invalidate [meal-plan, planId] query key)
  - 05-04 (flyout reads meal data from useMealPlan)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Persisted slot normalization: PersistedMealPlan → Record<slotKey, MealPlanSlot> via buildMealPlanSlots"
    - "Slot key alignment: buildMealPlanSlotKey produces same day:mealType format as Phase 4 buildSlotKey"
    - "React Query hook shape mirrors use-household.ts: staleTime 30s, Error|null, disabled when no id"
    - "TDD: RED failing test → GREEN implementation → verify all pass"

key-files:
  created:
    - src/lib/generation/plan-slots.ts
    - src/hooks/use-meal-plan.ts
    - src/hooks/use-meal-plan.test.ts
  modified:
    - src/lib/generation/types.ts
    - supabase/functions/trpc/index.ts

key-decisions:
  - "MealPlanSlot union uses four explicit states (filled/empty/regenerating/error) to cover all grid render paths"
  - "buildMealPlanSlots discards malformed meal rows silently rather than throwing, keeping grid stable (T-05-03)"
  - "mealPlan.get derives active mealTypes from present meals rather than a separate DB column to stay schema-compatible"
  - "useMealPlan(undefined) is disabled (enabled: !!planId) to avoid spurious queries before route params resolve"

patterns-established:
  - "Slot normalization pattern: always produce complete grid before rendering, missing rows become state:empty"
  - "Hook query key convention: ['meal-plan', 'latest'] and ['meal-plan', planId]"

requirements-completed:
  - PLAN-01

# Metrics
duration: 25min
completed: 2026-04-21
---

# Phase 05 Plan 01: Persisted Plan Read Foundation Summary

**Shared slot types, complete-grid normalization helper, and RLS-scoped mealPlan.latest/get tRPC procedures with React Query hooks wired to stable [meal-plan] query keys**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-21T19:36:00Z
- **Completed:** 2026-04-21T19:39:41Z
- **Tasks:** 2 (both TDD)
- **Files modified:** 5

## Accomplishments

- Extended `types.ts` with `PersistedMeal`, `PersistedMealPlan`, `MealPlanSlotState`, and `MealPlanSlot` union covering filled/empty/regenerating/error states
- Created `plan-slots.ts` with `buildMealPlanSlotKey` (aligned to Phase 4's `buildSlotKey` contract) and `buildMealPlanSlots` that converts DB rows into a stable complete-grid map with intentional empty slots for missing/deleted meals (D-06, D-11, D-12, T-05-03)
- Added `mealPlan.latest` and `mealPlan.get` authenticated tRPC procedures on the Deno edge function; both run through JWT-backed RLS, `get` includes `rationale` field, `latest` orders by `updated_at` desc then `created_at` desc
- Created `use-meal-plan.ts` with `useLatestMealPlan` and `useMealPlan` following the `use-household.ts` React Query pattern; `useMealPlan(undefined)` is safely disabled

## Task Commits

1. **Task 1: Persisted plan slot contracts and normalization helpers** - `7dd6b4b` (feat)
2. **Task 2: Authenticated latest/get plan reads and React Query wrappers** - `91c276a` (feat)

## Files Created/Modified

- `src/lib/generation/types.ts` — Added PersistedMeal, PersistedMealPlan, MealPlanSlotState, MealPlanSlot union types
- `src/lib/generation/plan-slots.ts` — New: buildMealPlanSlotKey and buildMealPlanSlots normalization helpers
- `src/hooks/use-meal-plan.ts` — New: useLatestMealPlan and useMealPlan React Query hooks
- `src/hooks/use-meal-plan.test.ts` — New: 11 tests covering normalization behavior and hook contracts
- `supabase/functions/trpc/index.ts` — Added mealPlan.latest query and mealPlan.get query procedures

## Decisions Made

- **Four-state MealPlanSlot union** — `filled | empty | regenerating | error` covers all render paths across Plans 01–04; regenerating and error states are included now so the type contract is stable before UI components reference it.
- **buildMealPlanSlots discards malformed rows silently** — unrecognized `day_of_week` or `meal_type` values are ignored (T-05-03); the grid structure is never collapsed by bad data.
- **mealPlan.get derives mealTypes from present meals** — the `meal_plans` table has no dedicated `meal_types` column, so the procedure derives the active set from meal rows and filters against the canonical MEAL_TYPES constant. Defaults to all three if no meals exist.
- **useMealPlan(undefined) is safe** — `enabled: !!planId` prevents the query from firing before route params resolve, avoiding a 404 on mount.

## Deviations from Plan

None — plan executed exactly as written. TDD RED/GREEN sequence followed for both tasks.

## Issues Encountered

- Test file initially used JSX (`<QueryClientProvider>`) in a `.ts` file, causing an esbuild parse error. Fixed by replacing with `createElement(QueryClientProvider, ...)` to keep the file as `.ts` without renaming.

## Known Stubs

None — all exports are fully implemented and wired.

## Threat Flags

No new threat surface beyond what is documented in the plan's threat model (T-05-01, T-05-02, T-05-03 all mitigated).

## Next Phase Readiness

- `useLatestMealPlan` is ready for Plan 02 nav resolution (D-01)
- `useMealPlan(planId)` is ready for Plan 02 route hydration (D-02)
- `buildMealPlanSlots` is ready for Plan 02 grid rendering
- Query key `["meal-plan", planId]` is established; Plan 03 delete/regenerate mutations must invalidate this key

---
*Phase: 05-meal-plan-grid-and-management*
*Completed: 2026-04-21*
