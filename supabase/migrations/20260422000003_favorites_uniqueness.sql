create unique index if not exists favorite_meals_user_recipe_unique
  on favorite_meals (user_id, spoonacular_recipe_id)
  where spoonacular_recipe_id is not null;
