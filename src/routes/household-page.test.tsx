import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HouseholdPage } from "./household-page";

const mockNavigate = vi.fn();
const mockUseHousehold = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/hooks/use-household", () => ({
  useHousehold: () => mockUseHousehold(),
}));

describe("HouseholdPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the primary and support rails explicitly balanced inside the wider shell", () => {
    mockUseHousehold.mockReturnValue({
      household: null,
      isLoading: false,
      error: null,
      upsert: { isPending: false, mutateAsync: vi.fn() },
    });

    render(
      <MemoryRouter>
        <HouseholdPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId("household-primary-rail").className).toContain("max-w-[52rem]");
    expect(screen.getByTestId("household-support-rail").className).toContain("max-w-[24rem]");
    expect(screen.getByRole("heading", { name: "Build a household the planner can actually cook for." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Add Member" })).toBeInTheDocument();
  });
});
