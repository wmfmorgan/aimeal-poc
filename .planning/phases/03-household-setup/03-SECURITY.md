---
phase: 3
slug: household-setup
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-20
---

# Phase 3 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser → tRPC client → Edge Function | Browser requests may include a Supabase Bearer token, or no token when signed out | JWT access token, household payloads |
| Edge Function → Supabase DB | Household reads and writes execute against Supabase with the caller identity resolved from the incoming Authorization header | household row data, member row data |
| Client form state → household.upsert | Household name, member names, allergens, avoidances, cooking skill, and appliances leave local state and become API input | user-supplied strings and arrays |
| API response → household page hydration | Saved household data repopulates the form on revisit | household metadata and member preferences |
| Migration file → local Supabase reset | Source-controlled SQL mutates local schema during reset | DDL for household uniqueness |
| Playwright runner → local app stack | End-to-end tests send real HTTP requests into the local Netlify/Supabase stack | test auth flows, household CRUD requests |
| Test credential source | Test account data is generated or derived in local test code, not from a committed production secret store | local-only test email/password values |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-3-W0-01 | Tampering | `supabase/migrations/` | mitigate | `supabase/migrations/20260420000001_household_user_unique.sql` is source-controlled and defines the deterministic `households_user_id_key` constraint for `user_id`. | closed |
| T-3-W0-02 | Denial of Service | `supabase db reset` | accept | Reset only affects local development state and is an intentional destructive operation in local-only workflows. | closed |
| T-3-01 | Spoofing | `household.get` / `household.upsert` | mitigate | `authedProcedure` rejects `userId === null`, and `supabase.auth.getUser(token)` validates the incoming JWT before the router proceeds. | closed |
| T-3-02 | Tampering | `household.upsert` input | mitigate | `householdUpsertInputSchema` enforces trimmed non-empty names, allowed cooking-skill enum values, and structured arrays before any DB write. | closed |
| T-3-03 | Elevation of Privilege | `household.get` | mitigate | The query filters by `user_id = ctx.userId`, and the edge client uses the caller auth context rather than a browser-exposed privileged credential. | closed |
| T-3-04 | Elevation of Privilege | `household.upsert` | mitigate | Upsert always writes `user_id: ctx.userId`, and member reconciliation scopes deletes and updates to the resolved household id for that user. | closed |
| T-3-05 | Tampering | `households` table duplicate rows | mitigate | The unique DB constraint plus `onConflict: "user_id"` forces repeat saves to update the same household row. | closed |
| T-3-06 | Information Disclosure | `SUPABASE_SERVICE_ROLE_KEY` handling | accept | No client-side source file references `SUPABASE_SERVICE_ROLE_KEY`; the browser path uses the anon key and server-side auth context only. | closed |
| T-3-03-01 | Tampering | household/member name inputs | mitigate | `validateHousehold()` and `validateMemberName()` block empty input client-side, and the tRPC Zod schema re-validates on the server. | closed |
| T-3-03-02 | Tampering | allergen / avoidance tags | mitigate | `addTag()` trims and deduplicates values, arrays are sent as plain strings, and React renders text content without HTML injection. | closed |
| T-3-03-03 | Spoofing | unauthenticated `/household` access | mitigate | `/household` is wrapped in `ProtectedRoute`, the browser client sends a Bearer token when present, and the server still enforces `authedProcedure`. | closed |
| T-3-03-04 | Information Disclosure | household query rendering | accept | The rendered data belongs to the authenticated user, and the React surface renders plain text rather than HTML injection points. | closed |
| T-3-03-05 | Denial of Service | unbounded member list | accept | No hard cap is enforced in Phase 3, but this is a usability-bound local risk rather than a privilege-escalation path; later phases can impose limits if needed. | closed |
| T-3-04-01 | Information Disclosure | e2e test credentials | mitigate | Household e2e tests create fresh timestamped local accounts (`planplate.local`) with a local-only default password, so no committed production/shared credential is exposed. | closed |
| T-3-04-02 | Tampering | e2e tests against production data | accept | The phase test flow is designed for the local `netlify dev` stack and does not point at a production database. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-3-01 | T-3-W0-02 | `supabase db reset` intentionally destroys local dev data and is not part of a production execution path. | Codex | 2026-04-20 |
| R-3-02 | T-3-06 | No browser-exposed service-role usage exists in Phase 3; any service-role concern remains limited to local/server environment handling. | Codex | 2026-04-20 |
| R-3-03 | T-3-03-04 | Rendering a user's own household data on their authenticated screen is expected behavior, not a cross-user disclosure issue. | Codex | 2026-04-20 |
| R-3-04 | T-3-03-05 | Member-count limits are deferred because the practical risk is UX degradation rather than a material security boundary failure in this phase. | Codex | 2026-04-20 |
| R-3-05 | T-3-04-02 | Phase-3 e2e flows are intended for local development only and do not introduce a production tampering path. | Codex | 2026-04-20 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-20 | 15 | 15 | 0 | Codex |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-20
