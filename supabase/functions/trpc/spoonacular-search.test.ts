import { describe, expect, it } from "vitest";

import { buildSpoonacularSearchQueries } from "./spoonacular-search";

describe("buildSpoonacularSearchQueries", () => {
  it("keeps the original phrase and adds narrower keyword fallbacks", () => {
    expect(buildSpoonacularSearchQueries("Lemon Chicken Rice Bowls")).toEqual([
      "Lemon Chicken Rice Bowls",
      "lemon chicken",
    ]);
  });

  it("strips generic meal-shape words and keeps useful trailing keywords", () => {
    expect(buildSpoonacularSearchQueries("Salmon Couscous Skillet")).toEqual([
      "Salmon Couscous Skillet",
      "salmon couscous",
    ]);
  });
});
