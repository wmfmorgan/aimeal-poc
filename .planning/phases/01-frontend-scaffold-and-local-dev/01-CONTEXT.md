# Phase 1: Frontend Scaffold & Local Dev - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire a Vite + React 19 + TypeScript frontend to the existing Supabase/tRPC backend via `netlify dev` proxy. Developer should be able to run `netlify dev` and confirm the full local stack is working end-to-end via a visible ping smoke test.

</domain>

<decisions>
## Implementation Decisions

### Route Scaffold
- **D-01:** Scaffold all 4 future routes as empty placeholder pages: `/`, `/auth`, `/household`, `/plan/:id`. Phase 2+ fills them in — no boilerplate to undo later.
- **D-02:** No auth guards in Phase 1 — all routes open. Defer `ProtectedRoute` wrapper to Phase 2 when auth actually exists.

### Design System
- **D-03:** Wire full editorial theme in Phase 1: Newsreader + Manrope via Google Fonts CDN, sage green `#4A6741` + warm off-white `#faf9f8` as shadcn CSS vars, shadcn theme configured. Every subsequent phase inherits the right look from day 1.
- **D-04:** Load fonts via Google Fonts CDN (`<link>` in `index.html`). No self-hosting needed for PoC.

### Ping Smoke Test
- **D-05:** Home route `/` shows a small "API Connected ✓" or "API Error ✗" status badge/chip. Styled with the editorial theme. Visible proof of end-to-end connectivity without clutter.
- **D-06:** No dedicated `/dev` page in Phase 1. That surface is deferred to Phase 4 (LLM log requirement DEVT-03).

### Claude's Discretion
- Exact shadcn component library initialization (which components to install upfront vs deferred)
- TanStack Query + tRPC provider tree structure at app root
- Whether to initialize Supabase JS client in Phase 1 or defer to Phase 2

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture
- `architecture.md` — Full component structure, folder layout (`/src/components/meal-plan/`, `/src/hooks/`, `/src/lib/trpc.ts`, `/src/app/`), tech stack decisions

### Requirements
- `.planning/REQUIREMENTS.md` — DEPL-01, DEPL-02 are the Phase 1 requirements
- `.planning/ROADMAP.md` — Phase 1 success criteria (4 items)

### Spike Findings (Validated Patterns)
- `.claude/skills/spike-findings-aimeal-poc/references/local-dev-infrastructure.md` — Supabase port config (54331–54339), netlify.toml proxy rules (3 redirects with `force = true`), landmines
- `.claude/skills/spike-findings-aimeal-poc/references/edge-functions-ai.md` — tRPC v11 Deno setup, critical endpoint path rule (`endpoint: "/trpc"` not `/functions/v1/trpc`), secrets file location

### Existing Code
- `supabase/functions/trpc/` — existing tRPC function from spike, contains `ping` procedure
- `supabase/config.toml` — port offset already configured
- `supabase/migrations/` — DB schema already deployed

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase/functions/trpc/` — tRPC Edge Function with `ping` procedure already exists. Phase 1 keeps/cleans this. No need to rewrite.
- `supabase/config.toml` — port offset (54331–54339) already configured. Phase 1 just reads the existing config.
- `supabase/migrations/` — full schema already deployed locally. Phase 1 doesn't touch migrations.

### Established Patterns
- netlify.toml proxy: 3 redirect rules (`/functions/v1/*`, `/rest/v1/*`, `/auth/v1/*`) all pointing to `http://127.0.0.1:54331` with `force = true`
- tRPC endpoint path must be `"/trpc"` — Deno edge runtime strips `/functions/v1/` prefix
- API keys in `supabase/functions/.env` — loaded via `--env-file` flag

### Integration Points
- Frontend calls `/functions/v1/trpc/ping` → Netlify proxies to local Supabase port 54331 → tRPC handler responds
- React app at `localhost:8888` (Netlify dev port), Vite at `5173` (target port)

</code_context>

<specifics>
## Specific Ideas

- Design system source: Stitch project `15134141823727190585` (WFM-AI-MEALPLANNER) — "High-End Editorial Cookbook" visual direction
- Primary color: sage green `#4A6741`
- Surface color: warm off-white `#faf9f8`
- Headline font: Newsreader (serif)
- UI/label font: Manrope (sans-serif)
- No 1px border lines — spatial separation only
- Mobile-first layout

</specifics>

<deferred>
## Deferred Ideas

- `/dev` page with LLM request log — Phase 4 (DEVT-03)
- `ProtectedRoute` auth guard component — Phase 2
- Supabase JS Auth client initialization — Phase 2

</deferred>

---

*Phase: 01-frontend-scaffold-and-local-dev*
*Context gathered: 2026-04-19*
