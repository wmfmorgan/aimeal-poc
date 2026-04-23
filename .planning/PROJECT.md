# PlanPlate

## What This Is

PlanPlate is a shipped AI-first weekly meal-planning PoC for busy households. A single Grok LLM call generates a personalized 7-day draft plan (21 meals) with titles and rationale in seconds; users can then selectively enrich meals with Spoonacular recipe data, manage the weekly plan, finalize a de-duplicated shopping list, and save favorite meals for reuse.

## Core Value

Users see a complete draft meal plan in under 2 seconds (via streaming), then stay in control of exactly which meals get enriched with full recipes.

## Requirements

### Validated

- ✓ Supabase local stack configured — ports 54331–54339 (offset to avoid conflicts)
- ✓ Full DB schema deployed — 7 tables with RLS: `profiles`, `households`, `household_members`, `meal_plans`, `meals`, `spoonacular_cache`, `favorite_meals`
- ✓ tRPC v11 router in Deno Edge Function — `endpoint: "/trpc"` strips `/functions/v1/` prefix
- ✓ Grok LLM call via OpenAI-compatible SDK — `grok-4-1-fast-non-reasoning`
- ✓ Spoonacular field mapping confirmed — `analyzedInstructions[0].steps[].step`; cache by `spoonacular_recipe_id`
- ✓ Netlify → Supabase proxy pattern confirmed — one `[[redirects]]` rule with `force = true`
- ✓ Auth flow — email/password sign-up, login, logout, session persistence, and password reset — v1.0
- ✓ Household setup — members, preferences, appliances, and editing — v1.0
- ✓ Streaming meal-plan draft generation with logged LLM requests — v1.0
- ✓ Persisted weekly meal grid with slot-local regeneration, deletion, and meal flyout — v1.0
- ✓ Spoonacular enrichment with cache-first lookups and `/dev` usage reporting — v1.0
- ✓ Finalization, shopping-list copy, and favorites persistence — v1.0

### Active

- [ ] Production deploy (Netlify + Supabase hosted + GitHub Actions CI) — next milestone candidate
- [ ] Protect `/dev` behind auth or a signed-out redirect contract — backlog `999.3`
- [ ] Reconcile milestone verification workflow with the repo’s `VALIDATION.md` + `UAT.md` evidence model
- [ ] Decide whether the no-inline-edit Phase 5 contract is the permanent product direction and update planning docs accordingly

### Out of Scope

- Multi-agent critic / second LLM call for balance scoring — single call sufficient for PoC
- Household sharing / collaborative editing — added post-PoC (v2.0)
- Macro/calorie target input — deferred to v2.5
- AI image generation — deferred to v3.0
- Per-meal LLM calls — explicitly rejected (cost, latency, consistency)
- SSO / OAuth — email/password sufficient for PoC

## Current State

Shipped `v1.0` on 2026-04-23 as a local-first PoC with 7 completed phases, 28 completed plans, and roughly 12k lines across frontend, backend, and test code. The app now covers the full local user journey from auth through generation, enrichment, finalization, and favorites.

Milestone close accepted three known gaps:

- `/dev` route auth behavior still needs hardening.
- The milestone audit workflow still expects `*-VERIFICATION.md` artifacts rather than the repo’s `VALIDATION.md` + `UAT.md` pattern.
- `PLAN-02` remains a planning-contract mismatch because the shipped app intentionally forbids inline title editing.

## Next Milestone Goals

- Define a deployable hosted milestone (`Netlify` + hosted `Supabase` + CI).
- Harden route and auth behavior for diagnostics surfaces such as `/dev`.
- Clean up planning and verification conventions so future milestone audits match the repo’s actual evidence model.

## Context

**Where we are:** v1.0 is shipped locally. The codebase includes a working React frontend, Supabase-backed edge functions, persisted household and plan data, streaming generation, Spoonacular enrichment, and finalization/favorites flows.

**Critical UX constraint:** The "< 2 seconds" draft experience still depends on token streaming from Grok through the edge function to the React client. That architecture remains non-negotiable for the product feel.

**Design system:** Editorial cookbook direction with Newsreader headlines, Manrope UI text, sage green primary, and warm off-white surfaces. The shipped app preserves that calm, premium tone.

**LLM model:** `grok-4-1-fast-non-reasoning` via `https://api.x.ai/v1` remains the production-path choice for the PoC.

**Cost controls:** Spoonacular remains cache-first and user-driven. Enrichment happens only for selected meals, and usage is visible on `/dev`.

**Hosting:** Local-first v1.0 is complete. Production deployment remains future work for the next milestone.

## Constraints

- **LLM**: Grok via xAI API — `grok-4-1-fast-non-reasoning` only
- **Backend runtime**: Deno 2 (Supabase Edge Functions)
- **Spoonacular**: Cache-first remains non-negotiable
- **Supabase free tier**: Still sufficient for PoC scale
- **Port range**: Local Supabase uses 54331–54339
- **UX**: Draft plan must feel instant — streaming remains required architecture

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single LLM call for full 21-meal plan | Cost, latency, consistency — per-meal agents rejected | ✓ Good |
| Grok `grok-4-1-fast-non-reasoning` | Reasoning model alternatives were too slow | ✓ Good |
| Streaming required for draft UX | Batch response breaks the product feel | ✓ Good |
| tRPC v11 + Deno fetch adapter | Confirmed working in spike and implementation | ✓ Good |
| Spoonacular cache by recipe ID (not title) | Title matching is unreliable; IDs are stable | ✓ Good |
| Netlify proxy one-liner | Simplifies local/frontend environment parity | ✓ Good |
| Tailwind-based editorial UI system | Fast DX with enough flexibility for the cookbook direction | ✓ Good |
| Editorial Cookbook design direction | Premium feel differentiates the product from utility-first meal apps | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition**:
1. Requirements invalidated? Move to Out of Scope with reason.
2. Requirements validated? Move to Validated with phase reference.
3. New requirements emerged? Add to Active.
4. Decisions to log? Add to Key Decisions.
5. "What This Is" still accurate? Update if drifted.

**After each milestone**:
1. Review the shipped product state and refresh Current State.
2. Re-check the core value against real usage and implementation.
3. Audit Out of Scope reasoning.
4. Define the next milestone goals before new planning begins.

---
*Last updated: 2026-04-23 after v1.0 milestone archival*
