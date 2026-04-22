# Phase 5: Meal Plan Grid & Management - Pattern Map

**Mapped:** 2026-04-21
**Files analyzed:** 13
**Analogs found:** 12 / 13

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/layout/AppFrame.tsx` | component | request-response | `src/components/generation/GenerationForm.tsx` | partial |
| `src/routes/plan-page.tsx` | route | request-response | `src/routes/plan-page.tsx` | exact |
| `src/hooks/use-meal-plan.ts` | hook | CRUD | `src/hooks/use-household.ts` | exact |
| `src/lib/generation/types.ts` | utility | transform | `src/lib/generation/types.ts` | exact |
| `src/lib/generation/plan-slots.ts` | utility | transform | `src/lib/generation/stream-parser.ts` | role-match |
| `src/components/generation/MealPlanGrid.tsx` | component | transform | `src/components/generation/MealPlanGrid.tsx` | exact |
| `src/components/generation/MealCard.tsx` | component | request-response | `src/components/generation/MealCard.tsx` | exact |
| `src/components/generation/EmptyMealSlot.tsx` | component | request-response | `src/components/generation/MealCard.tsx` | role-match |
| `src/components/generation/MealRegeneratingCard.tsx` | component | event-driven | `src/components/generation/SkeletonMealCard.tsx` | partial |
| `src/components/generation/MealDeleteConfirmation.tsx` | component | event-driven | `src/routes/household-page.tsx` | role-match |
| `src/components/generation/MealDetailFlyout.tsx` | component | request-response | none in repo | no analog |
| `supabase/functions/trpc/index.ts` | service | CRUD | `supabase/functions/trpc/index.ts` | exact |
| `src/components/generation/generation-components.test.tsx` | test | request-response | `src/components/generation/generation-components.test.tsx` | exact |

## Pattern Assignments

### `src/app/layout/AppFrame.tsx` (component, request-response)

**Analog:** `src/app/layout/AppFrame.tsx`, plus navigation flow from `src/components/generation/GenerationForm.tsx`

**Nav item declaration pattern** (`src/app/layout/AppFrame.tsx:7-12`):
```tsx
const navItems = [
  { label: "Overview", to: "/" },
  { label: "Household", to: "/household" },
  { label: "Plan", to: "/plan/new" },
  { label: "Dev", to: "/dev" },
];
```

**Nav rendering pattern** (`src/app/layout/AppFrame.tsx:51-67`):
```tsx
<nav className="flex flex-wrap gap-2 md:max-w-sm md:justify-end">
  {navItems.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      className={({ isActive }) =>
        [
          "rounded-full px-4 py-2 text-sm transition-colors",
          isActive
            ? "bg-[var(--color-sage)] text-white"
            : "bg-white/80 text-[var(--color-sage-deep)] hover:bg-white",
        ].join(" ")
      }
    >
      {item.label}
    </NavLink>
  ))}
</nav>
```

**Programmatic navigation pattern** (`src/components/generation/GenerationForm.tsx:29-30`, `:59-66`):
```tsx
const navigate = useNavigate();

onStartGeneration({
  householdId: household.id,
  mealPlanId: id,
  numDays,
  mealTypes,
});
navigate(`/plan/${id}`, { replace: true });
```

**Apply in Phase 5:** keep `NavLink` pill styling from `AppFrame`, but move the Plan destination off the hard-coded `/plan/new` path and follow the `useNavigate` pattern when the latest-plan lookup resolves.

---

### `src/routes/plan-page.tsx` (route, request-response)

**Analog:** `src/routes/plan-page.tsx`

**Route param and local orchestration pattern** (`src/routes/plan-page.tsx:15-21`):
```tsx
export function PlanPage() {
  const { id } = useParams<{ id: string }>();
  const { slots, state, error, startGeneration, reset } = useGenerationStream();
  const [formParams, setFormParams] = useState<FormParams | null>(null);

  const showForm = id === "new" || state === "idle";
  const showGrid = state === "streaming" || state === "complete" || state === "error";
```

**Generation handoff pattern** (`src/routes/plan-page.tsx:23-31`):
```tsx
function handleStartGeneration(params: {
  householdId: string;
  mealPlanId: string;
  numDays: number;
  mealTypes: string[];
}) {
  setFormParams({ numDays: params.numDays, mealTypes: params.mealTypes });
  void startGeneration(params);
}
```

**Editorial section-shell pattern** (`src/routes/plan-page.tsx:39-54`):
```tsx
<section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
  <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
    Your Meal Plan
  </p>
  <h2 className="mt-3 font-display text-2xl font-semibold leading-snug text-[var(--color-sage-deep)]">
    {state === "streaming" ? "Generating your meals…" : "Your meals"}
  </h2>
```

**Error/banner pattern** (`src/routes/plan-page.tsx:57-58`):
```tsx
{state === "complete" && <PlanReadyBanner />}
{state === "error" && <StreamErrorBanner message={error} onRetry={reset} />}
```

**Apply in Phase 5:** keep `PlanPage` as the route orchestrator. Add persisted-plan query state beside the existing generation state instead of moving orchestration into the grid.

---

### `src/hooks/use-meal-plan.ts` (hook, CRUD)

**Analog:** `src/hooks/use-household.ts`

**Query + mutation hook structure** (`src/hooks/use-household.ts:35-56`):
```ts
export function useHousehold() {
  const queryClient = useQueryClient();

  const householdQuery = useQuery<Household | null>({
    queryKey: ["household"],
    queryFn: () => trpcClient.query("household.get") as Promise<Household | null>,
    staleTime: 60_000,
  });

  const upsert = useMutation<{ id: string }, Error, HouseholdUpsertInput>({
    mutationFn: (input) => trpcClient.mutation("household.upsert", input) as Promise<{ id: string }>,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["household"] });
    },
  });
```

**Return-shape pattern** (`src/hooks/use-household.ts:51-56`):
```ts
return {
  household: householdQuery.data ?? null,
  isLoading: householdQuery.isLoading,
  error: householdQuery.error instanceof Error ? householdQuery.error : null,
  upsert,
};
```

**Simpler read-only hook variant** (`src/hooks/use-llm-logs.ts:16-27`):
```ts
export function useLlmLogs() {
  const query = useQuery<LlmLog[]>({
    queryKey: ["llm-logs"],
    queryFn: () => trpcClient.query("devTools.llmLogs") as Promise<LlmLog[]>,
    staleTime: 30_000,
  });
```

**Apply in Phase 5:** `use-meal-plan.ts` should follow the same TanStack Query wrapper style: one persisted read query, plus slot-scoped delete/regenerate mutations that invalidate the plan key.

---

### `src/lib/generation/types.ts` (utility, transform)

**Analog:** `src/lib/generation/types.ts`

**Literal-domain constant pattern** (`src/lib/generation/types.ts:1-21`):
```ts
export const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;

export type MealSlot = {
  day_of_week: DayOfWeek;
  meal_type: MealType;
  title: string;
  short_description: string;
};
```

**Shared copy-token pattern** (`src/lib/generation/types.ts:45-57`):
```ts
export const GENERATION_COPY = {
  eyebrow: "Draft generation",
  heading: "Generate your meal plan draft",
  body:
    "Pick how many days to plan and which meal slots matter first. The draft streams into the grid as the AI responds.",
  mealTypesLabel: "Meal cadence",
  numDaysLabel: "Number of days",
  submitCta: "Generate Your Plan →",
  submitError: "Could not create your plan. Please try again.",
```

**Apply in Phase 5:** extend this file rather than inventing a second type home. Add persisted meal/slot state unions here so grid, route, hook, and tests share the same slot model.

---

### `src/lib/generation/plan-slots.ts` (utility, transform)

**Analog:** `src/lib/generation/stream-parser.ts`

**Slot-key helper pattern** (`src/lib/generation/stream-parser.ts:11-20`):
```ts
export function buildSlotKey(dayOfWeek: string, mealType: string): string {
  return `${dayOfWeek}:${mealType}`;
}

export function buildExpectedSlots(numDays: number, mealTypes: string[]): string[] {
  const days = DAYS_OF_WEEK.slice(0, Math.max(0, Math.min(numDays, DAYS_OF_WEEK.length)));

  return days.flatMap((day) =>
    mealTypes.filter(isMealType).map((mealType) => buildSlotKey(day, mealType))
  );
}
```

**Defensive parsing/normalization pattern** (`src/lib/generation/stream-parser.ts:23-47`):
```ts
export function parseMealLine(line: string): MealSlot | null {
  try {
    const parsed = JSON.parse(line) as Partial<MealSlot>;
    ...
    return {
      day_of_week: parsed.day_of_week,
      meal_type: parsed.meal_type,
      title: parsed.title,
      short_description: parsed.short_description,
    };
  } catch {
    return null;
  }
}
```

**Apply in Phase 5:** any new plan-slot normalization helper should reuse `buildSlotKey` semantics and the same defensive data cleanup style, but map persisted rows into `filled | empty | regenerating | error` slot states.

---

### `src/components/generation/MealPlanGrid.tsx` (component, transform)

**Analog:** `src/components/generation/MealPlanGrid.tsx`

**Imports and filtering pattern** (`src/components/generation/MealPlanGrid.tsx:1-7`, `:21-23`):
```tsx
import { Fragment } from "react";

import { buildSlotKey } from "@/lib/generation/stream-parser";
import { DAYS_OF_WEEK, MEAL_TYPES, type MealSlot, type MealType } from "@/lib/generation/types";

const days = DAYS_OF_WEEK.slice(0, Math.max(0, Math.min(numDays, DAYS_OF_WEEK.length)));
const activeMealTypes = MEAL_TYPES.filter((mealType) => mealTypes.includes(mealType));
```

**Per-slot render function pattern** (`src/components/generation/MealPlanGrid.tsx:25-30`):
```tsx
function renderSlot(day: string, mealType: MealType) {
  const slotKey = buildSlotKey(day, mealType);
  const meal = slots[slotKey];

  return meal ? <MealCard meal={meal} /> : <SkeletonMealCard />;
}
```

**Responsive mobile/desktop split pattern** (`src/components/generation/MealPlanGrid.tsx:34-84`):
```tsx
<div className="space-y-6 md:hidden" data-testid="meal-plan-grid-mobile">
  {days.map((day) => (
    <section key={day} className="space-y-4" aria-label={`${day} meals`}>
```

```tsx
<div
  className="hidden gap-4 md:grid"
  data-testid="meal-plan-grid-desktop"
  style={{ gridTemplateColumns: `minmax(6rem, auto) repeat(${days.length}, minmax(0, 1fr))` }}
>
```

**Apply in Phase 5:** preserve this layout exactly and only swap the `renderSlot` branch so one slot can render filled, empty, regenerating, or error in-place.

---

### `src/components/generation/MealCard.tsx` (component, request-response)

**Analog:** `src/components/generation/MealCard.tsx`

**Editorial card-shell pattern** (`src/components/generation/MealCard.tsx:7-19`):
```tsx
export function MealCard({ meal }: MealCardProps) {
  return (
    <article className="rounded-[1.5rem] bg-white/70 p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
        {meal.meal_type}
      </p>
      <p className="mt-2 font-display text-xl leading-snug text-[var(--color-sage-deep)]">
        {meal.title}
      </p>
      <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
        {meal.short_description}
      </p>
    </article>
  );
}
```

**Alert/error styling pattern to reuse for inline mutation failure** (`src/components/generation/GenerationForm.tsx:137-140`):
```tsx
{submitError && (
  <p className="rounded-xl bg-[rgba(128,59,38,0.08)] px-4 py-3 text-sm text-[#803b26]" role="alert">
    {submitError}
  </p>
)}
```

**Apply in Phase 5:** keep the card shell and typography, then add a quiet actions row. Do not restyle this into a dense admin card.

---

### `src/components/generation/EmptyMealSlot.tsx` (component, request-response)

**Analog:** `src/components/generation/MealCard.tsx`

**Reuse the same card footprint** (`src/components/generation/MealCard.tsx:9-18`):
```tsx
<article className="rounded-[1.5rem] bg-white/70 p-6">
  <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
    {meal.meal_type}
  </p>
  <p className="mt-2 font-display text-xl leading-snug text-[var(--color-sage-deep)]">
    {meal.title}
  </p>
  <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
    {meal.short_description}
  </p>
</article>
```

**Accent CTA treatment to copy** (`src/components/generation/GenerationForm.tsx:143-149`):
```tsx
<button
  type="submit"
  disabled={isSubmitting}
  className="min-h-[44px] rounded-xl bg-[#4A6741] px-6 py-3 text-sm font-semibold tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-60"
>
```

**Apply in Phase 5:** `EmptyMealSlot` should look like a sibling of `MealCard`, not a skeleton. Reuse the same shell plus the accent CTA sizing.

---

### `src/components/generation/MealRegeneratingCard.tsx` (component, event-driven)

**Analog:** `src/components/generation/SkeletonMealCard.tsx` and loading-button treatment from `src/components/generation/GenerationForm.tsx`

**Closest existing placeholder usage** (`src/components/generation/MealPlanGrid.tsx:25-30`):
```tsx
function renderSlot(day: string, mealType: MealType) {
  const slotKey = buildSlotKey(day, mealType);
  const meal = slots[slotKey];

  return meal ? <MealCard meal={meal} /> : <SkeletonMealCard />;
}
```

**Disabled/pending affordance pattern** (`src/components/generation/GenerationForm.tsx:40`, `:145-146`):
```tsx
const isSubmitting = streamState === "streaming" || createPlan.isPending;

className="min-h-[44px] rounded-xl bg-[#4A6741] px-6 py-3 text-sm font-semibold tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-60"
```

**Apply in Phase 5:** there is no direct card-local loading analog yet. Keep the full card footprint visible and use the existing disabled/opacity language rather than replacing the slot with a spinner-only blank.

---

### `src/components/generation/MealDeleteConfirmation.tsx` (component, event-driven)

**Analog:** inline delete confirmation in `src/routes/household-page.tsx`

**State-toggle pattern** (`src/routes/household-page.tsx:404-417`):
```tsx
{!member.isConfirmingDelete ? (
  <button
    type="button"
    onClick={() =>
      setMember(index, (current) => ({
        ...current,
        isConfirmingDelete: true,
        isExpanded: false,
      }))
    }
    className="min-h-[44px] px-2 text-sm text-[#803b26] hover:underline"
  >
```

**Inline confirm/cancel surface pattern** (`src/routes/household-page.tsx:419-447`):
```tsx
<div className="flex flex-wrap items-center gap-2 rounded-xl bg-[rgba(128,59,38,0.06)] px-3 py-2">
  <span className="text-xs text-[#803b26]">{HOUSEHOLD_COPY.deleteConfirmPrompt}</span>
  <button
    type="button"
    ...
    className="min-h-[44px] px-2 text-sm text-[#803b26] hover:underline"
  >
    {HOUSEHOLD_COPY.deleteMemberAction}
  </button>
  <button
    type="button"
    ...
    className="min-h-[44px] px-2 text-sm text-[var(--color-sage-deep)] hover:underline"
  >
    {HOUSEHOLD_COPY.deleteCancelAction}
  </button>
</div>
```

**Apply in Phase 5:** use the same inline destructive-confirmation pattern inside the meal card and flyout action area. Do not introduce a modal for delete confirmation.

---

### `src/components/generation/MealDetailFlyout.tsx` (component, request-response)

**Analog:** none in repo

**Closest layout shell to borrow:** `src/routes/plan-page.tsx:39-54` for rounded/glass editorial surfaces.

**Closest action styling to borrow:** `src/app/layout/AppFrame.tsx:53-67` and `src/components/generation/GenerationForm.tsx:143-149`.

**Guidance:** there is no existing overlay, drawer, dialog, or focus-trap implementation in the current codebase. Planner should treat this as a no-analog area and rely on `05-RESEARCH.md` dialog/flyout guidance for focus management, keyboard handling, and right-side panel behavior.

---

### `supabase/functions/trpc/index.ts` (service, CRUD)

**Analog:** `supabase/functions/trpc/index.ts`

**Auth guard pattern** (`supabase/functions/trpc/index.ts:30-48`):
```ts
type Context = {
  userId: string | null;
  supabase: ReturnType<typeof createClient>;
};

const t = initTRPC.context<Context>().create();

const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
```

**Input validation pattern** (`supabase/functions/trpc/index.ts:193-202`):
```ts
create: authedProcedure
  .input(
    z.object({
      householdId: z.string().uuid(),
      numDays: z.number().int().min(1).max(14).default(7),
      mealTypes: z.array(z.enum(["breakfast", "lunch", "dinner"])).min(1),
    })
  )
```

**Supabase query + TRPCError pattern** (`supabase/functions/trpc/index.ts:58-80`):
```ts
const { data, error } = await ctx.supabase
  .from("households")
  .select(...)
  .eq("user_id", ctx.userId)
  .maybeSingle();

if (error) {
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
}
```

**Mutation return-shape pattern** (`supabase/functions/trpc/index.ts:202-224`):
```ts
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

return { id: data.id };
```

**Context/auth-header propagation pattern** (`supabase/functions/trpc/index.ts:246-264`):
```ts
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: authHeader ? { Authorization: authHeader } : {},
  },
});
```

**Apply in Phase 5:** add `mealPlan.latest`, `mealPlan.get`, `meal.delete`, and `meal.regenerate` in this file under the existing `mealPlan`/new `meal` router structure. Keep all auth, zod validation, Supabase access, and TRPC error handling in the same style.

---

### `src/components/generation/generation-components.test.tsx` (test, request-response)

**Analog:** `src/components/generation/generation-components.test.tsx`

**Module mock pattern** (`src/components/generation/generation-components.test.tsx:14-37`):
```tsx
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});
```

```tsx
vi.mock("@/lib/trpc/client", () => ({
  trpcClient: {
    mutation: (...args: unknown[]) => mockMutateAsync(...args),
  },
}));
```

**Simple render/assert style** (`src/components/generation/generation-components.test.tsx:115-145`):
```tsx
render(
  <MealCard
    meal={{
      day_of_week: "Monday",
      meal_type: "dinner",
      title: "Herby Salmon Bowls",
      short_description: "Salmon, rice, cucumbers, and yogurt sauce.",
    }}
  />
);

expect(screen.getByText("dinner")).toBeInTheDocument();
expect(screen.getByText("Herby Salmon Bowls")).toBeInTheDocument();
```

**Hook test pattern for exported constants/helpers** (`src/hooks/use-ping-status.test.ts:6-32`):
```ts
describe("use-ping-status module", () => {
  it("keeps the tRPC client on the Netlify proxy path", () => {
    expect(TRPC_ENDPOINT).toBe("/functions/v1/trpc");
  });
```

**Apply in Phase 5:** extend this test file for `MealCard`, `EmptyMealSlot`, and flyout/card action rendering. Add separate unit tests for any new slot-normalization utility using the small pure-function test style from `stream-parser.test.ts` / `use-ping-status.test.ts`.

## Shared Patterns

### tRPC Client Calls
**Source:** `src/lib/trpc/client.ts:19-30`
**Apply to:** `use-meal-plan.ts`, any new latest-plan nav query logic
```ts
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

### Auth Guarding in Edge Functions
**Source:** `supabase/functions/trpc/index.ts:37-48`
**Apply to:** all new tRPC procedures
```ts
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
```

### Query Invalidation
**Source:** `src/hooks/use-household.ts:44-49`
**Apply to:** delete/regenerate/latest-plan mutations
```ts
const upsert = useMutation<{ id: string }, Error, HouseholdUpsertInput>({
  mutationFn: (input) => trpcClient.mutation("household.upsert", input) as Promise<{ id: string }>,
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ["household"] });
  },
});
```

### Slot Identity
**Source:** `src/lib/generation/stream-parser.ts:11-20`, `src/hooks/use-generation-stream.ts:75-79`
**Apply to:** persisted-plan normalization, delete/regenerate targeting, selected-slot state
```ts
export function buildSlotKey(dayOfWeek: string, mealType: string): string {
  return `${dayOfWeek}:${mealType}`;
}
```

```ts
const meal = parseMealLine(payload);
if (meal) {
  const key = buildSlotKey(meal.day_of_week, meal.meal_type);
  setSlots((current) => ({ ...current, [key]: meal }));
}
```

### Best-Effort Meal Persistence Shape
**Source:** `supabase/functions/generate-draft/index.ts:77-107`
**Apply to:** `meal.regenerate` server write path
```ts
await supabase.from("meals").insert({
  meal_plan_id: mealPlanId,
  day_of_week: parsed.day_of_week,
  meal_type: parsed.meal_type,
  title: parsed.title,
  short_description: parsed.short_description ?? null,
  rationale: parsed.rationale ?? null,
  status: "draft",
});
```

### Inline Destructive Confirmation
**Source:** `src/routes/household-page.tsx:419-447`
**Apply to:** card-level delete and flyout delete
```tsx
<div className="flex flex-wrap items-center gap-2 rounded-xl bg-[rgba(128,59,38,0.06)] px-3 py-2">
  <span className="text-xs text-[#803b26]">{HOUSEHOLD_COPY.deleteConfirmPrompt}</span>
  <button type="button" className="min-h-[44px] px-2 text-sm text-[#803b26] hover:underline">
    {HOUSEHOLD_COPY.deleteMemberAction}
  </button>
  <button type="button" className="min-h-[44px] px-2 text-sm text-[var(--color-sage-deep)] hover:underline">
    {HOUSEHOLD_COPY.deleteCancelAction}
  </button>
</div>
```

## No Analog Found

Files the planner should drive from `05-RESEARCH.md` and `05-UI-SPEC.md` because the current codebase has no close implementation:

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/components/generation/MealDetailFlyout.tsx` | component | request-response | No drawer/dialog/focus-trap implementation exists in `src/`; only static page/card surfaces are present. |

## Metadata

**Analog search scope:** `src/routes`, `src/components/generation`, `src/hooks`, `src/lib/generation`, `src/lib/trpc`, `src/app/layout`, `supabase/functions`, `supabase/migrations`

**Files scanned:** 15

**Pattern extraction date:** 2026-04-21
