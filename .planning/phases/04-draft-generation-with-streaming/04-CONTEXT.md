# Phase 4: Draft Generation with Streaming - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the full generation flow: GenerationForm on `/plan/:id` triggers a Grok streaming call via the dedicated `generate-draft` Edge Function (SSE); 21 meal cards populate progressively into a 7×3 skeleton grid; each LLM call is persisted to DB; a `/dev` route displays the last 10 LLM log entries. Phase 4 does not include inline edit/delete/regenerate (Phase 5) or Spoonacular enrichment (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Streaming architecture
- **D-01:** Use SSE via the existing `generate-draft` Edge Function — NOT tRPC. The standalone endpoint is already proven in the spike; tRPC streaming in Deno is unvalidated territory. tRPC handles all other operations (household data, LLM log queries).
- **D-02:** React client uses `fetch` + `ReadableStream` (not `EventSource`) to consume the SSE stream. `EventSource` doesn't support POST with auth headers.
- **D-03:** Streaming format is NDJSON — one JSON object per line, no outer array. Prompt instructs Grok to output one meal object per line. Edge function buffers tokens, emits one SSE event per completed line.

### Prompt schema
- **D-04:** Prompt instructs Grok to emit one meal JSON object per line, no markdown, no wrapper array:
  ```
  {"day_of_week":"Monday","meal_type":"breakfast","title":"...","short_description":"..."}
  {"day_of_week":"Monday","meal_type":"lunch","title":"...","short_description":"..."}
  ```
- **D-05:** `response_format: { type: "json_object" }` is NOT used for streaming — it's incompatible with streamed token output. Rely on prompt instruction only.
- **D-06:** Rationale field is included in DB persistence (GEN-06) but NOT emitted in the NDJSON stream (saves tokens). Rationale can be generated per-meal on demand in a future phase.

### GenerationForm placement
- **D-07:** GenerationForm lives inline on `/plan/:id`. When the plan has no meals yet (empty state), the form is shown. After submission, the form gives way to the streaming skeleton grid — no route change during generation.
- **D-08:** User navigates from `/household` to `/plan/new` (or `/plan/:id`) via a "Generate Your Plan →" button that appears after household is saved (or always, if a household exists).
- **D-09:** GenerationForm inputs: meal type preset buttons ("Dinner only" / "Lunch + Dinner" / "All three") and a day count selector (default 7, range 1–14). No freeform input.

### Progressive rendering UX
- **D-10:** On form submission, immediately render a 7×3 skeleton grid (all slots shimmer). As each SSE meal event arrives, the corresponding skeleton slot converts to a real meal card.
- **D-11:** Meal card in Phase 4 shows: title + short description only. Rationale is stored in DB but not displayed. Inline edit/delete/detail view are Phase 5.
- **D-12:** After the final SSE event (all 21 meals received), show a subtle "Your plan is ready" banner. Cards remain visible; grid becomes interactive (click interactions are Phase 5 stubs).
- **D-13:** Slot mapping: SSE events arrive in Grok's output order. Map each meal to its grid position by `(day_of_week, meal_type)` — don't assume sequential order.

### LLM logging
- **D-14:** Each generation call persists to DB: prompt, full response (reconstructed from streamed tokens), token counts, model name, timestamp, household_id. Written by the edge function after the stream completes (or on error).
- **D-15:** LLM log is stored in the `llm_logs` table (already in schema per DEVT-01). tRPC exposes a `devTools.llmLogs` query for the dev page.

### Dev page
- **D-16:** New `/dev` route with a nav link visible in the app shell (no auth gating — PoC only).
- **D-17:** `/dev` is built as a two-section layout: "LLM Requests" (live in Phase 4) and "Spoonacular Usage" (placeholder — Phase 6 fills it in). No refactor needed in Phase 6.
- **D-18:** LLM Requests section shows last 10 entries: model, token count (prompt + completion), timestamp, and collapsible prompt/response preview.

### Claude's Discretion
- Exact copy for the "Generate Your Plan" button and "Your plan is ready" banner
- Skeleton shimmer animation style (CSS pulse vs wave — match editorial aesthetic)
- Day count selector widget (stepper buttons vs number input vs segmented control)
- `/dev` nav label ("Dev" vs "⚙ Dev Tools" vs "Developer")
- Error handling UX if the SSE stream fails mid-generation (retry prompt, partial grid state handling)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements
- `.planning/ROADMAP.md` — Phase 4 goal, dependencies (Phase 3), testing expectations, and success criteria (GEN-01 through GEN-04, GEN-06, DEVT-01, DEVT-03)
- `.planning/REQUIREMENTS.md` — `GEN-01`, `GEN-02`, `GEN-03`, `GEN-04`, `GEN-06`, `DEVT-01`, `DEVT-03`
- `.planning/STATE.md` — Current project state and accumulated spike decisions

### Prior phase context
- `.planning/phases/03-household-setup/03-CONTEXT.md` — Household data shape, member schema, routing decisions, editorial design patterns
- `.planning/phases/02-authentication/02-CONTEXT.md` — Auth session pattern, protected route setup
- `.planning/phases/01-frontend-scaffold-and-local-dev/01-CONTEXT.md` — Editorial theme, route scaffold, tRPC client setup

### Spike findings (CRITICAL — read before implementing)
- `.claude/skills/spike-findings-aimeal-poc/references/edge-functions-ai.md` — Validated Grok streaming patterns, model name, NDJSON approach, Deno runtime constraints, landmines (model latency table, `response_format` incompatibility with streaming, endpoint path rule)

### Existing edge function
- `supabase/functions/generate-draft/index.ts` — Spike implementation (non-streaming, hardcoded household). Phase 4 rewrites this to real streaming + auth + real household data.
- `supabase/functions/trpc/index.ts` — Contains stub `generateDraft` mutation — replace with real implementation or remove stub; tRPC is NOT used for the streaming path.

### DB schema
- `supabase/migrations/20260419000001_initial_schema.sql` — `meal_plans`, `meals`, `llm_logs` table definitions and RLS policies

### Design system
- `src/styles/` — Editorial CSS tokens (sage green, off-white, Newsreader/Manrope, glassmorphism card pattern)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase/functions/generate-draft/index.ts` — Rewrite target; already has `buildUserPrompt()` helper and OpenAI client setup
- `src/routes/plan-page.tsx` — Placeholder that Phase 4 replaces with GenerationForm + streaming grid
- `src/app/router.tsx` — `/plan/:id` route already registered and protected; add `/dev` route here
- `src/app/layout/AppFrame.tsx` — Add "Dev" nav link here
- `src/lib/trpc/client.ts` — tRPC client for LLM log queries and household data fetch
- `src/hooks/use-household.ts` — Household data hook; GenerationForm reads `household.id` to pass to the SSE endpoint
- `src/lib/supabase/client.ts` — Supabase client for auth headers on the SSE fetch call

### Established Patterns
- React Query (TanStack Query) for all tRPC server state — LLM log query follows same pattern
- shadcn/ui + Tailwind for all UI — use Skeleton component for shimmer slots, Card for meal cards
- Editorial design: glassmorphism card containers (`bg-white/72 rounded-[1.75rem]`), mobile-first, spatial separation (no 1px borders)
- Form validation: react-hook-form + Zod (consistent with household form pattern)

### Integration Points
- `generate-draft` Edge Function: receives `householdId`, `numDays`, `mealTypes[]` in POST body; reads household from DB; streams NDJSON meal lines as SSE; persists LLM log to `llm_logs` table after stream completes
- tRPC `devTools.llmLogs` procedure: new query returning last 10 `llm_logs` rows for the dev page
- `/plan/:id` route: needs a plan record created before generation starts so meals can be written to DB with a valid `meal_plan_id`

</code_context>

<specifics>
## Specific Ideas

- The skeleton grid should feel like the plan is "loading into existence" — matching the editorial "premium, calm, intentional" feel. Avoid aggressive spinners or loading bars.
- NDJSON was chosen specifically because it matches how Grok naturally outputs structured data when instructed — one object per line without wrapper syntax. The edge function listens for `\n` characters to know when a complete meal object has arrived.
- `response_format: { type: "json_object" }` is explicitly NOT used — it's incompatible with streaming (`stream: true`). This was a spike-validated constraint.
- The "Generate Your Plan →" button on `/household` should only appear once a household exists (has been saved), not on first visit before setup.

</specifics>

<deferred>
## Deferred Ideas

- Single-meal regeneration — Phase 5 (GEN-05)
- Inline edit / delete / detail view — Phase 5
- Spoonacular usage section on /dev — Phase 6
- Rationale display per meal card — Phase 5 detail view
- Streaming error recovery UI (retry prompt) — Claude's discretion for now; full UX deferred post-PoC

</deferred>

---

*Phase: 04-draft-generation-with-streaming*
*Context gathered: 2026-04-20*
