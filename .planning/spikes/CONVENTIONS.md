# Spike Conventions

Patterns and stack choices established across spike sessions. New spikes follow these
unless the question requires otherwise.

## Stack

- **Backend runtime:** Deno 2 (Supabase Edge Functions). Use `npm:` specifiers, not Node imports.
- **LLM:** `grok-4-1-fast-non-reasoning` via `https://api.x.ai/v1` (OpenAI-compatible client).
  Do NOT use `grok-3-mini` (reasoning model — 39s for the 21-meal payload).
- **Frontend:** Vite + React 19 + tRPC client. Plan-page is the primary surface; `/dev` route
  hosts spike diagnostics and telemetry views.
- **Database:** Supabase Postgres + RLS. Local instance on ports 54331–54339 (configured in
  `supabase/config.toml`).
- **Local dev orchestration:** `netlify dev` on port 8888. Routes Supabase traffic via
  `[[redirects]]` in `netlify.toml`. Do NOT use `npm run dev` (Vite alone) — Supabase routes
  need the Netlify proxy.

## Structure

- **Spike directory:** `.planning/spikes/NNN-descriptive-name/` with `README.md` (frontmatter + body).
- **Source preservation:** runnable spike code lives alongside the README. Wrap-up copies it to
  `.claude/skills/spike-findings-aimeal-poc/sources/NNN-name/`.
- **Research-mode spikes:** for spikes that produce recommendations rather than runnable code,
  the README is the deliverable. `type: research` in frontmatter. No `probe.mjs` or UI.
  Examples: 006, 007, 008.
- **Code-mode spikes:** for feasibility experiments, build the simplest UI/CLI that lets the
  user feel the result. `type: standard` in frontmatter. Examples: 001–005.
- **Comparison spikes:** shared number with letter suffix (`NNN-a-name`, `NNN-b-name`). Build
  back-to-back, then head-to-head verdict. None used yet.
- **Spike numbering:** zero-padded 3-digit (001, 002, ...). Increment from highest existing.
- **Frontmatter contract:** `spike` (string), `name`, `type` (standard/comparison/research),
  `validates` (Given/When/Then), `verdict` (PENDING/VALIDATED/PARTIAL/INVALIDATED), `related`
  (array of spike refs), `tags` (array).

## Patterns

- **NDJSON-per-line streaming for Grok output.** System prompt instructs the model to emit one
  JSON object per line; the edge function buffers on `\n` and forwards each parsed object as
  an SSE event. Validated in spike 002, extended in spike 007 to carry `search_hints`.
- **Two-call API flow → single-call where possible.** Today's `complexSearch` →
  `getRecipeInformation` pattern (spike 005) is being replaced by `complexSearch` with
  `addRecipeInformation+addRecipeNutrition` (spike 008). Going forward, prefer one
  fully-parameterized request over two specialized ones when the API supports it.
- **Server-side enum normalization with drop-on-invalid.** When the LLM emits free-text that
  must match an API enum (cuisine, type, diet), validate against a hardcoded `Set` and drop
  silently if no match. Never coerce. Never throw. Falls back to looser search.
- **Cache-first reads.** `spoonacular_cache` table is checked before any Spoonacular call.
  Cache key is `spoonacular_recipe_id` — never the LLM-generated title (spike 005 landmine:
  `complexSearch` returns title-similar, not title-exact).
- **JWT-scoped DB access via tRPC context.** Authed procedures receive `ctx.userId` and the
  Supabase client is created with the caller's `Authorization` header so RLS policies enforce
  ownership at the DB layer. `serviceSupabase` client used only for telemetry inserts.
- **Telemetry events on every external call.** Each Spoonacular request inserts a
  `spoonacular_usage` row capturing endpoint, points used, quota headers, cache_hit flag.
  Quota headers (`x-api-quota-*`) parsed into structured fields for the dev-page dashboard.
- **Hard vs soft filters in fallback retries.** `intolerances`, `excludeIngredients`, `diet`
  are NEVER relaxed. `equipment`, `maxReadyTime`, `cuisine` may be dropped on a single retry.
  No-match with strict filters is correct UX (regenerate prompt) — relaxing returns recipes
  that violate household constraints.

## Tools & Libraries

- `npm:@trpc/server@11` — fetch adapter, works in Deno (spike 003).
- `npm:@supabase/supabase-js@2` — used in both edge functions and client.
- `npm:zod@3` — input validation for tRPC procedures; also a candidate for response-shape
  validation in future Grok structured-output hardening.
- `https://deno.land/x/openai@v4.69.0/mod.ts` — pinned version. Used as Grok client via
  `baseURL: "https://api.x.ai/v1"`.
- **Avoid:** `grok-3-mini` (reasoning model, too slow), Node-style imports in edge functions
  (use `npm:` specifiers), batch (non-streaming) Grok calls for plan generation (~10s floor,
  unacceptable UX).

## When to deviate

- **Research-mode spikes** skip code, ship a README. Use when the user explicitly says
  "don't change code" or "review and recommend" (e.g. spikes 006–008).
- **Single-spike sessions** can skip the decomposition step if the question is already
  one Given/When/Then. The `--quick` flag does this.
- **Comparison spikes** are right when 2+ credible approaches exist for one question.
  Build both, run head-to-head, pick a winner.
