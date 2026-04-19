# PlanPlate (aimeal-poc)

## Project

AI-first weekly meal planner. Single Grok LLM call generates a streaming draft plan; users selectively enrich meals with Spoonacular recipe data.

Planning docs: `.planning/` — see `ROADMAP.md`, `REQUIREMENTS.md`, `PROJECT.md`.

## GSD Workflow

- Before planning a phase: `/gsd-discuss-phase N`
- To plan: `/gsd-plan-phase N`
- To execute: `/gsd-execute-phase N`
- To check progress: `/gsd-progress`

## Skills

- **Spike findings for aimeal-poc** (implementation patterns, constraints, gotchas) → `Skill("spike-findings-aimeal-poc")`

## Key Constraints

- LLM: `grok-4-1-fast-non-reasoning` via `https://api.x.ai/v1` — do NOT use `grok-3-mini`
- Backend: Deno 2 runtime — use `npm:` specifiers, not Node imports
- Supabase local ports: 54331–54339 (configured in `supabase/config.toml`)
- Spoonacular: 50 points/day free plan — cache-first is mandatory
- Streaming required for draft generation — batch response is ~10s (unacceptable)
