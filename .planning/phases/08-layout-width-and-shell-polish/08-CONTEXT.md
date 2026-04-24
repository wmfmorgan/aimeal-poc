# Phase 8: Layout Width & Shell Polish - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Refine the app shell and page-level layout so PlanPlate uses horizontal space more effectively across desktop, tablet, and mobile. This phase focuses on container width, spacing, and responsive composition for the existing routes and shared surfaces, with special priority on the persisted `/plan/:id` experience. It does not introduce new meal-card behaviors, new flyout behaviors, or backend changes.

</domain>

<decisions>
## Implementation Decisions

### Shell width strategy
- **D-01:** Phase 8 should reduce outer chrome broadly across the app, not just on the plan route.
- **D-02:** The app shell should still preserve the established editorial feel; the goal is less wasted margin, not a full-bleed utility layout.
- **D-03:** Downstream planning should treat `AppFrame` and shared page containers as primary Phase 8 refactor points.

### Plan page composition
- **D-04:** The persisted `/plan/:id` page is grid-first. When width is reclaimed, the meal grid gets the biggest benefit.
- **D-05:** The plan header and supporting action areas should remain comparatively compact above the grid rather than competing with it for horizontal emphasis.
- **D-06:** The finalization surface can be rebalanced for consistency, but it should not become the dominant width consumer on the page.

### Dense desktop and tablet behavior
- **D-07:** Dense multi-day layouts should use an adaptive density strategy rather than a fixed spacing rule.
- **D-08:** Four-day layouts can stay relatively spacious, while six- and seven-day layouts should intentionally tighten spacing and gutters so the week remains scannable.
- **D-09:** The preferred direction is to fit more of the plan cleanly on screen before accepting horizontal overflow as the default answer.

### Mobile and tablet responsiveness
- **D-10:** Phase 8 should make moderate responsive changes below desktop.
- **D-11:** Tablet layouts should become noticeably more effective at using width for the plan experience.
- **D-12:** Mobile can keep the existing stacked model, but spacing should be tightened so the layout feels less wasteful and more deliberate.

### Shared polish scope
- **D-13:** The spacing and container cleanup pass should apply to all other app pages, not only the plan flow.
- **D-14:** This broader pass is still layout polish only: width, margins, section spacing, and page composition can change, but Phase 8 should not become a stealth refactor of meal cards, flyouts, or unrelated interaction patterns.
- **D-15:** Downstream planning should include light page-level cleanup for the main routed surfaces already present in the app shell: home (`/`), household (`/household`), plan (`/plan/:id` and `/plan/new`), dev (`/dev`), and auth (`/auth`) where shell treatment or spacing overlaps with the broader width strategy.

### Carried-forward product constraints
- **D-16:** The right-side flyout remains the canonical detail pattern from earlier phases; Phase 8 should accommodate that surface spatially without redefining it.
- **D-17:** The persisted `/plan/:id` route remains the durable meal-management workspace; width polish should reinforce that flow rather than fragment it across new views.
- **D-18:** This phase is visual and structural only. No backend logic, no new generation behavior, and no new detailed meal-surface capabilities belong here.

### the agent's Discretion
- Exact `max-width`, padding, and breakpoint values for `AppFrame` and shared page sections
- Exact gutter-tightening rules as day count increases in the plan grid
- Exact spacing adjustments on non-plan routes, as long as they remain clearly in layout-polish territory
- Whether some secondary surfaces keep slightly more breathing room than the plan route to preserve hierarchy

</decisions>

<specifics>
## Specific Ideas

- The user wants the whole app to feel less margin-heavy, with the plan page benefiting most clearly from the reclaimed width.
- The grid is the star of the Phase 8 plan-page work; surrounding sections should support it rather than visually rival it.
- Seven-day plan views should feel intentionally denser than four-day views instead of forcing one static card spacing model across both.
- Tablet should get a more meaningful layout improvement, while mobile should stay structurally familiar but tighter.
- "All of the other pages" means the width/spacing cleanup pass should not stop at the plan route, but it also should not spill into card/flyout feature redesign work.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 8 goal, success criteria, testing expectations, and relationship to later card/flyout phases
- `.planning/REQUIREMENTS.md` — `LAY-01`, `LAY-02`, and `UI-02`
- `.planning/STATE.md` — Current milestone state and the handoff into Phase 8
- `.planning/PROJECT.md` — Milestone framing and the production-ready width/polish direction

### Prior phase decisions that constrain Phase 8
- `.planning/phases/05-meal-plan-grid-and-management/05-CONTEXT.md` — Locked persisted plan route, grid-management model, and right-side flyout pattern
- `.planning/phases/06-enrichment-flow/06-CONTEXT.md` — Locked flyout role and live grid-management constraints
- `.planning/phases/07-finalization-and-favorites/07-CONTEXT.md` — Locked plan/favorites/finalization route structure that Phase 8 must preserve while re-spacing

### Existing app shell and routed surfaces
- `src/app/layout/AppFrame.tsx` — Global shell width, page chrome, nav placement, and current max-width behavior
- `src/app/router.tsx` — Route map for the pages included in the broader spacing pass
- `src/routes/home-page.tsx` — Home route surface to evaluate during shell-wide spacing cleanup
- `src/routes/household-page.tsx` — Household route layout and section spacing
- `src/routes/plan-page.tsx` — Main Phase 8 target; current page composition and section wrappers
- `src/routes/dev-page.tsx` — Dev route spacing and container composition
- `src/routes/auth-page.tsx` — Auth route spacing if shell-level changes cascade there

### Existing plan-related UI surfaces
- `src/components/generation/MealPlanGrid.tsx` — Current desktop/mobile grid structure and day-count-sensitive layout anchor
- `src/components/generation/PlanFinalizationCard.tsx` — Adjacent plan-page section that may need composition cleanup
- `src/components/generation/FavoritesPanel.tsx` — Existing overlay surface to keep visually aligned if spacing changes affect its surrounding flow
- `src/components/generation/MealDetailFlyout.tsx` — Canonical detail surface whose role is preserved, not redesigned, in this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/layout/AppFrame.tsx` — Already centralizes the outer shell margin, max-width, and main content framing for most of the app.
- `src/routes/plan-page.tsx` — Already composes the plan header, finalization card, selection controls, meal grid, and overlays in one route, making it the right place to rebalance vertical and horizontal emphasis.
- `src/components/generation/MealPlanGrid.tsx` — Already separates mobile and desktop grid behavior, so adaptive width/density changes can build on the current responsive split instead of replacing it.
- `src/components/generation/PlanFinalizationCard.tsx` and `src/components/generation/FavoritesPanel.tsx` — Existing adjacent surfaces can absorb spacing cleanup without changing their fundamental behaviors.

### Established Patterns
- The visual system is editorial, glassy, and soft-edged rather than dashboard-like; width reclamation needs to keep that tone.
- The app already relies on rounded section shells with consistent translucent backgrounds and generous padding, so Phase 8 is mostly about recalibrating those values rather than inventing a new layout language.
- The plan experience is already the densest information surface in the app, so it is the correct place to spend most of the reclaimed horizontal space.
- Mobile and desktop are already distinct in the meal grid, which supports an adaptive-density strategy across breakpoints.

### Integration Points
- Global shell changes will flow through every routed page mounted inside `AppFrame`.
- Plan-page spacing changes need to account for the header card, finalization card, selection actions, and grid as one composed screen.
- Grid density changes need to respond to `numDays` without breaking the established meal-type row and day-column structure.
- The wider pass across auth, home, household, and dev should stay page-level and route-level so later phases can still own the actual meal-card and flyout refactors cleanly.

</code_context>

<deferred>
## Deferred Ideas

- Compact meal-card content refactor — Phase 9
- Click-card-to-open-flyout behavior and removal of separate `View details` actions — Phase 9
- Flyout becoming the canonical full-detail meal surface in implementation — Phase 10
- Shared meal-surface visual alignment beyond spacing/container polish — Phase 10
- Regression-heavy responsive verification and production-readiness signoff — Phase 11

</deferred>

---

*Phase: 08-layout-width-and-shell-polish*
*Context gathered: 2026-04-23*
