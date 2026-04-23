# Requirements: PlanPlate

**Defined:** 2026-04-23
**Core Value:** Users see a complete draft meal plan in under 2 seconds (via streaming), then stay in control of exactly which meals get enriched with full recipes.

## v1.1 Requirements

Requirements for the meal-experience UI refactor and polish milestone. Each maps to roadmap phases 8-11.

### Layout Foundation

- [ ] **LAY-01**: App pages use slimmer horizontal margins so key content can expand further across the viewport
- [ ] **LAY-02**: The plan page remains readable and intentional when showing more than 3 days and up to the full 21-meal layout
- [ ] **LAY-03**: Dense meal layouts maintain clear scanning hierarchy across desktop and mobile breakpoints

### Meal Card System

- [ ] **CARD-01**: Every meal renders as a card in both dense plan-grid and focused single-meal contexts
- [ ] **CARD-02**: Dense meal cards show only the essential summary: title, status, favorite state, and primary actions
- [ ] **CARD-03**: Meal cards do not repeat breakfast, lunch, or dinner labels when the surrounding layout already communicates meal type
- [ ] **CARD-04**: Clicking a meal card opens the flyout, removing the need for a separate `View details` action
- [ ] **CARD-05**: Destructive meal actions use compact icon treatment without reducing clarity or accessibility

### Canonical Flyout Detail

- [ ] **FLY-01**: The meal flyout is the canonical detailed meal view across the app
- [ ] **FLY-02**: The flyout presents the full meal context, including description/rationale for drafts and recipe details for enriched meals
- [ ] **FLY-03**: The flyout supports the richer meal actions that no longer belong in dense grid cards

### Shared UI Consistency

- [ ] **UI-01**: Shared meal surfaces, including the plan page, flyout, favorites-related UI, and surrounding controls, follow one consistent visual language
- [ ] **UI-02**: The app shell and navigation spacing support the wider meal-planning layout without feeling sparse or oversized

### Verification

- [ ] **VIZ-01**: Automated tests cover the compact-card, flyout-open, and shared-surface regressions introduced by this milestone
- [ ] **VIZ-02**: Manual visual verification confirms the refined meal experience feels production-ready across representative screen sizes

## v2 Requirements

### Backlog / Deferred

- **NAV-01**: User can navigate meal plans across weeks or from a calendar surface
- **GENX-01**: Saved meals can influence or seed future meal-plan generation
- **AUTHX-01**: `/dev` route access is explicitly gated by auth or role rules
- **PROD-01**: Frontend and backend deploy through a hosted production pipeline with CI

## Out of Scope

| Feature | Reason |
|---------|--------|
| New generation or enrichment backend behavior | This milestone is for UI refactoring and polish, not backend expansion |
| Inline full meal descriptions in dense grid cards | Rich detail is moving into the flyout to preserve grid readability |
| Separate one-off detail views that bypass the flyout | The flyout is the canonical detailed meal surface |
| Calendar navigation and cross-week browsing | Deferred to backlog item `999.1` |
| Saved-meal-assisted generation | Deferred to backlog item `999.2` |
| `/dev` auth hardening | Deferred to backlog item `999.3` |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LAY-01 | Phase 8 | Pending |
| LAY-02 | Phase 8 | Pending |
| LAY-03 | Phase 11 | Pending |
| CARD-01 | Phase 9 | Pending |
| CARD-02 | Phase 9 | Pending |
| CARD-03 | Phase 9 | Pending |
| CARD-04 | Phase 9 | Pending |
| CARD-05 | Phase 9 | Pending |
| FLY-01 | Phase 10 | Pending |
| FLY-02 | Phase 10 | Pending |
| FLY-03 | Phase 10 | Pending |
| UI-01 | Phase 10 | Pending |
| UI-02 | Phase 8 | Pending |
| VIZ-01 | Phase 11 | Pending |
| VIZ-02 | Phase 11 | Pending |

**Coverage:**
- v1.1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-04-23*
*Last updated: 2026-04-23 after starting milestone v1.1*
