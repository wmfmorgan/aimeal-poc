# Phase 9: Compact Meal Card Refactor - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Refactor meal cards so they become a compact, consistent, scan-friendly surface across dense meal-plan contexts and any focused single-meal card contexts. This phase covers card payload, card-triggered flyout entry, compact action affordances, and removal of redundant meal-type labels when the surrounding layout already provides that context. It does not move rich meal detail back into cards and does not redesign the flyout into a different surface.

</domain>

<decisions>
## Implementation Decisions

### Card payload and information density
- **D-01:** Dense grid cards should show only the compact core payload: title, status, and direct compact actions.
- **D-02:** Dense grid cards should remove the current summary/description line instead of keeping any supporting text block.
- **D-03:** Focused single-meal card contexts should use the same compact payload as dense cards rather than becoming a richer detail surface.
- **D-04:** Focused cards may expand slightly in spacing or size, but not in information density.

### Meal-type label handling
- **D-05:** When the surrounding layout already communicates breakfast, lunch, or dinner, the card should not repeat that meal-type label.
- **D-06:** This rule applies across both dense and focused card contexts when the surrounding context is already clear.

### Flyout entry and detail ownership
- **D-07:** Clicking anywhere on a meal card should open the flyout.
- **D-08:** Richer context belongs only in the flyout, not in the card body.
- **D-09:** This same click-to-open-flyout behavior should apply anywhere the compact meal card component is used.

### Direct card actions
- **D-10:** Compact cards should keep only delete and regenerate as direct actions.
- **D-11:** Favorite controls should be removed from the compact card surface entirely.
- **D-12:** Regenerate should remain directly available on the card rather than moving into the flyout-only flow.

### Icon treatment and accessibility
- **D-13:** Delete and regenerate should both use compact icon treatments rather than text buttons.
- **D-14:** Both compact action icons should expose tooltips.
- **D-15:** The delete icon should live in the top-right area of the card chrome.
- **D-16:** The delete icon should remain visible at all times rather than appearing only on hover or focus.
- **D-17:** The existing inline delete confirmation pattern should remain attached to the card interaction after the delete icon is pressed.

### Favorite behavior
- **D-18:** Favorite is no longer a direct card affordance in this phase.
- **D-19:** Favorite should instead appear in the flyout as a clickable star affordance.

### Focused-card consistency
- **D-20:** Focused cards and dense cards should share the same behavior model: click opens flyout, compact icon actions remain available, and only spacing/size may loosen slightly.
- **D-21:** Phase 9 should strengthen one compact card system rather than creating separate dense-card and focused-card interaction models.

### Carried-forward product constraints
- **D-22:** The right-side flyout remains the detailed meal surface carried forward from Phases 5 and 6.
- **D-23:** This phase is a UI and interaction refactor only; it should reuse existing meal-management behavior rather than introduce new backend capability.

### the agent's Discretion
- Exact icon choices for regenerate, delete, and favorite-star affordances
- Exact tooltip copy, timing, and placement
- Exact spacing differences between dense and focused card variants
- Exact hover, focus-ring, and pressed-state treatments for the compact card and its icon affordances

</decisions>

<specifics>
## Specific Ideas

- The user wants a genuinely compact card, not the current card with smaller spacing.
- Focused cards should still feel like the same card system, not a second detail surface.
- The flyout should absorb all richer meal context so later flyout work in Phase 10 stays coherent.
- Delete and regenerate should stay fast to access from the card, but favorites should move into the flyout.
- Compact icon actions must remain understandable and accessible through tooltip support and preserved confirmation behavior.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and milestone requirements
- `.planning/ROADMAP.md` — Phase 9 goal, success criteria, and testing expectations
- `.planning/REQUIREMENTS.md` — `CARD-01`, `CARD-02`, `CARD-03`, `CARD-04`, `CARD-05`
- `.planning/PROJECT.md` — Milestone-level compact-card and canonical-flyout direction
- `.planning/STATE.md` — Current milestone handoff after Phase 8 completion

### Prior phase decisions that constrain Phase 9
- `.planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md` — Locked right-side flyout pattern, slot-level management model, and direct regenerate/delete expectations
- `.planning/phases/06-enrichment-flow/06-CONTEXT.md` — Locked enriched flyout role and card-local status/update behavior
- `.planning/phases/07-finalization-and-favorites/07-CONTEXT.md` — Locked recipe-backed favorites policy and existing flyout/favorites relationship
- `.planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md` — Phase 8 deferral of compact-card behavior changes into Phase 9

### Existing code anchors
- `src/components/generation/MealCard.tsx` — Current over-detailed meal card with summary text, text actions, and `View details`
- `src/components/generation/MealPlanGrid.tsx` — Dense grid and focused/mobile card usage contexts that Phase 9 must standardize
- `src/routes/plan-page.tsx` — Current wiring for card actions, selected-slot flyout opening, and favorites state propagation
- `src/components/generation/MealDetailFlyout.tsx` — Existing canonical detail surface that should absorb richer context and favorite affordances
- `src/components/generation/FavoritesPanel.tsx` — Existing favorites surface that still informs the favorite-open behavior downstream
- `src/components/generation/PlanFinalizationCard.tsx` — Existing non-card meal-adjacent control surface that should not be conflated with compact meal-card actions

### Existing regression anchors
- `src/components/generation/generation-components.test.tsx` — Current card rendering assertions that will need to shift from descriptive text to compact-card expectations
- `src/components/generation/meal-plan-management.test.tsx` — Existing delete confirmation and grid management tests that must remain valid after icon-based card actions
- `src/routes/plan-page.test.tsx` — Existing route-level coverage for flyout opening and favorites-related behavior that Phase 9 will affect

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/generation/MealCard.tsx` already centralizes meal-card rendering, so Phase 9 should refactor one shared card component instead of branching into separate dense and focused implementations.
- `src/components/generation/MealPlanGrid.tsx` already renders the same card component across mobile/focused and desktop/dense contexts, which makes consistency across contexts achievable in a single pass.
- `src/routes/plan-page.tsx` already wires card click, delete, regenerate, flyout open, and favorite state, so the phase can mostly recompose behavior instead of inventing new flows.
- `src/components/generation/MealDetailFlyout.tsx` already owns detailed meal presentation and can absorb the moved favorite control without creating a second detailed surface.

### Established Patterns
- The app already treats the right-side flyout as the detail anchor while keeping the grid visible behind it.
- Slot-level meal management already assumes regenerate and delete are quick actions, so compact-card work should preserve that speed.
- Earlier phases already established that favorites are recipe-backed and tied closely to richer meal detail, which supports moving that control off the compact card.
- The UI language is editorial and soft-edged, so compacting the card should mean reducing payload and action clutter rather than making it feel utilitarian or admin-like.

### Integration Points
- Card click behavior in `MealCard` and `MealPlanGrid` must be reconciled with direct icon-button actions so the whole card opens the flyout without action clicks leaking through.
- Existing delete confirmation in `MealCard` must survive the shift from text button to icon affordance.
- Favorite state currently passed into cards from `plan-page.tsx` will need to move toward flyout-driven presentation without losing the current data flow.
- Route and component tests already cover card rendering, delete confirmation, and flyout behavior, making them the main regression net for this refactor.

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-compact-meal-card-refactor*
*Context gathered: 2026-04-23*
