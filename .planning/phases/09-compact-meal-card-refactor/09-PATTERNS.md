# Phase 9: Compact Meal Card Refactor - Pattern Map

**Mapped:** 2026-04-23
**Files analyzed:** 8 modified files (no new files created)
**Analogs found:** 8 / 8 (all files are self-analog — Phase 9 refactors existing files)

---

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/generation/MealCard.tsx` | component | request-response (card action → parent callback) | `src/components/generation/MealCard.tsx` (self) | self-refactor |
| `src/components/generation/MealPlanGrid.tsx` | component | request-response (slot render → card callbacks) | `src/components/generation/MealPlanGrid.tsx` (self) | self-refactor |
| `src/components/generation/MealDetailFlyout.tsx` | component | request-response (flyout → parent callback) | `src/components/generation/MealDetailFlyout.tsx` (self) | self-refactor |
| `src/components/generation/MealDeleteConfirmation.tsx` | component | request-response (confirmation → parent callback) | `src/components/generation/MealDeleteConfirmation.tsx` (self) | self-refactor (copy text only) |
| `src/routes/plan-page.tsx` | route/controller | request-response (state → flyout open) | `src/routes/plan-page.tsx` (self) | self-refactor |
| `src/components/generation/generation-components.test.tsx` | test | — | `src/components/generation/generation-components.test.tsx` (self) | self-refactor |
| `src/components/generation/meal-plan-management.test.tsx` | test | — | `src/components/generation/meal-plan-management.test.tsx` (self) | self-refactor |
| `src/components/generation/meal-detail-flyout.test.tsx` | test | — | `src/components/generation/meal-detail-flyout.test.tsx` (self) | self-refactor |
| `src/routes/plan-page.test.tsx` | test | — | `src/routes/plan-page.test.tsx` (self) | add new test only |

---

## Pattern Assignments

### `src/components/generation/MealCard.tsx` (component, request-response)

**Analog:** Self. This is the primary refactor target. The entire file is replaced with a compact variant.

**Current prop interface** (`MealCard.tsx` lines 6–23) — props to REMOVE and REPLACE:
```tsx
// REMOVE from MealCardProps:
favoriteState?: "disabled" | "ready" | "saved";   // line 14
favoriteHelperText?: string | null;                // line 15
onViewDetails?: (trigger: HTMLButtonElement) => void;  // line 20
onSaveFavorite?: () => void;                       // line 21
onOpenFavorites?: (trigger: HTMLButtonElement) => void;  // line 22

// ADD to MealCardProps:
showMealTypeLabel?: boolean;           // suppresses meal_type label; default true for standalone use
onCardClick?: (trigger: HTMLElement) => void;  // replaces onViewDetails
```

**Current article wrapper** (`MealCard.tsx` lines 48–49) — clickable card pattern to replace with:
```tsx
// REPLACE the static <article> with a role="button" wrapper:
<article
  role="button"
  tabIndex={0}
  onClick={(e) => onCardClick?.(e.currentTarget)}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onCardClick?.(e.currentTarget);
    }
  }}
  className={`rounded-[1.5rem] bg-white/70 cursor-pointer transition-colors ${
    isSelected ? "ring-2 ring-[rgba(74,103,65,0.35)]" : ""
  }`}
>
```

**Meal-type label suppression** (`MealCard.tsx` lines 52–54) — conditional render:
```tsx
// REPLACE unconditional render:
// <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">{meal.meal_type}</p>

// WITH conditional:
{showMealTypeLabel !== false ? (
  <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
    {meal.meal_type}
  </p>
) : null}
```

**Description line removal** (`MealCard.tsx` lines 74–76) — DELETE entirely:
```tsx
// DELETE this block:
<p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
  {meal.short_description}
</p>
```

**Compact icon button pattern for delete** — replaces the text button at `MealCard.tsx` lines 144–152:
```tsx
// DELETE text button:
// <button type="button" onClick={() => setIsConfirmingDelete(true)} ...>Delete meal</button>

// ADD compact icon button (top-right positioning, always visible):
<button
  type="button"
  aria-label="Delete meal"
  title="Delete meal"
  onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(true); }}
  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#803b26]"
>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
</button>
```

**Compact icon button pattern for regenerate** — replaces text button at `MealCard.tsx` lines 98–105:
```tsx
// DELETE text button:
// <button type="button" onClick={onRegenerate} ...>Regenerate meal</button>

// ADD compact icon button:
<button
  type="button"
  aria-label="Regenerate meal"
  title="Regenerate meal"
  onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--color-sage-deep)]"
>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M21 2v6h-6" />
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M3 22v-6h6" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
  </svg>
</button>
```

**"View details" button removal** — DELETE the button at `MealCard.tsx` lines 90–95:
```tsx
// DELETE entirely:
// <button type="button" onClick={(event) => onViewDetails?.(event.currentTarget)} ...>View details</button>
```

**Favorite props removal** — DELETE entire favorite rendering blocks at `MealCard.tsx` lines 115–143:
```tsx
// DELETE: favoriteState === "ready" Save to favorites button
// DELETE: favoriteState === "saved" Saved span + Open favorites button
// DELETE: favoriteState === "disabled" helper text span
```

**Propagation guard pattern** — every icon button inside the clickable card wrapper MUST call `e.stopPropagation()` before its own handler. This prevents icon clicks from bubbling to the card-level `onClick` and opening the flyout simultaneously:
```tsx
onClick={(e) => { e.stopPropagation(); /* own handler */ }}
```

---

### `src/components/generation/MealPlanGrid.tsx` (component, request-response)

**Analog:** Self.

**Current prop interface** (`MealPlanGrid.tsx` lines 11–29) — props to REMOVE and REPLACE:
```tsx
// REMOVE from MealPlanGridProps:
favoriteStateByMealId?: Record<string, "disabled" | "ready" | "saved">;  // line 21
favoriteHelperTextByMealId?: Record<string, string | null>;               // line 22
onSaveFavorite?: (mealId: string) => void;                                // line 27
onOpenFavorites?: (trigger: HTMLButtonElement) => void;                   // line 28

// CHANGE:
onViewDetails?: (slotKey: string, trigger: HTMLButtonElement) => void;    // line 26
// TO:
onViewDetails?: (slotKey: string, trigger: HTMLElement) => void;          // trigger type broadens
```

**MealCard call site in renderSlot "filled" case** (`MealPlanGrid.tsx` lines 105–124) — wiring to update:
```tsx
// REMOVE from all MealCard call sites:
// favoriteState={favoriteStateByMealId[slot.meal.id] ?? "disabled"}
// favoriteHelperText={favoriteHelperTextByMealId[slot.meal.id] ?? null}
// onSaveFavorite={() => onSaveFavorite?.(slot.meal.id)}
// onOpenFavorites={onOpenFavorites}
// onViewDetails={onViewDetails ? (trigger) => onViewDetails(slot.slotKey, trigger) : undefined}

// ADD to all MealCard call sites:
showMealTypeLabel={false}
onCardClick={onViewDetails ? (trigger) => onViewDetails(slot.slotKey, trigger) : undefined}
```

**Mobile layout already provides meal-type label** (`MealPlanGrid.tsx` lines 186–189):
```tsx
// This <p> in mobile layout is why showMealTypeLabel={false} is correct for all grid cards:
<p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
  {mealTypeLabels[mealType]}
</p>
```

**Desktop layout already provides meal-type label** (`MealPlanGrid.tsx` lines 216–220):
```tsx
// This <p> in the left rail is why showMealTypeLabel={false} is correct for all grid cards:
<p
  key={`${mealType}-label`}
  className={`flex items-center uppercase text-[var(--color-muted)] ${desktopLabelClass}`}
>
  {mealTypeLabels[mealType]}
</p>
```

---

### `src/components/generation/MealDetailFlyout.tsx` (component, request-response)

**Analog:** Self. This file needs a star/favorite affordance added to the management actions section.

**Existing favorite "ready" state button** (`MealDetailFlyout.tsx` lines 257–264) — upgrade to star icon button:
```tsx
// Current text button to REPLACE or supplement with star icon:
{favoriteState === "ready" ? (
  <button
    type="button"
    onClick={onSaveFavorite}
    className="min-h-[44px] rounded-xl bg-[rgba(74,103,65,0.1)] px-4 py-2 text-sm font-semibold text-[var(--color-sage-deep)]"
  >
    Save to favorites
  </button>
) : null}

// Phase 9 target — add star icon affordance (agent's discretion on icon choice):
{favoriteState === "ready" ? (
  <button
    type="button"
    aria-label="Save to favorites"
    title="Save to favorites"
    onClick={onSaveFavorite}
    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--color-sage-deep)]"
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  </button>
) : null}
```

**Focus trap implementation** (`MealDetailFlyout.tsx` lines 19–108) — preserve unchanged. The focus trap walks `FOCUSABLE_SELECTOR` in DOM order. Adding a star button changes the Tab sequence; `meal-detail-flyout.test.tsx` focus-trap test must be updated to reflect the new button order.

**returnFocusTo type** (`MealDetailFlyout.tsx` line 7) — already `HTMLElement | null` — no change needed:
```tsx
returnFocusTo?: HTMLElement | null;  // already flexible — no change required
```

---

### `src/components/generation/MealDeleteConfirmation.tsx` (component, request-response)

**Analog:** Self. Minimal change — only the confirmation text copy updates.

**Current copy** (`MealDeleteConfirmation.tsx` line 14):
```tsx
<span className="text-xs text-[#803b26]">Remove this meal from the plan?</span>
```

**Phase 9 target copy** (per UI-SPEC copywriting contract):
```tsx
<span className="text-xs text-[#803b26]">
  Delete meal: Remove this meal from the plan? You can regenerate this slot again afterward.
</span>
```

**Props interface and structure** (`MealDeleteConfirmation.tsx` lines 1–33) — unchanged. The trigger changes from a text button to an icon button in `MealCard.tsx`, but `MealDeleteConfirmation` itself is unaffected.

---

### `src/routes/plan-page.tsx` (route/controller, request-response)

**Analog:** Self.

**flyoutTrigger state type** (`plan-page.tsx` line 46) — broaden from `HTMLButtonElement` to `HTMLElement`:
```tsx
// CHANGE:
const [flyoutTrigger, setFlyoutTrigger] = useState<HTMLButtonElement | null>(null);

// TO:
const [flyoutTrigger, setFlyoutTrigger] = useState<HTMLElement | null>(null);
```

**handleViewDetails signature** (`plan-page.tsx` lines 182–185) — broaden trigger type:
```tsx
// CHANGE:
function handleViewDetails(slotKey: string, trigger: HTMLButtonElement) {
  setSelectedSlotKey(slotKey);
  setFlyoutTrigger(trigger);
}

// TO:
function handleViewDetails(slotKey: string, trigger: HTMLElement) {
  setSelectedSlotKey(slotKey);
  setFlyoutTrigger(trigger);
}
```

**MealPlanGrid call site** (`plan-page.tsx` lines 316–342) — props to REMOVE:
```tsx
// REMOVE from MealPlanGrid call:
favoriteStateByMealId={favoriteStateByMealId}
favoriteHelperTextByMealId={favoriteHelperTextByMealId}
onSaveFavorite={(mealId) => { void handleSaveFavorite(mealId); }}
onOpenFavorites={(trigger) => { setOverlayTrigger(trigger); setIsFavoritesOpen(true); }}
```

**Note:** `favoriteStateByMealId` and `favoriteHelperTextByMealId` data must still be computed and passed to `MealDetailFlyout` — they are only removed from `MealPlanGrid`, not from the route entirely.

**MealDetailFlyout call site** (`plan-page.tsx` lines 343–378) — stays wired with favorite props:
```tsx
// These props remain on MealDetailFlyout — no change needed:
favoriteState={selectedSlot?.state === "filled" ? favoriteStateByMealId[selectedSlot.meal.id] ?? "disabled" : "disabled"}
favoriteHelperText={selectedSlot?.state === "filled" ? favoriteHelperTextByMealId[selectedSlot.meal.id] ?? null : null}
onSaveFavorite={...}
onOpenFavorites={...}
```

---

### `src/components/generation/generation-components.test.tsx` (test)

**Analog:** Self. Update existing assertions; add new ones.

**Assertions to REMOVE** (lines 138–140):
```tsx
// REMOVE — meal type is no longer rendered in card body:
expect(screen.getByText("dinner")).toBeInTheDocument();

// REMOVE — short_description is no longer rendered in card body:
expect(screen.getByText("Salmon, rice, cucumbers, and yogurt sauce.")).toBeInTheDocument();
```

**Assertions to ADD** (after the removes):
```tsx
// ADD — compact card renders title and status chip:
expect(screen.getByText("Herby Salmon Bowls")).toBeInTheDocument();
expect(screen.getByText("Draft")).toBeInTheDocument();

// ADD — no "View details" button:
expect(screen.queryByRole("button", { name: "View details" })).not.toBeInTheDocument();

// ADD — meal type label is NOT in the card body when showMealTypeLabel is not passed (default):
// Note: default behavior of showMealTypeLabel depends on agent's implementation choice.
// If default is false (grid usage), assert label not present.
// If default is true (standalone usage), test with explicit showMealTypeLabel={false}.
```

---

### `src/components/generation/meal-plan-management.test.tsx` (test)

**Analog:** Self. The delete flow test at line 44 may survive unchanged because the icon button still has `aria-label="Delete meal"` — same accessible name.

**Existing assertion likely to survive** (line 44):
```tsx
// This query uses role + accessible name — it will find the icon button as long as aria-label="Delete meal":
fireEvent.click(screen.getByRole("button", { name: "Delete meal" }));
// If this fails, it means the icon button is missing aria-label — fix the component, not the test.
```

**New tests to ADD**:
```tsx
it("clicking the card body (not an icon) fires onCardClick", () => {
  const onCardClick = vi.fn();
  render(
    <MealCard
      slot={filledSlot()}
      onDelete={mockDelete}
      onRegenerate={mockRegenerate}
      onCardClick={onCardClick}
    />
  );

  // Click the article element itself (not any button)
  const article = screen.getByRole("button", { name: /herby salmon bowls/i });
  // Or use: document.querySelector("article")
  fireEvent.click(article);

  expect(onCardClick).toHaveBeenCalledTimes(1);
});

it("clicking the delete icon does NOT fire onCardClick", () => {
  const onCardClick = vi.fn();
  render(
    <MealCard
      slot={filledSlot()}
      onDelete={mockDelete}
      onRegenerate={mockRegenerate}
      onCardClick={onCardClick}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "Delete meal" }));

  expect(onCardClick).not.toHaveBeenCalled();
});

it("clicking the regenerate icon does NOT fire onCardClick", () => {
  const onCardClick = vi.fn();
  render(
    <MealCard
      slot={filledSlot()}
      onDelete={mockDelete}
      onRegenerate={mockRegenerate}
      onCardClick={onCardClick}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "Regenerate meal" }));

  expect(onCardClick).not.toHaveBeenCalled();
});
```

---

### `src/components/generation/meal-detail-flyout.test.tsx` (test)

**Analog:** Self.

**Focus trap test to UPDATE** (lines 59–66) — Tab sequence changes when star button is added:
```tsx
// Current sequence (lines 59-66):
fireEvent.keyDown(window, { key: "Tab" });
expect(screen.getByRole("button", { name: "Regenerate meal" })).toHaveFocus();
fireEvent.keyDown(window, { key: "Tab" });
expect(screen.getByRole("button", { name: "Delete meal" })).toHaveFocus();
fireEvent.keyDown(window, { key: "Tab" });
expect(closeButton).toHaveFocus(); // wraps

// After Phase 9 (if star button is added before Regenerate/Delete):
fireEvent.keyDown(window, { key: "Tab" });
expect(screen.getByRole("button", { name: "Regenerate meal" })).toHaveFocus();
fireEvent.keyDown(window, { key: "Tab" });
expect(screen.getByRole("button", { name: "Delete meal" })).toHaveFocus();
fireEvent.keyDown(window, { key: "Tab" });
expect(screen.getByRole("button", { name: "Save to favorites" })).toHaveFocus(); // if star placed after
fireEvent.keyDown(window, { key: "Tab" });
expect(closeButton).toHaveFocus(); // wraps

// Agent's discretion: exact sequence depends on star button placement in JSX DOM order.
// The test must match the actual DOM order after implementation.
```

**New test to ADD** (star/favorite affordance):
```tsx
it("renders a favorite star affordance for enriched ready meals", () => {
  render(
    <MealDetailFlyout
      isOpen
      slot={makeEnrichedSlot()}
      favoriteState="ready"
      onClose={vi.fn()}
      onDelete={vi.fn()}
      onRegenerate={vi.fn()}
      onSaveFavorite={vi.fn()}
    />
  );

  // Star button accessible via aria-label:
  expect(screen.getByRole("button", { name: "Save to favorites" })).toBeInTheDocument();
});
```

---

### `src/routes/plan-page.test.tsx` (test)

**Analog:** Self. Add new test for card-click flyout open. The existing mock for `MealPlanGrid` (lines 113–117) stubs it out — testing card-click behavior requires a different approach.

**Existing MealPlanGrid stub** (lines 113–117):
```tsx
vi.mock("@/components/generation/MealPlanGrid", () => ({
  MealPlanGrid: ({ slots }: { slots: Record<string, unknown> }) => (
    <div data-testid="meal-plan-grid">{Object.keys(slots).join(",")}</div>
  ),
}));
```

**New test approach** — test `handleViewDetails` wiring directly via `MealCard` + `MealPlanGrid` in a focused integration test, or update the stub to expose the `onViewDetails` callback:
```tsx
// Option: Update stub to expose onViewDetails so the test can call it:
vi.mock("@/components/generation/MealPlanGrid", () => ({
  MealPlanGrid: ({ onViewDetails }: { onViewDetails?: (slotKey: string, trigger: HTMLElement) => void }) => (
    <div data-testid="meal-plan-grid">
      <button
        onClick={(e) => onViewDetails?.("Monday:dinner", e.currentTarget)}
      >
        Open card flyout
      </button>
    </div>
  ),
}));

// Then add test:
it("card click opens the flyout via onViewDetails wiring", async () => {
  // Setup: plan with a filled slot
  mockUseMealPlan.mockReturnValue({ plan: persistedPlan, ... });

  renderPlanPage("plan-xyz");

  fireEvent.click(screen.getByRole("button", { name: "Open card flyout" }));

  // Flyout should open (MealDetailFlyout renders when selectedSlotKey is set)
  await waitFor(() => {
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
```

---

## Shared Patterns

### Clickable wrapper with propagation guard
**Source:** `src/components/generation/MealCard.tsx` (Phase 9 target pattern)
**Apply to:** `MealCard.tsx` card wrapper

The `<article role="button" tabIndex={0}>` pattern with `onKeyDown` for Enter/Space is the correct approach. Do NOT use `<button>` as the wrapper — `<button>` inside `<button>` is invalid HTML. The card wrapper is a non-button element with ARIA role applied.

Every child `<button>` that has its own action MUST call `e.stopPropagation()` before its handler:
```tsx
onClick={(e) => { e.stopPropagation(); /* own action */ }}
```

### Inline SVG icon buttons (no library)
**Source:** UI-SPEC + `src/components/generation/MealCard.tsx` (Phase 9 target)
**Apply to:** Delete icon button, Regenerate icon button in `MealCard.tsx`; Star icon button in `MealDetailFlyout.tsx`

All icon buttons must have:
- `aria-label` (accessible name)
- `title` (tooltip via native attribute — agent's discretion)
- `min-h-[44px] min-w-[44px]` hit target (per UI-SPEC)
- `aria-hidden="true"` on the `<svg>` element itself
- `type="button"` to prevent form submission

### Status chip rendering (unchanged)
**Source:** `src/components/generation/MealCard.tsx` lines 55–58
**Apply to:** Compact card — status chip survives, positioned top-right

```tsx
<span className="rounded-full bg-[rgba(74,103,65,0.12)] px-3 py-1 text-xs font-semibold text-[var(--color-sage-deep)]">
  {statusLabel}
</span>
```

### Focus trap in flyout (unchanged)
**Source:** `src/components/generation/MealDetailFlyout.tsx` lines 45–108
**Apply to:** `MealDetailFlyout.tsx` — do not re-implement. The existing `FOCUSABLE_SELECTOR` + Tab key handler is correct. Only update the test assertions to match the new DOM order after star button is added.

### Return focus on flyout close (type broadening)
**Source:** `src/routes/plan-page.tsx` lines 46, 182–185; `src/components/generation/MealDetailFlyout.tsx` line 7
**Apply to:** `plan-page.tsx` flyoutTrigger state + handleViewDetails signature

`MealDetailFlyout.returnFocusTo` is already typed as `HTMLElement | null` (line 7) — safe to accept a card element. The only change is in `plan-page.tsx`: broaden `flyoutTrigger` from `HTMLButtonElement | null` to `HTMLElement | null`.

### Test setup pattern
**Source:** `src/components/generation/meal-plan-management.test.tsx` lines 1–29
**Apply to:** All new tests added to existing test files

The `filledSlot()` helper pattern (lines 11–28) is the canonical way to construct test slots. Use it directly in new propagation-guard tests:
```tsx
function filledSlot(overrides = {}): Extract<MealPlanSlot, { state: "filled" }> {
  return { state: "filled", slotKey: "Monday:dinner", ... ...overrides };
}
```

---

## No Analog Found

No files in this phase lack a codebase analog — every file is a self-refactor of an existing component. There are no net-new files.

---

## Metadata

**Analog search scope:** `src/components/generation/`, `src/routes/`
**Files scanned:** 9 source files read in full
**Pattern extraction date:** 2026-04-23
