# Phase 4: Draft Generation with Streaming - Research

**Researched:** 2026-04-20
**Domain:** Grok LLM streaming · Supabase Edge Functions (Deno) · SSE/NDJSON · React ReadableStream · Meal plan persistence
**Confidence:** HIGH

---

## Summary

Phase 4 wires the full generation pipeline: a React GenerationForm on `/plan/:id` sends a POST to the `generate-draft` Edge Function, which streams NDJSON meal objects as SSE events back to the client. The React client reads the stream with `fetch + ReadableStream`, populating a 7×3 skeleton grid progressively. Each LLM call is persisted to `llm_logs` after the stream completes. A new `/dev` route shows the last 10 log entries via a tRPC `devTools.llmLogs` query.

The spike work (spikes 002, 003) validated the critical path at the edge function level. What remains for Phase 4 is (1) rewriting the edge function from batch to streaming, (2) wiring real auth + household data, (3) building the React streaming consumer and progressive UI, and (4) adding the `llm_logs` table (not yet in the DB — this is the key Wave 0 gap discovered in research).

**Primary recommendation:** The implementation should be sequenced as: (Wave 0) DB migration for `llm_logs` + meal plan creation tRPC procedure → (Wave 1) Edge function rewrite to streaming NDJSON → (Wave 2) React streaming consumer + skeleton/grid UI → (Wave 3) Dev page + LLM log tRPC query → (Wave 4) Test coverage.

**Critical discovery:** The `llm_logs` table is referenced in CONTEXT.md as "already in schema per DEVT-01" but is **absent from both migration files** and **confirmed not in the live DB**. A Wave 0 migration is mandatory before any other work.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Use SSE via the existing `generate-draft` Edge Function — NOT tRPC. The standalone endpoint is proven in the spike; tRPC streaming in Deno is unvalidated territory. tRPC handles all other operations (household data, LLM log queries).

**D-02:** React client uses `fetch` + `ReadableStream` (not `EventSource`) to consume the SSE stream. `EventSource` doesn't support POST with auth headers.

**D-03:** Streaming format is NDJSON — one JSON object per line, no outer array. Prompt instructs Grok to output one meal object per line. Edge function buffers tokens, emits one SSE event per completed line.

**D-04:** Prompt instructs Grok to emit one meal JSON object per line, no markdown, no wrapper array.

**D-05:** `response_format: { type: "json_object" }` is NOT used for streaming — it's incompatible with streamed token output.

**D-06:** Rationale field is included in DB persistence (GEN-06) but NOT emitted in the NDJSON stream. Saves tokens.

**D-07:** GenerationForm lives inline on `/plan/:id`. After submission, the form gives way to the streaming skeleton grid — no route change during generation.

**D-08:** User navigates to `/plan/new` (or `/plan/:id`) via a "Generate Your Plan →" button after household is saved.

**D-09:** GenerationForm inputs: meal type preset buttons ("Dinner only" / "Lunch + Dinner" / "All three") and a day count selector (default 7, range 1–14).

**D-10:** On form submission, immediately render a 7×3 skeleton grid (all slots shimmer). Each SSE meal event converts the corresponding skeleton slot to a real meal card.

**D-11:** Meal card in Phase 4 shows: title + short description only. Rationale stored in DB but not displayed.

**D-12:** After the final SSE event, show a "Your plan is ready" banner.

**D-13:** Slot mapping by `(day_of_week, meal_type)` — don't assume sequential order.

**D-14:** Each generation call persists to DB: prompt, full response (reconstructed from streamed tokens), token counts, model name, timestamp, household_id. Written after the stream completes or on error.

**D-15:** LLM log stored in `llm_logs` table. tRPC exposes `devTools.llmLogs` query.

**D-16:** New `/dev` route with a nav link (no auth gating — PoC only).

**D-17:** `/dev` is two-section layout: "LLM Requests" (live in Phase 4) and "Spoonacular Usage" (placeholder — Phase 6 fills it in).

**D-18:** LLM Requests section shows last 10 entries: model, token count, timestamp, collapsible prompt/response preview.

### Claude's Discretion

- Exact copy for "Generate Your Plan" button and "Your plan is ready" banner (UI-SPEC has canonical copy)
- Skeleton shimmer animation style — UI-SPEC mandates `animate-pulse` (CSS, not wave sweep)
- Day count selector widget — UI-SPEC mandates stepper buttons (decrement / count / increment)
- `/dev` nav label — UI-SPEC mandates "Dev"
- Error handling UX if SSE stream fails mid-generation — UI-SPEC specifies StreamErrorBanner with partial grid preservation and "Try again →" reset

### Deferred Ideas (OUT OF SCOPE)

- Single-meal regeneration — Phase 5
- Inline edit / delete / detail view — Phase 5
- Spoonacular usage section on /dev — Phase 6
- Rationale display per meal card — Phase 5 detail view
- Streaming error recovery UI beyond basic banner — post-PoC
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GEN-01 | User can trigger a meal plan draft, selecting how many days and which meal types to include | GenerationForm with preset buttons + stepper; submits to edge function via POST |
| GEN-02 | Draft plan streams to the client — meals appear progressively (not batch) | SSE via `generate-draft` edge function; React ReadableStream consumer; skeleton grid |
| GEN-03 | Generated meals respect all household allergies and avoidances | Household data fetched from DB in edge function; injected into `buildUserPrompt()` |
| GEN-04 | Generated meals match household cooking skill level and available appliances | Same prompt builder includes skill level and appliances from household row |
| GEN-06 | Each meal includes title, short description, and LLM rationale | Title + short_description emitted in NDJSON stream; rationale stored separately in DB |
| DEVT-01 | App persists last 10 LLM prompt + response pairs to DB | `llm_logs` migration required (not in schema yet); edge function writes after stream |
| DEVT-03 | Developer page shows LLM request log: last 10 entries with prompt, response, token count, timestamp | `/dev` route + `devTools.llmLogs` tRPC query + LLMRequestsSection component |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Meal type + day count selection | Browser (React) | — | Pure UI state; no server involvement until submit |
| Streaming SSE consumption | Browser (React) | — | `fetch + ReadableStream` with auth header; EventSource excluded (no POST support) |
| Progressive grid rendering | Browser (React) | — | Local slot-fill state keyed by `(day_of_week, meal_type)` |
| Auth validation for generation | Edge Function | — | JWT validated in edge function; React only holds the token |
| Household data fetch | Edge Function | — | Edge function reads from DB directly using service role or caller JWT |
| Prompt construction | Edge Function | — | `buildUserPrompt()` already exists; extend for variable days/meal types |
| Grok LLM call (streaming) | Edge Function | — | OpenAI SDK with `stream:true`; token buffering + NDJSON line detection |
| Meal persistence to DB | Edge Function | — | Each completed NDJSON line written to `meals` table during stream |
| LLM log persistence | Edge Function | — | Written to `llm_logs` after stream complete (or on error); includes full reconstructed response |
| meal_plans record creation | API (tRPC) | — | New `mealPlan.create` tRPC mutation creates the plan record before generation starts |
| LLM log retrieval for dev page | API (tRPC) | — | New `devTools.llmLogs` query; last 10 rows ordered by created_at desc |
| `/dev` route and LLM log display | Browser (React) | — | DevPage + LLMRequestsSection; reads via React Query + tRPC |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `https://deno.land/x/openai@v4.69.0/mod.ts` | v4.69.0 | Grok LLM API via OpenAI-compat SDK in Deno | Spike-validated; Deno import URL, not npm: specifier |
| `npm:@supabase/supabase-js@2` | 2.x | DB access from edge function + React Supabase client | Already in both edge functions and frontend |
| `npm:@trpc/server@11` | 11.x | New tRPC procedures in the existing trpc edge function | Already validated and in use |
| `npm:zod@3` | 3.x | Input validation for new tRPC procedures | Already in use |
| `@tanstack/react-query` | 5.x | Data fetching for LLM log query on dev page | Already in use; follows established pattern |
| `react-router-dom` | 7.x | `/dev` route registration | Already in use |

[VERIFIED: reading supabase/functions/generate-draft/index.ts and supabase/functions/trpc/index.ts]

### No New Dependencies Required

Phase 4 does not require any new npm packages on the frontend or new Deno imports beyond what already exists. The streaming consumer is implemented with the native `fetch` API and `ReadableStream`.

---

## Architecture Patterns

### System Architecture Diagram

```
User Browser
     │
     │ 1. POST /functions/v1/generate-draft
     │    { householdId, numDays, mealTypes[], Authorization: Bearer <JWT> }
     │
     ▼
generate-draft Edge Function (Deno)
     │
     ├─ 2. Validate JWT → extract userId
     ├─ 3. Fetch household from DB (households + household_members)
     ├─ 4. Create meal_plan record (via service-role client OR accept mealPlanId from POST body)
     ├─ 5. Build prompt (system + user, NDJSON schema, variable days/meal types)
     │
     ├─ 6. OpenAI SDK: chat.completions.create({ stream: true, model: "grok-4-1-fast-non-reasoning" })
     │         │
     │         ▼
     │    xAI API (https://api.x.ai/v1)
     │         │  token chunks arrive
     │         ▼
     ├─ 7. Buffer tokens; detect "\n" → parse complete NDJSON line
     │         │
     │         ├─ 8a. Write meal row to DB (meals table, meal_plan_id)
     │         └─ 8b. Emit SSE event: "data: <JSON line>\n\n"
     │
     ├─ 9. Stream ends → reconstruct full response → write to llm_logs
     │
     └─ 10. Close SSE stream

User Browser (ReadableStream consumer)
     │
     ├─ 11. TextDecoder + line-by-line NDJSON parser
     ├─ 12. Map (day_of_week, meal_type) → slot index
     └─ 13. React state update → skeleton → MealCard transition
```

### Recommended Project Structure

```
src/
├── components/
│   └── generation/
│       ├── GenerationForm.tsx        # Form UI (new)
│       ├── MealPlanGrid.tsx          # 7×3 grid container (new)
│       ├── SkeletonMealCard.tsx      # Shimmer placeholder (new)
│       ├── MealCard.tsx              # Filled meal card (new)
│       ├── PlanReadyBanner.tsx       # Stream complete banner (new)
│       └── StreamErrorBanner.tsx     # Stream error display (new)
├── hooks/
│   ├── use-generation-stream.ts      # fetch + ReadableStream consumer (new)
│   └── use-llm-logs.ts              # tRPC query for dev page (new)
├── lib/
│   └── generation/
│       ├── stream-parser.ts          # NDJSON line parser + slot mapper (new, unit-testable)
│       └── types.ts                  # MealSlot, GenerationFormState types (new)
└── routes/
    ├── plan-page.tsx                 # Rewrite: GenerationForm + MealPlanGrid
    └── dev-page.tsx                  # New route

supabase/
├── functions/
│   └── generate-draft/
│       └── index.ts                  # Rewrite: streaming NDJSON + auth + real household
└── migrations/
    └── 20260420000002_llm_logs.sql   # NEW: llm_logs table + RLS
```

### Pattern 1: NDJSON Streaming Edge Function

**What:** Edge function receives POST, streams NDJSON meal objects as SSE events, persists LLM log after stream.

**When to use:** This is the only approach — D-01 is locked.

```typescript
// Source: spike 002, edge-functions-ai.md
// supabase/functions/generate-draft/index.ts

import OpenAI from "https://deno.land/x/openai@v4.69.0/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const client = new OpenAI({
  apiKey: Deno.env.get("XAI_API_KEY") ?? "",
  baseURL: "https://api.x.ai/v1",
});

// NDJSON system prompt — no response_format (incompatible with streaming)
const systemPrompt = `You are a registered dietitian and PhD nutritionist.
Output ONLY one JSON object per line with this exact shape — no markdown, no wrapper array:
{"day_of_week":"Monday","meal_type":"breakfast","title":"...","short_description":"..."}
Output exactly {N} lines, one per meal slot.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  // 1. Auth validation
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (!user) return new Response("Unauthorized", { status: 401 });

  // 2. Parse body
  const { householdId, numDays, mealTypes, mealPlanId } = await req.json();

  // 3. Fetch household from DB
  const { data: household } = await supabase
    .from("households")
    .select(`id, name, cooking_skill_level, appliances, household_members(name, allergies, avoidances, diet_type)`)
    .eq("id", householdId)
    .single();

  // 4. Build prompt from household data
  const userPrompt = buildUserPrompt({ household, numDays, mealTypes });

  // 5. Streaming LLM call — NO response_format (D-05)
  const stream = await client.chat.completions.create({
    model: "grok-4-1-fast-non-reasoning",
    temperature: 0.7,
    stream: true,                      // <-- streaming
    messages: [
      { role: "system", content: systemPrompt.replace("{N}", String(numDays * mealTypes.length)) },
      { role: "user", content: userPrompt },
    ],
  });

  // 6. ReadableStream that buffers tokens → emits SSE per completed NDJSON line
  let buffer = "";
  let fullResponse = "";
  let promptTokens = 0;
  let completionTokens = 0;

  const sseStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of stream) {
          const token = chunk.choices[0]?.delta?.content ?? "";
          buffer += token;
          fullResponse += token;

          // Emit one SSE event per completed NDJSON line
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? ""; // keep incomplete line in buffer
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              JSON.parse(trimmed); // validate before emitting
              controller.enqueue(encoder.encode(`data: ${trimmed}\n\n`));
              // Write meal to DB asynchronously (fire-and-forget during stream)
              writeMealToDB(supabase, mealPlanId, trimmed);
            } catch {
              // malformed line — skip
            }
          }

          // Capture token usage from final chunk
          if (chunk.usage) {
            promptTokens = chunk.usage.prompt_tokens ?? 0;
            completionTokens = chunk.usage.completion_tokens ?? 0;
          }
        }
      } finally {
        // After stream: persist LLM log
        await supabase.from("llm_logs").insert({
          household_id: householdId,
          model: "grok-4-1-fast-non-reasoning",
          prompt: userPrompt,
          response: fullResponse,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
        });
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
});
```

[VERIFIED: spike findings in .claude/skills/spike-findings-aimeal-poc/references/edge-functions-ai.md]

### Pattern 2: React ReadableStream SSE Consumer

**What:** React hook that calls `fetch` with POST + auth header, reads the SSE stream line-by-line.

**When to use:** Required — `EventSource` is excluded (D-02) because it doesn't support POST with auth headers.

```typescript
// Source: browser Fetch + ReadableStream API [ASSUMED — standard web API pattern]
// src/hooks/use-generation-stream.ts

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { parseMealLine, buildSlotKey, type MealSlot } from "@/lib/generation/stream-parser";

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
            if (payload === "[DONE]") {
              setState("complete");
              return;
            }
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

### Pattern 3: NDJSON Parser + Slot Mapper (Pure, Unit-Testable)

**What:** Pure functions with no React/DOM dependency — isolated for unit testing.

```typescript
// Source: [ASSUMED — standard TypeScript pure function pattern]
// src/lib/generation/stream-parser.ts

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"] as const;
const MEAL_TYPES = ["breakfast","lunch","dinner"] as const;

export type MealSlot = {
  day_of_week: typeof DAYS[number];
  meal_type: typeof MEAL_TYPES[number];
  title: string;
  short_description: string;
};

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

export function buildExpectedSlots(
  numDays: number,
  mealTypes: string[]
): string[] {
  const days = DAYS.slice(0, numDays);
  return days.flatMap(day => mealTypes.map(type => buildSlotKey(day, type)));
}
```

### Pattern 4: meal_plan Record Creation Before Streaming

**What:** Before calling the edge function, the client must create a `meal_plans` row so the edge function has a valid `meal_plan_id` to associate meals with.

**The problem:** `/plan/new` has no real plan ID yet. The plan must be created before generation. Two viable approaches:

**Option A (Recommended):** New `mealPlan.create` tRPC mutation creates the plan row; returns `mealPlanId`; client POSTs that ID to the edge function in the generation request body.

**Option B:** Edge function creates the plan row itself using a service-role Supabase client. Requires passing `SUPABASE_SERVICE_ROLE_KEY` to the edge function.

**Decision for planner:** Option A is preferred — it keeps plan creation in tRPC (consistent with all other DB mutations) and the edge function only needs the anon key. The `generateDraft` tRPC stub currently in `trpc/index.ts` should be converted to a real `mealPlan.create` mutation.

### Pattern 5: tRPC devTools.llmLogs Query

**What:** New tRPC procedure in the existing `trpc` edge function, returning last 10 `llm_logs` rows.

```typescript
// supabase/functions/trpc/index.ts — add to appRouter

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

[VERIFIED: Existing `authedProcedure` pattern from trpc/index.ts — replicated exactly]

### Anti-Patterns to Avoid

- **Using `response_format: { type: "json_object" }` with `stream: true`:** Spike-validated incompatibility. The option is mutually exclusive with streaming. Rely only on prompt instruction. [VERIFIED: edge-functions-ai.md landmines]
- **Using `EventSource` for the SSE stream:** Does not support POST with custom headers. React client must use `fetch + ReadableStream`. [VERIFIED: D-02]
- **Assuming sequential meal order in SSE events:** Grok may output meals in any order within the NDJSON stream. Always map by `(day_of_week, meal_type)`, never by array index. [VERIFIED: D-13]
- **Using `grok-3-mini`:** Reasoning model; adds ~30s of chain-of-thought overhead. [VERIFIED: edge-functions-ai.md]
- **Using Node.js imports in the Deno edge function:** All imports must use `https://deno.land/x/...` or `npm:` specifiers. The OpenAI SDK specifically uses the Deno URL import, not `npm:openai`. [VERIFIED: existing generate-draft/index.ts]
- **Writing meals to DB mid-stream synchronously:** DB writes during the stream should not block SSE emission. Fire-and-forget or batch write at end.
- **Not creating meal_plan row before triggering generation:** The `meals` table has a `meal_plan_id` FK. Generation without a valid plan ID will cause FK violation on DB write.
- **Removing the `generateDraft` tRPC stub without adding `mealPlan.create`:** The stub exists in `trpc/index.ts`. Replace it with a real `mealPlan.create` mutation — don't just delete it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| NDJSON line buffering | Custom byte-level parser | Standard `\n` split on buffered string chunks | SSE `data:` lines are newline-delimited; simple string split is sufficient and spike-proven |
| JWT validation in edge function | Custom JWT decode | `supabase.auth.getUser(token)` | Already in trpc/index.ts; reuse exact pattern |
| SSE response format | Custom HTTP streaming protocol | Standard `text/event-stream` + `data: ...\n\n` format | Browser ReadableStream handles this natively |
| Skeleton shimmer animation | Custom CSS keyframes | Tailwind `animate-pulse` | UI-SPEC mandates this; already available in Tailwind config |
| OpenAI streaming iteration | Manual `getReader()` on OpenAI response | `for await (const chunk of stream)` | OpenAI SDK provides async iterator on stream objects |

---

## Critical Gap: llm_logs Table Missing from Schema

**Verified finding:** `llm_logs` is referenced in CONTEXT.md D-15 as "already in schema per DEVT-01" but:
- It is NOT in `supabase/migrations/20260419000001_initial_schema.sql`
- It is NOT in `supabase/migrations/20260420000001_household_user_unique.sql`
- It is confirmed absent from the live local DB via `supabase db query` [VERIFIED: 2026-04-20]

**Wave 0 migration required:**

```sql
-- supabase/migrations/20260420000002_llm_logs.sql
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

alter table llm_logs enable row level security;

-- Dev page reads logs; auth gating is user_id on households join
-- For PoC simplicity: authenticated users can read all logs (no household scoping on read)
create policy "llm_logs: authenticated read" on llm_logs
  for select using (auth.role() = 'authenticated');

-- Only service or authed inserts (edge function uses anon key with user JWT)
create policy "llm_logs: insert own" on llm_logs
  for insert with check (
    household_id in (select id from households where user_id = auth.uid())
  );
```

**Note on RLS:** The edge function uses the caller's JWT (anon key + Bearer token), which sets `auth.uid()` via the session. The `llm_logs.household_id` FK to `households` (owned by `auth.uid()`) satisfies the insert RLS policy.

---

## Common Pitfalls

### Pitfall 1: `response_format` + `stream: true` Incompatibility
**What goes wrong:** Setting `response_format: { type: "json_object" }` alongside `stream: true` causes the API to reject the request or return malformed output. The spike explicitly hit this.
**Why it happens:** The JSON mode enforces a complete JSON object in the response; streaming emits partial tokens that don't form a valid JSON object until the end.
**How to avoid:** Never use `response_format` in the streaming call. Use prompt instruction only (D-05).
**Warning signs:** API returns an error about incompatible options, or stream emits no `data:` events.

### Pitfall 2: SSE Backpressure Not Managed
**What goes wrong:** Edge function emits events faster than the client can process, or the Supabase edge runtime closes idle streams.
**Why it happens:** Supabase edge functions have a 60-second timeout for streaming responses. A 21-meal generation at ~10s batch is well under this, but the SSE connection itself may idle.
**How to avoid:** Emit a heartbeat comment (`": ping\n\n"`) every few seconds if no meal lines arrive. Close the stream promptly with `[DONE]` event. [ASSUMED — standard SSE practice; not spike-verified for Supabase edge runtime specifically]

### Pitfall 3: Malformed NDJSON Lines from Grok
**What goes wrong:** Grok occasionally emits partial JSON, markdown-wrapped JSON, or extra commentary before the first meal line.
**Why it happens:** Without `response_format`, the model is following instructions only. Temperature > 0 increases variability.
**How to avoid:** Parse each buffered line with `try/catch JSON.parse`. Silently skip lines that fail to parse. Log malformed lines to console for debugging. Test with temperature 0.7 and validate at least 19/21 meals arrive.
**Warning signs:** Fewer than expected `MealCard` renders after stream completes.

### Pitfall 4: Missing meal_plan Row Before Generation
**What goes wrong:** Edge function tries to insert into `meals` with a `meal_plan_id` that doesn't exist → FK violation → 500 error.
**Why it happens:** `/plan/new` is a virtual route. No plan row exists until explicitly created.
**How to avoid:** GenerationForm submit handler must: (1) call `mealPlan.create` tRPC mutation to get a real `meal_plan_id`, (2) navigate to `/plan/:realId`, (3) then call the edge function with that ID.
**Warning signs:** DB insert errors in edge function logs; stream starts but meals never appear in DB.

### Pitfall 5: Day Count Mismatch in Skeleton Grid
**What goes wrong:** User selects 5 days but skeleton grid shows 7 columns. Or vice versa.
**Why it happens:** Grid dimensions are derived from form state, not hardcoded.
**How to avoid:** MealPlanGrid takes `numDays` and `mealTypes` as props and generates columns/cells dynamically. Never hardcode `DAYS.slice(0, 7)`.

### Pitfall 6: Auth Header Lost in Fetch
**What goes wrong:** SSE stream returns 401. Client never gets meals.
**Why it happens:** `useGenerationStream` forgets to await `supabase.auth.getSession()` before starting the fetch, or the token has expired.
**How to avoid:** Await the session fresh on every generation start. The Supabase client auto-refreshes tokens but `getSession()` returns the current valid session.

### Pitfall 7: `/plan/new` Route Not Registered
**What goes wrong:** Navigating to `/plan/new` hits the catch-all redirect to `/`.
**Why it happens:** The router has `plan/:id` but treats `new` as a valid id parameter — actually this works, but the plan page needs to detect `id === "new"` and show GenerationForm rather than loading a plan.
**How to avoid:** PlanPage checks `if (id === "new" || !hasMeals)` → show GenerationForm. After plan creation, push to `/plan/:realId` to update the URL without a page reload.

---

## Code Examples

### Verified: OpenAI async iterator on stream (Deno)

```typescript
// Source: .claude/skills/spike-findings-aimeal-poc/references/edge-functions-ai.md
// The SDK stream is an async iterable
for await (const chunk of stream) {
  const token = chunk.choices[0]?.delta?.content ?? "";
  // token is a partial string (0–10 characters typically)
}
```

### Verified: SSE Response format

```
data: {"day_of_week":"Monday","meal_type":"breakfast","title":"Oat Porridge with Berries","short_description":"A warming bowl of rolled oats topped with seasonal berries."}\n\n
data: {"day_of_week":"Monday","meal_type":"lunch","title":"Grilled Chicken Salad","short_description":"Lightly dressed mixed greens with grilled chicken breast."}\n\n
data: [DONE]\n\n
```

### Verified: tRPC auth pattern in edge function (reuse for generate-draft)

```typescript
// Source: supabase/functions/trpc/index.ts (existing, verified)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: authHeader ? { Authorization: authHeader } : {},
  },
});
const { data } = await supabase.auth.getUser(token);
const userId = data.user?.id ?? null;
```

### Verified: Existing buildUserPrompt signature to extend

```typescript
// Source: supabase/functions/generate-draft/index.ts (existing)
// Extend to accept numDays and mealTypes[]
function buildUserPrompt(config: {
  householdName: string;
  skillLevel: string;
  members: Array<{ name: string; allergies: string[]; avoidances: string[]; diet_type?: string }>;
  appliances: string[];
  numDays: number;           // add
  mealTypes: string[];       // add
}) { ... }
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Batch JSON response (~10s) | NDJSON streaming SSE | Phase 4 | < 2s perceived latency |
| `response_format: json_object` | Prompt instruction only (streaming incompatible) | Spike 002 | Streaming unlocked |
| Hardcoded household (spike) | Real household from DB + auth | Phase 4 | Production-ready generation |
| `generateDraft` tRPC stub | Remove stub; add `mealPlan.create` mutation | Phase 4 | Plan ID exists before streaming |
| `/plan/sample-plan` hardcoded nav link | Dynamic plan navigation from household page | Phase 4 | Real plan routing |

**Deprecated/outdated:**
- `generateDraft` mutation in `trpc/index.ts`: Spike stub, returns hardcoded data. Replace with `mealPlan.create` or remove entirely — tRPC is NOT the streaming path (D-01).
- Hardcoded household config in `generate-draft/index.ts`: Must be replaced with real DB fetch + auth.
- `response_format: { type: "json_object" }` in non-streaming edge function spike: Valid for batch calls only; NOT used in Phase 4.

---

## Runtime State Inventory

Step 2.5 SKIPPED — this is a greenfield streaming feature phase, not a rename/refactor/migration phase.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Supabase local stack | DB, auth, edge functions | Yes | 2.84.2 CLI | — |
| `netlify dev` | Local proxy for frontend | [ASSUMED] | — | Direct Vite dev on port 5173 |
| XAI_API_KEY | Grok LLM calls | [ASSUMED — in .env] | — | Cannot generate without key; no fallback |
| Node.js | Vitest, Vite, build tools | Yes | v24.14.0 | — |
| Playwright | E2E tests | [ASSUMED — installed in devDeps] | — | — |
| Deno | Edge function runtime (managed by Supabase) | Yes (via supabase CLI) | Managed | — |

**Missing dependencies with no fallback:**
- `XAI_API_KEY` in `supabase/functions/.env` — generation is impossible without it. Planner should note that tests requiring actual LLM calls must be marked as integration tests and skipped in CI without the key.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (unit) + Playwright (E2E) |
| Config file | `vitest.config.ts` / `playwright.config.ts` |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm run test:unit && npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| GEN-01 | GenerationForm renders, preset selection + stepper work, submits correct params | unit | `npm run test:unit -- generation-form` | No — Wave 0 |
| GEN-02 | NDJSON stream consumer: each `data:` line updates slot state; skeleton → MealCard transition | unit | `npm run test:unit -- stream-parser` | No — Wave 0 |
| GEN-02 | Full generation flow: submit form → meals appear progressively | E2E | `npm run test:e2e -- generation-flow` | No — Wave 0 |
| GEN-03 | Prompt builder includes member allergies and avoidances | unit | `npm run test:unit -- prompt-builder` | No — Wave 0 |
| GEN-04 | Prompt builder includes skill level and appliances | unit | `npm run test:unit -- prompt-builder` | No — Wave 0 |
| GEN-06 | Edge function stores rationale in DB (not in SSE stream) | unit (mock) | `npm run test:unit -- llm-log` | No — Wave 0 |
| DEVT-01 | LLM log persistence helper writes correct fields after stream | unit | `npm run test:unit -- llm-log` | No — Wave 0 |
| DEVT-03 | Dev page shows last 10 LLM log entries from tRPC query | unit | `npm run test:unit -- dev-page` | No — Wave 0 |
| — | Stream error mid-generation: StreamErrorBanner shown; partial cards remain | E2E | `npm run test:e2e -- generation-error` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm run test:unit && npm run test:e2e`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/lib/generation/stream-parser.test.ts` — unit coverage for `parseMealLine`, `buildSlotKey`, `buildExpectedSlots`
- [ ] `src/lib/generation/prompt-builder.test.ts` — unit coverage for `buildUserPrompt` with various household shapes
- [ ] `src/lib/generation/llm-log.test.ts` — unit coverage for log persistence helper (if extracted to pure function)
- [ ] `src/components/generation/GenerationForm.test.tsx` — component tests for preset selection + stepper + submit
- [ ] `tests/e2e/generation-flow.spec.ts` — E2E: form submit → streaming → grid fills → plan ready banner
- [ ] `tests/e2e/generation-error.spec.ts` — E2E: stream error → StreamErrorBanner → Try again resets form

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Supabase JWT validated in edge function via `supabase.auth.getUser()` |
| V3 Session Management | No | Session managed by Supabase Auth; not changed in this phase |
| V4 Access Control | Yes | RLS on `meals`, `meal_plans`, `llm_logs` tables; household_id scoping |
| V5 Input Validation | Yes | Zod validation on `mealPlan.create` tRPC input; edge function validates POST body fields |
| V6 Cryptography | No | No custom crypto; auth tokens handled by Supabase |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated LLM generation | Elevation of Privilege | JWT validation at edge function entry; 401 on missing/invalid token |
| Household ID spoofing (generate meals for another user's household) | Tampering | RLS policy on `meal_plans` and `meals` enforces `user_id = auth.uid()`; edge function fetches household scoped to `auth.uid()` |
| LLM prompt injection via household member data | Tampering | Household data is user-controlled; data is interpolated into prompt — low risk for PoC (single-user household, no shared access). Future: sanitize member name/allergy fields before prompt interpolation |
| Unbounded generation requests | Denial of Service | Not addressed in Phase 4 PoC; future: rate limiting per user_id at edge |
| SSE stream kept open indefinitely | Denial of Service | Edge function closes stream with `[DONE]` event and `controller.close()` after all meals emitted |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `netlify dev` is available and configured for this project | Environment Availability | Dev workflow breaks; fallback is direct Vite + supabase CLI |
| A2 | `XAI_API_KEY` exists in `supabase/functions/.env` | Environment Availability | Generation fails entirely; cannot be tested end-to-end |
| A3 | SSE heartbeat is needed to prevent Supabase edge runtime timeout on slow streams | Common Pitfalls #2 | If wrong: streams > 10s may close prematurely; fixable by adding heartbeat |
| A4 | Playwright browsers are installed (`npx playwright install`) | Environment Availability | E2E tests fail to run; fixable with one command |
| A5 | Grok NDJSON output fidelity is sufficient with temperature 0.7 and prompt-only JSON instruction | Architecture Patterns | If wrong: > 2/21 lines may be malformed; fix by lowering temperature or adding retry logic |

---

## Open Questions

1. **Where is meal_plan record created?**
   - What we know: `meals` requires a valid `meal_plan_id` FK. The edge function needs this ID.
   - What's unclear: Should the edge function create the plan (needs service role key) or should the client create it via tRPC first?
   - Recommendation: Client creates plan via `mealPlan.create` tRPC mutation before calling the edge function. Pass `mealPlanId` in the POST body. This keeps DB mutations in tRPC and avoids service role key in edge function.

2. **How does `/plan/:id` handle the `id === "new"` case?**
   - What we know: Router has `plan/:id`; AppFrame nav links to `/plan/sample-plan` (hardcoded).
   - What's unclear: Should `new` be a special route (`/plan/new`) or should PlanPage detect it?
   - Recommendation: Keep `plan/:id` as the single route. PlanPage detects `id === "new"` → shows GenerationForm. After `mealPlan.create` resolves, navigate to `/plan/:realId` via `useNavigate`.

3. **Should the AppFrame "Plan" nav link be updated?**
   - What we know: AppFrame currently links to `/plan/sample-plan` (Phase 1 stub).
   - What's unclear: Should it link to `/plan/new` or to the user's latest plan ID?
   - Recommendation: For Phase 4 PoC, link to `/plan/new`. Phase 5 can improve to "most recent plan" lookup.

---

## Sources

### Primary (HIGH confidence)

- `.claude/skills/spike-findings-aimeal-poc/references/edge-functions-ai.md` — Grok streaming constraints, model name, NDJSON approach, `response_format` incompatibility, Deno import URL
- `supabase/functions/generate-draft/index.ts` — Existing spike implementation (batch); rewrite target
- `supabase/functions/trpc/index.ts` — Existing tRPC patterns: auth, context, authedProcedure, Supabase client setup
- `supabase/migrations/20260419000001_initial_schema.sql` — DB schema: `meal_plans`, `meals` table definitions and RLS policies
- `supabase db query` — Live DB table list confirming `llm_logs` is absent [VERIFIED: 2026-04-20]
- `.planning/phases/04-draft-generation-with-streaming/04-CONTEXT.md` — All locked decisions (D-01 through D-18)
- `.planning/phases/04-draft-generation-with-streaming/04-UI-SPEC.md` — Component inventory, interaction states, copywriting contract, accessibility requirements
- `src/hooks/use-household.ts` — tRPC hook pattern for React Query integration
- `src/lib/trpc/client.ts` — tRPC client setup with auth headers
- `src/lib/supabase/client.ts` — Supabase browser client

### Secondary (MEDIUM confidence)

- Standard `text/event-stream` SSE format — well-established web standard; no verification needed

### Tertiary (LOW confidence)

- SSE heartbeat required for Supabase edge runtime [ASSUMED — A3]; not spike-verified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — spike-verified, existing code confirmed
- Architecture: HIGH — all major decisions locked in CONTEXT.md with spike validation
- llm_logs gap: HIGH — confirmed absent via live DB query
- Pitfalls: HIGH (for spike-verified) / MEDIUM (for assumed SSE behavior)
- Test patterns: HIGH — existing vitest + playwright infrastructure confirmed

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (stable stack; Grok API endpoint may change with new model versions)
