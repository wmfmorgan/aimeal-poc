/**
 * plan-page.test.tsx
 *
 * Route-level tests for PlanPage — covering:
 *  - Task 1: Plan nav resolves to the latest saved plan via AppFrame
 *  - Task 2: Persisted plan hydration at /plan/:id
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// ---------------------------------------------------------------------------
// Shared mock state (hoisted so vi.mock factories can reference them)
// ---------------------------------------------------------------------------

const { mockUseLatestMealPlan, mockUseMealPlan, mockUseMealEnrichment, mockUseGenerationStream, mockNavigate } =
  vi.hoisted(() => ({
    mockUseLatestMealPlan: vi.fn(() => ({
      latestPlanId: null,
      isLoading: false,
      error: null,
    })) as any,
    mockUseMealPlan: vi.fn((..._args: unknown[]) => ({
      plan: null,
      isLoading: false,
      error: null,
      refetchPlan: vi.fn().mockResolvedValue({ data: null }),
      deleteMeal: { mutate: vi.fn() },
      regenerateMeal: { mutate: vi.fn() },
      finalizePlan: { mutateAsync: vi.fn(), isPending: false, error: null },
      saveFavorite: { mutateAsync: vi.fn(), isPending: false, error: null },
      favoritesLibrary: [],
      slotMutationStateByKey: {},
    })) as any,
    mockUseMealEnrichment: vi.fn(() => ({
      selectedMealIds: [],
      pendingByMealId: {},
      errorByMealId: {},
      selectMeal: vi.fn(),
      deselectMeal: vi.fn(),
      toggleMealSelection: vi.fn(),
      selectAll: vi.fn(),
      clearSelection: vi.fn(),
      enrichSelectedMeals: vi.fn(),
      retryMeal: vi.fn(),
    })) as any,
    mockUseGenerationStream: vi.fn(() => ({
      slots: {},
      state: "idle",
      error: null,
      startGeneration: vi.fn(),
      reset: vi.fn(),
    })) as any,
    mockNavigate: vi.fn() as any,
  }));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/hooks/use-meal-plan", () => ({
  useLatestMealPlan: () => mockUseLatestMealPlan(),
  useMealPlan: (id: string | undefined) => mockUseMealPlan(id),
}));

vi.mock("@/hooks/use-meal-enrichment", () => ({
  useMealEnrichment: () => mockUseMealEnrichment(),
}));

vi.mock("@/hooks/use-generation-stream", () => ({
  useGenerationStream: () => mockUseGenerationStream(),
}));

// Stub auth for AppFrame
vi.mock("@/lib/auth/auth-state", () => ({
  useAuth: () => ({
    isAuthenticated: false,
    signOut: vi.fn(),
    isPasswordRecovery: false,
    isLoading: false,
    session: null,
    user: null,
  }),
}));

// Stub trpc client to avoid network calls
vi.mock("@/lib/trpc/client", () => ({
  trpcClient: {
    query: vi.fn().mockResolvedValue(null),
  },
}));

// Stub supabase client
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

// Stub GenerationForm to avoid its own deep imports
vi.mock("@/components/generation/GenerationForm", () => ({
  GenerationForm: () => <div data-testid="generation-form">GenerationForm</div>,
}));

// Stub MealPlanGrid — exposes onViewDetails so card-click tests can simulate flyout open
vi.mock("@/components/generation/MealPlanGrid", () => ({
  MealPlanGrid: ({
    slots,
    onViewDetails,
  }: {
    slots: Record<string, unknown>;
    onViewDetails?: (slotKey: string, trigger: HTMLElement) => void;
  }) => (
    <div data-testid="meal-plan-grid">
      {Object.keys(slots).map((key) => (
        <button
          key={key}
          data-testid={`mock-card-${key}`}
          onClick={(e) => onViewDetails?.(key, e.currentTarget)}
        >
          {key}
        </button>
      ))}
    </div>
  ),
}));

// Stub banner components
vi.mock("@/components/generation/PlanReadyBanner", () => ({
  PlanReadyBanner: () => <div data-testid="plan-ready-banner">PlanReadyBanner</div>,
}));

vi.mock("@/components/generation/StreamErrorBanner", () => ({
  StreamErrorBanner: () => <div data-testid="stream-error-banner">StreamErrorBanner</div>,
}));

// ---------------------------------------------------------------------------
// Import subjects AFTER mocks are declared
// ---------------------------------------------------------------------------

import { AppFrame } from "@/app/layout/AppFrame";
import { PlanPage } from "./plan-page";

// ---------------------------------------------------------------------------
// Helper renderers
// ---------------------------------------------------------------------------

function renderAppFrame(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<AppFrame />}>
          <Route index element={<div>Home</div>} />
          <Route path="plan/:id" element={<PlanPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

function renderPlanPage(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/plan/${id}`]}>
      <Routes>
        <Route path="/plan/:id" element={<PlanPage />} />
      </Routes>
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Task 1: Plan nav resolution
// ---------------------------------------------------------------------------

describe("AppFrame — Plan nav resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGenerationStream.mockReturnValue({
      slots: {},
      state: "idle",
      error: null,
      startGeneration: vi.fn(),
      reset: vi.fn(),
    });
  });

  it("routes the Plan nav to the latest saved plan when one exists", async () => {
    mockUseLatestMealPlan.mockReturnValue({
      latestPlanId: "plan-abc-123",
      isLoading: false,
      error: null,
    });

    renderAppFrame("/");

    const planLink = screen.getByRole("link", { name: /plan/i });
    fireEvent.click(planLink);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/plan/plan-abc-123");
    });
  });

  it("routes the Plan nav to /plan/new when no saved plan exists", async () => {
    mockUseLatestMealPlan.mockReturnValue({
      latestPlanId: null,
      isLoading: false,
      error: null,
    });

    renderAppFrame("/");

    const planLink = screen.getByRole("link", { name: /plan/i });
    fireEvent.click(planLink);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/plan/new");
    });
  });

  it("falls back to /plan/new when the latest-plan lookup errors", async () => {
    mockUseLatestMealPlan.mockReturnValue({
      latestPlanId: null,
      isLoading: false,
      error: new Error("Network error"),
    });

    renderAppFrame("/");

    const planLink = screen.getByRole("link", { name: /plan/i });
    fireEvent.click(planLink);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/plan/new");
    });
  });
});

// ---------------------------------------------------------------------------
// Task 2: PlanPage persisted revisit mode
// ---------------------------------------------------------------------------

describe("PlanPage — persisted plan mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGenerationStream.mockReturnValue({
      slots: {},
      state: "idle",
      error: null,
      startGeneration: vi.fn(),
      reset: vi.fn(),
    });
  });

  it("hydrates a persisted meal plan by route id", async () => {
    const persistedPlan = {
      id: "plan-xyz",
      title: "My Weekly Plan",
      numDays: 3,
      mealTypes: ["breakfast", "lunch", "dinner"],
      meals: [
        {
          id: "meal-1",
          day_of_week: "Monday",
          meal_type: "breakfast",
          title: "Oatmeal",
          short_description: "Warm oatmeal",
          rationale: "High fiber",
          status: "draft",
        },
      ],
    };

    mockUseMealPlan.mockReturnValue({
      plan: persistedPlan,
      isLoading: false,
      error: null,
      deleteMeal: { mutate: vi.fn() },
      regenerateMeal: { mutate: vi.fn() },
      finalizePlan: { mutateAsync: vi.fn(), isPending: false, error: null },
      saveFavorite: { mutateAsync: vi.fn(), isPending: false, error: null },
      favoritesLibrary: [],
      slotMutationStateByKey: {},
    });

    renderPlanPage("plan-xyz");

    // Should show the plan title
    await waitFor(() => {
      expect(screen.getByText("My Weekly Plan")).toBeInTheDocument();
    });

    // Should show the MealPlanGrid
    expect(screen.getByTestId("meal-plan-grid")).toBeInTheDocument();
  });

  it("shows Create new plan on a persisted plan", async () => {
    const persistedPlan = {
      id: "plan-xyz",
      title: "My Weekly Plan",
      numDays: 7,
      mealTypes: ["breakfast", "lunch", "dinner"],
      meals: [],
    };

    mockUseMealPlan.mockReturnValue({
      plan: persistedPlan,
      isLoading: false,
      error: null,
      deleteMeal: { mutate: vi.fn() },
      regenerateMeal: { mutate: vi.fn() },
      finalizePlan: { mutateAsync: vi.fn(), isPending: false, error: null },
      saveFavorite: { mutateAsync: vi.fn(), isPending: false, error: null },
      favoritesLibrary: [],
      slotMutationStateByKey: {},
    });

    renderPlanPage("plan-xyz");

    await waitFor(() => {
      expect(screen.getByText("Create new plan")).toBeInTheDocument();
    });
  });

  it("applies the Phase 8 compact shell hierarchy around the persisted grid", async () => {
    const persistedPlan = {
      id: "plan-shell",
      title: "Layout Check Plan",
      numDays: 4,
      mealTypes: ["breakfast", "lunch", "dinner"],
      meals: [],
      generation_status: "draft",
      shopping_list: null,
    };

    mockUseMealPlan.mockReturnValue({
      plan: persistedPlan,
      isLoading: false,
      error: null,
      deleteMeal: { mutate: vi.fn() },
      regenerateMeal: { mutate: vi.fn() },
      finalizePlan: { mutateAsync: vi.fn(), isPending: false, error: null },
      saveFavorite: { mutateAsync: vi.fn(), isPending: false, error: null },
      favoritesLibrary: [],
      slotMutationStateByKey: {},
    });

    renderPlanPage("plan-shell");

    await waitFor(() => {
      expect(screen.getByText("Layout Check Plan")).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Layout Check Plan" }).closest("section")?.className).toContain(
      "px-6 py-6"
    );
    expect(screen.getByTestId("meal-plan-grid").closest("section")?.className).toContain("px-4 py-5");
  });

  it("renders Select meals, Select all, and Enrich selected meals wiring", async () => {
    const selectAll = vi.fn();
    const enrichSelectedMeals = vi.fn();
    const persistedPlan = {
      id: "plan-xyz",
      title: "My Weekly Plan",
      numDays: 1,
      mealTypes: ["dinner"],
      meals: [
        {
          id: "meal-1",
          day_of_week: "Monday",
          meal_type: "dinner",
          title: "Oatmeal",
          short_description: "Warm oatmeal",
          rationale: "High fiber",
          status: "draft",
        },
      ],
    };

    mockUseMealPlan.mockReturnValue({
      plan: persistedPlan,
      isLoading: false,
      error: null,
      deleteMeal: { mutate: vi.fn() },
      regenerateMeal: { mutate: vi.fn() },
      finalizePlan: { mutateAsync: vi.fn(), isPending: false, error: null },
      saveFavorite: { mutateAsync: vi.fn(), isPending: false, error: null },
      favoritesLibrary: [],
      slotMutationStateByKey: {},
    });
    mockUseMealEnrichment.mockReturnValue({
      selectedMealIds: ["meal-1"],
      pendingByMealId: {},
      errorByMealId: {},
      selectMeal: vi.fn(),
      deselectMeal: vi.fn(),
      toggleMealSelection: vi.fn(),
      selectAll,
      clearSelection: vi.fn(),
      enrichSelectedMeals,
      retryMeal: vi.fn(),
    });

    renderPlanPage("plan-xyz");

    fireEvent.click(screen.getByRole("button", { name: "Select meals" }));
    expect(screen.getByRole("button", { name: "Select all" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enrich selected meals" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    expect(selectAll).toHaveBeenCalledWith(["meal-1"]);

    fireEvent.click(screen.getByRole("button", { name: "Enrich selected meals" }));
    expect(enrichSelectedMeals).toHaveBeenCalledTimes(1);
  });

  it("shows a loading state while the persisted plan is fetching", () => {
    mockUseMealPlan.mockReturnValue({
      plan: null,
      isLoading: true,
      error: null,
      deleteMeal: { mutate: vi.fn() },
      regenerateMeal: { mutate: vi.fn() },
      finalizePlan: { mutateAsync: vi.fn(), isPending: false, error: null },
      saveFavorite: { mutateAsync: vi.fn(), isPending: false, error: null },
      favoritesLibrary: [],
      slotMutationStateByKey: {},
    });

    renderPlanPage("plan-xyz");

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows an error state when the persisted plan fails to load", async () => {
    mockUseMealPlan.mockReturnValue({
      plan: null,
      isLoading: false,
      error: new Error("Failed to fetch"),
      deleteMeal: { mutate: vi.fn() },
      regenerateMeal: { mutate: vi.fn() },
      finalizePlan: { mutateAsync: vi.fn(), isPending: false, error: null },
      saveFavorite: { mutateAsync: vi.fn(), isPending: false, error: null },
      favoritesLibrary: [],
      slotMutationStateByKey: {},
    });

    renderPlanPage("plan-xyz");

    await waitFor(() => {
      expect(screen.getByText(/couldn't load/i)).toBeInTheDocument();
    });
  });

  it("shows the GenerationForm when id is 'new'", () => {
    renderPlanPage("new");

    expect(screen.getByTestId("generation-form")).toBeInTheDocument();
  });

  it("does not call useMealPlan when id is 'new'", () => {
    renderPlanPage("new");

    // PlanPage branches before mounting PersistedPlanView, so useMealPlan
    // is never called on the /plan/new path (generation path only).
    expect(mockUseMealPlan).not.toHaveBeenCalled();
  });

  it("hides selection controls once a plan is finalized", async () => {
    const persistedPlan = {
      id: "plan-finalized",
      title: "Finalized plan",
      numDays: 1,
      mealTypes: ["dinner"],
      generation_status: "finalized",
      shopping_list: [],
      meals: [
        {
          id: "meal-1",
          day_of_week: "Monday",
          meal_type: "dinner",
          title: "Salmon",
          short_description: "Roasted salmon",
          rationale: "Fast dinner",
          status: "enriched",
          is_favorite: true,
          spoonacular_recipe_id: 42,
        },
      ],
    };

    mockUseMealPlan.mockReturnValue({
      plan: persistedPlan,
      isLoading: false,
      error: null,
      deleteMeal: { mutate: vi.fn() },
      regenerateMeal: { mutate: vi.fn() },
      finalizePlan: { mutateAsync: vi.fn(), isPending: false, error: null },
      saveFavorite: { mutateAsync: vi.fn(), isPending: false, error: null },
      favoritesLibrary: [],
      slotMutationStateByKey: {},
    });

    renderPlanPage("plan-finalized");

    await waitFor(() => {
      expect(screen.getByText("Your shopping list is ready.")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Select meals" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View shopping list" })).toBeInTheDocument();
  });

  it("returns focus to the plan-level favorites trigger after closing the panel", async () => {
    const persistedPlan = {
      id: "plan-xyz",
      title: "My Weekly Plan",
      numDays: 1,
      mealTypes: ["dinner"],
      generation_status: "draft",
      shopping_list: null,
      meals: [],
    };

    mockUseMealPlan.mockReturnValue({
      plan: persistedPlan,
      isLoading: false,
      error: null,
      deleteMeal: { mutate: vi.fn() },
      regenerateMeal: { mutate: vi.fn() },
      finalizePlan: { mutateAsync: vi.fn(), isPending: false, error: null },
      saveFavorite: { mutateAsync: vi.fn(), isPending: false, error: null },
      favoritesLibrary: [],
      slotMutationStateByKey: {},
    });

    renderPlanPage("plan-xyz");

    const openFavorites = screen.getByRole("button", { name: "Open favorites" });
    fireEvent.click(openFavorites);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(openFavorites).toHaveFocus());
  });

  it("returns focus to the plan-level shopping-list trigger after closing the panel", async () => {
    const persistedPlan = {
      id: "plan-xyz",
      title: "My Weekly Plan",
      numDays: 1,
      mealTypes: ["dinner"],
      generation_status: "finalized",
      shopping_list: [],
      meals: [],
    };

    mockUseMealPlan.mockReturnValue({
      plan: persistedPlan,
      isLoading: false,
      error: null,
      deleteMeal: { mutate: vi.fn() },
      regenerateMeal: { mutate: vi.fn() },
      finalizePlan: { mutateAsync: vi.fn(), isPending: false, error: null },
      saveFavorite: { mutateAsync: vi.fn(), isPending: false, error: null },
      favoritesLibrary: [],
      slotMutationStateByKey: {},
    });

    renderPlanPage("plan-xyz");

    const openShoppingList = screen.getByRole("button", { name: "View shopping list" });
    fireEvent.click(openShoppingList);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(openShoppingList).toHaveFocus());
  });

  it("rechecks finalize eligibility before submitting and blocks stale finalize requests", async () => {
    const finalizeMutateAsync = vi.fn();
    const refetchPlan = vi.fn().mockResolvedValue({
      data: {
        id: "plan-xyz",
        title: "My Weekly Plan",
        numDays: 1,
        mealTypes: ["dinner"],
        generation_status: "draft",
        shopping_list: null,
        meals: [
          {
            id: "meal-1",
            day_of_week: "Monday",
            meal_type: "dinner",
            title: "Pasta",
            short_description: "Fresh pasta",
            rationale: "Fast dinner",
            status: "draft",
          },
        ],
      },
    });
    const persistedPlan = {
      id: "plan-xyz",
      title: "My Weekly Plan",
      numDays: 1,
      mealTypes: ["dinner"],
      generation_status: "draft",
      shopping_list: null,
      meals: [
        {
          id: "meal-1",
          day_of_week: "Monday",
          meal_type: "dinner",
          title: "Pasta",
          short_description: "Fresh pasta",
          rationale: "Fast dinner",
          status: "enriched",
          spoonacular_recipe_id: 42,
        },
      ],
    };

    mockUseMealPlan.mockReturnValue({
      plan: persistedPlan,
      isLoading: false,
      error: null,
      refetchPlan,
      deleteMeal: { mutate: vi.fn() },
      regenerateMeal: { mutate: vi.fn() },
      finalizePlan: { mutateAsync: finalizeMutateAsync, isPending: false, error: null },
      saveFavorite: { mutateAsync: vi.fn(), isPending: false, error: null },
      favoritesLibrary: [],
      slotMutationStateByKey: {},
    });

    renderPlanPage("plan-xyz");

    fireEvent.click(screen.getByRole("button", { name: "Finalize plan" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Finalize plan" })[1]!);

    await waitFor(() => {
      expect(refetchPlan).toHaveBeenCalledTimes(1);
      expect(finalizeMutateAsync).not.toHaveBeenCalled();
      expect(screen.getByText("Enrich at least one meal before finalizing.")).toBeInTheDocument();
    });
  });

  it("clicking a meal card opens the meal detail flyout", async () => {
    const persistedPlan = {
      id: "plan-flyout",
      title: "Flyout Test Plan",
      numDays: 1,
      mealTypes: ["dinner"],
      generation_status: "draft",
      shopping_list: null,
      meals: [
        {
          id: "meal-1",
          day_of_week: "Monday",
          meal_type: "dinner",
          title: "Salmon Bowl",
          short_description: "Grilled salmon over rice.",
          rationale: "Quick weeknight dinner.",
          status: "draft",
        },
      ],
    };

    mockUseMealPlan.mockReturnValue({
      plan: persistedPlan,
      isLoading: false,
      error: null,
      refetchPlan: vi.fn().mockResolvedValue({ data: null }),
      deleteMeal: { mutate: vi.fn() },
      regenerateMeal: { mutate: vi.fn() },
      finalizePlan: { mutateAsync: vi.fn(), isPending: false, error: null },
      saveFavorite: { mutateAsync: vi.fn(), isPending: false, error: null },
      favoritesLibrary: [],
      slotMutationStateByKey: {},
    });

    renderPlanPage("plan-flyout");

    await waitFor(() => {
      expect(screen.getByText("Flyout Test Plan")).toBeInTheDocument();
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const cardButton = screen.getByTestId("mock-card-Monday:dinner");
    fireEvent.click(cardButton);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
