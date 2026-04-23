---
phase: 7
slug: finalization-and-favorites
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-22
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + Playwright |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npx vitest run src/lib/generation/shopping-list.test.ts src/lib/generation/favorites.test.ts src/hooks/use-meal-plan.test.ts src/components/generation/plan-finalization.test.tsx src/components/generation/meal-detail-flyout.test.tsx src/routes/plan-page.test.tsx` |
| **Full suite command** | `npm run test:unit && npm run test:e2e` |
| **Estimated runtime** | ~30 seconds targeted, longer only at wave-boundary Playwright runs |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit -- <targeted files>`
- **After every plan wave:** Run `npm run test:unit`
- **Before `$gsd-verify-work`:** Full suite must be green, then run the Phase 7 Playwright flow
- **Max feedback latency:** 30 seconds for task-level checks

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 0 | FINAL-02 | T-07-01 | Shopping-list aggregation de-duplicates enriched ingredients and preserves safe quantity rollups | unit | `npm run test:unit -- src/lib/generation/shopping-list.test.ts` | ✅ | ✅ |
| 07-01-02 | 01 | 0 | FAV-01 / FAV-02 | T-07-02 | Favorite payload shaping is recipe-backed only and save behavior is idempotent by recipe id | unit | `npm run test:unit -- src/lib/generation/favorites.test.ts` | ✅ | ✅ |
| 07-02-01 | 02 | 1 | FINAL-01 / FINAL-02 | T-07-03 | Only owned plans finalize and draft meals are removed server-side while shopping-list state is persisted | unit | `npm run test:unit -- src/hooks/use-meal-plan.test.ts` | ✅ | ✅ |
| 07-02-03 | 02 | 1 | FINAL-01 | T-07-03 | Finalized plans reject later enrich/delete/regenerate mutations server-side | unit | `npm run test:unit -- src/hooks/use-meal-plan.test.ts` | ✅ | ✅ |
| 07-02-02 | 02 | 1 | FAV-01 / FAV-02 | T-07-04 | Favorite saves require enriched meals, update persisted meal state, and hydrate library reads consistently | unit | `npm run test:unit -- src/hooks/use-meal-plan.test.ts` | ✅ | ✅ |
| 07-03-01 | 03 | 2 | FINAL-01 / FINAL-03 | T-07-05 | Finalize confirmation states discard behavior clearly and shopping-list panel exposes copy feedback accessibly | component | `npm run test:unit -- src/components/generation/plan-finalization.test.tsx src/routes/plan-page.test.tsx` | ✅ | ✅ |
| 07-03-02 | 03 | 2 | FAV-01 / FAV-02 | T-07-06 | Draft meals cannot be favorited and enriched meals show stable saved state in grid and flyout | component | `npm run test:unit -- src/components/generation/meal-detail-flyout.test.tsx src/routes/plan-page.test.tsx` | ✅ | ✅ |
| 07-04-01 | 04 | 3 | FINAL-01 / FINAL-02 / FINAL-03 | T-07-05 | End-to-end finalize flow removes draft meals, exposes shopping list, and supports clipboard copy feedback | e2e | `npx playwright test tests/e2e/finalization-favorites.spec.ts` | ✅ | ✅ |
| 07-04-02 | 04 | 3 | FAV-01 / FAV-02 | T-07-06 | End-to-end favorite flow persists across plan revisit and favorites-panel opens | e2e | `npx playwright test tests/e2e/finalization-favorites.spec.ts` | ✅ | ✅ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/lib/generation/shopping-list.test.ts` — de-duplication, quantity rollup, and fallback grouping coverage
- [x] `src/lib/generation/favorites.test.ts` — favorite payload shaping and recipe-backed eligibility coverage
- [x] `src/hooks/use-meal-plan.test.ts` — finalize/favorite/library invalidation coverage
- [x] `src/components/generation/plan-finalization.test.tsx` — finalize card, confirmation, shopping-list panel, and favorites-panel expectations
- [x] `tests/e2e/finalization-favorites.spec.ts` — mixed-state finalize, copy flow, save favorite, and cross-plan revisit coverage

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Editorial quality of finalization card and right-side panels | FINAL-01 / FINAL-03 / FAV-02 | Visual calm, spacing, and panel tone need human review | Completed in `07-UAT.md` Test 1 on 2026-04-23 |
| Clipboard copy experience | FINAL-03 | Automated tests can assert calls, not the real browser permission and tactile feedback quality | Completed in `07-UAT.md` Test 3 on 2026-04-23 |
| Draft-meal favorite affordance clarity | FAV-01 | Human review is needed to ensure the disabled state reads clearly, not broken | Completed in `07-UAT.md` Test 4 on 2026-04-23 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing references
- [x] No watch-mode flags
- [x] Feedback latency < 30s for task-level checks
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** automated and manual verification approved on 2026-04-23

## Validation Audit 2026-04-23

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

### Audit Evidence

- `npx vitest run src/lib/generation/shopping-list.test.ts src/lib/generation/favorites.test.ts src/hooks/use-meal-plan.test.ts src/components/generation/plan-finalization.test.tsx src/components/generation/meal-detail-flyout.test.tsx src/routes/plan-page.test.tsx`
- `npx playwright test tests/e2e/finalization-favorites.spec.ts`

### Audit Notes

- All targeted automated checks passed during the audit: 48 Vitest assertions across 6 files and 2 Phase 7 Playwright scenarios.
- No missing or partial automated coverage was found for `FINAL-01`, `FINAL-02`, `FINAL-03`, `FAV-01`, or `FAV-02`.
- Manual-only checks were closed in `07-UAT.md` on 2026-04-23, covering panel quality, clipboard behavior, and draft-favorite affordance clarity.
