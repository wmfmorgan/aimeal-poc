# Phase 8: Layout Width & Shell Polish - Research

**Researched:** 2026-04-23 [VERIFIED: system date]
**Domain:** App-shell width reclamation, routed page spacing, and responsive plan-grid composition on the existing React 19 + React Router 7 + Tailwind UI stack [VERIFIED: package.json] [VERIFIED: src/app/layout/AppFrame.tsx] [VERIFIED: src/routes/plan-page.tsx] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md]
**Confidence:** HIGH [VERIFIED: codebase grep] [VERIFIED: npm registry] [CITED: https://tailwindcss.com/docs/responsive-design] [CITED: https://tailwindcss.com/docs/max-width] [CITED: https://playwright.dev/docs/emulation]

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Deferred Ideas (OUT OF SCOPE)
- Compact meal-card content refactor — Phase 9
- Click-card-to-open-flyout behavior and removal of separate `View details` actions — Phase 9
- Flyout becoming the canonical full-detail meal surface in implementation — Phase 10
- Shared meal-surface visual alignment beyond spacing/container polish — Phase 10
- Regression-heavy responsive verification and production-readiness signoff — Phase 11
</user_constraints>

## Project Constraints (from CLAUDE.md)

- Use `grok-4-1-fast-non-reasoning` via `https://api.x.ai/v1` for LLM work; do not switch model families in downstream plans [VERIFIED: CLAUDE.md].
- Backend/runtime assumptions stay Deno 2 with `npm:` specifiers, even though Phase 8 should avoid backend work entirely [VERIFIED: CLAUDE.md] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md].
- Supabase local ports remain `54331` through `54339`; layout verification should not assume alternate local ports in any E2E notes [VERIFIED: CLAUDE.md].
- Spoonacular quota remains cache-first and unchanged; Phase 8 should not introduce any work that touches enrichment behavior or quota posture [VERIFIED: CLAUDE.md] [VERIFIED: .planning/PROJECT.md].
- Streaming draft generation remains a protected core behavior; shell polish must not regress the existing generation and revisit flows [VERIFIED: CLAUDE.md] [VERIFIED: .planning/PROJECT.md].

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LAY-01 | App pages use slimmer horizontal margins so key content can expand further across the viewport [VERIFIED: .planning/REQUIREMENTS.md] | Refactor `AppFrame` outer padding, shell `max-width`, and shared route stack spacing before touching route-specific internals [VERIFIED: src/app/layout/AppFrame.tsx] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md] |
| LAY-02 | The plan page remains readable and intentional when showing more than 3 days and up to the full 21-meal layout [VERIFIED: .planning/REQUIREMENTS.md] | Keep `MealPlanGrid` as the existing responsive split, but add day-count-aware desktop/tablet gutter tightening and reduce competing section width above the grid [VERIFIED: src/components/generation/MealPlanGrid.tsx] [VERIFIED: src/routes/plan-page.tsx] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md] |
| UI-02 | The app shell and navigation spacing support the wider meal-planning layout without feeling sparse or oversized [VERIFIED: .planning/REQUIREMENTS.md] | Recalibrate header hierarchy, nav pill spacing, route-level section rhythm, and per-route width caps so the widened shell still reads as editorial rather than dashboard-like [VERIFIED: src/app/layout/AppFrame.tsx] [VERIFIED: src/routes/home-page.tsx] [VERIFIED: src/routes/household-page.tsx] [VERIFIED: src/routes/dev-page.tsx] [VERIFIED: src/routes/auth-page.tsx] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md] |
</phase_requirements>

## Summary

Phase 8 should be planned as a composition pass over existing shells, not as a new UI system. The repo already centralizes outer chrome in `AppFrame`, route composition in the routed page components, and plan density in `MealPlanGrid`, so the highest-value path is to rebalance those existing containers instead of introducing new wrapper abstractions or a second layout language [VERIFIED: src/app/layout/AppFrame.tsx] [VERIFIED: src/routes/plan-page.tsx] [VERIFIED: src/components/generation/MealPlanGrid.tsx] [VERIFIED: tailwind.config.ts] [VERIFIED: src/styles/globals.css].

The strongest reusable asset is that the current layout is already consistent in material language: warm background, translucent white shells, large rounded corners, Newsreader display type, and Manrope body type are already established across the app. The problem is not inconsistency of primitives; it is that the shell is capped at `max-w-6xl`, outer gutters are generous, and many route sections keep `px-8 py-8` plus `space-y-8`, which compounds into visible wasted width on the meal-planning workspace [VERIFIED: src/app/layout/AppFrame.tsx] [VERIFIED: src/routes/plan-page.tsx] [VERIFIED: src/routes/dev-page.tsx] [VERIFIED: src/styles/globals.css] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md].

The correct Phase 8 execution path is therefore: widen the shell to the approved editorial-wide target, tighten route rhythm, keep non-plan pages readable with internal width caps, and make `MealPlanGrid` denser by day count before accepting horizontal overflow. Card payload changes, click-target behavior changes, and flyout content redesign stay explicitly deferred to Phases 9 and 10 [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md] [VERIFIED: .planning/ROADMAP.md] [VERIFIED: .planning/REQUIREMENTS.md].

**Primary recommendation:** Treat Phase 8 as three linked layout layers only: `AppFrame` shell, shared route section spacing, and `MealPlanGrid` day-count-aware density; do not redesign `MealCard`, `MealDetailFlyout`, or favorites/finalization behaviors in this phase [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md] [VERIFIED: src/components/generation/MealDetailFlyout.tsx] [VERIFIED: src/components/generation/PlanFinalizationCard.tsx].

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| App shell width, outer gutters, header rhythm | Browser / Client [VERIFIED: src/app/layout/AppFrame.tsx] | — | `AppFrame` owns viewport padding, shell max-width, and nav/header structure in React markup and Tailwind classes [VERIFIED: src/app/layout/AppFrame.tsx]. |
| Route-level section spacing and reading-width caps | Browser / Client [VERIFIED: src/routes/home-page.tsx] [VERIFIED: src/routes/household-page.tsx] [VERIFIED: src/routes/dev-page.tsx] [VERIFIED: src/routes/auth-page.tsx] | — | Each route already composes its own shells and copy rails, so Phase 8 spacing cleanup belongs in those route components, not in backend data code [VERIFIED: referenced route files]. |
| Persisted plan-page hierarchy above the grid | Browser / Client [VERIFIED: src/routes/plan-page.tsx] | — | `PersistedPlanView` currently orders the header, finalization card, action bar, and grid, so visual hierarchy changes belong there [VERIFIED: src/routes/plan-page.tsx]. |
| Day-count-aware grid density | Browser / Client [VERIFIED: src/components/generation/MealPlanGrid.tsx] | — | `MealPlanGrid` already branches mobile vs. desktop and computes day columns from `numDays`, making it the correct owner for gutter and column-density logic [VERIFIED: src/components/generation/MealPlanGrid.tsx]. |
| Flyout/panel spatial continuity | Browser / Client [VERIFIED: src/components/generation/MealDetailFlyout.tsx] [VERIFIED: src/components/generation/FavoritesPanel.tsx] | — | Phase 8 should only preserve alignment with the widened workspace; these overlays remain existing client-side dialog shells [VERIFIED: referenced component files]. |
| Plan/favorites/finalization data behavior | API / Backend [VERIFIED: src/routes/plan-page.tsx] | Database / Storage [VERIFIED: use-meal-plan hook usage in src/routes/plan-page.tsx] | Out of scope for Phase 8; the route already consumes existing server state and no Phase 8 requirement requires backend ownership changes [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md]. |

## Existing Assets To Reuse

### Shell and typography primitives

- `AppFrame` already provides the single outer shell for all authenticated routes, including current outer padding, centered max width, nav pill cluster, and headline hierarchy [VERIFIED: src/app/layout/AppFrame.tsx].
- `tailwind.config.ts` and `src/styles/globals.css` already lock the editorial design language to Newsreader + Manrope, the warm paper gradient, sage accent color, and soft shadow token, so Phase 8 should tune spacing values rather than introduce new visual primitives [VERIFIED: tailwind.config.ts] [VERIFIED: src/styles/globals.css].

### Route surfaces

- `/` already uses a two-column editorial split with a narrative rail and aside; this route mainly needs width rebalance and spacing tightening, not structural replacement [VERIFIED: src/routes/home-page.tsx].
- `/household` already has one main long-form route surface backed by stacked translucent shells, making it a strong candidate for smaller horizontal gutters plus tighter vertical rhythm [VERIFIED: src/routes/household-page.tsx].
- `/plan/:id` and `/plan/new` already share the same route file, which means shell and section changes can keep generation mode and persisted mode visually aligned inside one implementation surface [VERIFIED: src/routes/plan-page.tsx].
- `/dev` already fills multiple dense cards with logs and quota data, so widening the shell there should produce immediate payoff without redesigning the cards themselves [VERIFIED: src/routes/dev-page.tsx].
- `/auth` already keeps its form-focused single-surface composition and only needs perimeter cleanup to avoid feeling over-framed after the shell widens [VERIFIED: src/routes/auth-page.tsx].

### Plan-specific anchors

- `MealPlanGrid` already owns the responsive split between stacked mobile sections and the desktop matrix, and it already computes the desktop column template from `days.length`, which is the right anchor for adaptive density by day count [VERIFIED: src/components/generation/MealPlanGrid.tsx].
- `PlanFinalizationCard` is already a separate section above the grid, so Phase 8 can reduce its competitive visual weight by adjusting layout proportion and text measure without redesigning its actions or semantics [VERIFIED: src/components/generation/PlanFinalizationCard.tsx] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md].
- `MealDetailFlyout` and `FavoritesPanel` already use full-height right-side dialog shells with `max-w-2xl`, so Phase 8 should preserve their current interaction model and just ensure the widened page still feels spatially related to them [VERIFIED: src/components/generation/MealDetailFlyout.tsx] [VERIFIED: src/components/generation/FavoritesPanel.tsx].

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | `19.2.0` installed; `19.2.5` current on npm, published 2026-04-08 [VERIFIED: package.json] [VERIFIED: npm registry] | Route and component composition for shell and layout work [VERIFIED: src/app/layout/AppFrame.tsx] | Existing project baseline; Phase 8 is component composition, not a framework migration [VERIFIED: package.json]. |
| React Router DOM | `7.9.4` installed; `7.14.2` current on npm, published 2026-04-21 [VERIFIED: package.json] [VERIFIED: npm registry] | Shared shell routing across `/`, `/household`, `/plan/*`, `/dev`, `/auth` [VERIFIED: src/app/router.tsx] | The routing model is already stable; Phase 8 only rebalances page surfaces inside it [VERIFIED: src/app/router.tsx]. |
| Tailwind CSS | `3.4.18` installed; `4.2.4` current on npm, published 2026-04-21 [VERIFIED: package.json] [VERIFIED: npm registry] | Responsive utility classes for shell width, gaps, and route spacing [VERIFIED: src/app/layout/AppFrame.tsx] [VERIFIED: src/routes/plan-page.tsx] | The repo is already bespoke Tailwind and the Phase 8 UI contract explicitly keeps that approach [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md]. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | `3.2.4` installed; `4.1.5` current on npm, published 2026-04-21 [VERIFIED: package.json] [VERIFIED: npm registry] | Component and route assertions for shell/container decisions [VERIFIED: vitest.config.ts] [VERIFIED: src/routes/plan-page.test.tsx] | Use for DOM-structure and class-level layout regression tests that do not need a real browser [VERIFIED: vitest.config.ts]. |
| Playwright | `1.56.1` installed; `1.59.1` current on npm, published 2026-04-01 [VERIFIED: package.json] [VERIFIED: npm registry] | Responsive verification of 4-day, 7-day, tablet, and mobile plan layouts [VERIFIED: playwright.config.ts] [CITED: https://playwright.dev/docs/emulation] | Use for viewport-specific visual and interaction checks where actual layout and overflow behavior matter [VERIFIED: playwright.config.ts]. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Reuse `AppFrame` and existing route shells [VERIFIED: src/app/layout/AppFrame.tsx] | Add new shared wrapper abstractions [ASSUMED] | A new wrapper layer would add indirection without solving the actual spacing problem, because the current shell is already centralized [VERIFIED: src/app/layout/AppFrame.tsx]. |
| Reuse Tailwind responsive utilities and existing breakpoints [VERIFIED: src/app/layout/AppFrame.tsx] [CITED: https://tailwindcss.com/docs/responsive-design] | Add a custom breakpoint system in Phase 8 [ASSUMED] | Custom breakpoints would expand scope and create migration cost when the current defaults already match the UI contract's mobile/tablet/desktop targets closely enough [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md] [CITED: https://tailwindcss.com/docs/responsive-design]. |
| Tighten density in `MealPlanGrid` by day count [VERIFIED: src/components/generation/MealPlanGrid.tsx] | Introduce default horizontal scrolling on tablet/desktop [ASSUMED] | Locked context prefers fitting more of the week before accepting overflow, and the existing grid already exposes the right density seam via `days.length` [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md] [VERIFIED: src/components/generation/MealPlanGrid.tsx]. |

**Installation:** No new runtime library is required for the primary Phase 8 path; the work should stay inside the existing React + Tailwind + test stack [VERIFIED: package.json] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md].

```bash
npm install
```

**Version verification:** Current npm versions were checked on 2026-04-23: `react 19.2.5`, `react-router-dom 7.14.2`, `tailwindcss 4.2.4`, `vitest 4.1.5`, and `@playwright/test 1.59.1` [VERIFIED: npm registry].

## Architecture Patterns

### System Architecture Diagram

```text
Viewport width
  -> AppFrame applies outer gutter + shell max-width + header rhythm
    -> Routed page selects local composition rules
      -> /, /household, /dev, /auth keep readable internal width caps
      -> /plan/new and /plan/:id use tighter section rhythm inside the wider shell
        -> Persisted plan header + finalization surface stay visually subordinate
          -> MealPlanGrid receives most of the reclaimed width
            -> mobile keeps stacked day sections
            -> tablet/desktop matrix tightens gutters as day count rises
              -> existing flyout/panel overlays still open from the right edge
```

### Recommended Project Structure

```text
src/
├── app/layout/                   # AppFrame shell width, header, nav spacing
├── routes/                       # Route-specific section rhythm and reading-width caps
├── components/generation/        # MealPlanGrid density + plan-adjacent section proportion
└── styles/                       # Existing design tokens only if a tokenized width/gutter helper is needed
```

### Pattern 1: Widen the shell once, then re-cap reading-heavy routes internally

**What:** Increase the global shell width in `AppFrame`, but keep prose-heavy routes from stretching by capping their internal content rails instead of keeping the whole application narrow [VERIFIED: src/app/layout/AppFrame.tsx] [VERIFIED: src/routes/home-page.tsx] [VERIFIED: src/routes/auth-page.tsx] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md].

**When to use:** Apply first in Wave 1 so all routes benefit from the same outer chrome before route-specific cleanup [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md].

**Example:**

```tsx
// Source: local repo + Phase 8 UI contract
<div className="min-h-screen px-4 py-5 md:px-6 md:py-6 xl:px-8">
  <div className="mx-auto max-w-[88rem] rounded-[2rem] bg-[rgba(255,255,255,0.52)] p-4 md:p-6 xl:p-7">
    <Outlet />
  </div>
</div>
```

The `max-w-[88rem]` recommendation follows the approved UI contract, which explicitly widens the shell beyond the current `max-w-6xl` while keeping it centered and non-full-bleed [VERIFIED: src/app/layout/AppFrame.tsx] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md] [CITED: https://tailwindcss.com/docs/max-width].

### Pattern 2: Make the plan page grid-first by reducing competition above it

**What:** Keep the plan header compact, rebalance the finalization card, and let the grid consume the main visual breadth of the page [VERIFIED: src/routes/plan-page.tsx] [VERIFIED: src/components/generation/PlanFinalizationCard.tsx] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md].

**When to use:** Apply in the persisted plan view and generation view together so `/plan/new` and `/plan/:id` no longer feel like separate layout systems [VERIFIED: src/routes/plan-page.tsx].

**Example:**

```tsx
// Source: local repo composition pattern
<div className="space-y-6 md:space-y-8">
  <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-6 py-6 md:px-7 md:py-6">
    {/* compact plan header */}
  </section>

  <PlanFinalizationCard />

  <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-4 py-5 md:px-6 md:py-6">
    <MealPlanGrid />
  </section>
</div>
```

### Pattern 3: Tighten matrix density by day count before introducing overflow

**What:** Keep the current mobile/desktop split in `MealPlanGrid`, but vary desktop/tablet gap and padding by `numDays` instead of applying one static spacing model to four-day and seven-day plans [VERIFIED: src/components/generation/MealPlanGrid.tsx] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md].

**When to use:** Use in the desktop matrix branch and, if needed, through route-level wrappers that set narrower internal padding before falling back to horizontal scroll [VERIFIED: src/components/generation/MealPlanGrid.tsx] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md].

**Example:**

```tsx
// Source: local repo day-driven grid shape
const desktopGapClass =
  numDays <= 4 ? "gap-6" : numDays === 5 ? "gap-4" : "gap-2";

<div
  className={`hidden md:grid ${desktopGapClass}`}
  style={{ gridTemplateColumns: `minmax(6rem, auto) repeat(${days.length}, minmax(0, 1fr))` }}
>
  {/* labels and slots */}
</div>
```

The recommendation is aligned with the UI contract's density targets of looser four-day spacing and tighter six-to-seven-day spacing [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md].

### Pattern 4: Keep responsive work mobile-first and viewport-based

**What:** Use unprefixed utilities for mobile defaults and layer wider-layout overrides at `md`, `lg`, and `xl`, which matches both the current code style and Tailwind's documented mobile-first model [VERIFIED: src/app/layout/AppFrame.tsx] [VERIFIED: src/components/generation/MealPlanGrid.tsx] [CITED: https://tailwindcss.com/docs/responsive-design].

**When to use:** Everywhere in Phase 8; do not treat `sm:` as the mobile target [CITED: https://tailwindcss.com/docs/responsive-design].

### Anti-Patterns to Avoid

- **Full-bleed shell conversion:** Turning the app into edge-to-edge chrome would violate the locked editorial constraint and make the widened layout feel dashboard-like [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md].
- **Phase leakage into meal cards:** Removing labels, changing card payload, or changing click-to-open behavior belongs to Phase 9, not Phase 8 [VERIFIED: .planning/ROADMAP.md] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md].
- **Flyout redesign disguised as polish:** Changing flyout content order, action hierarchy, or canonical detail ownership belongs to Phase 10 [VERIFIED: .planning/ROADMAP.md] [VERIFIED: .planning/REQUIREMENTS.md].
- **Static desktop spacing for all day counts:** One fixed gap value will either waste width at seven days or feel over-tight at four days [VERIFIED: src/components/generation/MealPlanGrid.tsx] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md].

## Suggested Plan Breakdown

### Wave 0

- Add or update unit/component scaffolding for shell and responsive layout assertions before making large class-name changes, reusing existing route and grid test files rather than creating a parallel test suite [VERIFIED: src/routes/plan-page.test.tsx] [VERIFIED: src/components/generation/meal-plan-management.test.tsx] [VERIFIED: vitest.config.ts].
- Decide the shell token strategy: either inline arbitrary widths like `max-w-[88rem]` or a small shared constant/class convention, but keep the change local to existing shells [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md] [CITED: https://tailwindcss.com/docs/max-width].

### Wave 1

- Refactor `AppFrame` outer padding, shell max width, inner padding, and header rhythm to match the approved width strategy [VERIFIED: src/app/layout/AppFrame.tsx] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md].
- Apply route-level spacing cleanup to `/`, `/household`, `/dev`, and `/auth`, including internal width caps where prose or forms should not stretch across the widened shell [VERIFIED: src/routes/home-page.tsx] [VERIFIED: src/routes/household-page.tsx] [VERIFIED: src/routes/dev-page.tsx] [VERIFIED: src/routes/auth-page.tsx].

### Wave 2

- Rebalance `/plan/:id` and `/plan/new` section rhythm so the header and finalization surfaces shrink in visual dominance relative to the grid [VERIFIED: src/routes/plan-page.tsx] [VERIFIED: src/components/generation/PlanFinalizationCard.tsx].
- Implement adaptive `MealPlanGrid` density for four-day, five-day, and six-to-seven-day desktop/tablet layouts while preserving the existing stacked mobile branch [VERIFIED: src/components/generation/MealPlanGrid.tsx] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md].

### Wave 3

- Add route/component assertions for shell width and plan-grid density seams, then run Playwright viewport verification for 4-day desktop, 7-day desktop, tablet, and mobile plan layouts [VERIFIED: src/routes/plan-page.test.tsx] [VERIFIED: playwright.config.ts] [CITED: https://playwright.dev/docs/emulation].
- Record manual editorial-language notes for each route so spacing improvements do not make non-plan pages feel stretched or generic [VERIFIED: .planning/ROADMAP.md] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Global shell widening | A second layout framework or new page-shell abstraction [ASSUMED] | Existing `AppFrame` + Tailwind utilities [VERIFIED: src/app/layout/AppFrame.tsx] | The shell is already centralized; Phase 8 only needs value recalibration [VERIFIED: src/app/layout/AppFrame.tsx]. |
| Responsive spacing logic | A bespoke viewport observer for breakpoint rules [ASSUMED] | Tailwind's mobile-first breakpoint utilities and existing CSS grid/flex composition [CITED: https://tailwindcss.com/docs/responsive-design] | The layout changes are static and declarative; runtime viewport logic adds unnecessary complexity [CITED: https://tailwindcss.com/docs/responsive-design]. |
| Wide-shell measure control | Multiple per-route hard-coded wrapper hierarchies [ASSUMED] | One widened shell plus internal `max-w-*` caps on reading-heavy children [VERIFIED: src/routes/home-page.tsx] [VERIFIED: src/routes/auth-page.tsx] [CITED: https://tailwindcss.com/docs/max-width] | This preserves a single shell language while preventing stretched prose/forms [VERIFIED: referenced route files]. |
| Responsive verification | Manual browser resizing only [ASSUMED] | Existing Playwright setup with explicit viewport blocks [VERIFIED: playwright.config.ts] [CITED: https://playwright.dev/docs/emulation] | Viewport-specific regressions on tablet and seven-day layouts are exactly the type of issue Playwright can pin down repeatably [CITED: https://playwright.dev/docs/emulation]. |

**Key insight:** Phase 8 is mostly a calibration problem, not a missing-infrastructure problem; the repo already has the correct ownership seams, so new abstractions are more likely to cause scope creep than reduce risk [VERIFIED: src/app/layout/AppFrame.tsx] [VERIFIED: src/routes/plan-page.tsx] [VERIFIED: src/components/generation/MealPlanGrid.tsx].

## Common Pitfalls

### Pitfall 1: Preserving the editorial language too literally

**What goes wrong:** The team keeps the current generous margins and padding because they are part of the calm visual style, and the plan route stays cramped beyond three or four days [VERIFIED: .planning/PROJECT.md] [VERIFIED: src/app/layout/AppFrame.tsx] [VERIFIED: src/routes/plan-page.tsx].

**Why it happens:** The existing shells already look intentional, so spacing waste can be mistaken for brand expression instead of layout inefficiency [VERIFIED: src/styles/globals.css] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md].

**How to avoid:** Preserve color, radius, blur, typography, and materials while reducing chrome values; the visual language is the materials system, not the exact current `px-8 py-8 space-y-8` numbers [VERIFIED: src/styles/globals.css] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md].

**Warning signs:** Seven-day grids still feel boxed in after the shell refactor, or non-plan pages still spend more width on perimeter chrome than on content [VERIFIED: .planning/ROADMAP.md].

### Pitfall 2: Solving density by leaking Phase 9 into Phase 8

**What goes wrong:** The implementation starts removing labels, compressing card content, or changing card click behavior to make the grid fit [VERIFIED: .planning/ROADMAP.md] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md].

**Why it happens:** Card payload is the most visible source of density pressure, but the milestone explicitly sequences that work into the next phase [VERIFIED: .planning/ROADMAP.md].

**How to avoid:** Limit this phase to shell width, section spacing, and grid gutter math; if a change alters what meal cards show or how they behave, it belongs in Phase 9 [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md].

**Warning signs:** A diff touches `MealCard` semantics, label visibility, icon actions, or flyout-entry behavior while claiming to be "layout only" [VERIFIED: .planning/ROADMAP.md] [VERIFIED: .planning/REQUIREMENTS.md].

### Pitfall 3: Treating tablet as a slightly larger mobile stack

**What goes wrong:** Tablet keeps the existing stacked presentation with only slightly looser gutters, so width reclamation does not materially improve the plan experience at `768px` to `1279px` [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md].

**Why it happens:** The current grid switches to its matrix at `md`, but if surrounding shell padding and section framing stay too wide, that matrix gains very little usable space [VERIFIED: src/components/generation/MealPlanGrid.tsx] [VERIFIED: src/routes/plan-page.tsx].

**How to avoid:** Tighten section padding and grid gutters on tablet before allowing overflow, and verify tablet as its own target rather than as a side effect of desktop work [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md].

**Warning signs:** Tablet screenshots show the same cramped feel as the current layout, or developers immediately add horizontal scrolling at `md` without first reclaiming chrome [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md].

### Pitfall 4: Widening the shell without re-capping reading routes

**What goes wrong:** Home, auth, or household become visually stretched and lose their editorial calm after the shell width increases [VERIFIED: src/routes/home-page.tsx] [VERIFIED: src/routes/auth-page.tsx] [VERIFIED: src/routes/household-page.tsx].

**Why it happens:** A wider global shell helps the plan grid, but copy-heavy and form-heavy routes need internal measure control to keep line length reasonable [VERIFIED: src/routes/home-page.tsx] [VERIFIED: src/routes/auth-page.tsx] [CITED: https://tailwindcss.com/docs/max-width].

**How to avoid:** Apply per-route internal width caps after widening `AppFrame`, especially for auth forms, home narrative copy, and household form rails [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md].

**Warning signs:** Home paragraphs start spanning most of the shell width, or auth no longer feels like a focused single-surface flow [VERIFIED: src/routes/home-page.tsx] [VERIFIED: src/routes/auth-page.tsx].

## Code Examples

Verified patterns from local sources and official docs:

### Shared shell widening with responsive gutters

```tsx
// Source: local repo AppFrame pattern + Tailwind responsive docs
<div className="min-h-screen bg-transparent px-4 py-5 md:px-6 md:py-6 xl:px-8">
  <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[88rem] flex-col rounded-[2rem] bg-[rgba(255,255,255,0.52)] p-4 md:p-6 xl:p-7">
    <Outlet />
  </div>
</div>
```

This keeps the existing centered-shell pattern while swapping the narrow `max-w-6xl` cap for the approved wider editorial shell [VERIFIED: src/app/layout/AppFrame.tsx] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md] [CITED: https://tailwindcss.com/docs/max-width] [CITED: https://tailwindcss.com/docs/responsive-design].

### Explicit viewport blocks for responsive verification

```ts
// Source: Playwright emulation docs
test.describe("plan layout", () => {
  test.describe("desktop 7-day", () => {
    test.use({ viewport: { width: 1440, height: 1200 } });
    test("keeps the matrix readable", async ({ page }) => {
      // ...
    });
  });

  test.describe("tablet", () => {
    test.use({ viewport: { width: 1024, height: 1366 } });
    test("reclaims width before overflowing", async ({ page }) => {
      // ...
    });
  });
});
```

Playwright explicitly supports per-block viewport overrides, which fits the Phase 8 requirement to validate multiple plan densities across viewport classes [CITED: https://playwright.dev/docs/emulation].

## Testing Implications

- Existing test anchors already cover the plan route and grid management at the component and route level, so Phase 8 should extend those files before adding new ones: `src/routes/plan-page.test.tsx` and `src/components/generation/meal-plan-management.test.tsx` are the strongest current anchors [VERIFIED: src/routes/plan-page.test.tsx] [VERIFIED: src/components/generation/meal-plan-management.test.tsx].
- Current tests validate behavior more than layout, which means Wave 0 should add layout-focused assertions around shell class changes, route section wrappers, and the desktop/mobile grid split before large spacing edits land [VERIFIED: src/routes/plan-page.test.tsx] [VERIFIED: src/components/generation/meal-plan-management.test.tsx].
- Playwright is already configured against `http://127.0.0.1:8888`, so responsive verification can stay inside the existing E2E harness rather than depending on ad hoc manual resizing only [VERIFIED: playwright.config.ts].

### Responsive verification targets

| Target | Minimum automated check | Manual note to capture |
|--------|-------------------------|------------------------|
| 4-day desktop | Verify the desktop matrix renders without cramped columns at a wide viewport such as `1440x1200` [CITED: https://playwright.dev/docs/emulation] | Confirm the layout still feels intentionally spacious rather than over-tight for a shorter plan [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md]. |
| 7-day desktop | Verify the desktop matrix remains readable at full-week density before horizontal overflow appears [VERIFIED: .planning/ROADMAP.md] | Confirm that tighter gutters preserve scan order and do not force a Phase 9 card-content change prematurely [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md]. |
| Tablet | Verify the plan layout at a tablet viewport such as `1024x1366` or equivalent and assert that the matrix gains materially more usable width than Phase 7 [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md] [CITED: https://playwright.dev/docs/emulation] | Confirm the route is not merely a larger mobile stack and that overflow is not the first fallback [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md]. |
| Mobile | Verify the stacked mobile branch still renders correctly at a mobile viewport such as `390x844` and that section spacing is tighter but structurally familiar [VERIFIED: src/components/generation/MealPlanGrid.tsx] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md] | Confirm shell tightening does not make taps feel cramped or text feel crowded [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md]. |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| One static desktop spacing model regardless of plan density [ASSUMED] | Adaptive density by viewport and content count is the current recommended direction in the phase context and UI contract [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md] | Locked on 2026-04-23 when Phase 8 context and UI contract were created [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md] | Planning should vary gutters by day count instead of trying to find one universal spacing value [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md]. |
| Narrow global shell protecting reading routes indirectly [VERIFIED: src/app/layout/AppFrame.tsx] | Wider global shell plus internal route caps for reading-heavy surfaces [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md] [CITED: https://tailwindcss.com/docs/max-width] | Defined by the approved Phase 8 UI contract on 2026-04-23 [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md] | The plan grid gains space without forcing home/auth/household into overstretched line lengths [VERIFIED: referenced route files]. |

**Deprecated/outdated:**
- Treating the current `max-w-6xl` shell as the final production shell is outdated for this milestone because the roadmap and UI contract both make width reclamation the first milestone move [VERIFIED: src/app/layout/AppFrame.tsx] [VERIFIED: .planning/ROADMAP.md] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md].

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A new shared wrapper abstraction would not materially reduce Phase 8 complexity compared with editing existing shells directly [ASSUMED] | Standard Stack / Alternatives Considered | Low-to-medium; planning could over-constrain implementation style if the team strongly prefers a wrapper abstraction. |
| A2 | Runtime viewport observers are unnecessary because static Tailwind breakpoints and existing day-count logic are sufficient for Phase 8 [ASSUMED] | Don't Hand-Roll | Medium; if exact density rules become too complex, the team might need a small runtime helper after all. |
| A3 | Defaulting to horizontal scrolling on tablet/desktop would worsen the intended UX more than it helps [ASSUMED] | Standard Stack / Alternatives Considered | Medium; if real card widths prove too wide even after shell tightening, controlled overflow may become necessary as a fallback. |

## Open Questions (RESOLVED)

1. **Should the widened shell be expressed as an inline arbitrary value or as a shared class/token?** [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md]  
What we know: the approved target is `max-w-[88rem]` and Tailwind supports arbitrary max-width values directly [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md] [CITED: https://tailwindcss.com/docs/max-width].  
Resolution: keep the widened shell inline as `max-w-[88rem]` inside `AppFrame` for Phase 8. This is consistent with D-03, the UI contract's explicit shell target, and the layout-only scope; Phase 8 should not add new token plumbing when only the shared shell needs this custom width [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md].

2. **Does tablet keep the matrix layout for all common meal-type combinations after spacing is tightened?** [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md]  
What we know: the locked direction prefers keeping the matrix when readable and only accepting overflow after tighter gutters have been tried [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md].  
Resolution: tablet keeps the matrix layout as the default Phase 8 behavior, including dense `6-7` day plans, after the grid adopts the UI-spec tightening rules (`24px` gutters for 4 days, `16px` for 5 days, `8px` for 6-7 days) and the surrounding plan sections reduce padding first. Horizontal overflow stays a fallback only if those tighter matrix rules still collapse below readable card width, which is verified by targeted Playwright coverage plus manual tablet review in Plan 08-04 [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md] [VERIFIED: playwright.config.ts] [CITED: https://playwright.dev/docs/emulation].

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite/Vitest/Playwright tooling [VERIFIED: package.json] | ✓ [VERIFIED: command line] | `v24.14.0` [VERIFIED: command line] | — |
| npm / npx | Package scripts and test runners [VERIFIED: package.json] | ✓ [VERIFIED: command line] | `11.9.0` [VERIFIED: command line] | — |
| Vitest CLI | Component and route tests [VERIFIED: vitest.config.ts] | ✓ [VERIFIED: command line] | `3.2.4` installed [VERIFIED: command line] | `npm run test:unit -- --run` [VERIFIED: package.json] |
| Playwright CLI | Responsive E2E verification [VERIFIED: playwright.config.ts] | ✓ [VERIFIED: command line] | `1.59.1` [VERIFIED: command line] | Manual responsive verification if browser automation is temporarily unavailable [ASSUMED] |

**Missing dependencies with no fallback:** None identified in the current workspace for Phase 8 planning [VERIFIED: command line].

**Missing dependencies with fallback:** None identified at research time [VERIFIED: command line].

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `3.2.4` for unit/component tests [VERIFIED: command line] [VERIFIED: vitest.config.ts] |
| Config file | `vitest.config.ts` [VERIFIED: vitest.config.ts] |
| Quick run command | `npm run test:unit -- --run src/routes/plan-page.test.tsx src/components/generation/meal-plan-management.test.tsx` [VERIFIED: package.json] |
| Full suite command | `npm run test:unit -- --run && npm run test:e2e` [VERIFIED: package.json] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAY-01 | Shell and page containers reclaim width without breaking route structure [VERIFIED: .planning/REQUIREMENTS.md] | component / route | `npm run test:unit -- --run src/routes/plan-page.test.tsx src/routes/auth-page.test.tsx src/routes/dev-page.test.tsx` [VERIFIED: package.json] | ✅ existing anchors [VERIFIED: file tree] |
| LAY-02 | `/plan/:id` stays readable at 4-day and 7-day densities [VERIFIED: .planning/REQUIREMENTS.md] | component + e2e | `npm run test:unit -- --run src/components/generation/meal-plan-management.test.tsx && npm run test:e2e -- tests/e2e/plan-management.spec.ts` [VERIFIED: package.json] | ✅ existing anchors, but assertions need extension [VERIFIED: file tree] |
| UI-02 | Wider shell/nav spacing remains intentional across core routes [VERIFIED: .planning/REQUIREMENTS.md] | route + manual visual | `npm run test:unit -- --run src/routes/plan-page.test.tsx src/routes/auth-page.test.tsx src/routes/dev-page.test.tsx` [VERIFIED: package.json] | ✅ partial; `/` and `/household` route coverage is missing [VERIFIED: file tree] |

### Sampling Rate

- **Per task commit:** `npm run test:unit -- --run src/routes/plan-page.test.tsx src/components/generation/meal-plan-management.test.tsx` [VERIFIED: package.json].
- **Per wave merge:** `npm run test:unit -- --run` [VERIFIED: package.json].
- **Phase gate:** `npm run test:unit -- --run && npm run test:e2e` plus manual viewport notes for 4-day desktop, 7-day desktop, tablet, and mobile [VERIFIED: package.json] [VERIFIED: .planning/ROADMAP.md].

### Wave 0 Gaps (RESOLVED IN REVISED PLANS)

- [x] `src/routes/home-page.test.tsx` is now planned in `08-03-PLAN.md` so `/` gets explicit route-structure coverage for shell-width changes [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-03-PLAN.md].
- [x] `src/routes/household-page.test.tsx` is now planned in `08-03-PLAN.md` so `/household` gets explicit spacing-cleanup coverage [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-03-PLAN.md].
- [x] `tests/e2e/layout-shell.spec.ts` is now planned in `08-04-PLAN.md` with explicit 4-day, 7-day, tablet, and mobile viewport cases instead of relying on existing behavioral plan-management assertions [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-04-PLAN.md] [CITED: https://playwright.dev/docs/emulation].

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no new Phase 8 auth behavior [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md] | Preserve existing auth route and shell behavior only [VERIFIED: src/routes/auth-page.tsx]. |
| V3 Session Management | no new Phase 8 session logic [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md] | No session changes in scope [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md]. |
| V4 Access Control | no new policy logic [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md] | Do not change route access or `/dev` auth behavior in this phase [VERIFIED: .planning/REQUIREMENTS.md]. |
| V5 Input Validation | yes, indirectly [VERIFIED: src/routes/household-page.tsx] [VERIFIED: src/routes/auth-page.tsx] | Preserve existing route form layouts without obscuring validation/error states during spacing changes [VERIFIED: referenced route files]. |
| V6 Cryptography | no new cryptographic scope [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md] | No Phase 8 crypto work [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md]. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Hidden or clipped controls after shell tightening [ASSUMED] | Denial of Service | Add viewport-specific tests around action visibility and avoid overflow clipping on core route actions [VERIFIED: playwright.config.ts] [CITED: https://playwright.dev/docs/emulation]. |
| Broken focus continuity between widened page layout and existing flyout/panel overlays [VERIFIED: src/components/generation/MealDetailFlyout.tsx] [VERIFIED: src/components/generation/FavoritesPanel.tsx] | Spoofing / Elevation of Privilege (UI confusion) [ASSUMED] | Preserve existing dialog focus-return behavior and verify overlays still receive focus correctly after shell changes [VERIFIED: referenced component files]. |
| Error or validation banners becoming visually subordinate after spacing refactors [VERIFIED: src/routes/auth-page.tsx] [VERIFIED: src/routes/household-page.tsx] | Repudiation / Tampering (user cannot clearly perceive failure state) [ASSUMED] | Keep alert surfaces prominent and include route-level regression checks for `role="alert"` visibility [VERIFIED: referenced route files]. |

## Sources

### Primary (HIGH confidence)

- `src/app/layout/AppFrame.tsx` - current shell max width, outer gutters, header hierarchy, and nav placement [VERIFIED: local code].
- `src/routes/plan-page.tsx` - persisted/generation route composition, section order, and current shell padding around the grid [VERIFIED: local code].
- `src/components/generation/MealPlanGrid.tsx` - current mobile/desktop split and day-count-driven matrix structure [VERIFIED: local code].
- `.planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md` - locked scope, density strategy, and explicit phase boundaries [VERIFIED: local docs].
- `.planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md` - approved width, spacing, typography, and responsive targets for Phase 8 [VERIFIED: local docs].
- `src/routes/home-page.tsx`, `src/routes/household-page.tsx`, `src/routes/dev-page.tsx`, `src/routes/auth-page.tsx` - route-level spacing and reading-measure constraints to preserve [VERIFIED: local code].
- `package.json`, `vitest.config.ts`, `playwright.config.ts` - installed stack and test harness [VERIFIED: local files].
- npm registry - current versions and publish dates for `react`, `react-router-dom`, `tailwindcss`, `vitest`, and `@playwright/test` [VERIFIED: npm registry].

### Secondary (MEDIUM confidence)

- Tailwind CSS responsive design docs - mobile-first breakpoints and responsive utility guidance [CITED: https://tailwindcss.com/docs/responsive-design].
- Tailwind CSS max-width docs - container scale and arbitrary max-width support [CITED: https://tailwindcss.com/docs/max-width].
- Playwright emulation docs - per-test and per-block viewport configuration [CITED: https://playwright.dev/docs/emulation].
- Vitest config docs - config ownership and test setup behavior [CITED: https://vitest.dev/config/].

### Tertiary (LOW confidence)

- None beyond items explicitly listed in the assumptions log [VERIFIED: this document].

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - repo stack and versions were verified in `package.json`, local CLIs, and npm registry [VERIFIED: package.json] [VERIFIED: command line] [VERIFIED: npm registry].
- Architecture: HIGH - the shell, route, and grid ownership seams are directly visible in the repo and tightly constrained by Phase 8 context/UI docs [VERIFIED: src/app/layout/AppFrame.tsx] [VERIFIED: src/routes/plan-page.tsx] [VERIFIED: src/components/generation/MealPlanGrid.tsx] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md].
- Pitfalls: MEDIUM - the major risks are well-supported by the locked phase docs and current code, but some failure modes depend on implementation details that have not been built yet [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-CONTEXT.md] [VERIFIED: .planning/phases/08-layout-width-and-shell-polish/08-UI-SPEC.md] [ASSUMED].

**Research date:** 2026-04-23 [VERIFIED: system date]
**Valid until:** 2026-05-23 for repo-specific planning assumptions; refresh sooner if the UI contract or package versions change [ASSUMED].
