import type { FavoriteMealRecord, PersistedMeal } from "./types.ts";

export function canFavoriteMeal(meal: Pick<PersistedMeal, "status" | "spoonacular_recipe_id">): boolean {
  return meal.status === "enriched" && typeof meal.spoonacular_recipe_id === "number";
}

export function getFavoriteDisabledReason(
  meal: Pick<PersistedMeal, "status" | "spoonacular_recipe_id">
): string | null {
  if (meal.status !== "enriched") {
    return "Enrich this meal to save it";
  }

  if (typeof meal.spoonacular_recipe_id !== "number") {
    return "Only recipe-backed meals can be saved";
  }

  return null;
}

export function buildFavoriteRecord(
  userId: string,
  meal: Pick<
    PersistedMeal,
    "title" | "status" | "spoonacular_recipe_id" | "ingredients" | "nutrition" | "instructions" | "image_url"
  >
): FavoriteMealRecord {
  if (!canFavoriteMeal(meal)) {
    throw new Error(getFavoriteDisabledReason(meal) ?? "Meal cannot be saved to favorites.");
  }

  return {
    user_id: userId,
    title: meal.title,
    spoonacular_recipe_id: meal.spoonacular_recipe_id!,
    ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : null,
    nutrition:
      meal.nutrition && typeof meal.nutrition === "object" && !Array.isArray(meal.nutrition)
        ? meal.nutrition
        : null,
    instructions: Array.isArray(meal.instructions) ? meal.instructions : null,
    image_url: meal.image_url ?? null,
  };
}
