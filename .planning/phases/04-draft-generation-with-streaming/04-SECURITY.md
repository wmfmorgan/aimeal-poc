---
phase: 4
slug: draft-generation-with-streaming
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-21
updated: 2026-04-21T22:28:26Z
---

# Phase 4 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| client -> tRPC mutation | Browser submits `householdId`, `numDays`, and `mealTypes` into `mealPlan.create` | User-controlled UUIDs and generation parameters |
| browser -> edge function | Authenticated browser POSTs generation inputs to `/functions/v1/generate-draft` | Bearer token, household IDs, meal plan IDs, generation settings |
| edge function -> Grok API | Prompt assembly sends household/member context to xAI | Household names, allergies, avoidances, diet hints |
| edge function -> Supabase DB | Edge function writes draft meals and LLM logs using caller-scoped Supabase client | Generated meal rows, prompt/response logs |
| browser -> /dev | Browser renders log history without route-level auth gate | Developer-visible prompt/response text |
| test suite -> mocked generation endpoint | Playwright intercepts `/functions/v1/generate-draft` during automation | Synthetic SSE payloads only |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-04-01 | Tampering | `mealPlan.create` householdId input | mitigate | `authedProcedure` enforces auth, Zod validates UUID, and `meal_plans` RLS restricts inserts to `auth.uid()`-owned rows in [20260419000001_initial_schema.sql](/Users/jabroni/Projects/aimeal-poc/supabase/migrations/20260419000001_initial_schema.sql:74) and [trpc/index.ts](/Users/jabroni/Projects/aimeal-poc/supabase/functions/trpc/index.ts:165) | closed |
| T-04-02 | Elevation of Privilege | `devTools.llmLogs` authenticated read scope | accept | PoC risk accepted; authenticated read of all logs is documented and preserved in [04-01-PLAN.md](/Users/jabroni/Projects/aimeal-poc/.planning/phases/04-draft-generation-with-streaming/04-01-PLAN.md:497) and policy is explicit in [20260420000002_llm_logs.sql](/Users/jabroni/Projects/aimeal-poc/supabase/migrations/20260420000002_llm_logs.sql:10) | closed |
| T-04-03 | Information Disclosure | `llm_logs` full prompt text | accept | PoC-only local developer exposure accepted and documented; prompts remain on the developer page only | closed |
| T-04-04 | Tampering | `mealTypes` array input | mitigate | `mealPlan.create` constrains values to `breakfast|lunch|dinner` with Zod enum validation in [trpc/index.ts](/Users/jabroni/Projects/aimeal-poc/supabase/functions/trpc/index.ts:159) | closed |
| T-04-05 | Elevation of Privilege | `generate-draft` unauthenticated access | mitigate | Edge handler validates bearer token with `supabase.auth.getUser(token)` and returns `401` if absent in [generate-draft/index.ts](/Users/jabroni/Projects/aimeal-poc/supabase/functions/generate-draft/index.ts:117) | closed |
| T-04-06 | Tampering | `generate-draft` householdId spoofing | mitigate | Household fetch uses caller-scoped Supabase client plus household RLS, causing non-owned household reads to fail in [generate-draft/index.ts](/Users/jabroni/Projects/aimeal-poc/supabase/functions/generate-draft/index.ts:143) and [20260419000001_initial_schema.sql](/Users/jabroni/Projects/aimeal-poc/supabase/migrations/20260419000001_initial_schema.sql:68) | closed |
| T-04-07 | Tampering | `generate-draft` mealPlanId spoofing | mitigate | Meal inserts are constrained by `meals: own meal plans` RLS in [20260419000001_initial_schema.sql](/Users/jabroni/Projects/aimeal-poc/supabase/migrations/20260419000001_initial_schema.sql:76) and are written only through caller-scoped DB access in [generate-draft/index.ts](/Users/jabroni/Projects/aimeal-poc/supabase/functions/generate-draft/index.ts:80) | closed |
| T-04-08 | Tampering | Prompt injection via household/member fields | accept | Accepted PoC risk; only the owning user controls these fields, and no downstream HTML execution path exists | closed |
| T-04-09 | Denial of Service | Unbounded generation requests | accept | Accepted PoC risk; no per-user rate limiting in Phase 4, documented for future hardening | closed |
| T-04-10 | Denial of Service | Streaming request held open indefinitely | mitigate | Server emits `[DONE]`, closes in `finally`, and client treats normal stream close as completion in [generate-draft/index.ts](/Users/jabroni/Projects/aimeal-poc/supabase/functions/generate-draft/index.ts:234) and [use-generation-stream.ts](/Users/jabroni/Projects/aimeal-poc/src/hooks/use-generation-stream.ts:47) | closed |
| T-04-11 | Information Disclosure | Bearer token in generation fetch headers | accept | Standard SPA -> edge-function auth pattern accepted for this phase; token is the user’s own Supabase session token | closed |
| T-04-12 | Tampering | SSE payload -> React state -> DOM rendering | mitigate | `parseMealLine` validates payload shape and the UI renders text nodes without `dangerouslySetInnerHTML` in [stream-parser.ts](/Users/jabroni/Projects/aimeal-poc/src/lib/generation/stream-parser.ts:20) and [MealCard.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealCard.tsx:8) | closed |
| T-04-13 | Denial of Service | Reader hangs if `[DONE]` never arrives | mitigate | Client exits cleanly when `reader.read()` returns `done`, even without a `[DONE]` event, in [use-generation-stream.ts](/Users/jabroni/Projects/aimeal-poc/src/hooks/use-generation-stream.ts:47) | closed |
| T-04-14 | Elevation of Privilege | Client-submitted `household.id` in GenerationForm | accept | Accepted because `mealPlan.create` already runs behind `authedProcedure` and DB-layer RLS | closed |
| T-04-15 | Information Disclosure | `/dev` route unauthenticated access | accept | Route is intentionally left ungated in [router.tsx](/Users/jabroni/Projects/aimeal-poc/src/app/router.tsx:42) for local PoC use only; accepted and documented | closed |
| T-04-16 | Information Disclosure | `/dev` prompt/response visibility | accept | Local developer-only visibility accepted; log display is intentionally explicit in [dev-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/dev-page.tsx:13) | closed |
| T-04-17 | Tampering | XSS via log prompt/response rendering | mitigate | Prompt and response are rendered in `<pre>` text nodes with no `dangerouslySetInnerHTML` in [dev-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/dev-page.tsx:56) | closed |
| T-04-18 | Information Disclosure | Mock SSE format leakage in test code | accept | Test-only fixture data is not shipped to production; accepted risk for local/CI automation | closed |
| T-04-19 | Denial of Service | Playwright hitting real Grok API | mitigate | E2E tests intercept `/functions/v1/generate-draft` and the real-latency check remains manual-only via `test.skip` in [generation-flow.spec.ts](/Users/jabroni/Projects/aimeal-poc/tests/e2e/generation-flow.spec.ts:50) and [generation-error.spec.ts](/Users/jabroni/Projects/aimeal-poc/tests/e2e/generation-error.spec.ts:50) | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-04-01 | T-04-02 | Authenticated `llm_logs` reads are acceptable in the local single-developer PoC. | Phase 4 plan disposition | 2026-04-21 |
| AR-04-02 | T-04-03 | Full prompt text in `llm_logs` is acceptable for local developer troubleshooting in Phase 4. | Phase 4 plan disposition | 2026-04-21 |
| AR-04-03 | T-04-08 | Prompt injection from user-controlled household text is accepted for the single-user PoC. | Phase 4 plan disposition | 2026-04-21 |
| AR-04-04 | T-04-09 | No rate limiting is acceptable in the Phase 4 local/dev context. | Phase 4 plan disposition | 2026-04-21 |
| AR-04-05 | T-04-11 | Bearer token usage in the browser->edge fetch path is standard and accepted. | Phase 4 plan disposition | 2026-04-21 |
| AR-04-06 | T-04-14 | Client submission of household IDs is accepted because auth and RLS enforce ownership. | Phase 4 plan disposition | 2026-04-21 |
| AR-04-07 | T-04-15 | `/dev` remains unauthenticated in local PoC runs by explicit design. | Phase 4 plan disposition | 2026-04-21 |
| AR-04-08 | T-04-16 | Full log visibility on `/dev` is acceptable for developer-only local use. | Phase 4 plan disposition | 2026-04-21 |
| AR-04-09 | T-04-18 | Mock SSE payload visibility in test code is acceptable because tests are not deployed. | Phase 4 plan disposition | 2026-04-21 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-21 | 19 | 19 | 0 | Codex (`$gsd-secure-phase 4`) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-21
