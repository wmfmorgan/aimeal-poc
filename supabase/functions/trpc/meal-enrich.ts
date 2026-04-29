import {
  mealTypeToSpoonacularType,
  type HouseholdRestrictions,
  type SearchHints,
} from "../_shared/spoonacular-mappings.ts";

export type SearchableMeal = {
  title: string;
  meal_type: string;
  search_hints: SearchHints | null;
};

export function buildSearchAndEnrichParams(
  meal: SearchableMeal,
  household: HouseholdRestrictions,
  retryWithRelaxedFilters = false,
): Record<string, string> {
  const hints = meal.search_hints;
  const params: Record<string, string> = {
    query: meal.title,
    number: "1",
    instructionsRequired: "true",
    sort: "popularity",
    addRecipeInformation: "true",
    addRecipeNutrition: "true",
  };

  if (household.diet) {
    params.diet = household.diet;
  }

  if (household.intolerances.length > 0) {
    params.intolerances = household.intolerances.join(",");
  }

  const excludeIngredients = [
    ...new Set([
      ...household.excludeIngredients,
      ...(hints?.excludeIngredients ?? []),
    ]),
  ];
  if (excludeIngredients.length > 0) {
    params.excludeIngredients = excludeIngredients.join(",");
  }

  if (hints?.includeIngredients.length) {
    params.includeIngredients = hints.includeIngredients.join(",");
  }

  if (hints?.cuisine) {
    params.cuisine = hints.cuisine;
  }

  const typeValue = hints?.type ?? mealTypeToSpoonacularType(meal.meal_type);
  if (typeValue) {
    params.type = typeValue;
  }

  if (!retryWithRelaxedFilters) {
    if (household.equipment.length > 0) {
      params.equipment = household.equipment.join(",");
    }

    const timeCap =
      hints?.maxReadyTime != null && household.maxReadyTime != null
        ? Math.min(hints.maxReadyTime, household.maxReadyTime)
        : (hints?.maxReadyTime ?? household.maxReadyTime);

    if (timeCap != null) {
      params.maxReadyTime = String(timeCap);
    }
  }

  return params;
}

export function buildSearchEndpoint(
  retryWithRelaxedFilters: boolean,
  noResult = false,
): string {
  const suffix = retryWithRelaxedFilters ? "&retryRelaxed" : "";
  return noResult
    ? `recipes/complexSearch?addRecipeInformation${suffix}&noResult`
    : `recipes/complexSearch?addRecipeInformation${suffix}`;
}
