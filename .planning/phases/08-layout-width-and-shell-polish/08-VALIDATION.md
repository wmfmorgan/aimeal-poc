---
phase: 8
slug: layout-width-and-shell-polish
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-23
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + Playwright |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm run test:unit -- --run src/routes/plan-page.test.tsx src/routes/home-page.test.tsx src/routes/household-page.test.tsx src/routes/dev-page.test.tsx src/routes/auth-page.test.tsx` |
| **Full suite command** | `npm run test:unit -- --run && npm run test:e2e` |
| **Estimated runtime** | ~30 seconds for targeted Vitest checks, longer only for the final Playwright layout sweep |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit -- --run <targeted files>`
- **After every plan wave:** Run `npm run test:unit -- --run`
- **Before `$gsd-verify-work`:** `npm run test:unit -- --run` and `npm run test:e2e -- tests/e2e/layout-shell.spec.ts`, then complete the manual viewport review
- **Max feedback latency:** 30 seconds for task-level checks

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | LAY-01 / UI-02 | T-08-01 | Shared shell widens without turning the app full-bleed or breaking routed page mounting | unit | `npm run test:unit -- --run src/routes/plan-page.test.tsx src/routes/auth-page.test.tsx` | ✅ | planned |
| 08-01-02 | 01 | 1 | LAY-01 / UI-02 | T-08-02 | Header and nav spacing tighten without altering navigation or auth behavior | unit | `npm run test:unit -- --run src/routes/plan-page.test.tsx src/routes/auth-page.test.tsx` | ✅ | planned |
| 08-02-01 | 02 | 2 | LAY-02 / UI-02 | T-08-05 | Plan-route section rhythm makes the grid primary without disturbing persisted-plan actions | unit | `npm run test:unit -- --run src/routes/plan-page.test.tsx` | ✅ | planned |
| 08-02-02 | 02 | 2 | LAY-02 / UI-02 | T-08-05 | Generation and finalization shells tighten while preserving existing buttons and flow logic | unit | `npm run test:unit -- --run src/routes/plan-page.test.tsx` | ✅ | planned |
| 08-02-03 | 02 | 2 | LAY-02 | T-08-04 | Grid density adapts by day count before horizontal overflow is allowed | unit | `npm run test:unit -- --run src/components/generation/meal-plan-management.test.tsx src/routes/plan-page.test.tsx` | ✅ | planned |
| 08-03-01 | 03 | 3 | LAY-01 / UI-02 | T-08-09 | Home and dev consume the wider shell intentionally while preserving editorial/home and utility/dev structure | unit | `npm run test:unit -- --run src/routes/home-page.test.tsx src/routes/dev-page.test.tsx` | `src/routes/home-page.test.tsx` planned in 08-03, `src/routes/dev-page.test.tsx` exists | planned |
| 08-03-02 | 03 | 3 | LAY-01 / UI-02 | T-08-07 | Household spacing tightens while the primary/support rail hierarchy and validation cues remain intact | unit | `npm run test:unit -- --run src/routes/household-page.test.tsx` | `src/routes/household-page.test.tsx` planned in 08-03 | planned |
| 08-03-03 | 03 | 3 | LAY-01 / UI-02 | T-08-08 | Auth remains capped and focused while perimeter spacing is reduced | unit | `npm run test:unit -- --run src/routes/auth-page.test.tsx` | ✅ | planned |
| 08-04-01 | 04 | 4 | LAY-01 / LAY-02 / UI-02 | T-08-10 / T-08-11 | Automated coverage catches shell-width and responsive layout regressions across plan, home, household, dev, and auth routes | unit + e2e | `npm run test:unit -- --run src/routes/plan-page.test.tsx src/routes/home-page.test.tsx src/routes/household-page.test.tsx src/routes/dev-page.test.tsx src/routes/auth-page.test.tsx && npm run test:e2e -- tests/e2e/layout-shell.spec.ts` | `tests/e2e/layout-shell.spec.ts` planned in 08-04; route tests exist or are created by 08-03 | planned |
| 08-04-02 | 04 | 4 | LAY-01 / LAY-02 / UI-02 | T-08-10 / T-08-11 | Manual signoff happens only after automated verification passes across desktop, tablet, and mobile | unit + e2e | `npm run test:unit -- --run src/routes/plan-page.test.tsx src/routes/home-page.test.tsx src/routes/household-page.test.tsx src/routes/dev-page.test.tsx src/routes/auth-page.test.tsx && npm run test:e2e -- tests/e2e/layout-shell.spec.ts` | same as above | planned |

*Status values: planned before execution, then update to ✅ / ❌ during implementation.*

---

## Wave 0 Requirements

- [x] No watch-mode `vitest` commands remain; all task-level unit verifies use `npm run test:unit -- --run ...`
- [x] Phase 8 now plans explicit `/` route coverage via `src/routes/home-page.test.tsx`
- [x] Phase 8 now plans explicit `/household` route coverage via `src/routes/household-page.test.tsx`
- [x] Final phase verification runs plan, home, household, dev, and auth route tests together before Playwright and manual review
- [x] Tablet and multi-day plan responsiveness remain covered by `tests/e2e/layout-shell.spec.ts`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Editorial feel of the widened shell | LAY-01 / UI-02 | Automation can assert tokens and overflow, not whether the shell still feels editorial instead of dashboard-like | Review `/`, `/plan/:id`, `/household`, and `/auth` after `08-04-01` passes |
| Tablet matrix readability for 6-7 day plans | LAY-02 | Playwright can confirm matrix retention and overflow behavior, but human review is needed for actual scanability | Review tablet `/plan/:id` after the dedicated Playwright layout spec passes |
| Mobile route calmness after spacing reductions | UI-02 | Tightened spacing can still feel visually cramped even when DOM assertions pass | Review mobile `/plan/:id`, `/household`, and `/auth` during `08-04-02` |

---

## Validation Sign-Off

- [x] All tasks have an automated verify path
- [x] Sampling continuity preserved across all four plans
- [x] Home and household route coverage is explicitly planned
- [x] No watch-mode flags remain
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** Phase 8 validation contract revised on 2026-04-23
