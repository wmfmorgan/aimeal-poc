# Phase 5: Meal Plan Grid & Management - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Turn `/plan/:id` into a real persisted meal-plan management surface. Users should be able to revisit an existing draft plan, view meals in the day-by-meal-type grid, open meal details, delete a meal, and regenerate a single slot without regenerating the full plan.

</domain>

<decisions>
## Implementation Decisions

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

</decisions>

<specifics>
## Specific Ideas

- The user does not want cards to feel editable. If a meal is wrong, the system should replace it rather than ask the user to manually patch it.
- The right-side flyout was chosen because it leaves the weekly grid visible while giving enough space for description and rationale.
- Deleting should feel safe and deliberate, but once the slot is empty the next action should be obvious: regenerate that slot.
- Regeneration should feel local to the slot, not like a background batch job or a page-level loading event.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements and state
- `.planning/ROADMAP.md` — Phase 5 goal, success criteria, and current mismatch with the locked "no inline edit" decision
- `.planning/REQUIREMENTS.md` — `PLAN-01`, `PLAN-02`, `PLAN-03`, `PLAN-04`, `GEN-05`; includes the stale inline-edit requirement that must be reconciled
- `.planning/STATE.md` — Current project status and the handoff into Phase 5

### Prior phase decisions
- `.planning/phases/04-draft-generation-with-streaming/04-CONTEXT.md` — Locked grid, streaming, and Phase 5 deferrals for detail view / delete / regenerate
- `.planning/phases/04-draft-generation-with-streaming/04-UI-SPEC.md` — Existing grid layout, card shell, mobile/desktop structure, and post-generation expectations
- `.planning/phases/03-household-setup/03-CONTEXT.md` — Editorial interaction patterns and existing route expectations

### Architecture and implementation anchors
- `architecture.md` — Intended component structure, route shape, and app architecture
- `supabase/migrations/20260419000001_initial_schema.sql` — `meal_plans` and `meals` schema, status fields, and persistence constraints
- `supabase/functions/trpc/index.ts` — Existing tRPC patterns and current `mealPlan.create` procedure

### Existing UI and client code
- `src/routes/plan-page.tsx` — Current generation-first route that Phase 5 must evolve into persisted plan management
- `src/components/generation/MealPlanGrid.tsx` — Existing grid layout for mobile and desktop
- `src/components/generation/MealCard.tsx` — Current display-only card shell that Phase 5 will expand into management actions
- `src/hooks/use-generation-stream.ts` — Existing slot mapping pattern and generation integration to extend for single-slot regeneration

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/generation/MealPlanGrid.tsx` — Already renders the correct mobile stack and desktop day-column layout; Phase 5 should extend this rather than replace it.
- `src/components/generation/MealCard.tsx` — Existing editorial card shell can become the managed meal-card surface.
- `src/routes/plan-page.tsx` — Already owns the `/plan/:id` route and can grow from generation flow into persisted management flow.
- `supabase/functions/generate-draft/index.ts` — Existing generation path and meal persistence behavior provide the baseline for slot regeneration logic.

### Established Patterns
- The app already uses React + route-driven screens, with `/plan/:id` as the stable plan surface.
- Desktop grid and mobile stacked-day presentation are already implemented and were restored as a validated Phase 4 layout.
- Editorial UI pattern is glassy, spacious, and non-bureaucratic; management actions should fit that style rather than look like dense admin controls.
- tRPC handles structured CRUD-style app operations, while the standalone edge function handles AI generation and streaming.

### Integration Points
- `/plan/:id` needs a real persisted-plan read path so revisits hydrate from DB rather than only from stream state.
- The app shell nav should resolve the user's latest plan and route there by default.
- Meal deletion and single-slot regeneration require per-slot state updates without losing the rest of the loaded grid.
- The right-side flyout should be designed to absorb future enriched recipe details in Phase 6 without forcing a UX reset.

</code_context>

<deferred>
## Deferred Ideas

- Inline title editing — explicitly deferred / removed from Phase 5 despite current roadmap wording
- Plan chooser / plan history browser before opening a plan — not chosen for Phase 5
- Regeneration only from inside the flyout — rejected in favor of direct slot actions
- Full enrichment details inside the flyout — Phase 6
- Favorites from the card or flyout — Phase 7

</deferred>

---

*Phase: 05-meal-plan-grid-and-management*
*Context gathered: 2026-04-21*
