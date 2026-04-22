---
phase: 5
slug: meal-plan-grid-and-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `3.2.4` for unit/component tests; Playwright `1.56.1` for E2E |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npx vitest run src/hooks/use-meal-plan.test.ts` |
| **Full suite command** | `npm run test:unit` and `npm run test:e2e` |
| **Estimated runtime** | ~25 seconds for targeted checks; longer only at phase-gate E2E |

---

## Sampling Rate

- **After every task commit:** Run one targeted Vitest command such as `npx vitest run src/hooks/use-meal-plan.test.ts`, `npx vitest run src/routes/plan-page.test.tsx`, `npx vitest run src/components/generation/meal-plan-management.test.tsx`, or `npx vitest run src/components/generation/meal-detail-flyout.test.tsx`
- **After every plan wave:** Run `npm run test:unit`
- **Before `$gsd-verify-work`:** `npm run test:unit` and targeted `npm run test:e2e` coverage for plan management must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | PLAN-01 | T-05-01 / T-05-03 | Persisted plan reads and slot normalization produce a complete owned grid with explicit empty slots | unit | `npx vitest run src/hooks/use-meal-plan.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | PLAN-01 | T-05-01 | `mealPlan.latest` and `mealPlan.get` return only authenticated user plan data and include persisted meal rationale | unit | `npx vitest run src/hooks/use-meal-plan.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | PLAN-01 | T-05-04 | Plan nav resolves to the newest saved plan without exposing another user's plan id | unit + route | `npx vitest run src/routes/plan-page.test.tsx` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 2 | PLAN-01 | T-05-05 / T-05-06 | Persisted `/plan/:id` hydration and `Create new plan` route behavior work without falling back to generation mode | route | `npx vitest run src/routes/plan-page.test.tsx` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 3 | PLAN-03, GEN-05 | T-05-07 / T-05-08 | Delete and regenerate mutations are ownership-checked, slot-scoped, and routed through persisted plan handlers | unit + component | `npx vitest run src/components/generation/meal-plan-management.test.tsx` | ❌ W0 | ⬜ pending |
| 05-03-02 | 03 | 3 | PLAN-03, GEN-05 | T-05-09 | The grid renders filled, empty, regenerating, and delete-confirm states while sibling slots stay stable | component | `npx vitest run src/components/generation/meal-plan-management.test.tsx` | ❌ W0 | ⬜ pending |
| 05-04-01 | 04 | 4 | PLAN-04 | T-05-10 / T-05-11 | Flyout focus trap, `Escape` close, and focus return work while the right-side panel stays synchronized with the grid | component | `npx vitest run src/components/generation/meal-detail-flyout.test.tsx` | ❌ W0 | ⬜ pending |
| 05-04-02 | 04 | 4 | PLAN-02, PLAN-03, PLAN-04, GEN-05 | T-05-11 / T-05-12 | E2E management flows cover revisit, delete, regenerate, flyout behavior, and the explicit no-inline-edit regression guard | e2e | `npx playwright test tests/e2e/plan-management.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/routes/plan-page.test.tsx` — persisted load, latest-plan redirect handling, slot mutation orchestration
- [ ] `src/hooks/use-meal-plan.test.ts` — tRPC query/mutation wrapper behavior and invalidation rules
- [ ] `src/components/generation/meal-plan-management.test.tsx` — filled/empty/regenerating/delete-confirm card states
- [ ] `src/components/generation/meal-detail-flyout.test.tsx` — flyout focus trap, close, and focus return behavior
- [ ] `tests/e2e/plan-management.spec.ts` — revisit existing plan, delete slot, regenerate slot, open/close flyout, no-inline-edit regression

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Editorial feel of grid vs flyout balance | PLAN-01, PLAN-04 | Visual hierarchy and calm interaction tone are hard to assert automatically | Open an existing plan on desktop and mobile widths; confirm the weekly grid remains the primary anchor and the right-side flyout feels secondary but connected |
| Slot-local regeneration feel | GEN-05 | Automated tests can confirm behavior, not whether loading feels local rather than page-global | Trigger regeneration from a filled card and an empty slot; confirm only the targeted slot enters loading and other slots remain interactive |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
