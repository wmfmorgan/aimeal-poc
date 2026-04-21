import { useQuery } from "@tanstack/react-query";

import { trpcClient } from "@/lib/trpc/client";

export type LlmLog = {
  id: string;
  model: string;
  prompt: string;
  response: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  household_id: string | null;
  created_at: string;
};

export function useLlmLogs() {
  const query = useQuery<LlmLog[]>({
    queryKey: ["llm-logs"],
    queryFn: () => trpcClient.query("devTools.llmLogs") as Promise<LlmLog[]>,
    staleTime: 30_000,
  });

  return {
    logs: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
  };
}
