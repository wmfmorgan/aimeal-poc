# Architecture

**Analysis Date:** 2026-04-19

## Pattern Overview

**Overall:** AI-first serverless application with single-LLM + external-enrichment pattern

**Key Characteristics:**
- One high-quality LLM call generates the entire 7-day draft (21 meals); no multi-agent system
- All stateful data lives in Postgres — operations are idempotent and restart-safe
- User-in-the-loop: users see draft titles instantly, then control which meals get enriched
- End-to-end type safety via tRPC + Zod from React client through Deno Edge Functions
- Row Level Security enforced at database level for every table

## Layers

**Frontend (Browser — Netlify CDN):**
- Purpose: Renders the meal plan UI, handles user interactions, manages optimistic state
- Location: `src/` (not yet scaffolded beyond `main.tsx`)
- Contains: React components, tRPC client, TanStack Query hooks, React Router routes
- Depends on: tRPC Edge Function via relative URL `/functions/v1/trpc`
- Used by: End users in browser

**API Layer (tRPC in Edge Function):**
- Purpose: Type-safe RPC router — single entry point for all client → server calls
- Location: `supabase/functions/trpc/index.ts`
- Contains: tRPC router with procedures (`ping`, `generateDraft`, etc.), Zod input schemas
- Depends on: Supabase Postgres (via service role), `generate-draft` edge function logic
- Used by: Frontend tRPC client

**AI Generation Layer (Edge Function):**
- Purpose: Calls Grok LLM via OpenAI-compatible SDK, returns structured 21-meal JSON
- Location: `supabase/functions/generate-draft/index.ts`
- Contains: System prompt, user prompt builder, Grok API client, basic validation
- Depends on: `XAI_API_KEY` secret, Grok API at `https://api.x.ai/v1`
- Used by: tRPC `generateDraft` procedure (will be wired in)

**Database (Supabase PostgreSQL):**
- Purpose: Single source of truth for all application state
- Location: `supabase/migrations/20260419000001_initial_schema.sql`
- Contains: 6 tables with full RLS — `profiles`, `households`, `household_members`, `meal_plans`, `meals`, `spoonacular_cache`, `favorite_meals`
- Depends on: Supabase Auth (`auth.uid()`) for RLS policies
- Used by: All Edge Functions (service role), Supabase Realtime (optional live updates)

**Enrichment Layer (within Edge Functions):**
- Purpose: Fetches full recipe + nutrition data from Spoonacular, with aggressive caching
- Location: Will live in `supabase/functions/` (not yet implemented beyond spike)
- Contains: Two-call Spoonacular flow (`complexSearch` → `getRecipeInformation`), cache lookup/write
- Depends on: `SPOONACULAR_API_KEY` secret, `spoonacular_cache` table
- Used by: tRPC `enrichSelectedMeals` procedure

## Data Flow

**Draft Generation Flow:**

1. User fills `GenerationForm` with household config and clicks "Generate Plan"
2. Frontend calls `tRPC.generateDraft({ householdId, numDays })` via fetch adapter
3. `supabase/functions/trpc/index.ts` handles the mutation, delegates to generation logic
4. Generation logic builds system + user prompts from household data (allergies, skill, appliances)
5. Single Grok API call (`grok-4-1-fast-non-reasoning`, `response_format: json_object`) returns 21 meals
6. Edge Function validates 21 items cover all 7 days × 3 meal types
7. `meal_plan` + 21 `meals` rows written to Postgres (status = `draft`)
8. Plan returned to client; user sees full `MealPlanGrid` immediately (~10s batch, or streamed)

**Enrichment Flow:**

1. User reviews draft grid, selects meals to enrich, clicks "Approve & Enrich"
2. Frontend calls `tRPC.enrichSelectedMeals({ mealIds })` (max 5 concurrent)
3. Edge Function checks `spoonacular_cache` by `spoonacular_recipe_id` first
4. Cache miss → `complexSearch(title)` to get recipe ID → `getRecipeInformation(id, includeNutrition=true)`
5. Recipe data upserted to `spoonacular_cache`; `meals` row updated (status = `enriched`, ingredients, nutrition, instructions, image_url populated)
6. Client receives enriched data, `MealCard` updates live

**Finalization Flow:**

1. User clicks "Finalize Plan"
2. `tRPC.finalizePlan({ mealPlanId })` aggregates shopping list from all enriched `meals.ingredients`
3. De-duplicated list stored in `meal_plans.shopping_list` (jsonb)
4. `meal_plans.generation_status` set to `finalized`

**State Management:**
- Server state via TanStack Query (cache + invalidation on mutations)
- Optimistic updates for edits (title changes, favorites)
- Supabase Realtime subscribed to `meals` table for live enrichment updates (optional for PoC)

## Key Abstractions

**tRPC Router (`AppRouter`):**
- Purpose: Single typed contract between frontend and backend
- Location: `supabase/functions/trpc/index.ts` (exports `AppRouter` type)
- Pattern: `initTRPC.create()` → `t.router({ procedures })` → `fetchRequestHandler` with `Deno.serve`
- Critical: `endpoint` must be `"/trpc"` — Supabase runtime strips `/functions/v1/` prefix

**LLM Provider Factory (planned):**
- Purpose: Multi-provider abstraction over Grok / Claude / GPT-4o-mini
- Location: Will live in `supabase/functions/_shared/llm/` (per architecture doc)
- Pattern: Strategy + Factory — `LLM_PROVIDER` env var selects implementation
- Current: Only Grok implemented via `https://deno.land/x/openai@v4.69.0/mod.ts`

**Spoonacular Cache:**
- Purpose: Cost control — avoid re-fetching stable recipe data (free tier: 150 calls/day)
- DB table: `spoonacular_cache` (keyed by `spoonacular_recipe_id`, not LLM title)
- RLS: Read-all via `for select using (true)`; write restricted to service role
- Cache is permanent — Spoonacular recipe IDs are stable

**Meal Status State Machine:**
- `meals.status`: `draft` → `enriched`
- `meal_plans.generation_status`: `draft` → `enriching` → `finalized`

## Entry Points

**tRPC Edge Function:**
- Location: `supabase/functions/trpc/index.ts`
- Triggers: HTTP requests to `/functions/v1/trpc/*` (proxied by Netlify dev to `http://127.0.0.1:54331`)
- Responsibilities: Route all client mutations and queries; validate input via Zod

**Generate-Draft Edge Function (spike, standalone):**
- Location: `supabase/functions/generate-draft/index.ts`
- Triggers: Direct HTTP POST (currently hardcoded config, no auth — spike only)
- Responsibilities: Call Grok, return validated 21-meal JSON

**Frontend Entry:**
- Location: `main.tsx` (project root — not yet in `src/`)
- Triggers: Browser load via Netlify
- Responsibilities: Mount React app, configure tRPC client, set up React Router

## Error Handling

**Strategy:** Return structured JSON errors from Edge Functions; validate all LLM output before DB writes

**Patterns:**
- Edge Functions wrap all logic in try/catch; return `{ ok: false, error: String(err) }` with HTTP 500
- LLM output validated (must have exactly 21 meals covering all days × meal types) before any DB write
- Spoonacular `analyzedInstructions` guarded: `?.[0]?.steps ?? []` (can be empty array)
- tRPC uses Zod schemas for input validation — invalid inputs rejected before handler runs

## Cross-Cutting Concerns

**Logging:** `elapsed_ms` and `tokens_used` returned from generation calls; no structured logging framework yet
**Validation:** Zod schemas on all tRPC procedure inputs; manual validation on LLM JSON output
**Authentication:** Supabase Auth with JWT; RLS policies on every table using `auth.uid()`; Edge Functions use service role key for DB writes
**Secrets:** All API keys in `supabase/functions/.env` (gitignored); loaded via `--env-file` flag locally; Supabase Edge Function secrets in production

---

*Architecture analysis: 2026-04-19*
