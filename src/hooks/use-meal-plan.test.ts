import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildMealPlanSlotKey, buildMealPlanSlots } from "@/lib/generation/plan-slots";
import type { PersistedMeal, PersistedMealPlan } from "@/lib/generation/types";
import { useLatestMealPlan, useMealPlan } from "@/hooks/use-meal-plan";

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
// React Query hook tests (Task 2)
// ---------------------------------------------------------------------------

const mockQuery = vi.fn();

vi.mock("@/lib/trpc/client", () => ({
  trpcClient: {
    query: (...args: unknown[]) => mockQuery(...args),
  },
}));

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useLatestMealPlan — queries the latest meal plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no plan exists", async () => {
    mockQuery.mockResolvedValue(null);
    const { result } = renderHook(() => useLatestMealPlan(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.latestPlanId).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockQuery).toHaveBeenCalledWith("mealPlan.latest");
  });

  it("returns the plan id when a latest plan exists", async () => {
    mockQuery.mockResolvedValue({ id: "plan-abc-123" });
    const { result } = renderHook(() => useLatestMealPlan(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.latestPlanId).toBe("plan-abc-123");
    expect(result.current.error).toBeNull();
  });
});

describe("useMealPlan — queries a persisted meal plan by id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  const persistedPlan: PersistedMealPlan = {
    id: "plan-xyz-456",
    title: "7-day plan",
    numDays: 1,
    mealTypes: ["dinner"],
    meals: [
      {
        id: "meal-uuid-1",
        day_of_week: "Monday",
        meal_type: "dinner",
        title: "Pasta Primavera",
        short_description: "Seasonal vegetables with pasta.",
        rationale: "Light and seasonal.",
        status: "draft",
      },
    ],
  };

  it("returns null plan and loading state when no id provided", () => {
    const { result } = renderHook(() => useMealPlan(undefined), {
      wrapper: makeWrapper(),
    });

    expect(result.current.plan).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("queries a persisted meal plan by id", async () => {
    mockQuery.mockResolvedValue(persistedPlan);
    const { result } = renderHook(() => useMealPlan("plan-xyz-456"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.plan).not.toBeNull();
    expect(result.current.plan?.id).toBe("plan-xyz-456");
    expect(result.current.plan?.meals).toHaveLength(1);
    expect(result.current.plan?.meals[0].rationale).toBe("Light and seasonal.");
    expect(result.current.error).toBeNull();
    expect(mockQuery).toHaveBeenCalledWith("mealPlan.get", { id: "plan-xyz-456" });
  });

  it("keeps polling until a newly created plan is populated with meals", async () => {
    const initiallyEmptyPlan: PersistedMealPlan = {
      ...persistedPlan,
      meals: [],
    };

    mockQuery
      .mockResolvedValueOnce(initiallyEmptyPlan)
      .mockResolvedValueOnce(persistedPlan);

    const { result } = renderHook(() => useMealPlan("plan-xyz-456"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.plan?.meals).toHaveLength(0);

    await waitFor(() => expect(result.current.plan?.meals).toHaveLength(1), { timeout: 2_500 });
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });
});
