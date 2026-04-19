# Testing Patterns

**Analysis Date:** 2026-04-19

## Current State

No test files, test framework config, or test runner configuration exists in this codebase.
The project is at PoC / spike stage — all validation has been done through live spike execution
against real services rather than automated tests.

**No test files detected:**
- No `*.test.ts`, `*.spec.ts`, `*.test.tsx`, `*.spec.tsx` files
- No `jest.config.*`, `vitest.config.*`, or `deno test` configuration
- No `__tests__/` directories

## Spike Validation Approach (Current Practice)

Instead of automated tests, spikes were executed directly against live services and findings
captured in `/Users/jabroni/Projects/aimeal-poc/.claude/skills/spike-findings-aimeal-poc/`.

**Spike sources preserved at:**
- `supabase/functions/generate-draft/index.ts` — live-tested against Grok API
- `supabase/functions/trpc/index.ts` — live-tested against local Supabase edge runtime

**Manual validation commands used during spikes:**
```bash
# Start local Supabase
supabase start

# Serve edge function with secrets (bypass JWT for testing)
supabase functions serve generate-draft --env-file supabase/functions/.env --no-verify-jwt
supabase functions serve trpc --env-file supabase/functions/.env --no-verify-jwt

# Curl tests
curl -X POST http://127.0.0.1:54331/functions/v1/generate-draft
curl http://127.0.0.1:54331/functions/v1/trpc/ping
curl -X POST http://127.0.0.1:54331/functions/v1/trpc/generateDraft \
  -H "Content-Type: application/json" \
  -d '{"json":{"householdId":"00000000-0000-0000-0000-000000000001","numDays":7}}'

# Verify schema drift
supabase db diff
```

## Recommended Testing Setup (Not Yet Implemented)

Based on the stack (Deno edge functions + Vite/React frontend), the appropriate frameworks are:

**Edge Functions (Deno):**
- Framework: `deno test` (built-in, no install required)
- Test file naming: `<module>.test.ts` co-located with source, or in `supabase/functions/_tests/`
- Run command: `deno test --allow-env supabase/functions/`

**Frontend (Vite + React):**
- Framework: Vitest (Vite-native, matches build toolchain)
- Config file: `vitest.config.ts`
- Run commands:
  ```bash
  npx vitest              # Watch mode
  npx vitest run          # Single run
  npx vitest run --coverage  # With coverage
  ```

## What Needs Tests (Priority Order)

**High priority — business-critical logic:**

1. **LLM response validation** (`supabase/functions/generate-draft/index.ts`)
   - The post-LLM validation block (lines 80-83) checks `meals.length === 21` and full day/type coverage
   - This should be unit-tested with fixture JSON payloads — both valid and malformed Grok responses
   - Risk: silent `valid: false` with no user-facing error

2. **tRPC input validation** (`supabase/functions/trpc/index.ts`)
   - Zod schema on `generateDraft` input — test boundary values for `numDays` (0, 1, 14, 15)
   - Test invalid UUID for `householdId`

3. **Spoonacular field mapping**
   - The `instructions` extraction uses `?.` chaining: `info.analyzedInstructions[0]?.steps?.map(s => s.step) ?? []`
   - Some recipes return empty `analyzedInstructions` — guard tested in spike but not in automated tests
   - Files: future `supabase/functions/enrich-meal/index.ts`

4. **buildUserPrompt** (`supabase/functions/generate-draft/index.ts` line 26-43)
   - Pure function — ideal unit test candidate
   - Test: members with no allergies, members with diet_type, empty appliances array

**Medium priority:**

5. **Frontend hooks** (future `src/hooks/useGenerateDraft.ts`, `useEnrichMeal.ts`, `useFinalizePlan.ts`)
   - TanStack Query hooks — test with mock tRPC client

6. **Component rendering** (future `src/components/meal-plan/`)
   - MealCard status display (draft vs enriched)
   - MealPlanGrid layout (7 days × 3 meal types = 21 cells)

## Patterns to Use When Tests Are Added

**Deno unit test pattern:**
```typescript
import { assertEquals } from "https://deno.land/std/assert/mod.ts";
import { buildUserPrompt } from "./index.ts";  // refactor to export helpers

Deno.test("buildUserPrompt includes allergy constraints", () => {
  const result = buildUserPrompt({
    householdName: "Test Family",
    skillLevel: "beginner",
    members: [{ name: "Alice", allergies: ["peanuts"], avoidances: [], diet_type: undefined }],
    appliances: ["oven"],
  });
  assert(result.includes("peanuts"));
});
```

**LLM response fixture testing pattern:**
```typescript
const validResponse = {
  meals: DAYS.flatMap(day =>
    MEAL_TYPES.map(type => ({
      day_of_week: day,
      meal_type: type,
      title: `${day} ${type}`,
      short_description: "A meal.",
    }))
  ),
};

Deno.test("validates 21-meal response as valid", () => {
  const { meals } = validResponse;
  const valid = meals.length === 21 &&
    DAYS.every(day => MEAL_TYPES.every(type =>
      meals.some(m => m.day_of_week === day && m.meal_type === type)
    ));
  assertEquals(valid, true);
});
```

**Vitest mock pattern for tRPC (frontend):**
```typescript
import { vi } from "vitest";

vi.mock("../lib/trpc", () => ({
  trpc: {
    generateDraft: {
      useMutation: () => ({
        mutate: vi.fn(),
        isLoading: false,
      }),
    },
  },
}));
```

## Mocking

**What to mock:**
- Grok API calls (avoid real LLM calls in tests — use fixture JSON responses)
- Spoonacular API calls (use captured response fixtures from spike 005)
- Supabase client (mock `supabase-js` or use local Supabase instance)

**What NOT to mock:**
- Zod validation (test with real schemas — mocking defeats the purpose)
- `buildUserPrompt` and other pure functions (test directly)
- DB migration SQL (test via `supabase db diff` in CI)

## Fixtures and Test Data

**Capture from spike sources:**
- LLM response fixture: `supabase/functions/generate-draft/` output (21-meal JSON structure)
- Spoonacular response fixture: documented in `.claude/skills/spike-findings-aimeal-poc/references/spoonacular-enrichment.md`

**Recommended fixture location (when created):**
- `supabase/functions/_fixtures/grok-21-meal-response.json`
- `supabase/functions/_fixtures/spoonacular-recipe-info.json`

## CI Integration

**Not yet configured.** Architecture doc mentions GitHub Actions for deploy, but no test step defined.

**When adding CI (`supabase db diff` check is the first step to add):**
```yaml
- name: Check schema drift
  run: supabase db diff
  # "No schema changes found" = pass
```

## Coverage

**Requirements:** None enforced (PoC stage)

**Target when tests are added:** Focus on the validation/parsing logic paths first — these are
the highest-risk areas with no current safety net.

---

*Testing analysis: 2026-04-19*
