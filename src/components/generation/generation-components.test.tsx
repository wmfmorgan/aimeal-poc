import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { GenerationForm } from "./GenerationForm";
import { MealCard } from "./MealCard";
import { PlanReadyBanner } from "./PlanReadyBanner";
import { StreamErrorBanner } from "./StreamErrorBanner";

const mockNavigate = vi.fn();
const mockMutateAsync = vi.fn();
const mockUseHousehold = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/hooks/use-household", () => ({
  useHousehold: () => mockUseHousehold(),
}));

vi.mock("@/lib/trpc/client", () => ({
  trpcClient: {
    mutation: (...args: unknown[]) => mockMutateAsync(...args),
  },
}));

function renderGenerationForm() {
  const onStartGeneration = vi.fn();

  render(
    <MemoryRouter initialEntries={["/plan/new"]}>
      <GenerationForm onStartGeneration={onStartGeneration} streamState="idle" />
    </MemoryRouter>
  );

  return { onStartGeneration };
}

describe("GenerationForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseHousehold.mockReturnValue({
      household: { id: "household-1" },
      isLoading: false,
      error: null,
    });
  });

  it("renders meal type presets and default day count", () => {
    renderGenerationForm();

    expect(screen.getByRole("button", { name: "Dinner only" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lunch + Dinner" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All three" })).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("updates meal cadence and starts generation after meal plan creation", async () => {
    mockMutateAsync.mockResolvedValue({ id: "plan-123" });
    const { onStartGeneration } = renderGenerationForm();

    fireEvent.click(screen.getByRole("button", { name: "Dinner only" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase days" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase days" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Your Plan →" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        householdId: "household-1",
        numDays: 9,
        mealTypes: ["dinner"],
      });
    });

    expect(onStartGeneration).toHaveBeenCalledWith({
      householdId: "household-1",
      mealPlanId: "plan-123",
      numDays: 9,
      mealTypes: ["dinner"],
    });
    expect(mockNavigate).toHaveBeenCalledWith("/plan/plan-123", { replace: true });
  });

  it("shows an error if no household exists yet", async () => {
    mockUseHousehold.mockReturnValue({
      household: null,
      isLoading: false,
      error: null,
    });

    renderGenerationForm();
    fireEvent.click(screen.getByRole("button", { name: "Generate Your Plan →" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Create your household first so generation has the right constraints."
      );
    });
  });
});

describe("generation display components", () => {
  it("renders meal cards with meal details", () => {
    render(
      <MealCard
        slot={{
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
            rationale: null,
            status: "draft",
          },
        }}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    expect(screen.getByText("dinner")).toBeInTheDocument();
    expect(screen.getByText("Herby Salmon Bowls")).toBeInTheDocument();
    expect(screen.getByText("Salmon, rice, cucumbers, and yogurt sauce.")).toBeInTheDocument();
  });

  it("renders the plan-ready banner", () => {
    render(<PlanReadyBanner />);
    expect(screen.getByRole("alert")).toHaveTextContent("Your plan is ready.");
  });

  it("renders the stream error banner and calls retry", () => {
    const onRetry = vi.fn();

    render(<StreamErrorBanner message="The draft stream stopped before finishing." onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again →" }));

    expect(screen.getByRole("alert")).toHaveTextContent("The draft stream stopped before finishing.");
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
