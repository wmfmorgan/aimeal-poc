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
import { buildFavoriteRecord, canFavoriteMeal } from "../../../src/lib/generation/favorites.ts";
import { buildShoppingList } from "../../../src/lib/generation/shopping-list.ts";
import {
  aggregateHouseholdRestrictions,
  collectEnumDropTelemetry,
  countLoggedEnumDrops,
  normalizeSearchHints,
  type Member,
} from "../_shared/spoonacular-mappings.ts";
import { buildSearchAndEnrichParams, buildSearchEndpoint } from "./meal-enrich.ts";

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
  serviceSupabase: ReturnType<typeof createClient>;
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

type HouseholdMemberPreferences = {
  allergies: string[];
  avoidances: string[];
};

type SpoonacularQuotaSnapshot = {
  quotaRequest: number | null;
  quotaUsed: number | null;
  quotaLeft: number | null;
};

type SpoonacularRequestLog = {
  requestText: string;
  responseText: string | null;
};

type SpoonacularComplexSearchResult = SpoonacularRecipePayload & {
  id: number;
  title?: string | null;
};

type NumericInput = number | string | null | undefined;

type SpoonacularInstructionNode = {
  step?: string | null;
};

type SpoonacularInstructionBlock = {
  steps?: SpoonacularInstructionNode[] | null;
};

type SpoonacularRecipePayload = {
  id: number | null;
  extendedIngredients?: unknown;
  nutrition?: unknown;
  analyzedInstructions?: SpoonacularInstructionBlock[] | null;
  instructions?: string[] | null;
  image?: string | null;
};

type SpoonacularCacheCandidate = {
  spoonacular_recipe_id: number | null;
  ingredients?: unknown[] | null;
  nutrition?: Record<string, unknown> | null;
  instructions?: string[] | null;
  image_url?: string | null;
  cached_at?: string | null;
};

type EnrichedMealPatch = {
  status: "enriched";
  spoonacular_recipe_id: number | null;
  ingredients: unknown[] | null;
  nutrition: Record<string, unknown> | null;
  instructions: string[] | null;
  image_url: string | null;
};

type FavoriteMealRow = {
  id: string;
  title: string | null;
  spoonacular_recipe_id: number | null;
  ingredients: unknown[] | null;
  nutrition: Record<string, unknown> | null;
  instructions: string[] | null;
  image_url: string | null;
  created_at: string;
};

type SpoonacularUsageEntry = {
  meal_id: string | null;
  meal_plan_id: string | null;
  spoonacular_recipe_id: number | null;
  cache_hit: boolean;
  endpoint: string;
  request_text: string | null;
  response_text: string | null;
  points_used: number;
  quota_request: number | null;
  quota_used: number | null;
  quota_left: number | null;
  usage_date_utc: string;
  created_at: string;
};

type SpoonacularUsageSummary = {
  usage_date_utc: string;
  requests_made: number;
  cache_hits: number;
  cache_misses: number;
  points_used: number;
  quota_used: number | null;
  quota_left: number | null;
  daily_limit: number;
};

const SPOONACULAR_BASE_URL = "https://api.spoonacular.com";
const SPOONACULAR_DAILY_LIMIT = 50;
// Phase 6 operates under explicit PoC risk acceptance: keep cache-first reuse,
// but document that Spoonacular's current public pricing language is stricter
// than older internal notes and should be revisited before production.
const SPOONACULAR_LIVE_CONCURRENCY_LIMIT = 2;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toInteger(value: NumericInput): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function toIsoString(value: string | Date | undefined): string {
  if (!value) {
    return new Date().toISOString();
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function getInstructionSteps(recipe: Pick<SpoonacularRecipePayload, "analyzedInstructions" | "instructions">): string[] | null {
  const analyzedSteps =
    recipe.analyzedInstructions
      ?.flatMap((block) => block.steps ?? [])
      .map((step) => step.step?.trim() ?? "")
      .filter((step) => step.length > 0) ?? [];

  if (analyzedSteps.length > 0) {
    return analyzedSteps;
  }

  const instructionFallback =
    recipe.instructions?.map((step) => step.trim()).filter((step) => step.length > 0) ?? [];

  return instructionFallback.length > 0 ? instructionFallback : null;
}

function isRecipeCached(recipe: SpoonacularCacheCandidate | null | undefined): boolean {
  if (!recipe || recipe.spoonacular_recipe_id == null) {
    return false;
  }

  const hasIngredients = Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0;
  const hasNutrition = isRecord(recipe.nutrition);
  const hasInstructions = Array.isArray(recipe.instructions) && recipe.instructions.length > 0;
  const hasImage = isNonEmptyString(recipe.image_url);

  return hasIngredients && hasNutrition && hasInstructions && hasImage;
}

function buildEnrichedMealPatch(recipe: SpoonacularRecipePayload): EnrichedMealPatch {
  return {
    status: "enriched",
    spoonacular_recipe_id: recipe.id,
    ingredients: Array.isArray(recipe.extendedIngredients) ? recipe.extendedIngredients : null,
    nutrition: isRecord(recipe.nutrition) ? recipe.nutrition : null,
    instructions: getInstructionSteps(recipe),
    image_url: isNonEmptyString(recipe.image) ? recipe.image : null,
  };
}

function buildUsageEvent(input: {
  meal_id?: string | null;
  meal_plan_id?: string | null;
  spoonacular_recipe_id?: number | null;
  cache_hit: boolean;
  endpoint: string;
  request_text?: string | null;
  response_text?: string | null;
  points_used?: NumericInput;
  quota_request?: NumericInput;
  quota_used?: NumericInput;
  quota_left?: NumericInput;
  created_at?: string | Date;
}): SpoonacularUsageEntry {
  const createdAt = toIsoString(input.created_at);
  const quotaRequest = toInteger(input.quota_request);
  const quotaUsed = toInteger(input.quota_used);
  const quotaLeft = toInteger(input.quota_left);

  return {
    meal_id: input.meal_id ?? null,
    meal_plan_id: input.meal_plan_id ?? null,
    spoonacular_recipe_id: input.spoonacular_recipe_id ?? null,
    cache_hit: input.cache_hit,
    endpoint: input.endpoint,
    request_text: input.request_text ?? null,
    response_text: input.response_text ?? null,
    points_used: toInteger(input.points_used) ?? quotaRequest ?? 0,
    quota_request: quotaRequest,
    quota_used: quotaUsed,
    quota_left: quotaLeft,
    usage_date_utc: createdAt.slice(0, 10),
    created_at: createdAt,
  };
}

function summarizeUsageByUtcDay(
  entries: SpoonacularUsageEntry[],
  dailyLimit = 50
): SpoonacularUsageSummary[] {
  const grouped = new Map<
    string,
    SpoonacularUsageSummary & { latest_created_at: string }
  >();

  for (const entry of entries) {
    const existing = grouped.get(entry.usage_date_utc);
    const derivedDailyLimit =
      entry.quota_used != null && entry.quota_left != null
        ? entry.quota_used + entry.quota_left
        : dailyLimit;

    if (!existing) {
      grouped.set(entry.usage_date_utc, {
        usage_date_utc: entry.usage_date_utc,
        requests_made: entry.cache_hit ? 0 : 1,
        cache_hits: entry.cache_hit ? 1 : 0,
        cache_misses: entry.cache_hit ? 0 : 1,
        points_used: entry.quota_used ?? entry.points_used,
        quota_used: entry.quota_used,
        quota_left: entry.quota_left,
        daily_limit: derivedDailyLimit,
        latest_created_at: entry.created_at,
      });
      continue;
    }

    existing.requests_made += entry.cache_hit ? 0 : 1;
    existing.cache_hits += entry.cache_hit ? 1 : 0;
    existing.cache_misses += entry.cache_hit ? 0 : 1;

    const currentLatest = new Date(existing.latest_created_at).getTime();
    const entryTimestamp = new Date(entry.created_at).getTime();

    if (
      entryTimestamp >= currentLatest &&
      (entry.quota_used != null || entry.quota_left != null)
    ) {
      existing.points_used = entry.quota_used ?? existing.points_used;
      existing.quota_used = entry.quota_used ?? existing.quota_used;
      existing.quota_left = entry.quota_left ?? existing.quota_left;
      existing.daily_limit = derivedDailyLimit;
      existing.latest_created_at = entry.created_at;
    }
  }

  return [...grouped.values()]
    .sort((left, right) => right.usage_date_utc.localeCompare(left.usage_date_utc))
    .map(({ latest_created_at: _latestCreatedAt, ...summary }) => summary);
}

function parseNullableInteger(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function buildQuotaSnapshot(headers: Headers): SpoonacularQuotaSnapshot {
  return {
    quotaRequest: parseNullableInteger(headers.get("x-api-quota-request")),
    quotaUsed: parseNullableInteger(headers.get("x-api-quota-used")),
    quotaLeft: parseNullableInteger(headers.get("x-api-quota-left")),
  };
}

function buildSpoonacularUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${SPOONACULAR_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function buildSpoonacularRequestLog(path: string, params: Record<string, string>): SpoonacularRequestLog {
  return {
    requestText: JSON.stringify(
      {
        method: "GET",
        url: buildSpoonacularUrl(path, params),
        params,
      },
      null,
      2
    ),
    responseText: null,
  };
}

async function fetchSpoonacularJson(path: string, params: Record<string, string>) {
  const apiKey = Deno.env.get("SPOONACULAR_API_KEY") ?? "";

  if (!apiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Spoonacular API key is not configured.",
    });
  }

  const requestLog = buildSpoonacularRequestLog(path, params);
  const response = await fetch(buildSpoonacularUrl(path, { ...params, apiKey }));
  const responseText = await response.text();
  if (!response.ok) {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: `Spoonacular request failed (${response.status}): ${responseText.slice(0, 200)}`,
    });
  }

  let json: unknown;
  try {
    json = JSON.parse(responseText);
  } catch {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "Spoonacular returned invalid JSON.",
    });
  }

  return {
    json,
    quota: buildQuotaSnapshot(response.headers),
    requestLog: {
      requestText: requestLog.requestText,
      responseText: JSON.stringify(json, null, 2),
    },
  };
}

function extractBlockedTerm(recipe: SpoonacularRecipePayload, household: HouseholdMemberPreferences[]): string | null {
  const haystack = [
    ...(Array.isArray(recipe.extendedIngredients)
      ? recipe.extendedIngredients.flatMap((ingredient) => {
        if (!isRecord(ingredient)) {
          return [];
        }

        return [ingredient.original, ingredient.name]
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.toLowerCase());
      })
      : []),
    ...getInstructionSteps(recipe)?.map((step) => step.toLowerCase()) ?? [],
  ].join(" ");

  const blockedTerms = household.flatMap((member) => [...member.allergies, ...member.avoidances])
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length > 0);

  return blockedTerms.find((term) => haystack.includes(term)) ?? null;
}

async function insertUsageEvent(
  ctx: Context,
  input: Parameters<typeof buildUsageEvent>[0]
) {
  const event = buildUsageEvent(input);
  const { error } = await ctx.serviceSupabase.from("spoonacular_usage").insert(event);

  if (error) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
  }
}

function buildSingleSlotSystemPrompt(dayOfWeek: string, mealType: string): string {
  return `You are a registered dietitian and PhD nutritionist.
Output ONLY one JSON object — no markdown, no wrapper array, no explanation:
{"day_of_week":"${dayOfWeek}","meal_type":"${mealType}","title":"...","short_description":"...","rationale":"...","search_hints":{"main_ingredient":"...","include_ingredients":["...","..."],"cuisine":"<one of: african,american,british,cajun,caribbean,chinese,eastern european,european,french,german,greek,indian,irish,italian,japanese,jewish,korean,latin american,mexican,middle eastern,nordic,southern,spanish,thai,vietnamese> or \\"\\"","type":"<one of: main course,side dish,dessert,appetizer,salad,bread,breakfast,soup,beverage,sauce,marinade,fingerfood,snack,drink>","max_ready_time_min":30,"exclude_ingredients":["..."]}}
Constraints:
- include_ingredients: 1–4 ingredients present in this recipe
- max_ready_time_min: integer 5..120
- exclude_ingredients: ingredients THIS recipe must NOT contain (in addition to per-household avoidances)
Return exactly one JSON object for the requested slot.`;
}

function appendEnumDropSummary(
  responseText: string,
  markers: string[],
  totalEmitted: number,
  dropped: number
): string {
  const suffix = [...markers, `[[enum-drop-summary:emitted=${totalEmitted};dropped=${dropped}]]`].join("\n");
  return responseText.length > 0 ? `${responseText}\n${suffix}` : suffix;
}

async function searchAndEnrich(
  meal: { title: string; meal_type: string; search_hints: ReturnType<typeof normalizeSearchHints> },
  household: ReturnType<typeof aggregateHouseholdRestrictions>,
  retryWithRelaxedFilters = false,
): Promise<
  | {
      recipe: SpoonacularComplexSearchResult;
      response: Awaited<ReturnType<typeof fetchSpoonacularJson>>;
      searchEndpoint: string;
    }
  | {
      recipe: null;
      response: Awaited<ReturnType<typeof fetchSpoonacularJson>>;
      searchEndpoint: string;
    }
> {
  const response = await fetchSpoonacularJson(
    "/recipes/complexSearch",
    buildSearchAndEnrichParams(
      {
        title: meal.title,
        meal_type: meal.meal_type,
        search_hints: meal.search_hints,
      },
      household,
      retryWithRelaxedFilters,
    ),
  );
  const result = response.json?.results?.[0] as SpoonacularComplexSearchResult | undefined;

  if (!result?.id) {
    if (retryWithRelaxedFilters) {
      return {
        recipe: null,
        response,
        searchEndpoint: buildSearchEndpoint(true, true),
      };
    }

    return searchAndEnrich(meal, household, true);
  }

  return {
    recipe: result,
    response,
    searchEndpoint: buildSearchEndpoint(retryWithRelaxedFilters),
  };
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
          .select("id, title, num_days, meal_types, generation_status, shopping_list")
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
          .select(
            "id, day_of_week, meal_type, title, short_description, rationale, status, is_favorite, spoonacular_recipe_id, ingredients, nutrition, instructions, image_url, search_hints"
          )
          .eq("meal_plan_id", input.id)
          .order("created_at", { ascending: true });

        if (mealsError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: mealsError.message });
        }

        const mealTypes = normalizeTextArray(planData.meal_types).filter(
          (mealType): mealType is "breakfast" | "lunch" | "dinner" =>
            mealType === "breakfast" || mealType === "lunch" || mealType === "dinner"
        );

        return {
          id: planData.id as string,
          title: planData.title as string,
          numDays: (planData.num_days ?? 7) as number,
          mealTypes,
          generation_status: (planData.generation_status ?? "draft") as "draft" | "enriching" | "finalized",
          shopping_list: Array.isArray(planData.shopping_list) ? planData.shopping_list : null,
          meals: (mealsData ?? []).map((meal) => ({
            id: meal.id as string,
            day_of_week: meal.day_of_week as string,
            meal_type: meal.meal_type as string,
            title: meal.title as string,
            short_description: (meal.short_description ?? "") as string,
            rationale: (meal.rationale ?? null) as string | null,
            status: (meal.status ?? "draft") as "draft" | "enriched",
            is_favorite: (meal.is_favorite ?? false) as boolean,
            spoonacular_recipe_id: (meal.spoonacular_recipe_id ?? null) as number | null,
            ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : null,
            nutrition: isRecord(meal.nutrition) ? meal.nutrition : null,
            instructions: normalizeTextArray(meal.instructions),
            image_url: (meal.image_url ?? null) as string | null,
            search_hints: isRecord(meal.search_hints) ? meal.search_hints : null,
          })),
        };
      }),

    finalize: authedProcedure
      .input(z.object({ mealPlanId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { data: planData, error: planError } = await ctx.supabase
          .from("meal_plans")
          .select("id, generation_status")
          .eq("id", input.mealPlanId)
          .eq("user_id", ctx.userId)
          .maybeSingle();

        if (planError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: planError.message });
        }

        if (!planData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Meal plan not found." });
        }

        if (planData.generation_status === "finalized") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This plan is already finalized." });
        }

        const { data: mealsData, error: mealsError } = await ctx.supabase
          .from("meals")
          .select(
            "id, status, ingredients, spoonacular_recipe_id, title, nutrition, instructions, image_url"
          )
          .eq("meal_plan_id", input.mealPlanId)
          .order("created_at", { ascending: true });

        if (mealsError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: mealsError.message });
        }

        const shoppingList = buildShoppingList(
          (mealsData ?? []).map((meal) => ({
            id: meal.id as string,
            day_of_week: "Monday",
            meal_type: "dinner",
            title: (meal.title ?? "") as string,
            short_description: "",
            rationale: null,
            status: (meal.status ?? "draft") as "draft" | "enriched",
            spoonacular_recipe_id: (meal.spoonacular_recipe_id ?? null) as number | null,
            ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : null,
            nutrition: isRecord(meal.nutrition) ? meal.nutrition : null,
            instructions: normalizeTextArray(meal.instructions),
            image_url: (meal.image_url ?? null) as string | null,
          }))
        );

        const enrichedMealCount = (mealsData ?? []).filter((meal) => meal.status === "enriched").length;
        if (enrichedMealCount === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Finalize requires at least one enriched meal.",
          });
        }

        const { data: rpcResult, error: rpcError } = await ctx.supabase.rpc("finalize_meal_plan", {
          target_plan_id: input.mealPlanId,
          shopping_list_payload: shoppingList,
        });

        if (rpcError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: rpcError.message });
        }

        const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;

        return {
          mealPlanId: input.mealPlanId,
          generationStatus: "finalized" as const,
          shoppingList,
          removedDraftCount: (result?.removed_draft_count ?? 0) as number,
          enrichedMealCount: (result?.enriched_meal_count ?? enrichedMealCount) as number,
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
            meal_types: input.mealTypes,
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
    enrich: authedProcedure
      .input(z.object({ mealId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { data: meal, error: mealError } = await ctx.supabase
          .from("meals")
          .select(
            `
              id,
              meal_plan_id,
              title,
              meal_type,
              status,
              spoonacular_recipe_id,
              ingredients,
              nutrition,
              instructions,
              image_url,
              search_hints,
              meal_plans!inner (
                id,
                household_id,
                user_id,
                generation_status
              )
            `
          )
          .eq("id", input.mealId)
          .eq("meal_plans.user_id", ctx.userId)
          .maybeSingle();

        if (mealError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: mealError.message });
        }

        if (!meal) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Meal not found." });
        }

        if (meal.meal_plans?.generation_status === "finalized") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Finalized plans cannot be enriched.",
          });
        }

        const planId = meal.meal_plan_id as string;
        const existingMealData: SpoonacularCacheCandidate = {
          spoonacular_recipe_id: (meal.spoonacular_recipe_id ?? null) as number | null,
          ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : null,
          nutrition: isRecord(meal.nutrition) ? meal.nutrition : null,
          instructions: normalizeTextArray(meal.instructions),
          image_url: (meal.image_url ?? null) as string | null,
        };

        if (isRecipeCached(existingMealData)) {
          await insertUsageEvent(ctx, {
            meal_id: meal.id as string,
            meal_plan_id: planId,
            spoonacular_recipe_id: existingMealData.spoonacular_recipe_id,
            cache_hit: true,
            endpoint: "meal-row",
            request_text: null,
            response_text: null,
            points_used: 0,
          });

          return {
            mealId: meal.id as string,
            mealPlanId: planId,
            status: "enriched" as const,
            cacheHit: true,
            liveConcurrencyLimit: SPOONACULAR_LIVE_CONCURRENCY_LIMIT,
          };
        }

        const householdId = meal.meal_plans?.household_id as string | null;
        const { data: household, error: householdError } = await ctx.supabase
          .from("households")
          .select("id, cooking_skill_level, appliances, household_members(allergies, avoidances, diet_type)")
          .eq("id", householdId)
          .maybeSingle();

        if (householdError || !household) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: householdError?.message ?? "Household not found.",
          });
        }

        const householdMembers = Array.isArray(household.household_members)
          ? household.household_members.map((member) => ({
            allergies: normalizeTextArray(member.allergies),
            avoidances: normalizeTextArray(member.avoidances),
          }))
          : [];
        const householdRestrictionMembers: Member[] = Array.isArray(household.household_members)
          ? household.household_members.map((member) => ({
            allergies: normalizeTextArray(member.allergies),
            avoidances: normalizeTextArray(member.avoidances),
            diet_type: (member.diet_type as string | null) ?? null,
          }))
          : [];

        let cacheCandidate: SpoonacularCacheCandidate | null = null;

        if (meal.spoonacular_recipe_id != null) {
          const { data: cachedRecipe, error: cacheError } = await ctx.supabase
            .from("spoonacular_cache")
            .select("spoonacular_recipe_id, ingredients, nutrition, instructions, image_url, cached_at")
            .eq("spoonacular_recipe_id", meal.spoonacular_recipe_id)
            .maybeSingle();

          if (cacheError) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: cacheError.message });
          }

          if (cachedRecipe) {
            cacheCandidate = {
              spoonacular_recipe_id: (cachedRecipe.spoonacular_recipe_id ?? null) as number | null,
              ingredients: Array.isArray(cachedRecipe.ingredients) ? cachedRecipe.ingredients : null,
              nutrition: isRecord(cachedRecipe.nutrition) ? cachedRecipe.nutrition : null,
              instructions: normalizeTextArray(cachedRecipe.instructions),
              image_url: (cachedRecipe.image_url ?? null) as string | null,
              cached_at: (cachedRecipe.cached_at ?? null) as string | null,
            };
          }
        }

        if (isRecipeCached(cacheCandidate)) {
          const { error: updateError } = await ctx.supabase
            .from("meals")
            .update({
              status: "enriched",
              spoonacular_recipe_id: cacheCandidate?.spoonacular_recipe_id,
              ingredients: cacheCandidate?.ingredients,
              nutrition: cacheCandidate?.nutrition,
              instructions: cacheCandidate?.instructions,
              image_url: cacheCandidate?.image_url,
            })
            .eq("id", input.mealId);

          if (updateError) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: updateError.message });
          }

          await insertUsageEvent(ctx, {
            meal_id: meal.id as string,
            meal_plan_id: planId,
            spoonacular_recipe_id: cacheCandidate?.spoonacular_recipe_id,
            cache_hit: true,
            endpoint: "spoonacular_cache",
            request_text: null,
            response_text: null,
            points_used: 0,
          });

          return {
            mealId: meal.id as string,
            mealPlanId: planId,
            status: "enriched" as const,
            cacheHit: true,
            liveConcurrencyLimit: SPOONACULAR_LIVE_CONCURRENCY_LIMIT,
          };
        }

        const householdRestrictions = aggregateHouseholdRestrictions(
          householdRestrictionMembers,
          normalizeTextArray(household.appliances),
          (household.cooking_skill_level as string | null) ?? "intermediate",
        );

        const searchResult = await searchAndEnrich(
          {
            title: meal.title as string,
            meal_type: meal.meal_type as string,
            search_hints: normalizeSearchHints(meal.search_hints),
          },
          householdRestrictions,
        );

        if (!searchResult.recipe) {
          await insertUsageEvent(ctx, {
            meal_id: meal.id as string,
            meal_plan_id: planId,
            spoonacular_recipe_id: null,
            cache_hit: false,
            endpoint: searchResult.searchEndpoint,
            request_text: searchResult.response.requestLog.requestText,
            response_text: searchResult.response.requestLog.responseText,
            points_used: searchResult.response.quota.quotaRequest,
            quota_request: searchResult.response.quota.quotaRequest,
            quota_used: searchResult.response.quota.quotaUsed,
            quota_left: searchResult.response.quota.quotaLeft,
          });

          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No Spoonacular recipe match was found for this meal.",
          });
        }

        const recipe = searchResult.recipe;
        const blockedTerm = extractBlockedTerm(recipe, householdMembers);
        if (blockedTerm) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Best Spoonacular match conflicts with household restrictions: ${blockedTerm}.`,
          });
        }

        const patch = buildEnrichedMealPatch(recipe);

        const { error: cacheWriteError } = await ctx.serviceSupabase
          .from("spoonacular_cache")
          .upsert({
            spoonacular_recipe_id: patch.spoonacular_recipe_id,
            title: recipe.title ?? meal.title,
            ingredients: patch.ingredients,
            nutrition: patch.nutrition,
            instructions: patch.instructions,
            image_url: patch.image_url,
            cached_at: new Date().toISOString(),
          });

        if (cacheWriteError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: cacheWriteError.message });
        }

        const { error: mealUpdateError } = await ctx.supabase
          .from("meals")
          .update(patch)
          .eq("id", input.mealId);

        if (mealUpdateError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: mealUpdateError.message });
        }

        await insertUsageEvent(ctx, {
          meal_id: meal.id as string,
          meal_plan_id: planId,
          spoonacular_recipe_id: patch.spoonacular_recipe_id,
          cache_hit: false,
          endpoint: searchResult.searchEndpoint,
          request_text: searchResult.response.requestLog.requestText,
          response_text: searchResult.response.requestLog.responseText,
          points_used: searchResult.response.quota.quotaRequest,
          quota_request: searchResult.response.quota.quotaRequest,
          quota_used: searchResult.response.quota.quotaUsed,
          quota_left: searchResult.response.quota.quotaLeft,
        });

        return {
          mealId: meal.id as string,
          mealPlanId: planId,
          status: "enriched" as const,
          cacheHit: false,
          liveConcurrencyLimit: SPOONACULAR_LIVE_CONCURRENCY_LIMIT,
        };
      }),
    delete: authedProcedure
      .input(z.object({ mealId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { data: meal, error: mealError } = await ctx.supabase
          .from("meals")
          .select("id, meal_plan_id, day_of_week, meal_type, meal_plans!inner(user_id, generation_status)")
          .eq("id", input.mealId)
          .eq("meal_plans.user_id", ctx.userId)
          .maybeSingle();

        if (mealError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: mealError.message });
        }

        if (!meal) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Meal not found." });
        }

        if (meal.meal_plans?.generation_status === "finalized") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Finalized plans cannot be edited.",
          });
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
          .select("id, household_id, num_days, generation_status")
          .eq("id", input.mealPlanId)
          .eq("user_id", ctx.userId)
          .maybeSingle();

        if (planError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: planError.message });
        }

        if (!plan) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Meal plan not found." });
        }

        if (plan.generation_status === "finalized") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Finalized plans cannot be edited.",
          });
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
          search_hints?: unknown;
        };

        try {
          parsed = JSON.parse(content);
        } catch {
          await ctx.supabase.from("llm_logs").insert({
            household_id: plan.household_id as string,
            model: completion.model ?? "grok-4-1-fast-non-reasoning",
            prompt: `${systemPrompt}\n\n${userPrompt}`,
            response: appendEnumDropSummary(content, [], 0, 0),
            prompt_tokens: completion.usage?.prompt_tokens ?? null,
            completion_tokens: completion.usage?.completion_tokens ?? null,
          });

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not parse regenerated meal response.",
          });
        }

        const searchHintTelemetry = collectEnumDropTelemetry(parsed.search_hints);
        await ctx.supabase.from("llm_logs").insert({
          household_id: plan.household_id as string,
          model: completion.model ?? "grok-4-1-fast-non-reasoning",
          prompt: `${systemPrompt}\n\n${userPrompt}`,
          response: appendEnumDropSummary(
            content,
            searchHintTelemetry.markers,
            searchHintTelemetry.totalEmitted,
            searchHintTelemetry.dropped,
          ),
          prompt_tokens: completion.usage?.prompt_tokens ?? null,
          completion_tokens: completion.usage?.completion_tokens ?? null,
        });

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
            search_hints: normalizeSearchHints(parsed.search_hints),
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

    saveFavorite: authedProcedure
      .input(z.object({ mealId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { data: meal, error: mealError } = await ctx.supabase
          .from("meals")
          .select(
            `
              id,
              meal_plan_id,
              title,
              status,
              spoonacular_recipe_id,
              ingredients,
              nutrition,
              instructions,
              image_url,
              meal_plans!inner (
                user_id
              )
            `
          )
          .eq("id", input.mealId)
          .eq("meal_plans.user_id", ctx.userId)
          .maybeSingle();

        if (mealError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: mealError.message });
        }

        if (!meal) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Meal not found." });
        }

        if (!canFavoriteMeal({
          status: (meal.status ?? "draft") as "draft" | "enriched",
          spoonacular_recipe_id: (meal.spoonacular_recipe_id ?? null) as number | null,
        })) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only enriched recipe-backed meals can be saved to favorites.",
          });
        }

        const favoriteRecord = buildFavoriteRecord(ctx.userId, {
          title: meal.title as string,
          status: (meal.status ?? "draft") as "draft" | "enriched",
          spoonacular_recipe_id: (meal.spoonacular_recipe_id ?? null) as number | null,
          ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : null,
          nutrition: isRecord(meal.nutrition) ? meal.nutrition : null,
          instructions: normalizeTextArray(meal.instructions),
          image_url: (meal.image_url ?? null) as string | null,
        });

        const { data: savedFavorite, error: favoriteError } = await ctx.supabase
          .from("favorite_meals")
          .upsert(favoriteRecord, {
            onConflict: "user_id,spoonacular_recipe_id",
          })
          .select("id, spoonacular_recipe_id")
          .single();

        if (favoriteError || !savedFavorite) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: favoriteError?.message ?? "Unable to save favorite.",
          });
        }

        const { error: updateMealError } = await ctx.supabase
          .from("meals")
          .update({ is_favorite: true })
          .eq("id", input.mealId);

        if (updateMealError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: updateMealError.message });
        }

        return {
          mealId: input.mealId,
          mealPlanId: meal.meal_plan_id as string,
          favoriteId: savedFavorite.id as string,
          spoonacularRecipeId: (savedFavorite.spoonacular_recipe_id ?? null) as number | null,
          isFavorite: true as const,
        };
      }),
  }),

  favorites: t.router({
    list: authedProcedure.query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from("favorite_meals")
        .select("id, title, spoonacular_recipe_id, ingredients, nutrition, instructions, image_url, created_at")
        .eq("user_id", ctx.userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      return (data ?? []).map((favorite) => ({
        id: favorite.id as string,
        title: (favorite.title ?? "") as string,
        spoonacular_recipe_id: (favorite.spoonacular_recipe_id ?? null) as number | null,
        ingredients: Array.isArray(favorite.ingredients) ? favorite.ingredients : null,
        nutrition: isRecord(favorite.nutrition) ? favorite.nutrition : null,
        instructions: normalizeTextArray(favorite.instructions),
        image_url: (favorite.image_url ?? null) as string | null,
        created_at: favorite.created_at as string,
      }) satisfies FavoriteMealRow);
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
    spoonacularUsage: authedProcedure.query(async ({ ctx }) => {
      const todayUtc = new Date().toISOString().slice(0, 10);
      const [{ data, error }, { data: cacheData, error: cacheError }, { data: llmLogs, error: llmLogsError }] =
        await Promise.all([
          ctx.supabase
            .from("spoonacular_usage")
            .select(
              "meal_id, meal_plan_id, spoonacular_recipe_id, cache_hit, endpoint, request_text, response_text, points_used, quota_request, quota_used, quota_left, usage_date_utc, created_at"
            )
            .order("created_at", { ascending: false })
            .limit(25),
          ctx.supabase.from("spoonacular_cache").select("instructions"),
          ctx.supabase.from("llm_logs").select("response"),
        ]);

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }
      if (cacheError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: cacheError.message });
      }
      if (llmLogsError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: llmLogsError.message });
      }

      const entries = (data ?? []).map((row) => buildUsageEvent(row));
      const summaries = summarizeUsageByUtcDay(entries, SPOONACULAR_DAILY_LIMIT);
      const liveEntries = entries.filter((entry) =>
        !entry.cache_hit && entry.endpoint.startsWith("recipes/complexSearch?addRecipeInformation")
      );
      const firstCallHits = liveEntries.filter(
        (entry) => entry.endpoint === "recipes/complexSearch?addRecipeInformation",
      ).length;
      const enumDropCounts = (llmLogs ?? []).reduce(
        (totals, row) => {
          const counts = countLoggedEnumDrops((row.response ?? "") as string);
          return {
            totalEmitted: totals.totalEmitted + counts.totalEmitted,
            dropped: totals.dropped + counts.dropped,
          };
        },
        { totalEmitted: 0, dropped: 0 },
      );
      const cachedRecipes = cacheData ?? [];
      const emptyInstructionsCount = cachedRecipes.filter((row) => {
        const instructions = Array.isArray(row.instructions) ? row.instructions : null;
        return instructions == null || instructions.length === 0;
      }).length;

      return {
        today: summaries.find((summary) => summary.usage_date_utc === todayUtc) ?? {
          usage_date_utc: todayUtc,
          requests_made: 0,
          cache_hits: 0,
          cache_misses: 0,
          points_used: 0,
          quota_used: 0,
          quota_left: SPOONACULAR_DAILY_LIMIT,
          daily_limit: SPOONACULAR_DAILY_LIMIT,
        },
        recent: entries,
        liveConcurrencyLimit: SPOONACULAR_LIVE_CONCURRENCY_LIMIT,
        kpis: {
          firstCallHitRate: liveEntries.length > 0 ? firstCallHits / liveEntries.length : 0,
          firstCallDenominator: liveEntries.length,
          enumDropRate:
            enumDropCounts.totalEmitted > 0
              ? enumDropCounts.dropped / enumDropCounts.totalEmitted
              : 0,
          enumDropDenominator: enumDropCounts.totalEmitted,
          emptyInstructionsRate:
            cachedRecipes.length > 0 ? emptyInstructionsCount / cachedRecipes.length : 0,
          emptyInstructionsDenominator: cachedRecipes.length,
        },
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;

async function createContext(req: Request): Promise<Context> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
  const serviceSupabase = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey);

  let userId: string | null = null;
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length);
    const { data } = await supabase.auth.getUser(token);
    userId = data.user?.id ?? null;
  }

  return { userId, supabase, serviceSupabase };
}

Deno.serve(async (req) => {
  return fetchRequestHandler({
    endpoint: "/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
  });
});
