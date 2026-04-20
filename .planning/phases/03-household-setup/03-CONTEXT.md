# Phase 3: Household Setup - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the household setup surface at `/household`: capture household name, cooking skill level, appliances, and a dynamic list of members with per-member dietary data (allergies, avoidances, diet type). Must support both create (first visit) and edit (returning user) on the same route.

</domain>

<decisions>
## Implementation Decisions

### Setup flow structure
- **D-01:** Single scrolling page — no wizard, no step state management. Household basics at top (name, skill, appliances), members section below. One "Save Household" action at the bottom.
- **D-02:** Same `/household` route handles both create and edit. On load, detect if a household exists for the current user and pre-fill fields. "Save" creates or updates depending on state. No separate edit route.
- **D-03:** First-time users see a welcome nudge ("Set up your household to get started") but are not locked to the page. They can navigate away and return. Generation in Phase 4 will require household data — the nudge is informational, not a gate.

### Dietary data entry
- **D-04:** Per-member dietary data uses three distinct sections: Allergies, Avoidances, and Diet type.
  - **Allergies:** Big 9 preset chips (Milk, Eggs, Fish, Shellfish, Tree nuts, Peanuts, Wheat/Gluten, Soy, Sesame) + freeform tag input for anything else.
  - **Avoidances:** Freeform tag input only (strong dislikes, not medical). No preset chips.
  - **Diet type:** Dropdown from a fixed list matching the `diet_type` column (e.g., omnivore, vegetarian, vegan, halal, kosher, other).
- **D-05:** Keeping allergies and avoidances as separate fields preserves the medical-vs-preference distinction for the LLM prompt in Phase 4.

### Member management UX
- **D-06:** Members displayed as a compact list. Each row has an [Edit] and [Remove] action. Clicking [Edit] expands that row in-place revealing the three dietary sections (no modal). "Add member" appends a new blank expandable row at the bottom of the list.
- **D-07:** Deleting a member shows an inline "Are you sure? [Remove] [Cancel]" confirmation on that row before firing the DB delete. No undo after confirmation.

### Post-setup routing
- **D-08:** After save (create or update), user stays on `/household`. Show a success state (confirmation banner or checkmark) in place — no redirect. No phantom destination required before Phase 4 exists.

### Claude's Discretion
- Exact list of diet_type dropdown values (use common options matching the DB column intent)
- Exact wording for welcome nudge copy, success banners, validation error messages
- Whether the allergen preset chips use a toggle/pill pattern or checkbox pattern — match the editorial UI feel
- Appliances input pattern (checkboxes, multi-select, or tag chips) — use whatever fits the layout cleanly

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements
- `.planning/ROADMAP.md` — Phase 3 goal, dependencies (Phase 2), testing expectations, and success criteria (HSHD-01 through HSHD-05)
- `.planning/REQUIREMENTS.md` — `HSHD-01` through `HSHD-05`
- `.planning/STATE.md` — Current project state and accumulated spike decisions

### Prior decisions and design direction
- `.planning/phases/02-authentication/02-CONTEXT.md` — D-04/D-05: `/household` is the post-auth landing; D-07: route is already protected
- `.planning/phases/01-frontend-scaffold-and-local-dev/01-CONTEXT.md` — Editorial theme, route scaffold, established patterns

### Database schema and architecture
- `supabase/migrations/20260419000001_initial_schema.sql` — `households` and `household_members` table definitions, column types, RLS policies
- `architecture.md` — App stack, tRPC usage, React Query state pattern, Supabase client approach

### Design system
- `src/styles/` — CSS variables, editorial tokens (sage green, off-white surface, Newsreader/Manrope fonts, glassmorphism overlay pattern)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/routes/household-page.tsx` — Existing placeholder that Phase 3 replaces with the real form
- `src/app/router.tsx` — `/household` route already registered and protected; no routing changes needed
- `src/components/auth/AuthRoute.tsx` — Auth component pattern to reference for session-aware data loading
- `src/lib/trpc/client.ts` — tRPC client already configured; household mutations/queries wire in here
- `src/lib/supabase/` — Supabase client helpers already set up for auth; same client used for data operations

### Established Patterns
- React Query (TanStack Query) for all server state — load household on mount, optimistic updates on save
- tRPC mutations on the Edge Function side for household create/update/member CRUD
- shadcn/ui + Tailwind for all UI — no bespoke component libraries; compose from existing primitives
- Editorial design: glassmorphism card containers (`bg-white/72 rounded-[1.75rem]`), spatial separation (no 1px borders), mobile-first
- Form validation: likely react-hook-form + Zod (consistent with tRPC input validation pattern)

### Integration Points
- tRPC router (`supabase/functions/trpc/index.ts`) needs household procedures: `household.get`, `household.upsert`, `household.member.add`, `household.member.update`, `household.member.delete`
- Phase 4 (GenerationForm) will read `household_id` from the saved household — the household must be persisted to DB (not just local state) before Phase 4 can use it
- RLS policies already in place for `households` and `household_members` — auth user must be signed in for any read/write

</code_context>

<specifics>
## Specific Ideas

- The single-page layout should feel like filling out a premium journal entry, not a bureaucratic form — consistent with the editorial design direction.
- Allergen preset chips should be visually distinct from the freeform tag input area but on the same section. Toggle-selected chips turn on/off.
- Member rows in collapsed state should show just the member name and their top dietary constraints as a compact summary (e.g., "Alex — vegan, peanuts") so the list is scannable without expanding.

</specifics>

<deferred>
## Deferred Ideas

- Household sharing / collaborative editing — v2.0 scope (out of scope per PROJECT.md)
- Macro/calorie targets per member — v2.5 scope
- Photo/avatar per member — not in requirements; nice-to-have deferred post-PoC
- Importing dietary preferences from a profile or external source — not in v1 scope

</deferred>

---

*Phase: 03-household-setup*
*Context gathered: 2026-04-20*
