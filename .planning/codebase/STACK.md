# Technology Stack

**Analysis Date:** 2026-04-19

## Languages

**Primary:**
- TypeScript - Frontend (React app) and Edge Function handler logic
- SQL - Database schema and RLS policies (`supabase/migrations/`)

**Secondary:**
- Deno TypeScript - Supabase Edge Functions runtime (not Node.js)
- TOML - Supabase project configuration (`supabase/config.toml`)

## Runtime

**Environment:**
- Browser: Vite dev server / Netlify CDN (React app)
- Backend: Deno 2 (Supabase Edge Functions via `deno_version = 2` in `supabase/config.toml`)
- Database: PostgreSQL 17 (Supabase managed, `major_version = 17` in `supabase/config.toml`)

**Package Manager:**
- Frontend: Not yet bootstrapped (no root `package.json` — project is pre-frontend-scaffold)
- Edge Functions: Deno native imports — no lockfile; modules resolved via `npm:` and `https://deno.land/x/` specifiers

## Frameworks

**Core:**
- React 19 + Vite - Frontend SPA (planned per architecture; not yet scaffolded)
- Supabase Edge Functions (Deno) - All backend API logic lives here
- tRPC v11 - API layer between frontend and Edge Functions; uses fetch adapter

**UI:**
- shadcn/ui - Component library (planned)
- Tailwind CSS - Styling (planned)

**Data Fetching:**
- TanStack Query - Client-side server state and optimistic updates (planned)
- React Router - Client-side routing (planned)

**Validation:**
- Zod v3 - Input validation on tRPC procedures; imported as `npm:zod@3` in Edge Functions

**Build/Dev:**
- Netlify CLI v24.11.1 - Local dev server + proxy to Supabase (`netlify dev`)
- Supabase CLI v2.84.2 - Local Supabase stack + migration management + function serving

## Key Dependencies

**Critical:**
- `npm:@trpc/server@11` + `npm:@trpc/server@11/adapters/fetch` - tRPC server in Deno Edge Functions; confirmed working
- `npm:zod@3` - Schema validation on all tRPC procedure inputs
- `https://deno.land/x/openai@v4.69.0/mod.ts` - OpenAI-compatible SDK used to call xAI Grok API
- Supabase JS client (planned for frontend) - Auth, database queries, realtime subscriptions

**Infrastructure:**
- PostgreSQL 17 (Supabase) - Primary data store; all app state persists here
- Supabase Auth - JWT-based auth; Edge Functions verify JWT unless `--no-verify-jwt` flag used in dev
- Supabase Realtime - Optional live updates to client (enabled in config, light usage planned)
- Supabase Storage - Enabled (`file_size_limit = "50MiB"`); S3 protocol enabled; not actively used yet

## Configuration

**Environment:**
- Edge Function secrets loaded from `supabase/functions/.env` during local dev (not committed)
- Required variables: `XAI_API_KEY`, `SPOONACULAR_API_KEY`, `LLM_PROVIDER`
- Production secrets stored in Supabase Edge Function secrets (dashboard/CLI)
- `OPENAI_API_KEY` referenced in `supabase/config.toml` for Supabase Studio AI (dev only)

**Build:**
- `supabase/config.toml` - Full local Supabase configuration (ports, auth settings, edge runtime)
- `netlify.toml` - Netlify dev proxy rules routing `/functions/v1/*`, `/rest/v1/*`, `/auth/v1/*` to local Supabase on port 54331 (planned; not yet present in repo)
- Migration files: `supabase/migrations/` — timestamped SQL files applied via `supabase db reset`
- Seed file: `supabase/seed.sql` — configured but may be empty

## Platform Requirements

**Development:**
- Docker Desktop (required for `supabase start`)
- Supabase CLI v2.84.2+
- Netlify CLI v24.11.1+
- Deno 2 (managed by Supabase CLI edge runtime)
- Local ports 54330–54339 must be free (offset from Supabase defaults to avoid conflict)

**Production:**
- Frontend: Netlify (auto-deploy from Git, global CDN)
- Backend: Supabase hosted platform (Edge Functions + PostgreSQL + Auth + Realtime)
- CI/CD: GitHub Actions → Supabase CLI deploy + Netlify deploy (planned)
- Free tier: 500k Edge invocations/month, 150s max duration per invocation

---

*Stack analysis: 2026-04-19*
