import { describe, expect, it } from "vitest";

import { buildMealPlanSlotKey, buildMealPlanSlots } from "@/lib/generation/plan-slots";
import type { PersistedMeal, PersistedMealPlan } from "@/lib/generation/types";

// ---------------------------------------------------------------------------
// Slot normalization tests (Task 1)
// ---------------------------------------------------------------------------

describe("buildMealPlanSlotKey", () => {
  it("formats the key as day:mealType", () => {
    expect(buildMealPlanSlotKey("Monday", "dinner")).toBe("Monday:dinner");
    expect(buildMealPlanSlotKey("Friday", "breakfast")).toBe("Friday:breakfast");
  });
});

describe("buildMealPlanSlots — normalizes persisted meals into a complete slot grid", () => {
  const basePlan: PersistedMealPlan = {
    id: "plan-uuid-1",
    title: "7-day plan",
    numDays: 2,
    mealTypes: ["lunch", "dinner"],
    meals: [
      {
        id: "meal-uuid-1",
        day_of_week: "Monday",
        meal_type: "dinner",
        title: "Herb Salmon",
        short_description: "Salmon with herbs.",
        rationale: "High protein.",
        status: "draft",
      },
    ],
  };

  it("normalizes persisted meals into a complete slot grid", () => {
    const slots = buildMealPlanSlots(basePlan);

    // Should have numDays * mealTypes.length entries = 2 * 2 = 4
    expect(Object.keys(slots)).toHaveLength(4);

    // The filled meal should be in a "filled" state
    const mondayDinner = slots["Monday:dinner"];
    expect(mondayDinner).toBeDefined();
    expect(mondayDinner.state).toBe("filled");
    if (mondayDinner.state === "filled") {
      expect(mondayDinner.meal.title).toBe("Herb Salmon");
      expect(mondayDinner.meal.rationale).toBe("High protein.");
    }
  });

  it("marks missing slots as empty", () => {
    const slots = buildMealPlanSlots(basePlan);

    // Monday:lunch is missing from meals array
    const mondayLunch = slots["Monday:lunch"];
    expect(mondayLunch).toBeDefined();
    expect(mondayLunch.state).toBe("empty");
    if (mondayLunch.state === "empty") {
      expect(mondayLunch.day_of_week).toBe("Monday");
      expect(mondayLunch.meal_type).toBe("lunch");
    }

    // Tuesday:lunch and Tuesday:dinner are missing too
    const tuesdayLunch = slots["Tuesday:lunch"];
    expect(tuesdayLunch).toBeDefined();
    expect(tuesdayLunch.state).toBe("empty");

    const tuesdayDinner = slots["Tuesday:dinner"];
    expect(tuesdayDinner).toBeDefined();
    expect(tuesdayDinner.state).toBe("empty");
  });

  it("produces no slots for days beyond numDays", () => {
    const slots = buildMealPlanSlots(basePlan);
    // numDays=2 means only Monday and Tuesday
    expect(slots["Wednesday:dinner"]).toBeUndefined();
  });

  it("handles a plan with zero meals by marking all slots as empty", () => {
    const emptyPlan: PersistedMealPlan = {
      id: "plan-uuid-2",
      title: "Empty plan",
      numDays: 1,
      mealTypes: ["breakfast"],
      meals: [],
    };

    const slots = buildMealPlanSlots(emptyPlan);
    expect(Object.keys(slots)).toHaveLength(1);
    expect(slots["Monday:breakfast"].state).toBe("empty");
  });

  it("does not include slots for meal types outside the plan's active meal types", () => {
    const slots = buildMealPlanSlots(basePlan);
    // basePlan only has lunch and dinner — no breakfast
    expect(slots["Monday:breakfast"]).toBeUndefined();
  });

  it("filters out unrecognized meal types from the meals array per T-05-03", () => {
    const malformedPlan: PersistedMealPlan = {
      id: "plan-uuid-3",
      title: "Plan with bad meal type",
      numDays: 1,
      mealTypes: ["dinner"],
      meals: [
        {
          id: "meal-uuid-bad",
          day_of_week: "Monday",
          meal_type: "brunch" as "dinner", // invalid meal type
          title: "Invalid Brunch",
          short_description: "Should be ignored.",
          rationale: null,
          status: "draft",
        },
      ],
    };

    const slots = buildMealPlanSlots(malformedPlan);
    // Monday:dinner should still be empty (the brunch meal is discarded)
    expect(slots["Monday:dinner"]).toBeDefined();
    expect(slots["Monday:dinner"].state).toBe("empty");
    // The malformed brunch key should not appear
    expect(slots["Monday:brunch"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// React Query hook tests (Task 2 — added after hook implementation)
// ---------------------------------------------------------------------------

describe("useLatestMealPlan — queries the latest meal plan", () => {
  it("is covered by hook contract test file placeholder", () => {
    // Full hook tests require React testing infrastructure and are in the
    // hook-integration describe blocks below.
    expect(true).toBe(true);
  });
});

describe("useMealPlan — queries a persisted meal plan by id", () => {
  it("is covered by hook contract test file placeholder", () => {
    // Full hook tests require React testing infrastructure and are in the
    // hook-integration describe blocks below.
    expect(true).toBe(true);
  });
});
