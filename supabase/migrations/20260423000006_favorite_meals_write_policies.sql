create policy "favorite_meals: own rows insert" on favorite_meals
  for insert
  with check (auth.uid() = user_id);

create policy "favorite_meals: own rows update" on favorite_meals
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
