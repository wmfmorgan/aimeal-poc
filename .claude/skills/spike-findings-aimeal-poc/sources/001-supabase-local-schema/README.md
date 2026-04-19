---
spike: "001"
name: supabase-local-schema
validates: "Given Docker + Supabase CLI, when we run supabase start and apply migrations, then all 7 tables exist with RLS enabled"
verdict: VALIDATED
related: ["002-edge-fn-grok-json", "003-trpc-edge-fn-wiring"]
tags: [supabase, postgres, rls, migrations]
---

# Spike 001: Supabase Local Schema

## What This Validates
Can we stand up a full local Supabase instance with the complete PlanPlate schema
and confirm all tables + RLS policies apply cleanly?

## Prerequisites
- Docker Desktop running
- Supabase CLI installed (`brew install supabase/tap/supabase`)

## How to Run
```bash
# From project root
supabase start

# Once started, apply the migration
supabase db reset

# Verify tables exist
supabase db diff --schema public
```

Or connect directly to confirm:
```bash
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "\dt public.*"
```

## What to Expect
- `supabase start` prints local URLs (API, Studio, DB)
- `supabase db reset` applies the migration with no errors
- `\dt public.*` shows all 7 tables:
  - profiles, households, household_members
  - meal_plans, meals
  - spoonacular_cache, favorite_meals
- Supabase Studio at http://localhost:54323 shows tables with RLS badges

## Results
VALIDATED. `supabase start` ran clean on ports 54331-54337 (offset by 10 to avoid conflict with
existing `wfm-ai-family-mealplanner` instance). Migration applied in first boot. `db diff` returned
"No schema changes found" — all 7 tables exist with RLS enabled. Studio at http://127.0.0.1:54333.

Key finding: port conflict is real when running multiple local Supabase projects. Offset config required.
