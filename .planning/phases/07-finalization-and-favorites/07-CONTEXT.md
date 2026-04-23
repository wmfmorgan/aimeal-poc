# Phase 7: Finalization & Favorites - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Allow users to finalize a meal plan into a consolidated shopping list and save enriched meals into a persistent favorites library. This phase extends the existing persisted `/plan/:id` management surface and right-side flyout rather than introducing a separate primary workflow.

</domain>

<decisions>
## Implementation Decisions

### Finalization policy
- **D-01:** Finalization is allowed even when a plan still contains mixed meal states.
- **D-02:** Any meal that is not enriched at finalization time is discarded from the finalized plan rather than carried through as a draft placeholder.
- **D-03:** The finalize confirmation/warning must state clearly that draft meals will be removed if the user proceeds.
- **D-04:** Downstream planning should treat finalization as a state transition that operates only on the enriched subset of the plan.

### Shopping list generation
- **D-05:** The finalized shopping list should prefer Spoonacular-provided ingredient categories when they are available on the stored enriched ingredient payload.
- **D-06:** If ingredient categories are missing or incomplete, the shopping list must still render cleanly using a graceful fallback rather than blocking finalization.
- **D-07:** The shopping list must be de-duplicated across finalized meals.
- **D-08:** De-duplication must preserve correct rolled-up quantity totals. If multiple finalized meals require the same ingredient, it should appear once with the combined quantity (for example, tomato appears once with quantity `2` rather than two separate tomato entries).

### Favorite eligibility
- **D-09:** Only enriched meals can be favorited.
- **D-10:** Favorites are therefore recipe-backed entries, not draft-only ideas or placeholders.
- **D-11:** Downstream planning should treat any favorite/save affordance on draft meals as unavailable or disabled rather than as a temporary local state.

### Favorites library access
- **D-12:** The persistent favorites library should be accessed from a panel or flyout launched from the existing plan screen.
- **D-13:** Phase 7 should not introduce a new top-level `/favorites` route as the primary library surface.
- **D-14:** Favorites should feel like an extension of the current plan-management workspace, consistent with the existing flyout-driven interaction model from Phases 5 and 6.

### Carried-forward product constraints
- **D-15:** Phase 7 inherits the persisted `/plan/:id` grid-management model from Phase 5 and the recipe-first flyout shell from Phase 6.
- **D-16:** Finalization and favorites must fit into the established editorial, calm, non-dashboard visual language rather than introducing a utility-heavy checklist UI.

### the agent's Discretion
- Exact copy for the finalize warning, success state, and any “discard draft meals” messaging
- Exact visual treatment for shopping-list groups, quantity formatting, and copy-to-clipboard affordance
- Exact placement of the entry point that opens the favorites panel from the plan screen or flyout
- Exact browse/manage interactions inside the favorites panel, as long as it remains panel-based rather than a new primary route

</decisions>

<specifics>
## Specific Ideas

- Finalization should feel like committing the plan you actually want to cook, not freezing unfinished draft ideas.
- The shopping list should read like a practical grocery artifact: one ingredient line per de-duplicated item with the correct rolled-up quantity.
- Ingredient grouping should use Spoonacular categories when possible, but the feature should not depend on those categories being perfectly populated.
- Favorites are meant to preserve real recipes the user loves, not AI-only draft concepts.
- The favorites library should stay close to the plan experience, opening as a panel rather than sending the user to a disconnected screen.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements and state
- `.planning/ROADMAP.md` — Phase 7 goal, success criteria, testing expectations, and dependency on Phase 6
- `.planning/REQUIREMENTS.md` — `FINAL-01`, `FINAL-02`, `FINAL-03`, `FAV-01`, `FAV-02`
- `.planning/STATE.md` — Current project state and handoff from Phase 6

### Prior phase decisions
- `.planning/phases/06-enrichment-flow/06-CONTEXT.md` — Locked enrichment, flyout, and recipe-data constraints that Phase 7 builds on
- `.planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md` — Locked persisted `/plan/:id` grid-management model and right-side flyout interaction pattern
- `.planning/phases/04-draft-generation-with-streaming/04-CONTEXT.md` — Existing plan surface and status/state assumptions carried forward

### Architecture and enrichment references
- `architecture.md` — Finalization workflow, shopping-list storage, favorites table intent, and overall product architecture
- `.claude/skills/spike-findings-aimeal-poc/references/spoonacular-enrichment.md` — Confirmed Spoonacular ingredient payload shape used for shopping-list generation
- `.planning/spikes/005-spoonacular-recipe-shape/README.md` — Validated enriched ingredient fields and current stored recipe data shape

### Existing code anchors
- `supabase/migrations/20260419000001_initial_schema.sql` — `meal_plans.generation_status`, `meal_plans.shopping_list`, `meals.is_favorite`, and `favorite_meals` schema/RLS
- `supabase/functions/trpc/index.ts` — Existing authenticated procedure patterns, persisted plan reads, meal mutations, and current plan-status handling
- `src/routes/plan-page.tsx` — Current persisted-plan orchestration, selection/enrichment actions, and plan header surface where Phase 7 entry points will attach
- `src/components/generation/MealPlanGrid.tsx` — Existing meal-grid surface that may absorb favorite affordances
- `src/components/generation/MealCard.tsx` — Existing card-level action surface for meal management
- `src/components/generation/MealDetailFlyout.tsx` — Existing right-side flyout to extend with favorite/save actions and potentially the favorites entry point
- `src/hooks/use-meal-plan.ts` — Persisted plan query/mutation pattern to extend for finalization and favorite state refresh

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/routes/plan-page.tsx` — Already owns the plan header, action entry points, persisted-plan state, and flyout wiring; Phase 7 should extend this route rather than invent a new screen.
- `src/components/generation/MealCard.tsx` — Existing card actions can absorb favorite affordances once eligibility is satisfied.
- `src/components/generation/MealDetailFlyout.tsx` — Existing flyout is the natural place for recipe-backed favorite actions and related plan-level panel launches.
- `src/hooks/use-meal-plan.ts` — Existing React Query invalidation pattern should extend cleanly to finalization and favorite mutations.

### Established Patterns
- `/plan/:id` is already the durable management surface for a persisted plan.
- Detail interactions already happen through a right-side overlay while keeping the grid visible.
- Enriched meal data is stored directly on `meals`, so shopping-list aggregation can operate on the stored ingredient payload without introducing a parallel recipe store.
- Editorial UI conventions are already established: glassy panels, spacious layout, soft hierarchy, and non-bureaucratic controls.

### Integration Points
- Finalization should update persisted plan state through the tRPC layer and write the generated shopping list into `meal_plans.shopping_list`.
- Favorite mutations should rely on the enriched meal payload already stored on `meals` and persist reusable records into `favorite_meals`.
- The plan screen needs one or more new entry points for `Finalize Plan`, `View shopping list`, and opening the favorites library panel without breaking the current grid/flyout flow.
- Shopping-list generation logic needs to aggregate across enriched meal ingredients, prefer category metadata when present, and gracefully handle missing category fields.

</code_context>

<deferred>
## Deferred Ideas

- Dedicated top-level `/favorites` route — rejected for Phase 7 in favor of a panel/flyout access pattern
- Favoriting draft-only meals — rejected; favorites must remain enriched and recipe-backed
- Keeping draft meals in the finalized plan as placeholders — rejected; draft meals are discarded on finalize
- Manual grocery categorization workflow — not required if Spoonacular categories are missing; fallback display is sufficient for this phase

</deferred>

---

*Phase: 07-finalization-and-favorites*
*Context gathered: 2026-04-22*
