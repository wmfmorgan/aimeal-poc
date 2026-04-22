import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MealCard } from "@/components/generation/MealCard";
import { MealPlanGrid } from "@/components/generation/MealPlanGrid";
import type { MealPlanSlot } from "@/lib/generation/types";

const mockDelete = vi.fn();
const mockRegenerate = vi.fn();

function filledSlot(overrides: Partial<Extract<MealPlanSlot, { state: "filled" }>> = {}): Extract<MealPlanSlot, { state: "filled" }> {
  return {
    state: "filled",
    slotKey: "Monday:dinner",
    day_of_week: "Monday",
    meal_type: "dinner",
    meal: {
      id: "meal-1",
      day_of_week: "Monday",
      meal_type: "dinner",
      title: "Herby Salmon Bowls",
      short_description: "Salmon, rice, cucumbers, and yogurt sauce.",
      rationale: "Fast weeknight protein.",
      status: "draft",
    },
    ...overrides,
  };
}

describe("meal plan management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows inline delete confirmation before mutation", async () => {
    render(
      <MealCard
        slot={filledSlot()}
        onDelete={mockDelete}
        onRegenerate={mockRegenerate}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete meal" }));

    expect(screen.getByRole("button", { name: "Keep meal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm delete" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });
  });

  it("deletes a meal into an empty slot", () => {
    const slots: Record<string, MealPlanSlot> = {
      "Monday:dinner": {
        state: "empty",
        slotKey: "Monday:dinner",
        day_of_week: "Monday",
        meal_type: "dinner",
      },
    };

    render(
      <MealPlanGrid
        numDays={1}
        mealTypes={["dinner"]}
        slots={slots}
        onRegenerate={mockRegenerate}
      />
    );

    expect(screen.getAllByText("Open slot")).toHaveLength(2);
    expect(
      screen.getAllByText("This meal was removed. Regenerate this slot to replace it.")
    ).toHaveLength(2);
  });

  it("renders empty slots after deletion", () => {
    const slots: Record<string, MealPlanSlot> = {
      "Monday:dinner": {
        state: "error",
        slotKey: "Monday:dinner",
        day_of_week: "Monday",
        meal_type: "dinner",
        message: "Deletion failed.",
        previous: null,
      },
    };

    render(
      <MealPlanGrid
        numDays={1}
        mealTypes={["dinner"]}
        slots={slots}
        onRegenerate={mockRegenerate}
      />
    );

    expect(screen.getAllByRole("alert")[0]).toHaveTextContent("Deletion failed.");
    expect(screen.getAllByRole("button", { name: "Regenerate meal" }).length).toBeGreaterThan(0);
  });

  it("regenerates a single slot without clearing sibling slots", () => {
    const slots: Record<string, MealPlanSlot> = {
      "Monday:lunch": {
        state: "regenerating",
        slotKey: "Monday:lunch",
        day_of_week: "Monday",
        meal_type: "lunch",
        previous: null,
      },
      "Monday:dinner": filledSlot(),
    };

    render(
      <MealPlanGrid
        numDays={1}
        mealTypes={["lunch", "dinner"]}
        slots={slots}
        onDelete={mockDelete}
        onRegenerate={mockRegenerate}
      />
    );

    expect(screen.getAllByText("Regenerating meal...")).toHaveLength(2);
    expect(screen.getAllByText("Herby Salmon Bowls")).toHaveLength(2);
  });
});
