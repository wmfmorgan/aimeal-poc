---
phase: 03-household-setup
plan: "02"
subsystem: api
tags: [trpc, supabase, deno, auth, rls, edge-functions]
requires:
  - phase: 03-01
    provides: household uniqueness constraint and validation/domain contract
provides:
  - auth-aware trpc client headers
  - household.get procedure
  - household.upsert procedure
  - household member reconciliation on save
affects: [phase-03-ui, phase-03-testing, phase-04-draft-generation]
tech-stack:
  added: []
  patterns: [trpc-auth-header-injection, authed-procedure, household-upsert-with-member-reconcile]
key-files:
  created: []
  modified:
    - src/lib/trpc/client.ts
    - supabase/functions/trpc/index.ts
key-decisions:
  - "The frontend tRPC client injects the Supabase access token in async headers so the edge router can reuse the caller identity instead of inventing a second auth mechanism."
  - "Household procedures run through the caller's JWT and existing RLS protections instead of a service-role bypass."
  - "Member persistence is implemented as upsert-plus-delete-stale-members so household row identity remains stable while the member list stays in sync."
patterns-established:
  - "Authenticated browser tRPC calls derive Authorization headers from supabase.auth.getSession()."
  - "Edge-function routers use authedProcedure middleware to enforce authenticated access and centralize UNAUTHORIZED responses."
requirements-completed: [HSHD-01, HSHD-02, HSHD-03, HSHD-04, HSHD-05]
duration: unknown
completed: 2026-04-20
---

# Phase 3 Plan 02: Household tRPC Persistence Summary

**Authenticated household CRUD through the existing tRPC edge function, with JWT-backed context, household upsert, and member-list reconciliation**

## Performance

- **Duration:** Unknown from repo artifacts
- **Started:** Unknown
- **Completed:** 2026-04-20
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added Supabase-session Bearer token injection to every browser tRPC request.
- Extended the Deno tRPC edge router with a `household` namespace providing authenticated `get` and `upsert` procedures.
- Implemented household-member reconciliation so removed members are deleted, existing members are updated, and new members are inserted without recreating the household itself.

## Task Commits

Phase 3 was implemented as a single integrated feature commit rather than one atomic commit per plan task:

1. **Task 1: Add auth headers to tRPC client** - `0183ac0`
2. **Task 2: Add household procedures to Deno tRPC router** - `0183ac0`

**Plan metadata:** not recoverable as a separate commit from git history

## Files Created/Modified

- `src/lib/trpc/client.ts` - imports the browser Supabase client and adds `async headers()` to attach `Authorization: Bearer <token>` when a session exists
- `supabase/functions/trpc/index.ts` - adds auth context creation, `authedProcedure`, `household.get`, and `household.upsert` on the existing Deno tRPC router

## Decisions Made

- Preserved the existing `ping` and `generateDraft` procedures while expanding the router, rather than splitting household persistence into a new edge function.
- Used `onConflict: "user_id"` for household persistence so the same household row survives repeated edits.
- Normalized array-like DB values into plain `string[]` responses before sending data back to the React client.

## Deviations from Plan

### Auto-fixed Issues

**1. [Artifact reconstruction] Plan summary was missing from the phase directory**
- **Found during:** Post-execution workflow recovery
- **Issue:** `03-02-SUMMARY.md` was missing even though the API implementation files were present.
- **Fix:** Reconstructed this summary from the plan, code, and git evidence.
- **Files modified:** `.planning/phases/03-household-setup/03-02-SUMMARY.md`
- **Verification:** Summary reflects `src/lib/trpc/client.ts`, `supabase/functions/trpc/index.ts`, and feature commit `0183ac0`.
- **Committed in:** pending current workspace changes

**2. [Integrated execution] Plan 02 landed together with UI and tests**
- **Found during:** Summary reconstruction
- **Issue:** The repository does not contain isolated per-plan commits; API work was delivered in the same integrated feature commit as the household page and tests.
- **Fix:** Recorded the actual execution shape instead of inventing per-task commit hashes.
- **Files modified:** `.planning/phases/03-household-setup/03-02-SUMMARY.md`
- **Verification:** `git show --stat 0183ac0` includes API, UI, validation, and e2e files together.
- **Committed in:** pending current workspace changes

---

**Total deviations:** 2 documented during artifact restoration
**Impact on plan:** No implementation risk added. The summary now captures the real delivery shape needed by downstream workflows.

## Issues Encountered

- The router had to preserve the preexisting public procedures while adding authenticated context and household CRUD behavior.
- The current repo state confirms the authenticated household API exists, but not the original step-by-step delivery sequence.

## User Setup Required

None - this plan relies on the project's existing Supabase and Netlify local environment configuration.

## Threat Flags

- `T-3-01` — unauthenticated callers must not read or write household data; mitigated by `authedProcedure` and request-time JWT resolution in `supabase/functions/trpc/index.ts`
- `T-3-02` — household updates must not create duplicate rows; mitigated by `ON CONFLICT (user_id)` upsert against the unique household constraint

## Next Phase Readiness

- The React layer can now query for the current household and save edits through a stable API contract.
- Phase 4 can later rely on persisted household identity and member data being available from the edge router.

---
*Phase: 03-household-setup*
*Completed: 2026-04-20*
