import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useMealEnrichment } from "@/hooks/use-meal-enrichment";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const mockMutation = vi.fn();

vi.mock("@/lib/trpc/client", () => ({
  trpcClient: {
    mutation: (...args: unknown[]) => mockMutation(...args),
  },
}));

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }

  return { Wrapper, invalidateQueries };
}

describe("useMealEnrichment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("batches selected meals with a concurrency limit and slot-local progress", async () => {
    const one = deferred<{ mealId: string; mealPlanId: string; status: "enriched"; cacheHit: boolean; liveConcurrencyLimit: number }>();
    const two = deferred<{ mealId: string; mealPlanId: string; status: "enriched"; cacheHit: boolean; liveConcurrencyLimit: number }>();
    const three = deferred<{ mealId: string; mealPlanId: string; status: "enriched"; cacheHit: boolean; liveConcurrencyLimit: number }>();

    mockMutation
      .mockReturnValueOnce(one.promise)
      .mockReturnValueOnce(two.promise)
      .mockReturnValueOnce(three.promise);

    const { Wrapper, invalidateQueries } = makeWrapper();
    const { result } = renderHook(() => useMealEnrichment("plan-1", { maxConcurrent: 2 }), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.selectAll(["meal-1", "meal-2", "meal-3"]);
    });

    let batchPromise!: Promise<void>;
    act(() => {
      batchPromise = result.current.enrichSelectedMeals();
    });

    await waitFor(() => expect(mockMutation).toHaveBeenCalledTimes(2));
    expect(result.current.pendingByMealId).toEqual({
      "meal-1": true,
      "meal-2": true,
    });

    await act(async () => {
      one.resolve({
        mealId: "meal-1",
        mealPlanId: "plan-1",
        status: "enriched",
        cacheHit: false,
        liveConcurrencyLimit: 2,
      });
      await Promise.resolve();
    });

    await waitFor(() => expect(mockMutation).toHaveBeenCalledTimes(3));
    expect(result.current.pendingByMealId["meal-3"]).toBe(true);

    await act(async () => {
      two.resolve({
        mealId: "meal-2",
        mealPlanId: "plan-1",
        status: "enriched",
        cacheHit: false,
        liveConcurrencyLimit: 2,
      });
      three.resolve({
        mealId: "meal-3",
        mealPlanId: "plan-1",
        status: "enriched",
        cacheHit: true,
        liveConcurrencyLimit: 2,
      });
      await Promise.resolve();
    });

    await act(async () => {
      await batchPromise;
    });

    await waitFor(() => expect(result.current.pendingByMealId).toEqual({}));
    expect(result.current.selectedMealIds).toEqual([]);
    expect(invalidateQueries).toHaveBeenCalledTimes(3);
  });

  it("keeps failures local and retries only the failed card", async () => {
    mockMutation
      .mockResolvedValueOnce({
        mealId: "meal-1",
        mealPlanId: "plan-1",
        status: "enriched",
        cacheHit: false,
        liveConcurrencyLimit: 2,
      })
      .mockRejectedValueOnce(new Error("Unsafe Spoonacular match for peanut allergy."))
      .mockResolvedValueOnce({
        mealId: "meal-2",
        mealPlanId: "plan-1",
        status: "enriched",
        cacheHit: false,
        liveConcurrencyLimit: 2,
      });

    const { Wrapper, invalidateQueries } = makeWrapper();
    const { result } = renderHook(() => useMealEnrichment("plan-1", { maxConcurrent: 2 }), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.selectAll(["meal-1", "meal-2"]);
    });

    await act(async () => {
      await result.current.enrichSelectedMeals();
    });

    expect(result.current.errorByMealId["meal-2"]).toBe("Unsafe Spoonacular match for peanut allergy.");
    expect(result.current.selectedMealIds).toEqual(["meal-2"]);
    expect(invalidateQueries).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.retryMeal("meal-2");
    });

    expect(result.current.errorByMealId["meal-2"]).toBeNull();
    expect(result.current.selectedMealIds).toEqual([]);
    expect(invalidateQueries).toHaveBeenCalledTimes(2);
  });
});
