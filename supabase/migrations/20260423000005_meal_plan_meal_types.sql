alter table meal_plans
  add column if not exists meal_types text[] not null default '{breakfast,lunch,dinner}';

with distinct_meal_types as (
  select distinct
    meal_plan_id,
    meal_type
  from meals
),
derived_meal_types as (
  select
    meal_plan_id,
    array_agg(
      meal_type
      order by case meal_type
        when 'breakfast' then 1
        when 'lunch' then 2
        when 'dinner' then 3
        else 99
      end
    ) as meal_types
  from distinct_meal_types
  group by meal_plan_id
)
update meal_plans
set meal_types = derived_meal_types.meal_types
from derived_meal_types
where meal_plans.id = derived_meal_types.meal_plan_id
  and coalesce(array_length(derived_meal_types.meal_types, 1), 0) > 0;
