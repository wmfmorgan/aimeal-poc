# Phase 3: Household Setup - Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 8 new/modified files
**Analogs found:** 8 / 8

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/routes/household-page.tsx` | route/page | CRUD + request-response | `src/routes/auth-page.tsx` | role-match (same route pattern, both have form state + submit + banner) |
| `src/lib/household/types.ts` | utility/constants | transform | `src/lib/auth/auth-copy.ts` | partial (same constants/types file pattern) |
| `src/lib/household/validation.ts` | utility | transform | `src/lib/auth/validation.ts` | exact (same validation helper pattern) |
| `src/lib/household/validation.test.ts` | test | — | `src/lib/auth/validation.test.ts` | exact (same describe/it/expect pattern) |
| `src/hooks/use-household.ts` | hook | request-response + CRUD | `src/hooks/use-ping-status.ts` | role-match (same useQuery + trpcClient pattern) |
| `src/lib/trpc/client.ts` | utility | request-response | self (modification) | — (add auth headers to existing file) |
| `supabase/functions/trpc/index.ts` | service | CRUD + request-response | self (modification) | — (add household router namespace to existing file) |
| `tests/e2e/household-setup.spec.ts` | test | — | *(no existing E2E test for this app)* | none |

---

## Pattern Assignments

### `src/routes/household-page.tsx` (route/page, CRUD)

**Analog:** `src/routes/auth-page.tsx`

**Imports pattern** (auth-page.tsx lines 19-32):
```typescript
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-state";
import { AUTH_COPY } from "@/lib/auth/auth-copy";
import {
  validateSignIn,
  hasErrors,
} from "@/lib/auth/validation";
```

For `household-page.tsx`, replace with:
```typescript
import { useState } from "react";
import { useHousehold } from "@/hooks/use-household";
import { HOUSEHOLD_COPY } from "@/lib/household/types";
import {
  validateHouseholdName,
  validateMemberName,
  hasHouseholdErrors,
} from "@/lib/household/validation";
import type { MemberDraft, HouseholdDraft } from "@/lib/household/types";
```

**Glassmorphism card pattern** (auth-page.tsx line 326):
```tsx
<div className="w-full max-w-[32rem] rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
```

For the household page (wider, multi-section, no max-width):
```tsx
<div className="space-y-8">
  <div className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-6 py-6 md:px-8 md:py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
    {/* card content */}
  </div>
</div>
```

**Section heading pattern** (auth-page.tsx lines 329-334):
```tsx
<div className="mb-6 space-y-3">
  <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
    {/* eyebrow */}
  </p>
  <h2 className="font-display text-[20px] font-semibold leading-snug text-[var(--color-sage-deep)]">
    {/* heading */}
  </h2>
</div>
```

**Input field pattern** (auth-page.tsx lines 383-397):
```tsx
<div>
  <label className="block text-sm font-semibold text-[var(--color-ink)] mb-2">
    Label Text
  </label>
  <input
    type="text"
    value={value}
    onChange={(e) => setValue(e.target.value)}
    className={inputCls(!!fieldErrors.fieldName)}
    placeholder="Placeholder…"
    disabled={isSubmitting}
  />
  <FieldError message={fieldErrors.fieldName} />
</div>
```

**inputCls helper** (auth-page.tsx lines 299-307) — copy verbatim:
```typescript
function inputCls(hasError: boolean) {
  return [
    "w-full rounded-xl border px-4 py-3 text-base text-[var(--color-ink)] bg-white/80",
    "placeholder:text-[var(--color-muted)] transition-colors outline-none",
    hasError
      ? "border-[#803b26] focus:ring-2 focus:ring-[#803b26]/30"
      : "border-[rgba(74,103,65,0.2)] focus:border-[#4A6741] focus:ring-2 focus:ring-[#4A6741]/20",
  ].join(" ");
}
```

**submitCls helper** (auth-page.tsx lines 312-318) — copy verbatim:
```typescript
function submitCls() {
  return [
    "w-full rounded-xl bg-[#4A6741] px-6 text-white font-semibold text-sm tracking-wide",
    "transition-opacity disabled:opacity-60",
    "min-h-[44px]",
  ].join(" ");
}
```

**FieldError primitive** (auth-page.tsx lines 44-51) — copy verbatim:
```tsx
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-sm text-[#803b26]" role="alert">
      {message}
    </p>
  );
}
```

**SubmitBanner primitive** (auth-page.tsx lines 53-63) — copy verbatim:
```tsx
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

**Segmented control pattern** (auth-page.tsx lines 349-366) — mode-switcher is the exact pattern for the Cooking Skill control:
```tsx
<div className="flex rounded-xl bg-[rgba(74,103,65,0.06)] p-1">
  {(["beginner", "intermediate", "advanced"] as const).map((level) => (
    <button
      key={level}
      type="button"
      onClick={() => setCookingSkill(level)}
      className={[
        "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors min-h-[44px]",
        cookingSkill === level
          ? "bg-[#4A6741] text-white shadow-sm"
          : "text-[var(--color-sage-deep)] hover:bg-white/60",
      ].join(" ")}
    >
      {/* capitalize label */}
    </button>
  ))}
</div>
```

**Form state + submit pattern** (auth-page.tsx lines 118-131, 190-209):
```typescript
// State shape
const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
const [submitError, setSubmitError] = useState<string | null>(null);
const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
const [isSubmitting, setIsSubmitting] = useState(false);
const hasSubmitted = useRef(false);

// Submit handler
async function handleSave(e: React.FormEvent) {
  e.preventDefault();
  hasSubmitted.current = true;
  const errors = validateHouseholdName(householdName);
  setFieldErrors(errors);
  if (hasHouseholdErrors(errors)) return;

  setIsSubmitting(true);
  setSubmitError(null);
  try {
    await upsert.mutateAsync({ /* payload */ });
    setSubmitSuccess("Household saved. Your meal plans will reflect these preferences.");
  } catch {
    setSubmitError("Something went wrong. Please try again.");
  } finally {
    setIsSubmitting(false);
  }
}
```

---

### `src/lib/household/types.ts` (utility/constants, transform)

**Analog:** `src/lib/auth/auth-copy.ts`

**Copy object pattern** (auth-copy.ts lines 8-56):
```typescript
export const HOUSEHOLD_COPY = {
  // eyebrows, headings, labels, placeholders, banners, errors
} as const;
```

**Constants/types pattern** — new additions for this file:
```typescript
export const BIG_9_ALLERGENS = [
  "Milk", "Eggs", "Fish", "Shellfish", "Tree Nuts",
  "Peanuts", "Wheat/Gluten", "Soy", "Sesame",
] as const;

export type Big9Allergen = typeof BIG_9_ALLERGENS[number];

export const DIET_TYPES = [
  { value: "omnivore",    label: "Omnivore" },
  { value: "vegetarian",  label: "Vegetarian" },
  { value: "vegan",       label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "halal",       label: "Halal" },
  { value: "kosher",      label: "Kosher" },
  { value: "gluten-free", label: "Gluten-Free" },
  { value: "other",       label: "Other" },
] as const;

export const APPLIANCE_PRESETS = [
  "Instant Pot", "Air Fryer", "Slow Cooker", "Wok",
  "Stand Mixer", "Blender", "Toaster Oven", "Grill / BBQ", "Sous Vide",
] as const;

// Client-side draft type (UI state — not persisted until Save)
export type MemberDraft = {
  id?: string;              // undefined for new (not yet persisted)
  name: string;
  allergies: string[];      // Big 9 selections + freeform custom tags merged
  avoidances: string[];     // freeform tags only
  dietType: string;
  // UI-only state
  isExpanded: boolean;
  isConfirmingDelete: boolean;
};

export type HouseholdDraft = {
  id?: string;
  name: string;
  cookingSkillLevel: "beginner" | "intermediate" | "advanced" | "";
  appliances: string[];
  members: MemberDraft[];
};
```

**File header comment** (auth-copy.ts lines 1-6):
```typescript
/**
 * household/types.ts
 *
 * Type definitions, draft state shapes, UI constants, and copy strings
 * for the household setup surface.
 */
```

---

### `src/lib/household/validation.ts` (utility, transform)

**Analog:** `src/lib/auth/validation.ts`

**File header comment** (validation.ts lines 1-6):
```typescript
/**
 * household/validation.ts
 *
 * Field-level validation helpers for the household form.
 * Returns a human-readable error string or null (valid).
 */
```

**Field validator pattern** (validation.ts lines 8-16):
```typescript
export function validateHouseholdName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Household name is required.";
  return null;
}

export function validateMemberName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Member name is required.";
  return null;
}
```

**Error interface pattern** (validation.ts lines 33-44):
```typescript
export interface HouseholdErrors extends Record<string, string | undefined> {
  name?: string;
  members?: string;  // e.g. "Add at least one household member before saving."
}

export interface MemberErrors extends Record<string, string | undefined> {
  name?: string;
}
```

**Form-level validator pattern** (validation.ts lines 52-59):
```typescript
export function validateHousehold(name: string, members: MemberDraft[]): HouseholdErrors {
  const errors: HouseholdErrors = {};
  const nameErr = validateHouseholdName(name);
  if (nameErr) errors.name = nameErr;
  if (members.length === 0) errors.members = "Add at least one household member before saving.";
  return errors;
}
```

**Tag input validation helpers** (new, same style as existing validators):
```typescript
export function addTag(tags: string[], input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return tags;
  if (tags.includes(trimmed)) return tags;
  return [...tags, trimmed];
}

export function removeTag(tags: string[], tag: string): string[] {
  return tags.filter((t) => t !== tag);
}

export function toggleChip(selected: string[], value: string): string[] {
  return selected.includes(value)
    ? selected.filter((v) => v !== value)
    : [...selected, value];
}
```

**hasErrors re-export** (validation.ts lines 92-94) — copy verbatim under new name:
```typescript
export function hasHouseholdErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some((v) => v !== undefined);
}
```

---

### `src/lib/household/validation.test.ts` (test)

**Analog:** `src/lib/auth/validation.test.ts`

**File header comment** (validation.test.ts lines 1-6):
```typescript
/**
 * household/validation.test.ts
 *
 * Unit coverage for household field-level and form-level validation helpers.
 */
```

**Imports pattern** (validation.test.ts lines 8-17):
```typescript
import { describe, it, expect } from "vitest";
import {
  validateHouseholdName,
  validateMemberName,
  validateHousehold,
  addTag,
  removeTag,
  toggleChip,
  hasHouseholdErrors,
} from "./validation";
```

**describe/it/expect block pattern** (validation.test.ts lines 23-47):
```typescript
describe("validateHouseholdName", () => {
  it("returns null for a non-empty name", () => {
    expect(validateHouseholdName("The Morgans")).toBeNull();
  });

  it("returns an error for an empty string", () => {
    expect(validateHouseholdName("")).not.toBeNull();
  });

  it("returns an error for whitespace-only input", () => {
    expect(validateHouseholdName("   ")).not.toBeNull();
  });
});
```

**Test scenarios to cover** (from RESEARCH.md validation test map):
- `validateHouseholdName`: empty, whitespace, valid
- `validateMemberName`: empty, whitespace, valid
- `validateHousehold` (form-level): no members fails, at least one member passes
- `toggleChip`: adds missing value, removes existing value
- `addTag`: empty input rejected, duplicate rejected, valid tag appended
- `removeTag`: removes correct tag, leaves others intact
- `hasHouseholdErrors`: no errors returns false, one error returns true

---

### `src/hooks/use-household.ts` (hook, CRUD + request-response)

**Analog:** `src/hooks/use-ping-status.ts`

**Imports pattern** (use-ping-status.ts lines 1-4):
```typescript
import { useQuery } from "@tanstack/react-query";
import { fetchPing } from "../lib/trpc/client";
```

For `use-household.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpcClient } from "@/lib/trpc/client";
import type { HouseholdDraft } from "@/lib/household/types";
```

**useQuery pattern** (use-ping-status.ts lines 38-45):
```typescript
const { data: household, isLoading } = useQuery({
  queryKey: ["household"],
  queryFn: () => trpcClient.query("household.get"),
  staleTime: 60_000,
});
```

**useMutation + invalidateQueries pattern** (new, TanStack Query v5 standard):
```typescript
const queryClient = useQueryClient();

const upsert = useMutation({
  mutationFn: (input: HouseholdUpsertInput) =>
    trpcClient.mutation("household.upsert", input),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["household"] });
  },
});
```

**Return shape pattern** (use-ping-status.ts lines 46-53):
```typescript
return {
  household,
  isLoading,
  upsert,
};
```

---

### `src/lib/trpc/client.ts` (utility, request-response — modification)

**Analog:** self (`src/lib/trpc/client.ts` — current state, lines 1-27)

**Current full file** (client.ts lines 1-27):
```typescript
import { createTRPCUntypedClient, httpBatchLink } from "@trpc/client";
import type { AnyRouter } from "@trpc/server";

type PingResponse = { pong: boolean; ts: number; };

export const TRPC_ENDPOINT = "/functions/v1/trpc";

export type PingStatus = { connected: boolean; error: string | null; updatedAt: string | null; };

export const trpcClient = createTRPCUntypedClient<AnyRouter>({
  links: [
    httpBatchLink({
      url: TRPC_ENDPOINT,
    }),
  ],
});

export async function fetchPing() {
  return trpcClient.query("ping") as Promise<PingResponse>;
}
```

**Required change — add auth headers function** to `httpBatchLink`:
```typescript
import { supabase } from "@/lib/supabase/client";

export const trpcClient = createTRPCUntypedClient<AnyRouter>({
  links: [
    httpBatchLink({
      url: TRPC_ENDPOINT,
      async headers() {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
```

The `fetchPing` export and all other exports remain unchanged.

---

### `supabase/functions/trpc/index.ts` (service, CRUD — modification)

**Analog:** self (current file, lines 1-44) + spike `sources/003-trpc-edge-fn-wiring/index.ts`

**Current imports and router shape** (index.ts lines 1-13):
```typescript
import { initTRPC } from "npm:@trpc/server@11";
import { fetchRequestHandler } from "npm:@trpc/server@11/adapters/fetch";
import { z } from "npm:zod@3";

const t = initTRPC.create();

const appRouter = t.router({
  ping: t.procedure.query(() => ({ pong: true, ts: Date.now() })),
  generateDraft: t.procedure.input(/* ... */).mutation(/* ... */),
});
```

**Required additions — auth context injection** (lines inserted after existing imports):
```typescript
import { createClient } from "npm:@supabase/supabase-js@2";

type Context = {
  userId: string | null;
  supabase: ReturnType<typeof createClient>;
};

const t = initTRPC.context<Context>().create();

const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});
```

**Required change — Deno.serve with auth context** (index.ts lines 37-44):
```typescript
// BEFORE:
Deno.serve((req) => {
  return fetchRequestHandler({
    endpoint: "/trpc",
    req,
    router: appRouter,
    createContext: () => ({}),
  });
});

// AFTER:
Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  let userId: string | null = null;
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data } = await supabaseAdmin.auth.getUser(token);
    userId = data.user?.id ?? null;
  }
  return fetchRequestHandler({
    endpoint: "/trpc",
    req,
    router: appRouter,
    createContext: () => ({ userId, supabase: supabaseAdmin }),
  });
});
```

**Household router namespace** — add under `appRouter`:
```typescript
const appRouter = t.router({
  ping: t.procedure.query(() => ({ pong: true, ts: Date.now() })),
  generateDraft: /* unchanged stub */,
  household: t.router({
    get: authedProcedure.query(async ({ ctx }) => {
      // SELECT * FROM households WHERE user_id = ctx.userId LIMIT 1
      // JOIN household_members ON household_members.household_id = households.id
    }),
    upsert: authedProcedure
      .input(z.object({
        name: z.string().min(1),
        cookingSkillLevel: z.enum(["beginner", "intermediate", "advanced"]),
        appliances: z.array(z.string()),
        members: z.array(z.object({
          id: z.string().uuid().optional(),
          name: z.string().min(1),
          allergies: z.array(z.string()),
          avoidances: z.array(z.string()),
          dietType: z.string().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        // 1. Check for existing household row for ctx.userId
        // 2. UPDATE if exists, INSERT if not
        // 3. Reconcile members: delete removed, upsert present
        // Returns: { id: string } (the household id)
      }),
  }),
});
```

**DB column mapping** (from verified schema):
```
households                         household_members
─────────────────────────          ─────────────────────────────
id            uuid PK              id              uuid PK
user_id       uuid FK auth.users   household_id    uuid FK households (cascade)
name          text NOT NULL        name            text NOT NULL
cooking_skill text CHECK enum      dietary_prefs   text[] (unused Phase 3)
appliances    jsonb (string[])     allergies       text[]
created_at    timestamptz          avoidances      text[]
                                   diet_type       text (no CHECK)
                                   created_at      timestamptz
```

---

### `tests/e2e/household-setup.spec.ts` (test, E2E)

**Analog:** None in this codebase. No E2E test files exist yet.

**Pattern from RESEARCH.md** — use `@playwright/test` conventions matching project `playwright.config.ts`. Structure by flow (create, edit, revisit):
```typescript
import { test, expect } from "@playwright/test";

test.describe("Household Setup — Create flow", () => {
  test("fill form, save, data persists in DB", async ({ page }) => {
    // navigate to /household (auth already handled by storageState or beforeEach sign-in)
    // fill household name
    // select cooking skill
    // add a member with allergies and diet type
    // click Save Household
    // expect success banner visible
    // revisit page — expect fields pre-filled (edit mode)
  });
});
```

---

## Shared Patterns

### Authentication Session in tRPC Client

**Source:** `src/lib/trpc/client.ts` (modification) + `src/lib/supabase/client.ts`
**Apply to:** `src/lib/trpc/client.ts` (the one file that changes), then all hooks using `trpcClient` gain auth automatically.

```typescript
// Pattern: async headers() in httpBatchLink attaches Supabase session token
async headers() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
},
```

### authedProcedure Middleware (Edge Function)

**Source:** `supabase/functions/trpc/index.ts` (modification)
**Apply to:** All household procedures in the tRPC router.

```typescript
const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});
```

### hasErrors + FieldError + SubmitBanner

**Source:** `src/lib/auth/validation.ts` (lines 92-94) and `src/routes/auth-page.tsx` (lines 44-63)
**Apply to:** `src/routes/household-page.tsx` — copy both primitives and the `hasHouseholdErrors` equivalent into the household module.

### Chip Toggle Pattern (add/remove from string array)

**Source:** New pattern described in RESEARCH.md "Don't Hand-Roll" section. No existing codebase analog.
**Apply to:** `src/lib/household/validation.ts` (`toggleChip`), consumed by `household-page.tsx` for allergen chips and appliance chips.

```typescript
function toggleChip(selected: string[], value: string): string[] {
  return selected.includes(value)
    ? selected.filter((v) => v !== value)
    : [...selected, value];
}
```

### Deno npm: Specifier Convention

**Source:** `supabase/functions/trpc/index.ts` (lines 1-9) — all existing imports.
**Apply to:** All new imports in `supabase/functions/trpc/index.ts`. Must use `npm:` prefix, never bare Node specifiers.

```typescript
import { initTRPC, TRPCError } from "npm:@trpc/server@11";
import { fetchRequestHandler } from "npm:@trpc/server@11/adapters/fetch";
import { z } from "npm:zod@3";
import { createClient } from "npm:@supabase/supabase-js@2";
```

### useQuery + trpcClient Pattern

**Source:** `src/hooks/use-ping-status.ts` (lines 38-44)
**Apply to:** `src/hooks/use-household.ts`

```typescript
const { data, isLoading } = useQuery({
  queryKey: ["household"],
  queryFn: () => trpcClient.query("household.get"),
  staleTime: 60_000,
});
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `tests/e2e/household-setup.spec.ts` | test | E2E | No E2E test files exist in the project yet; use standard `@playwright/test` patterns |

---

## Metadata

**Analog search scope:** `src/routes/`, `src/hooks/`, `src/lib/`, `supabase/functions/trpc/`, `.claude/skills/spike-findings-aimeal-poc/sources/`
**Files scanned:** 12 source files read in full
**Pattern extraction date:** 2026-04-20
