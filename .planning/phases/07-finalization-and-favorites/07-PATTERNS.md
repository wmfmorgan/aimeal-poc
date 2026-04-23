# Phase 7: Finalization & Favorites - Pattern Map

**Mapped:** 2026-04-22
**Files analyzed:** 11
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/routes/plan-page.tsx` | route | request-response | `src/routes/plan-page.tsx` | exact |
| `src/hooks/use-meal-plan.ts` | hook | CRUD | `src/hooks/use-meal-plan.ts` + `src/hooks/use-meal-enrichment.ts` | exact |
| `src/components/generation/PlanFinalizationCard.tsx` | component | request-response | header/action shell in `src/routes/plan-page.tsx` | role-match |
| `src/components/generation/FinalizePlanConfirmation.tsx` | component | event-driven | focus + dialog shell in `src/components/generation/MealDetailFlyout.tsx`; inline confirmation swap in `src/components/generation/MealCard.tsx` | partial |
| `src/components/generation/ShoppingListPanel.tsx` | component | request-response | `src/components/generation/MealDetailFlyout.tsx` | role-match |
| `src/components/generation/ShoppingListGroup.tsx` | component | transform | grouped stats cards in `src/routes/dev-page.tsx` | partial |
| `src/components/generation/FavoritesPanel.tsx` | component | request-response | `src/components/generation/MealDetailFlyout.tsx` | role-match |
| `src/components/generation/MealDetailFlyout.tsx` | component | request-response | `src/components/generation/MealDetailFlyout.tsx` | exact |
| `src/components/generation/MealCard.tsx` | component | request-response | `src/components/generation/MealCard.tsx` | exact |
| `src/components/generation/MealPlanGrid.tsx` | component | transform | `src/components/generation/MealPlanGrid.tsx` | exact |
| `supabase/functions/trpc/index.ts` | service | CRUD + transform | `supabase/functions/trpc/index.ts` | exact |

## Pattern Assignments

### `src/routes/plan-page.tsx` (route, request-response)

**Analog:** `src/routes/plan-page.tsx`

**Route-level orchestration pattern** (`src/routes/plan-page.tsx:25-40`):
```tsx
function PersistedPlanView({ id }: { id: string }) {
  const navigate = useNavigate();
  const mealPlanState = useMealPlan(id);
  ...
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [flyoutTrigger, setFlyoutTrigger] = useState<HTMLButtonElement | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const mealEnrichment = useMealEnrichment(id);
  const slots = plan ? buildMealPlanSlots(plan) : {};
```

**Section-shell pattern for top-of-page controls** (`src/routes/plan-page.tsx:172-195`):
```tsx
<section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
  <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
    Your Meal Plan
  </p>
  <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <h2 className="font-display text-2xl font-semibold leading-snug text-[var(--color-sage-deep)]">
      {plan.title}
    </h2>
```

**Route-owned action wiring pattern** (`src/routes/plan-page.tsx:197-235`):
```tsx
{isSelectionMode ? (
  <SelectionActionBar
    selectedCount={mealEnrichment.selectedMealIds.length}
    onSelectAll={() => mealEnrichment.selectAll(visibleFilledMealIds)}
    onDoneSelecting={() => setIsSelectionMode(false)}
    onEnrichSelected={() => {
      void mealEnrichment.enrichSelectedMeals();
    }}
  />
) : (
  <div className="flex justify-end">
    <button type="button" onClick={() => setIsSelectionMode(true)}>
      Select meals
    </button>
  </div>
)}

<MealPlanGrid
  ...
  onDelete={handleDelete}
  onRegenerate={handleRegenerate}
  onRetryEnrichment={(mealId) => {
    void mealEnrichment.retryMeal(mealId);
  }}
  onToggleSelectMeal={mealEnrichment.toggleMealSelection}
  onViewDetails={handleViewDetails}
/>
```

**Panel launch + focus return pattern** (`src/routes/plan-page.tsx:237-252`):
```tsx
<MealDetailFlyout
  isOpen={selectedSlot?.state === "filled"}
  slot={selectedSlot?.state === "filled" ? selectedSlot : null}
  returnFocusTo={flyoutTrigger}
  onClose={() => setSelectedSlotKey(null)}
  onDelete={() => {
    if (selectedSlotKey) {
      handleDelete(selectedSlotKey);
    }
  }}
```

**Apply in Phase 7:** keep `PersistedPlanView` as the single orchestration point for plan-level finalization state, shopping-list panel open state, favorites panel open state, and card/flyout favorite actions. Add new panels and CTAs here instead of introducing a new route or moving orchestration into child components.

**Extension points:**
- Add `isShoppingListOpen`, `isFavoritesOpen`, and a finalize-confirm state beside the existing flyout state.
- Keep plan-level CTAs in the header/finalization card area, not buried below the grid.
- Reuse the route-owned handler pattern for `finalizePlan`, `saveFavorite`, and panel open/close actions.

**Anti-patterns to avoid:**
- Do not add a primary `/favorites` route for Phase 7.
- Do not make the shopping list a detached screen.
- Do not let card components own persistent favorite/finalize mutations directly.

---

### `src/hooks/use-meal-plan.ts` (hook, CRUD)

**Analog:** `src/hooks/use-meal-plan.ts` and `src/hooks/use-meal-enrichment.ts`

**Stable query-key + TanStack Query wrapper pattern** (`src/hooks/use-meal-plan.ts:45-47`, `:97-115`):
```ts
export function mealPlanQueryKey(planId: string | undefined) {
  return ["meal-plan", planId] as const;
}

const query = useQuery<PersistedMealPlan | null>({
  queryKey: mealPlanQueryKey(planId),
  queryFn: () =>
    trpcClient.query("mealPlan.get", { id: planId! }) as Promise<PersistedMealPlan | null>,
  enabled: !!planId,
  refetchInterval: (query) => {
    const plan = query.state.data;
    ...
  },
  staleTime: 30_000,
});
```

**Invalidate-on-success mutation pattern** (`src/hooks/use-meal-plan.ts:117-133`):
```ts
const deleteMeal = useMutation<DeleteMealResponse, Error, DeleteMealInput>({
  mutationFn: (input) => trpcClient.mutation("meal.delete", input) as Promise<DeleteMealResponse>,
  onSuccess: async () => {
    if (planId) {
      await queryClient.invalidateQueries({ queryKey: mealPlanQueryKey(planId) });
    }
  },
});
```

**Per-item mutation invalidation pattern for live UI refresh** (`src/hooks/use-meal-enrichment.ts:89-100`):
```ts
async function enrichMeal(mealId: string) {
  ...
  const result = await (trpcClient.mutation(
    "meal.enrich",
    { mealId }
  ) as Promise<MealEnrichResponse>);

  await queryClient.invalidateQueries({ queryKey: mealPlanQueryKey(planId ?? result.mealPlanId) });
  setSelectedMealIds((current) => current.filter((id) => id !== mealId));
  return result;
}
```

**Apply in Phase 7:** extend `useMealPlan` rather than creating a second plan-management hook. Add `finalizePlan`, `toggleFavorite` or `saveFavorite`, and `favoritesLibrary` query/mutation wrappers that invalidate `mealPlanQueryKey(planId)` after any persisted change.

**Extension points:**
- Add separate query keys for favorites library data, but continue to invalidate the current meal plan after favorite changes so card/flyout state stays in sync.
- Prefer explicit response types for each mutation.
- If shopping-list/favorites UI needs derived state, derive it from query results in the hook return, not in multiple components.

**Anti-patterns to avoid:**
- Do not use ad hoc `fetch` calls from components when `trpcClient` + React Query is already the pattern.
- Do not invent optimistic local favorite state that can drift from persisted `is_favorite` / `favorite_meals`.

---

### `src/components/generation/ShoppingListPanel.tsx` and `src/components/generation/FavoritesPanel.tsx` (component, request-response)

**Analog:** `src/components/generation/MealDetailFlyout.tsx`

**Panel shell + focus management pattern** (`src/components/generation/MealDetailFlyout.tsx:14-21`, `:35-95`):
```tsx
const FOCUSABLE_SELECTOR = [
  "button",
  "[href]",
  "input",
  "select",
  "textarea",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

useEffect(() => {
  if (!isOpen || !slot) {
    return;
  }

  closeButtonRef.current?.focus();
}, [isOpen, slot]);
```

**Right-side panel shell pattern** (`src/components/generation/MealDetailFlyout.tsx:110-127`):
```tsx
<div className="fixed inset-0 z-40">
  <button
    type="button"
    aria-label="Close meal details"
    className="absolute inset-0 bg-[rgba(33,42,35,0.28)]"
    onClick={() => {
      onClose();
      returnFocusTo?.focus();
    }}
  />
  <div
    ref={panelRef}
    role="dialog"
    aria-modal="true"
    aria-labelledby={titleId}
    className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-[rgba(255,252,245,0.96)] px-6 py-6 shadow-[-24px_0_48px_rgba(33,42,35,0.18)] backdrop-blur md:px-8"
  >
```

**Editorial section-block pattern** (`src/components/generation/MealDetailFlyout.tsx:160-224`):
```tsx
<section className="mt-8 rounded-[1.5rem] bg-white/72 p-6">
  <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Summary</p>
  <p className="mt-3 text-base leading-8 text-[var(--color-ink)]">{meal.short_description}</p>
</section>
```

**Apply in Phase 7:** Shopping list and favorites should be new right-side panels that reuse the `MealDetailFlyout` shell language: same backdrop, same dialog behavior, same `max-w-2xl` sliding panel, same stacked `section` rhythm.

**Extension points:**
- Rename the `aria-label`, heading, and empty states for shopping list and favorites.
- Keep the plan page visible behind the panel.
- Add a copy-to-clipboard success region in `ShoppingListPanel`.
- Add a calm empty state and recipe list in `FavoritesPanel`.

**Anti-patterns to avoid:**
- Do not switch to a centered modal for shopping list or favorites.
- Do not introduce harsh utility/checklist chrome; keep the same editorial glass-surface language.
- Do not fork a second panel pattern with different spacing, focus behavior, or close semantics.

---

### `src/components/generation/FinalizePlanConfirmation.tsx` (component, event-driven)

**Analog:** dialog mechanics from `src/components/generation/MealDetailFlyout.tsx`; inline action swap from `src/components/generation/MealCard.tsx`

**Existing event-swap pattern inside a card** (`src/components/generation/MealCard.tsx:72-111`):
```tsx
{isConfirmingDelete ? (
  <MealDeleteConfirmation
    isDeleting={isDeleting}
    onCancel={() => setIsConfirmingDelete(false)}
    onConfirm={onDelete}
  />
) : (
  <div className="mt-5 flex flex-wrap items-center gap-3">
    ...
  </div>
)}
```

**Dialog accessibility contract to reuse** (`src/components/generation/MealDetailFlyout.tsx:48-95`, `:121-126`):
```tsx
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    onClose();
    returnFocusTo?.focus();
    return;
  }
  ...
}

<div
  ref={panelRef}
  role="dialog"
  aria-modal="true"
  aria-labelledby={titleId}
>
```

**Apply in Phase 7:** if confirmation is implemented as a modal/panel, copy the flyout’s focus trap and focus-return behavior. If it is implemented inline in the finalization card, copy the `MealCard` action-row swap pattern and keep the warning inside the same card shell.

**Extension points:**
- Use the exact discard warning from `07-UI-SPEC.md`.
- Keep confirm/cancel explicit.
- Return focus to the `Finalize plan` trigger on close if dialog-based.

**Anti-patterns to avoid:**
- Do not use `window.confirm`.
- Do not hide draft-meal discard behavior.
- Do not create a full-page blocker that obscures the plan context.

---

### `src/components/generation/MealCard.tsx` (component, request-response)

**Analog:** `src/components/generation/MealCard.tsx`

**Status chip + action-row pattern** (`src/components/generation/MealCard.tsx:35-58`, `:79-109`):
```tsx
const statusLabel = isEnriching ? "Enriching" : meal.status === "enriched" ? "Enriched" : "Draft";

<span className="rounded-full bg-[rgba(74,103,65,0.12)] px-3 py-1 text-xs font-semibold text-[var(--color-sage-deep)]">
  {statusLabel}
</span>

<div className="mt-5 flex flex-wrap items-center gap-3">
  <button type="button" onClick={(event) => onViewDetails?.(event.currentTarget)}>
    View details
  </button>
  <button type="button" onClick={onRegenerate}>
    Regenerate meal
  </button>
```

**Error-state treatment** (`src/components/generation/MealCard.tsx:67-70`, `:94-101`):
```tsx
<p className="mt-4 rounded-xl bg-[rgba(128,59,38,0.08)] px-4 py-3 text-sm text-[#803b26]" role="alert">
  {errorMessage}
</p>
```

**Apply in Phase 7:** if favorites appear on cards, add them as another action-row affordance within the existing card shell. Use the existing chip/action density and keep favorite availability dependent on `meal.status === "enriched"`.

**Extension points:**
- Show `Save to favorites` only for enriched meals, or a disabled helper state for drafts.
- If a card shows finalization state, do it via calm status copy or chip treatment, not a new card layout.

**Anti-patterns to avoid:**
- Do not add icon-only favorites controls.
- Do not show an active save action on draft meals.
- Do not overload the card with shopping-list details; keep shopping list in its own panel.

---

### `src/components/generation/MealPlanGrid.tsx` (component, transform)

**Analog:** `src/components/generation/MealPlanGrid.tsx`

**Slot rendering switch pattern** (`src/components/generation/MealPlanGrid.tsx:53-135`):
```tsx
function renderSlot(day: string, mealType: MealType) {
  const slotKey = buildSlotKey(day, mealType);
  const slot = slots[slotKey];
  ...
  switch (slot.state) {
    case "filled":
      return <MealCard ... />;
    case "empty":
      return <EmptyMealSlot ... />;
    case "regenerating":
      return <MealRegeneratingCard ... />;
    case "error":
      return slot.previous ? <MealCard ... /> : <EmptyMealSlot ... />;
  }
}
```

**Responsive mobile/desktop duplication pattern** (`src/components/generation/MealPlanGrid.tsx:137-190`):
```tsx
<div className="space-y-6 md:hidden" data-testid="meal-plan-grid-mobile">
...
</div>

<div
  className="hidden gap-4 md:grid"
  data-testid="meal-plan-grid-desktop"
  style={{ gridTemplateColumns: `minmax(6rem, auto) repeat(${days.length}, minmax(0, 1fr))` }}
>
```

**Apply in Phase 7:** keep the grid’s responsibility narrow. It should continue transforming slots into cards and empty/regenerating states. If card favorite affordances are added, pass them down as props from the route the same way delete/regenerate/retry are wired now.

**Anti-patterns to avoid:**
- Do not teach the grid about plan-level finalization workflow.
- Do not open a separate favorites route from inside the grid.
- Do not duplicate favorite persistence logic in `MealPlanGrid`.

---

### `src/components/generation/MealDetailFlyout.tsx` (component, request-response)

**Analog:** `src/components/generation/MealDetailFlyout.tsx`

**Recipe-first content ordering pattern** (`src/components/generation/MealDetailFlyout.tsx:150-205`, `:216-241`):
```tsx
{isEnriched && meal.image_url ? (
  <section ...>
    <img src={meal.image_url} alt={meal.title} className="h-64 w-full object-cover" />
  </section>
) : null}

<section ...>Summary</section>

{isEnriched ? (
  <>
    <section ...>Ingredients</section>
    <section ...>Instructions</section>
    <section ...>Nutrition summary</section>
  </>
) : (
  <section ...>Recipe view</section>
)}

<section ...>Why this fits</section>
<section ...>Management actions</section>
```

**Apply in Phase 7:** add `Save to favorites` in the existing management-actions area for enriched meals, and optionally `Open favorites` as a secondary action if it does not compete with recipe content. Preserve the current recipe-first hierarchy.

**Extension points:**
- A saved meal can show `Saved` in the action area with positive sage styling.
- Draft meals should show the helper copy from the UI spec rather than a fake interactive state.

**Anti-patterns to avoid:**
- Do not reorder the flyout around favorites; the recipe stays primary.
- Do not move shopping list into the meal-detail flyout itself unless it becomes a distinct panel component reusing the same shell.

---

### `supabase/functions/trpc/index.ts` (service, CRUD + transform)

**Analog:** `supabase/functions/trpc/index.ts`

**Authenticated procedure gate** (`supabase/functions/trpc/index.ts:54-65`):
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

**Owned-plan read pattern** (`supabase/functions/trpc/index.ts:626-648`):
```ts
get: authedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const { data: planData, error: planError } = await ctx.supabase
      .from("meal_plans")
      .select("id, title, num_days, generation_status")
      .eq("id", input.id)
      .eq("user_id", ctx.userId)
      .maybeSingle();
```

**Typed persisted-plan mapping pattern** (`supabase/functions/trpc/index.ts:680-698`):
```ts
return {
  id: planData.id as string,
  title: planData.title as string,
  numDays: (planMeta?.num_days ?? planData.num_days ?? 7) as number,
  mealTypes,
  meals: (mealsData ?? []).map((meal) => ({
    id: meal.id as string,
    ...
    status: (meal.status ?? "draft") as "draft" | "enriched",
    spoonacular_recipe_id: (meal.spoonacular_recipe_id ?? null) as number | null,
    ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : null,
```

**Mutation + RLS-scoped fetch/update pattern** (`supabase/functions/trpc/index.ts:736-761`, `:845-856`, `:963-990`):
```ts
enrich: authedProcedure
  .input(z.object({ mealId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const { data: meal, error: mealError } = await ctx.supabase
      .from("meals")
      .select(`
        id,
        meal_plan_id,
        ...
        meal_plans!inner (
          id,
          household_id,
          user_id
        )
      `)
      .eq("id", input.mealId)
      .eq("meal_plans.user_id", ctx.userId)
      .maybeSingle();
```

**Usage/dev query pattern** (`supabase/functions/trpc/index.ts:1144-1174`):
```ts
spoonacularUsage: authedProcedure.query(async ({ ctx }) => {
  const todayUtc = new Date().toISOString().slice(0, 10);
  const { data, error } = await ctx.supabase
    .from("spoonacular_usage")
    .select("meal_id, meal_plan_id, spoonacular_recipe_id, cache_hit, endpoint, points_used, quota_request, quota_used, quota_left, usage_date_utc, created_at")
    .order("created_at", { ascending: false })
    .limit(25);
  ...
  return {
    today: summaries.find((summary) => summary.usage_date_utc === todayUtc) ?? { ... },
    recent: entries,
    liveConcurrencyLimit: SPOONACULAR_LIVE_CONCURRENCY_LIMIT,
  };
})
```

**Schema/architecture anchors for Phase 7** (`supabase/migrations/20260419000001_initial_schema.sql:38-39`, `:61`, `:79-88`, `:116`; `architecture.md:219-222`):
```sql
generation_status text default 'draft' check (generation_status in ('draft','enriching','finalized')),
shopping_list jsonb,
...
is_favorite boolean default false,
...
create table favorite_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text,
  spoonacular_recipe_id bigint,
  ingredients jsonb,
  nutrition jsonb,
  instructions text[],
  image_url text,
  created_at timestamptz default now()
);
...
create policy "favorite_meals: own rows" on favorite_meals for all using (auth.uid() = user_id);
```

```md
**4. finalizePlan(mealPlanId)**
- Server aggregates shopping list (original units + de-duplication)
- Stores in `meal_plans.shopping_list`
- Sets `generation_status = 'finalized'`
```

**Apply in Phase 7:** add new `authedProcedure` mutations/queries to the existing `mealPlan`, `meal`, or new `favorites` router sections inside the same tRPC edge function. Validate UUID inputs with Zod, fetch rows through caller-scoped Supabase clients, and map DB rows into frontend-friendly shapes before returning.

**Extension points:**
- `mealPlan.finalize` should read the caller-owned plan + meals, aggregate shopping list server-side, write `shopping_list`, set `generation_status`, and remove draft meals per `07-CONTEXT.md`.
- Favorite save/list procedures should read from enriched meal rows and persist recipe-backed data into `favorite_meals`.
- Extend `mealPlan.get` to return `generation_status`, `shopping_list`, and favorite state if the route needs them immediately after invalidation.

**Anti-patterns to avoid:**
- Do not compute finalization exclusively on the client.
- Do not bypass `authedProcedure` or RLS-scoped reads.
- Do not add a second API surface outside the existing tRPC router for these actions.

## Shared Patterns

### Plan-page shell and panel adjacency
**Source:** `src/routes/plan-page.tsx:172-252`

Use the existing top-of-page shell plus route-owned panel state. Phase 7 should feel like one continued `/plan/:id` workspace: header/finalization card first, grid second, right-side panels layered on demand.

### Common right-side panel language
**Source:** `src/components/generation/MealDetailFlyout.tsx:110-127`, `:160-241`

Shopping list and favorites panels should share:
- backdrop close
- `role="dialog"` + `aria-modal="true"`
- focus trap + focus return
- `max-w-2xl` right-side slide-over
- stacked `section` blocks with `rounded-[1.5rem] bg-white/72 p-6`

### React Query refresh contract
**Source:** `src/hooks/use-meal-plan.ts:117-133`; `src/hooks/use-meal-enrichment.ts:89-100`

Every persisted plan mutation should invalidate `mealPlanQueryKey(planId)` so the grid, flyout, and plan-level summary stay synchronized without manual prop patching.

### tRPC auth and mapping contract
**Source:** `supabase/functions/trpc/index.ts:54-65`, `:626-698`

All new procedures should:
- use `authedProcedure`
- validate inputs with Zod
- fetch through `ctx.supabase`
- throw `TRPCError` on DB failures
- map raw DB fields into typed client shapes instead of leaking DB response objects directly

### Editorial stats/list block rhythm
**Source:** `src/routes/dev-page.tsx:86-146`

Use the same editorial surface rhythm for shopping-list groups and favorites summaries:
- top summary row/cards where useful
- stacked bordered subsections for lists
- clear empty/error states in the same visual system

## Prior Plan Artifact Structure To Follow

### Execution-plan frontmatter
**Source:** `.planning/phases/06-enrichment-flow/06-03-PLAN.md`, `.planning/phases/06-enrichment-flow/06-04-PLAN.md`

Phase 7 plans should keep the same frontmatter shape:
- `phase`, `plan`, `type`, `wave`, `depends_on`
- `files_modified`
- `autonomous`
- `requirements`
- `must_haves` with `truths`, `artifacts`, and `key_links`

### Narrative plan sections
**Source:** `.planning/phases/06-enrichment-flow/06-03-PLAN.md`

Use the same document flow:
- `objective`
- `execution_context`
- `context`
- `tasks`
- `threat_model`
- `verification`
- `success_criteria`
- `output`

### Phase-7-specific planning guidance
Copy the Phase 6 style of writing tasks as concrete UI/backend contracts, but tune it to finalization/favorites:
- one plan should likely own server aggregation, shopping-list persistence, and favorite procedures
- one plan should likely own `/plan/:id` UI integration, panels, and flyout/card affordances
- one plan should likely own unit/E2E regression coverage and any human-verify checkpoint if clipboard or cross-plan persistence needs explicit manual confirmation

### Coverage and verification structure
**Source:** `.planning/phases/06-enrichment-flow/06-04-PLAN.md`

If Phase 7 includes cross-surface flows, copy these patterns:
- targeted component/unit verification commands inside each task
- explicit E2E coverage for primary user journeys
- `checkpoint:human-verify` only where the phase truly needs manual confirmation
- `source_audit` section when multiple context/research inputs need traceable coverage

## Anti-Patterns To Avoid

- Do not introduce a new top-level `/favorites` route as the primary Phase 7 library surface.
- Do not replace the existing right-side flyout/panel model with centered modals or full-page takeovers.
- Do not hide the discard behavior for draft meals during finalization.
- Do not allow draft meals to appear saved locally before enrichment.
- Do not put shopping-list aggregation logic only in React components; keep persistence and de-duplication server-side.
- Do not bypass `mealPlanQueryKey(planId)` invalidation after finalize/favorite mutations.
- Do not add a parallel REST layer or one-off fetch helper when the repo already uses tRPC + React Query.
- Do not overload `MealPlanGrid` with plan-level workflow state that belongs in `PersistedPlanView`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/components/generation/ShoppingListGroup.tsx` | component | transform | No existing ingredient-group renderer exists yet; reuse the editorial grouped-list rhythm from `src/routes/dev-page.tsx` and the flyout section shell |
| `src/components/generation/FavoritesPanel.tsx` | component | request-response | No dedicated reusable library panel exists yet; use `MealDetailFlyout` as the shell analog and keep content recipe-card driven |

## Metadata

**Analog search scope:** `src/routes`, `src/components/generation`, `src/hooks`, `supabase/functions/trpc`, `supabase/migrations`, `.planning/phases/05-*`, `.planning/phases/06-*`, `architecture.md`

**Files scanned:** 15

**Pattern extraction date:** 2026-04-22
