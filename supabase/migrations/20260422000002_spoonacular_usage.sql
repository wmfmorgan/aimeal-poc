create table spoonacular_usage (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid references meals on delete set null,
  meal_plan_id uuid references meal_plans on delete set null,
  spoonacular_recipe_id bigint,
  cache_hit boolean not null default false,
  endpoint text not null,
  points_used integer not null default 0,
  quota_request integer,
  quota_used integer,
  quota_left integer,
  usage_date_utc date not null default (timezone('utc', now()))::date,
  created_at timestamptz not null default now()
);

create index spoonacular_usage_usage_date_created_at_idx
  on spoonacular_usage (usage_date_utc, created_at desc);

alter table spoonacular_usage enable row level security;

create policy "spoonacular_usage: read own meal plans" on spoonacular_usage for select
  using (
    meal_plan_id in (
      select id from meal_plans where user_id = auth.uid()
    )
  );

create policy "spoonacular_usage: service role insert" on spoonacular_usage for insert
  with check (auth.role() = 'service_role');
