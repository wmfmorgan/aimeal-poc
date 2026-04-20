# Phase 3: Household Setup - Research

**Researched:** 2026-04-20
**Domain:** React form state, tRPC mutations, Supabase RLS, bespoke Tailwind UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Single scrolling page — no wizard, no step state management. Household basics at top (name, skill, appliances), members section below. One "Save Household" action at the bottom.
- **D-02:** Same `/household` route handles both create and edit. On load, detect if a household exists for the current user and pre-fill fields. "Save" creates or updates depending on state. No separate edit route.
- **D-03:** First-time users see a welcome nudge ("Set up your household to get started") but are not locked to the page. They can navigate away and return. Generation in Phase 4 will require household data — the nudge is informational, not a gate.
- **D-04:** Per-member dietary data uses three distinct sections: Allergies, Avoidances, and Diet type.
  - Allergies: Big 9 preset chips + freeform tag input for anything else.
  - Avoidances: Freeform tag input only (strong dislikes, not medical). No preset chips.
  - Diet type: Dropdown from a fixed list matching the `diet_type` column.
- **D-05:** Keeping allergies and avoidances as separate fields preserves the medical-vs-preference distinction for the LLM prompt in Phase 4.
- **D-06:** Members displayed as a compact list. Each row has an [Edit Member] and [Remove] action. Clicking [Edit Member] expands that row in-place revealing the three dietary sections (no modal). "Add member" appends a new blank expandable row at the bottom of the list.
- **D-07:** Deleting a member shows an inline "Are you sure? [Remove] [Cancel]" confirmation on that row before firing the DB delete. No undo after confirmation.
- **D-08:** After save (create or update), user stays on `/household`. Show a success state (confirmation banner or checkmark) in place — no redirect.

### Claude's Discretion

- Exact list of diet_type dropdown values (use common options matching the DB column intent)
- Exact wording for welcome nudge copy, success banners, validation error messages
- Whether the allergen preset chips use a toggle/pill pattern or checkbox pattern
- Appliances input pattern (checkboxes, multi-select, or tag chips)

### Deferred Ideas (OUT OF SCOPE)

- Household sharing / collaborative editing — v2.0 scope
- Macro/calorie targets per member — v2.5 scope
- Photo/avatar per member — not in requirements; nice-to-have deferred post-PoC
- Importing dietary preferences from a profile or external source — not in v1 scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HSHD-01 | User can create a household with a name and cooking skill level | `households` table schema verified; upsert via `household.upsert` tRPC mutation; skill level constrained to `('beginner','intermediate','advanced')` by DB CHECK |
| HSHD-02 | User can add household members with names | `household_members` table with `household_id` FK + cascade delete; `household.member.add` mutation; name is `not null` |
| HSHD-03 | User can set dietary preferences, allergies, and avoidances per member | `allergies text[]`, `avoidances text[]`, `diet_type text` columns exist; UI-SPEC defines Big 9 chip grid + freeform tag inputs |
| HSHD-04 | User can specify household appliances | `appliances jsonb default '[]'` on `households`; stored as a JSON array of string labels; UI-SPEC defines checkbox-chip multi-select |
| HSHD-05 | User can edit household and member details after creation | D-02: same `/household` route detects existing data and pre-fills; save uses upsert; member update/delete are distinct mutations |
</phase_requirements>

---

## Summary

Phase 3 replaces the placeholder `household-page.tsx` with a full CRUD form covering three concerns: household-level fields (name, cooking skill, appliances), a dynamic member list with per-member dietary data, and persistence to Supabase via tRPC mutations. The DB schema is already deployed and correct — no migration work is needed.

The central technical challenge is state management for the member list: each member row has expand/collapse state, inline delete-confirmation state, and nested form fields (Big 9 chip toggles, freeform tag arrays, diet type). Because the project does **not** use react-hook-form (it is not in `package.json`), Phase 2 established the pattern of plain React `useState` + hand-rolled validation helpers (see `src/lib/auth/validation.ts`). Phase 3 must follow the same pattern rather than introducing a new form library.

The tRPC router currently only has `ping` and a `generateDraft` stub. Phase 3 adds household procedures (`household.get`, `household.upsert`, `household.member.add`, `household.member.update`, `household.member.delete`) to the Deno edge function, all using the already-verified `npm:@trpc/server@11` + `npm:zod@3` pattern. The client side uses `@tanstack/react-query` v5 (already installed) via the untyped `trpcClient` for queries and mutations; no additional packages are needed.

**Primary recommendation:** Keep all member-list state in a single `useState<MemberDraft[]>` array in the household page component. Sync to DB only on "Save Household" (for the household row and all members at once) rather than on every row-level interaction.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Form state (member list, chip toggles, tag inputs) | Browser / Client | — | Transient UI state; only persisted on explicit save |
| Validation (required name, at least one member) | Browser / Client | API (Zod) | Client validates before submit; server re-validates via Zod input schema |
| Household upsert (create or update) | API / Edge Function | Database (RLS) | tRPC mutation owns the upsert logic; RLS enforces ownership |
| Member CRUD | API / Edge Function | Database (RLS) | Separate mutations for add/update/delete; cascade delete on household |
| Existence detection (first-visit vs. edit) | API / Edge Function | Browser (derived) | `household.get` query returns null or row; browser shows nudge if null |
| RLS enforcement | Database / Storage | — | `households: own rows` and `household_members: own household` policies already deployed |

---

## Standard Stack

### Core (all already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | `^19.2.0` | Component model, useState for form/member state | Installed; project baseline |
| TanStack Query | `^5.90.5` | `useQuery` for household.get, `useMutation` for upsert/member ops | Installed; project standard for server state |
| `@trpc/client` | `^11.7.1` | Untyped tRPC client (wraps fetch) | Installed; established in Phase 1 |
| `npm:@trpc/server@11` (Deno) | `11.x` | tRPC router in Edge Function | Verified pattern from spike-findings |
| `npm:zod@3` (Deno) | `3.x` | Input validation for tRPC procedures | Verified pattern from spike-findings |
| `@supabase/supabase-js` | `^2.103.3` | Auth session, Supabase client (frontend) | Installed; used by tRPC context for auth.uid() |
| Tailwind CSS | `^3.4.18` | Bespoke UI composition per UI-SPEC | Installed; project-mandated (no shadcn/ui CLI) |

[VERIFIED: package.json in project root, 2026-04-20]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | `^3.2.4` | Unit tests for validation helpers and member-list transforms | All new `src/lib/household/` helpers get `.test.ts` coverage |
| `@testing-library/react` | `^16.3.0` | Component render tests for HouseholdPage | Interaction tests for expand/collapse, chip toggles |
| `@playwright/test` | `^1.56.1` | E2E tests for create/edit/revisit flows | Happy-path browser tests against `netlify dev` stack |

[VERIFIED: package.json devDependencies, 2026-04-20]

### No New Packages

Phase 3 deliberately introduces **zero new runtime dependencies**. The validation pattern from Phase 2 (`validateX` helper functions + `hasErrors`) is portable to household validation without react-hook-form or Zod on the client side. Zod is used server-side in the Deno edge function (already verified pattern).

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain useState + hand-rolled validation | react-hook-form + zod resolver | RHF adds controlled-input ergonomics for large forms; however, project precedent is manual state (auth-page uses useState), and adding RHF mid-project would create inconsistency without meaningful benefit for a form this size |
| Flat member array in page state | useReducer for member list | useReducer is cleaner for complex member actions (expand/collapse, delete-confirm, nested field updates); acceptable alternative but useState with helper functions matches Phase 2 style |
| Single upsert call (household + members) | Separate mutation calls per member | Simpler UX — one "Save" fires one network round-trip for the household row, then one per member change; reduces partial-save risk |

---

## Architecture Patterns

### System Architecture Diagram

```
User fills form (browser state)
        │
        ▼
HouseholdPage (React, /household)
  ├─ useQuery("household.get")  ──────────────► Edge Function: household.get
  │       │                                            │
  │       ▼                                            ▼
  │   Pre-fill state (edit mode)              Supabase DB (households + household_members)
  │   Show welcome nudge (create mode)         RLS: auth.uid() = user_id
  │
  ├─ MemberDraft[] (useState)
  │   ├─ expand/collapse state per row
  │   ├─ delete-confirm state per row
  │   ├─ chip toggles (Big 9 allergens, appliances)
  │   └─ freeform tag arrays (custom allergies, avoidances)
  │
  └─ "Save Household" click
        │
        ▼
  useMutation("household.upsert") ──────────► Edge Function: household.upsert
        │                                            │
        ├─ household.member.add (new members)        ▼
        ├─ household.member.update (changed)   Supabase DB write
        └─ household.member.delete (removed)   (upsert on households,
                                                insert/update/delete on
                                                household_members)
```

### Recommended Project Structure

```
src/
├── routes/
│   └── household-page.tsx         # Replace placeholder; full form component
├── lib/
│   └── household/
│       ├── types.ts               # MemberDraft, HouseholdDraft, Big9 const
│       ├── validation.ts          # validateHouseholdName, validateMemberName, hasHouseholdErrors
│       └── validation.test.ts     # Unit coverage for validators
├── hooks/
│   └── use-household.ts           # useQuery(household.get) + useMutation(household.upsert etc.)
supabase/functions/trpc/
└── index.ts                       # Add household router (namespace under t.router({ household: ... }))
```

### Pattern 1: tRPC Context with Auth Session (Deno Edge Function)

The existing router creates context as `() => ({})` — no auth. Household procedures need the authenticated user's `auth.uid()`. The standard pattern is to pass the Authorization header from the request into context and verify via `supabase-js` service-role client.

```typescript
// Source: spike-findings-aimeal-poc/references/edge-functions-ai.md (verified pattern)
// supabase/functions/trpc/index.ts

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

[ASSUMED] — The exact pattern for injecting Supabase auth into tRPC context in Deno edge functions has not been verified via Context7 or official Supabase docs in this session. The approach above is consistent with the tRPC createContext pattern and verified Deno patterns from spikes, but the specific `SUPABASE_SERVICE_ROLE_KEY` availability in the local dev `.env` should be confirmed before implementation.

### Pattern 2: Household Upsert Procedure

```typescript
// Source: supabase schema (verified), tRPC + Zod patterns (verified from spike-findings)
const householdUpsertInput = z.object({
  name: z.string().min(1),
  cookingSkillLevel: z.enum(["beginner", "intermediate", "advanced"]),
  appliances: z.array(z.string()),
  members: z.array(z.object({
    id: z.string().uuid().optional(),   // undefined = new member
    name: z.string().min(1),
    allergies: z.array(z.string()),
    avoidances: z.array(z.string()),
    dietType: z.string().optional(),
  })),
});

// Procedure logic:
// 1. Upsert households row (conflict on user_id — one household per user)
// 2. Load existing member IDs
// 3. Delete members no longer in the payload
// 4. Upsert members in payload
```

[VERIFIED: column names and types from supabase/migrations/20260419000001_initial_schema.sql]

### Pattern 3: MemberDraft Client-Side State

```typescript
// Source: architecture.md patterns + UI-SPEC interaction states (verified)
type MemberDraft = {
  id?: string;              // undefined for new (not yet persisted)
  name: string;
  allergies: string[];      // Big 9 selections + freeform tags merged
  avoidances: string[];     // freeform tags only
  dietType: string;
  // UI-only state
  isExpanded: boolean;
  isConfirmingDelete: boolean;
};
```

### Pattern 4: tRPC Client — Passing Auth Header

The existing `trpcClient` uses `httpBatchLink` without an Authorization header. Household procedures require auth. The client must be updated to attach the Supabase session token:

```typescript
// Source: @trpc/client httpBatchLink docs [ASSUMED — see Assumptions Log]
// src/lib/trpc/client.ts (updated)
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

### Pattern 5: TanStack Query v5 with tRPC (untyped client)

The project uses the untyped `trpcClient` (not `@trpc/react-query`). TanStack Query mutations are wired manually:

```typescript
// Source: use-ping-status.ts (verified pattern in codebase)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpcClient } from "@/lib/trpc/client";

export function useHousehold() {
  const queryClient = useQueryClient();

  const { data: household, isLoading } = useQuery({
    queryKey: ["household"],
    queryFn: () => trpcClient.query("household.get"),
  });

  const upsert = useMutation({
    mutationFn: (input: HouseholdUpsertInput) =>
      trpcClient.mutation("household.upsert", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household"] });
    },
  });

  return { household, isLoading, upsert };
}
```

[VERIFIED: use-ping-status.ts uses identical `trpcClient.query("ping")` pattern; TanStack Query v5 API from package.json version]

### Anti-Patterns to Avoid

- **Saving on every member interaction:** Member list is UI state only until "Save Household" is clicked. Firing DB writes on chip toggle or tag add would create excessive mutations and complicate the editing experience.
- **Using `households.id` from the client before first save:** On first create, the `household_id` is assigned by the DB. The client should treat the save response as the source of truth for `id`. Never generate a client-side UUID for the household row.
- **Separate routes for create vs. edit (D-02):** The route is intentionally unified. Conditional rendering based on `household === null` handles the two states.
- **Adding react-hook-form or a form library:** Not in `package.json`, not used in Phase 2. Phase 3 uses `useState` + validation helpers (established pattern).
- **Shadcn CLI components:** UI-SPEC explicitly states "no shadcn CLI initialized" and "compose from raw Tailwind only". Do not run `npx shadcn-ui add`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth session in tRPC context | Custom JWT decode | `supabase.auth.getUser(token)` via service role client | Supabase validates the JWT, handles key rotation automatically |
| Optimistic updates on member CRUD | Manual rollback logic | TanStack Query `useMutation` with `onError` rollback via `invalidateQueries` | Built-in cache invalidation is sufficient for this scale |
| Chip selection state | Custom multi-select component | `useState<string[]>` toggle pattern (add/remove from array) | Simpler, matches Big 9 constant list |
| Form serialization | JSON.stringify on submit | Zod-validated tRPC input schema | Already in the stack; server validates shape |

**Key insight:** The form complexity here is UI state complexity (nested expand/collapse, toggles, tags), not form management complexity. useState handles it cleanly without a library.

---

## Common Pitfalls

### Pitfall 1: One Household Per User — No Unique Constraint
**What goes wrong:** The `households` table has no `UNIQUE(user_id)` constraint. Multiple saves from the same user could create duplicate household rows if the upsert logic isn't careful.
**Why it happens:** The schema uses `gen_random_uuid()` as the PK, so each insert creates a new row.
**How to avoid:** The `household.get` procedure returns the existing row's `id` if one exists. The upsert procedure checks for existence first: if a row exists for `user_id`, UPDATE it; if not, INSERT. Alternatively, add a `UNIQUE(user_id)` constraint via a new migration and use `ON CONFLICT (user_id) DO UPDATE`.
**Warning signs:** Multiple rows in `households` for the same `user_id` in local dev.

[VERIFIED: supabase/migrations/20260419000001_initial_schema.sql — no UNIQUE constraint on households.user_id]

### Pitfall 2: Cascade Delete Works One Way
**What goes wrong:** Deleting a member row that has a `household_id` FK is fine (cascade configured on the FK). But deleting the household row cascades and removes all members. If the upsert logic deletes-and-recreates the household row, all member data is wiped.
**Why it happens:** `household_members.household_id references households on delete cascade` — this cascade is intentional for cleanup but dangerous in an update path.
**How to avoid:** Always UPDATE the household row, never DELETE+INSERT. Only delete individual members on explicit user action.

[VERIFIED: schema migration file]

### Pitfall 3: tRPC Endpoint Strips `/functions/v1/` Prefix
**What goes wrong:** The tRPC server `endpoint` must be `"/trpc"`, not `"/functions/v1/trpc"`. If a new procedure namespace is added (e.g., `household.get`) and the endpoint is misconfigured, all calls return "No procedure found on path".
**Why it happens:** Supabase edge runtime strips the function prefix before the handler sees the request.
**How to avoid:** Keep `endpoint: "/trpc"` in `fetchRequestHandler`. Verified in spike-findings.
**Warning signs:** `{"error":{"message":"No procedure found on path \"\""}}` in browser console.

[VERIFIED: spike-findings-aimeal-poc/references/edge-functions-ai.md]

### Pitfall 4: `SUPABASE_SERVICE_ROLE_KEY` Not in Local Dev `.env`
**What goes wrong:** Auth context injection via `supabase.auth.getUser(token)` requires the service role key, which may not be in `supabase/functions/.env` if it was only set up for `XAI_API_KEY` and `SPOONACULAR_API_KEY`.
**Why it happens:** Phase 1 spike only needed AI keys. Supabase system env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`) are automatically injected at runtime in hosted Supabase, but in local dev `supabase functions serve` they may require explicit addition.
**How to avoid:** Verify `supabase/functions/.env` contains the service role key before implementing auth context. Run `supabase status` to retrieve the local service role key.
**Warning signs:** `userId` is null for authenticated requests in local dev.

[ASSUMED — local dev env var injection behavior for Supabase system vars not verified in this session]

### Pitfall 5: Appliances Stored as JSONB (Array of Strings)
**What goes wrong:** `appliances jsonb default '[]'` is unstructured. If the column is read back and the consumer expects `string[]` but gets something else (e.g., JSON objects from a previous format), it breaks silently.
**How to avoid:** Zod schema on both the tRPC input and the `household.get` return type enforces `z.array(z.string())`. Never write objects to this column.

[VERIFIED: schema migration — `appliances jsonb default '[]'`]

### Pitfall 6: Tag Input — Duplicate/Empty Tag Prevention
**What goes wrong:** Freeform tag inputs (custom allergies, avoidances) can accumulate empty strings or duplicates if Enter is pressed on an empty input or the same value is typed twice.
**How to avoid:** Trim input, reject empty strings, reject duplicates (check `includes()` before adding to array).

---

## Code Examples

### DB Column Mapping

```
households                         household_members
─────────────────────────          ──────────────────────────────────
id            uuid (PK)            id              uuid (PK)
user_id       uuid (FK auth.users) household_id    uuid (FK households)
name          text NOT NULL        name            text NOT NULL
cooking_skill text (CHECK enum)    dietary_prefs   text[] (unused in Phase 3)
appliances    jsonb (string[])     allergies       text[]
created_at    timestamptz          avoidances      text[]
                                   diet_type       text (free, no CHECK)
                                   created_at      timestamptz
```

[VERIFIED: supabase/migrations/20260419000001_initial_schema.sql]

### Big 9 Allergens (exact labels from UI-SPEC)

```typescript
// Source: 03-UI-SPEC.md (verified)
export const BIG_9_ALLERGENS = [
  "Milk", "Eggs", "Fish", "Shellfish", "Tree Nuts",
  "Peanuts", "Wheat/Gluten", "Soy", "Sesame",
] as const;

export type Big9Allergen = typeof BIG_9_ALLERGENS[number];
```

### Diet Type Options (UI-SPEC canonical list)

```typescript
// Source: 03-UI-SPEC.md (verified)
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
```

### Appliance Preset List (UI-SPEC canonical list)

```typescript
// Source: 03-UI-SPEC.md (verified)
export const APPLIANCE_PRESETS = [
  "Instant Pot", "Air Fryer", "Slow Cooker", "Wok",
  "Stand Mixer", "Blender", "Toaster Oven", "Grill / BBQ", "Sous Vide",
] as const;
```

### Glassmorphism Card Pattern (from auth-page.tsx)

```tsx
// Source: src/routes/auth-page.tsx (verified in codebase)
<div className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-6 py-6 md:px-8 md:py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
  {/* card content */}
</div>
```

### SubmitBanner Pattern (reuse from auth-page)

```tsx
// Source: src/routes/auth-page.tsx (verified in codebase)
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

### Input Class Helper (reuse from auth-page)

```tsx
// Source: src/routes/auth-page.tsx (verified in codebase)
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

---

## Project Constraints (from CLAUDE.md)

| Directive | Applies to Phase 3 | Impact |
|-----------|-------------------|--------|
| LLM: `grok-4-1-fast-non-reasoning` via `https://api.x.ai/v1` — do NOT use `grok-3-mini` | Not applicable (Phase 3 has no LLM call) | No impact |
| Backend: Deno 2 runtime — use `npm:` specifiers, not Node imports | YES — household tRPC procedures run in Deno edge function | All `import` in `supabase/functions/trpc/index.ts` must use `npm:` prefix |
| Supabase local ports: 54331–54339 | YES — dev environment | Local dev commands must use these ports |
| Spoonacular: cache-first is mandatory | Not applicable (no Spoonacular in Phase 3) | No impact |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phase 2: tRPC context `() => ({})` (no auth) | Phase 3: tRPC context injects `userId` from Bearer token | Phase 3 introduction | All authenticated procedures use `authedProcedure` middleware |
| `household-page.tsx` is a placeholder | Full form component with three glassmorphism sections | Phase 3 | Route `/household` becomes functional |
| `household.get` / `household.upsert` procedures: absent | Added to tRPC router in Deno edge function | Phase 3 | Phase 4 can now read `household_id` for generation |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `SUPABASE_SERVICE_ROLE_KEY` is automatically available in `supabase functions serve` local dev without explicit addition to `.env` | Pattern 1, Pitfall 4 | Auth context injection fails in local dev; `userId` is always null; all household procedures return UNAUTHORIZED |
| A2 | `httpBatchLink` `headers()` async function is supported in `@trpc/client@11` (Pattern 4) | Pattern 4 | Auth token not sent to edge function; RLS blocks all reads/writes |
| A3 | One household per user is the intent — enforced via application logic (check-then-upsert), not a DB UNIQUE constraint | Common Pitfalls #1 | Duplicate household rows possible if user saves from two tabs simultaneously |

---

## Open Questions (RESOLVED)

1. **SUPABASE_SERVICE_ROLE_KEY in local dev `.env`**
   - What we know: The local dev `.env` was set up in Phase 1 for `XAI_API_KEY` and `SPOONACULAR_API_KEY` (per spike-findings). Supabase system vars may be auto-injected.
   - What's unclear: Whether `SUPABASE_SERVICE_ROLE_KEY` is auto-injected by `supabase functions serve` locally or must be manually added.
   - RESOLVED: Plan 03-02 Task 2 adds a `supabase status` verification step and adds the key to `supabase/functions/.env` if missing. The executor handles this at runtime.

2. **Unique household constraint**
   - What we know: No `UNIQUE(user_id)` constraint on `households`. Application-level upsert logic can handle this.
   - What's unclear: Whether to add a DB migration for the constraint (safer, prevents races) or rely on app logic.
   - RESOLVED: Plan 03-01 Task 1 adds `ALTER TABLE households ADD CONSTRAINT households_user_id_key UNIQUE (user_id)` migration and runs `supabase db reset` to apply it before any upsert logic is written.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase local stack | tRPC household procedures, E2E tests | Assumed available (used in Phase 2) | 54331-54339 port range | — |
| netlify dev | E2E browser tests | Assumed available (used in Phase 1/2) | Netlify CLI v24.11.1 (from spike) | — |
| Deno (via Supabase edge runtime) | supabase/functions/trpc | Available via `supabase functions serve` | Supabase-bundled | — |
| vitest | Unit tests | ✓ | `^3.2.4` | — |
| @playwright/test | E2E tests | ✓ | `^1.56.1` | — |
| react-hook-form | Form management | ✗ NOT INSTALLED | — | Plain useState + validation.ts helpers (established project pattern) |
| zod (frontend) | Client-side validation | ✗ NOT in frontend deps | — | Hand-rolled validators (established project pattern) |

**Missing dependencies with no fallback:** None that block execution.

**Key finding:** `react-hook-form` and `zod` are absent from `package.json` (frontend). The project uses plain `useState` + custom validation helpers. Zod IS available in the Deno edge function via `npm:zod@3`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npm run test:unit -- --run` |
| Full suite command | `npm run test:unit -- --run && npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HSHD-01 | `validateHouseholdName` rejects empty string | unit | `npm run test:unit -- --run src/lib/household/validation.test.ts` | ❌ Wave 0 |
| HSHD-01 | `validateHouseholdName` accepts valid name | unit | same | ❌ Wave 0 |
| HSHD-01 | Skill level constrained to three values | unit | same | ❌ Wave 0 |
| HSHD-02 | `validateMemberName` rejects empty string | unit | same | ❌ Wave 0 |
| HSHD-02 | Save with zero members fails validation | unit | same | ❌ Wave 0 |
| HSHD-03 | Big 9 chip toggle adds/removes from allergies array | unit | `npm run test:unit -- --run src/lib/household/validation.test.ts` | ❌ Wave 0 |
| HSHD-03 | Freeform tag add rejects empty and duplicate | unit | same | ❌ Wave 0 |
| HSHD-04 | Appliance chip toggle adds/removes from appliances array | unit | same | ❌ Wave 0 |
| HSHD-01–05 | Full create flow: fill form → save → data in DB → nudge hidden | E2E | `npm run test:e2e -- tests/e2e/household-setup.spec.ts` | ❌ Wave 0 |
| HSHD-05 | Edit flow: revisit → pre-filled → change name → save → updated | E2E | same | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test:unit -- --run`
- **Per wave merge:** `npm run test:unit -- --run && npm run test:e2e`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/lib/household/validation.ts` — household name, member name, at-least-one-member validators
- [ ] `src/lib/household/validation.test.ts` — covers all household validation behaviors
- [ ] `src/lib/household/types.ts` — `MemberDraft`, `HouseholdDraft`, `BIG_9_ALLERGENS`, `DIET_TYPES`, `APPLIANCE_PRESETS` constants
- [ ] `tests/e2e/household-setup.spec.ts` — create, edit, revisit flows against `netlify dev` stack

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (session required) | Supabase session from `useAuth()`, Bearer token in tRPC headers |
| V3 Session Management | inherited | Supabase `persistSession: true`, `autoRefreshToken: true` (established Phase 2) |
| V4 Access Control | yes | RLS: `households: own rows` + `household_members: own household` — enforces user isolation at DB level |
| V5 Input Validation | yes | Zod schema on tRPC mutation inputs (server); hand-rolled validators (client) |
| V6 Cryptography | no | No crypto in this phase |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| User reads/writes another user's household | Elevation of Privilege | RLS policy `auth.uid() = user_id` on `households`; sub-table policy joins back to `households` |
| Empty/malformed allergies array written to DB | Tampering | Zod: `z.array(z.string())` on tRPC input |
| Household name XSS | Tampering | React renders as text content (not innerHTML); no risk in this stack |
| Unauthenticated household mutation | Spoofing | `authedProcedure` middleware rejects requests with no valid session token |

---

## Sources

### Primary (HIGH confidence)

- `supabase/migrations/20260419000001_initial_schema.sql` — exact column names, types, constraints, RLS policies
- `src/routes/auth-page.tsx` — inputCls, submitCls, SubmitBanner, segmented control patterns (verified in codebase)
- `package.json` — exact dependency versions; confirms react-hook-form/zod NOT in frontend deps
- `vitest.config.ts`, `playwright.config.ts` — test framework configuration
- `.planning/phases/03-household-setup/03-UI-SPEC.md` — component inventory, copywriting contract, layout, Big 9 labels, appliance list, diet type values
- `.planning/phases/03-household-setup/03-CONTEXT.md` — all locked decisions D-01 through D-08
- `.claude/skills/spike-findings-aimeal-poc/references/edge-functions-ai.md` — tRPC v11 Deno patterns, endpoint path rule, Grok model decisions

### Secondary (MEDIUM confidence)

- `architecture.md` — system architecture, component structure, TanStack Query + tRPC usage described
- `.claude/skills/spike-findings-aimeal-poc/references/local-dev-infrastructure.md` — port assignments, Netlify proxy config, RLS pattern

### Tertiary (LOW confidence / ASSUMED)

- `SUPABASE_SERVICE_ROLE_KEY` auto-injection behavior in `supabase functions serve` — not verified in this session (A1)
- `httpBatchLink` async `headers()` API in `@trpc/client@11` — not verified via Context7 in this session (A2)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified from package.json
- Architecture: HIGH — DB schema verified, tRPC/Deno patterns verified from spikes, UI patterns verified from auth-page.tsx
- Pitfalls: HIGH (schema-based) / MEDIUM (env var injection) — schema verified directly; env var behavior assumed
- Test strategy: HIGH — existing test infrastructure understood from vitest.config.ts and existing test files

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (stable dependencies; Supabase schema is locked until Phase 4)
