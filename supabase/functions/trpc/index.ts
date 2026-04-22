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
import OpenAI from "https://deno.land/x/openai@v4.69.0/mod.ts";
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
const dayOfWeekSchema = z.enum([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]);
const mealTypeSchema = z.enum(["breakfast", "lunch", "dinner"]);
const openaiClient = new OpenAI({
  apiKey: Deno.env.get("XAI_API_KEY") ?? "",
  baseURL: "https://api.x.ai/v1",
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

function buildSingleSlotSystemPrompt(dayOfWeek: string, mealType: string): string {
  return `You are a registered dietitian and PhD nutritionist.
Output ONLY one JSON object — no markdown, no wrapper array, no explanation:
{"day_of_week":"${dayOfWeek}","meal_type":"${mealType}","title":"...","short_description":"...","rationale":"..."}
Return exactly one JSON object for the requested slot.`;
}

function buildSingleSlotUserPrompt(config: {
  householdName: string;
  skillLevel: string;
  members: Array<{ name: string; allergies: string[]; avoidances: string[]; diet_type?: string | null }>;
  appliances: string[];
  dayOfWeek: string;
  mealType: string;
}): string {
  const memberSummary = config.members
    .map(
      (member) =>
        `- ${member.name}: allergies=[${member.allergies.join(",")}], avoids=[${member.avoidances.join(",")}]${member.diet_type ? `, diet=${member.diet_type}` : ""}`
    )
    .join("\n");

  return `Household: ${config.householdName}
Cooking skill: ${config.skillLevel}
Appliances: ${config.appliances.join(", ")}
Members:
${memberSummary}

Regenerate exactly one ${config.mealType} meal for ${config.dayOfWeek}.
Keep the slot specific, practical, and aligned to this household.`;
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

  meal: t.router({
    delete: authedProcedure
      .input(z.object({ mealId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { data: meal, error: mealError } = await ctx.supabase
          .from("meals")
          .select("id, meal_plan_id, day_of_week, meal_type")
          .eq("id", input.mealId)
          .maybeSingle();

        if (mealError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: mealError.message });
        }

        if (!meal) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Meal not found." });
        }

        const { error: deleteError } = await ctx.supabase.from("meals").delete().eq("id", input.mealId);

        if (deleteError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: deleteError.message });
        }

        return {
          mealPlanId: meal.meal_plan_id as string,
          dayOfWeek: meal.day_of_week as z.infer<typeof dayOfWeekSchema>,
          mealType: meal.meal_type as z.infer<typeof mealTypeSchema>,
        };
      }),

    regenerate: authedProcedure
      .input(
        z.object({
          mealPlanId: z.string().uuid(),
          dayOfWeek: dayOfWeekSchema,
          mealType: mealTypeSchema,
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { data: plan, error: planError } = await ctx.supabase
          .from("meal_plans")
          .select("id, household_id, num_days")
          .eq("id", input.mealPlanId)
          .eq("user_id", ctx.userId)
          .maybeSingle();

        if (planError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: planError.message });
        }

        if (!plan) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Meal plan not found." });
        }

        const { data: household, error: householdError } = await ctx.supabase
          .from("households")
          .select("id, name, cooking_skill_level, appliances, household_members(name, allergies, avoidances, diet_type)")
          .eq("id", plan.household_id)
          .maybeSingle();

        if (householdError || !household) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: householdError?.message ?? "Household not found.",
          });
        }

        const systemPrompt = buildSingleSlotSystemPrompt(input.dayOfWeek, input.mealType);
        const userPrompt = buildSingleSlotUserPrompt({
          householdName: household.name as string,
          skillLevel: (household.cooking_skill_level as string | null) ?? "intermediate",
          members: Array.isArray(household.household_members)
            ? household.household_members.map((member) => ({
              name: member.name as string,
              allergies: normalizeTextArray(member.allergies),
              avoidances: normalizeTextArray(member.avoidances),
              diet_type: (member.diet_type as string | null) ?? null,
            }))
            : [],
          appliances: normalizeTextArray(household.appliances),
          dayOfWeek: input.dayOfWeek,
          mealType: input.mealType,
        });

        const completion = await openaiClient.chat.completions.create({
          model: "grok-4-1-fast-non-reasoning",
          temperature: 0.7,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        const content = completion.choices[0]?.message?.content?.trim() ?? "";

        let parsed: {
          title?: string;
          short_description?: string | null;
          rationale?: string | null;
        };

        try {
          parsed = JSON.parse(content);
        } catch {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not parse regenerated meal response.",
          });
        }

        if (!parsed.title) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Regenerated meal response was missing a title.",
          });
        }

        const { error: deleteExistingError } = await ctx.supabase
          .from("meals")
          .delete()
          .eq("meal_plan_id", input.mealPlanId)
          .eq("day_of_week", input.dayOfWeek)
          .eq("meal_type", input.mealType);

        if (deleteExistingError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: deleteExistingError.message,
          });
        }

        const { data: insertedMeal, error: insertError } = await ctx.supabase
          .from("meals")
          .insert({
            meal_plan_id: input.mealPlanId,
            day_of_week: input.dayOfWeek,
            meal_type: input.mealType,
            title: parsed.title,
            short_description: parsed.short_description ?? null,
            rationale: parsed.rationale ?? null,
            status: "draft",
          })
          .select("id, title")
          .single();

        if (insertError || !insertedMeal) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: insertError?.message ?? "Unable to save regenerated meal.",
          });
        }

        await ctx.supabase
          .from("meal_plans")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", input.mealPlanId);

        return {
          mealPlanId: input.mealPlanId,
          dayOfWeek: input.dayOfWeek,
          mealType: input.mealType,
          mealId: insertedMeal.id as string,
          title: insertedMeal.title as string,
        };
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
