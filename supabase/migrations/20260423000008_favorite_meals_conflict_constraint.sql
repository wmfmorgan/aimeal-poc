drop index if exists public.favorite_meals_user_recipe_unique;

alter table public.favorite_meals
  add constraint favorite_meals_user_recipe_unique
  unique (user_id, spoonacular_recipe_id);
