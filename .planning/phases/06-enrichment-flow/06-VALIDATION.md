---
phase: 6
slug: enrichment-flow
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-22
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + Playwright |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm run test:unit -- src/lib/generation/spoonacular-enrichment.test.ts src/lib/generation/spoonacular-usage.test.ts src/hooks/use-meal-enrichment.test.ts src/components/generation/meal-detail-flyout.test.tsx src/routes/dev-page.test.tsx` |
| **Full suite command** | `npm run test:unit && npm run test:e2e` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit -- <targeted files>`
- **After every plan wave:** Run `npm run test:unit`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 0 | ENRCH-02 | T-06-01 | Spoonacular payloads map only into approved recipe fields and malformed fields fail closed | unit | `npm run test:unit -- src/lib/generation/spoonacular-enrichment.test.ts` | ✅ | ✅ |
| 06-01-02 | 01 | 0 | ENRCH-03 | T-06-02 | Cache hit path prevents duplicate API calls and shared-cache writes stay privileged | unit | `npm run test:unit -- src/lib/generation/spoonacular-enrichment.test.ts` | ✅ | ✅ |
| 06-01-03 | 01 | 0 | DEVT-02 | T-06-03 | Usage rows persist quota headers with UTC-day grouping and no secret leakage | unit | `npm run test:unit -- src/lib/generation/spoonacular-usage.test.ts` | ✅ | ✅ |
| 06-02-01 | 02 | 1 | ENRCH-01 | T-06-04 | Only owned meals can be enriched and batch progress stays slot-local | unit | `npm run test:unit -- src/hooks/use-meal-enrichment.test.ts` | ✅ | ✅ |
| 06-02-02 | 02 | 1 | ENRCH-04 | T-06-05 | Per-card success or failure updates without clearing sibling slots | unit | `npm run test:unit -- src/hooks/use-meal-enrichment.test.ts` | ✅ | ✅ |
| 06-03-01 | 03 | 2 | ENRCH-05 | T-06-06 | Flyout shows recipe details while keeping focus handling intact | unit | `npm run test:unit -- src/components/generation/meal-detail-flyout.test.tsx` | ✅ | ✅ |
| 06-03-02 | 03 | 2 | DEVT-04 | T-06-07 | `/dev` reports usage totals and per-call breakdown without exposing secrets | unit | `npm run test:unit -- src/routes/dev-page.test.tsx` | ✅ | ✅ |
| 06-04-01 | 04 | 3 | ENRCH-01 | T-06-04 | User can multi-select meals and enrich them from the persisted plan surface | e2e | `npm run test:e2e -- tests/e2e/enrichment-flow.spec.ts` | ✅ | ✅ |
| 06-04-02 | 04 | 3 | ENRCH-04 | T-06-05 | Grid updates live as individual meals complete and failures stay local | e2e | `npm run test:e2e -- tests/e2e/enrichment-flow.spec.ts` | ✅ | ✅ |
| 06-04-03 | 04 | 3 | ENRCH-05 / DEVT-04 | T-06-06 / T-06-07 | Enriched flyout and dev-usage reporting work in the end-to-end app path | e2e | `npm run test:e2e -- tests/e2e/enrichment-flow.spec.ts` | ✅ | ✅ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/lib/generation/spoonacular-enrichment.test.ts` — cache lookup/write and payload transform coverage
- [x] `src/lib/generation/spoonacular-usage.test.ts` — quota-header logging and daily-summary coverage
- [x] `src/hooks/use-meal-enrichment.test.ts` — concurrency-limited batch orchestration, local progress, and retry behavior
- [x] `tests/e2e/enrichment-flow.spec.ts` — select-and-enrich, cached re-open, flyout, and dev-page coverage
- [x] `src/routes/dev-page.test.tsx` — replace placeholder assertions with real Spoonacular usage UI expectations
- [x] Extend `src/components/generation/meal-detail-flyout.test.tsx` — enriched recipe rendering alongside existing focus checks

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Spoonacular enrichment uses a real API key and returns current third-party data | ENRCH-02 | Automated tests should not depend on external quota or network variance | Start the local stack with a valid Spoonacular key, enrich at least two meals from `/plan/:id`, and confirm ingredients, image, nutrition, and instructions populate from the live API |
| Daily points used vs `50`-point budget reflects live header values | DEVT-02 / DEVT-04 | Quota headers and daily totals depend on real API responses | After at least one live enrichment and one cache hit, open `/dev` and confirm totals, requests, hits, misses, and per-call entries match the observed activity |
| Batch UX remains readable on mobile and desktop with the sticky action bar and flyout | ENRCH-01 / ENRCH-05 | Layout quality and motion need human review | Verify selection mode, `Select all`, live per-card updates, retry affordances, and flyout readability at mobile and desktop breakpoints |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** Automated and live Spoonacular verification approved on 2026-04-22

## Live Verification Evidence 2026-04-22

- Ran a real-key local verification flow against the live Netlify + Supabase stack using a seeded authenticated plan.
- Two draft meals enriched through the persisted `/plan/:id` route with the first `Enriched` status appearing in under 1 second (`794 ms`) before the batch finished.
- The enriched flyout rendered a real image plus ingredients, instructions, nutrition, and the original rationale.
- `/dev` reflected live Spoonacular usage after the first batch: `42 / 49` points used, `4` requests made, `0` cache hits, and `4` cache misses, with per-call rows for both `recipes/complexSearch` and `recipes/{id}/information`.
- A repeated enrichment on an already enriched meal logged a cache-hit usage row (`endpoint = "meal-row"`, `points_used = 0`), confirming the cache-reuse path without another live fetch.
- Live usage rows persisted quota headers on all non-cache calls (`quota_request`, `quota_used`, `quota_left` populated on 6 live-call rows).

## Validation Audit 2026-04-22

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

### Evidence Rechecked

- `npm run test:unit -- src/lib/generation/spoonacular-enrichment.test.ts src/lib/generation/spoonacular-usage.test.ts src/hooks/use-meal-enrichment.test.ts src/components/generation/meal-detail-flyout.test.tsx src/routes/dev-page.test.tsx src/routes/plan-page.test.tsx supabase/functions/trpc/spoonacular-search.test.ts`
- `npx playwright test tests/e2e/enrichment-flow.spec.ts`

### Audit Notes

- Existing automated coverage still matches the Phase 6 requirement map in this worktree.
- Live Spoonacular verification is now closed with real payload, quota-header, and cache-hit evidence captured on 2026-04-22.
- No additional Nyquist test files were required beyond the pre-existing automated suite and the completed live-key pass.
