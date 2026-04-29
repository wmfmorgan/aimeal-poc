import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useHousehold } from "@/hooks/use-household";

const mockQuery = vi.fn();
const mockMutation = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/lib/trpc/client", () => ({
  trpcClient: {
    query: (...args: unknown[]) => mockQuery(...args),
    mutation: (...args: unknown[]) => mockMutation(...args),
  },
}));

vi.mock("@/lib/auth/auth-state", () => ({
  useAuth: () => mockUseAuth(),
}));

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return {
    Wrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client: queryClient }, children);
    },
  };
}

describe("useHousehold", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    mockQuery.mockResolvedValue(null);
    mockMutation.mockResolvedValue({ id: "household-1" });
  });

  it("queries the authenticated household", async () => {
    mockQuery.mockResolvedValue({
      id: "household-1",
      name: "Home",
      cookingSkillLevel: "intermediate",
      appliances: ["oven"],
      members: [],
    });

    const { result } = renderHook(() => useHousehold(), {
      wrapper: makeWrapper().Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.household?.id).toBe("household-1");
    expect(mockQuery).toHaveBeenCalledWith("household.get");
  });

  it("does not query before auth is ready", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });

    const { result } = renderHook(() => useHousehold(), {
      wrapper: makeWrapper().Wrapper,
    });

    expect(result.current.household).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
