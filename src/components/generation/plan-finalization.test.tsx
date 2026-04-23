import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FavoritesPanel } from "@/components/generation/FavoritesPanel";
import { PlanFinalizationCard } from "@/components/generation/PlanFinalizationCard";
import { ShoppingListPanel } from "@/components/generation/ShoppingListPanel";
import type { PersistedMealPlan } from "@/lib/generation/types";

const writeText = vi.fn();

beforeEach(() => {
  writeText.mockReset();
  Object.assign(navigator, {
    clipboard: {
      writeText,
    },
  });
});

function makePlan(overrides: Partial<PersistedMealPlan> = {}): PersistedMealPlan {
  return {
    id: "plan-1",
    title: "Weeknight plan",
    numDays: 2,
    mealTypes: ["dinner"],
    generation_status: "draft",
    shopping_list: null,
    meals: [],
    ...overrides,
  };
}

describe("Plan finalization surfaces", () => {
  it("renders the finalize warning copy for draft plans", () => {
    render(
      <PlanFinalizationCard
        plan={makePlan()}
        enrichedCount={2}
        draftCount={1}
        onFinalize={vi.fn()}
        onViewShoppingList={vi.fn()}
        onOpenFavorites={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Finalize plan" })).toBeInTheDocument();
    expect(
      screen.getByText("Draft meals will be removed from this finalized plan. Only enriched meals will be kept.")
    ).toBeInTheDocument();
  });

  it("swaps into the finalized-state CTA when the plan is finalized", () => {
    render(
      <PlanFinalizationCard
        plan={makePlan({ generation_status: "finalized", shopping_list: [] })}
        enrichedCount={2}
        draftCount={0}
        onFinalize={vi.fn()}
        onViewShoppingList={vi.fn()}
        onOpenFavorites={vi.fn()}
      />
    );

    expect(screen.getByText("Your shopping list is ready.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View shopping list" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Finalize plan" })).not.toBeInTheDocument();
  });

  it("renders grouped shopping-list items and copy feedback", async () => {
    writeText.mockResolvedValue(undefined);

    render(
      <ShoppingListPanel
        isOpen
        groups={[
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
        ]}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy shopping list" }));

    expect(screen.getByText("Produce")).toBeInTheDocument();
    expect(screen.getByText("Tomato")).toBeInTheDocument();
    expect(writeText).toHaveBeenCalled();
    expect(await screen.findByText("Shopping list copied")).toBeInTheDocument();
  });

  it("renders a calm favorites empty state", () => {
    render(<FavoritesPanel isOpen favorites={[]} onClose={vi.fn()} />);

    expect(screen.getAllByText("Favorites library")).toHaveLength(2);
    expect(screen.getByText("No saved recipes yet")).toBeInTheDocument();
  });
});
