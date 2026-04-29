-- Phase 9.1 follow-up: persist Spoonacular request/response snapshots for dev diagnostics
-- Stores a redacted request summary and the raw response payload for recent usage entries.

alter table public.spoonacular_usage
  add column if not exists request_text text,
  add column if not exists response_text text;

comment on column public.spoonacular_usage.request_text is
  'Redacted Spoonacular request summary used for dev diagnostics.';

comment on column public.spoonacular_usage.response_text is
  'Raw Spoonacular response payload used for dev diagnostics.';
