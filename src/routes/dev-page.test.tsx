import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DevPage } from "./dev-page";

const mockUseLlmLogs = vi.fn();
const mockUseSpoonacularUsage = vi.fn();

vi.mock("@/hooks/use-llm-logs", () => ({
  useLlmLogs: () => mockUseLlmLogs(),
}));

vi.mock("@/hooks/use-spoonacular-usage", () => ({
  useSpoonacularUsage: () => mockUseSpoonacularUsage(),
}));

describe("DevPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSpoonacularUsage.mockReturnValue({
      usage: {
        today: {
          usage_date_utc: "2026-04-22",
          requests_made: 2,
          cache_hits: 1,
          cache_misses: 1,
          points_used: 3,
          quota_used: 14,
          quota_left: 36,
          daily_limit: 50,
        },
        recent: [
          {
            meal_id: "meal-1",
            meal_plan_id: "plan-1",
            spoonacular_recipe_id: 101,
            cache_hit: false,
            endpoint: "recipes/101/information",
            request_text: "{\"method\":\"GET\"}",
            response_text: "{\"id\":101}",
            points_used: 2,
            quota_request: 2,
            quota_used: 14,
            quota_left: 36,
            usage_date_utc: "2026-04-22",
            created_at: "2026-04-22T12:00:00.000Z",
          },
        ],
        liveConcurrencyLimit: 2,
        kpis: {
          firstCallHitRate: 0.8,
          firstCallDenominator: 10,
          enumDropRate: 0.2,
          enumDropDenominator: 5,
          emptyInstructionsRate: 0.1,
          emptyInstructionsDenominator: 20,
        },
      },
      isLoading: false,
      error: null,
    });
  });

  it("renders log entries with expandable prompt and response content", () => {
    mockUseLlmLogs.mockReturnValue({
      logs: [
        {
          id: "log-1",
          model: "grok-4-1-fast-non-reasoning",
          prompt: "Prompt preview",
          response: "Response preview",
          prompt_tokens: 120,
          completion_tokens: 80,
          household_id: "household-1",
          created_at: "2026-04-21T12:00:00.000Z",
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<DevPage />);

    expect(screen.getByText("LLM Requests")).toBeInTheDocument();
    expect(screen.getByText("grok-4-1-fast-non-reasoning")).toBeInTheDocument();
    expect(screen.getByText(/200 tokens/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText("View prompt / response"));
    expect(screen.getByText("Prompt preview")).toBeInTheDocument();
    expect(screen.getByText("Response preview")).toBeInTheDocument();
  });

  it("renders the empty state and Spoonacular usage surface", () => {
    mockUseLlmLogs.mockReturnValue({
      logs: [],
      isLoading: false,
      error: null,
    });

    render(<DevPage />);

    expect(screen.getByText("No LLM calls yet. Generate a plan to see logs here.")).toBeInTheDocument();
    expect(screen.getByText("Spoonacular Usage")).toBeInTheDocument();
    expect(screen.getByText("Today's usage")).toBeInTheDocument();
    expect(screen.getByText("3 / 50")).toBeInTheDocument();
    expect(screen.getByText("Cache hits")).toBeInTheDocument();
    expect(screen.getByText("First-call hit rate")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("recipes/101/information")).toBeInTheDocument();
  });

  it("renders Spoonacular daily usage summary and per-call breakdown", () => {
    mockUseLlmLogs.mockReturnValue({
      logs: [],
      isLoading: false,
      error: null,
    });

    render(<DevPage />);

    expect(screen.getByText("Requests made")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/quota used 14/i)).toBeInTheDocument();
  });

  it("renders collapsible Spoonacular request and response details", () => {
    mockUseLlmLogs.mockReturnValue({
      logs: [],
      isLoading: false,
      error: null,
    });

    render(<DevPage />);

    fireEvent.click(screen.getByText("View request / response"));
    expect(screen.getByText("{\"method\":\"GET\"}")).toBeInTheDocument();
    expect(screen.getByText("{\"id\":101}")).toBeInTheDocument();
  });

  it("pins the tighter Phase 8 shell spacing for dense dev surfaces", () => {
    mockUseLlmLogs.mockReturnValue({
      logs: [],
      isLoading: false,
      error: null,
    });

    render(<DevPage />);

    expect(screen.getByTestId("dev-page-layout").className).toContain("space-y-6 md:space-y-7");
    expect(screen.getByText("LLM Requests").closest("section")?.className).toContain("px-6 py-6");
  });
});
