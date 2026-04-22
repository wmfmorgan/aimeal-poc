# Phase 6: Enrichment Flow - Research

**Researched:** 2026-04-22
**Domain:** Spoonacular-backed meal enrichment, live grid updates, flyout recipe rendering, and API-usage observability for the existing React + tRPC + Supabase stack. [VERIFIED: codebase grep]
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Selection flow
- **D-01:** Enrichment uses an explicit multi-select mode in the meal grid rather than one-off enrichment only. [VERIFIED: codebase grep]
- **D-02:** Multi-select mode must include a visible `Select all` action that immediately selects every meal currently shown in the grid. [VERIFIED: codebase grep]
- **D-03:** Once one or more meals are selected, the UI should expose a clear batch enrichment action from the grid context. [VERIFIED: codebase grep]
- **D-04:** Phase 6 is optimized for enriching several meals at once; downstream planning should treat batch selection as a first-class flow, not a secondary enhancement. [VERIFIED: codebase grep]

### Enrichment progress and failure handling
- **D-05:** Enrichment progress is local to each selected meal card. Each selected card enters its own loading state while the batch runs. [VERIFIED: codebase grep]
- **D-06:** Enriched cards update live in the grid as soon as each meal completes. The page does not wait for the whole batch to finish before showing completed results. [VERIFIED: codebase grep]
- **D-07:** Failures remain local to the affected card or slot. A failed enrichment must not block or roll back the rest of the selected meals. [VERIFIED: codebase grep]
- **D-08:** Failed enrichments should expose a direct retry path on the affected meal card rather than forcing a full-batch retry. [VERIFIED: codebase grep]

### Recipe match policy
- **D-09:** The app should automatically use the best Spoonacular match and enrich immediately. No manual confirmation step is required in Phase 6. [VERIFIED: codebase grep]
- **D-10:** Cache behavior remains non-negotiable: once a Spoonacular recipe id is resolved and stored, future enrichments should reuse cached recipe data instead of making duplicate API calls. [VERIFIED: codebase grep]
- **D-11:** Downstream planning can assume the match-selection UX is invisible by default. The user is not asked to arbitrate between multiple Spoonacular results in this phase. [VERIFIED: codebase grep]

### Flyout recipe presentation
- **D-12:** The existing right-side flyout remains the primary recipe-detail surface. Phase 6 extends it rather than replacing it with a modal, inline expansion, or separate route. [VERIFIED: codebase grep]
- **D-13:** Enriched flyout content should emphasize, in order: hero image, ingredients, step-by-step instructions, and nutrition summary. [VERIFIED: codebase grep]
- **D-14:** Draft rationale should still remain visible in the enriched flyout, but lower in the panel after the real recipe data. [VERIFIED: codebase grep]
- **D-15:** The flyout should feel like a full recipe view layered onto the existing management shell, while keeping the weekly grid visible behind it. [VERIFIED: codebase grep]

### Dev page usage reporting
- **D-16:** The Spoonacular section on `/dev` should show daily points used versus the daily limit. [VERIFIED: codebase grep]
- **D-17:** The same section should also show requests made, cache hits, cache misses, and a per-call breakdown. [VERIFIED: codebase grep]
- **D-18:** Phase 6 should treat usage visibility as both a debugging surface and a cost-control surface, not just a decorative counter. [VERIFIED: codebase grep]

### Existing product constraints carried into Phase 6
- **D-19:** Phase 6 inherits the Phase 5 right-side flyout shell and the persisted `/plan/:id` grid-management surface. Enrichment must fit into that existing interaction model. [VERIFIED: codebase grep]
- **D-20:** Phase 6 inherits the project-level cost-control rule that Spoonacular usage is user-controlled and aggressively cached. [VERIFIED: codebase grep]

### Claude's Discretion
- Exact visual treatment for multi-select affordances, including whether selection is checkbox-led, chip-led, or card-overlay-led. [VERIFIED: codebase grep]
- Exact wording for the batch action bar and the `Select all` affordance. [VERIFIED: codebase grep]
- Exact loading copy and status-chip labels for `draft`, `enriching`, and `enriched`. [VERIFIED: codebase grep]
- Exact nutrition-summary layout inside the flyout, so long as ingredients and instructions remain primary readable content. [VERIFIED: codebase grep]
- Exact `/dev` table or card layout for the per-call Spoonacular breakdown. [VERIFIED: codebase grep]

### Deferred Ideas (OUT OF SCOPE)
- Manual confirmation or chooser UI for Spoonacular search matches — not part of Phase 6 because the user chose automatic best-match enrichment. [VERIFIED: codebase grep]
- Background-job enrichment flow where the user leaves and returns later — rejected for this phase in favor of live card-level progress. [VERIFIED: codebase grep]
- Recipe-picking marketplace or side-by-side alternatives per meal — out of scope for this phase. [VERIFIED: codebase grep]
- Finalized shopping-list generation from enriched ingredients — Phase 7. [VERIFIED: codebase grep]
- Favorites controls tied to enriched recipe data — Phase 7. [VERIFIED: codebase grep]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ENRCH-01 | User can select one or more draft meals to enrich with real recipe data. [VERIFIED: codebase grep] | Batch-selection should live in `plan-page.tsx` as route-level state, while the actual enrich call remains single-meal and is fanned out client-side for per-card progress. [VERIFIED: codebase grep] |
| ENRCH-02 | Enrichment fetches ingredients, nutrition, instructions, and image from Spoonacular. [VERIFIED: codebase grep] | Use `complexSearch` to resolve an id, then `GET /recipes/{id}/information` with `includeNutrition=true`; store `extendedIngredients`, `nutrition`, `analyzedInstructions[].steps[].step`, and `image`. [CITED: https://spoonacular.com/food-api/docs] [VERIFIED: codebase grep] |
| ENRCH-03 | Previously fetched recipes are served from cache, so the app should avoid duplicate API calls. [VERIFIED: codebase grep] | Reuse `spoonacular_cache` as the shared recipe cache, but write it through a service-role client because current RLS only allows `select` on that table. [VERIFIED: codebase grep] |
| ENRCH-04 | User sees enriched meal data update live in the grid after enrichment completes. [VERIFIED: codebase grep] | Drive the batch from the client with one mutation per meal so each completion can update React Query state independently. [VERIFIED: codebase grep] [CITED: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation] |
| ENRCH-05 | User can view full recipe details in a flyout panel. [VERIFIED: codebase grep] | Extend the existing `MealDetailFlyout` and `mealPlan.get` payload to include nullable enrichment fields; do not introduce a new route or modal. [VERIFIED: codebase grep] |
| DEVT-02 | App tracks Spoonacular API usage per calendar day in DB. [VERIFIED: codebase grep] | Log per-call quota headers and cache-hit metadata in a new DB table keyed by UTC day because Spoonacular resets quota at midnight UTC. [CITED: https://spoonacular.com/food-api/docs] [VERIFIED: codebase grep] |
| DEVT-04 | Developer page shows Spoonacular daily usage and per-call point cost breakdown. [VERIFIED: codebase grep] | Replace the Phase 4 placeholder on `/dev` with a `devTools.spoonacularUsage` query that returns daily summary + recent call rows. [VERIFIED: codebase grep] |
</phase_requirements>

## Summary

Phase 6 fits the existing architecture best if the browser owns selection state and batch orchestration, while the server keeps ownership of all Spoonacular I/O, cache reads/writes, meal updates, and usage logging. The current codebase already has the right seams for this split: `plan-page.tsx` owns route-level meal state and the flyout, `useMealPlan` already wraps React Query and per-slot mutation state, and the `trpc` edge function already holds all authenticated meal mutations. [VERIFIED: codebase grep]

The strongest implementation pattern is not a new streaming enrichment endpoint. It is a client-orchestrated batch of single-meal `meal.enrich` mutations with strict concurrency control. That preserves the existing tRPC request/response model, makes card-local loading and retry straightforward, and allows each successful enrichment to update the grid immediately instead of waiting for a batch response. [VERIFIED: codebase grep] [CITED: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation]

The biggest planning risk is not UI complexity. It is policy and data-layer correctness. Current project docs still assume aggressive indefinite caching and older Spoonacular free-tier limits, but Spoonacular’s current official pricing page says the free plan is `50 points/day`, `1 request/s`, `2` concurrent requests, and cached user-requested data may only be kept for `1 hour` before refresh. The planner should treat that as an explicit decision/risk item, not as settled architecture. [CITED: https://spoonacular.com/food-api/pricing]

**Primary recommendation:** Implement Phase 6 as route-level multi-select UI plus client-fanned single-meal enrichment mutations, with a dual-client server pattern for user-owned meal writes and service-role cache writes. [VERIFIED: codebase grep]

## Project Constraints (from CLAUDE.md)

- LLM provider remains `grok-4-1-fast-non-reasoning` via `https://api.x.ai/v1`; Phase 6 should not introduce another LLM model. [VERIFIED: codebase grep]
- Backend work must stay compatible with the Deno 2 Supabase Edge runtime and should use `npm:` specifiers rather than Node-only import patterns. [VERIFIED: codebase grep] [CITED: https://supabase.com/docs/guides/functions/dependencies]
- Spoonacular cost control is mandatory because the project is explicitly targeting the free-tier budget envelope. [VERIFIED: codebase grep]
- The app’s interaction model must keep `/plan/:id` as the management surface and extend the right-side flyout rather than replacing it. [VERIFIED: codebase grep]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Multi-select mode, select-all, batch action bar | Browser / Client | Frontend Server | Selection is transient UI state scoped to the current `/plan/:id` session and should not be persisted. [VERIFIED: codebase grep] |
| Per-card enriching/loading/retry state | Browser / Client | API / Backend | The server returns success/failure per meal, but the loading state itself is ephemeral and should not require DB schema changes. [VERIFIED: codebase grep] |
| Meal ownership checks and row updates | API / Backend | Database / Storage | The current tRPC edge function already owns authenticated meal mutations through Supabase + JWT-backed RLS. [VERIFIED: codebase grep] |
| Shared Spoonacular cache lookup/write | API / Backend | Database / Storage | `spoonacular_cache` is a shared table with `select` policy only, so cache writes need a privileged server path rather than direct client ownership. [VERIFIED: codebase grep] |
| Spoonacular API calls and quota-header capture | API / Backend | — | Secrets belong in the edge function, and quota headers are only available on the server response path. [CITED: https://supabase.com/docs/guides/functions] [CITED: https://spoonacular.com/food-api/docs] |
| Full recipe rendering in the flyout | Browser / Client | API / Backend | Presentation belongs in the existing flyout component, but the payload has to be delivered by `mealPlan.get` or a dedicated detail query. [VERIFIED: codebase grep] |
| Daily usage aggregation and `/dev` reporting | API / Backend | Database / Storage | The summary must be derived from persisted call logs, not in-memory counters, because the quota resets by UTC day. [CITED: https://spoonacular.com/food-api/docs] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | Repo `2.103.3`; current registry `2.104.0` modified `2026-04-22T12:47:36.358Z` [VERIFIED: npm registry] | DB access inside the existing tRPC edge function and dual-client pattern for user-scoped vs service-role operations | This is already the project’s server data layer and the official Supabase dependency examples use `npm:@supabase/supabase-js@2`. [VERIFIED: codebase grep] [CITED: https://supabase.com/docs/guides/functions/dependencies] |
| `@trpc/server` + `@trpc/client` | Repo `11.7.1`; current registry `11.16.0` modified `2026-04-14` [VERIFIED: npm registry] | Add `meal.enrich` and `devTools.spoonacularUsage` procedures without introducing another transport | The project already uses tRPC fetch adapter in Deno for all non-streaming app operations. [VERIFIED: codebase grep] |
| `@tanstack/react-query` | Repo `5.90.5`; current registry `5.99.2` modified `2026-04-19` [VERIFIED: npm registry] | Query invalidation and local cache refresh for live card updates | Existing route hooks already wrap tRPC in React Query; targeted invalidation is the documented standard pattern. [VERIFIED: codebase grep] [CITED: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation] |
| React | Repo `19.2.0`; current registry `19.2.5` modified `2026-04-21` [VERIFIED: npm registry] | Route-level selection state, flyout rendering, and grid overlays | The current grid and flyout are already implemented in React and should be extended in place. [VERIFIED: codebase grep] |
| Native `fetch` in Supabase Edge Functions | Built into the Deno-compatible runtime. [CITED: https://supabase.com/docs/guides/functions] | Call Spoonacular directly from the edge function without an extra SDK | This keeps the API key server-side and uses the platform’s normal HTTP path. [CITED: https://supabase.com/docs/guides/functions] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | Repo `3.2.4`; current registry `4.1.5` modified `2026-04-21` [VERIFIED: npm registry] | Unit coverage for transform helpers, usage-log shaping, and batch-orchestration helpers | Use for pure TS helpers in `src/lib` and query-hook behavior. [VERIFIED: codebase grep] |
| Playwright | Repo `1.56.1`; current registry `1.59.1` modified `2026-04-22` [VERIFIED: npm registry] | End-to-end verification of select/enrich/flyout/dev-page flows | Use for the critical user journey across `/plan/:id` and `/dev`. [VERIFIED: codebase grep] |
| Zod | Edge function currently imports `npm:zod@3`; current registry `4.3.6` modified `2026-01-25` [VERIFIED: npm registry] | Input validation for new tRPC procedures | Keep Phase 6 on the existing edge-function major version rather than mixing a validation-library upgrade into enrichment work. [VERIFIED: codebase grep] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-fanned single-meal mutations | A single batch mutation with server-side progress streaming | A batch transport would add a second progress protocol on top of existing tRPC patterns; the client-fan-out approach matches the current architecture and naturally yields per-card progress. [VERIFIED: codebase grep] |
| Shared cache writes through a service-role client | Relaxed RLS policies on `spoonacular_cache` | Relaxing shared-table writes for all authenticated users would widen the blast radius of bad writes; service-role writes keep the table privileged. [VERIFIED: codebase grep] |
| Usage logs based on actual response headers | Hard-coded endpoint point math | Spoonacular says point costs have exceptions and exposes quota headers on every response, so logging the headers is more reliable than reimplementing the pricing model. [CITED: https://spoonacular.com/food-api/docs] |

**Installation:**
```bash
npm install
```

No new frontend packages are required for the recommended Phase 6 shape. [VERIFIED: codebase grep]

**Version verification:** `react@19.2.5`, `@tanstack/react-query@5.99.2`, `@trpc/client@11.16.0`, `@trpc/server@11.16.0`, `@supabase/supabase-js@2.104.0`, `vitest@4.1.5`, `@playwright/test@1.59.1`, and `zod@4.3.6` were verified against the npm registry during this session. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
MealPlanGrid selection UI
  -> route-level selected meal ids in plan-page.tsx
  -> concurrency-limited client batch runner
  -> tRPC meal.enrich(mealId) per selected meal
  -> edge function loads meal + household with caller JWT
  -> cache path:
       if meal already has enrichment fields -> return immediately
       else if spoonacular_recipe_id exists -> read spoonacular_cache
       else -> Spoonacular complexSearch(title[, filters]) -> recipe id
  -> Spoonacular getRecipeInformation(id, includeNutrition=true)
  -> capture X-API-Quota-* headers
  -> validate recipe against household allergies/avoidances
  -> service-role upsert into spoonacular_cache
  -> caller-scoped update of meals row to status=enriched + recipe fields
  -> insert spoonacular_usage row(s)
  -> query cache update / invalidate ["meal-plan", planId]
  -> MealCard status chip + MealDetailFlyout render enriched payload
  -> /dev reads daily summary + recent call breakdown from tRPC devTools.spoonacularUsage
```

This keeps input, processing, decision points, external dependencies, and output in one traceable flow. [VERIFIED: codebase grep]

### Recommended Project Structure

```text
src/
├── components/generation/       # Extend MealCard, MealPlanGrid, MealDetailFlyout
├── hooks/                       # Add batch-enrichment hook or extend use-meal-plan
├── lib/generation/              # Shared meal/enrichment TS types and mapping helpers
└── routes/                      # plan-page.tsx and dev-page.tsx orchestration

supabase/
└── functions/trpc/              # Add meal.enrich + devTools.spoonacularUsage

supabase/migrations/
└── 2026......_spoonacular_usage.sql  # New usage-log table and policies
```

This matches the existing code layout instead of inventing a new feature slice the repo does not currently use. [VERIFIED: codebase grep]

### Pattern 1: Client-Orchestrated Batch, Server-Owned Single-Meal Enrichment
**What:** Keep the UI batch action in the browser, but make the actual network contract single-meal. [VERIFIED: codebase grep]

**When to use:** Use this for Phase 6’s select-many flow because the requirement is live slot-local progress, not server-driven batch transactionality. [VERIFIED: codebase grep]

**Example:**
```typescript
// Source: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation
// Adapted to the repo's existing React Query wrapper pattern.
async function enrichSelectedMeals(selectedMealIds: string[]) {
  await runWithConcurrencyLimit(selectedMealIds, 2, async (mealId) => {
    await trpcClient.mutation("meal.enrich", { mealId });
    await queryClient.invalidateQueries({ queryKey: ["meal-plan", planId] });
  });
}
```

### Pattern 2: Dual Supabase Clients in the Edge Function
**What:** Use the caller-scoped client for user-owned reads and `meals` updates, and a separate service-role client only for shared-cache writes. [VERIFIED: codebase grep]

**When to use:** Use this whenever a Phase 6 procedure needs both ownership-enforced meal access and privileged access to `spoonacular_cache`. [VERIFIED: codebase grep]

**Example:**
```typescript
// Source: https://supabase.com/docs/guides/functions/dependencies
const userClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: authHeader } },
});

const serviceClient = createClient(supabaseUrl, serviceRoleKey);
```

### Pattern 3: Extend `mealPlan.get` With Nullable Enrichment Fields
**What:** Add nullable `spoonacular_recipe_id`, `ingredients`, `nutrition`, `instructions`, and `image_url` to the persisted meal type returned by `mealPlan.get`. [VERIFIED: codebase grep]

**When to use:** Use this if the flyout should open instantly from the already-loaded plan state rather than triggering a second detail fetch. [VERIFIED: codebase grep]

**Example:**
```typescript
// Source: https://spoonacular.com/food-api/docs
type PersistedMeal = {
  id: string;
  status: "draft" | "enriched";
  spoonacular_recipe_id: number | null;
  ingredients: SpoonacularIngredient[] | null;
  nutrition: SpoonacularNutrient[] | null;
  instructions: string[] | null;
  image_url: string | null;
  rationale: string | null;
};
```

### Anti-Patterns to Avoid

- **Persisting `enriching` as a DB enum state:** The current `meals.status` constraint only allows `draft` and `enriched`, and the requirement only needs transient card-level loading. Keep enriching state local unless a later phase needs resumable jobs. [VERIFIED: codebase grep]
- **Writing `spoonacular_cache` with the caller-scoped client:** Current RLS allows `select` only on that table, so direct authenticated writes will fail. [VERIFIED: codebase grep]
- **Creating a second recipe-details route:** Phase 5 and Phase 6 context both lock the right-side flyout as the detail surface. [VERIFIED: codebase grep]
- **Hard-coding point costs per endpoint:** Official docs say point costs have exceptions and provide response headers for the actual quota effect. [CITED: https://spoonacular.com/food-api/docs]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Spoonacular quota accounting | A local table of guessed endpoint costs | `X-API-Quota-Request`, `X-API-Quota-Used`, and `X-API-Quota-Left` response headers | Official headers reflect the true cost, including endpoint-specific exceptions. [CITED: https://spoonacular.com/food-api/docs] |
| Client cache synchronization | A normalized custom meal entity store | React Query invalidation and targeted cache refresh | The existing app already uses React Query wrappers and the library prescribes targeted invalidation over custom normalized cache maintenance. [VERIFIED: codebase grep] [CITED: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation] |
| Recipe-field normalization | A premature custom nutrition/ingredient schema rewrite | Store Spoonacular `extendedIngredients` and nutrient arrays as-is in JSONB, then present derived summaries in the UI | The DB schema already expects JSONB and the spike confirmed the required shape matches the stored columns. [VERIFIED: codebase grep] |
| Another server progress transport | SSE/WebSocket enrichment channel for this phase | One mutation per meal with local progress state | The repo already uses a separate SSE endpoint only for LLM draft streaming; Phase 6 does not need another long-lived protocol to satisfy its UX. [VERIFIED: codebase grep] |

**Key insight:** The cheapest Phase 6 path is not “one big enrichment system.” It is a thin extension of the already-working plan-management architecture. [VERIFIED: codebase grep]

## Common Pitfalls

### Pitfall 1: Planning Against Old Spoonacular Limits
**What goes wrong:** The batch runner is tuned for stale project assumptions like `150 calls/day` or `5` concurrent enrichments and burns the free-tier budget too quickly. [VERIFIED: codebase grep] [CITED: https://spoonacular.com/food-api/pricing]
**Why it happens:** Older internal docs and spike notes still mention looser limits than the current official pricing page. [VERIFIED: codebase grep] [CITED: https://spoonacular.com/food-api/pricing]
**How to avoid:** Budget against the current free-plan contract: `50 points/day`, `1 request/s`, and `2` concurrent requests. [CITED: https://spoonacular.com/food-api/pricing]
**Warning signs:** Frequent `402` or `429` responses, or a daily total that climbs faster than the planner expected. [CITED: https://spoonacular.com/food-api/docs]

### Pitfall 2: Cache Writes Fail Silently Under RLS
**What goes wrong:** Enrichment appears to work for one request path but cache reuse never happens because the shared table upsert is unauthorized. [VERIFIED: codebase grep]
**Why it happens:** `spoonacular_cache` currently has only a `select` policy for authenticated users. [VERIFIED: codebase grep]
**How to avoid:** Keep user-owned `meals` writes on the caller client and route shared-cache writes through a service-role client with explicit server-side guards. [VERIFIED: codebase grep]
**Warning signs:** Meal rows show enrichment data once, but future enrichments still call Spoonacular for the same recipe id. [VERIFIED: codebase grep]

### Pitfall 3: Best-Match Search Returns an Unsafe Recipe
**What goes wrong:** A title-based best match can return a recipe that conflicts with a household allergen or avoidance even if the draft meal itself was safe. [VERIFIED: codebase grep]
**Why it happens:** `complexSearch` is a search endpoint, not a household-safety guarantee. The current enrichment spike also notes that title matches are not exact. [CITED: https://spoonacular.com/food-api/docs] [VERIFIED: codebase grep]
**How to avoid:** Pass household-derived filters when possible, then validate `extendedIngredients` against allergies and avoidances before saving the enrichment result. [CITED: https://spoonacular.com/food-api/docs] [VERIFIED: codebase grep]
**Warning signs:** The enriched ingredient list contains a blocked food despite a safe draft title. [VERIFIED: codebase grep]

### Pitfall 4: Dev Totals Drift From Spoonacular’s Real Day Boundary
**What goes wrong:** The `/dev` daily total does not match Spoonacular’s console because the app aggregates by local time instead of the API’s reset boundary. [CITED: https://spoonacular.com/food-api/docs]
**Why it happens:** Spoonacular says `X-API-Quota-Used` resets at midnight UTC. [CITED: https://spoonacular.com/food-api/docs]
**How to avoid:** Persist both `created_at` and the returned quota headers, aggregate by UTC date, and label the UI clearly as UTC-based. [CITED: https://spoonacular.com/food-api/docs]
**Warning signs:** The `/dev` total differs from the latest response header around local evening or early morning hours. [CITED: https://spoonacular.com/food-api/docs]

### Pitfall 5: Flyout Work Starts Before Shared Types Are Extended
**What goes wrong:** The UI grows ad hoc nullable checks and prop drilling because `PersistedMeal` still only models draft fields. [VERIFIED: codebase grep]
**Why it happens:** Phase 5 types and tests only cover `title`, `short_description`, `rationale`, and `status`. [VERIFIED: codebase grep]
**How to avoid:** Add shared enrichment types first, then update `mealPlan.get`, the hook, the card, and the flyout together. [VERIFIED: codebase grep]
**Warning signs:** Component code starts parsing raw JSON in the flyout instead of receiving typed meal data. [VERIFIED: codebase grep]

## Code Examples

Verified patterns from official sources:

### Capture Quota Headers and Recipe Payload on the Server
```typescript
// Source: https://spoonacular.com/food-api/docs
const infoResponse = await fetch(
  `https://api.spoonacular.com/recipes/${recipeId}/information?includeNutrition=true`,
  {
    headers: { "x-api-key": spoonacularApiKey },
  },
);

const quotaRequest = Number(infoResponse.headers.get("X-API-Quota-Request") ?? 0);
const quotaUsed = Number(infoResponse.headers.get("X-API-Quota-Used") ?? 0);
const quotaLeft = Number(infoResponse.headers.get("X-API-Quota-Left") ?? 0);

const info = await infoResponse.json();
const instructions = info.analyzedInstructions?.[0]?.steps?.map(
  (step: { step: string }) => step.step,
) ?? [];
```

### Use React Query Invalidation After a Per-Meal Mutation
```typescript
// Source: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation
async function onEnrichmentSuccess(planId: string) {
  await queryClient.invalidateQueries({ queryKey: ["meal-plan", planId] });
}
```

### Deno/Supabase Dependency Pattern for Edge Functions
```typescript
// Source: https://supabase.com/docs/guides/functions/dependencies
import { createClient } from "npm:@supabase/supabase-js@2";
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Treat Spoonacular free tier as roughly `150 calls/day` and allow high concurrency | Treat the current free tier as `50 points/day`, `1 request/s`, and `2` concurrent requests | Verified on `2026-04-22` against the current pricing page. [CITED: https://spoonacular.com/food-api/pricing] | Batch size and retry strategy must be stricter than older internal docs suggest. [VERIFIED: codebase grep] |
| Assume indefinite cache by recipe id is uncontroversial | Current pricing FAQ allows caching user-requested data for at most `1 hour` before refresh | Verified on `2026-04-22` against the current pricing FAQ. [CITED: https://spoonacular.com/food-api/pricing] | This is a real product/legal decision point for Phase 6. |
| Recompute quota usage from endpoint assumptions | Capture `X-API-Quota-*` headers returned on every API response | Current official docs show the quota headers and warn that point-cost exceptions exist. [CITED: https://spoonacular.com/food-api/docs] | `/dev` can display authoritative numbers instead of guesses. |

**Deprecated/outdated:**
- Internal assumption that `spoonacular_cache` can be treated as a permanent cache without revisiting terms. The project can still choose that path for a PoC, but it is no longer safe to describe it as obviously compliant. [VERIFIED: codebase grep] [CITED: https://spoonacular.com/food-api/pricing]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Extending `mealPlan.get` with full enriched payload for at most 21 meals will remain fast enough for the current PoC route. [ASSUMED] | Architecture Patterns | If payload size becomes noticeable, the planner should split detailed recipe data into a second flyout query. |

## Open Questions (RESOLVED)

1. **Cache-retention policy for Phase 6**
   - Decision: Phase 6 will keep the project's existing longer-lived cache reuse by `spoonacular_recipe_id` for the PoC.
   - Why: D-10 makes cache reuse non-negotiable in this phase, and the product direction prioritizes user-controlled cost containment during local PoC work. [VERIFIED: codebase grep]
   - Risk posture: This is an explicit PoC risk acceptance because Spoonacular's current pricing FAQ appears stricter and may cap cached user-requested data at one hour. The phase must document that acceptance in execution summaries and manual verification instead of treating it as settled compliance guidance. [CITED: https://spoonacular.com/food-api/pricing]

2. **Allergy/avoidance mismatch handling**
   - Decision: If Spoonacular's best-match recipe conflicts with household allergies or avoidances, `meal.enrich` must block the write and return a local card-level error.
   - Why: Automatic best-match enrichment remains locked for Phase 6, but preserving the household-safety contract is more important than saving a mismatched recipe with only a warning. This keeps failures local per D-07 and D-08 and avoids silently persisting unsafe recipe data. [VERIFIED: codebase grep]
   - Test impact: The plan set must include automated unit and E2E coverage for the mismatch path, and retry must still target only the failed card. [VERIFIED: codebase grep]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend build/test scripts | ✓ [VERIFIED: local command] | `v24.14.0` [VERIFIED: local command] | — |
| npm | Package scripts and version verification | ✓ [VERIFIED: local command] | `11.9.0` [VERIFIED: local command] | — |
| Deno | Supabase Edge Function runtime | ✓ [VERIFIED: local command] | `2.7.12` [VERIFIED: local command] | — |
| Supabase CLI | Local edge-function/database workflow | ✓ [VERIFIED: local command] | `2.84.2` [VERIFIED: local command] | — |
| Playwright CLI | E2E validation | ✓ [VERIFIED: local command] | `1.59.1` [VERIFIED: local command] | — |
| Vitest | Unit validation | ✓ [VERIFIED: local command] | `3.2.4` in repo script output [VERIFIED: local command] | — |
| Netlify CLI | Full local proxy path for manual QA | Partial [VERIFIED: local command] | CLI exists, but `netlify --version` hit a local config `EPERM` permission error during this session. [VERIFIED: local command] | Use existing repo scripts for unit/E2E work and treat Netlify manual validation as an environment fix-up if needed. [VERIFIED: codebase grep] |
| `supabase/functions/.env` | Local Spoonacular secret loading | Present [VERIFIED: local command] | Contents not inspected in this session. [VERIFIED: local command] | If the key is missing at execution time, enrichment testing must fall back to mocks. [VERIFIED: codebase grep] |

**Missing dependencies with no fallback:**
- None at the tool/runtime level. [VERIFIED: local command]

**Missing dependencies with fallback:**
- Live Spoonacular key availability was not verified; the planner should assume mocks for automated tests and reserve live-key validation for manual QA. [VERIFIED: local command] [VERIFIED: codebase grep]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `3.2.4` via `npm run test:unit`; Playwright `1.56.1` in repo with CLI `1.59.1` available locally. [VERIFIED: codebase grep] [VERIFIED: local command] |
| Config file | `vitest.config.ts`, `playwright.config.ts` [VERIFIED: codebase grep] |
| Quick run command | `npm run test:unit -- src/hooks/use-meal-plan.test.ts src/components/generation/meal-detail-flyout.test.tsx src/routes/dev-page.test.tsx` [VERIFIED: codebase grep] |
| Full suite command | `npm run test:unit && npm run test:e2e` [VERIFIED: codebase grep] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENRCH-01 | Select multiple draft meals and run batch enrichment | e2e | `npm run test:e2e -- tests/e2e/enrichment-flow.spec.ts` | ❌ Wave 0 |
| ENRCH-02 | Map Spoonacular payload into meal/cache columns | unit | `npm run test:unit -- src/lib/generation/spoonacular-enrichment.test.ts` | ❌ Wave 0 |
| ENRCH-03 | Cache hit skips external call and reuses stored recipe data | unit | `npm run test:unit -- src/lib/generation/spoonacular-enrichment.test.ts` | ❌ Wave 0 |
| ENRCH-04 | Grid updates per meal without page reload | unit + e2e | `npm run test:unit -- src/hooks/use-meal-enrichment.test.ts && npm run test:e2e -- tests/e2e/enrichment-flow.spec.ts` | ❌ Wave 0 |
| ENRCH-05 | Flyout renders image, ingredients, instructions, nutrition, and rationale | unit + e2e | `npm run test:unit -- src/components/generation/meal-detail-flyout.test.tsx && npm run test:e2e -- tests/e2e/enrichment-flow.spec.ts` | Partial |
| DEVT-02 | Usage rows persisted with quota headers and UTC day semantics | unit | `npm run test:unit -- src/lib/generation/spoonacular-usage.test.ts` | ❌ Wave 0 |
| DEVT-04 | `/dev` shows daily summary and per-call breakdown | unit + e2e | `npm run test:unit -- src/routes/dev-page.test.tsx && npm run test:e2e -- tests/e2e/enrichment-flow.spec.ts` | Partial |

### Sampling Rate

- **Per task commit:** `npm run test:unit -- <targeted files>` [VERIFIED: codebase grep]
- **Per wave merge:** `npm run test:unit` [VERIFIED: codebase grep]
- **Phase gate:** `npm run test:unit && npm run test:e2e` [VERIFIED: codebase grep]

### Wave 0 Gaps

- [ ] `tests/e2e/enrichment-flow.spec.ts` — covers ENRCH-01, ENRCH-04, ENRCH-05, DEVT-04
- [ ] `src/lib/generation/spoonacular-enrichment.test.ts` — covers ENRCH-02, ENRCH-03
- [ ] `src/lib/generation/spoonacular-usage.test.ts` — covers DEVT-02, DEVT-04
- [ ] `src/hooks/use-meal-enrichment.test.ts` or equivalent extension of `use-meal-plan.test.ts` — covers local progress and retry orchestration for ENRCH-01 and ENRCH-04
- [ ] Extend `src/components/generation/meal-detail-flyout.test.tsx` — covers enriched flyout rendering and regression of focus trap / no-inline-edit behavior
- [ ] Extend `src/routes/dev-page.test.tsx` — replaces placeholder assertions with real Spoonacular usage UI assertions

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes [VERIFIED: codebase grep] | Supabase Auth JWT passed to the tRPC edge function. [VERIFIED: codebase grep] |
| V3 Session Management | yes [VERIFIED: codebase grep] | Existing authenticated route and Supabase session handling remain the gate for `/plan/:id` and `/dev`. [VERIFIED: codebase grep] |
| V4 Access Control | yes [VERIFIED: codebase grep] | RLS on `meal_plans` and `meals`, plus explicit user-scoped plan lookup in `mealPlan.get` and `meal.regenerate`. [VERIFIED: codebase grep] |
| V5 Input Validation | yes [VERIFIED: codebase grep] | Zod-backed tRPC inputs for new enrichment and dev-tools procedures. [VERIFIED: codebase grep] |
| V6 Cryptography | no direct app-specific crypto [VERIFIED: codebase grep] | Use Supabase-managed secrets and HTTPS transport; do not hand-roll any crypto. [CITED: https://supabase.com/docs/guides/functions] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR on meal enrichment by arbitrary `mealId` | Elevation of Privilege | Load the meal through the caller-scoped Supabase client and fail closed if the row is not owned by the authenticated user. [VERIFIED: codebase grep] |
| Shared-cache poisoning | Tampering | Restrict `spoonacular_cache` writes to service-role code paths and keep authenticated users on read-only access. [VERIFIED: codebase grep] |
| Unsafe third-party recipe match | Tampering | Validate returned ingredients against household allergies/avoidances before saving. [VERIFIED: codebase grep] |
| Quota exhaustion / cost abuse | Denial of Service | Enforce concurrency limits, user-controlled enrichment only, and usage logging based on quota headers. [VERIFIED: codebase grep] [CITED: https://spoonacular.com/food-api/pricing] [CITED: https://spoonacular.com/food-api/docs] |
| Secret exposure | Information Disclosure | Keep Spoonacular API calls server-side in Supabase Edge Functions and read the secret from environment variables. [CITED: https://supabase.com/docs/guides/functions] |

## Sources

### Primary (HIGH confidence)

- `https://spoonacular.com/food-api/docs` - authentication, `includeNutrition`, quota headers, UTC reset behavior, rate-limit documentation
- `https://spoonacular.com/food-api/pricing` - free-plan limits, concurrency, and cache FAQ
- `https://supabase.com/docs/guides/functions` - Edge Functions runtime, environment, and server-side execution model
- `https://supabase.com/docs/guides/functions/dependencies` - `npm:` import guidance and per-function `deno.json` recommendation
- `https://supabase.com/docs/guides/functions/unit-test` - recommended `supabase/functions/tests` layout
- `https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation` - targeted invalidation guidance
- `https://trpc.io/docs/client/react/useQuery` - React Query option compatibility in tRPC
- Local code and planning artifacts listed in the request. [VERIFIED: codebase grep]
- npm registry lookups for `react`, `@tanstack/react-query`, `@trpc/client`, `@trpc/server`, `@supabase/supabase-js`, `vitest`, `@playwright/test`, and `zod`. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)

- `.claude/skills/spike-findings-aimeal-poc/references/spoonacular-enrichment.md` - spike-validated field mapping and title-match landmines. [VERIFIED: codebase grep]
- `.planning/spikes/005-spoonacular-recipe-shape/README.md` - confirmed response-shape examples for ingredients, nutrition, and instructions. [VERIFIED: codebase grep]

### Tertiary (LOW confidence)

- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - The recommended libraries are already in the repo and the current registry versions were verified during this session. [VERIFIED: codebase grep] [VERIFIED: npm registry]
- Architecture: MEDIUM - The local integration points are clear, but the cache-retention policy conflict and the exact flyout payload shape still need a product decision. [VERIFIED: codebase grep] [CITED: https://spoonacular.com/food-api/pricing]
- Pitfalls: HIGH - The biggest risks are directly evidenced by current code, current official docs, or both. [VERIFIED: codebase grep] [CITED: https://spoonacular.com/food-api/docs]

**Research date:** 2026-04-22
**Valid until:** 2026-04-29 for Spoonacular pricing/policy facts; 2026-05-22 for repo-structure facts. [CITED: https://spoonacular.com/food-api/pricing] [VERIFIED: codebase grep]
