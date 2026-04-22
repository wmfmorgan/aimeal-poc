---
phase: 5
slug: meal-plan-grid-and-management
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-22
updated: 2026-04-22T12:20:00Z
---

# Phase 5 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser -> `mealPlan.latest` / `mealPlan.get` | Persisted-plan navigation and revisit loads originate from untrusted route state and browser clicks | User-controlled route params, authenticated read requests |
| browser -> `meal.delete` / `meal.regenerate` | In-grid and flyout actions trigger destructive or AI-backed mutations | Meal IDs, meal-plan IDs, day/meal slot selectors |
| tRPC edge function -> Supabase | Authenticated procedures read and mutate persisted plans/meals through caller-scoped Supabase access | User-scoped meal-plan rows, meal rows, household context |
| tRPC edge function -> Grok API | Single-slot regeneration sends household context to the model provider | Household name, appliances, member allergies/avoidances/diet hints, requested slot |
| route state -> flyout / grid UI | UI state transitions must not strand focus, desynchronize actions, or reintroduce disallowed edit surfaces | Focus state, selected slot identity, management controls |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-05-01 | Information Disclosure | `mealPlan.get` | mitigate | `authedProcedure` plus UUID validation gates the procedure, and the query is scoped to `id + user_id` before returning plan/meals in [trpc/index.ts](/Users/jabroni/Projects/aimeal-poc/supabase/functions/trpc/index.ts:269) | closed |
| T-05-02 | Spoofing | `mealPlan.latest` | mitigate | The latest-plan resolver is authenticated and returns only the caller’s newest `meal_plans.id` or `null`, never an arbitrary route string, in [trpc/index.ts](/Users/jabroni/Projects/aimeal-poc/supabase/functions/trpc/index.ts:246) | closed |
| T-05-03 | Tampering | `buildMealPlanSlots` | mitigate | Slot normalization accepts only canonical day/meal values, discards malformed rows, and emits explicit empty slots so bad data cannot collapse the grid in [plan-slots.ts](/Users/jabroni/Projects/aimeal-poc/src/lib/generation/plan-slots.ts:28) and [use-meal-plan.test.ts](/Users/jabroni/Projects/aimeal-poc/src/hooks/use-meal-plan.test.ts:104) | closed |
| T-05-04 | Information Disclosure | `AppFrame` plan nav | mitigate | Plan navigation resolves through `useLatestMealPlan` and tested route behavior rather than trusting a client-assembled path in [use-meal-plan.ts](/Users/jabroni/Projects/aimeal-poc/src/hooks/use-meal-plan.ts:65) and [plan-page.test.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/plan-page.test.tsx:155) | closed |
| T-05-05 | Tampering | `PlanPage` route param handling | mitigate | The route treats only `id === "new"` as generation mode and sends all other ids through persisted-plan loading in [plan-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/plan-page.tsx:276) with regression coverage in [plan-page.test.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/plan-page.test.tsx:307) | closed |
| T-05-06 | Denial of Service | persisted plan route | mitigate | Failed persisted reads degrade to page-level loading/error/not-found states instead of crashing or silently swapping modes in [plan-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/plan-page.tsx:85) and [plan-page.test.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/plan-page.test.tsx:281) | closed |
| T-05-07 | Tampering | `meal.delete` | mitigate | Delete is authenticated, accepts only a UUID `mealId`, reads the target meal through caller-scoped DB access, and deletes only that meal row before the UI rehydrates the empty slot in [trpc/index.ts](/Users/jabroni/Projects/aimeal-poc/supabase/functions/trpc/index.ts:371) and [meal-plan-management.test.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/meal-plan-management.test.tsx:56) | closed |
| T-05-08 | Elevation of Privilege | `meal.regenerate` | mitigate | Regeneration accepts only `mealPlanId`, `dayOfWeek`, and `mealType`, revalidates plan ownership via `user_id`, then replaces only the requested slot in [trpc/index.ts](/Users/jabroni/Projects/aimeal-poc/supabase/functions/trpc/index.ts:402) and [tests/e2e/plan-management.spec.ts](/Users/jabroni/Projects/aimeal-poc/tests/e2e/plan-management.spec.ts:126) | closed |
| T-05-09 | Denial of Service | slot-local mutations | mitigate | Mutation state is tracked by slot key and overlaid into per-slot `regenerating` / `error` states so sibling slots remain intact in [use-meal-plan.ts](/Users/jabroni/Projects/aimeal-poc/src/hooks/use-meal-plan.ts:122), [plan-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/plan-page.tsx:39), and [meal-plan-management.test.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/meal-plan-management.test.tsx:106) | closed |
| T-05-10 | Denial of Service | `MealDetailFlyout` focus handling | mitigate | The flyout moves focus in on open, traps Tab navigation, closes on `Escape`, and restores focus to the trigger in [MealDetailFlyout.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealDetailFlyout.tsx:35) and [meal-detail-flyout.test.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/meal-detail-flyout.test.tsx:25) | closed |
| T-05-11 | Tampering | flyout action wiring | mitigate | Grid and flyout actions reuse the same route-owned `handleDelete` / `handleRegenerate` handlers, preventing a divergent mutation path in [plan-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/plan-page.tsx:136) and [MealPlanGrid.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealPlanGrid.tsx:67) | closed |
| T-05-12 | Repudiation | stale `PLAN-02` wording | mitigate | The implementation encodes a negative contract against inline editing via unit and E2E assertions, and the flyout/card surfaces expose no edit fields in [MealCard.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealCard.tsx:49), [meal-detail-flyout.test.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/meal-detail-flyout.test.tsx:76), and [tests/e2e/plan-management.spec.ts](/Users/jabroni/Projects/aimeal-poc/tests/e2e/plan-management.spec.ts:144) | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-22 | 12 | 12 | 0 | Codex (`$gsd-secure-phase 5`) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-22
