---
phase: 4
slug: draft-generation-with-streaming
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-21
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (unit) + Playwright (E2E) |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run && npx playwright test` |
| **Estimated runtime** | ~15s (unit) / ~45s (E2E) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run && npx playwright test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds (unit); 60 seconds (E2E)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | DEVT-01 | T-04-01 | llm_logs RLS: user can only read own rows | unit | `npx vitest run src/lib/generation/stream-parser.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 0 | GEN-01 | — | mealPlan.create requires authed user | unit | `npx vitest run src/lib/generation/stream-parser.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | GEN-02 | T-04-02 | JWT validated before streaming begins | unit | `npx vitest run src/lib/generation/stream-parser.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | GEN-03 | — | Household allergies/avoidances in prompt | manual | See Manual-Only Verifications — edge function integration | — | ⬜ pending |
| 04-02-03 | 02 | 1 | GEN-04 | — | Skill level + appliances in prompt | manual | See Manual-Only Verifications — edge function integration | — | ⬜ pending |
| 04-02-04 | 02 | 1 | GEN-06 | — | rationale stored in meals table (not in SSE stream) | manual | See Manual-Only Verifications — llm_logs/meals DB inspection | — | ⬜ pending |
| 04-03-01 | 03 | 2 | GEN-02 | — | Skeleton renders before first SSE event | unit | `npx vitest run src/components/generation/` | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 2 | GEN-06 | — | Meal card shows title + short_description | unit | `npx vitest run src/components/generation/` | ❌ W0 | ⬜ pending |
| 04-03-03 | 03 | 2 | GEN-02 | — | Slot mapped by (day_of_week, meal_type) | unit | `npx vitest run src/lib/generation/stream-parser.test.ts` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 3 | DEVT-03 | — | Dev page shows last 10 LLM log entries | unit | `npx vitest run src/routes/dev-page.test.tsx` | ❌ W0 | ⬜ pending |
| 04-05-01 | 05 | 4 | GEN-02 | — | First meal appears within 2s of submit | E2E | `npx playwright test tests/e2e/generation-flow.spec.ts` | ❌ W0 | ⬜ pending |
| 04-05-02 | 05 | 4 | GEN-01 | — | Form accepts mealTypes and numDays | E2E | `npx playwright test tests/e2e/generation-flow.spec.ts` | ❌ W0 | ⬜ pending |
| 04-05-03 | 05 | 4 | DEVT-03 | — | Dev page renders LLM log section | E2E | `npx playwright test tests/e2e/generation-flow.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/generation/stream-parser.test.ts` — unit stubs for NDJSON parsing + slot mapping (GEN-02, GEN-03)
- [ ] `src/components/generation/*.test.tsx` — stubs for GenerationForm, MealCard, SkeletonMealCard, PlanReadyBanner
- [ ] `src/routes/dev-page.test.tsx` — stub for LLM log rendering (DEVT-03)
- [ ] `tests/e2e/generation-flow.spec.ts` — E2E spec stubs for submit → stream → progressive render
- [ ] `tests/e2e/generation-error.spec.ts` — E2E spec stub for stream error → StreamErrorBanner → Try again

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| First meal appears < 2s (streaming perceived) | GEN-02 | Requires real Grok API call; E2E tests use mock SSE | Start `netlify dev`, open /plan/new, submit form, observe time-to-first-card visually |
| Meals respect household dietary constraints | GEN-03, GEN-04 | Requires LLM judgment; content cannot be deterministically asserted | Set up household with known allergies (e.g., peanuts); generate; verify no peanut meals |
| LLM rationale stored in DB (not in SSE stream) | GEN-06 | Requires DB inspection; edge function strips rationale from SSE before emission (D-06) | Run `supabase db query "SELECT rationale FROM meals LIMIT 5"` — confirm non-null values |
| llm_logs insert after stream completes | DEVT-01 | Edge function DB write runs in Deno finally block; no unit test mock for Supabase client in Deno | Start edge function, trigger generation, run `supabase db query "SELECT id, model FROM llm_logs ORDER BY created_at DESC LIMIT 1"` — confirm row exists |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are listed as Manual-Only with instructions
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 E2E paths use correct locations: `tests/e2e/generation-flow.spec.ts` and `tests/e2e/generation-error.spec.ts`
- [x] No watch-mode flags
- [x] Feedback latency < 15s (unit) / 60s (E2E)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
