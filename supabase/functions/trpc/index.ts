/**
 * Minimal tRPC router running inside a Supabase Edge Function (Deno).
 * Spike purpose: prove tRPC HTTP adapter works in Deno edge runtime.
 *
 * Uses @trpc/server fetch adapter — no Node.js required.
 */
import { initTRPC } from "npm:@trpc/server@11";
import { fetchRequestHandler } from "npm:@trpc/server@11/adapters/fetch";
import { z } from "npm:zod@3";

const t = initTRPC.create();

const appRouter = t.router({
  ping: t.procedure.query(() => ({ pong: true, ts: Date.now() })),

  generateDraft: t.procedure
    .input(
      z.object({
        householdId: z.string().uuid(),
        numDays: z.number().int().min(1).max(14).default(7),
      })
    )
    .mutation(({ input }) => {
      // Stub — real implementation calls generate-draft edge function
      return {
        mealPlanId: crypto.randomUUID(),
        householdId: input.householdId,
        numDays: input.numDays,
        status: "draft",
        message: "tRPC → Edge Function wiring confirmed",
      };
    }),
});

export type AppRouter = typeof appRouter;

Deno.serve((req) => {
  return fetchRequestHandler({
    endpoint: "/trpc",
    req,
    router: appRouter,
    createContext: () => ({}),
  });
});
