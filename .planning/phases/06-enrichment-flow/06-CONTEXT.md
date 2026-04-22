# Phase 6: Enrichment Flow - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Upgrade existing draft meals with real Spoonacular recipe data, keep enrichment cache-first and user-controlled, update the saved meal grid live as enrichment completes, expand the existing right-side flyout into a full recipe view for enriched meals, and fill in the Spoonacular usage section on `/dev`.

</domain>

<decisions>
## Implementation Decisions

### Selection flow
- **D-01:** Enrichment uses an explicit multi-select mode in the meal grid rather than one-off enrichment only.
- **D-02:** Multi-select mode must include a visible `Select all` action that immediately selects every meal currently shown in the grid.
- **D-03:** Once one or more meals are selected, the UI should expose a clear batch enrichment action from the grid context.
- **D-04:** Phase 6 is optimized for enriching several meals at once; downstream planning should treat batch selection as a first-class flow, not a secondary enhancement.

### Enrichment progress and failure handling
- **D-05:** Enrichment progress is local to each selected meal card. Each selected card enters its own loading state while the batch runs.
- **D-06:** Enriched cards update live in the grid as soon as each meal completes. The page does not wait for the whole batch to finish before showing completed results.
- **D-07:** Failures remain local to the affected card or slot. A failed enrichment must not block or roll back the rest of the selected meals.
- **D-08:** Failed enrichments should expose a direct retry path on the affected meal card rather than forcing a full-batch retry.

### Recipe match policy
- **D-09:** The app should automatically use the best Spoonacular match and enrich immediately. No manual confirmation step is required in Phase 6.
- **D-10:** Cache behavior remains non-negotiable: once a Spoonacular recipe id is resolved and stored, future enrichments should reuse cached recipe data instead of making duplicate API calls.
- **D-11:** Downstream planning can assume the match-selection UX is invisible by default. The user is not asked to arbitrate between multiple Spoonacular results in this phase.

### Flyout recipe presentation
- **D-12:** The existing right-side flyout remains the primary recipe-detail surface. Phase 6 extends it rather than replacing it with a modal, inline expansion, or separate route.
- **D-13:** Enriched flyout content should emphasize, in order: hero image, ingredients, step-by-step instructions, and nutrition summary.
- **D-14:** Draft rationale should still remain visible in the enriched flyout, but lower in the panel after the real recipe data.
- **D-15:** The flyout should feel like a full recipe view layered onto the existing management shell, while keeping the weekly grid visible behind it.

### Dev page usage reporting
- **D-16:** The Spoonacular section on `/dev` should show daily points used versus the daily limit.
- **D-17:** The same section should also show requests made, cache hits, cache misses, and a per-call breakdown.
- **D-18:** Phase 6 should treat usage visibility as both a debugging surface and a cost-control surface, not just a decorative counter.

### Existing product constraints carried into Phase 6
- **D-19:** Phase 6 inherits the Phase 5 right-side flyout shell and the persisted `/plan/:id` grid-management surface. Enrichment must fit into that existing interaction model.
- **D-20:** Phase 6 inherits the project-level cost-control rule that Spoonacular usage is user-controlled and aggressively cached.

### the agent's Discretion
- Exact visual treatment for multi-select affordances, including whether selection is checkbox-led, chip-led, or card-overlay-led
- Exact wording for the batch action bar and the `Select all` affordance
- Exact loading copy and status-chip labels for `draft`, `enriching`, and `enriched`
- Exact nutrition-summary layout inside the flyout, so long as ingredients and instructions remain primary readable content
- Exact `/dev` table or card layout for the per-call Spoonacular breakdown

</decisions>

<specifics>
## Specific Ideas

- The user wants enrichment to feel controllable in bulk: turn on selection mode, optionally hit `Select all`, then enrich the whole visible plan.
- Progress should feel slot-local and alive. The user should see individual meals resolve into enriched cards as they finish rather than waiting on a batch-level spinner.
- The app should auto-accept Spoonacular's best match to preserve flow speed; Phase 6 is not a manual recipe-picking workflow.
- The flyout should graduate from a draft-detail view into a full recipe panel without losing the earlier draft rationale context entirely.
- The `/dev` page should make Spoonacular spend legible enough that developers can see both daily budget posture and the underlying calls that created it.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements and current state
- `.planning/ROADMAP.md` — Phase 6 goal, success criteria, testing expectations, and dependency on the Phase 5 management surface
- `.planning/REQUIREMENTS.md` — `ENRCH-01`, `ENRCH-02`, `ENRCH-03`, `ENRCH-04`, `ENRCH-05`, `DEVT-02`, `DEVT-04`
- `.planning/STATE.md` — Current project state and the handoff from completed Phase 5 work into Phase 6

### Prior phase decisions
- `.planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md` — Locked decisions for persisted `/plan/:id`, slot-level management, and the right-side flyout shell that Phase 6 must extend
- `.planning/phases/04-draft-generation-with-streaming/04-CONTEXT.md` — Earlier grid, dev-page, and generation decisions that Phase 6 builds on

### Architecture and enrichment references
- `architecture.md` — End-to-end architecture, enrichment workflow, schema intent, concurrency note, and dev-tools expectations
- `.claude/skills/spike-findings-aimeal-poc/references/spoonacular-enrichment.md` — Validated two-call Spoonacular flow, field mapping, cache landmines, and max-5 concurrency guidance
- `.planning/spikes/005-spoonacular-recipe-shape/README.md` — Confirmed Spoonacular response shape and exact mapping for ingredients, nutrition, instructions, and image data

### Existing code anchors
- `supabase/migrations/20260419000001_initial_schema.sql` — Existing `meals` and `spoonacular_cache` columns already available for enrichment storage
- `supabase/functions/trpc/index.ts` — Current tRPC patterns, authenticated procedures, and the existing `/dev` LLM logs implementation that Phase 6 should mirror for Spoonacular usage reporting
- `src/routes/plan-page.tsx` — Current persisted-plan orchestration and flyout integration point
- `src/components/generation/MealPlanGrid.tsx` — Grid surface that will absorb selection mode and live enrichment-state updates
- `src/components/generation/MealCard.tsx` — Existing managed meal-card shell that will need selection and enrichment affordances
- `src/components/generation/MealDetailFlyout.tsx` — Existing right-side flyout to expand into full recipe detail
- `src/routes/dev-page.tsx` — Existing `/dev` page with Spoonacular placeholder section ready for Phase 6 implementation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/routes/plan-page.tsx` — Already owns persisted-plan rendering, selected-slot flyout state, and slot-level mutation integration
- `src/components/generation/MealPlanGrid.tsx` — Already renders responsive mobile and desktop grids and can host selection-mode behavior without replacing the layout
- `src/components/generation/MealCard.tsx` — Existing editorial card shell can absorb selection affordances, enrichment-state UI, and enriched-status indicators
- `src/components/generation/MealDetailFlyout.tsx` — Existing accessible flyout infrastructure is already in place; Phase 6 mainly changes content depth
- `src/routes/dev-page.tsx` — Already uses a two-section dev-tools layout, so Spoonacular reporting can replace the placeholder without a route redesign
- `supabase/functions/trpc/index.ts` — Already contains authenticated tRPC routers, plan reads, meal mutations, and dev-tools query patterns that enrichment procedures can follow

### Established Patterns
- The app already treats `/plan/:id` as the durable management surface. Phase 6 should enrich within that route instead of inventing a separate recipe workflow.
- The right-side flyout is already the chosen detail-view pattern and should stay the anchor for richer recipe content.
- Grid changes are expected to be slot-local and live-updating; this matches both the earlier streaming architecture and the Phase 5 single-slot management behavior.
- Editorial UI remains the visual contract: spacious cards, clear hierarchy, and calm status changes rather than admin-dashboard density.

### Integration Points
- Selected meal ids from the grid need a new enrichment mutation path that can process multiple meals while respecting cache-first behavior and concurrency limits.
- Meal rows already have `status`, `spoonacular_recipe_id`, `ingredients`, `nutrition`, `instructions`, and `image_url` columns, so Phase 6 can enrich in place without introducing a parallel recipe table.
- The shared `spoonacular_cache` table already exists and should be treated as the authoritative cross-plan recipe cache.
- `/dev` already has a Spoonacular placeholder section, so Phase 6 only needs to add the reporting queries and presentation rather than inventing a new diagnostics page.

</code_context>

<deferred>
## Deferred Ideas

- Manual confirmation or chooser UI for Spoonacular search matches — not part of Phase 6 because the user chose automatic best-match enrichment
- Background-job enrichment flow where the user leaves and returns later — rejected for this phase in favor of live card-level progress
- Recipe-picking marketplace or side-by-side alternatives per meal — out of scope for this phase
- Finalized shopping-list generation from enriched ingredients — Phase 7
- Favorites controls tied to enriched recipe data — Phase 7

</deferred>

---

*Phase: 06-enrichment-flow*
*Context gathered: 2026-04-22*
