---
phase: 9
slug: compact-meal-card-refactor
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-23
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 + @testing-library/react 16.3.2 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run src/components/generation/ src/routes/plan-page.test.tsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/components/generation/ src/routes/plan-page.test.tsx`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green (155+ tests)
- **Max feedback latency:** ~8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | CARD-02 | — | N/A | unit | `npx vitest run src/components/generation/generation-components.test.tsx` | ✅ | ⬜ pending |
| 9-01-02 | 01 | 1 | CARD-03 | — | N/A | unit | `npx vitest run src/components/generation/generation-components.test.tsx` | ✅ | ⬜ pending |
| 9-01-03 | 01 | 1 | CARD-04 | — | N/A | unit | `npx vitest run src/routes/plan-page.test.tsx` | ✅ | ⬜ pending |
| 9-01-04 | 01 | 1 | CARD-05 | — | aria-label on icon buttons | unit | `npx vitest run src/components/generation/meal-plan-management.test.tsx` | ✅ | ⬜ pending |
| 9-02-01 | 02 | 1 | CARD-01 | — | N/A | unit | `npx vitest run src/components/generation/meal-plan-management.test.tsx` | ✅ | ⬜ pending |
| 9-03-01 | 03 | 2 | CARD-04 | — | N/A | unit | `npx vitest run src/routes/plan-page.test.tsx` | ✅ | ⬜ pending |
| 9-04-01 | 04 | 2 | CARD-01–05 | — | N/A | unit | `npx vitest run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files need to be created from scratch. Wave 0 work is in-file assertion updates to existing tests:

- `src/components/generation/generation-components.test.tsx` — remove stale text assertions (`"dinner"`, description text); add compact-card and no-`View details` assertions
- `src/components/generation/meal-plan-management.test.tsx` — add card-click vs icon-click propagation tests
- `src/routes/plan-page.test.tsx` — add card `onClick` → flyout open test
- `src/components/generation/meal-detail-flyout.test.tsx` — update focus-trap test if star button added; add favorite affordance test

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Card visual density feels genuinely compact (not just smaller spacing) | CARD-02 | Subjective visual judgment | Load plan page with 7-day grid, verify cards feel scan-friendly vs current design |
| Delete icon in top-right always visible (not hover-only) | CARD-05 | CSS visibility state | Inspect card at rest — delete icon must be visible without hover |
| Tooltip appears on icon hover | CARD-05 | Browser tooltip interaction | Hover delete and regenerate icons — tooltips must appear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
