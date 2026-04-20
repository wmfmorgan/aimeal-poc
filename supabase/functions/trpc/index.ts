/**
 * tRPC router running inside a Supabase Edge Function (Deno).
 *
 * Uses @trpc/server fetch adapter — no Node.js required.
 * Household procedures run through the caller's JWT so existing RLS policies
 * continue to enforce ownership at the database layer.
 */
import { initTRPC, TRPCError } from "npm:@trpc/server@11";
import { fetchRequestHandler } from "npm:@trpc/server@11/adapters/fetch";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const cookingSkillLevelSchema = z.enum(["beginner", "intermediate", "advanced"]);

const householdMemberInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1),
  allergies: z.array(z.string().trim().min(1)).default([]),
  avoidances: z.array(z.string().trim().min(1)).default([]),
  dietType: z.string().trim().optional(),
});

const householdUpsertInputSchema = z.object({
  name: z.string().trim().min(1),
  cookingSkillLevel: cookingSkillLevelSchema,
  appliances: z.array(z.string().trim().min(1)).default([]),
  members: z.array(householdMemberInputSchema).min(1),
});

type Context = {
  userId: string | null;
  supabase: ReturnType<typeof createClient>;
};

const t = initTRPC.context<Context>().create();

const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

function normalizeTextArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

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

  household: t.router({
    get: authedProcedure.query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from("households")
        .select(
          `
            id,
            name,
            cooking_skill_level,
            appliances,
            household_members (
              id,
              name,
              allergies,
              avoidances,
              diet_type
            )
          `
        )
        .eq("user_id", ctx.userId)
        .maybeSingle();

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      if (!data) {
        return null;
      }

      const members = Array.isArray(data.household_members) ? data.household_members : [];

      return {
        id: data.id,
        name: data.name,
        cookingSkillLevel: data.cooking_skill_level,
        appliances: normalizeTextArray(data.appliances),
        members: members.map((member) => ({
          id: member.id,
          name: member.name,
          allergies: normalizeTextArray(member.allergies),
          avoidances: normalizeTextArray(member.avoidances),
          dietType: member.diet_type ?? "",
        })),
      };
    }),

    upsert: authedProcedure
      .input(householdUpsertInputSchema)
      .mutation(async ({ ctx, input }) => {
        const memberIds = input.members.flatMap((member) => (member.id ? [member.id] : []));

        const { data: householdRow, error: householdError } = await ctx.supabase
          .from("households")
          .upsert(
            {
              user_id: ctx.userId,
              name: input.name.trim(),
              cooking_skill_level: input.cookingSkillLevel,
              appliances: input.appliances,
            },
            {
              onConflict: "user_id",
            }
          )
          .select("id")
          .single();

        if (householdError || !householdRow) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: householdError?.message ?? "Unable to save household.",
          });
        }

        const householdId = householdRow.id;

        const { data: existingMembers, error: existingMembersError } = await ctx.supabase
          .from("household_members")
          .select("id")
          .eq("household_id", householdId);

        if (existingMembersError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: existingMembersError.message,
          });
        }

        const staleMemberIds =
          existingMembers
            ?.map((member) => member.id)
            .filter((memberId) => !memberIds.includes(memberId)) ?? [];

        if (staleMemberIds.length > 0) {
          const { error: deleteRemovedError } = await ctx.supabase
            .from("household_members")
            .delete()
            .eq("household_id", householdId)
            .in("id", staleMemberIds);

          if (deleteRemovedError) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: deleteRemovedError.message,
            });
          }
        }

        const membersToUpsert = input.members.map((member) => {
          const base = {
            household_id: householdId,
            name: member.name.trim(),
            allergies: member.allergies,
            avoidances: member.avoidances,
            diet_type: member.dietType?.trim() || null,
          };

          return member.id ? { id: member.id, ...base } : base;
        });

        const { error: membersError } = await ctx.supabase
          .from("household_members")
          .upsert(membersToUpsert);

        if (membersError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: membersError.message,
          });
        }

        return { id: householdId };
      }),
  }),
});

export type AppRouter = typeof appRouter;

async function createContext(req: Request): Promise<Context> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });

  let userId: string | null = null;
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length);
    const { data } = await supabase.auth.getUser(token);
    userId = data.user?.id ?? null;
  }

  return { userId, supabase };
}

Deno.serve(async (req) => {
  return fetchRequestHandler({
    endpoint: "/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
  });
});
