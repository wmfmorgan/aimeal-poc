import { describe, expect, it } from "vitest";

import { buildFavoriteRecord, canFavoriteMeal, getFavoriteDisabledReason } from "@/lib/generation/favorites";

describe("favorites helpers", () => {
  it("allows recipe-backed enriched meals only", () => {
    expect(canFavoriteMeal({ status: "enriched", spoonacular_recipe_id: 42 })).toBe(true);
    expect(canFavoriteMeal({ status: "draft", spoonacular_recipe_id: 42 })).toBe(false);
    expect(canFavoriteMeal({ status: "enriched", spoonacular_recipe_id: null })).toBe(false);
  });

  it("returns the draft-meal helper copy for unavailable saves", () => {
    expect(getFavoriteDisabledReason({ status: "draft", spoonacular_recipe_id: 42 })).toBe(
      "Enrich this meal to save it"
    );
  });

  it("builds an upsert-ready favorite record from an enriched meal", () => {
    expect(
      buildFavoriteRecord("user-1", {
        title: "Salmon Bowl",
        status: "enriched",
        spoonacular_recipe_id: 42,
        ingredients: [{ original: "1 salmon fillet" }],
        nutrition: { calories: 520 },
        instructions: ["Roast"],
        image_url: "https://img.example/salmon.jpg",
      })
    ).toEqual({
      user_id: "user-1",
      title: "Salmon Bowl",
      spoonacular_recipe_id: 42,
      ingredients: [{ original: "1 salmon fillet" }],
      nutrition: { calories: 520 },
      instructions: ["Roast"],
      image_url: "https://img.example/salmon.jpg",
    });
  });

  it("throws when trying to favorite a non-eligible meal", () => {
    expect(() =>
      buildFavoriteRecord("user-1", {
        title: "Draft meal",
        status: "draft",
        spoonacular_recipe_id: null,
        ingredients: null,
        nutrition: null,
        instructions: null,
        image_url: null,
      })
    ).toThrow("Enrich this meal to save it");
  });
});
