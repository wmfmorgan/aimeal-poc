import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
});
