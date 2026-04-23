import { describe, expect, it } from "vitest";

import { buildShoppingList, buildShoppingListCopy } from "@/lib/generation/shopping-list";
import type { PersistedMeal } from "@/lib/generation/types";

function makeMeal(overrides: Partial<PersistedMeal>): PersistedMeal {
  return {
    id: "meal-1",
    day_of_week: "Monday",
    meal_type: "dinner",
    title: "Test meal",
    short_description: "Meal",
    rationale: null,
    status: "enriched",
    ...overrides,
  };
}

describe("buildShoppingList", () => {
  it("aggregates only enriched ingredient payloads", () => {
    const groups = buildShoppingList([
      makeMeal({
        ingredients: [{ id: 1, name: "Tomato", aisle: "Produce", amount: 2, unit: "", original: "2 tomatoes" }],
      }),
      makeMeal({
        status: "draft",
        ingredients: [{ id: 1, name: "Tomato", aisle: "Produce", amount: 4, unit: "", original: "4 tomatoes" }],
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.items[0]?.quantityLabel).toBe("2");
  });

  it("rolls up compatible quantities and preserves incompatible units", () => {
    const groups = buildShoppingList([
      makeMeal({
        ingredients: [
          { id: 1, name: "Spinach", aisle: "Produce", amount: 2, unit: "cup", original: "2 cups spinach" },
          { id: 1, name: "Spinach", aisle: "Produce", amount: 1.5, unit: "cup", original: "1.5 cups spinach" },
          { id: 1, name: "Spinach", aisle: "Produce", amount: 1, unit: "bag", original: "1 bag spinach" },
        ],
      }),
    ]);

    expect(groups[0]?.items[0]?.quantityLabel).toBe("3.5 cup + 1 bag");
    expect(groups[0]?.items[0]?.quantityDetails).toHaveLength(2);
  });

  it("falls back to Other ingredients when no aisle is present", () => {
    const groups = buildShoppingList([
      makeMeal({
        ingredients: [{ name: "Olive oil", amount: 2, unit: "tbsp", original: "2 tbsp olive oil" }],
      }),
    ]);

    expect(groups[0]?.heading).toBe("Other ingredients");
  });

  it("builds copy-friendly grouped text", () => {
    const copy = buildShoppingListCopy([
      {
        heading: "Produce",
        items: [
          {
            key: "tomato",
            name: "Tomato",
            category: "Produce",
            quantityLabel: "2",
            quantityDetails: [{ amount: 2, unit: null, label: "2" }],
            originalExamples: ["2 tomatoes"],
          },
        ],
      },
    ]);

    expect(copy).toContain("Produce");
    expect(copy).toContain("- Tomato (2)");
  });
});
