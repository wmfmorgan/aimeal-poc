/**
 * React Query wrappers for persisted meal-plan reads (Phase 5).
 *
 * Provides persisted plan read and slot-management hooks that wire the client
 * to the authenticated meal-plan and meal mutation procedures.
 *
 * Patterns follow `use-household.ts` exactly: TanStack Query with stable
 * query keys, `Error | null` return shape, and `staleTime` to avoid
 * redundant re-fetches on rapid mounts.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { trpcClient } from "@/lib/trpc/client";
import { buildMealPlanSlotKey } from "@/lib/generation/plan-slots";
import type { DayOfWeek, MealType, PersistedMealPlan } from "@/lib/generation/types";

// ---------------------------------------------------------------------------
// Types returned by tRPC procedures
// ---------------------------------------------------------------------------

type LatestPlanResponse = { id: string } | null;
type DeleteMealInput = { mealId: string };
type DeleteMealResponse = {
  mealPlanId: string;
  dayOfWeek: DayOfWeek;
  mealType: MealType;
};
type RegenerateMealInput = {
  mealPlanId: string;
  dayOfWeek: DayOfWeek;
  mealType: MealType;
};
type RegenerateMealResponse = DeleteMealResponse & {
  mealId: string;
  title: string;
};

export type SlotMutationState = {
  isDeleting: boolean;
  isRegenerating: boolean;
  error: string | null;
};

export function mealPlanQueryKey(planId: string | undefined) {
  return ["meal-plan", planId] as const;
}

function emptySlotMutationState(): SlotMutationState {
  return {
    isDeleting: false,
    isRegenerating: false,
    error: null,
  };
}

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
  const queryClient = useQueryClient();
  const query = useQuery<PersistedMealPlan | null>({
    queryKey: mealPlanQueryKey(planId),
    queryFn: () =>
      trpcClient.query("mealPlan.get", { id: planId! }) as Promise<PersistedMealPlan | null>,
    enabled: !!planId,
    refetchInterval: (query) => {
      const plan = query.state.data;

      if (!plan) {
        return false;
      }

      const expectedMealCount = plan.numDays * plan.mealTypes.length;
      return plan.meals.length < expectedMealCount ? 1_000 : false;
    },
    staleTime: 30_000,
  });

  const deleteMeal = useMutation<DeleteMealResponse, Error, DeleteMealInput>({
    mutationFn: (input) => trpcClient.mutation("meal.delete", input) as Promise<DeleteMealResponse>,
    onSuccess: async () => {
      if (planId) {
        await queryClient.invalidateQueries({ queryKey: mealPlanQueryKey(planId) });
      }
    },
  });

  const regenerateMeal = useMutation<RegenerateMealResponse, Error, RegenerateMealInput>({
    mutationFn: (input) =>
      trpcClient.mutation("meal.regenerate", input) as Promise<RegenerateMealResponse>,
    onSuccess: async () => {
      if (planId) {
        await queryClient.invalidateQueries({ queryKey: mealPlanQueryKey(planId) });
      }
    },
  });

  const slotMutationStateByKey: Record<string, SlotMutationState> = {};

  const deletingVariables = deleteMeal.variables;
  if (deletingVariables?.mealId && query.data) {
    const deletingMeal = query.data.meals.find((meal) => meal.id === deletingVariables.mealId);
    if (deletingMeal) {
      const slotKey = buildMealPlanSlotKey(deletingMeal.day_of_week, deletingMeal.meal_type);
      slotMutationStateByKey[slotKey] = {
        isDeleting: deleteMeal.isPending,
        isRegenerating: false,
        error: deleteMeal.isError ? deleteMeal.error.message : null,
      };
    }
  }

  const regeneratingVariables = regenerateMeal.variables;
  if (regeneratingVariables) {
    const slotKey = buildMealPlanSlotKey(
      regeneratingVariables.dayOfWeek,
      regeneratingVariables.mealType
    );
    slotMutationStateByKey[slotKey] = {
      ...(slotMutationStateByKey[slotKey] ?? emptySlotMutationState()),
      isRegenerating: regenerateMeal.isPending,
      error: regenerateMeal.isError ? regenerateMeal.error.message : null,
    };
  }

  return {
    plan: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    deleteMeal,
    regenerateMeal,
    slotMutationStateByKey,
  };
}
