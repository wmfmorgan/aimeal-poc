# Phase 2: Authentication - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Add email/password authentication to the existing React + Supabase app: sign-up, login, session persistence, password reset, and protected routes. This phase establishes who can enter the app and where authenticated users flow next; household data capture remains Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Auth entry flow
- **D-01:** `/auth` stays a single route and becomes the full auth surface for Phase 2.
- **D-02:** The page uses one-screen mode switching for sign in vs sign up, rather than separate routes.
- **D-03:** Password reset entry starts from the same `/auth` surface via a "forgot password" path, not a separate top-level route.

### Post-auth routing
- **D-04:** After successful sign-up or login, the user should go straight to `/household`.
- **D-05:** The first authenticated destination is intentionally the household setup surface, even though Phase 3 fills in the real household form later.
- **D-06:** No generic authenticated landing page is introduced in Phase 2.

### Protected-route policy
- **D-07:** Every app route except `/auth` is protected in Phase 2.
- **D-08:** Unauthenticated visits to `/`, `/household`, and `/plan/:id` must redirect to `/auth`.
- **D-09:** Route protection is meant to be immediate and global, not limited to selected feature pages.

### Session and logout behavior
- **D-10:** If a signed-in user visits `/auth`, redirect them immediately to `/household`.
- **D-11:** Logout must be available from anywhere in the authenticated shell and always send the user to `/auth`.
- **D-12:** Session persistence across closed and reopened tabs is required behavior, not an enhancement.

### Password reset flow
- **D-13:** Phase 2 includes the full password reset happy path, not just email request.
- **D-14:** The reset email link should return the user into the app, where they can set a new password on a dedicated screen.
- **D-15:** Reset completion should feel like part of the same product flow, not hand off to Supabase-hosted default UI.

### the agent's Discretion
- Exact copywriting for auth errors, validation messages, and success states
- Whether the single `/auth` page uses tabs, segmented controls, or inline mode toggles for sign in vs sign up
- Exact authenticated-shell placement for the logout action within the existing editorial layout
- Whether the reset-password completion screen lives at `/auth` with a reset mode or a dedicated child route, as long as it remains in-app

</decisions>

<specifics>
## Specific Ideas

- Keep the auth experience compressed into one main route instead of breaking it into multiple standalone pages.
- Treat `/household` as the authenticated "home" until later phases add richer in-app destinations.
- Use strict redirect rules so the app has a clear signed-out vs signed-in boundary.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements
- `.planning/ROADMAP.md` — Phase 2 goal, dependencies, testing expectations, and success criteria
- `.planning/REQUIREMENTS.md` — `AUTH-01` through `AUTH-04`
- `.planning/STATE.md` — Current project focus and prior spike decisions that constrain implementation

### Prior decisions and design direction
- `.planning/phases/01-frontend-scaffold-and-local-dev/01-CONTEXT.md` — Locked route scaffold, editorial theme, and explicit defer of auth guards to Phase 2
- `architecture.md` — App stack, router shape, Supabase Auth usage, and planned frontend structure

### Existing auth and routing configuration
- `supabase/config.toml` — Local Supabase Auth settings, signup enablement, email reset settings, and redirect-url constraints
- `supabase/migrations/20260419000001_initial_schema.sql` — `auth.users` relationships and RLS assumptions used by app tables

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/routes/auth-page.tsx` — Existing placeholder route that should evolve into the single auth surface
- `src/app/router.tsx` — Central route table already defines `/`, `/auth`, `/household`, and `/plan/:id`
- `src/app/layout/AppFrame.tsx` — Current shared shell/navigation where authenticated logout behavior will likely attach
- `src/app/providers.tsx` — Existing React Query root provider; auth/session state can be layered into this app-level provider tree

### Established Patterns
- Phase 1 intentionally kept route contracts stable and deferred auth guards to this phase
- Frontend already uses React Router with a single top-level frame and outlet-based nested routes
- Frontend API calls use relative Netlify-proxied paths such as `/functions/v1/trpc`, so auth-aware API access should preserve the same local/hosted shape
- Editorial visual direction is already established; auth should fit the existing premium, calm shell rather than introduce a new visual language

### Integration Points
- Supabase Auth must become the source of truth for session state and protected-route decisions
- Guard logic will sit between `src/app/router.tsx` and route elements for `/`, `/household`, and `/plan/:id`
- The `/household` placeholder becomes the first post-auth landing target before Phase 3 adds full setup forms
- Password reset must integrate Supabase email flow with an in-app return path that the React router can recognize and complete

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-authentication*
*Context gathered: 2026-04-19*
