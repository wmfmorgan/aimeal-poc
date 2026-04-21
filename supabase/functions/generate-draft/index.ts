import OpenAI from "https://deno.land/x/openai@v4.69.0/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

type HouseholdMember = {
  name: string;
  allergies: string[] | null;
  avoidances: string[] | null;
  diet_type?: string | null;
};

type HouseholdRow = {
  id: string;
  name: string;
  cooking_skill_level: string | null;
  appliances: string[] | null;
  household_members: HouseholdMember[] | null;
};

type RequestBody = {
  householdId?: string;
  numDays?: number;
  mealTypes?: string[];
  mealPlanId?: string;
};

function buildSystemPrompt(totalSlots: number): string {
  return `You are a registered dietitian and PhD nutritionist.
Output ONLY one JSON object per line — no markdown, no wrapper array, no explanation:
{"day_of_week":"Monday","meal_type":"breakfast","title":"...","short_description":"...","rationale":"..."}
Output exactly ${totalSlots} lines, one per meal slot. Each line must be a complete, valid JSON object.`;
}

function buildUserPrompt(config: {
  householdName: string;
  skillLevel: string;
  members: Array<{ name: string; allergies: string[]; avoidances: string[]; diet_type?: string | null }>;
  appliances: string[];
  numDays: number;
  mealTypes: string[];
}): string {
  const days = DAYS_OF_WEEK.slice(0, config.numDays);
  const memberSummary = config.members
    .map(
      (member) =>
        `- ${member.name}: allergies=[${(member.allergies ?? []).join(",")}], avoids=[${(
          member.avoidances ?? []
        ).join(",")}]${member.diet_type ? `, diet=${member.diet_type}` : ""}`
    )
    .join("\n");

  return `Household: ${config.householdName}
Cooking skill: ${config.skillLevel}
Appliances: ${config.appliances.join(", ")}
Members:
${memberSummary}

Generate meals for these days: ${days.join(", ")}
Meal types per day: ${config.mealTypes.join(", ")}
Generate ${config.numDays * config.mealTypes.length} meal lines total.`;
}

async function writeMealToDB(
  supabase: ReturnType<typeof createClient>,
  mealPlanId: string,
  line: string
): Promise<void> {
  try {
    const parsed = JSON.parse(line) as {
      day_of_week?: string;
      meal_type?: string;
      title?: string;
      short_description?: string | null;
      rationale?: string | null;
    };

    if (
      typeof parsed.day_of_week !== "string" ||
      typeof parsed.meal_type !== "string" ||
      typeof parsed.title !== "string"
    ) {
      return;
    }

    await supabase.from("meals").insert({
      meal_plan_id: mealPlanId,
      day_of_week: parsed.day_of_week,
      meal_type: parsed.meal_type,
      title: parsed.title,
      short_description: parsed.short_description ?? null,
      rationale: parsed.rationale ?? null,
      status: "draft",
    });
  } catch {
    // Persist best-effort only; the stream should continue even if one meal write fails.
  }
}

const openaiClient = new OpenAI({
  apiKey: Deno.env.get("XAI_API_KEY") ?? "",
  baseURL: "https://api.x.ai/v1",
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
  });

  let userId: string | null = null;
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length);
    const { data } = await supabase.auth.getUser(token);
    userId = data.user?.id ?? null;
  }

  if (!userId) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400, headers: corsHeaders });
  }

  const { householdId, mealPlanId } = body;
  const numDays = Math.max(1, Math.min(7, body.numDays ?? 7));
  const mealTypes =
    body.mealTypes?.filter((mealType): mealType is string => typeof mealType === "string" && mealType.length > 0) ??
    ["breakfast", "lunch", "dinner"];

  if (!householdId || !mealPlanId) {
    return new Response("householdId and mealPlanId are required", {
      status: 400,
      headers: corsHeaders,
    });
  }

  const { data: household, error: householdError } = await supabase
    .from("households")
    .select("id, name, cooking_skill_level, appliances, household_members(name, allergies, avoidances, diet_type)")
    .eq("id", householdId)
    .single<HouseholdRow>();

  if (householdError || !household) {
    return new Response("Household not found", { status: 404, headers: corsHeaders });
  }

  const totalSlots = numDays * mealTypes.length;
  const encoder = new TextEncoder();
  const systemPrompt = buildSystemPrompt(totalSlots);
  const userPrompt = buildUserPrompt({
    householdName: household.name,
    skillLevel: household.cooking_skill_level ?? "intermediate",
    members:
      household.household_members?.map((member) => ({
        name: member.name,
        allergies: member.allergies ?? [],
        avoidances: member.avoidances ?? [],
        diet_type: member.diet_type ?? null,
      })) ?? [],
    appliances: household.appliances ?? [],
    numDays,
    mealTypes,
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let responseBuffer = "";
      let chunkBuffer = "";
      let completionModel = "grok-4-1-fast-non-reasoning";
      let promptTokens: number | null = null;
      let completionTokens: number | null = null;
      let streamFailed = false;

      try {
        const completion = await openaiClient.chat.completions.create({
          model: completionModel,
          stream: true,
          temperature: 0.7,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        for await (const chunk of completion) {
          completionModel = chunk.model ?? completionModel;
          promptTokens = chunk.usage?.prompt_tokens ?? promptTokens;
          completionTokens = chunk.usage?.completion_tokens ?? completionTokens;

          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (!delta) {
            continue;
          }

          responseBuffer += delta;
          chunkBuffer += delta;

          const lines = chunkBuffer.split("\n");
          chunkBuffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
              continue;
            }

            try {
              const parsed = JSON.parse(trimmed) as Record<string, unknown>;
              const ssePayload = JSON.stringify({
                day_of_week: parsed.day_of_week,
                meal_type: parsed.meal_type,
                title: parsed.title,
                short_description: parsed.short_description,
              });

              controller.enqueue(encoder.encode(`data: ${ssePayload}\n\n`));
              await writeMealToDB(supabase, mealPlanId, trimmed);
            } catch {
              // Ignore partial NDJSON lines until they complete.
            }
          }
        }

        const finalLine = chunkBuffer.trim();
        if (finalLine) {
          try {
            const parsed = JSON.parse(finalLine) as Record<string, unknown>;
            const ssePayload = JSON.stringify({
              day_of_week: parsed.day_of_week,
              meal_type: parsed.meal_type,
              title: parsed.title,
              short_description: parsed.short_description,
            });

            controller.enqueue(encoder.encode(`data: ${ssePayload}\n\n`));
            await writeMealToDB(supabase, mealPlanId, finalLine);
          } catch {
            // Final partial line was invalid; ignore it rather than failing the request.
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch {
        streamFailed = true;
        controller.error(new Error("Generation stream failed."));
      } finally {
        await supabase.from("llm_logs").insert({
          household_id: householdId,
          model: completionModel,
          prompt: `${systemPrompt}\n\n${userPrompt}`,
          response: responseBuffer,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
        });

        if (!streamFailed) {
          controller.close();
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Cache-Control": "no-cache",
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
    },
  });
});
