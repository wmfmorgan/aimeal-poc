import { describe, expect, it } from "vitest";

import { buildSearchAndEnrichParams, buildSearchEndpoint } from "./meal-enrich";

describe("buildSearchAndEnrichParams", () => {
  it("includes hard and soft filters on the first attempt", () => {
    expect(
      buildSearchAndEnrichParams(
        {
          title: "Ginger Chicken Stir-Fry",
          meal_type: "dinner",
          search_hints: {
            cuisine: "thai",
            type: null,
            includeIngredients: ["ginger", "chicken"],
            excludeIngredients: ["peanut"],
            maxReadyTime: 25,
            mainIngredient: "chicken",
          },
        },
        {
          diet: "gluten free",
          intolerances: ["shellfish"],
          excludeIngredients: ["cilantro", "peanut"],
          equipment: ["wok", "blender"],
          maxReadyTime: 60,
        },
      ),
    ).toEqual({
      query: "Ginger Chicken Stir-Fry",
      number: "1",
      instructionsRequired: "true",
      sort: "popularity",
      addRecipeInformation: "true",
      addRecipeNutrition: "true",
      diet: "gluten free",
      intolerances: "shellfish",
      excludeIngredients: "cilantro,peanut",
      includeIngredients: "ginger,chicken",
      cuisine: "thai",
      type: "main course",
      equipment: "wok,blender",
      maxReadyTime: "25",
    });
  });

  it("drops only soft filters on retry", () => {
    expect(
      buildSearchAndEnrichParams(
        {
          title: "Lemon Pasta",
          meal_type: "lunch",
          search_hints: {
            cuisine: "italian",
            type: "main course",
            includeIngredients: ["lemon"],
            excludeIngredients: ["anchovy"],
            maxReadyTime: 15,
            mainIngredient: "pasta",
          },
        },
        {
          diet: null,
          intolerances: ["egg"],
          excludeIngredients: ["anchovy", "walnut"],
          equipment: ["oven"],
          maxReadyTime: 30,
        },
        true,
      ),
    ).toEqual({
      query: "Lemon Pasta",
      number: "1",
      instructionsRequired: "true",
      sort: "popularity",
      addRecipeInformation: "true",
      addRecipeNutrition: "true",
      intolerances: "egg",
      excludeIngredients: "anchovy,walnut",
      includeIngredients: "lemon",
      cuisine: "italian",
      type: "main course",
    });
  });
});

describe("buildSearchEndpoint", () => {
  it("tags first-call, retry, and retry-no-result endpoints distinctly", () => {
    expect(buildSearchEndpoint(false)).toBe("recipes/complexSearch?addRecipeInformation");
    expect(buildSearchEndpoint(true)).toBe("recipes/complexSearch?addRecipeInformation&retryRelaxed");
    expect(buildSearchEndpoint(true, true)).toBe(
      "recipes/complexSearch?addRecipeInformation&retryRelaxed&noResult",
    );
  });
});
