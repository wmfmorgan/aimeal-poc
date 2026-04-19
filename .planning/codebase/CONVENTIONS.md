# Coding Conventions

**Analysis Date:** 2026-04-19

## Runtime & Language

All backend code runs in **Deno** (Edge Functions), not Node.js. This affects import syntax
throughout:

- Deno-compatible packages use `npm:` specifier: `import { z } from "npm:zod@3"`
- Deno-native packages use `https://deno.land/x/`: `import OpenAI from "https://deno.land/x/openai@v4.69.0/mod.ts"`
- No `package.json` or `node_modules` in edge function directories
- Versions are pinned inline in the import URL — always pin versions explicitly

Frontend uses **TypeScript** with Vite + React 19.

## Naming Patterns

**Files:**
- Edge functions: `index.ts` (one per named function directory under `supabase/functions/`)
- Edge function directories: `kebab-case` (e.g., `generate-draft/`, `trpc/`)
- Frontend components: `PascalCase.tsx` (e.g., `MealPlanGrid.tsx`, `MealCard.tsx`)
- Frontend hooks: `camelCase` prefixed with `use` (e.g., `useGenerateDraft.ts`, `useEnrichMeal.ts`)
- Frontend lib files: `kebab-case.ts` (e.g., `trpc.ts`, `llm-types.ts`)
- DB migrations: `YYYYMMDDHHMMSS_descriptive_name.sql` (e.g., `20260419000001_initial_schema.sql`)

**Functions:**
- Edge function entry: `Deno.serve(async (req) => { ... })`
- Helper builders: `buildXxx` (e.g., `buildUserPrompt`)
- tRPC procedures named after their operation: `generateDraft`, `enrichMeal`, `finalizePlan`

**Variables:**
- camelCase throughout TypeScript
- Constants: `SCREAMING_SNAKE_CASE` for module-level arrays/values (e.g., `DAYS`, `MEAL_TYPES`)

**Types:**
- Exported router type: `export type AppRouter = typeof appRouter`
- Inline type annotations preferred over separate interfaces for small shapes

**Database:**
- Table names: `snake_case` plural (e.g., `meal_plans`, `household_members`)
- Column names: `snake_case` (e.g., `day_of_week`, `short_description`)
- Status enums enforced with `check` constraints (not separate enum types)
- UUIDs via `gen_random_uuid()` for all primary keys except `profiles` (references `auth.users`)

## Code Style

**Formatting:**
- No formatter config file detected — follow Deno's default style (similar to Prettier)
- Single quotes for strings in TypeScript
- Trailing commas in objects/arrays
- Semicolons used

**Linting:**
- No `.eslintrc` or `biome.json` detected — Deno's built-in linter (`deno lint`) is the implied tool

## Import Organization

**Edge Functions (Deno):**
1. External Deno-native packages (`https://deno.land/x/...`)
2. npm specifier packages (`npm:@trpc/server`, `npm:zod`)
3. No local relative imports yet (single-file functions)

**Order in existing code:**
```typescript
// External SDKs first
import OpenAI from "https://deno.land/x/openai@v4.69.0/mod.ts";

// npm packages
import { initTRPC } from "npm:@trpc/server@11";
import { fetchRequestHandler } from "npm:@trpc/server@11/adapters/fetch";
import { z } from "npm:zod@3";
```

## Error Handling

**Pattern in edge functions:**
```typescript
try {
  // happy path
  return new Response(JSON.stringify({ ok: true, ...data }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
} catch (err) {
  return new Response(JSON.stringify({ ok: false, error: String(err) }), {
    status: 500,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
```

- Always return JSON with an `ok: boolean` discriminator
- Errors serialized via `String(err)` — no stack trace leakage
- HTTP status 500 on catch; all headers duplicated in both branches
- CORS headers on every response (both success and error)

**CORS pre-flight:**
```typescript
if (req.method === "OPTIONS") {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type"
    }
  });
}
```
Every edge function must handle `OPTIONS` as the first check before any processing.

## LLM Interaction Patterns

**Grok / structured JSON:**
- Always use `response_format: { type: "json_object" }` — without it, models wrap JSON in markdown
- Temperature `0.7` for creative meal titles; `0.2` for validation tasks
- Use model `grok-4-1-fast-non-reasoning` — reasoning models (`grok-3-mini`) add 30s+ latency
- Prompts stored as module-level `const` strings, not inline
- System prompt specifies exact JSON schema with no-markdown instruction
- Post-LLM validation: check array length + coverage of all days × meal types

**Prompt structure pattern:**
```typescript
const systemPrompt = `...exact schema spec...`;

function buildUserPrompt(config: { /* typed params */ }) {
  return `...templated string...`;
}
```

## Validation Pattern (tRPC + Zod)

```typescript
t.procedure
  .input(
    z.object({
      householdId: z.string().uuid(),
      numDays: z.number().int().min(1).max(14).default(7),
    })
  )
  .mutation(({ input }) => { ... })
```

- All tRPC inputs validated with Zod schemas inline at the procedure definition
- Use specific Zod methods: `.uuid()`, `.int()`, `.min()`, `.max()`, `.default()`
- Never pass unvalidated user input to external services

## Comments

**When to comment:**
- Module-level JSDoc block for edge functions that serve as API endpoints (see `trpc/index.ts`)
- Inline comments for non-obvious decisions (e.g., `// Stub — real implementation calls generate-draft edge function`)
- Spike-era hardcoded values marked explicitly (e.g., `// Hardcoded household config for spike — no auth required`)

**Style:**
- `//` for single-line comments
- `/** ... */` for file-level JSDoc
- No decorative separators

## Performance Conventions

- Track elapsed time for LLM calls: `const start = Date.now()` before call, include `elapsed_ms` in response
- Token usage logged in response: `tokens_used: completion.usage?.total_tokens`
- Spoonacular cache checked before every API call — never call twice for same recipe id
- Max 5 concurrent enrichment calls (free-tier rate limit)

## Database Conventions

**RLS (mandatory on every table):**
```sql
alter table <table> enable row level security;
create policy "<table>: own rows" on <table> for all using (auth.uid() = user_id);
```

**Shared-read table pattern** (e.g., `spoonacular_cache`):
```sql
create policy "spoonacular_cache: read all" on spoonacular_cache for select using (true);
-- Write restricted to service role (no insert/update policy for anon/authenticated)
```

**Policy naming:** `"<table>: <description>"` (e.g., `"meals: own meal plans"`)

**Status fields:** use `text` with `check` constraint, not enum types:
```sql
status text default 'draft' check (status in ('draft','enriched'))
```

**Timestamp defaults:** `created_at timestamptz default now()` on every table.
`updated_at` only on tables that have mutable state (e.g., `meal_plans`).

## Module Design

**Edge Functions:**
- One `index.ts` per function directory
- Single `Deno.serve(...)` call at module level — no named export of handler
- Export `type AppRouter` from tRPC function for client consumption

**tRPC Router:**
- Router defined with `t.router({ ... })` and exported as `appRouter`
- Type exported: `export type AppRouter = typeof appRouter`
- `createContext: () => ({})` for stateless procedures (auth context to be added)

---

*Convention analysis: 2026-04-19*
