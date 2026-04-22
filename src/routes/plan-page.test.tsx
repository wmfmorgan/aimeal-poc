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

const { mockUseLatestMealPlan, mockUseMealPlan, mockUseGenerationStream, mockNavigate } =
  vi.hoisted(() => ({
    mockUseLatestMealPlan: vi.fn(() => ({
      latestPlanId: null,
      isLoading: false,
      error: null,
    })),
    mockUseMealPlan: vi.fn(() => ({
      plan: null,
      isLoading: false,
      error: null,
    })),
    mockUseGenerationStream: vi.fn(() => ({
      slots: {},
      state: "idle",
      error: null,
      startGeneration: vi.fn(),
      reset: vi.fn(),
    })),
    mockNavigate: vi.fn(),
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

// Stub MealPlanGrid
vi.mock("@/components/generation/MealPlanGrid", () => ({
  MealPlanGrid: ({ slots }: { slots: Record<string, unknown> }) => (
    <div data-testid="meal-plan-grid">{Object.keys(slots).join(",")}</div>
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
    });

    renderPlanPage("plan-xyz");

    await waitFor(() => {
      expect(screen.getByText("Create new plan")).toBeInTheDocument();
    });
  });

  it("shows a loading state while the persisted plan is fetching", () => {
    mockUseMealPlan.mockReturnValue({
      plan: null,
      isLoading: true,
      error: null,
    });

    renderPlanPage("plan-xyz");

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows an error state when the persisted plan fails to load", async () => {
    mockUseMealPlan.mockReturnValue({
      plan: null,
      isLoading: false,
      error: new Error("Failed to fetch"),
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
});
