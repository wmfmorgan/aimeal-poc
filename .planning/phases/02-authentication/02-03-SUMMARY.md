---
phase: 02-authentication
plan: "03"
subsystem: frontend-auth
tags: [auth, testing, vitest, playwright, e2e, unit-tests, verification]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [auth-unit-tests, auth-e2e-tests, phase2-verification-script]
  affects: [vitest.config.ts, tests/e2e/ping-smoke.spec.ts]
tech_stack:
  added: []
  patterns: [vitest-component-testing, playwright-e2e, inbucket-email-inspection, storage-state-persistence]
key_files:
  created:
    - src/components/auth/ProtectedRoute.test.tsx
    - src/lib/auth/validation.test.ts
    - src/routes/auth-page.test.tsx
    - tests/e2e/auth-flow.spec.ts
    - scripts/dev/verify-phase2-auth.sh
  modified:
    - tests/e2e/ping-smoke.spec.ts
    - vitest.config.ts
decisions:
  - "vitest.config.ts needs @/ path alias identical to vite.config.ts — without it all @/lib/* imports in test files fail with module-not-found"
  - "auth-page.test.tsx uses placeholder-based selectors instead of getByLabelText because auth-page.tsx labels lack htmlFor/id associations"
  - "Sign-in mode has two buttons named 'Sign in' (mode tab + submit) — tests select by type=submit to target the form action"
  - "ping-smoke.spec.ts now asserts signed-out / redirects to /auth and verifies connectivity badge on the /auth surface (ConnectivityProof component)"
  - "auth-flow.spec.ts uses Inbucket REST API at 127.0.0.1:54334 to retrieve reset email without mocking — proves real email delivery path"
  - "login-persistence test uses browser.newContext({ storageState }) to simulate close/reopen across contexts"
metrics:
  duration: "~8m"
  completed: "2026-04-20"
  tasks_completed: 3
  files_changed: 7
---

# Phase 2 Plan 03: Auth Verification Harness Summary

Vitest unit tests for guard decisions, validation helpers, and auth-page state transitions; Playwright E2E suite for all five auth happy paths; revised ping-smoke contract; single-command verification script.

## What Was Built

### Task 1 — Unit coverage for guard decisions, validation, and auth-page UI state

1. `vitest.config.ts` — Added `resolve.alias` with `@/` mapping (Rule 3 fix: required for test files to resolve `@/lib/*` imports identical to production code).

2. `src/components/auth/ProtectedRoute.test.tsx` — 6 tests across two describe blocks:
   - **ProtectedRoute**: loading renders null, unauthenticated redirects to /auth, authenticated renders children
   - **AuthRoute**: loading renders null, authenticated redirects to /household, unauthenticated renders auth page
   - Uses `vi.mock("@/lib/auth/auth-state")` with a configurable `mockUseAuth` to control session state without a real Supabase client

3. `src/lib/auth/validation.test.ts` — 30 tests covering every exported function:
   - `validateEmail`: 6 cases including empty, whitespace, no-@, no-domain, no-TLD
   - `validatePassword`: 4 cases including empty, short, exact-8, >8
   - `validatePasswordConfirm`: 3 cases including match, empty, mismatch
   - `validateSignIn/CreateAccount/ResetRequest/ResetComplete`: form-level tests for valid + each invalid combination
   - `hasErrors`: 3 cases including empty record

4. `src/routes/auth-page.test.tsx` — 14 tests in 4 describe blocks:
   - Default sign-in mode (heading, placeholders, Forgot password?, mode-switcher)
   - Mode switching (sign-in → create-account, back, → reset-request, back)
   - Reset-complete mode via `window.location.hash` `#type=recovery` detection
   - Submit/loading states (validation errors on empty submit, in-flight text, navigation on success)

### Task 2 — Playwright coverage for auth happy paths and revised smoke contract

1. `tests/e2e/auth-flow.spec.ts` — 5 browser tests:
   - **Protected-route redirect**: signed-out visit to `/household` lands on `/auth`
   - **Sign-up**: fills create-account form, asserts `/household` destination
   - **Login persistence**: signs up in `context1`, saves `storageState`, verifies `/household` directly in `context2` without re-authenticating (AUTH-02)
   - **Logout**: signs up, clicks "Sign out" in AppFrame, asserts redirect to `/auth`
   - **Password reset**: signs up → signs out → requests reset → reads link from Inbucket REST API at `127.0.0.1:54334` → follows link → sets new password → signs in with new credentials

2. `tests/e2e/ping-smoke.spec.ts` — Revised from 1 test to 2:
   - **Signed-out redirect**: asserts `page.url()` matches `/auth` after navigating to `/` (replaces old "API Connected on `/`" assertion)
   - **Connectivity badge on /auth**: asserts "API Connected" badge visible on `/auth` through the `ConnectivityProof` component — preserves the Netlify → tRPC smoke path

### Task 3 — Single-command verification script

`scripts/dev/verify-phase2-auth.sh`:
- Runs `npm run build` (TypeScript compile gate)
- Runs focused unit tests for the three auth test files
- Checks/starts local Supabase with `supabase status` / `supabase start`
- Clears stale spike Vite server on port 5173 (same pattern as Phase 1 script)
- Launches `netlify dev --port 8888` in background, polls until ready
- Runs `npm run test:e2e -- --project=chromium --grep 'auth flow|ping smoke'`
- `trap cleanup EXIT` kills the Netlify background process on success or failure

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vitest.config.ts missing @/ path alias**
- **Found during:** Task 1 — test files import `@/lib/auth/auth-state` and `@/lib/supabase/client`
- **Issue:** vitest.config.ts had no `resolve.alias` entry; all `@/` imports would fail with `Cannot find module` at test time
- **Fix:** Added `import path from "path"` and `resolve: { alias: { "@": path.resolve(__dirname, "./src") } }` matching vite.config.ts
- **Files modified:** `vitest.config.ts`
- **Commit:** 415161c

**2. [Rule 1 - Bug] auth-page.test.tsx — multiple buttons share the same accessible name**
- **Found during:** Task 1 — the mode-switcher tab ("Sign in") and the form submit button both render as `<button>Sign in</button>`
- **Issue:** `getByRole("button", { name: /^sign in$/i })` throws "Found multiple elements"
- **Fix:** Tests use `getAllByRole(...)` then `.find((b) => b.getAttribute("type") === "submit")` to select the form submit button; same pattern applied for "Create account" in create-account mode
- **Files modified:** `src/routes/auth-page.test.tsx`
- **Commit:** 415161c

**3. [Rule 1 - Bug] auth-page.test.tsx — labels lack htmlFor so getByLabelText fails**
- **Found during:** Task 1 — auth-page.tsx uses `<label>` elements without `htmlFor` attributes, so the React Testing Library `getByLabelText` query finds no associated input
- **Fix:** Replaced `getByLabelText` with `getByPlaceholderText` (e.g., `you@example.com`, `8 characters minimum`, `••••••••`) which reliably targets the correct input elements
- **Files modified:** `src/routes/auth-page.test.tsx`
- **Commit:** 415161c

## Known Stubs

None — all test files test real production modules. The E2E tests run against real Netlify + Supabase infrastructure. The unit tests mock only the Supabase client and auth-state context, which are stable integration seams.

## Threat Flags

None — this plan adds test files only. No new network endpoints, auth paths, or schema changes were introduced.

## Self-Check: PASSED

Files created/modified verified present on disk:
- src/components/auth/ProtectedRoute.test.tsx — FOUND
- src/lib/auth/validation.test.ts — FOUND
- src/routes/auth-page.test.tsx — FOUND
- tests/e2e/auth-flow.spec.ts — FOUND
- tests/e2e/ping-smoke.spec.ts — FOUND (modified)
- scripts/dev/verify-phase2-auth.sh — FOUND
- vitest.config.ts — FOUND (modified)

Commits verified:
- 415161c (Task 1 unit tests) — FOUND
- 77c5b4f (Task 2 E2E tests) — FOUND
- 1d89de9 (Task 3 verification script) — FOUND
