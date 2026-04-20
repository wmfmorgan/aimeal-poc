---
phase: 01
slug: frontend-scaffold-and-local-dev
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-19T23:56:24Z
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser -> Netlify dev | User browser loads the local app only through the Netlify entrypoint on port `8888`. | Route requests and unauthenticated ping traffic |
| Netlify dev -> local Supabase APIs | Netlify redirects `/functions/v1/*`, `/rest/v1/*`, and `/auth/v1/*` to the local Supabase API port `54331`. | Local API requests and edge-function traffic |
| Supabase function runtime -> env file | The local tRPC edge function is started with `supabase/functions/.env` via the checked-in serve script. | Local development secrets |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-01-01 | Information Disclosure | Frontend API wiring | mitigate | The frontend uses the relative endpoint `/functions/v1/trpc` and does not embed secrets or direct backend credentials in browser code. Local secrets are loaded only by `scripts/dev/serve-trpc-local.sh` from `supabase/functions/.env`. Evidence: `src/lib/trpc/client.ts`, `scripts/dev/serve-trpc-local.sh`. | closed |
| T-01-02 | Spoofing / Tampering | Local routing boundary | mitigate | `netlify.toml` forces all local app traffic through Netlify on `8888` and rewrites the known Supabase paths to `127.0.0.1:54331`. Phase 1 smoke coverage exercises the app through Netlify instead of direct service ports. Evidence: `netlify.toml`, `tests/e2e/ping-smoke.spec.ts`, `scripts/dev/verify-phase1-stack.sh`. | closed |
| T-01-03 | Elevation of Privilege | Open placeholder routes | accept | Phase 1 intentionally leaves `/auth`, `/household`, and `/plan/:id` unguarded, but the routes are placeholder surfaces with no account actions, no persisted user data, and no privileged mutations. Auth enforcement is explicitly deferred to Phase 2. Evidence: `src/app/router.tsx`, `src/routes/auth-page.tsx`, `src/routes/household-page.tsx`, `src/routes/plan-page.tsx`, `01-CONTEXT.md`. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01-01 | T-01-03 | Placeholder routes are intentionally public in Phase 1 because they expose no protected state or mutation paths yet; introducing auth guards before auth exists would add dead security surface and churn. | Codex security audit | 2026-04-19 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-19 | 3 | 3 | 0 | Codex (`$gsd-secure-phase 1`) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-19
