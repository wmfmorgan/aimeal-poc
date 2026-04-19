# PlanPlate

## What This Is

PlanPlate is an AI-first weekly meal planner for busy households. A single Grok LLM call generates a personalized 7-day draft plan (21 meals) with titles and rationale in seconds; users then selectively enrich meals they care about with real recipe data, instructions, and nutrition from Spoonacular. The design aesthetic is an editorial-quality culinary journal — premium, calm, and intentional.

## Core Value

Users see a complete draft meal plan in under 2 seconds (via streaming), then stay in control of exactly which meals get enriched with full recipes.

## Requirements

### Validated

- ✓ Supabase local stack configured — ports 54331–54339 (offset to avoid conflicts)
- ✓ Full DB schema deployed — 7 tables with RLS: `profiles`, `households`, `household_members`, `meal_plans`, `meals`, `spoonacular_cache`, `favorite_meals`
- ✓ tRPC v11 router in Deno Edge Function — `endpoint: "/trpc"` strips `/functions/v1/` prefix
- ✓ Grok LLM call via OpenAI-compatible SDK — `grok-4-1-fast-non-reasoning` (batch ~10s; streaming required for < 2s UX)
- ✓ Spoonacular field mapping confirmed — `analyzedInstructions[0].steps[].step` for instructions; cache by `spoonacular_recipe_id` not title
- ✓ Netlify → Supabase proxy pattern confirmed — one `[[redirects]]` rule with `force = true`

### Active

- [ ] Vite + React 19 + TypeScript frontend scaffold with shadcn/ui + Tailwind
- [ ] Auth flow — email/password sign-up, login, session persistence via Supabase Auth
- [ ] Household setup — name, cooking skill level, appliances, dietary preferences/allergies per member
- [ ] `GenerationForm` — collects household config, triggers draft generation
- [ ] Streaming draft generation — Grok → Edge Function → React client (token streaming for < 2s perceived UX)
- [ ] `MealPlanGrid` — 7×3 responsive grid showing draft meals with status chips
- [ ] `MealCard` — title, description, status badge, favorite toggle, regenerate single meal action
- [ ] `MealFlyout` — full recipe view (ingredients, nutrition, instructions, image) for enriched meals
- [ ] Enrich selected meals — Spoonacular two-call flow with cache-first lookup, max 5 concurrent
- [ ] Finalize plan — aggregate + de-duplicate shopping list, store in `meal_plans.shopping_list`
- [ ] Favorite meals — flag meals across plans, persisted to `favorite_meals` table
- [ ] Netlify + Supabase production deploy with GitHub Actions CI

### Out of Scope

- Multi-agent critic / second LLM call for balance scoring — single call sufficient for PoC
- Household sharing / collaborative editing — added post-PoC (v2.0)
- Macro/calorie target input — deferred to v2.5
- AI image generation — deferred to v3.0
- Per-meal LLM calls — explicitly rejected (cost, latency, consistency)
- SSO / OAuth — email/password sufficient for PoC

## Context

**Where we are:** Backend infrastructure is fully spiked and validated. DB schema is deployed locally. tRPC + Grok + Spoonacular patterns all confirmed working. Frontend is not yet scaffolded beyond a stub `main.tsx`.

**Critical UX constraint:** The "< 2 seconds" draft experience requires token streaming from Grok through the Edge Function to the React client. Batch API response takes ~10s — unacceptable for PoC. Streaming architecture is the critical path item.

**Design system:** Stitch project `15134141823727190585` (WFM-AI-MEALPLANNER) defines the visual direction — "High-End Editorial Cookbook" with Newsreader (headlines) + Manrope (UI/labels), sage green primary (`#4A6741`), warm off-white surface (`#faf9f8`), no 1px border lines (spatial separation only), glassmorphism overlays as "vellum effect". Mobile-first.

**LLM model:** `grok-4-1-fast-non-reasoning` via `https://api.x.ai/v1` (OpenAI-compatible). Do NOT use `grok-3-mini` — it's a reasoning model that takes 39s for 21-meal JSON.

**Cost controls:** Spoonacular free tier = 150 calls/day. Cache aggressively by `spoonacular_recipe_id`. User-controlled enrichment (they choose which meals to enrich).

**Hosting:** Frontend on Netlify (auto-deploy), backend on Supabase (Edge Functions + PostgreSQL). Free tier handles 50–100 active PoC users with zero code changes needed for upgrade.

## Constraints

- **LLM**: Grok via xAI API — `grok-4-1-fast-non-reasoning` only (reasoning models are 4× slower)
- **Backend runtime**: Deno 2 (Supabase Edge Functions) — imports use `npm:` specifier, not Node modules
- **Spoonacular**: 150 calls/day free tier — cache-first is non-negotiable
- **Supabase free tier**: 500k Edge invocations/month, 150s max duration — well within budget
- **Port range**: Local Supabase must use 54331–54339 (configured in `supabase/config.toml`)
- **UX**: Draft plan must feel instant — streaming is required architecture, not optional

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single LLM call for full 21-meal plan | Cost, latency, consistency — per-meal agents rejected | — Pending |
| Grok `grok-4-1-fast-non-reasoning` | Reasoning model (grok-3-mini) took 39s in spike | ✓ Good |
| Streaming required for draft UX | Batch response ~10s — violates < 2s UX target | — Pending |
| tRPC v11 + Deno fetch adapter | Confirmed working in spike; `endpoint: "/trpc"` | ✓ Good |
| Spoonacular cache by recipe ID (not title) | Title matching unreliable; IDs are stable | ✓ Good |
| Netlify proxy one-liner | `[[redirects]]` with `force = true` — no env switching | ✓ Good |
| shadcn/ui + Tailwind for UI | Fast DX, matches editorial design system | — Pending |
| Editorial Cookbook design (Stitch) | Premium feel differentiates from utility-first SaaS meal apps | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-19 after initialization*
