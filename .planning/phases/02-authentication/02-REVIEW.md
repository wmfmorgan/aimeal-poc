---
phase: 02-authentication
reviewed: 2026-04-19T00:00:00Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - .env.example
  - src/vite-env.d.ts
  - src/lib/config/public-env.ts
  - src/lib/supabase/client.ts
  - src/lib/auth/auth-state.tsx
  - src/components/auth/ProtectedRoute.tsx
  - src/components/auth/AuthRoute.tsx
  - src/app/providers.tsx
  - src/app/router.tsx
  - src/lib/auth/auth-copy.ts
  - src/lib/auth/validation.ts
  - src/routes/auth-page.tsx
  - src/app/layout/AppFrame.tsx
  - supabase/config.toml
  - src/components/auth/ProtectedRoute.test.tsx
  - src/lib/auth/validation.test.ts
  - src/routes/auth-page.test.tsx
  - tests/e2e/auth-flow.spec.ts
  - scripts/dev/verify-phase2-auth.sh
  - tests/e2e/ping-smoke.spec.ts
  - vitest.config.ts
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-19T00:00:00Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

The Phase 2 authentication implementation is generally well-structured. The route-guard pair (`ProtectedRoute` / `AuthRoute`), single Supabase client, fail-fast env validation, and centralized copy strings are all sound patterns. Test coverage is thorough across unit, component, and E2E layers.

Four warnings are raised — none are security issues, but two can cause silent user-facing bugs (premature navigation on sign-up and unhandled `signOut` errors), one introduces a timing-sensitive `setTimeout` in production flow, and one is a Supabase config mismatch that could silently weaken password policy. Four informational items cover minor logic duplication, a revalidation edge case, a hardcoded fallback URL, and a missing `aria-label` pattern.

---

## Warnings

### WR-01: `handleCreateAccount` navigates immediately without waiting for email confirmation

**File:** `src/routes/auth-page.tsx:205-213`
**Issue:** `supabase.auth.signUp` on a Supabase project with `enable_confirmations = false` (the current local config) returns `{ error: null }` immediately, but on a production project where email confirmation **is** enabled the call also returns `{ error: null }` — the user is created but `session` is `null` until they confirm. The code calls `navigate("/household")` unconditionally on `error === null`, so an unconfirmed user is sent to a protected route they cannot actually access, causing an immediate redirect loop back to `/auth` with no feedback.

```ts
// Current (auth-page.tsx:205-213)
const { error } = await supabase.auth.signUp({ email, password });
if (error) {
  setSubmitError(AUTH_COPY.genericError);
} else {
  navigate("/household");   // session may be null if confirmation required
}

// Fix: check data.session before navigating
const { data, error } = await supabase.auth.signUp({ email, password });
if (error) {
  setSubmitError(AUTH_COPY.genericError);
} else if (data.session) {
  navigate("/household");
} else {
  // Email confirmation required
  setSubmitSuccess("Check your inbox to confirm your account before signing in.");
}
```

---

### WR-02: `signOut` errors are silently swallowed in `AppFrame`

**File:** `src/app/layout/AppFrame.tsx:16-19`
**Issue:** `handleSignOut` awaits `signOut()`, which itself calls `supabase.auth.signOut()` but never checks or surfaces its error. If the Supabase call fails (e.g. network timeout), `navigate("/auth")` still runs and the user appears signed out in the UI while the Supabase session token may still be valid on the server, creating an inconsistent state.

```ts
// Current (AppFrame.tsx:16-19)
async function handleSignOut() {
  await signOut();
  navigate("/auth");
}

// Fix: propagate errors from auth-state.tsx signOut and handle in the component
// In auth-state.tsx:
async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  // onAuthStateChange sets session to null on success
}

// In AppFrame.tsx:
async function handleSignOut() {
  try {
    await signOut();
    navigate("/auth");
  } catch {
    // Show a toast or set a local error state — do not navigate on failure
  }
}
```

---

### WR-03: `setTimeout` used to drive a navigation flow after password reset

**File:** `src/routes/auth-page.tsx:267`
**Issue:** After a successful password reset, the code uses `setTimeout(() => switchMode("sign-in"), 2500)`. This timer is not cancelled if the component unmounts (e.g. the user manually navigates away) before the 2.5 s elapses, causing a state update on an unmounted component and a potential React warning (or, with strict-mode, a double-fire).

```ts
// Current (auth-page.tsx:264-268)
setSubmitSuccess(AUTH_COPY.passwordUpdated);
window.history.replaceState(null, "", window.location.pathname);
setTimeout(() => switchMode("sign-in"), 2500);

// Fix: use useEffect with a cleanup to cancel the timer
// After the success, set a flag and handle the transition in a useEffect:
const [redirectToSignIn, setRedirectToSignIn] = useState(false);

// On success:
setSubmitSuccess(AUTH_COPY.passwordUpdated);
window.history.replaceState(null, "", window.location.pathname);
setRedirectToSignIn(true);

// In a useEffect:
useEffect(() => {
  if (!redirectToSignIn) return;
  const id = setTimeout(() => {
    switchMode("sign-in");
    setRedirectToSignIn(false);
  }, 2500);
  return () => clearTimeout(id);
}, [redirectToSignIn]);
```

---

### WR-04: Supabase local `minimum_password_length = 6` is weaker than frontend validation

**File:** `supabase/config.toml:175`
**Issue:** The frontend enforces a minimum of 8 characters (`validatePassword`), but the local Supabase config sets `minimum_password_length = 6`. This means:
1. A user who bypasses the frontend (e.g. direct API call) can set a 6- or 7-character password that the app will then fail to validate on the sign-in form, surfacing a confusing "Password must be at least 8 characters" error when the password is actually valid on the server.
2. If the production project is also configured with `minimum_password_length = 6`, this is a policy inconsistency.

```toml
# Fix: align to the frontend minimum
minimum_password_length = 8
```

---

## Info

### IN-01: `revalidateOnBlur` always uses `validateSignIn` for email re-validation, ignoring mode

**File:** `src/routes/auth-page.tsx:149`
**Issue:** In `revalidateOnBlur`, the `email` branch always calls `validateSignIn(email, password).email` regardless of the current mode. In practice all modes use the same `validateEmail` function under the hood, so this produces correct results today. However, if sign-in ever gains mode-specific email rules (e.g. domain restrictions), this will silently apply the wrong validator.

**Fix:** Use the mode-appropriate validator:
```ts
if (field === "email") {
  const err =
    mode === "sign-in"
      ? validateSignIn(email, password).email
      : mode === "create-account"
        ? validateCreateAccount(email, password).email
        : validateResetRequest(email).email;
  errors = { ...errors, email: err };
}
```

---

### IN-02: Hardcoded fallback URL in `handleResetRequest`

**File:** `src/routes/auth-page.tsx:229-232`
**Issue:** The fallback URL `"http://127.0.0.1:8888/auth"` is hardcoded for the case where `window` is undefined. In a Vite/React browser-only app `window` is always defined at runtime, so this branch is dead code — but if the fallback is ever reached (e.g. SSR), it would send reset emails pointing to a localhost address.

**Fix:** Remove the dead branch; if SSR support is added later, derive the URL from a config constant:
```ts
const redirectTo = `${window.location.origin}/auth`;
```

---

### IN-03: `auth-page.tsx` heading shows "Reset password" for both `reset-request` and `reset-complete` modes

**File:** `src/routes/auth-page.tsx:313-316`
**Issue:** Both `reset-request` and `reset-complete` render `AUTH_COPY.modeResetPassword` ("Reset password") as the heading, making it harder for users to distinguish which step they are on. This is a minor UX concern, not a logic bug.

**Fix:** Add a distinct copy key for the completion step:
```ts
// In auth-copy.ts:
modeResetComplete: "Set new password",

// In auth-page.tsx:
: mode === "reset-complete"
  ? AUTH_COPY.modeResetComplete
  : AUTH_COPY.modeResetPassword
```

---

### IN-04: Form `<label>` elements are not associated with their `<input>` via `htmlFor` / `id`

**File:** `src/routes/auth-page.tsx:362-374`, `379-392`, and equivalent blocks for other modes
**Issue:** All `<label>` elements use `block` styling but lack a `htmlFor` attribute, and the corresponding `<input>` elements lack matching `id` attributes. This means screen readers cannot programmatically associate the label with its field, and clicking the label text does not focus the input.

**Fix:** Add matching `htmlFor` / `id` pairs. Example for the sign-in email field:
```tsx
<label htmlFor="signin-email" className="block text-sm font-semibold ...">
  {AUTH_COPY.fieldEmail}
</label>
<input
  id="signin-email"
  type="email"
  ...
/>
```

---

_Reviewed: 2026-04-19T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
