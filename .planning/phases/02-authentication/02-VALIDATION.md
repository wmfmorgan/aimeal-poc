---
phase: 02
slug: authentication
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-19
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x (unit) + Playwright (E2E) |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` |
| **Quick run command** | `npm run test:unit -- --run src/components/auth/ProtectedRoute.test.tsx src/lib/auth/validation.test.ts src/routes/auth-page.test.tsx` |
| **Full suite command** | `bash scripts/dev/verify-phase2-auth.sh` |
| **Estimated runtime** | ~1s (unit) / ~3–5 min (full with E2E) |

---

## Sampling Rate

- **After every task commit:** Run quick unit command above
- **After every plan wave:** Run `bash scripts/dev/verify-phase2-auth.sh`
- **Before `/gsd-verify-work`:** Full suite must be green (requires live Supabase + Netlify dev)
- **Max feedback latency:** ~1s (unit) / ~5 min (E2E)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | AUTH-02, AUTH-03 | — | Session persists across browser restarts; Supabase client not scattered | unit | `npm run test:unit -- --run src/components/auth/ProtectedRoute.test.tsx` | ✅ | ✅ green |
| 02-01-02 | 01 | 1 | AUTH-03 | — | Unauthenticated users redirected to /auth; authenticated users on /auth sent to /household | unit | `npm run test:unit -- --run src/components/auth/ProtectedRoute.test.tsx` | ✅ | ✅ green |
| 02-02-01 | 02 | 2 | AUTH-01, AUTH-04 | — | Sign-in/sign-up modes reachable from single /auth surface; validation errors surfaced | unit | `npm run test:unit -- --run src/routes/auth-page.test.tsx src/lib/auth/validation.test.ts` | ✅ | ✅ green |
| 02-02-02 | 02 | 2 | AUTH-01, AUTH-04 | — | Password reset stays in-app; shell logout returns to /auth | unit | `npm run test:unit -- --run src/routes/auth-page.test.tsx` | ✅ | ✅ green |
| 02-03-01 | 03 | 3 | AUTH-01, AUTH-02, AUTH-03, AUTH-04 | — | Guard decisions, validation rules, and auth-page state transitions covered | unit | `npm run test:unit -- --run src/components/auth/ProtectedRoute.test.tsx src/lib/auth/validation.test.ts src/routes/auth-page.test.tsx` | ✅ | ✅ green |
| 02-03-02 | 03 | 3 | AUTH-01, AUTH-02, AUTH-03, AUTH-04 | — | Sign-up, login persistence, logout, protected-route redirect, in-app password reset all verified in browser | e2e | `npm run test:e2e -- --project=chromium --grep 'auth flow\|ping smoke'` | ✅ | ⚠️ infra-dependent |
| 02-03-03 | 03 | 3 | AUTH-01, AUTH-02, AUTH-03, AUTH-04 | — | Single-command full-stack verification including build gate | script | `bash scripts/dev/verify-phase2-auth.sh` | ✅ | ⚠️ infra-dependent |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky/infra-dependent*

---

## Wave 0 Requirements

Existing infrastructure covered all phase requirements. No Wave 0 stub installation needed — Vitest and Playwright were already present from Phase 1.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| E2E auth flows (sign-up, login persistence, logout, password reset) | AUTH-01, AUTH-02, AUTH-04 | Requires live local Supabase + Netlify dev + Inbucket — cannot run in isolation | `supabase start && netlify dev --port 8888` in separate terminal, then `npm run test:e2e -- --project=chromium --grep 'auth flow'` |
| Signed-out / redirect smoke | AUTH-03 | Same infra dependency as above | `npm run test:e2e -- --project=chromium --grep 'ping smoke'` with Netlify running |

---

## Validation Audit 2026-04-19

| Metric | Count |
|--------|-------|
| Requirements audited | 4 (AUTH-01, AUTH-02, AUTH-03, AUTH-04) |
| Tasks audited | 7 (across 3 plans) |
| Unit tests | 50 passing |
| Gaps found | 0 (all requirements have test coverage) |
| COVERED | 5 tasks (unit-verified inline) |
| PARTIAL / infra-dependent | 2 tasks (E2E — test files exist, infra required) |
| MISSING | 0 |

---

## Validation Sign-Off

- [x] All tasks have automated verify command or manual-only justification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0: not needed — framework pre-installed
- [x] No watch-mode flags
- [x] Feedback latency < 2s (unit suite)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-19
