import { describe, expect, it } from "vitest";

import {
  aggregateHouseholdRestrictions,
  collectEnumDropTelemetry,
  countLoggedEnumDrops,
  CUISINE_ENUM,
  DIET_ENUM,
  EQUIPMENT_ENUM,
  INTOLERANCE_ENUM,
  mealTypeToSpoonacularType,
  normalizeSearchHints,
  TYPE_ENUM,
} from "./spoonacular-mappings";

describe("spoonacular mappings", () => {
  it("contains the locked enum vocabularies", () => {
    expect(CUISINE_ENUM.has("african")).toBe(true);
    expect(CUISINE_ENUM.has("vietnamese")).toBe(true);
    expect(CUISINE_ENUM.has("mediterranean")).toBe(true);
    expect(TYPE_ENUM.has("main course")).toBe(true);
    expect(TYPE_ENUM.has("drink")).toBe(true);
    expect(DIET_ENUM.has("whole30")).toBe(true);
    expect(INTOLERANCE_ENUM.has("tree nut")).toBe(true);
    expect(EQUIPMENT_ENUM.has("blender")).toBe(true);
    expect(EQUIPMENT_ENUM.has("microwave")).toBe(true);
  });

  it("maps meal types to Spoonacular types", () => {
    expect(mealTypeToSpoonacularType("breakfast")).toBe("breakfast");
    expect(mealTypeToSpoonacularType("lunch")).toBe("main course");
    expect(mealTypeToSpoonacularType("dinner")).toBe("main course");
    expect(mealTypeToSpoonacularType("snack")).toBeNull();
  });

  it("aggregates household restrictions with intolerance and equipment filtering", () => {
    expect(
      aggregateHouseholdRestrictions(
        [
          {
            allergies: ["Peanut", " Strawberry "],
            avoidances: ["Cilantro"],
            diet_type: "vegetarian",
          },
          {
            allergies: ["dairy"],
            avoidances: ["cilantro", "liver"],
            diet_type: "vegetarian",
          },
        ],
        ["Blender", "Microwave", "Toaster"],
        "intermediate",
      ),
    ).toEqual({
      diet: "vegetarian",
      intolerances: ["peanut", "dairy"],
      excludeIngredients: ["strawberry", "cilantro", "liver"],
      equipment: ["blender", "microwave"],
      maxReadyTime: 60,
    });
  });

  it("drops diet when members disagree and returns a baseline for empty input", () => {
    expect(
      aggregateHouseholdRestrictions(
        [
          { allergies: [], avoidances: [], diet_type: "vegan" },
          { allergies: [], avoidances: [], diet_type: "paleo" },
        ],
        [],
        "advanced",
      ).diet,
    ).toBeNull();

    expect(aggregateHouseholdRestrictions([], [], "intermediate")).toEqual({
      diet: null,
      intolerances: [],
      excludeIngredients: [],
      equipment: [],
      maxReadyTime: 60,
    });
  });
});

describe("normalizeSearchHints", () => {
  it("returns null when the input is not a record", () => {
    expect(normalizeSearchHints(null)).toBeNull();
    expect(normalizeSearchHints("x")).toBeNull();
    expect(normalizeSearchHints([])).toBeNull();
  });

  it("returns default empty fields for an empty record", () => {
    expect(normalizeSearchHints({})).toEqual({
      cuisine: null,
      type: null,
      includeIngredients: [],
      excludeIngredients: [],
      maxReadyTime: null,
      mainIngredient: null,
    });
  });

  it("normalizes valid cuisine and type values and drops invalid ones", () => {
    expect(normalizeSearchHints({ cuisine: "ITALIAN", type: "main course" })).toEqual({
      cuisine: "italian",
      type: "main course",
      includeIngredients: [],
      excludeIngredients: [],
      maxReadyTime: null,
      mainIngredient: null,
    });

    expect(normalizeSearchHints({ cuisine: "asian fusion", type: "main course (vegetarian)" })).toEqual({
      cuisine: null,
      type: null,
      includeIngredients: [],
      excludeIngredients: [],
      maxReadyTime: null,
      mainIngredient: null,
    });
  });

  it("normalizes snake_case arrays and caps include/exclude counts", () => {
    expect(
      normalizeSearchHints({
        include_ingredients: ["Chicken", " Rice ", "", null, "Broth", "Ginger"],
        exclude_ingredients: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"],
      }),
    ).toEqual({
      cuisine: null,
      type: null,
      includeIngredients: ["chicken", "rice", "broth", "ginger"],
      excludeIngredients: ["a", "b", "c", "d", "e", "f", "g", "h"],
      maxReadyTime: null,
      mainIngredient: null,
    });
  });

  it("accepts the persisted camelCase shape", () => {
    expect(
      normalizeSearchHints({
        cuisine: "mexican",
        type: "main course",
        includeIngredients: [" Chicken ", "Lime"],
        excludeIngredients: ["Peanut"],
        maxReadyTime: 25.7,
        mainIngredient: " Chicken ",
      }),
    ).toEqual({
      cuisine: "mexican",
      type: "main course",
      includeIngredients: ["chicken", "lime"],
      excludeIngredients: ["peanut"],
      maxReadyTime: 25,
      mainIngredient: "chicken",
    });
  });

  it("clamps maxReadyTime and does not coerce string values", () => {
    expect(normalizeSearchHints({ max_ready_time_min: 200 })?.maxReadyTime).toBe(120);
    expect(normalizeSearchHints({ max_ready_time_min: 0 })?.maxReadyTime).toBeNull();
    expect(normalizeSearchHints({ max_ready_time_min: -5 })?.maxReadyTime).toBeNull();
    expect(normalizeSearchHints({ max_ready_time_min: "30" })?.maxReadyTime).toBeNull();
  });
});

describe("enum-drop marker helpers", () => {
  it("collects emitted and dropped enum markers from raw hints", () => {
    expect(
      collectEnumDropTelemetry({
        cuisine: "Asian Fusion",
        type: "main course",
      }),
    ).toEqual({
      totalEmitted: 2,
      dropped: 1,
      markers: ["[[enum-drop:cuisine:asian fusion]]"],
    });
  });

  it("returns zero counts for empty input", () => {
    expect(countLoggedEnumDrops("")).toEqual({ totalEmitted: 0, dropped: 0 });
  });

  it("reads emitted vs dropped counts from the summary footer", () => {
    const logText = [
      "{\"title\":\"X\"}",
      "[[enum-drop:cuisine:asian fusion]]",
      "[[enum-drop:type:main course (vegetarian)]]",
      "[[enum-drop-summary:emitted=5;dropped=2]]",
    ].join("\n");

    expect(countLoggedEnumDrops(logText)).toEqual({
      totalEmitted: 5,
      dropped: 2,
    });
  });

  it("returns zero counts when the summary footer is absent", () => {
    expect(countLoggedEnumDrops("{\"title\":\"X\"}")).toEqual({
      totalEmitted: 0,
      dropped: 0,
    });
  });
});
