import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MealDeleteConfirmation } from "@/components/generation/MealDeleteConfirmation";
import { MealDetailFlyout } from "@/components/generation/MealDetailFlyout";
import type { MealPlanSlot } from "@/lib/generation/types";

function makeSlot(): Extract<MealPlanSlot, { state: "filled" }> {
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
      rationale: "Fast weeknight protein with enough leftovers for lunch.",
      status: "draft",
    },
  };
}

function makeEnrichedSlot(): Extract<MealPlanSlot, { state: "filled" }> {
  return {
    ...makeSlot(),
    meal: {
      ...makeSlot().meal,
      status: "enriched",
      image_url: "https://img.example/meal.jpg",
      ingredients: [{ original: "1 cup rice" }, { original: "2 salmon fillets" }],
      instructions: ["Cook the rice.", "Roast the salmon."],
      nutrition: {
        nutrients: [
          { name: "Calories", amount: 520, unit: "kcal" },
          { name: "Protein", amount: 34, unit: "g" },
        ],
      },
    },
  };
}

describe("MealDetailFlyout", () => {
  it("traps focus while open", () => {
    render(
      <MealDetailFlyout
        isOpen
        slot={makeSlot()}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    const closeButton = screen.getByRole("button", { name: "Close" });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(window, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Regenerate meal" })).toHaveFocus();

    fireEvent.keyDown(window, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Delete meal" })).toHaveFocus();

    fireEvent.keyDown(window, { key: "Tab" });
    expect(closeButton).toHaveFocus();
  });

  it("returns focus to the invoking button on close", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "View details";
    document.body.appendChild(trigger);
    trigger.focus();

    const onClose = vi.fn();

    render(
      <MealDetailFlyout
        isOpen
        slot={makeSlot()}
        returnFocusTo={trigger}
        onClose={onClose}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveFocus();
    document.body.removeChild(trigger);
  });

  it("renders the no inline edit regression contract", () => {
    render(
      <MealDetailFlyout
        isOpen
        slot={makeSlot()}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    expect(screen.getByText("Why this fits")).toBeInTheDocument();
    expect(screen.queryByText("Edit title")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("renders enriched recipe content in recipe-first order", () => {
    render(
      <MealDetailFlyout
        isOpen
        slot={makeEnrichedSlot()}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    expect(screen.getByText("Ingredients")).toBeInTheDocument();
    expect(screen.getByText("1 cup rice")).toBeInTheDocument();
    expect(screen.getByText("Instructions")).toBeInTheDocument();
    expect(screen.getByText("Roast the salmon.")).toBeInTheDocument();
    expect(screen.getByText("Nutrition summary")).toBeInTheDocument();
    expect(screen.getByText(/Calories: 520 kcal/)).toBeInTheDocument();
    expect(screen.getByText("Why this fits")).toBeInTheDocument();
  });

  it("shows recipe-backed favorites controls for enriched meals", () => {
    render(
      <MealDetailFlyout
        isOpen
        slot={makeEnrichedSlot()}
        favoriteState="ready"
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
        onSaveFavorite={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Save to favorites" })).toBeInTheDocument();
  });

  it("removes stale edit actions on finalized plans", () => {
    render(
      <MealDetailFlyout
        isOpen
        isFinalized
        slot={makeEnrichedSlot()}
        favoriteState="saved"
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
        onOpenFavorites={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Regenerate meal" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete meal" })).not.toBeInTheDocument();
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open favorites" })).toBeInTheDocument();
  });

  it("renders a star favorite affordance for meals ready to be saved", () => {
    render(
      <MealDetailFlyout
        isOpen
        slot={makeSlot()}
        favoriteState="ready"
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
        onSaveFavorite={vi.fn()}
      />
    );

    const starButton = screen.getByRole("button", { name: "Save to favorites" });
    expect(starButton).toBeInTheDocument();
    // Star button must be an icon button (SVG polygon star), not a text button
    expect(starButton.querySelector("svg polygon")).toBeInTheDocument();
  });

  it("does not render star button when favoriteState is disabled", () => {
    render(
      <MealDetailFlyout
        isOpen
        slot={makeSlot()}
        favoriteState="disabled"
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Save to favorites" })).not.toBeInTheDocument();
  });

  it("does not render star button when favoriteState is saved", () => {
    render(
      <MealDetailFlyout
        isOpen
        slot={makeSlot()}
        favoriteState="saved"
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
        onOpenFavorites={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Save to favorites" })).not.toBeInTheDocument();
  });

  it("star button fires onSaveFavorite when clicked", () => {
    const onSaveFavorite = vi.fn();

    render(
      <MealDetailFlyout
        isOpen
        slot={makeSlot()}
        favoriteState="ready"
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
        onSaveFavorite={onSaveFavorite}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Save to favorites" }));

    expect(onSaveFavorite).toHaveBeenCalledTimes(1);
  });

  it("traps focus and includes star button in Tab cycle when favorite is ready", () => {
    render(
      <MealDetailFlyout
        isOpen
        slot={makeSlot()}
        favoriteState="ready"
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
        onSaveFavorite={vi.fn()}
      />
    );

    const closeButton = screen.getByRole("button", { name: "Close" });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(window, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Regenerate meal" })).toHaveFocus();

    fireEvent.keyDown(window, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Delete meal" })).toHaveFocus();

    fireEvent.keyDown(window, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Save to favorites" })).toHaveFocus();

    fireEvent.keyDown(window, { key: "Tab" });
    expect(closeButton).toHaveFocus(); // wraps back
  });
});

describe("MealDeleteConfirmation", () => {
  it("renders updated copy per UI-SPEC copywriting contract", () => {
    render(
      <MealDeleteConfirmation
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText(/Delete meal: Remove this meal from the plan\? You can regenerate this slot again afterward\./)).toBeInTheDocument();
  });
});
