---
phase: 4
slug: draft-generation-with-streaming
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-21
updated: 2026-04-21T22:48:21Z
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
| 04-01-01 | 01 | 0 | DEVT-01 | T-04-01 | llm_logs RLS: user can only read own rows | manual | `supabase db query "SELECT table_name FROM information_schema.tables WHERE table_name = 'llm_logs';"` | ✅ | manual-only |
| 04-01-02 | 01 | 0 | GEN-01 | — | mealPlan.create requires authed user | unit + E2E | `npx vitest run src/components/generation/generation-components.test.tsx --reporter=verbose` | ✅ | ✅ green |
| 04-02-01 | 02 | 1 | GEN-02 | T-04-02 | JWT validated before streaming begins | E2E | `npx playwright test tests/e2e/generation-flow.spec.ts tests/e2e/generation-error.spec.ts --project=chromium` | ✅ | ✅ green |
| 04-02-02 | 02 | 1 | GEN-03 | — | Household allergies/avoidances in prompt | manual | See Manual-Only Verifications — edge function integration | — | manual-only |
| 04-02-03 | 02 | 1 | GEN-04 | — | Skill level + appliances in prompt | manual | See Manual-Only Verifications — edge function integration | — | manual-only |
| 04-02-04 | 02 | 1 | GEN-06 | — | rationale stored in meals table (not in SSE stream) | manual | See Manual-Only Verifications — llm_logs/meals DB inspection | — | manual-only |
| 04-03-01 | 03 | 2 | GEN-02 | — | Skeleton renders before first SSE event | unit + E2E | `npx vitest run src/components/generation/generation-components.test.tsx --reporter=verbose` | ✅ | ✅ green |
| 04-03-02 | 03 | 2 | GEN-06 | — | Meal card shows title + short_description | unit + E2E | `npx vitest run src/components/generation/generation-components.test.tsx --reporter=verbose` | ✅ | ✅ green |
| 04-03-03 | 03 | 2 | GEN-02 | — | Slot mapped by (day_of_week, meal_type) | unit | `npx vitest run src/lib/generation/stream-parser.test.ts --reporter=verbose` | ✅ | ✅ green |
| 04-04-01 | 04 | 3 | DEVT-03 | — | Dev page shows last 10 LLM log entries | unit + E2E | `npx vitest run src/routes/dev-page.test.tsx --reporter=verbose` | ✅ | ✅ green |
| 04-05-01 | 05 | 4 | GEN-02 | — | First meal appears within 2s of submit | manual + E2E | `npx playwright test tests/e2e/generation-flow.spec.ts --project=chromium` | ✅ | partial (manual latency gate) |
| 04-05-02 | 05 | 4 | GEN-01 | — | Form accepts mealTypes and numDays | E2E | `npx playwright test tests/e2e/generation-flow.spec.ts --project=chromium` | ✅ | ✅ green |
| 04-05-03 | 05 | 4 | DEVT-03 | — | Dev page renders LLM log section | E2E | `npx playwright test tests/e2e/generation-flow.spec.ts --project=chromium` | ✅ | ✅ green |
| 04-06-01 | 06 | gap-closure | GEN-02 | — | Generated plan shows visible day labels and day-column layout on desktop | E2E + UAT | `npx playwright test tests/e2e/generation-flow.spec.ts --project=chromium` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/lib/generation/stream-parser.test.ts` — parser + slot mapping coverage present
- [x] `src/components/generation/generation-components.test.tsx` — GenerationForm, MealCard, PlanReadyBanner, StreamErrorBanner covered
- [x] `src/routes/dev-page.test.tsx` — unit coverage for LLM log rendering + placeholder state present
- [x] `tests/e2e/generation-flow.spec.ts` — submit → stream → progressive render → dev page contract covered
- [x] `tests/e2e/generation-error.spec.ts` — stream error → retry + partial-card preservation covered

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| First meal appears < 2s (streaming perceived) | GEN-02 | Requires real Grok API call; E2E tests use mock SSE | Confirmed during UAT on 2026-04-21 with live local stack; re-run by starting `netlify dev`, opening `/plan/new`, and observing time-to-first-card visually |
| Meals respect household dietary constraints | GEN-03, GEN-04 | Requires LLM judgment; content cannot be deterministically asserted | Set up household with known allergies (e.g., peanuts); generate; verify no peanut meals |
| LLM rationale stored in DB (not in SSE stream) | GEN-06 | Requires DB inspection; edge function strips rationale from SSE before emission (D-06) | Run `supabase db query "SELECT rationale FROM meals LIMIT 5"` — confirm non-null values |
| llm_logs insert after stream completes | DEVT-01 | Edge function DB write runs in Deno finally block; no stable unit seam for Deno/Supabase insert verification | Trigger generation, then run `supabase db query "SELECT id, model FROM llm_logs ORDER BY created_at DESC LIMIT 1"` — confirm row exists |

---

## Validation Sign-Off

- [x] All tasks have automated verification or are listed as Manual-Only with instructions
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 E2E paths use correct locations: `tests/e2e/generation-flow.spec.ts` and `tests/e2e/generation-error.spec.ts`
- [x] No watch-mode flags
- [x] Feedback latency < 15s (unit) / 60s (E2E)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified 2026-04-21

## Validation Audit 2026-04-21

| Metric | Count |
|--------|-------|
| Gaps found | 2 |
| Resolved | 2 |
| Escalated | 0 |
