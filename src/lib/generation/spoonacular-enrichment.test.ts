import { describe, expect, it } from "vitest";

import {
  buildEnrichedMealPatch,
  getInstructionSteps,
  isRecipeCached,
} from "./spoonacular-enrichment";

describe("spoonacular enrichment helpers", () => {
  it("extracts cleaned instruction steps from analyzed instructions", () => {
    expect(
      getInstructionSteps({
        analyzedInstructions: [
          {
            steps: [
              { step: " Chop the aromatics. " },
              { step: "" },
              {},
              { step: "Simmer until glossy." },
            ],
          },
        ],
        instructions: ["Fallback"],
      })
    ).toEqual(["Chop the aromatics.", "Simmer until glossy."]);
  });

  it("falls back to the instruction list when analyzed instructions are missing", () => {
    expect(
      getInstructionSteps({
        analyzedInstructions: null,
        instructions: [" Toast buns. ", "", "Build the sandwiches."],
      })
    ).toEqual(["Toast buns.", "Build the sandwiches."]);
  });

  it("builds an enriched meal patch with only approved recipe fields", () => {
    expect(
      buildEnrichedMealPatch({
        id: 4242,
        extendedIngredients: [{ original: "2 tbsp olive oil" }],
        nutrition: { nutrients: [{ name: "Calories", amount: 510 }] },
        analyzedInstructions: [{ steps: [{ step: "Roast the vegetables." }] }],
        image: "https://img.example/4242.jpg",
      })
    ).toEqual({
      status: "enriched",
      spoonacular_recipe_id: 4242,
      ingredients: [{ original: "2 tbsp olive oil" }],
      nutrition: { nutrients: [{ name: "Calories", amount: 510 }] },
      instructions: ["Roast the vegetables."],
      image_url: "https://img.example/4242.jpg",
    });
  });

  it("fails closed for malformed recipe fields", () => {
    expect(
      buildEnrichedMealPatch({
        id: 101,
        extendedIngredients: "bad-shape",
        nutrition: ["also-bad"],
        analyzedInstructions: [{ steps: [{ step: "   " }] }],
        image: "   ",
      })
    ).toEqual({
      status: "enriched",
      spoonacular_recipe_id: 101,
      ingredients: null,
      nutrition: null,
      instructions: null,
      image_url: null,
    });
  });

  it("treats a fully populated cached recipe as reusable", () => {
    expect(
      isRecipeCached({
        spoonacular_recipe_id: 11,
        ingredients: [{ original: "1 onion" }],
        nutrition: { nutrients: [] },
        instructions: ["Cook gently."],
        image_url: "https://img.example/11.jpg",
      })
    ).toBe(true);
  });

  it("rejects incomplete cache records", () => {
    expect(
      isRecipeCached({
        spoonacular_recipe_id: 11,
        ingredients: [{ original: "1 onion" }],
        nutrition: null,
        instructions: ["Cook gently."],
        image_url: "https://img.example/11.jpg",
      })
    ).toBe(false);
  });
});
