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

  mealPlan: t.router({
    /**
     * Returns the authenticated user's most recently updated meal plan id,
     * or null when no plans exist yet (T-05-02: only returns the caller's
     * own records; never exposes another user's plan id).
     */
    latest: authedProcedure.query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from("meal_plans")
        .select("id")
        .eq("user_id", ctx.userId)
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      return data ? { id: data.id as string } : null;
    }),

    /**
     * Fetches a persisted meal plan by UUID together with all of its meals
     * rows, including `rationale` (D-02).  The query runs through the
     * caller's JWT so RLS scopes both `meal_plans` and `meals` to
     * `auth.uid()` (T-05-01).
     */
    get: authedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const { data: planData, error: planError } = await ctx.supabase
          .from("meal_plans")
          .select("id, title, num_days, generation_status")
          .eq("id", input.id)
          .eq("user_id", ctx.userId)
          .maybeSingle();

        if (planError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: planError.message });
        }

        if (!planData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Meal plan not found." });
        }

        const { data: mealsData, error: mealsError } = await ctx.supabase
          .from("meals")
          .select("id, day_of_week, meal_type, title, short_description, rationale, status")
          .eq("meal_plan_id", input.id)
          .order("created_at", { ascending: true });

        if (mealsError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: mealsError.message });
        }

        // Fetch the meal_types stored on the plan via its meals (derive from
        // actual meals present, falling back to the default all-three set).
        // We persist meal_types in a separate query on the meal_plans row if
        // present; otherwise derive from meals to stay forward-compatible.
        const { data: planMeta, error: planMetaError } = await ctx.supabase
          .from("meal_plans")
          .select("num_days")
          .eq("id", input.id)
          .single();

        if (planMetaError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: planMetaError.message });
        }

        // Derive active meal types from the meals that were actually generated.
        const mealTypeSet = new Set<string>();
        for (const meal of mealsData ?? []) {
          if (meal.meal_type) mealTypeSet.add(meal.meal_type);
        }
        // Default to all three types if no meals exist yet.
        const mealTypes = mealTypeSet.size > 0
          ? (["breakfast", "lunch", "dinner"] as const).filter((t) => mealTypeSet.has(t))
          : (["breakfast", "lunch", "dinner"] as const).slice();

        return {
          id: planData.id as string,
          title: planData.title as string,
          numDays: (planMeta?.num_days ?? planData.num_days ?? 7) as number,
          mealTypes,
          meals: (mealsData ?? []).map((meal) => ({
            id: meal.id as string,
            day_of_week: meal.day_of_week as string,
            meal_type: meal.meal_type as string,
            title: meal.title as string,
            short_description: (meal.short_description ?? "") as string,
            rationale: (meal.rationale ?? null) as string | null,
            status: (meal.status ?? "draft") as "draft" | "enriched",
          })),
        };
      }),

    create: authedProcedure
      .input(
        z.object({
          householdId: z.string().uuid(),
          numDays: z.number().int().min(1).max(14).default(7),
          mealTypes: z.array(z.enum(["breakfast", "lunch", "dinner"])).min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { data, error } = await ctx.supabase
          .from("meal_plans")
          .insert({
            user_id: ctx.userId,
            household_id: input.householdId,
            title: `${input.numDays}-day plan`,
            start_date: new Date().toISOString().split("T")[0],
            num_days: input.numDays,
            generation_status: "draft",
          })
          .select("id")
          .single();

        if (error || !data) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error?.message ?? "Unable to create plan.",
          });
        }

        return { id: data.id };
      }),
  }),

  devTools: t.router({
    llmLogs: authedProcedure.query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from("llm_logs")
        .select("id, model, prompt, response, prompt_tokens, completion_tokens, household_id, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      return data ?? [];
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
