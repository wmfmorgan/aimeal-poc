import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HomePage } from "./home-page";

const mockUsePingStatus = vi.fn();

vi.mock("../hooks/use-ping-status", () => ({
  usePingStatus: () => mockUsePingStatus(),
}));

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the editorial split layout while capping the hero measure", () => {
    mockUsePingStatus.mockReturnValue({
      connected: true,
      error: null,
      isLoading: false,
      updatedAt: "just now",
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByTestId("home-page-layout").className).toContain("lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]");
    expect(screen.getByTestId("home-page-hero").className).toContain("max-w-[42rem]");
    expect(screen.getByRole("link", { name: "View Auth" })).toHaveAttribute("href", "/auth");
    expect(screen.getByRole("link", { name: "View Household" })).toHaveAttribute("href", "/household");
  });
});
