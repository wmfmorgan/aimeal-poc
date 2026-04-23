# Roadmap: PlanPlate

## Overview

Milestone v1.1 focuses on turning the shipped meal-planning experience into a production-ready interface. The work starts by reclaiming layout width across the app shell, then refactors meal cards for dense multi-day use, consolidates rich meal detail into the flyout, and closes with regression coverage plus visual verification.

Each implementation phase should include tests where they materially reduce regression risk: unit/component coverage for shared meal-surface behavior, and focused UI verification for responsive layout and interaction changes.

## Phases

**Phase Numbering:**
- Integer phases (8, 9, 10): Planned milestone work continuing from the previous milestone
- Decimal phases (8.1, 8.2): Urgent insertions (marked with INSERTED)
- Backlog phases (999.x): Unsequenced ideas parked outside milestone execution

## Phase Details

### Phase 8: Layout Width & Shell Polish
**Goal**: The app shell and plan-page layout use width more effectively so meal content can breathe across desktop and mobile layouts
**Depends on**: Phase 7
**Requirements**: LAY-01, LAY-02, UI-02
**Testing**: Add component or route coverage for shell/container layout decisions where practical; capture responsive visual verification notes for 4-day, 7-day, and mobile plan layouts
**Success Criteria** (what must be TRUE):
  1. Global page margins are reduced in a controlled way across the app shell and core pages
  2. The plan page can show more than 3 days without the layout feeling needlessly cramped
  3. Shared containers and spacing feel intentional rather than sparse on large screens
  4. Mobile and tablet layouts remain readable after the width changes
**Plans**: 4 plans
Plans:
- [x] 08-01-PLAN.md — Widen `AppFrame` and tighten shared shell/header chrome
- [x] 08-02-PLAN.md — Rebalance the plan route and add adaptive grid density
- [x] 08-03-PLAN.md — Clean up non-plan route spacing inside the wider shell
- [x] 08-04-PLAN.md — Add layout regression coverage and final responsive verification
**UI hint**: yes

### Phase 9: Compact Meal Card Refactor
**Goal**: Meal cards become consistent, compact, and scan-friendly across dense meal-plan contexts
**Depends on**: Phase 8
**Requirements**: CARD-01, CARD-02, CARD-03, CARD-04, CARD-05
**Testing**: Add component tests for compact-card rendering, card-click flyout entry, favorite/action affordances, and accessible destructive icon behavior
**Success Criteria** (what must be TRUE):
  1. Every meal is represented as a card in both dense grid and focused meal contexts
  2. Dense cards only show title, status, and primary actions (no description, no redundant labels)
  3. Redundant breakfast/lunch/dinner labels are removed from cards when row context already provides that information
  4. Clicking a meal card opens the flyout, replacing the separate `View details` action
  5. Delete is presented as a compact icon treatment without becoming ambiguous or inaccessible
**Plans**: 3 plans
Plans:
- [ ] 09-01-PLAN.md — Compact MealCard refactor (icon actions, clickable wrapper, remove description/favorites)
- [ ] 09-02-PLAN.md — MealPlanGrid and plan-page wiring (prop cleanup, flyout open, type broadening)
- [ ] 09-03-PLAN.md — MealDetailFlyout star affordance and MealDeleteConfirmation copy update
**UI hint**: yes

### Phase 10: Canonical Flyout & Surface Alignment
**Goal**: The flyout becomes the single detailed meal surface, and adjacent meal-related UI feels consistent with the refactored card system
**Depends on**: Phase 9
**Requirements**: FLY-01, FLY-02, FLY-03, UI-01
**Testing**: Add coverage for flyout content order, richer action placement, and alignment between meal cards, favorites-related UI, and plan-side controls
**Success Criteria** (what must be TRUE):
  1. The flyout is the canonical detailed meal view across the app
  2. Draft rationale/description and enriched recipe content are clearly presented in the flyout instead of dense cards
  3. Richer meal actions live in the flyout where they fit the information density
  4. Shared meal surfaces feel visually and behaviorally aligned rather than stitched together from separate phases
**Plans**: 0 plans
Plans:
- [ ] TBD
**UI hint**: yes

### Phase 11: Verification & Production-Ready Polish
**Goal**: The refactored meal experience is verified for responsiveness, accessibility, and overall production-readiness before the milestone closes
**Depends on**: Phase 10
**Requirements**: LAY-03, VIZ-01, VIZ-02
**Testing**: Extend automated coverage for route/component regressions; run manual visual verification across representative viewport sizes and core meal workflows
**Success Criteria** (what must be TRUE):
  1. Automated tests cover the core layout, compact-card, and flyout behavior introduced in this milestone
  2. Manual visual verification confirms the meal experience feels production-ready on mobile, tablet, and desktop
  3. The plan page, flyout, and related meal surfaces no longer feel cramped or overly text-heavy
**Plans**: 0 plans
Plans:
- [ ] TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 8 → 9 → 10 → 11

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 8. Layout Width & Shell Polish | 4/4 | Complete | 2026-04-23 |
| 9. Compact Meal Card Refactor | 0/3 | Planning | — |
| 10. Canonical Flyout & Surface Alignment | 0/0 | Not Started | — |
| 11. Verification & Production-Ready Polish | 0/0 | Not Started | — |

## Backlog

### Phase 999.1: Allow meal plan navigation from week to week and with a calendar (BACKLOG)

**Goal:** Captured for future planning
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with `$gsd-review-backlog` when ready)

### Phase 999.2: Allow saved meals to integrate into meal plan generation (BACKLOG)

**Goal:** Captured for future planning
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with `$gsd-review-backlog` when ready)

### Phase 999.3: add auth to dev route (BACKLOG)

**Goal:** Captured for future planning
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with `$gsd-review-backlog` when ready)
