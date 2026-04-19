# Spike Manifest

## Idea
Prove out the PlanPlate architecture end-to-end locally: Supabase (DB + Auth + Edge Functions) +
Netlify CLI + tRPC + Grok LLM + Spoonacular. Validate each integration seam with minimal UI
so the real build starts with zero unknowns.

## Spikes

| # | Name | Validates | Verdict | Tags |
|---|------|-----------|---------|------|
| 001 | supabase-local-schema | All 7 tables + RLS apply cleanly on local Supabase | VALIDATED ✓ | supabase, postgres, rls |
| 002 | edge-fn-grok-json | Edge Function calls Grok → valid 21-meal JSON < 8s | PARTIAL ⚠ | grok, edge-functions, llm |
| 003 | trpc-edge-fn-wiring | tRPC client routes through Edge Function with type safety | VALIDATED ✓ | trpc, edge-functions |
| 004 | netlify-supabase-local | Netlify dev proxies tRPC calls to local Supabase | VALIDATED ✓ | netlify, supabase, proxy |
| 005 | spoonacular-recipe-shape | Spoonacular returns all required fields for enrichment | VALIDATED ✓ | spoonacular, api |
