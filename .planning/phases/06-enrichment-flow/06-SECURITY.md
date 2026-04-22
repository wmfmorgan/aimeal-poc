---
phase: 6
slug: enrichment-flow
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-22
---

# Phase 6 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser batch action -> `meal.enrich` | Untrusted client selection state triggers authenticated enrichment work against owned meals | meal ids, auth-scoped mutation intent |
| tRPC router -> Spoonacular | Third-party recipe payloads and quota headers enter server-controlled normalization and persistence | recipe metadata, quota counters |
| tRPC router -> shared cache / usage log | Server-owned writes cross from caller-scoped reads into privileged shared storage | normalized recipe fields, usage rows |
| persisted usage rows -> `/dev` presentation | Stored usage data becomes user-visible diagnostics | usage counters, endpoint labels, cache-hit metadata |
| enriched recipe payload -> flyout/grid | Third-party recipe data becomes user-visible content in the existing plan workflow | image URL, ingredients, instructions, nutrition |
| live verification -> phase sign-off | Real external API behavior determines whether automation-only results can be trusted | live payload shape, cache behavior, quota values |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-06-01 | T | `spoonacular_usage` migration | mitigate | `supabase/migrations/20260422000002_spoonacular_usage.sql` stores immutable per-call rows with UTC day and quota snapshots | closed |
| T-06-02 | I | usage-log RLS | mitigate | Select policy is scoped through owned `meal_plan_id` rows and inserts require `service_role` in `20260422000002_spoonacular_usage.sql` | closed |
| T-06-03 | T | enrichment field helpers | mitigate | `src/lib/generation/spoonacular-enrichment.ts` and `src/lib/generation/spoonacular-usage.ts` are covered by unit tests before router/UI consumption | closed |
| T-06-04 | R | Spoonacular cache-retention policy | accept | `src/lib/generation/spoonacular-enrichment.ts` documents PoC cache-first risk acceptance instead of hiding an expiry policy | closed |
| T-06-05 | E | `meal.enrich` | mitigate | `supabase/functions/trpc/index.ts` loads meals through caller JWT and `.eq("meal_plans.user_id", ctx.userId)` before any update | closed |
| T-06-06 | T | shared cache writes | mitigate | `supabase/functions/trpc/index.ts` uses `ctx.serviceSupabase` only for shared-cache writes and usage-log inserts while meal updates stay on `ctx.supabase` | closed |
| T-06-07 | D | batch hook | mitigate | `src/hooks/use-meal-enrichment.ts` isolates per-meal pending/error state and invalidates the plan query on each success | closed |
| T-06-08 | I | `/dev` usage query | mitigate | `devTools.spoonacularUsage` returns summary/call metadata only; no API keys, raw headers, or service-role internals are exposed | closed |
| T-06-09 | D | selection-mode UI | mitigate | `src/routes/plan-page.tsx` and `src/components/generation/MealPlanGrid.tsx` keep selection explicit, route-local, and limited to visible filled cards | closed |
| T-06-10 | T | flyout detail rendering | mitigate | `src/components/generation/MealDetailFlyout.tsx` renders typed enriched fields instead of parsing raw JSON in the component | closed |
| T-06-11 | I | `/dev` presentation | mitigate | `src/routes/dev-page.tsx` shows usage counters and endpoint labels only; it does not render auth headers, request bodies, or secrets | closed |
| T-06-12 | D | live card updates | mitigate | `src/hooks/use-meal-enrichment.ts` and `src/routes/plan-page.tsx` keep retry/loading local to each card so one failure cannot block sibling cards | closed |
| T-06-13 | R | regression coverage | mitigate | `06-VALIDATION.md`, hook tests, component tests, and `tests/e2e/enrichment-flow.spec.ts` encode selection, retry, cache reuse, flyout, and `/dev` behavior as executable coverage | closed |
| T-06-14 | D | live API variance | mitigate | `06-UAT.md` is complete and records live Spoonacular verification for enrichment, flyout rendering, `/dev` usage, and cache reuse | closed |
| T-06-15 | R | pricing/cache-policy conflict | accept | Phase 6 summaries and UAT preserve explicit PoC risk acceptance for cache retention relative to Spoonacular pricing-page language | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-06-01 | T-06-04, T-06-15 | The PoC intentionally keeps cache-first reuse even though newer Spoonacular pricing-page language appears stricter; this remains documented risk acceptance rather than implicit policy | Phase 6 execution summaries and live verification sign-off | 2026-04-22 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-22 | 15 | 15 | 0 | Codex (`$gsd-secure-phase 6`) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-22
