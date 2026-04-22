# Phase 5: Meal Plan Grid & Management - Research

**Researched:** 2026-04-21 [VERIFIED: system date]
**Domain:** Persisted meal-plan read/write management on an existing React 19 + React Router 7 + TanStack Query + tRPC + Supabase stack [VERIFIED: package.json] [VERIFIED: architecture.md] [VERIFIED: src/routes/plan-page.tsx] [VERIFIED: supabase/functions/trpc/index.ts]
**Confidence:** HIGH [VERIFIED: codebase grep] [VERIFIED: npm registry] [CITED: https://trpc.io/docs/client/tanstack-react-query/usage] [CITED: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates] [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/]

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Plan loading and revisit flow
- **D-01:** The main `Plan` nav should open the user's most recent existing meal plan first, not send them to `/plan/new` by default.
- **D-02:** The loaded `/plan/:id` route must read persisted meal-plan data from the database on revisit and render the management grid for that saved plan.
- **D-03:** The plan management page should include a clear "Create new plan" action from the existing-plan view so users can still start over intentionally.

### Grid management model
- **D-04:** Phase 5 does **not** include inline editing. Meals are managed by viewing details, deleting a slot, or regenerating a single slot.
- **D-05:** If the user dislikes a meal, the preferred correction path is regeneration rather than title editing.
- **D-06:** Empty slots created by deletion remain part of the grid and should stay actionable rather than feeling broken or abandoned.

### Detail view behavior
- **D-07:** Clicking into a meal should open a right-side flyout / slide-over, not inline expansion and not a centered modal.
- **D-08:** The flyout is where Phase 5 exposes the meal's description and rationale while preserving the user's spatial context in the grid.
- **D-09:** The grid should remain visible behind the flyout so management still feels anchored to the weekly plan layout.

### Delete flow
- **D-10:** Deleting a meal requires an inline confirmation step before the destructive action completes.
- **D-11:** After deletion, the slot becomes an empty-state slot with a visible `Regenerate meal` action.
- **D-12:** Empty-state slots are intentional management states, not placeholders to hide or collapse.

### Single-meal regeneration
- **D-13:** Regenerating one meal happens in place. The current card or empty slot should enter a loading state, then be replaced in the same grid position when the new meal returns.
- **D-14:** The regenerate trigger should be directly available on each card and on each empty slot. It should not require opening the flyout first.
- **D-15:** Single-slot regeneration replaces only that one slot; it does not disturb the rest of the plan grid.

### Requirement conflict to reconcile before implementation
- **D-16:** Current roadmap and requirements still say Phase 5 includes inline title editing (`PLAN-02` and Phase 5 success criterion #2), but the user explicitly rejected inline editing for this phase.
- **D-17:** Downstream planning must treat "no inline editing" as the locked product decision and either update the planning artifacts or call out the traceability mismatch during planning.

### the agent's Discretion
- Exact card-level action affordance style for `View`, `Delete`, and `Regenerate`
- Exact loading-state visuals for in-place single-slot regeneration
- Whether the flyout opens from clicking the card body, title, or an explicit details affordance
- Empty-slot copy beyond the visible `Regenerate meal` action

### Deferred Ideas (OUT OF SCOPE)
- Inline title editing — explicitly deferred / removed from Phase 5 despite current roadmap wording
- Plan chooser / plan history browser before opening a plan — not chosen for Phase 5
- Regeneration only from inside the flyout — rejected in favor of direct slot actions
- Full enrichment details inside the flyout — Phase 6
- Favorites from the card or flyout — Phase 7
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAN-01 | User sees a 7×3 grid of meals organized by day and meal type [VERIFIED: .planning/REQUIREMENTS.md] | Extend the existing `MealPlanGrid` layout and hydrate slots from persisted `meal_plans` + `meals` data instead of stream-only local state [VERIFIED: src/components/generation/MealPlanGrid.tsx] [VERIFIED: src/routes/plan-page.tsx] |
| PLAN-02 | User can edit a meal's title inline [VERIFIED: .planning/REQUIREMENTS.md] | Locked Phase 5 context explicitly rejects inline editing; planning must treat this requirement as stale and reconcile traceability rather than implement it in Phase 5 [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md] |
| PLAN-03 | User can delete a meal from the plan [VERIFIED: .planning/REQUIREMENTS.md] | Add a meal deletion mutation with inline confirmation and empty-slot rendering that preserves the slot in-grid [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md] [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-UI-SPEC.md] |
| PLAN-04 | User can view meal details (description, rationale) from the grid [VERIFIED: .planning/REQUIREMENTS.md] | Add a right-side flyout fed by persisted meal fields and anchored to the selected slot/card [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md] [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-UI-SPEC.md] |
| GEN-05 | User can regenerate a single meal without regenerating the full plan [VERIFIED: .planning/REQUIREMENTS.md] | Reuse the existing slot-key model and streaming/generation integration, but scope it to a single day + meal type mutation with local pending/error states [VERIFIED: src/hooks/use-generation-stream.ts] [VERIFIED: supabase/functions/generate-draft/index.ts] |
</phase_requirements>

## Summary

Phase 5 should be planned as an extension of the current Phase 4 grid and streaming architecture, not as a new subsystem. The repo already has the route, grid shell, card shell, and per-slot keying model needed to support persisted plan management; what is missing is a persisted read path for `/plan/:id`, plan lookup for the main nav, and write mutations for delete and single-slot regeneration [VERIFIED: src/routes/plan-page.tsx] [VERIFIED: src/components/generation/MealPlanGrid.tsx] [VERIFIED: src/components/generation/MealCard.tsx] [VERIFIED: src/hooks/use-generation-stream.ts] [VERIFIED: src/app/layout/AppFrame.tsx] [VERIFIED: supabase/functions/trpc/index.ts].

The most important planning constraint is mismatch reconciliation. `PLAN-02` in `REQUIREMENTS.md` still requires inline title editing, but the locked Phase 5 context and UI contract explicitly remove inline editing from scope; the planner must treat no-inline-edit as authoritative and capture the traceability mismatch as a planning artifact, not implement the stale requirement text [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md] [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-UI-SPEC.md].

The safest implementation path is: add `mealPlan.latest`, `mealPlan.get`, `meal.delete`, and `meal.regenerate` procedures on the existing Deno tRPC edge function; add React Query hooks for persisted reads and slot-local mutations; keep the current grid layout; introduce an empty-slot component, inline delete confirmation, and a right-side flyout with proper focus management [VERIFIED: supabase/functions/trpc/index.ts] [VERIFIED: src/hooks/use-household.ts] [VERIFIED: src/components/generation/MealPlanGrid.tsx] [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-UI-SPEC.md] [CITED: https://trpc.io/docs/client/tanstack-react-query/usage] [CITED: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates] [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/].

**Primary recommendation:** Plan Phase 5 around persisted slot state and slot-scoped mutations layered onto the existing grid, while explicitly documenting that `PLAN-02` is stale and out of scope for this phase [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md] [VERIFIED: src/components/generation/MealPlanGrid.tsx].

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Resolve latest plan for `Plan` nav | API / Backend [VERIFIED: reasoning from route + DB ownership] | Browser / Client [VERIFIED: src/app/layout/AppFrame.tsx] | The latest plan must be selected using authenticated user-owned DB records under RLS, then the client navigates to that returned id [VERIFIED: supabase/migrations/20260419000001_initial_schema.sql] [VERIFIED: src/app/layout/AppFrame.tsx]. |
| Load persisted `/plan/:id` data | API / Backend [VERIFIED: reasoning from RLS + DB shape] | Browser / Client [VERIFIED: src/routes/plan-page.tsx] | The server-owned data source is `meal_plans` plus `meals`; the client should query and render it, not reconstruct it from stream state on revisit [VERIFIED: supabase/migrations/20260419000001_initial_schema.sql] [VERIFIED: src/routes/plan-page.tsx]. |
| Render responsive meal grid | Browser / Client [VERIFIED: src/components/generation/MealPlanGrid.tsx] | — | The layout already lives in React and should stay there; no server responsibility beyond supplying normalized plan data [VERIFIED: src/components/generation/MealPlanGrid.tsx]. |
| Delete a meal while preserving slot | API / Backend [VERIFIED: reasoning from data mutation] | Browser / Client [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-UI-SPEC.md] | The source of truth is the meal row; the client can show optimistic confirmation/loading state, but the mutation must enforce ownership and persist the new slot state [VERIFIED: supabase/migrations/20260419000001_initial_schema.sql] [CITED: https://supabase.com/docs/reference/javascript/delete]. |
| Regenerate a single slot | API / Backend [VERIFIED: reasoning from AI call + persistence] | Browser / Client [VERIFIED: src/hooks/use-generation-stream.ts] | The backend must call Grok and persist the replacement meal, while the client manages in-place pending/error states for that slot only [VERIFIED: supabase/functions/generate-draft/index.ts] [VERIFIED: src/hooks/use-generation-stream.ts]. |
| Detail flyout open/close/focus | Browser / Client [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-UI-SPEC.md] | — | The flyout is a local interaction shell over already-loaded meal data, with accessibility behavior handled in the client [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-UI-SPEC.md] [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/]. |

## Project Constraints (from CLAUDE.md)

- Use `grok-4-1-fast-non-reasoning` via `https://api.x.ai/v1` for LLM work; do not use `grok-3-mini` [VERIFIED: CLAUDE.md].
- Backend runtime is Deno 2, and edge-function imports should use `npm:` specifiers rather than Node-style imports [VERIFIED: CLAUDE.md].
- Local Supabase ports are `54331` to `54339` [VERIFIED: CLAUDE.md] [VERIFIED: supabase/config.toml].
- Spoonacular is cache-first due to the free-plan budget [VERIFIED: CLAUDE.md].
- Streaming is a hard architecture constraint for draft generation; batch-only behavior is not acceptable for the main generation UX [VERIFIED: CLAUDE.md].
- The project-specific spike skill should be treated as a valid source of implementation findings for local infrastructure, edge runtime behavior, and Spoonacular integration details [VERIFIED: CLAUDE.md] [VERIFIED: .claude/skills/spike-findings-aimeal-poc/SKILL.md].

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | `19.2.0` installed; `19.2.5` current on npm as of 2026-04-21 [VERIFIED: package.json] [VERIFIED: npm registry] | Render the plan management surface and slot-local interaction state [VERIFIED: src/main.tsx] | Already installed and used throughout the app; Phase 5 does not need a React upgrade to ship [VERIFIED: src/main.tsx]. |
| React Router DOM | `7.9.4` installed; `7.14.2` current on npm as of 2026-04-21 [VERIFIED: package.json] [VERIFIED: npm registry] | Drive `/plan/:id`, navigation, and route-param-based plan lookup [VERIFIED: src/app/router.tsx] [VERIFIED: src/routes/plan-page.tsx] | The app already uses `createBrowserRouter`, `RouterProvider`, and `useParams`; Phase 5 should keep routing in this stack [VERIFIED: src/app/router.tsx] [VERIFIED: src/routes/plan-page.tsx] [CITED: https://api.reactrouter.com/v7/functions/react-router.useParams.html]. |
| TanStack Query | `5.90.5` installed; `5.99.2` current on npm as of 2026-04-21 [VERIFIED: package.json] [VERIFIED: npm registry] | Persisted meal-plan queries plus slot-local delete/regenerate mutations [VERIFIED: src/hooks/use-household.ts] [VERIFIED: src/app/providers.tsx] | The repo already uses `useQuery`, `useMutation`, and invalidation for household data; Phase 5 should follow the same pattern for meal-plan data [VERIFIED: src/hooks/use-household.ts] [CITED: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation] [CITED: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates]. |
| tRPC | `@trpc/client 11.7.1` installed; `11.16.0` current on npm as of 2026-04-21 [VERIFIED: package.json] [VERIFIED: npm registry] | Type-safe meal-plan read/write procedures over the existing edge function [VERIFIED: src/lib/trpc/client.ts] [VERIFIED: supabase/functions/trpc/index.ts] | The project already routes household and meal-plan creation through the Deno edge tRPC router, so Phase 5 should extend that router instead of adding REST endpoints [VERIFIED: supabase/functions/trpc/index.ts] [CITED: https://trpc.io/docs/client/tanstack-react-query/usage] [CITED: https://trpc.io/docs/server/procedures]. |
| Supabase JS | `2.103.3` installed; `2.104.0` current on npm as of 2026-04-21 [VERIFIED: package.json] [VERIFIED: npm registry] | Auth-bound DB access inside the edge function and client session headers for tRPC [VERIFIED: src/lib/trpc/client.ts] [VERIFIED: supabase/functions/trpc/index.ts] | Existing RLS-backed access patterns already rely on Supabase JS and should remain the ownership boundary for Phase 5 data [VERIFIED: supabase/functions/trpc/index.ts] [VERIFIED: supabase/migrations/20260419000001_initial_schema.sql] [CITED: https://supabase.com/docs/reference/javascript/delete] [CITED: https://supabase.com/docs/reference/javascript/update]. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | `3.2.4` installed; `4.1.5` current on npm as of 2026-04-21 [VERIFIED: package.json] [VERIFIED: npm registry] | Unit and component coverage for new slot states and route behavior [VERIFIED: vitest.config.ts] [VERIFIED: src/components/generation/generation-components.test.tsx] | Use for component and hook tests that do not require a real browser [VERIFIED: vitest.config.ts]. |
| Playwright | `1.56.1` installed; `1.59.1` current on npm as of 2026-04-21 [VERIFIED: package.json] [VERIFIED: npm registry] | E2E coverage for revisit flow, flyout, deletion, and per-slot regeneration [VERIFIED: playwright.config.ts] [VERIFIED: tests/e2e/generation-flow.spec.ts] | Use for route-level and interaction-level coverage where DOM focus, navigation, and async UI state matter [VERIFIED: playwright.config.ts]. |
| Tailwind + bespoke CSS variables | `tailwindcss 3.4.18` installed [VERIFIED: package.json] | Implement the Phase 5 editorial UI contract without introducing a component library [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-UI-SPEC.md] | Use for all new UI in this phase; the approved UI contract explicitly says no shadcn or Radix primitives for Phase 5 [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-UI-SPEC.md]. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extend existing tRPC router [VERIFIED: supabase/functions/trpc/index.ts] | Add new REST endpoints [ASSUMED] | REST would duplicate existing auth/header/context wiring and split the API style mid-project for no Phase 5 benefit [VERIFIED: src/lib/trpc/client.ts] [VERIFIED: supabase/functions/trpc/index.ts]. |
| Build flyout with bespoke React + Tailwind [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-UI-SPEC.md] | Add Radix Dialog / Sheet [ASSUMED] | Radix would help with accessibility primitives, but introducing a new UI primitive stack conflicts with the approved Phase 5 UI contract and increases scope [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-UI-SPEC.md]. |
| Model empty slots in rendered plan data [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md] | Physically remove slots from the grid [ASSUMED] | Removing slots would violate the locked requirement that deleted slots remain actionable and visible [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md]. |

**Installation:** No new runtime library is required for the core Phase 5 path if the team implements the flyout and inline confirmation with existing React + Tailwind primitives [VERIFIED: package.json] [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-UI-SPEC.md].

```bash
npm install
```

**Version verification:** Current npm registry versions checked on 2026-04-21: `react 19.2.5`, `react-router-dom 7.14.2`, `@tanstack/react-query 5.99.2`, `@trpc/client 11.16.0`, `@supabase/supabase-js 2.104.0`, `vitest 4.1.5`, `@playwright/test 1.59.1` [VERIFIED: npm registry].

## Architecture Patterns

### System Architecture Diagram

```text
User clicks Plan nav
  -> AppFrame requests latest plan id for authenticated user
    -> tRPC edge function reads meal_plans ordered by recency under RLS
      -> client navigates to /plan/:id
        -> PlanPage queries persisted plan + meals
          -> plan data is normalized into stable slot keys
            -> MealPlanGrid renders each slot as filled | empty | regenerating | error
              -> View details opens right-side flyout bound to selected slot
              -> Delete meal runs slot-scoped mutation
                -> DB mutation succeeds
                  -> query cache updates / invalidates
                    -> same slot re-renders as empty
              -> Regenerate meal runs slot-scoped mutation
                -> backend calls Grok for one slot and writes replacement meal
                  -> query cache updates / invalidates
                    -> same slot re-renders as filled with new meal
```

### Recommended Project Structure

```text
src/
├── components/generation/        # Extend existing grid/card shell; add empty/regenerating/delete-confirm/flyout surfaces
├── hooks/                        # Add use-meal-plan and slot-mutation hooks beside existing household/generation hooks
├── lib/generation/               # Reuse slot-key and meal-type normalization helpers
└── routes/                       # Keep /plan/:id orchestration in PlanPage

supabase/functions/trpc/          # Add persisted read + mutation procedures here
```

### Pattern 1: Query persisted plan data separately from stream state

**What:** Treat persisted plan loading as a React Query concern and reserve `useGenerationStream` for generation-specific streaming behavior [VERIFIED: src/hooks/use-generation-stream.ts] [VERIFIED: src/hooks/use-household.ts].

**When to use:** Use on `/plan/:id` revisit and initial load for any saved plan; do not rely on in-memory stream state after navigation or refresh [VERIFIED: src/routes/plan-page.tsx].

**Example:**

```typescript
// Source: https://trpc.io/docs/client/tanstack-react-query/usage
// Adapted to the repo's route-driven plan surface.
const trpc = useTRPC();
const planQuery = useQuery(
  trpc.mealPlan.get.queryOptions(
    { id: planId },
    { staleTime: 30_000 }
  )
);
```

### Pattern 2: Keep slot-local mutation state outside page-global loading state

**What:** Delete and regenerate should mark only the targeted slot as pending or errored, while the rest of the grid remains interactive [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md] [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-UI-SPEC.md].

**When to use:** Use for `meal.delete` and `meal.regenerate` mutations from either the card surface or the flyout [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-UI-SPEC.md].

**Example:**

```typescript
// Source: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
const queryClient = useQueryClient();
const mutation = useMutation({
  ...trpc.meal.delete.mutationOptions({
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: trpc.mealPlan.get.queryKey({ id: planId }),
      }),
  }),
});
```

### Pattern 3: Normalize DB meals into a complete grid model

**What:** Build a complete set of day × meal-type slots so deleted rows or missing rows render as intentional empty slots instead of disappearing cells [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md] [VERIFIED: src/components/generation/MealPlanGrid.tsx].

**When to use:** Immediately after fetching persisted plan data and before rendering `MealPlanGrid` [VERIFIED: src/components/generation/MealPlanGrid.tsx].

**Example:**

```typescript
// Source: local repo slot-key pattern
for (const day of days) {
  for (const mealType of activeMealTypes) {
    const slotKey = buildSlotKey(day, mealType);
    slots[slotKey] = persistedMealsByKey[slotKey] ?? { state: "empty", day, mealType };
  }
}
```

### Pattern 4: Implement the flyout as an accessible dialog shell

**What:** The right-side flyout should behave like a dialog for focus management even if it is visually a slide-over [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-UI-SPEC.md] [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/].

**When to use:** Whenever the user opens meal details from the grid [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md].

**Example:**

```typescript
// Source: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
// Core requirements to honor:
// - move focus into the flyout on open
// - trap Tab/Shift+Tab while open
// - close on Escape
// - restore focus to the invoking control on close
```

### Anti-Patterns to Avoid

- **Reusing `useGenerationStream` as the persisted data source:** That hook resets local slot state at the start of generation and has no persisted read semantics, so using it for revisit flow will make refreshes and deep links brittle [VERIFIED: src/hooks/use-generation-stream.ts].
- **Page-level loading overlay for slot regeneration:** The locked Phase 5 behavior requires in-place slot loading and replacement only for the targeted slot [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md].
- **Deleting a slot by removing the card from the array without backfilling an empty state:** That breaks the explicit empty-slot product model and destabilizes the grid layout [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md] [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-UI-SPEC.md].
- **Following `architecture.md` literally on shadcn for this phase:** The architecture document still mentions `shadcn/ui`, but the approved Phase 5 UI contract explicitly says bespoke Tailwind + CSS variables and no shadcn/Radix introduction in this phase [VERIFIED: architecture.md] [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-UI-SPEC.md].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Server API shape | Ad hoc `fetch` wrappers for CRUD [ASSUMED] | Extend the existing tRPC router and client [VERIFIED: src/lib/trpc/client.ts] [VERIFIED: supabase/functions/trpc/index.ts] | The project already has auth header propagation, typed procedures, and Deno-compatible handlers in place [VERIFIED: src/lib/trpc/client.ts] [VERIFIED: supabase/functions/trpc/index.ts]. |
| Async cache coordination | Manual local mirrors of server state across page/card/flyout [ASSUMED] | TanStack Query invalidation and mutation lifecycle hooks [VERIFIED: src/hooks/use-household.ts] [CITED: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation] | Manual mirrors become inconsistent once delete and regenerate can fire from multiple surfaces. |
| Route param parsing | Custom URL parsing [ASSUMED] | `useParams` and router-driven navigation [VERIFIED: src/routes/plan-page.tsx] [CITED: https://api.reactrouter.com/v7/functions/react-router.useParams.html] | The route tree already owns `/plan/:id`; custom parsing adds no value. |
| Flyout focus behavior | Bespoke, unverified keyboard behavior [ASSUMED] | WAI-ARIA dialog pattern requirements [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/] | Focus trapping and focus return are easy to get subtly wrong and will create accessibility regressions. |
| Slot identity | Fresh index math in every component [ASSUMED] | Existing `buildSlotKey(day, mealType)` helper and shared slot normalization [VERIFIED: src/hooks/use-generation-stream.ts] [VERIFIED: src/components/generation/MealPlanGrid.tsx] | Reusing the same slot key contract keeps stream, persisted load, and mutation updates aligned. |

**Key insight:** The repo already contains the hard parts of Phase 5's shape, including route ownership, grid layout, slot keying, and tRPC-on-Deno wiring; the planner should avoid inventing a second state model or a second API style just to add persisted management features [VERIFIED: src/app/router.tsx] [VERIFIED: src/components/generation/MealPlanGrid.tsx] [VERIFIED: src/hooks/use-generation-stream.ts] [VERIFIED: supabase/functions/trpc/index.ts].

## Common Pitfalls

### Pitfall 1: Treating missing `meals` rows as “no card” instead of “empty slot”

**What goes wrong:** After deletion, the grid collapses or shows mismatched rows/columns instead of a stable empty state [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md].

**Why it happens:** The current Phase 4 grid renders a skeleton when no slot data exists, so a naive persisted implementation may map absence to “loading” instead of “intentional empty” [VERIFIED: src/components/generation/MealPlanGrid.tsx].

**How to avoid:** Normalize fetched data into a complete slot map with explicit slot states such as `filled`, `empty`, `regenerating`, and `error` before rendering [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-UI-SPEC.md].

**Warning signs:** A deleted slot disappears, a skeleton reappears after deletion, or grid alignment shifts after slot mutations [VERIFIED: src/components/generation/MealPlanGrid.tsx].

### Pitfall 2: Letting stale requirement text override locked product decisions

**What goes wrong:** The phase plan silently reintroduces inline title editing because `PLAN-02` still says to do it [VERIFIED: .planning/REQUIREMENTS.md].

**Why it happens:** The requirements file and architecture-era assumptions lag behind the approved Phase 5 context [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md] [VERIFIED: architecture.md].

**How to avoid:** Add a planning task to reconcile or annotate the traceability mismatch and explicitly mark inline edit as deferred for Phase 5 [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md].

**Warning signs:** Any plan item or component name containing `edit title`, `rename meal`, or `save title` for Phase 5 [VERIFIED: codebase grep].

### Pitfall 3: Overloading one route state to mean both “new plan generation” and “existing plan revisit”

**What goes wrong:** `/plan/:id` becomes full of mutually exclusive branches keyed only off stream state, causing refresh and direct-link bugs [VERIFIED: src/routes/plan-page.tsx].

**Why it happens:** The current page decides what to render based on `id === "new"` and `useGenerationStream` state, which is sufficient for Phase 4 but not for persisted revisit behavior [VERIFIED: src/routes/plan-page.tsx].

**How to avoid:** Separate route mode from data mode: `id === "new"` keeps the generation form path, while real plan ids trigger a persisted query path and reuse only the grid UI [VERIFIED: src/routes/plan-page.tsx].

**Warning signs:** Refreshing `/plan/{real-id}` shows the generation form, or deep-linking to a saved plan produces an empty page until generation is retriggered [VERIFIED: src/routes/plan-page.tsx].

### Pitfall 4: Implementing the flyout visually but not accessibly

**What goes wrong:** Keyboard users lose focus, `Escape` does nothing, or focus does not return to the invoking slot action after close [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/].

**Why it happens:** Slide-over UIs often look simple but still require dialog-like keyboard and focus semantics [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/].

**How to avoid:** Treat the flyout as a dialog for roles, focus trap, close behavior, and focus restoration [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/].

**Warning signs:** Tabbing escapes into the page behind the flyout, or screen readers never announce a dialog title [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/].

## Code Examples

Verified patterns from official sources:

### Query a persisted plan through tRPC + TanStack Query

```typescript
// Source: https://trpc.io/docs/client/tanstack-react-query/usage
import { useQuery } from "@tanstack/react-query";

const trpc = useTRPC();
const planQuery = useQuery(
  trpc.mealPlan.get.queryOptions({ id: planId }, { staleTime: 30_000 })
);
```

### Invalidate plan data after a slot mutation

```typescript
// Source: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation
const queryClient = useQueryClient();

await queryClient.invalidateQueries({
  queryKey: trpc.mealPlan.get.queryKey({ id: planId }),
});
```

### Return updated/deleted rows from Supabase mutations when needed

```typescript
// Source: https://supabase.com/docs/reference/javascript/update
// Source: https://supabase.com/docs/reference/javascript/delete
const { data, error } = await supabase
  .from("meals")
  .update({ short_description: "..." })
  .eq("id", mealId)
  .select();
```

### Dialog focus rules for the flyout

```typescript
// Source: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
// On open: move focus into the flyout.
// While open: keep Tab focus inside the flyout.
// On Escape or close: restore focus to the invoking action.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tRPC “classic” React wrappers [ASSUMED] | tRPC v11 TanStack React Query-native `queryOptions` / `mutationOptions` APIs [CITED: https://trpc.io/docs/client/tanstack-react-query/usage] | Current docs in 11.x [CITED: https://trpc.io/docs/client/tanstack-react-query/usage] | New Phase 5 hooks can be planned around native TanStack Query patterns even if the repo still uses direct `trpcClient.query/mutation` calls today [VERIFIED: src/lib/trpc/client.ts]. |
| React Router v6 docs under `reactrouter.com/v6` [CITED: https://reactrouter.com/v6/hooks/use-params] | React Router v7 API reference under `api.reactrouter.com` [CITED: https://api.reactrouter.com/v7/functions/react-router.useParams.html] | By 2026-04-21 docs current [VERIFIED: web search] | Route semantics the repo uses remain compatible, but Phase 5 planning should cite v7 docs because the installed package major is 7 [VERIFIED: package.json]. |
| `architecture.md` assumption of shadcn-based component work [VERIFIED: architecture.md] | Approved Phase 5 UI contract requires bespoke Tailwind + CSS variable implementation and explicitly forbids shadcn/Radix introduction for this phase [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-UI-SPEC.md] | UI contract approved 2026-04-21 [VERIFIED: .planning/STATE.md] | Planner should follow the newer phase-specific UI contract over the older architecture document. |

**Deprecated/outdated:**
- Inline title editing as a Phase 5 deliverable is outdated for current planning even though `PLAN-02` still exists in requirements [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md].
- `Plan` nav targeting `/plan/new` by default is outdated relative to locked Phase 5 behavior [VERIFIED: src/app/layout/AppFrame.tsx] [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md].

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Extending the existing tRPC router is preferable to adding REST endpoints for Phase 5 [ASSUMED] | Standard Stack / Don't Hand-Roll | Low; if the team wants REST, the UI architecture remains similar but the API work expands. |
| A2 | A bespoke flyout implementation is sufficient without adding a new accessibility primitive library if the dialog rules are implemented correctly [ASSUMED] | Standard Stack / Architecture Patterns | Medium; if focus management proves error-prone, the planner may need to add a small accessibility helper dependency. |
| A3 | Single-slot regeneration can be modeled as a new dedicated mutation rather than reusing the exact `generate-draft` edge function path [ASSUMED] | Summary / Architecture Patterns | Medium; if the team chooses to reuse or refactor `generate-draft`, plan tasks need to shift toward shared generation utilities. |

## Open Questions (RESOLVED)

1. **Deleted meal behavior**
   Resolution: Treat Phase 5 deletion as a hard delete of the `meals` row, with the UI immediately normalizing the missing row into an intentional `empty` slot state. Do not add a soft-delete column, undo flow, or audit-history scope in this phase. This matches the current schema and the locked requirement that the slot remains visible and actionable after deletion [VERIFIED: supabase/migrations/20260419000001_initial_schema.sql] [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md].

2. **Single-slot regeneration transport**
   Resolution: Implement Phase 5 regeneration as a one-shot authenticated mutation that returns one completed replacement meal, not a per-slot streaming SSE flow. The UI contract only requires slot-local loading and in-place replacement, and a non-streaming mutation keeps the complexity aligned with one-slot scope. Revisit streaming only if real latency testing shows the one-shot replacement feels too slow in practice [VERIFIED: src/hooks/use-generation-stream.ts] [VERIFIED: supabase/functions/generate-draft/index.ts] [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md].

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend tests/build and npm scripts [VERIFIED: package.json] | ✓ [VERIFIED: local command] | `v24.14.0` [VERIFIED: local command] | — |
| npm / npx | Package scripts and version verification [VERIFIED: package.json] | ✓ [VERIFIED: local command] | `11.9.0` [VERIFIED: local command] | — |
| Deno | Supabase edge functions and local function behavior [VERIFIED: supabase/functions/trpc/index.ts] | ✓ [VERIFIED: local command] | `2.7.12` [VERIFIED: local command] | — |
| Supabase CLI | Local backend/runtime workflow [VERIFIED: .claude/skills/spike-findings-aimeal-poc/references/local-dev-infrastructure.md] | ✓ [VERIFIED: local command] | `2.84.2` [VERIFIED: local command] | — |
| Docker | Local Supabase containers [VERIFIED: spike findings] | ✓ [VERIFIED: docker ps] | running [VERIFIED: docker ps] | — |
| Netlify CLI | `netlify dev` local frontend proxy path [VERIFIED: .claude/skills/spike-findings-aimeal-poc/references/local-dev-infrastructure.md] | Partial [VERIFIED: local command + sandbox error] | Spike-tested at `24.11.1` [VERIFIED: .claude/skills/spike-findings-aimeal-poc/references/local-dev-infrastructure.md] | Use existing repo spike findings for planning; if execution needs CLI invocation, verify again outside sandbox. |

**Missing dependencies with no fallback:**
- None found for planning research [VERIFIED: local command].

**Missing dependencies with fallback:**
- Netlify CLI version could not be re-read cleanly inside sandbox because the CLI tried to touch a user preferences file; planning can rely on the repo's spike finding unless execution uncovers a real CLI issue [VERIFIED: local command] [VERIFIED: .claude/skills/spike-findings-aimeal-poc/references/local-dev-infrastructure.md].

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `3.2.4` for unit/component tests; Playwright `1.56.1` for E2E [VERIFIED: package.json] |
| Config file | `vitest.config.ts`, `playwright.config.ts` [VERIFIED: vitest.config.ts] [VERIFIED: playwright.config.ts] |
| Quick run command | `npx vitest run src/components/generation/generation-components.test.tsx` [VERIFIED: package.json] [VERIFIED: src/components/generation/generation-components.test.tsx] |
| Full suite command | `npm run test:unit` and `npm run test:e2e` [VERIFIED: package.json] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAN-01 | Persisted plan grid loads and renders all expected slots | component + e2e | `npx vitest run src/routes/plan-page.test.tsx` [ASSUMED] and `npx playwright test tests/e2e/plan-management.spec.ts` [ASSUMED] | ❌ Wave 0 |
| PLAN-02 | No inline title editing appears in Phase 5 UI | component | `npx vitest run src/components/generation/meal-plan-management.test.tsx` [ASSUMED] | ❌ Wave 0 |
| PLAN-03 | Delete flow requires confirmation and leaves an actionable empty slot | component + e2e | `npx vitest run src/components/generation/meal-plan-management.test.tsx` [ASSUMED] and `npx playwright test tests/e2e/plan-management.spec.ts` [ASSUMED] | ❌ Wave 0 |
| PLAN-04 | Detail flyout opens, traps focus, closes cleanly, and shows description/rationale | component + e2e | `npx vitest run src/components/generation/meal-detail-flyout.test.tsx` [ASSUMED] and `npx playwright test tests/e2e/plan-management.spec.ts -g "flyout"` [ASSUMED] | ❌ Wave 0 |
| GEN-05 | Regenerate one slot without disturbing other slots | component + e2e | `npx vitest run src/routes/plan-page.test.tsx` [ASSUMED] and `npx playwright test tests/e2e/plan-management.spec.ts -g "regenerate"` [ASSUMED] | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run <targeted-file>` [VERIFIED: package.json].
- **Per wave merge:** `npm run test:unit` [VERIFIED: package.json].
- **Phase gate:** `npm run test:unit` plus targeted Playwright coverage for plan management before `/gsd-verify-work` [VERIFIED: package.json] [VERIFIED: playwright.config.ts].

### Wave 0 Gaps

- [ ] `src/routes/plan-page.test.tsx` — route-level persisted load, latest-plan redirect handling, and slot mutation orchestration [VERIFIED: src/routes/plan-page.tsx].
- [ ] `src/components/generation/meal-plan-management.test.tsx` — filled/empty/regenerating/delete-confirm card states [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-UI-SPEC.md].
- [ ] `src/components/generation/meal-detail-flyout.test.tsx` — accessible flyout behavior and focus return [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/].
- [ ] `tests/e2e/plan-management.spec.ts` — revisit existing plan, delete slot, regenerate slot, open/close flyout [VERIFIED: tests/e2e/generation-flow.spec.ts].

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes [VERIFIED: route is protected] | Supabase Auth session propagated to tRPC via `Authorization` header [VERIFIED: src/lib/trpc/client.ts] [VERIFIED: supabase/functions/trpc/index.ts] |
| V3 Session Management | yes [VERIFIED: auth session use] | Supabase session handling on client and edge function user resolution [VERIFIED: src/lib/trpc/client.ts] [VERIFIED: supabase/functions/trpc/index.ts] |
| V4 Access Control | yes [VERIFIED: schema + route ownership] | RLS on `meal_plans` and `meals`, plus authed tRPC procedures [VERIFIED: supabase/migrations/20260419000001_initial_schema.sql] [VERIFIED: supabase/functions/trpc/index.ts] |
| V5 Input Validation | yes [VERIFIED: zod already used] | Zod schemas in the tRPC edge router; extend this for new Phase 5 procedures [VERIFIED: supabase/functions/trpc/index.ts] |
| V6 Cryptography | no direct new requirement [VERIFIED: phase scope] | Supabase-managed auth/session crypto; no custom crypto in Phase 5 [VERIFIED: architecture.md] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| User changes `/plan/:id` to another user's UUID | Elevation of Privilege / Information Disclosure | Query meal plans and meals only through RLS-protected procedures scoped to `auth.uid()` [VERIFIED: supabase/migrations/20260419000001_initial_schema.sql] [VERIFIED: supabase/functions/trpc/index.ts] |
| Delete or regenerate against a meal outside the current plan | Tampering | Validate both meal ownership and parent plan ownership in the mutation procedure before write [VERIFIED: supabase/migrations/20260419000001_initial_schema.sql] [ASSUMED] |
| Client shows stale optimistic state after failed mutation | Repudiation / Integrity | Use TanStack Query invalidation or rollback paths on mutation error, and show inline slot-level error state [CITED: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates] [VERIFIED: .planning/phases/05-meal-plan-grid-and-management/05-UI-SPEC.md] |
| Untrusted LLM text appears in the flyout | XSS | Render meal text as plain text in React, not HTML injection [ASSUMED] |

## Sources

### Primary (HIGH confidence)

- `package.json` - installed runtime and test stack versions [VERIFIED: package.json]
- `src/app/router.tsx`, `src/app/layout/AppFrame.tsx`, `src/routes/plan-page.tsx` - current routing and nav behavior [VERIFIED: codebase grep]
- `src/components/generation/MealPlanGrid.tsx`, `src/components/generation/MealCard.tsx`, `src/hooks/use-generation-stream.ts` - existing slot/grid implementation anchors [VERIFIED: codebase grep]
- `src/hooks/use-household.ts` - established React Query mutation/invalidation pattern [VERIFIED: src/hooks/use-household.ts]
- `supabase/functions/trpc/index.ts` - existing Deno tRPC router patterns [VERIFIED: supabase/functions/trpc/index.ts]
- `supabase/functions/generate-draft/index.ts` - current generation and meal persistence behavior [VERIFIED: supabase/functions/generate-draft/index.ts]
- `supabase/migrations/20260419000001_initial_schema.sql` - meal-plan and meal schema plus RLS [VERIFIED: supabase/migrations/20260419000001_initial_schema.sql]
- `.planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md` - locked Phase 5 product decisions [VERIFIED: 05-CONTEXT.md]
- `.planning/phases/05-meal-plan-grid-and-management/05-UI-SPEC.md` - approved Phase 5 UI contract [VERIFIED: 05-UI-SPEC.md]
- `CLAUDE.md` - binding project constraints [VERIFIED: CLAUDE.md]
- npm registry (`npm view`) - current package versions and last modified dates checked 2026-04-21 [VERIFIED: npm registry]
- tRPC TanStack Query usage docs - https://trpc.io/docs/client/tanstack-react-query/usage [CITED: https://trpc.io/docs/client/tanstack-react-query/usage]
- tRPC procedures docs - https://trpc.io/docs/server/procedures [CITED: https://trpc.io/docs/server/procedures]
- TanStack Query optimistic updates docs - https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates [CITED: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates]
- TanStack Query invalidation docs - https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation [CITED: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation]
- React Router `useParams` API - https://api.reactrouter.com/v7/functions/react-router.useParams.html [CITED: https://api.reactrouter.com/v7/functions/react-router.useParams.html]
- WAI-ARIA modal dialog pattern - https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/]
- Supabase JS delete/update docs - https://supabase.com/docs/reference/javascript/delete and https://supabase.com/docs/reference/javascript/update [CITED: https://supabase.com/docs/reference/javascript/delete] [CITED: https://supabase.com/docs/reference/javascript/update]

### Secondary (MEDIUM confidence)

- `.claude/skills/spike-findings-aimeal-poc/references/edge-functions-ai.md` - Deno/tRPC/xAI runtime findings aligned with repo choices [VERIFIED: local skill reference]
- `.claude/skills/spike-findings-aimeal-poc/references/local-dev-infrastructure.md` - local Supabase and Netlify workflow findings [VERIFIED: local skill reference]

### Tertiary (LOW confidence)

- None beyond explicit `[ASSUMED]` items in this document [VERIFIED: self-audit].

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing repo usage, current npm registry checks, and official docs all align on the Phase 5 implementation path [VERIFIED: package.json] [VERIFIED: npm registry] [CITED: https://trpc.io/docs/client/tanstack-react-query/usage].
- Architecture: HIGH - the route, grid, slot keying, schema, and locked context all point to one clear persisted-management extension path [VERIFIED: src/routes/plan-page.tsx] [VERIFIED: src/components/generation/MealPlanGrid.tsx] [VERIFIED: supabase/migrations/20260419000001_initial_schema.sql] [VERIFIED: 05-CONTEXT.md].
- Pitfalls: HIGH - the main failure modes are directly visible from current code/requirements mismatches and official accessibility/state-management guidance [VERIFIED: src/routes/plan-page.tsx] [VERIFIED: .planning/REQUIREMENTS.md] [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/] [CITED: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates].

**Research date:** 2026-04-21 [VERIFIED: system date]
**Valid until:** 2026-05-21 for local codebase findings; re-check npm registry and external docs before any dependency upgrade work [VERIFIED: npm registry] [ASSUMED]
