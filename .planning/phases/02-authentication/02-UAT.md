---
status: complete
phase: 02-authentication
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md]
started: 2026-04-19T20:26:00Z
updated: 2026-04-19T21:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Protected Route Guard
expected: Visit http://127.0.0.1:8888/ while signed out. You should be immediately redirected to /auth — no flash of content, no errors. Same for /household and /plan/anything.
result: pass
note: "Required setup fixes: created .env.local (missing env vars caused blank page), removed erroneous SPA fallback from netlify.toml (broke JS module loading). Redirects working after restart."

### 2. Auth Route Inverse Guard
expected: While signed in, navigate directly to /auth. You should be immediately redirected to /household — not shown the login form.
result: pass

### 3. Sign-in Mode (default)
expected: Open /auth while signed out. The page shows a sign-in form with Email and Password fields, a "Sign in" submit button, a "Forgot password?" link, and a mode switcher to switch to "Create account". No errors shown before interaction.
result: pass

### 4. Create Account Mode Switch
expected: On /auth, click the "Create account" mode switcher. The form switches in-place (no page navigation) to a create-account form. Clicking back to "Sign in" returns to the sign-in form.
result: pass

### 5. Sign Up Flow
expected: Switch to create-account mode, fill in a new email and a valid password (8+ chars), submit. You should land on /household with no errors.
result: pass

### 6. Sign In Flow
expected: Sign out first. Return to /auth, fill in credentials of an existing account, submit. You should land on /household.
result: pass

### 7. Session Persistence
expected: Sign in and land on /household. Close the browser tab entirely and reopen http://127.0.0.1:8888/. You should land on /household (still signed in) without needing to log in again.
result: pass
note: "Initially failed (missing .env.local meant Supabase client had no URL/key). Resolved after .env.local created."

### 8. Connectivity Proof on /auth
expected: While signed out on /auth, there is a visible API status badge (e.g. "API Connected" or similar) somewhere on the page — proof that the Netlify → Supabase ping path still works from the signed-out surface.
result: pass

### 9. Password Reset Request
expected: On /auth, click "Forgot password?". A reset-request form appears in-place (still on /auth, no new route). Enter a valid email and submit. You should see a confirmation message that a reset email was sent.
result: pass

### 10. In-App Password Reset Completion
expected: Using Inbucket at http://127.0.0.1:54334, find the reset email and click the link. The app should reopen /auth in a reset-complete mode showing a new-password form (not a Supabase hosted page). Filling in a new password and submitting should complete the reset and return you to sign-in mode.
result: pass
note: "Fixed: detectSessionInUrl cleared hash before React mounted. Replaced hash check with onAuthStateChange PASSWORD_RECOVERY event. AuthRoute now holds recovery sessions on /auth via isPasswordRecovery flag."

### 11. Shell Logout
expected: While signed in on /household (or any protected page), a "Sign out" button is visible in the header/AppFrame outside the main nav. Clicking it clears the session and redirects to /auth.
result: pass

### 12. Validation Errors
expected: On the sign-in form, click submit with empty fields. Field-level error messages appear (e.g. "Email is required", "Password is required") — no crash, no redirect.
result: pass

## Summary

total: 12
passed: 12
issues: 0
skipped: 0
blocked: 0
pending: 0

## Gaps

[none — all issues resolved]
