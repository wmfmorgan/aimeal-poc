---
phase: 02-authentication
fixed_at: 2026-04-20T01:22:16Z
review_path: .planning/phases/02-authentication/02-REVIEW.md
iteration: 1
fix_scope: critical_warning
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-04-20T01:22:16Z
**Source review:** .planning/phases/02-authentication/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (0 Critical, 4 Warning)
- Fixed: 4
- Skipped: 0

---

## Fixed Issues

### WR-01: `handleCreateAccount` navigates immediately without waiting for email confirmation

**Files modified:** `src/routes/auth-page.tsx`
**Commit:** d3f35c3
**Applied fix:** Destructured `data` from `supabase.auth.signUp` return value. Now navigates to `/household` only when `data.session` is truthy (immediate sign-in). When session is null (email confirmation required), shows "Check your inbox to confirm your account before signing in." success message instead of triggering a redirect loop.

---

### WR-02: `signOut` errors are silently swallowed in `AppFrame`

**Files modified:** `src/lib/auth/auth-state.tsx`, `src/app/layout/AppFrame.tsx`
**Commit:** 3ce23a7
**Applied fix:** In `auth-state.tsx`, the `signOut` function now checks the Supabase error and throws it rather than swallowing it. In `AppFrame.tsx`, `handleSignOut` wraps the call in try/catch: navigates to `/auth` only on success, and on failure sets local `signOutError` state to display a "Sign-out failed. Please try again." message without navigating.

---

### WR-03: `setTimeout` used to drive a navigation flow after password reset

**Files modified:** `src/routes/auth-page.tsx`
**Commit:** d3f35c3
**Applied fix:** Replaced the bare `setTimeout(() => switchMode("sign-in"), 2500)` call with a `redirectToSignIn` boolean state variable. A `useEffect` watches that flag and sets up the timer with a `clearTimeout` cleanup function in its return, ensuring the timer is cancelled if the component unmounts before the 2.5 s elapses.

---

### WR-04: Supabase local `minimum_password_length = 6` is weaker than frontend validation

**Files modified:** `supabase/config.toml`
**Commit:** 941593b
**Applied fix:** Changed `minimum_password_length` from `6` to `8` in `supabase/config.toml` to match the frontend `validatePassword` rule, eliminating the server/client policy mismatch.

---

_Fixed: 2026-04-20T01:22:16Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
