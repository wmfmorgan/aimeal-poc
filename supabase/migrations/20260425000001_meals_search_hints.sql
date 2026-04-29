-- Phase 9.1: Spoonacular Search Precision — meals.search_hints jsonb
-- Stores the LLM-emitted, server-normalized hint object (cuisine, type,
-- include/exclude ingredients, max_ready_time_min, main_ingredient).
-- Consumed only at enrichment time (Plan 09.1-03). Backwards compatible:
-- existing rows have NULL search_hints and fall through to title-only search.

alter table public.meals
  add column if not exists search_hints jsonb;

comment on column public.meals.search_hints is
  'Server-normalized search hints from LLM draft generation. NULL means no hints; enrichment falls through to title-only.';
