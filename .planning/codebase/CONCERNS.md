# Codebase Concerns

**Analysis Date:** 2026-04-19

---

## CRITICAL: Architectural Gap

### Streaming Not Implemented — < 2s UX Target Unachievable with Current Approach

- Issue: The architecture's stated goal of "< 2 seconds" for users to see the full meal plan grid is **not achievable** with the current batch LLM call. Spike 002 confirmed the API floor for a 21-meal JSON payload is ~10s minimum, even with the fastest available model.
- Files: `supabase/functions/generate-draft/index.ts`
- Impact: Every user experiences a ~10s spinner before seeing any content. This directly contradicts the core product differentiator: "Users see a complete draft plan in < 2 seconds."
- Measured latencies (from spike 002):
  - `grok-3-mini`: 39s (wrong model — reasoning overhead)
  - `grok-4-fast-non-reasoning`: 13s
  - `grok-4-1-fast-non-reasoning`: 11s
  - `grok-4-1-fast-non-reasoning` without `rationale` field: 9.7s (current best)
- Fix approach: Implement token streaming from Grok → Edge Function → client. Parse the streaming JSON incrementally and render each meal card as its JSON object completes. The batch call is acceptable for PoC with a loading spinner, but streaming is required for production UX. The OpenAI-compatible SDK used already supports `stream: true`.

---

## Tech Debt

### `generate-draft` Edge Function is a Spike Artifact, Not Production Code

- Issue: `supabase/functions/generate-draft/index.ts` is a self-contained spike prototype. It uses a **hardcoded household config** ("The Morgans") and bypasses all auth, database writes, and input validation. It does not accept request parameters, write to Postgres, or check JWT tokens.
- Files: `supabase/functions/generate-draft/index.ts` (lines 53–63)
- Impact: The function cannot be used in production. Shipping it as-is would expose a zero-auth endpoint that generates meal plans for a hardcoded family for any caller.
- Fix approach: Replace with a production `generate-draft` function that: (1) verifies JWT, (2) accepts `householdId` as input, (3) fetches household + members from DB, (4) writes the resulting `meal_plan` and `meals` rows to Postgres, (5) returns the plan ID rather than raw meals.

### `trpc` Edge Function is a Stub with No Real Logic

- Issue: `supabase/functions/trpc/index.ts` contains a `generateDraft` mutation that returns a hardcoded stub response. The comment says "real implementation calls generate-draft edge function" but that wiring does not exist.
- Files: `supabase/functions/trpc/index.ts` (lines 22–32)
- Impact: The tRPC router is non-functional for production use. The `ping` procedure works, but no real mutation is implemented.
- Fix approach: Implement the full tRPC router with actual procedures: `generateDraft`, `enrichMeal`, `finalizePlan`, and CRUD for households/members. Each procedure needs auth context via Supabase JWT verification.

### No Auth Context in tRPC Router

- Issue: The tRPC router uses `createContext: () => ({})` — context is always an empty object. There is no JWT verification, no `supabaseClient` in context, and no user identity available to any procedure.
- Files: `supabase/functions/trpc/index.ts` (line 42)
- Impact: Any procedure that writes to the DB or enforces ownership would have no way to identify the caller. RLS policies would fail or require service role bypass.
- Fix approach: Implement a `createContext` that extracts the `Authorization` header, verifies the JWT with `@supabase/supabase-js`, and returns `{ user, supabaseClient }` for use in procedures.

### `rationale` Field Stored in Schema but Not Generated in Draft

- Issue: The `meals` table has a `rationale text` column (migration line 54), and the architecture doc includes it. However, the spike confirmed that dropping `rationale` from the LLM prompt saves ~30% tokens and reduces latency by ~1s. The draft prompt schema in `generate-draft/index.ts` does not include `rationale`. There is no clear plan for when/how `rationale` gets populated.
- Files: `supabase/migrations/20260419000001_initial_schema.sql` (line 54), `supabase/functions/generate-draft/index.ts` (lines 11–24)
- Impact: `rationale` will always be `null` unless explicitly added to a separate enrichment step. If the architecture relies on showing rationale in `MealFlyout`, it will be empty.
- Fix approach: Either (a) generate `rationale` lazily when the user opens a meal flyout via a separate cheap LLM call, or (b) include it in the draft prompt and accept the token/latency cost, or (c) remove the column if rationale is not a planned feature.

---

## Known Bugs

### `spoonacular_cache` Write Policy Missing — Service Role Required but Not Enforced

- Issue: The migration enables RLS on `spoonacular_cache` and adds only a `for select using (true)` policy. There is no `insert` or `update` policy. The comment says "write only from service role" but there is no documented enforcement mechanism or service role key usage in the edge functions.
- Files: `supabase/migrations/20260419000001_initial_schema.sql` (lines 114)
- Impact: Any edge function using the anon/authenticated role (standard JWT path) cannot write to `spoonacular_cache`. Cache writes will silently fail under RLS unless the function uses the service role key.
- Fix approach: Edge functions performing cache upserts must initialize a Supabase client with `SUPABASE_SERVICE_ROLE_KEY` (not the anon key). Document this requirement. Consider adding an explicit `insert` policy gated on service role or a Postgres function with `security definer`.

### `household_members` Has No `updated_at` Column

- Issue: `household_members` table lacks an `updated_at` column, unlike `meal_plans` which has both `created_at` and `updated_at`. If member dietary preferences or allergies change, there is no timestamp to track when they were last modified.
- Files: `supabase/migrations/20260419000001_initial_schema.sql` (lines 19–28)
- Impact: No audit trail for member changes. If meal plans reference member preferences at generation time, stale data cannot be detected.
- Fix approach: Add `updated_at timestamptz default now()` column and a trigger to auto-update it on row modification.

### `meals` Table Missing `updated_at` Column

- Issue: The `meals` table only has `created_at`. Since meals transition from `draft` → `enriched` status and can be favorited, edited, or regenerated, there is no way to sort or detect recently modified meals.
- Files: `supabase/migrations/20260419000001_initial_schema.sql` (lines 47–65)
- Impact: Cannot display "recently updated" meals or detect stale enrichment data.
- Fix approach: Add `updated_at` with an auto-update trigger, consistent with `meal_plans`.

---

## Security Considerations

### CORS Headers Allow All Origins (`*`) on Spike Functions

- Issue: Both edge functions return `"Access-Control-Allow-Origin": "*"` unconditionally. This is appropriate for spikes but not for production.
- Files: `supabase/functions/generate-draft/index.ts` (lines 47, 85, 96)
- Impact: Any origin can call the functions cross-origin. In production with auth, this is lower risk (JWT still required) but exposes the endpoint surface unnecessarily.
- Fix approach: Restrict CORS to the Netlify production domain and `localhost` for development. Read the allowed origin from an environment variable.

### No Input Sanitization Before Spoonacular Search

- Issue: The architecture doc states "No raw user input sent to Spoonacular without sanitization" (section 9), but no sanitization code exists yet. The planned flow passes LLM-generated meal titles directly to Spoonacular `complexSearch`.
- Files: Not yet implemented (planned in enrichment edge function)
- Impact: LLM-generated titles are not adversarial, but unexpected characters could break URL encoding or return empty search results. Low severity for PoC.
- Fix approach: `encodeURIComponent()` on all query strings (already shown in spike 005 pattern). Add length truncation before passing to Spoonacular.

### Minimum Password Length Set to 6

- Issue: `config.toml` sets `minimum_password_length = 6`, which is the Supabase minimum but below the recommended 8+ characters.
- Files: `supabase/config.toml` (line 175)
- Impact: Weak passwords accepted. Low risk for PoC but should be hardened before production launch.
- Fix approach: Set `minimum_password_length = 8` and consider setting `password_requirements = "lower_upper_letters_digits"`.

### Email Confirmations Disabled

- Issue: `enable_confirmations = false` in `config.toml`. Users can sign up with any email address without verifying they own it.
- Files: `supabase/config.toml` (line 209)
- Impact: Email enumeration and spam signups possible. Acceptable for PoC development but must be enabled before any public launch.
- Fix approach: Set `enable_confirmations = true` and configure SMTP before production.

---

## Performance Bottlenecks

### Batch LLM Call (~10s Floor) with No Progressive Loading

- Problem: The `generate-draft` function makes a single synchronous batch call to Grok and waits for the complete 21-meal JSON before returning anything to the client.
- Files: `supabase/functions/generate-draft/index.ts` (lines 65–73)
- Cause: `response_format: { type: "json_object" }` requires the model to complete the full JSON before returning. Streaming with incremental JSON parsing is the only path around this.
- Improvement path: Switch to `stream: true` on the OpenAI client call. Use a streaming edge function response (`ReadableStream`) to forward tokens to the client. Parse the stream client-side using a partial JSON parser (e.g., `@streamparser/json`) and render meal cards as each JSON object completes.

### Spoonacular Free Tier: 150 API Calls/Day Hard Limit

- Problem: Free Spoonacular plan allows 150 calls/day. Each meal enrichment requires 2 calls (`complexSearch` + `getRecipeInformation`). That is a ceiling of 75 meal enrichments per day across all users before the service fails.
- Files: Not yet implemented (planned enrichment edge function)
- Cause: Free tier constraint.
- Improvement path: Aggressive caching in `spoonacular_cache` is the primary mitigation (already designed). Monitor cache hit rate. Upgrade to paid Spoonacular plan before any real user volume. Consider pre-populating cache with common meals.

### No DB Indexes on Foreign Keys

- Problem: The migration creates foreign key constraints but does not add explicit indexes on `household_id`, `user_id`, `meal_plan_id` columns used in RLS policies and joins.
- Files: `supabase/migrations/20260419000001_initial_schema.sql`
- Cause: Postgres does not auto-index foreign keys. RLS policy subqueries (e.g., `meal_plan_id in (select id from meal_plans where user_id = auth.uid())`) will do sequential scans on small datasets but degrade at scale.
- Improvement path: Add `create index` statements for: `households(user_id)`, `household_members(household_id)`, `meal_plans(user_id)`, `meal_plans(household_id)`, `meals(meal_plan_id)`, `favorite_meals(user_id)`.

---

## Fragile Areas

### Model Name Hardcoded in Edge Function

- Issue: `"grok-4-1-fast-non-reasoning"` is hardcoded in `generate-draft/index.ts`. The architecture specifies `LLM_PROVIDER` as an environment variable and describes a Strategy + Factory pattern for multi-LLM support.
- Files: `supabase/functions/generate-draft/index.ts` (line 66)
- Why fragile: xAI model names change (spike confirmed this — `grok-3-mini` vs `grok-4-1-fast-non-reasoning` are not discoverable by name pattern). If the model is deprecated or renamed, the function breaks silently (returns a 500 or bad JSON).
- Safe modification: Move model name to `Deno.env.get("LLM_MODEL")` with a fallback. Implement the LLM factory pattern from the architecture. Log `llm_model` to `meal_plans.llm_model` column (already exists in schema).

### `generateDraft` Validation is Minimal and Not Allergy-Aware

- Issue: The spike's validation in `generate-draft/index.ts` only checks that exactly 21 meals exist with correct day/type combinations (lines 80–82). The architecture specifies a "Post-LLM validation layer (rejects forbidden ingredients)" but this is not implemented.
- Files: `supabase/functions/generate-draft/index.ts` (lines 80–82)
- Why fragile: If Grok ignores an allergy constraint (possible at temperature 0.7), the unsafe meal passes through to the user without any server-side rejection.
- Safe modification: After parsing the LLM response, cross-reference each meal's `title` and `short_description` against the household members' `allergies` array using keyword matching. Reject and retry (up to N times) if a forbidden ingredient is detected.

### `complexSearch` Returns Approximate Title Match

- Issue: Spoonacular's `complexSearch` does fuzzy title matching. Searching for "Chicken Stir Fry" may return "Ginger Chicken Stir-Fry with Peanuts" — which could contain an allergen not in the original LLM-generated meal title.
- Files: Not yet implemented (planned enrichment edge function)
- Why fragile: A user with a peanut allergy could receive enriched recipe data containing peanuts, even though the LLM-generated draft correctly excluded peanuts.
- Safe modification: After fetching Spoonacular recipe data, validate `extendedIngredients` against household allergen lists before writing to DB or displaying. Surface a warning if enrichment returns a potentially unsafe recipe.

### tRPC Endpoint Path is Silently Wrong if Function is Renamed

- Issue: The `endpoint: "/trpc"` in the fetch handler is coupled to the Supabase function directory name `trpc/`. If the function is renamed (e.g., to `api`), the endpoint path must be manually updated or all tRPC calls return 404 with no clear error.
- Files: `supabase/functions/trpc/index.ts` (line 39)
- Why fragile: Spike 003 confirmed that using the wrong path produces `"No procedure found on path \"\""` — a confusing error that doesn't indicate the root cause.
- Safe modification: Document this coupling in a comment. Add a `ping` health check to the CI/CD pipeline that catches path mismatches before deployment.

---

## Scaling Limits

### Supabase Free Tier Edge Function Constraints

- Current capacity: 500k edge function invocations/month, 150s max duration per invocation.
- Limit: At ~10s per draft generation, supports ~1,500 daily generations before approaching limits. Spoonacular's 150 calls/day is the binding constraint well before this.
- Scaling path: Upgrade to Supabase Pro ($25/month) for 2M invocations. Upgrade Spoonacular plan for higher API quotas. No code changes required per architecture design.

### Single Supabase Project Hosts All Functions

- Current: All edge functions (`generate-draft`, `trpc`) live in one Supabase project. Cold starts are shared.
- Limit: Edge function cold starts on Deno can add 500–1500ms to the first request after idle. With Supabase Free tier, functions may be more frequently cold.
- Scaling path: Supabase Pro reduces cold start frequency. No architectural change needed.

---

## Dependencies at Risk

### Supabase CLI Version Pinned at v2.84.2 (Outdated)

- Risk: Spike 001 tested with CLI v2.84.2, but v2.90.0 was available at test time. Production deployments should not use a pinned-but-outdated CLI version.
- Impact: Missing bug fixes, potential incompatibilities with `supabase/config.toml` features used in newer versions.
- Migration plan: Update to latest stable CLI before production deploy. Test `supabase db diff` and `supabase functions deploy` after updating. No schema changes expected.

### OpenAI Deno SDK Pinned at v4.69.0 via URL Import

- Risk: `https://deno.land/x/openai@v4.69.0/mod.ts` is a URL-pinned import with no lockfile enforced in the edge function. deno.land/x is a community registry with availability concerns.
- Files: `supabase/functions/generate-draft/index.ts` (line 1)
- Impact: If deno.land/x has an outage or the package is removed, the function fails to deploy.
- Migration plan: Switch to `npm:openai@4.69.0` (npm specifier) which is the Deno-recommended approach for npm packages in Deno 2. This also aligns with how tRPC is imported in the `trpc` function (`npm:@trpc/server@11`).

### xAI Model Names Are Opaque and Volatile

- Risk: xAI model names do not follow a stable versioning convention (e.g., `grok-4-1-fast-non-reasoning` vs `grok-4-fast-non-reasoning`). New models are added and old ones may be deprecated without public notice.
- Impact: Hardcoded model name breaks silently if deprecated. Wrong model selected (e.g., `grok-3-mini`) causes 39s latency instead of ~10s.
- Migration plan: Verify available models via `GET https://api.x.ai/v1/models` before each production release. Store model name in environment variable `LLM_MODEL` so it can be changed without a code deploy.

---

## Missing Critical Features

### No Frontend Exists

- Problem: The entire frontend described in `architecture.md` (section 7) — `MealPlanGrid`, `MealCard`, `MealFlyout`, `GenerationForm`, all tRPC hooks — does not exist in the repository. There is no `src/` directory.
- Blocks: Everything user-facing. The PoC cannot be demonstrated to users without a frontend.

### No Enrichment Edge Function

- Problem: The `enrichSelectedMeals` workflow (architecture section 6, step 3) — which calls Spoonacular and writes enriched data to `meals` and `spoonacular_cache` — has no implementation. Spike 005 validated the API shape but no edge function was written.
- Blocks: Users cannot get real recipe data, ingredients, nutrition, or instructions.

### No `finalizePlan` Edge Function

- Problem: The shopping list aggregation workflow (architecture section 6, step 4) has no implementation.
- Blocks: Users cannot generate a shopping list from their approved meal plan.

### No `seed.sql` File

- Problem: `supabase/config.toml` references `./seed.sql` (line 65) but the file does not exist. `supabase db reset` logs a warning on every run.
- Files: `supabase/config.toml` (line 65)
- Blocks: Development workflow generates noise. Easily fixed.
- Fix approach: Create an empty `supabase/seed.sql` or populate it with realistic test household/member data.

### No CI/CD Pipeline

- Problem: The architecture describes GitHub Actions for automated deployment (section 10) but no `.github/workflows/` directory exists.
- Blocks: Every deployment is manual. No automated testing or linting on PR.

---

## Test Coverage Gaps

### Zero Tests

- What's not tested: Everything. No test files exist in the repository.
- Files: Entire `supabase/functions/` directory
- Risk: LLM prompt changes, schema migrations, and edge function logic changes have no regression safety net.
- Priority: High — especially for the allergy validation logic (safety-critical) and Spoonacular field mapping (data integrity).

### No Schema Migration Tests

- What's not tested: The migration in `supabase/migrations/20260419000001_initial_schema.sql` has been manually verified via `supabase db diff`, but there are no automated tests confirming RLS policies enforce ownership correctly.
- Risk: A migration error or missing RLS policy could expose one user's meal plans to another.
- Priority: High — RLS correctness is a security requirement.

---

*Concerns audit: 2026-04-19*
