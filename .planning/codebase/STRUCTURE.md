# Codebase Structure

**Analysis Date:** 2026-04-19

## Directory Layout

```
aimeal-poc/                         # Project root
├── main.tsx                        # React entry point (temporary root location)
├── architecture.md                 # Full architecture reference document
├── CLAUDE.md                       # Project instructions for Claude
│
├── supabase/                       # All backend — Supabase managed
│   ├── config.toml                 # Supabase local dev config (ports, auth, storage)
│   ├── migrations/                 # Database schema migrations (timestamped SQL)
│   │   └── 20260419000001_initial_schema.sql
│   ├── functions/                  # Supabase Edge Functions (Deno runtime)
│   │   ├── trpc/                   # tRPC router — primary API entry point
│   │   │   └── index.ts
│   │   └── generate-draft/         # Standalone LLM generation spike
│   │       └── index.ts
│   ├── .branches/                  # Supabase branch metadata
│   ├── .temp/                      # Supabase CLI temp files
│   └── snippets/                   # Supabase Studio SQL snippets
│
├── .planning/                      # GSD planning artifacts (not deployed)
│   ├── codebase/                   # Codebase map documents (this file)
│   └── spikes/                     # Spike experiment results
│       ├── 001-supabase-local-schema/
│       ├── 002-edge-fn-grok-json/
│       ├── 003-trpc-edge-fn-wiring/
│       ├── 004-netlify-supabase-local/  # Has working netlify.toml proxy pattern
│       └── 005-spoonacular-recipe-shape/
│
└── .claude/                        # Claude agent skills
    └── skills/
        └── spike-findings-aimeal-poc/
            ├── SKILL.md            # Skill index
            ├── references/         # Synthesized spike findings by topic
            │   ├── edge-functions-ai.md
            │   ├── local-dev-infrastructure.md
            │   └── spoonacular-enrichment.md
            └── sources/            # Original spike source files
```

## Directory Purposes

**`supabase/functions/`:**
- Purpose: All server-side logic runs here as Deno Edge Functions
- Contains: One subdirectory per function, each with an `index.ts` entry point
- Key files: `trpc/index.ts` (primary API), `generate-draft/index.ts` (LLM spike)
- Naming: kebab-case directory names matching the function URL path segment

**`supabase/migrations/`:**
- Purpose: Ordered SQL files defining the full database schema
- Contains: Timestamped `.sql` files applied in order by `supabase db reset`
- Naming: `YYYYMMDDHHMMSS_descriptive_name.sql`
- Key files: `20260419000001_initial_schema.sql` (all 7 tables + RLS)

**`supabase/functions/_shared/` (planned):**
- Purpose: Shared utilities importable across edge functions (not yet created)
- Will contain: LLM provider factory (`llm/`), Supabase client helper, Zod schemas

**`src/` (planned — not yet created):**
- Purpose: React frontend application
- Will contain: Components, hooks, lib utilities, app routes
- Expected structure per architecture doc:
  ```
  src/
  ├── components/
  │   └── meal-plan/
  │       ├── MealPlanGrid.tsx
  │       ├── MealCard.tsx
  │       ├── MealFlyout.tsx
  │       └── GenerationForm.tsx
  ├── hooks/
  │   ├── useGenerateDraft.ts
  │   ├── useEnrichMeal.ts
  │   └── useFinalizePlan.ts
  ├── lib/
  │   ├── trpc.ts
  │   └── llm-types.ts
  └── app/
      ├── dashboard/
      ├── household/
      └── plan/[id]/
  ```

**`.planning/spikes/004-netlify-supabase-local/`:**
- Purpose: Contains the working `netlify.toml` with validated Netlify dev proxy config
- Key reference for: Setting up frontend proxy to local Supabase (54331 port offset)

## Key File Locations

**Entry Points:**
- `main.tsx`: React application mount (will move to `src/main.tsx` when frontend scaffolded)
- `supabase/functions/trpc/index.ts`: tRPC router — all API procedures
- `supabase/functions/generate-draft/index.ts`: Standalone Grok generation function

**Configuration:**
- `supabase/config.toml`: Local Supabase ports (54331–54339), auth settings, edge runtime config
- `.planning/spikes/004-netlify-supabase-local/`: Reference for `netlify.toml` proxy redirects
- `supabase/functions/.env`: API secrets — `XAI_API_KEY`, `SPOONACULAR_API_KEY` (gitignored, not present in repo)

**Core Logic:**
- `supabase/migrations/20260419000001_initial_schema.sql`: Full DB schema + RLS policies
- `architecture.md`: Authoritative architecture reference (read before implementing anything)

**Skills/Context:**
- `.claude/skills/spike-findings-aimeal-poc/SKILL.md`: Skill index
- `.claude/skills/spike-findings-aimeal-poc/references/edge-functions-ai.md`: Grok + tRPC patterns
- `.claude/skills/spike-findings-aimeal-poc/references/local-dev-infrastructure.md`: Dev setup, ports, Netlify proxy
- `.claude/skills/spike-findings-aimeal-poc/references/spoonacular-enrichment.md`: Field mapping, two-call flow

## Naming Conventions

**Files:**
- Edge function entry points: always `index.ts` inside a named subdirectory
- Migration files: `YYYYMMDDHHMMSS_snake_case_description.sql`
- React components (planned): PascalCase `.tsx` (e.g., `MealPlanGrid.tsx`)
- React hooks (planned): camelCase with `use` prefix (e.g., `useGenerateDraft.ts`)
- Utility modules (planned): camelCase `.ts` (e.g., `trpc.ts`, `llm-types.ts`)

**Directories:**
- Edge functions: kebab-case matching URL path (e.g., `generate-draft`, `trpc`)
- React feature groups (planned): kebab-case (e.g., `meal-plan/`)
- Route segments (planned): kebab-case with `[id]` for dynamic segments

**Database:**
- Tables: `snake_case` plural nouns (e.g., `meal_plans`, `household_members`)
- Columns: `snake_case` (e.g., `spoonacular_recipe_id`, `generation_status`)
- Enum-style check constraints: single-quoted string literals

## Where to Add New Code

**New tRPC procedure:**
- Add to router in `supabase/functions/trpc/index.ts`
- Define Zod input schema inline with `t.procedure.input(z.object({...}))`

**New Edge Function (standalone):**
- Create `supabase/functions/<kebab-name>/index.ts`
- Use `Deno.serve((req) => ...)` as entry point
- Import shared utilities from `supabase/functions/_shared/` (once created)

**New shared utility (across edge functions):**
- Create `supabase/functions/_shared/<module>.ts`
- Import using relative path: `import { ... } from "../_shared/<module>.ts"`

**New React component:**
- Feature components: `src/components/<feature-group>/ComponentName.tsx`
- Shared UI: `src/components/ui/ComponentName.tsx` (shadcn/ui pattern)

**New React hook:**
- `src/hooks/useFeatureName.ts`
- Wraps tRPC mutation/query using TanStack Query patterns

**New database migration:**
- Create `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
- Run `supabase db reset` locally to apply
- Always include RLS enable + policy for any new table

**New route:**
- `src/app/<route-name>/page.tsx` (file-based routing pattern per architecture)

## Special Directories

**`supabase/.branches/`:**
- Purpose: Supabase CLI branch tracking metadata
- Generated: Yes
- Committed: Yes (metadata only, no secrets)

**`supabase/.temp/`:**
- Purpose: Supabase CLI temporary files
- Generated: Yes
- Committed: No (should be gitignored)

**`.planning/`:**
- Purpose: GSD planning artifacts — spikes, codebase maps, phase plans
- Generated: By GSD commands and spike agents
- Committed: Yes — serves as project knowledge base

**`.claude/`:**
- Purpose: Claude agent skills with validated implementation patterns
- Generated: By GSD spike wrap-up command
- Committed: Yes — auto-loaded by Claude during implementation tasks

## Local Dev Setup

**Port assignments (offset from defaults to avoid conflict):**
- API: `54331` (default 54321)
- DB: `54332` (default 54322)
- Studio: `54333` (default 54323)
- Inbucket: `54334` (default 54324)
- Analytics: `54337` (default 54327)
- Pooler: `54339` (default 54329)

**Dev commands:**
```bash
supabase start                                                    # Start local backend
supabase db reset                                                 # Wipe + re-apply migrations
supabase functions serve trpc --env-file supabase/functions/.env --no-verify-jwt
netlify dev                                                       # Start frontend + proxy
```

**Frontend proxy to Supabase:** Netlify `[[redirects]]` routes `/functions/v1/*`, `/rest/v1/*`, `/auth/v1/*` to `http://127.0.0.1:54331`. See `.planning/spikes/004-netlify-supabase-local/` for the working `netlify.toml`.

---

*Structure analysis: 2026-04-19*
