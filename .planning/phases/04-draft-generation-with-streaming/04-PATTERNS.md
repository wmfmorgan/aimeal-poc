# Phase 4: Draft Generation with Streaming - Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 14
**Analogs found:** 12 / 14

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/functions/generate-draft/index.ts` | service (edge function) | streaming / request-response | `supabase/functions/generate-draft/index.ts` (current batch version) | self — rewrite |
| `supabase/migrations/20260420000002_llm_logs.sql` | migration | — | `supabase/migrations/20260419000001_initial_schema.sql` | role-match |
| `supabase/functions/trpc/index.ts` (modify) | service (edge function) | request-response | `supabase/functions/trpc/index.ts` (existing procedures) | self — additive |
| `src/hooks/use-generation-stream.ts` | hook | streaming / event-driven | `src/hooks/use-household.ts` | role-match |
| `src/hooks/use-llm-logs.ts` | hook | request-response (CRUD read) | `src/hooks/use-household.ts` | exact role-match |
| `src/lib/generation/types.ts` | utility (types) | — | `src/lib/household/types.ts` | exact role-match |
| `src/lib/generation/stream-parser.ts` | utility (pure functions) | transform | `src/lib/auth/validation.ts` | role-match |
| `src/components/generation/GenerationForm.tsx` | component | request-response | `src/routes/household-page.tsx` | role-match (form + submit) |
| `src/components/generation/MealPlanGrid.tsx` | component | event-driven | `src/routes/home-page.tsx` (grid layout) | partial |
| `src/components/generation/SkeletonMealCard.tsx` | component | — | `src/routes/home-page.tsx` (article cards) | partial |
| `src/components/generation/MealCard.tsx` | component | — | `src/routes/home-page.tsx` (article cards) | partial |
| `src/components/generation/PlanReadyBanner.tsx` | component | — | `src/routes/household-page.tsx` (SubmitBanner) | role-match |
| `src/components/generation/StreamErrorBanner.tsx` | component | — | `src/routes/household-page.tsx` (SubmitBanner) | exact role-match |
| `src/routes/plan-page.tsx` (rewrite) | route | request-response | `src/routes/household-page.tsx` | role-match |
| `src/routes/dev-page.tsx` | route | request-response (CRUD read) | `src/routes/home-page.tsx` | role-match |
| `src/app/router.tsx` (modify) | config | — | `src/app/router.tsx` (existing) | self — additive |
| `src/app/layout/AppFrame.tsx` (modify) | component (layout) | — | `src/app/layout/AppFrame.tsx` (existing) | self — additive |

---

## Pattern Assignments

### `supabase/functions/generate-draft/index.ts` (edge function, streaming)

**Analog:** `supabase/functions/generate-draft/index.ts` (current) + `supabase/functions/trpc/index.ts` (auth pattern)

**Imports pattern** (`generate-draft/index.ts` lines 1-9, `trpc/index.ts` lines 8-11):
```typescript
import OpenAI from "https://deno.land/x/openai@v4.69.0/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
// NOTE: OpenAI SDK uses Deno URL import, NOT npm: specifier
```

**Auth pattern** (`trpc/index.ts` lines 214-232):
```typescript
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
// Guard: if (!userId) return new Response("Unauthorized", { status: 401 });
```

**CORS options pattern** (`generate-draft/index.ts` lines 45-48):
```typescript
if (req.method === "OPTIONS") {
  return new Response(null, {
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" }
  });
}
```

**OpenAI client setup** (`generate-draft/index.ts` lines 6-9):
```typescript
const client = new OpenAI({
  apiKey: Deno.env.get("XAI_API_KEY") ?? "",
  baseURL: "https://api.x.ai/v1",
});
```

**Streaming LLM call pattern** (from RESEARCH.md — spike validated):
```typescript
// DO NOT add response_format — incompatible with stream:true (D-05, spike landmine)
const stream = await client.chat.completions.create({
  model: "grok-4-1-fast-non-reasoning",  // NEVER grok-3-mini
  temperature: 0.7,
  stream: true,
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ],
});

// Async iterator — OpenAI SDK provides this natively
for await (const chunk of stream) {
  const token = chunk.choices[0]?.delta?.content ?? "";
  // buffer + emit
}
```

**SSE ReadableStream + NDJSON emit pattern** (from RESEARCH.md Pattern 1):
```typescript
const sseStream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder();
    let buffer = "";
    let fullResponse = "";
    try {
      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content ?? "";
        buffer += token;
        fullResponse += token;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            JSON.parse(trimmed); // validate before emitting
            controller.enqueue(encoder.encode(`data: ${trimmed}\n\n`));
          } catch { /* skip malformed */ }
        }
        if (chunk.usage) {
          promptTokens = chunk.usage.prompt_tokens ?? 0;
          completionTokens = chunk.usage.completion_tokens ?? 0;
        }
      }
    } finally {
      await supabase.from("llm_logs").insert({ ... });
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    }
  },
});

return new Response(sseStream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Access-Control-Allow-Origin": "*",
  },
});
```

**Existing buildUserPrompt to extend** (`generate-draft/index.ts` lines 26-43):
```typescript
function buildUserPrompt(config: {
  householdName: string;
  skillLevel: string;
  members: Array<{ name: string; allergies: string[]; avoidances: string[]; diet_type?: string }>;
  appliances: string[];
  // ADD: numDays: number; mealTypes: string[];
}) {
  const memberSummary = config.members
    .map(m => `- ${m.name}: allergies=[${m.allergies.join(",")}], avoids=[${m.avoidances.join(",")}]${m.diet_type ? `, diet=${m.diet_type}` : ""}`)
    .join("\n");
  return `Household: ${config.householdName}\nCooking skill: ${config.skillLevel}\nAppliances: ${config.appliances.join(", ")}\nMembers:\n${memberSummary}\n\nGenerate the ${config.numDays}-day meal plan now.`;
}
```

---

### `supabase/migrations/20260420000002_llm_logs.sql` (migration)

**Analog:** `supabase/migrations/20260419000001_initial_schema.sql`

**Table + RLS pattern** (lines 1-116):
```sql
-- Table first
create table llm_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households on delete set null,
  model text not null,
  prompt text not null,
  response text not null,
  prompt_tokens int,
  completion_tokens int,
  created_at timestamptz default now()
);

-- Enable RLS immediately after creation (matches all existing tables)
alter table llm_logs enable row level security;

-- Policies follow the established naming convention: "table: description"
create policy "llm_logs: authenticated read" on llm_logs
  for select using (auth.role() = 'authenticated');

create policy "llm_logs: insert own" on llm_logs
  for insert with check (
    household_id in (select id from households where user_id = auth.uid())
  );
```

**RLS naming convention** (from existing schema lines 101-116):
```
"profiles: own row"
"households: own rows"
"household_members: own household"
"meal_plans: own rows"
"meals: own meal plans"
-- Pattern: "table: description phrase"
```

---

### `supabase/functions/trpc/index.ts` — additive modifications

**Analog:** `supabase/functions/trpc/index.ts` (existing `household` sub-router pattern, lines 75-209)

**authedProcedure query pattern** (`trpc/index.ts` lines 76-99):
```typescript
// Copy this pattern exactly for devTools.llmLogs
get: authedProcedure.query(async ({ ctx }) => {
  const { data, error } = await ctx.supabase
    .from("households")
    .select(`id, name, ...`)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (error) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
  }
  return data ?? null;
}),
```

**Sub-router declaration pattern** (`trpc/index.ts` lines 75-209):
```typescript
// New devTools sub-router added to appRouter alongside existing `household` sub-router
devTools: t.router({
  llmLogs: authedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("llm_logs")
      .select("id, model, prompt, response, prompt_tokens, completion_tokens, household_id, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return data ?? [];
  }),
}),
```

**mealPlan.create mutation pattern** — follows `household.upsert` pattern (`trpc/index.ts` lines 122-208):
```typescript
mealPlan: t.router({
  create: authedProcedure
    .input(z.object({
      householdId: z.string().uuid(),
      numDays: z.number().int().min(1).max(14).default(7),
      mealTypes: z.array(z.enum(["breakfast", "lunch", "dinner"])).min(1),
    }))
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
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error?.message ?? "Unable to create plan." });
      }
      return { id: data.id };
    }),
}),
```

**Remove stub:** Replace `generateDraft` stub (lines 57-73) with the real `mealPlan.create` above. The stub returns `crypto.randomUUID()` — tRPC is NOT the streaming path.

**Zod input schema pattern** (`trpc/index.ts` lines 13-28):
```typescript
// Existing schemas show the validation style — copy for mealPlan input
const householdUpsertInputSchema = z.object({
  name: z.string().trim().min(1),
  cookingSkillLevel: cookingSkillLevelSchema,
  appliances: z.array(z.string().trim().min(1)).default([]),
  members: z.array(householdMemberInputSchema).min(1),
});
```

---

### `src/hooks/use-generation-stream.ts` (hook, streaming / event-driven)

**Analog:** `src/hooks/use-household.ts`

**Imports pattern** (`use-household.ts` lines 1-4):
```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trpcClient } from "@/lib/trpc/client";
// For use-generation-stream: replace with useState, useCallback + supabase client
import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { parseMealLine, buildSlotKey, type MealSlot } from "@/lib/generation/stream-parser";
```

**Auth token retrieval pattern** (`src/lib/trpc/client.ts` lines 23-27):
```typescript
// trpcClient uses this pattern — mirror it in useGenerationStream
async headers() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
```

**Hook return shape pattern** (`use-household.ts` lines 51-56):
```typescript
// Mirror the return shape convention
return {
  household: householdQuery.data ?? null,
  isLoading: householdQuery.isLoading,
  error: householdQuery.error instanceof Error ? householdQuery.error : null,
  upsert,
};
// For use-generation-stream:
return { slots, state, error, startGeneration };
```

**Core streaming hook pattern** (from RESEARCH.md Pattern 2 — no existing analog, spike-validated):
```typescript
type StreamState = "idle" | "streaming" | "complete" | "error";

export function useGenerationStream() {
  const [slots, setSlots] = useState<Record<string, MealSlot>>({});
  const [state, setState] = useState<StreamState>("idle");
  const [error, setError] = useState<string | null>(null);

  const startGeneration = useCallback(async (params: {
    householdId: string;
    mealPlanId: string;
    numDays: number;
    mealTypes: string[];
  }) => {
    setState("streaming");
    setSlots({});
    setError(null);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const response = await fetch("/functions/v1/generate-draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(params),
    });

    if (!response.ok || !response.body) {
      setState("error");
      setError("Generation failed to start.");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") { setState("complete"); return; }
            const meal = parseMealLine(payload);
            if (meal) {
              const key = buildSlotKey(meal.day_of_week, meal.meal_type);
              setSlots(prev => ({ ...prev, [key]: meal }));
            }
          }
        }
      }
      setState("complete");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Stream error.");
    }
  }, []);

  return { slots, state, error, startGeneration };
}
```

---

### `src/hooks/use-llm-logs.ts` (hook, CRUD read)

**Analog:** `src/hooks/use-household.ts` — exact pattern, query-only

**Pattern** (`use-household.ts` lines 35-48):
```typescript
import { useQuery } from "@tanstack/react-query";
import { trpcClient } from "@/lib/trpc/client";

export function useLlmLogs() {
  const query = useQuery({
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
```

**Type convention** (`use-household.ts` lines 6-33 — inline type exports at top of hook file):
```typescript
// Define types at top of file, export them
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
```

---

### `src/lib/generation/types.ts` (utility, types)

**Analog:** `src/lib/household/types.ts`

**Pattern** (`household/types.ts` lines 1-66):
```typescript
// types.ts exports: const arrays (as const), derived union types, draft state shapes, copy strings
// Follow the same structure — no imports needed in a types file

export const DAYS_OF_WEEK = [
  "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"
] as const;

export const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;

export const MEAL_TYPE_PRESETS = [
  { value: ["dinner"], label: "Dinner only" },
  { value: ["lunch", "dinner"], label: "Lunch + Dinner" },
  { value: ["breakfast", "lunch", "dinner"], label: "All three" },
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];
export type MealType = (typeof MEAL_TYPES)[number];

export type MealSlot = {
  day_of_week: DayOfWeek;
  meal_type: MealType;
  title: string;
  short_description: string;
};

export type GenerationFormState = {
  mealTypes: MealType[];
  numDays: number;
};

export type StreamState = "idle" | "streaming" | "complete" | "error";

// Copy strings (matches HOUSEHOLD_COPY pattern)
export const GENERATION_COPY = {
  pageEyebrow: "Your Meal Plan",
  pageHeading: "Generate your weekly plan.",
  // ... fill in all UI copy here
} as const;
```

---

### `src/lib/generation/stream-parser.ts` (utility, pure functions / transform)

**Analog:** `src/lib/auth/validation.ts` and `src/lib/household/validation.ts`

**Pure function pattern** (`auth/validation.ts` lines 1-94):
```typescript
// No imports — pure TypeScript only
// Returns typed value or null (matches validation pattern of returning null for valid)
// All functions are exported named functions, not default export

export function parseMealLine(line: string): MealSlot | null {
  try {
    const obj = JSON.parse(line);
    if (
      typeof obj.day_of_week === "string" &&
      typeof obj.meal_type === "string" &&
      typeof obj.title === "string" &&
      typeof obj.short_description === "string"
    ) {
      return obj as MealSlot;
    }
  } catch { /* ignore malformed lines */ }
  return null;
}

export function buildSlotKey(day: string, mealType: string): string {
  return `${day}::${mealType}`;
}

export function buildExpectedSlots(numDays: number, mealTypes: string[]): string[] {
  const days = DAYS_OF_WEEK.slice(0, numDays);
  return days.flatMap(day => mealTypes.map(type => buildSlotKey(day, type)));
}
```

**Test file structure** (`src/lib/auth/validation.test.ts` — follow this structure):
```typescript
// Co-located test: src/lib/generation/stream-parser.test.ts
import { describe, it, expect } from "vitest";
import { parseMealLine, buildSlotKey, buildExpectedSlots } from "./stream-parser";
```

---

### `src/components/generation/GenerationForm.tsx` (component, request-response)

**Analog:** `src/routes/household-page.tsx` (form submit + chip/preset buttons)

**Imports pattern** (`household-page.tsx` lines 1-21):
```typescript
import { useState } from "react";
import { useHousehold } from "@/hooks/use-household";
import { GENERATION_COPY, MEAL_TYPE_PRESETS, type GenerationFormState } from "@/lib/generation/types";
// No react-hook-form needed — form is simple enough for controlled state (matches household pattern)
```

**Preset button (chip) pattern** (`household-page.tsx` lines 323-350):
```typescript
// Segmented control pattern — single-active button group
<div className="flex rounded-xl bg-[rgba(74,103,65,0.06)] p-1">
  {MEAL_TYPE_PRESETS.map((preset) => (
    <button
      key={preset.label}
      type="button"
      onClick={() => setMealTypes(preset.value)}
      className={[
        "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors min-h-[44px]",
        arraysEqual(mealTypes, preset.value)
          ? "bg-[#4A6741] text-white shadow-sm"
          : "text-[var(--color-sage-deep)] hover:bg-white/60",
      ].join(" ")}
    >
      {preset.label}
    </button>
  ))}
</div>
```

**Submit handler pattern** (`household-page.tsx` lines 191-244):
```typescript
async function handleSubmit(event: React.FormEvent) {
  event.preventDefault();
  // 1. Validate (simple guard, no Zod needed for this form)
  // 2. Call mealPlan.create tRPC mutation to get mealPlanId
  // 3. Navigate to /plan/:mealPlanId
  // 4. Call startGeneration({ householdId, mealPlanId, numDays, mealTypes })
  try {
    const { id: mealPlanId } = await createPlan.mutateAsync({ householdId, numDays, mealTypes });
    navigate(`/plan/${mealPlanId}`);
    startGeneration({ householdId, mealPlanId, numDays, mealTypes });
  } catch {
    setSubmitError(GENERATION_COPY.errorBanner);
  }
}
```

**Submit button pattern** (`household-page.tsx` lines 656-658):
```typescript
// submitCls() helper pattern — compose class string from helper fn
function submitCls() {
  return [
    "rounded-xl bg-[#4A6741] px-6 text-white font-semibold text-sm tracking-wide",
    "transition-opacity disabled:opacity-60 min-h-[44px]",
  ].join(" ");
}
<button type="submit" disabled={isPending} className={submitCls()}>
  {isPending ? GENERATION_COPY.submitCtaLoading : GENERATION_COPY.submitCta}
</button>
```

**Section container pattern** (`household-page.tsx` lines 261-283):
```typescript
// Glassmorphism card — use for each form section
<section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
  <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
    {eyebrowText}
  </p>
  <h2 className="mt-3 font-display text-4xl leading-tight text-[var(--color-sage-deep)]">
    {headingText}
  </h2>
</section>
```

---

### `src/components/generation/MealPlanGrid.tsx` (component, event-driven)

**Analog:** `src/routes/home-page.tsx` (grid layout pattern, lines 14, 30-51)

**Grid layout pattern** (`home-page.tsx` lines 14, 30-51):
```typescript
// CSS grid with responsive columns
<section className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">

// Inner article grid
<div className="grid gap-4 md:grid-cols-2">
  <article className="rounded-[1.5rem] bg-white/70 p-6">
    ...
  </article>
</div>
```

**MealPlanGrid props shape** (derived from RESEARCH.md D-10, D-13):
```typescript
// Grid receives slots map and renders skeleton vs real card per slot
type Props = {
  numDays: number;
  mealTypes: string[];
  slots: Record<string, MealSlot>;  // keyed by "Day::mealType"
  state: StreamState;
};
// Generate expected slot keys via buildExpectedSlots(numDays, mealTypes)
// For each key: slots[key] ? <MealCard meal={slots[key]} /> : <SkeletonMealCard />
```

---

### `src/components/generation/SkeletonMealCard.tsx` (component, shimmer)

**Analog:** `src/routes/home-page.tsx` article cards for structure; animate-pulse from Tailwind

**Card structure to match** (`home-page.tsx` lines 31-39):
```typescript
<article className="rounded-[1.5rem] bg-white/70 p-6">
  <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">...</p>
  <p className="mt-3 font-display text-3xl text-[var(--color-sage-deep)]">...</p>
  <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">...</p>
</article>
```

**Skeleton shimmer pattern** (Tailwind animate-pulse — UI-SPEC mandates this):
```typescript
// Use animate-pulse on placeholder divs — NOT a wave sweep animation
export function SkeletonMealCard() {
  return (
    <article className="rounded-[1.5rem] bg-white/70 p-6 animate-pulse">
      <div className="h-3 w-16 rounded bg-[rgba(74,103,65,0.12)]" />
      <div className="mt-3 h-5 w-3/4 rounded bg-[rgba(74,103,65,0.12)]" />
      <div className="mt-3 h-3 w-full rounded bg-[rgba(74,103,65,0.08)]" />
      <div className="mt-1 h-3 w-5/6 rounded bg-[rgba(74,103,65,0.08)]" />
    </article>
  );
}
```

---

### `src/components/generation/MealCard.tsx` (component, display)

**Analog:** `src/routes/home-page.tsx` article cards (lines 31-51)

**Pattern** (`home-page.tsx` lines 31-39):
```typescript
// Phase 4: title + short_description only (D-11)
// Rationale stored in DB but NOT displayed
export function MealCard({ meal }: { meal: MealSlot }) {
  return (
    <article className="rounded-[1.5rem] bg-white/70 p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
        {meal.meal_type}
      </p>
      <p className="mt-3 font-display text-xl text-[var(--color-sage-deep)]">
        {meal.title}
      </p>
      <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
        {meal.short_description}
      </p>
    </article>
  );
}
```

---

### `src/components/generation/PlanReadyBanner.tsx` and `StreamErrorBanner.tsx` (components, banners)

**Analog:** `src/routes/household-page.tsx` — `SubmitBanner` component (lines 31-42)

**Banner pattern** (`household-page.tsx` lines 31-42):
```typescript
// SubmitBanner is the direct analog — copy the tone system
function SubmitBanner({ message, tone }: { message: string; tone: "error" | "success" }) {
  const colours =
    tone === "error"
      ? "bg-[rgba(128,59,38,0.08)] text-[#803b26]"
      : "bg-[rgba(74,103,65,0.10)] text-[var(--color-sage-deep)]";

  return (
    <p className={`rounded-xl px-4 py-3 text-sm leading-6 ${colours}`} role="alert">
      {message}
    </p>
  );
}
```

**PlanReadyBanner** — use `tone="success"` colors: `bg-[rgba(74,103,65,0.10)] text-[var(--color-sage-deep)]`

**StreamErrorBanner** — use `tone="error"` colors: `bg-[rgba(128,59,38,0.08)] text-[#803b26]`; include a "Try again" reset button that calls `onRetry` prop.

---

### `src/routes/plan-page.tsx` (route, rewrite)

**Analog:** `src/routes/household-page.tsx`

**Route + useParams pattern** (`plan-page.tsx` lines 1-17 — existing stub):
```typescript
import { useParams, useNavigate } from "react-router-dom";
const { id } = useParams();
// id === "new" → show GenerationForm
// id is a UUID → load existing plan (Phase 5; Phase 4 just shows the form/grid)
```

**Conditional empty state pattern** (`household-page.tsx` lines 143, 274-283):
```typescript
// Existing pattern: check data state, render different content
const isFirstTime = !isLoading && household === null;
// Phase 4 equivalent: id === "new" || streamState === "idle" → show GenerationForm
```

**Page-level layout pattern** (`household-page.tsx` lines 259-661):
```typescript
// Top-level is a <form> or <div> with space-y-8
// Each logical section is a <section> with the glassmorphism card class
<div className="space-y-8">
  <GenerationForm ... />
  {/* After submit: */}
  <MealPlanGrid slots={slots} numDays={numDays} mealTypes={mealTypes} state={streamState} />
  {streamState === "complete" && <PlanReadyBanner />}
  {streamState === "error" && <StreamErrorBanner error={error} onRetry={handleReset} />}
</div>
```

---

### `src/routes/dev-page.tsx` (route, CRUD read)

**Analog:** `src/routes/home-page.tsx`

**Two-panel layout pattern** (`home-page.tsx` lines 14-88):
```typescript
// home-page uses grid with two columns; dev-page uses two stacked sections (D-17)
<section className="space-y-8">
  {/* Section 1: LLM Requests (live) */}
  <div className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
    <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">LLM Requests</p>
    <h2 className="mt-3 font-display text-4xl text-[var(--color-sage-deep)]">Last 10 LLM calls</h2>
    {/* LLMRequestsSection */}
  </div>
  {/* Section 2: Spoonacular Usage — placeholder for Phase 6 */}
  <div className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm opacity-50">
    <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">Spoonacular Usage</p>
    <p className="mt-3 text-sm text-[var(--color-muted)]">Coming in Phase 6.</p>
  </div>
</section>
```

**LLM log entry display** (D-18 — collapsible prompt/response preview):
```typescript
// Use <details>/<summary> for collapsible — matches editorial simplicity preference
<details className="mt-2 text-xs text-[var(--color-muted)]">
  <summary className="cursor-pointer hover:text-[var(--color-sage-deep)]">View prompt / response</summary>
  <pre className="mt-2 overflow-auto rounded-lg bg-white/60 p-3 text-xs">{log.prompt}</pre>
  <pre className="mt-2 overflow-auto rounded-lg bg-white/60 p-3 text-xs">{log.response}</pre>
</details>
```

---

### `src/app/router.tsx` (modify — add `/dev` and `/plan/new` handling)

**Analog:** `src/app/router.tsx` (existing, lines 1-62)

**Route registration pattern** (`router.tsx` lines 11-51):
```typescript
// Add dev route — no ProtectedRoute (D-16: no auth gating for PoC)
{
  path: "dev",
  element: <DevPage />,
},
// plan/:id already exists (line 43-49); no change needed
// PlanPage itself handles id === "new"
```

---

### `src/app/layout/AppFrame.tsx` (modify — add Dev nav link)

**Analog:** `src/app/layout/AppFrame.tsx` (existing, lines 7-11)

**navItems pattern** (`AppFrame.tsx` lines 7-11):
```typescript
const navItems = [
  { label: "Overview", to: "/" },
  { label: "Household", to: "/household" },
  { label: "Plan", to: "/plan/new" },   // update from /plan/sample-plan
  { label: "Dev", to: "/dev" },          // add (D-16: label is "Dev")
];
// NavLink className pattern (lines 52-62) is unchanged — applies to all nav items automatically
```

---

## Shared Patterns

### Glassmorphism Card Container
**Source:** `src/routes/household-page.tsx` lines 261-262, 289-290, 354-355
**Apply to:** All page-level section containers in `plan-page.tsx`, `dev-page.tsx`, `GenerationForm.tsx`
```typescript
className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm"
```

### Eyebrow + Heading Typography
**Source:** `src/routes/household-page.tsx` lines 291-298
**Apply to:** All section headings in generation components and dev page
```typescript
<p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">{eyebrow}</p>
<h2 className="mt-3 font-display text-4xl leading-tight text-[var(--color-sage-deep)]">{heading}</h2>
```

### Auth Token Retrieval (Frontend)
**Source:** `src/lib/trpc/client.ts` lines 23-27
**Apply to:** `use-generation-stream.ts` fetch call (the SSE fetch needs Bearer token exactly like tRPC headers)
```typescript
const { data } = await supabase.auth.getSession();
const token = data.session?.access_token;
const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
```

### Auth Validation (Edge Function)
**Source:** `supabase/functions/trpc/index.ts` lines 214-232
**Apply to:** `generate-draft/index.ts` rewrite — extract userId at top of handler, 401 if missing
```typescript
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
if (!userId) return new Response("Unauthorized", { status: 401 });
```

### tRPC Error Pattern
**Source:** `supabase/functions/trpc/index.ts` lines 97-99
**Apply to:** All new tRPC procedures (`mealPlan.create`, `devTools.llmLogs`)
```typescript
if (error) {
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
}
```

### Button Class Composition
**Source:** `src/routes/household-page.tsx` lines 54-58, 61-67
**Apply to:** All buttons in `GenerationForm.tsx`
```typescript
// submitCls() — primary action button
function submitCls() {
  return [
    "rounded-xl bg-[#4A6741] px-6 text-white font-semibold text-sm tracking-wide",
    "transition-opacity disabled:opacity-60 min-h-[44px]",
  ].join(" ");
}
// chipCls(active) — preset toggle buttons
function chipCls(active: boolean) {
  return [
    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
    active
      ? "border-[#4A6741] bg-[#4A6741] text-white"
      : "border-[rgba(74,103,65,0.25)] bg-white/80 text-[var(--color-sage-deep)] hover:border-[#4A6741]",
  ].join(" ");
}
```

### React Query Hook Shape
**Source:** `src/hooks/use-household.ts` lines 35-57
**Apply to:** `use-llm-logs.ts`
```typescript
// Pattern: useQuery with queryKey array, queryFn calling trpcClient.query, staleTime
const query = useQuery<ReturnType>({
  queryKey: ["query-key"],
  queryFn: () => trpcClient.query("procedure.path") as Promise<ReturnType>,
  staleTime: 60_000,
});
return { data: query.data ?? default, isLoading: query.isLoading, error: ... };
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/hooks/use-generation-stream.ts` (core logic) | hook | streaming | No streaming hooks exist yet; pattern sourced from RESEARCH.md spike-validated Pattern 2 + native Fetch/ReadableStream API |

---

## Metadata

**Analog search scope:** `src/routes/`, `src/hooks/`, `src/lib/`, `src/components/`, `supabase/functions/`, `supabase/migrations/`
**Files scanned:** 16
**Pattern extraction date:** 2026-04-20
