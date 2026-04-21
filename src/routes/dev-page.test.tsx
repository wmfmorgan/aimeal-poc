import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DevPage } from "./dev-page";

const mockUseLlmLogs = vi.fn();

vi.mock("@/hooks/use-llm-logs", () => ({
  useLlmLogs: () => mockUseLlmLogs(),
}));

describe("DevPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("renders the empty state and spoonacular placeholder", () => {
    mockUseLlmLogs.mockReturnValue({
      logs: [],
      isLoading: false,
      error: null,
    });

    render(<DevPage />);

    expect(screen.getByText("No LLM calls yet. Generate a plan to see logs here.")).toBeInTheDocument();
    expect(screen.getByText("Spoonacular Usage")).toBeInTheDocument();
    expect(screen.getByText("Coming in Phase 6.")).toBeInTheDocument();
  });
});
