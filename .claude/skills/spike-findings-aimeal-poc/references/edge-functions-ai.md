# Edge Functions + AI

## Validated Patterns

### tRPC v11 in Deno edge runtime
`npm:@trpc/server@11` and `npm:zod@3` resolve correctly inside Supabase Edge Functions (Deno).
Use the fetch adapter — no Node.js required.

```typescript
import { initTRPC } from "npm:@trpc/server@11";
import { fetchRequestHandler } from "npm:@trpc/server@11/adapters/fetch";
import { z } from "npm:zod@3";

const t = initTRPC.create();
const appRouter = t.router({ /* procedures */ });

Deno.serve((req) => {
  return fetchRequestHandler({
    endpoint: "/trpc",   // ← CRITICAL: use "/<function-name>", NOT "/functions/v1/<function-name>"
    req,
    router: appRouter,
    createContext: () => ({}),
  });
});
```

**Critical endpoint path rule:** Supabase edge runtime strips `/functions/v1/` before the handler
sees the request. If your function is named `trpc`, the path arrives as `/trpc/ping`, not
`/functions/v1/trpc/ping`. Set `endpoint: "/trpc"` accordingly.

Verified: `ping` query and `generateDraft` mutation both work.

### Grok via OpenAI-compatible SDK in Deno
Use the Deno-compatible OpenAI SDK via `deno.land/x`, pointing baseURL at xAI:

```typescript
import OpenAI from "https://deno.land/x/openai@v4.69.0/mod.ts";

const client = new OpenAI({
  apiKey: Deno.env.get("XAI_API_KEY") ?? "",
  baseURL: "https://api.x.ai/v1",
});

const completion = await client.chat.completions.create({
  model: "grok-4-1-fast-non-reasoning",
  temperature: 0.7,
  response_format: { type: "json_object" },
  messages: [...],
});
```

### Correct model for structured JSON generation
Available models on this account (April 2026):
`grok-3`, `grok-3-mini`, `grok-4-0709`, `grok-4-1-fast-non-reasoning`, `grok-4-1-fast-reasoning`,
`grok-4-fast-non-reasoning`, `grok-4-fast-reasoning`, `grok-4.20-*`, `grok-code-fast-1`

**Use `grok-4-1-fast-non-reasoning`** for draft generation.
Latency comparison for 21-meal JSON plan:
- `grok-3-mini`: ~39s (reasoning model — chain-of-thought adds huge overhead)
- `grok-4-fast-non-reasoning`: ~13s
- `grok-4-1-fast-non-reasoning`: ~11s
- `grok-4-1-fast-non-reasoning` (no rationale field): ~10s / 1645 tokens ← current best

### Prompt schema for 21-meal draft (no rationale)
Drop `rationale` from the draft call — saves ~30% tokens, not visible until user clicks a card.

```typescript
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
```

### Local dev: bypass JWT for edge function testing
```bash
supabase functions serve <fn-name> --env-file supabase/functions/.env --no-verify-jwt
```
Without `--no-verify-jwt`, curl returns `{"msg":"Error: Missing authorization header"}`.

### Secrets file location
`supabase/functions/.env` — loaded with `--env-file` flag. Not committed (in .gitignore).
Variables: `XAI_API_KEY`, `SPOONACULAR_API_KEY`.

## Landmines

- **`grok-3-mini` latency** — reasoning model; adds 30s+ of chain-of-thought. Never use for
  structured JSON generation where latency matters.
- **Model name format** — xAI model names are NOT OpenAI-style (no `grok-2-1212` etc.).
  Always verify against `GET https://api.x.ai/v1/models` with your key.
- **tRPC endpoint path** — setting `endpoint: "/functions/v1/trpc"` produces
  `"No procedure found on path \"\""`. The runtime strips the prefix before the handler.
- **`--env-file` path is relative to CWD** — run `supabase functions serve` from the project
  root, not from inside a spike directory.

## Constraints

- **Batch latency floor ~10s** for 21-meal JSON. Cannot go lower without streaming.
- **Streaming is the path to < 2s UX** — stream tokens from Grok → Edge Function → client,
  render each meal card as JSON objects complete. Batch call acceptable for PoC with spinner.
- `response_format: { type: "json_object" }` required — without it, models wrap JSON in markdown.
- Token budget: ~1600–2800 tokens per full draft generation (well within any model's context window).

## Origin
Synthesized from spikes: 002, 003
Source files: `sources/002-edge-fn-grok-json/`, `sources/003-trpc-edge-fn-wiring/`
