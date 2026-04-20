---
phase: 01
slug: frontend-scaffold-and-local-dev
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-20T00:12:34Z
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + Playwright |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm run test:unit -- --run` |
| **Full suite command** | `bash scripts/dev/verify-phase1-stack.sh` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit -- --run`
- **After every plan wave:** Run `bash scripts/dev/verify-phase1-stack.sh`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | DEPL-01 | — | Frontend package and Vite/Tailwind workspace build cleanly from repo root. | build | `npm run build` | ✅ | ✅ green |
| 01-01-02 | 01 | 1 | DEPL-01, DEPL-02 | T-01-01, T-01-02 | Netlify stays on `8888`, targets Vite on `5173`, proxies the expected Supabase paths, and the checked-in serve helper loads `supabase/functions/.env`. | unit contract | `npm run test:unit -- --run` | ✅ (`src/local-dev-contract.test.ts`) | ✅ green |
| 01-01-03 | 01 | 1 | DEPL-01 | — | Editorial shell assets load the locked fonts and theme tokens without breaking the app build. | build | `npm run build` | ✅ | ✅ green |
| 01-02-01 | 02 | 2 | DEPL-01 | T-01-03 | Router boots all four Phase 1 routes inside the shared shell without guards or runtime errors. | e2e smoke | `bash scripts/dev/verify-phase1-stack.sh` | ✅ (`tests/e2e/ping-smoke.spec.ts`) | ✅ green |
| 01-02-02 | 02 | 2 | DEPL-01 | T-01-01 | Frontend tRPC client remains on the Netlify proxy path and the ping status mapper surfaces success and failure states correctly. | unit | `npm run test:unit -- --run` | ✅ (`src/hooks/use-ping-status.test.ts`) | ✅ green |
| 01-02-03 | 02 | 2 | DEPL-01 | T-01-02 | Home route shows the visible connectivity badge driven by the live Netlify-routed ping path. | e2e smoke | `bash scripts/dev/verify-phase1-stack.sh` | ✅ (`tests/e2e/ping-smoke.spec.ts`) | ✅ green |
| 01-03-01 | 03 | 3 | DEPL-01 | T-01-01 | Phase 1 unit test harness executes quickly and covers the ping-path contract. | unit | `npm run test:unit -- --run` | ✅ (`vitest.config.ts`, `src/hooks/use-ping-status.test.ts`) | ✅ green |
| 01-03-02 | 03 | 3 | DEPL-01 | T-01-02 | Netlify-served app reaches the connected badge through the existing edge function. | e2e smoke | `bash scripts/dev/verify-phase1-stack.sh` | ✅ (`playwright.config.ts`, `tests/e2e/ping-smoke.spec.ts`) | ✅ green |
| 01-03-03 | 03 | 3 | DEPL-01, DEPL-02 | T-01-01, T-01-02 | Clean-terminal verification proves build, unit coverage, local service startup, Netlify boot, and browser smoke in one command. | integration | `bash scripts/dev/verify-phase1-stack.sh` | ✅ (`scripts/dev/verify-phase1-stack.sh`) | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-19
