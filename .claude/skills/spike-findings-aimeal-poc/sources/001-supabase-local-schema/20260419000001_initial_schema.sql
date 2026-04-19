-- Profiles
create table profiles (
  id uuid primary key references auth.users,
  full_name text,
  created_at timestamptz default now()
);

-- Households
create table households (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  cooking_skill_level text check (cooking_skill_level in ('beginner','intermediate','advanced')),
  appliances jsonb default '[]',
  created_at timestamptz default now()
);

-- Household Members
create table household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households on delete cascade,
  name text not null,
  dietary_preferences text[] default '{}',
  allergies text[] default '{}',
  avoidances text[] default '{}',
  diet_type text,
  created_at timestamptz default now()
);

-- Meal Plans
create table meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  household_id uuid references households not null,
  title text not null,
  start_date date not null,
  num_days int default 7,
  generation_status text default 'draft' check (generation_status in ('draft','enriching','finalized')),
  shopping_list jsonb,
  llm_provider text,
  llm_model text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Meals
create table meals (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid references meal_plans on delete cascade,
  day_of_week text not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner')),
  title text not null,
  short_description text,
  rationale text,
  status text default 'draft' check (status in ('draft','enriched')),
  spoonacular_recipe_id bigint,
  ingredients jsonb,
  nutrition jsonb,
  instructions text[],
  image_url text,
  is_favorite boolean default false,
  llm_provider text,
  tokens_used int,
  created_at timestamptz default now()
);

-- Spoonacular Cache
create table spoonacular_cache (
  spoonacular_recipe_id bigint primary key,
  title text,
  ingredients jsonb,
  nutrition jsonb,
  instructions text[],
  image_url text,
  cached_at timestamptz default now()
);

-- Favorite Meals
create table favorite_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text,
  spoonacular_recipe_id bigint,
  ingredients jsonb,
  nutrition jsonb,
  instructions text[],
  image_url text,
  created_at timestamptz default now()
);

-- RLS: enable on all tables
alter table profiles enable row level security;
alter table households enable row level security;
alter table household_members enable row level security;
alter table meal_plans enable row level security;
alter table meals enable row level security;
alter table spoonacular_cache enable row level security;
alter table favorite_meals enable row level security;

-- RLS policies
create policy "profiles: own row" on profiles for all using (auth.uid() = id);

create policy "households: own rows" on households for all using (auth.uid() = user_id);

create policy "household_members: own household" on household_members for all
  using (household_id in (select id from households where user_id = auth.uid()));

create policy "meal_plans: own rows" on meal_plans for all using (auth.uid() = user_id);

create policy "meals: own meal plans" on meals for all
  using (meal_plan_id in (select id from meal_plans where user_id = auth.uid()));

-- spoonacular_cache is shared read, write only from service role
create policy "spoonacular_cache: read all" on spoonacular_cache for select using (true);

create policy "favorite_meals: own rows" on favorite_meals for all using (auth.uid() = user_id);
