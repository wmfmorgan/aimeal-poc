import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { trpcClient } from "@/lib/trpc/client";
import { mealPlanQueryKey } from "@/hooks/use-meal-plan";

type MealEnrichResponse = {
  mealId: string;
  mealPlanId: string;
  status: "enriched";
  cacheHit: boolean;
  liveConcurrencyLimit: number;
};

type UseMealEnrichmentOptions = {
  maxConcurrent?: number;
};

async function runWithConcurrencyLimit<T>(
  items: T[],
  maxConcurrent: number,
  worker: (item: T) => Promise<void>
) {
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      await worker(items[currentIndex]);
    }
  }

  const runnerCount = Math.max(1, Math.min(maxConcurrent, items.length || 1));
  await Promise.all(Array.from({ length: runnerCount }, () => runWorker()));
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Meal enrichment failed.";
}

export function useMealEnrichment(
  planId: string | undefined,
  options: UseMealEnrichmentOptions = {}
) {
  const queryClient = useQueryClient();
  const maxConcurrent = options.maxConcurrent ?? 2;
  const [selectedMealIds, setSelectedMealIds] = useState<string[]>([]);
  const [pendingByMealId, setPendingByMealId] = useState<Record<string, boolean>>({});
  const [errorByMealId, setErrorByMealId] = useState<Record<string, string | null>>({});

  function setMealPending(mealId: string, isPending: boolean) {
    setPendingByMealId((current) => {
      if (!isPending) {
        const next = { ...current };
        delete next[mealId];
        return next;
      }

      return {
        ...current,
        [mealId]: true,
      };
    });
  }

  function selectMeal(mealId: string) {
    setSelectedMealIds((current) => (current.includes(mealId) ? current : [...current, mealId]));
  }

  function deselectMeal(mealId: string) {
    setSelectedMealIds((current) => current.filter((id) => id !== mealId));
  }

  function toggleMealSelection(mealId: string) {
    setSelectedMealIds((current) =>
      current.includes(mealId) ? current.filter((id) => id !== mealId) : [...current, mealId]
    );
  }

  function selectAll(mealIds: string[]) {
    setSelectedMealIds(Array.from(new Set(mealIds)));
  }

  function clearSelection() {
    setSelectedMealIds([]);
  }

  async function enrichMeal(mealId: string) {
    setMealPending(mealId, true);
    setErrorByMealId((current) => ({ ...current, [mealId]: null }));

    try {
      const result = await (trpcClient.mutation(
        "meal.enrich",
        { mealId }
      ) as Promise<MealEnrichResponse>);

      await queryClient.invalidateQueries({ queryKey: mealPlanQueryKey(planId ?? result.mealPlanId) });
      setSelectedMealIds((current) => current.filter((id) => id !== mealId));
      return result;
    } catch (error) {
      setErrorByMealId((current) => ({
        ...current,
        [mealId]: toErrorMessage(error),
      }));
      throw error;
    } finally {
      setMealPending(mealId, false);
    }
  }

  async function enrichSelectedMeals() {
    const mealIds = [...selectedMealIds];
    await runWithConcurrencyLimit(mealIds, maxConcurrent, async (mealId) => {
      try {
        await enrichMeal(mealId);
      } catch {
        // Partial failures are intentionally isolated to the affected card.
      }
    });
  }

  async function retryMeal(mealId: string) {
    await enrichMeal(mealId);
  }

  return {
    selectedMealIds,
    pendingByMealId,
    errorByMealId,
    selectMeal,
    deselectMeal,
    toggleMealSelection,
    selectAll,
    clearSelection,
    enrichSelectedMeals,
    retryMeal,
  };
}
