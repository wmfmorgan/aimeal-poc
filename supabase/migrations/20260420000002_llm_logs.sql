create table llm_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households on delete set null,
  model text not null,
  prompt text not null,
  response text not null,
  prompt_tokens int,
  completion_tokens int,
  created_at timestamptz default now()
);

alter table llm_logs enable row level security;

create policy "llm_logs: authenticated read" on llm_logs
  for select using (auth.role() = 'authenticated');

create policy "llm_logs: insert own" on llm_logs
  for insert with check (
    household_id in (select id from households where user_id = auth.uid())
  );
