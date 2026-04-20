---
phase: 3
slug: household-setup
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-20
updated: 2026-04-20
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 + Playwright 1.56.1 |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm run test:unit -- --run` |
| **Phase e2e command** | `npm run test:e2e -- tests/e2e/household-setup.spec.ts` |
| **Live app target** | `http://127.0.0.1:8888` |
| **Estimated runtime** | ~1s unit, ~33s household e2e |

---

## Sampling Rate

- **After household validation/helper changes:** `npm run test:unit -- --run`
- **After household route or persistence changes:** `npm run test:e2e -- tests/e2e/household-setup.spec.ts`
- **Before `/gsd-verify-work`:** unit + phase e2e should be green when environment permits
- **Manual backstop:** `03-UAT.md` is the authoritative human verification record for the user-facing flow

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | HSHD-01 | — | Household domain contracts and validation helpers exist | unit | `npm run test:unit -- --run src/lib/household/validation.test.ts` | ✅ | ✅ green |
| 3-01-02 | 01 | 0 | HSHD-01–05 | — | Household e2e file exists and is implemented | e2e | `npm run test:e2e -- tests/e2e/household-setup.spec.ts` | ✅ | ✅ green |
| 3-02-01 | 02 | 1 | HSHD-01 | T-3-01 | Household name validation rejects empty values | unit | `npm run test:unit -- --run src/lib/household/validation.test.ts` | ✅ | ✅ green |
| 3-02-02 | 02 | 1 | HSHD-02 | T-3-01 | Member validation rejects empty values; empty save shows validation errors | unit + e2e | `npm run test:unit -- --run src/lib/household/validation.test.ts` | ✅ | ✅ green |
| 3-02-03 | 02 | 1 | HSHD-03 | T-3-02 | Chip toggle helper adds/removes allergy selections deterministically | unit | `npm run test:unit -- --run src/lib/household/validation.test.ts` | ✅ | ✅ green |
| 3-02-04 | 02 | 1 | HSHD-04 | — | Appliance selections use the same toggle helper pattern as allergens | unit + e2e | `npm run test:e2e -- tests/e2e/household-setup.spec.ts` | ✅ | ✅ green |
| 3-03-01 | 03 | 2 | HSHD-01–05 | T-3-01/T-3-02 | Create flow saves and keeps user on `/household` | e2e + UAT | `npm run test:e2e -- tests/e2e/household-setup.spec.ts` | ✅ | ✅ green |
| 3-03-02 | 03 | 2 | HSHD-05 | — | Revisit flow pre-fills saved form and hides the first-time nudge | e2e + UAT | `npm run test:e2e -- tests/e2e/household-setup.spec.ts` | ✅ | ✅ green |
| 3-04-01 | 04 | 3 | HSHD-01–05 | — | Household e2e assertions cover create, revisit, and member management flows | e2e | `npm run test:e2e -- tests/e2e/household-setup.spec.ts` | ✅ | ✅ green |
| 3-UAT-01 | UAT | human | HSHD-01–05 | — | User-observable create/edit/member flows manually verified | manual | `03-UAT.md` | ✅ | ✅ green |

*Status: ✅ green · ⚠️ partial · ❌ red*

---

## Wave 0 Requirements

- [x] `src/lib/household/types.ts` exists and exports household constants/types
- [x] `src/lib/household/validation.ts` exists and exports validation/tag/chip helpers
- [x] `src/lib/household/validation.test.ts` exists and passes
- [x] `tests/e2e/household-setup.spec.ts` exists and is implemented

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Evidence |
|----------|-------------|------------|----------|
| Member expanded inline with no modal | HSHD-03 | Layout/interaction quality is best confirmed by human review even though functional behavior is automated | `03-UAT.md` test 3 passed |

---

## Open Validation Gaps

None.

---

## Validation Audit 2026-04-20

| Metric | Count |
|--------|-------|
| Gaps found | 2 |
| Resolved | 2 |
| Escalated to manual-only / follow-up | 0 |

### Evidence

- `npm run test:unit -- --run` → **PASS** (`73` tests, `6` files)
- `npm run test:e2e -- tests/e2e/household-setup.spec.ts` → **PASS**
  - Passed: `create flow saves a new household and keeps the user on /household`
  - Passed: `save with no household name or members shows validation and skips persistence`
  - Passed: `revisiting /household pre-fills the saved form and hides the welcome nudge`
  - Passed: `member management supports expand, edit, and inline delete confirmation`
- `03-UAT.md` → **PASS** (`7/7` manual checkpoints)

### Resolved Validation Issues

- The save-path e2e failures were caused by the household page clearing success state during post-save rehydration. Removing the `setSubmitSuccess(null)` reset from the hydration effect fixed the automated create/revisit/member-management save assertions.
- The member-delete e2e timeout was caused by a brittle index-based selector (`nth(1)`) for the confirm action. Scoping the confirm click to the visible inline confirmation prompt fixed the test.

---

## Validation Sign-Off

- [x] Test infrastructure detected and exercised
- [x] Wave 0 artifacts are complete
- [x] Unit coverage for household validation is green
- [x] All phase requirements have passing automated verification
- [x] Manual UAT backstop exists for the user-visible flow
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified 2026-04-20
