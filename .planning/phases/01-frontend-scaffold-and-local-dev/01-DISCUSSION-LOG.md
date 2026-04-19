# Phase 1: Frontend Scaffold & Local Dev - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-19
**Phase:** 1-frontend-scaffold-and-local-dev
**Areas discussed:** Route scaffold scope, Design system depth, Ping test surface

---

## Route Scaffold Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full stub structure | All 4 routes (/, /auth, /household, /plan/:id) as empty placeholder pages | ✓ |
| Bare minimum | Single / route for ping demo only | |
| / and /auth only | Scaffold landing + auth, defer /household and /plan/:id | |

**User's choice:** Full stub structure
**Notes:** Phase 2+ fills in the placeholders — no boilerplate to undo.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Defer to Phase 2 | All routes open in Phase 1; ProtectedRoute added in Phase 2 | ✓ |
| Stub ProtectedRoute now | Create pass-through component; Phase 2 adds real logic | |

**User's choice:** Defer to Phase 2
**Notes:** Auth guards have no logic to back them until Phase 2 exists.

---

## Design System Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Full theme wired | Newsreader + Manrope + sage green CSS vars + shadcn theme | ✓ |
| Fonts only | Load fonts, leave colors/shadcn as defaults | |
| Defer to Phase 3+ | Bare Tailwind + shadcn defaults | |

**User's choice:** Full theme wired
**Notes:** Every subsequent phase inherits the right look from day 1.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Google Fonts CDN | @import or <link> in index.html | ✓ |
| Self-hosted | Download font files into /public | |

**User's choice:** Google Fonts CDN

---

## Ping Test Surface

| Option | Description | Selected |
|--------|-------------|----------|
| Status badge on / | Small "API Connected ✓ / API Error ✗" chip on home page | ✓ |
| Dedicated /dev page | /dev route with ping + Supabase info | |
| Console only | No visible UI, result goes to console | |

**User's choice:** Status badge on /
**Notes:** Styled with editorial theme. No dedicated /dev page until Phase 4 (DEVT-03).

---

## Claude's Discretion

- TanStack Query + tRPC provider tree structure
- shadcn components to install upfront
- Whether to initialize Supabase JS client in Phase 1

## Deferred Ideas

- /dev page → Phase 4 (LLM log requirement DEVT-03)
- ProtectedRoute → Phase 2
- Supabase Auth client init → Phase 2
