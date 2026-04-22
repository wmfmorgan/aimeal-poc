import { useQuery } from "@tanstack/react-query";

import { trpcClient } from "@/lib/trpc/client";
import type { SpoonacularUsageEntry, SpoonacularUsageSummary } from "@/lib/generation/types";

export type SpoonacularUsageResponse = {
  today: SpoonacularUsageSummary;
  recent: SpoonacularUsageEntry[];
  liveConcurrencyLimit: number;
};

export function useSpoonacularUsage() {
  const query = useQuery<SpoonacularUsageResponse>({
    queryKey: ["spoonacular-usage"],
    queryFn: () =>
      trpcClient.query("devTools.spoonacularUsage") as Promise<SpoonacularUsageResponse>,
    staleTime: 30_000,
  });

  return {
    usage: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
  };
}
