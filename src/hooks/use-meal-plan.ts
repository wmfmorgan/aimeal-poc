/**
 * React Query wrappers for persisted meal-plan reads (Phase 5).
 *
 * Provides two read-only hooks that wire the client to the authenticated
 * `mealPlan.latest` and `mealPlan.get` tRPC procedures.  No write mutations
 * are included here — delete and regenerate are added in Plan 03.
 *
 * Patterns follow `use-household.ts` exactly: TanStack Query with stable
 * query keys, `Error | null` return shape, and `staleTime` to avoid
 * redundant re-fetches on rapid mounts.
 */

import { useQuery } from "@tanstack/react-query";

import { trpcClient } from "@/lib/trpc/client";
import type { PersistedMealPlan } from "@/lib/generation/types";

// ---------------------------------------------------------------------------
// Types returned by tRPC procedures
// ---------------------------------------------------------------------------

type LatestPlanResponse = { id: string } | null;

// ---------------------------------------------------------------------------
// useLatestMealPlan
// ---------------------------------------------------------------------------

/**
 * Resolves the authenticated user's most recently updated meal plan id.
 *
 * Used by the nav / route guard to redirect Plan nav clicks to
 * `/plan/:id` instead of the hard-coded `/plan/new` path (D-01).
 *
 * Returns `null` when the user has no saved plans yet.
 */
export function useLatestMealPlan() {
  const query = useQuery<LatestPlanResponse>({
    queryKey: ["meal-plan", "latest"],
    queryFn: () => trpcClient.query("mealPlan.latest") as Promise<LatestPlanResponse>,
    staleTime: 30_000,
  });

  return {
    latestPlanId: query.data?.id ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
  };
}

// ---------------------------------------------------------------------------
// useMealPlan
// ---------------------------------------------------------------------------

/**
 * Fetches a persisted meal plan by id, including all of its `meals` rows
 * with `rationale` (D-02).
 *
 * Pass `undefined` when no plan id is available — the query will be
 * disabled and `plan` will be `null`.
 *
 * The returned `plan` is the raw PersistedMealPlan shape; callers should
 * pass it through `buildMealPlanSlots` before rendering the grid.
 */
export function useMealPlan(planId: string | undefined) {
  const query = useQuery<PersistedMealPlan | null>({
    queryKey: ["meal-plan", planId],
    queryFn: () =>
      trpcClient.query("mealPlan.get", { id: planId! }) as Promise<PersistedMealPlan | null>,
    enabled: !!planId,
    staleTime: 30_000,
  });

  return {
    plan: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
  };
}
