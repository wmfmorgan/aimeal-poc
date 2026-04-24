---
phase: 9
slug: compact-meal-card-refactor
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-24
---

# Phase 9 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| meal card surface -> flyout trigger state | Clicking the compact card stores the invoking DOM node for focus return and opens the existing detail flyout | in-memory `HTMLElement` reference only |
| grid wiring -> flyout favorite actions | Favorite affordances were removed from the card/grid layer and remain owned by the flyout route state | meal id lookup, favorite UI state |
| delete confirmation copy -> destructive callback | Copy changed, but deletion still requires an explicit confirm action before the existing callback runs | local UI intent before `onDelete` |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-09-01 | Elevation | MealCard icon buttons | accept | Accepted in the phase threat model: the card buttons call existing local callbacks only and do not introduce auth or privilege decisions in [MealCard.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealCard.tsx:81) and [MealCard.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealCard.tsx:101). | closed |
| T-09-02 | Tampering | `MealCard` `role="button"` article | accept | Accepted in the phase threat model: the wrapper only forwards a trusted currentTarget into local flyout wiring via [MealCard.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealCard.tsx:47) and [MealCard.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealCard.tsx:49). | closed |
| T-09-03 | Denial | compact-card accessibility regression | mitigate | Icon-only controls expose accessible names in [MealCard.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealCard.tsx:81) and [MealCard.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealCard.tsx:101), with coverage in [generation-components.test.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/generation-components.test.tsx:142) and [meal-plan-management.test.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/meal-plan-management.test.tsx:159). | closed |
| T-09-04 | Tampering | `plan-page.tsx` flyout trigger type broadening | accept | Accepted in the phase threat model: the broader `HTMLElement` type still comes only from trusted internal event handlers in [plan-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/plan-page.tsx:46) and [plan-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/plan-page.tsx:182). | closed |
| T-09-05 | Denial | favorite props removed from `MealPlanGrid` | accept | Accepted in the phase threat model: grid cards open the flyout through [MealPlanGrid.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealPlanGrid.tsx:109), while favorite state and actions remain on the flyout in [plan-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/plan-page.tsx:334) and [MealDetailFlyout.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealDetailFlyout.tsx:257). | closed |
| T-09-06 | Denial | star-button accessibility regression | mitigate | The flyout favorite affordance keeps an accessible name in [MealDetailFlyout.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealDetailFlyout.tsx:260), with coverage for presence, absence, click behavior, and focus order in [meal-detail-flyout.test.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/meal-detail-flyout.test.tsx:181) and [meal-detail-flyout.test.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/meal-detail-flyout.test.tsx:261). | closed |
| T-09-07 | Tampering | `MealDeleteConfirmation` copy change | accept | Accepted in the phase threat model: the copy update leaves the explicit confirm step intact in [MealDeleteConfirmation.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealDeleteConfirmation.tsx:14) and [MealDeleteConfirmation.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealDeleteConfirmation.tsx:29). | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| A-09-01 | T-09-01 | Compact-card icon buttons invoke pre-existing route callbacks only; no new auth or privilege path was introduced. | Phase 09 threat model | 2026-04-23 |
| A-09-02 | T-09-02 | Adding `role="button"` and keyboard handling changed accessibility semantics, not data integrity or trust boundaries. | Phase 09 threat model | 2026-04-23 |
| A-09-03 | T-09-04 | `HTMLButtonElement` -> `HTMLElement` broadening supports focus return and remains sourced from trusted UI events only. | Phase 09 threat model | 2026-04-23 |
| A-09-04 | T-09-05 | Removing favorites from the grid intentionally narrows the card surface while preserving the flyout capability. | Phase 09 threat model | 2026-04-23 |
| A-09-05 | T-09-07 | The delete-confirmation copy update is textual only; confirmation gating remains unchanged. | Phase 09 threat model | 2026-04-23 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-24 | 7 | 7 | 0 | Codex (`$gsd-secure-phase 9`) |

---

## Audit Notes

- Focused security evidence is present for the two `mitigate` threats through current component and route tests.
- A broader regression sweep on 2026-04-24 surfaced one unrelated failure in [generation-components.test.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/generation-components.test.tsx:139): it still expects a `Draft` chip that the current `MealCard` render no longer includes. This does not reopen any Phase 09 security threat, but it remains a non-security verification gap.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified after security audit on 2026-04-24
