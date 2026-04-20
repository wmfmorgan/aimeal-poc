import { useQuery } from "@tanstack/react-query";

import { fetchPing } from "../lib/trpc/client";

export type PingStatusViewModel = {
  connected: boolean;
  error: string | null;
  updatedAt: string | null;
};

export function toPingStatus(args: { data?: { pong: boolean; ts: number }; error?: Error | null }): PingStatusViewModel {
  if (args.error) {
    return {
      connected: false,
      error: args.error.message,
      updatedAt: null,
    };
  }

  if (!args.data?.pong) {
    return {
      connected: false,
      error: "Ping returned an unexpected payload.",
      updatedAt: null,
    };
  }

  return {
    connected: true,
    error: null,
    updatedAt: new Date(args.data.ts).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

export function usePingStatus() {
  const ping = useQuery({
    queryKey: ["ping"],
    queryFn: fetchPing,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const status = toPingStatus({
    data: ping.data,
    error: ping.error instanceof Error ? ping.error : null,
  });

  return {
    ...status,
    isLoading: ping.isLoading,
  };
}
