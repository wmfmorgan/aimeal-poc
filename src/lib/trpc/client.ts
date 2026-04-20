import { createTRPCUntypedClient, httpBatchLink } from "@trpc/client";
import type { AnyRouter } from "@trpc/server";

type PingResponse = {
  pong: boolean;
  ts: number;
};

export const TRPC_ENDPOINT = "/functions/v1/trpc";

export type PingStatus = {
  connected: boolean;
  error: string | null;
  updatedAt: string | null;
};

export const trpcClient = createTRPCUntypedClient<AnyRouter>({
  links: [
    httpBatchLink({
      url: TRPC_ENDPOINT,
    }),
  ],
});

export async function fetchPing() {
  return trpcClient.query("ping") as Promise<PingResponse>;
}
