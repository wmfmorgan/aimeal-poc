---
phase: 3
slug: household-setup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npm run test:unit -- --run` |
| **Full suite command** | `npm run test:unit -- --run && npm run test:e2e` |
| **Estimated runtime** | ~15 seconds (unit), ~60 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit -- --run`
- **After every plan wave:** Run `npm run test:unit -- --run && npm run test:e2e`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds (unit)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | HSHD-01 | — | N/A | unit stub | `npm run test:unit -- --run src/lib/household/validation.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 0 | HSHD-01–05 | — | N/A | e2e stub | `npm run test:e2e -- tests/e2e/household-setup.spec.ts` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | HSHD-01 | T-3-01 | `validateHouseholdName` rejects empty | unit | `npm run test:unit -- --run src/lib/household/validation.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 1 | HSHD-02 | T-3-01 | `validateMemberName` rejects empty; save with 0 members fails | unit | `npm run test:unit -- --run src/lib/household/validation.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-03 | 02 | 1 | HSHD-03 | T-3-02 | Big 9 chip toggle adds/removes from allergies array | unit | `npm run test:unit -- --run src/lib/household/validation.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-04 | 02 | 1 | HSHD-04 | — | Appliance chip toggle adds/removes | unit | `npm run test:unit -- --run src/lib/household/validation.test.ts` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 2 | HSHD-01–05 | T-3-01/02 | Full create: fill → save → in DB → nudge hidden | E2E | `npm run test:e2e -- tests/e2e/household-setup.spec.ts` | ❌ W0 | ⬜ pending |
| 3-03-02 | 03 | 2 | HSHD-05 | — | Edit flow: revisit → pre-filled → change → save → updated | E2E | `npm run test:e2e -- tests/e2e/household-setup.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/household/types.ts` — `MemberDraft`, `HouseholdDraft`, `BIG_9_ALLERGENS`, `DIET_TYPES`, `APPLIANCE_PRESETS` constants
- [ ] `src/lib/household/validation.ts` — `validateHouseholdName`, `validateMemberName`, `validateAtLeastOneMember`, `validateFreeformTag`
- [ ] `src/lib/household/validation.test.ts` — unit stubs covering all HSHD-01 through HSHD-04 validation behaviors
- [ ] `tests/e2e/household-setup.spec.ts` — E2E stubs for create, edit, revisit flows against `netlify dev` stack

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Welcome nudge hidden after household exists | HSHD-01 | Requires live DB state (household row present) | 1. Create household. 2. Refresh /household. 3. Confirm nudge is not visible. |
| Success banner appears in-place after save | HSHD-01 | Visual assertion | 1. Fill form. 2. Click Save. 3. Confirm banner "Household saved…" visible without redirect. |
| Member expanded inline (no modal) | HSHD-03 | DOM layout assertion | 1. Add member. 2. Click Edit Member. 3. Confirm row expands in-place. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
