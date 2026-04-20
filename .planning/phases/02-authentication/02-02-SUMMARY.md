---
phase: 02-authentication
plan: "02"
subsystem: frontend-auth
tags: [auth, supabase, react, password-reset, logout, tailwind]
dependency_graph:
  requires: [02-01]
  provides: [auth-page-ui, password-reset-flow, shell-logout, redirect-config]
  affects: [src/routes/auth-page.tsx, src/app/layout/AppFrame.tsx, supabase/config.toml]
tech_stack:
  added: []
  patterns: [mode-switched-auth-surface, in-app-password-reset, shell-logout, connectivity-proof]
key_files:
  created:
    - src/lib/auth/auth-copy.ts
    - src/lib/auth/validation.ts
  modified:
    - src/routes/auth-page.tsx
    - src/app/layout/AppFrame.tsx
    - supabase/config.toml
decisions:
  - "Reset-complete mode detection uses window.location.hash inspection on mount (type=recovery present in Supabase redirect hash); this keeps the detection entirely in auth-page.tsx without adding auth-state surface"
  - "supabase/config.toml site_url changed from 127.0.0.1:3000 to 127.0.0.1:8888 so Netlify dev is the canonical local origin for auth email redirects"
  - "additional_redirect_urls includes both the root and /auth path at port 8888 to cover Supabase's strict exact-match URL allowlist for email redirects"
  - "Sign out button added to AppFrame only when isAuthenticated is true to avoid rendering a non-functional action on the auth page itself"
metrics:
  duration: "2m 27s"
  completed: "2026-04-20"
  tasks_completed: 2
  files_changed: 5
---

# Phase 2 Plan 02: Auth Page, Password Reset, and Shell Logout Summary

Single-route auth surface with sign-in, create-account, password reset (two-step), shell logout, and Netlify-aligned local redirect config.

## What Was Built

### Task 1 — Real single-route auth page replacing the Phase 1 placeholder

Replaced the placeholder `src/routes/auth-page.tsx` with the real Phase 2 auth surface:

1. `src/lib/auth/auth-copy.ts` — All UI copy strings in one place (eyebrow, mode labels, CTA text, loading states, error messages, success confirmations). Prevents ad hoc copy from spreading through JSX.

2. `src/lib/auth/validation.ts` — Field validation helpers (`validateEmail`, `validatePassword`, `validatePasswordConfirm`) plus per-mode validation functions (`validateSignIn`, `validateCreateAccount`, `validateResetRequest`, `validateResetComplete`) and `hasErrors` utility. All error interfaces extend `Record<string, string | undefined>` so they work with the generic `fieldErrors` state map.

3. `src/routes/auth-page.tsx` — Complete mode-switched auth surface:
   - **Four modes:** `sign-in` (default), `create-account`, `reset-request`, `reset-complete`
   - **Mode switcher:** Adjacent pill segmented control for sign-in / create-account per 02-UI-SPEC.md; reset modes entered contextually via "Forgot password?" link
   - **Recovery detection:** On mount, inspects `window.location.hash` for `type=recovery` and switches to `reset-complete` mode automatically
   - **Connectivity proof:** `ConnectivityProof` component reuses `usePingStatus` hook to show a live Netlify → Supabase API status badge on the signed-out `/auth` surface, preserving the browser-level smoke path after `/` became protected
   - **Success navigation:** `navigate('/household')` on sign-in and sign-up (D-04/D-05)
   - **Validation UX:** Validates on submit, re-validates on blur after first submit attempt; no errors shown before first interaction
   - **In-flight states:** Submit button disabled and shows loading copy while request is in flight; field values preserved on recoverable errors

### Task 2 — Password reset completion, shell logout, and redirect config

1. `supabase/config.toml` — Updated to align with Netlify dev local flow:
   - `site_url` changed from `http://127.0.0.1:3000` to `http://127.0.0.1:8888` (Netlify dev port)
   - `additional_redirect_urls` now includes `http://127.0.0.1:8888/auth` and related variants so Supabase's strict exact-match URL allowlist passes the reset email redirect back into the in-app recovery form

2. `src/routes/auth-page.tsx` (reset modes, already in Task 1):
   - **reset-request:** `supabase.auth.resetPasswordForEmail(email, { redirectTo })` where `redirectTo` is derived from `window.location.origin + '/auth'` at runtime (falls back to `http://127.0.0.1:8888/auth`)
   - **reset-complete:** `supabase.auth.updateUser({ password })` after collecting new password + confirm; clears recovery hash from URL; shows success message then switches back to sign-in mode after 2.5s

3. `src/app/layout/AppFrame.tsx` — Added quiet far-right sign-out utility:
   - Imports `useAuth` from auth-state.tsx to access `isAuthenticated` and `signOut`
   - "Sign out" button rendered only when `isAuthenticated` is true (outside primary nav pill list)
   - Calls `signOut()` then `navigate('/auth')` — uses shared auth-state signOut path (D-11)
   - Removed "Auth" nav item from primary navigation (auth is a signed-out-only surface)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript index signature missing from error interfaces**
- **Found during:** Task 1 build
- **Issue:** Error interfaces (`SignInErrors`, `CreateAccountErrors`, etc.) were not assignable to `Record<string, string | undefined>` used as generic `fieldErrors` state type, causing TS2345 errors
- **Fix:** Added `extends Record<string, string | undefined>` to all error interfaces in `validation.ts`
- **Files modified:** `src/lib/auth/validation.ts`
- **Commit:** 2514967

## Known Stubs

None — all form handlers call real Supabase auth methods. The `reset-complete` mode is wired to `supabase.auth.updateUser`. The connectivity proof calls the real ping endpoint via `usePingStatus`.

## Threat Flags

None — no new network endpoints introduced. The auth page calls Supabase Auth via the existing browser client (proxied through Netlify). No new trust boundaries created.

## Self-Check: PASSED

Files verified present:
- src/routes/auth-page.tsx — FOUND
- src/lib/auth/auth-copy.ts — FOUND
- src/lib/auth/validation.ts — FOUND
- src/app/layout/AppFrame.tsx — FOUND
- supabase/config.toml — FOUND

Commits verified:
- 2514967 (Task 1) — FOUND
- d4bd55d (Task 2) — FOUND
