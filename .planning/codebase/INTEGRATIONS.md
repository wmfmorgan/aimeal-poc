# External Integrations

**Analysis Date:** 2026-04-19

## APIs & External Services

**AI / LLM:**
- xAI Grok API - Generates 7-day meal plans (21 meals) as structured JSON
  - SDK/Client: `https://deno.land/x/openai@v4.69.0/mod.ts` (OpenAI-compatible, `baseURL: "https://api.x.ai/v1"`)
  - Auth: `XAI_API_KEY` env var
  - Model: `grok-4-1-fast-non-reasoning` (validated fastest non-reasoning model; ~10s for 21-meal JSON)
  - Calling convention: `response_format: { type: "json_object" }` required; temperature 0.7 for draft generation
  - Multi-provider ready: Strategy + Factory pattern planned; `LLM_PROVIDER=grok` env var controls active provider
  - Future providers: Claude 3.5 Sonnet, GPT-4o-mini (architecture stub only, not implemented)

**Recipe & Nutrition Data:**
- Spoonacular API - Enriches draft meals with real recipe data (ingredients, nutrition, instructions, images)
  - Auth: `SPOONACULAR_API_KEY` env var
  - Base URL: `https://api.spoonacular.com`
  - Two-call enrichment flow per meal:
    1. `GET /recipes/complexSearch?query={title}&number=1` → retrieves `spoonacular_recipe_id`
    2. `GET /recipes/{id}/information?includeNutrition=true` → retrieves full recipe data
  - Field mapping to `spoonacular_cache` table:
    - `spoonacular_recipe_id` ← `info.id`
    - `title` ← `info.title`
    - `image_url` ← `info.image`
    - `ingredients` ← `info.extendedIngredients` (stored as jsonb)
    - `nutrition` ← `info.nutrition.nutrients` (array of 32 nutrients, stored as jsonb)
    - `instructions` ← `info.analyzedInstructions[0].steps[].step` (mapped to `text[]`)
  - Free tier limit: 150 API calls/day — aggressive `spoonacular_cache` caching is mandatory
  - Concurrency cap: max 5 concurrent enrichment calls (per architecture decision)
  - Cache strategy: cache by `spoonacular_recipe_id` (stable), never by LLM-generated title

## Data Storage

**Databases:**
- PostgreSQL 17 (Supabase managed)
  - Connection: Supabase project credentials (local: port 54332)
  - Client: Supabase JS client (frontend, planned); direct Deno Supabase client (Edge Functions, planned)
  - Schema defined in: `supabase/migrations/20260419000001_initial_schema.sql`
  - Tables: `profiles`, `households`, `household_members`, `meal_plans`, `meals`, `spoonacular_cache`, `favorite_meals`
  - RLS: enabled on all tables; policies use `auth.uid()` checks
  - `spoonacular_cache` is shared read (all authenticated users), write-only from service role

**File Storage:**
- Supabase Storage enabled (`file_size_limit = "50MiB"`, S3 protocol enabled)
- No storage buckets defined yet; image URLs from Spoonacular stored as text fields, not re-hosted

**Caching:**
- `spoonacular_cache` PostgreSQL table — primary cost-control mechanism
  - Cache hit check required before every Spoonacular call
  - Records are safe to cache indefinitely (Spoonacular recipe IDs are stable)
  - Cache read policy: `for select using (true)` (all authenticated users can read)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built-in)
  - Implementation: JWT-based; tokens expire in 3600s (1 hour)
  - Refresh token rotation enabled (`enable_refresh_token_rotation = true`)
  - Anonymous sign-ins: disabled
  - Email/password signup: enabled; email confirmations disabled (dev config)
  - SMS/social OAuth: disabled (Apple, Twilio, web3 all set to `enabled = false`)
  - MFA: disabled (TOTP and phone MFA not enabled)
  - Third-party providers configured but disabled: Firebase, Auth0, AWS Cognito, Clerk
  - Local dev: Edge Functions use `--no-verify-jwt` flag to bypass JWT during spike testing

## Monitoring & Observability

**Error Tracking:**
- None configured (planned: Supabase logs + token usage dashboard)

**Logs:**
- Supabase Edge Function logs (built-in Supabase platform logging)
- Token usage tracked per meal in `meals.tokens_used` column and per plan in `meal_plans.llm_model`/`llm_provider`

## CI/CD & Deployment

**Hosting:**
- Frontend: Netlify (global CDN, auto-deploy from Git)
  - Local dev: `netlify dev` on port 8888, proxies to Vite on 5173 + Supabase on 54331
  - Proxy config (planned `netlify.toml`): routes `/functions/v1/*`, `/rest/v1/*`, `/auth/v1/*` to `http://127.0.0.1:54331`
- Backend: Supabase hosted platform (Edge Functions + PostgreSQL + Auth + Realtime)

**CI Pipeline:**
- GitHub Actions (planned): Supabase CLI deploy + Netlify deploy
- Not yet implemented

## Environment Configuration

**Required env vars (Edge Functions):**
- `XAI_API_KEY` - xAI Grok API key
- `SPOONACULAR_API_KEY` - Spoonacular recipe API key
- `LLM_PROVIDER` - Controls active LLM provider (`grok` for PoC)

**Dev-only env vars:**
- `OPENAI_API_KEY` - Supabase Studio AI feature (referenced in `supabase/config.toml`)

**Secrets location:**
- Local dev: `supabase/functions/.env` (not committed to git)
- Production: Supabase Edge Function secrets (set via Supabase CLI or dashboard)

## Webhooks & Callbacks

**Incoming:**
- None configured

**Outgoing:**
- None configured

## Supabase Platform Services Used

| Service | Status | Config |
|---------|--------|--------|
| PostgreSQL (DB) | Active | `supabase/migrations/` |
| Auth | Active | Email/password only; JWT 1hr |
| Edge Functions | Active | Deno 2; `per_worker` hot-reload policy |
| Realtime | Enabled | Light usage planned for live card updates |
| Storage | Enabled | No buckets defined; S3 protocol on |
| Studio | Local dev | Port 54333 |
| Inbucket (email testing) | Local dev | Port 54334 |
| Analytics | Local dev | Postgres backend; port 54337 |

---

*Integration audit: 2026-04-19*
