import OpenAI from "https://deno.land/x/openai@v4.69.0/mod.ts";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const MEAL_TYPES = ["breakfast","lunch","dinner"];

const client = new OpenAI({
  apiKey: Deno.env.get("XAI_API_KEY") ?? "",
  baseURL: "https://api.x.ai/v1",
});

const systemPrompt = `You are a registered dietitian and PhD nutritionist.
Generate a 7-day meal plan with breakfast, lunch, and dinner for each day.
Return ONLY valid JSON matching this exact schema — no markdown, no explanation:
{
  "meals": [
    {
      "day_of_week": "Monday",
      "meal_type": "breakfast",
      "title": "String",
      "short_description": "String (1 sentence)"
    }
  ]
}
The array must have exactly 21 items covering all 7 days × 3 meal types.`;

function buildUserPrompt(config: {
  householdName: string;
  skillLevel: string;
  members: Array<{ name: string; allergies: string[]; avoidances: string[]; diet_type?: string }>;
  appliances: string[];
}) {
  const memberSummary = config.members
    .map(m => `- ${m.name}: allergies=[${m.allergies.join(",")}], avoids=[${m.avoidances.join(",")}]${m.diet_type ? `, diet=${m.diet_type}` : ""}`)
    .join("\n");

  return `Household: ${config.householdName}
Cooking skill: ${config.skillLevel}
Appliances: ${config.appliances.join(", ")}
Members:
${memberSummary}

Generate the 7-day meal plan now.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" } });
  }

  const start = Date.now();

  // Hardcoded household config for spike — no auth required
  const config = {
    householdName: "The Morgans",
    skillLevel: "intermediate",
    members: [
      { name: "Adult 1", allergies: ["peanuts"], avoidances: ["liver"], diet_type: undefined },
      { name: "Adult 2", allergies: [], avoidances: ["brussels sprouts"], diet_type: undefined },
      { name: "Kid", allergies: [], avoidances: ["spicy food"], diet_type: undefined },
    ],
    appliances: ["oven", "stovetop", "instant pot", "air fryer"],
  };

  try {
    const completion = await client.chat.completions.create({
      model: "grok-4-1-fast-non-reasoning",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildUserPrompt(config) },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const parsed = JSON.parse(raw);
    const elapsed = Date.now() - start;

    // Basic validation
    const meals = parsed.meals ?? [];
    const valid = meals.length === 21 &&
      DAYS.every(day => MEAL_TYPES.every(type => meals.some((m: { day_of_week: string; meal_type: string }) => m.day_of_week === day && m.meal_type === type)));

    return new Response(JSON.stringify({
      ok: true,
      valid,
      meal_count: meals.length,
      elapsed_ms: elapsed,
      tokens_used: completion.usage?.total_tokens,
      meals: parsed.meals,
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
