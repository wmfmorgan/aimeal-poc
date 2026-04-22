---
phase: 06-enrichment-flow
plan: "02"
subsystem: api
tags: [trpc, supabase, spoonacular, react-query, deno, testing]
requires:
  - phase: 06-enrichment-flow
    provides: usage-log table, shared enrichment helpers, persisted meal enrichment fields
provides:
  - Authenticated `meal.enrich` mutation with cache-first behavior
  - `devTools.spoonacularUsage` query
  - Client batch enrichment hook with per-card pending/error state and retry
affects: [plan-page, dev-page, flyout, enrichment-flow]
tech-stack:
  added: [service-role Supabase client usage, Spoonacular fetch integration]
  patterns: [dual-client edge writes, client-fanned single-meal mutations, query invalidation per success]
key-files:
  created:
    - src/hooks/use-meal-enrichment.ts
  modified:
    - supabase/functions/trpc/index.ts
    - src/hooks/use-meal-plan.ts
    - src/hooks/use-meal-enrichment.test.ts
key-decisions:
  - "Edge routing keeps meal ownership checks on the caller-scoped Supabase client while shared cache writes and usage-log inserts go through a service-role client."
  - "Batch enrichment remains a client concern; each selected meal becomes its own mutation so successes can invalidate the plan query immediately without waiting for siblings."
patterns-established:
  - "Usage reporting derives from persisted `spoonacular_usage` rows, not in-memory counters."
  - "Unsafe Spoonacular matches fail at the card level and do not block sibling enrichments."
requirements-completed: [ENRCH-01, ENRCH-02, ENRCH-03, ENRCH-04, DEVT-02]
duration: 54min
completed: 2026-04-22
---

# Phase 06 Plan 02 Summary

**The enrichment flow now has a real server mutation, persisted usage reporting, and a client batch hook that keeps progress and failures local to each meal card.**

## Accomplishments

- Extended the edge-function router with `meal.enrich`, `devTools.spoonacularUsage`, service-role cache/usage writes, and persisted-plan reads that include nullable recipe fields.
- Added `useMealEnrichment` as the route-level batch orchestrator for selection, concurrency-limited fan-out, per-meal pending/error state, retry, and live `meal-plan` invalidation.
- Replaced Wave 0 hook todos with real concurrency and partial-failure coverage.

## Verification

- `npx vitest run src/lib/generation/spoonacular-enrichment.test.ts src/lib/generation/spoonacular-usage.test.ts src/hooks/use-meal-enrichment.test.ts`
- `rg -n 'meal\\.enrich|spoonacularUsage|spoonacular_usage' supabase/functions/trpc/index.ts`

## Notes

- `deno check supabase/functions/trpc/index.ts` could not be used as a clean compile gate in this environment because the local Deno setup expects managed npm resolution for `npm:zod@3`. Frontend/unit verification passed, but edge-function type-checking still needs the repo’s Deno config normalized.
- The PoC remains explicitly cache-first. The router records that choice as risk acceptance rather than silently introducing a one-hour cache expiry policy.
