create or replace function public.finalize_meal_plan(
  target_plan_id uuid,
  shopping_list_payload jsonb
)
returns table (
  meal_plan_id uuid,
  removed_draft_count integer,
  enriched_meal_count integer
)
language plpgsql
as $$
declare
  draft_count integer := 0;
  kept_count integer := 0;
begin
  perform 1
  from meal_plans as mp
  where mp.id = target_plan_id
    and mp.user_id = auth.uid();

  if not found then
    raise exception 'Meal plan not found.';
  end if;

  select count(*)
  into kept_count
  from meals as m
  where m.meal_plan_id = target_plan_id
    and m.status = 'enriched';

  if kept_count = 0 then
    raise exception 'Finalize requires at least one enriched meal.';
  end if;

  delete from meals as m
  where m.meal_plan_id = target_plan_id
    and m.status = 'draft';

  get diagnostics draft_count = row_count;

  update meal_plans as mp
  set generation_status = 'finalized',
      shopping_list = coalesce(shopping_list_payload, '[]'::jsonb),
      updated_at = now()
  where mp.id = target_plan_id
    and mp.user_id = auth.uid();

  return query
  select target_plan_id, draft_count, kept_count;
end;
$$;

grant execute on function public.finalize_meal_plan(uuid, jsonb) to authenticated;
