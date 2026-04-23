# Phase 9: Compact Meal Card Refactor - Research

**Researched:** 2026-04-23
**Domain:** React component refactor — compact card interaction model, icon affordances, flyout entry wiring, test regression coverage
**Confidence:** HIGH

---

## Summary

Phase 9 is a pure UI and interaction refactor. There is no new backend capability, no new library to introduce, and no external service dependency. The entire work lives in three component files (`MealCard.tsx`, `MealPlanGrid.tsx`, `MealDetailFlyout.tsx`) and their route-level wiring in `plan-page.tsx`.

The current `MealCard` is over-detailed: it renders the meal-type label, a `short_description` block, a "View details" text button, text-based regenerate/delete/favorite buttons, and an inline delete confirmation. Phase 9 must strip the card down to title + status chip + two compact icon buttons (regenerate, delete) and wire the entire card surface as the flyout entry point. The meal-type label is suppressed from the card because `MealPlanGrid` already surfaces it in the row header rail. Favorite controls move entirely to the flyout.

The existing `MealDeleteConfirmation` component is already isolated and can stay with minimal changes — only its trigger changes from a text button to an icon button. The `MealDetailFlyout` already has favorite controls and only needs a star-affordance "star button" addition to absorb the favorite action moved off the card. The `plan-page.tsx` flyout-open wiring currently depends on a callback from `MealCard` (`onViewDetails`); Phase 9 replaces that with a card-level `onClick` handler that the whole card clickable area fires, while individual icon button clicks must stop event propagation so they do not also open the flyout.

All 155 existing tests pass and must continue to pass. Three test files contain assertions that will need to shift after Phase 9: `generation-components.test.tsx` (checks for `short_description` text and meal-type in card body), `meal-plan-management.test.tsx` (finds delete via text `"Delete meal"` button), and `meal-detail-flyout.test.tsx` (focuses trap sequence references existing button order). New tests must cover compact-card rendering, card-click flyout entry, and icon accessibility.

**Primary recommendation:** Refactor `MealCard` into a single compact component variant, reconcile click propagation between the card wrapper and icon buttons, update the three affected test files, and add new compact-card tests — all in a coherent wave sequence.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Dense grid cards show only compact core payload: title, status, and direct compact actions.
- **D-02:** Dense grid cards remove the current summary/description line.
- **D-03:** Focused single-meal card contexts use the same compact payload as dense cards.
- **D-04:** Focused cards may expand slightly in spacing/size, not information density.
- **D-05:** When surrounding layout already communicates breakfast/lunch/dinner, the card does not repeat that label.
- **D-06:** Meal-type suppression applies across both dense and focused card contexts when context is clear.
- **D-07:** Clicking anywhere on a meal card opens the flyout.
- **D-08:** Richer context belongs only in the flyout, not the card body.
- **D-09:** Click-to-open-flyout behavior applies anywhere the compact meal card component is used.
- **D-10:** Compact cards keep only delete and regenerate as direct actions.
- **D-11:** Favorite controls are removed from the compact card surface entirely.
- **D-12:** Regenerate remains directly available on the card.
- **D-13:** Delete and regenerate use compact icon treatments, not text buttons.
- **D-14:** Both compact action icons expose tooltips.
- **D-15:** The delete icon lives in the top-right area of the card chrome.
- **D-16:** The delete icon is visible at all times (not hover/focus-only).
- **D-17:** The existing inline delete confirmation pattern remains attached to card interaction after delete icon press.
- **D-18:** Favorite is no longer a direct card affordance in Phase 9.
- **D-19:** Favorite appears in the flyout as a clickable star affordance.
- **D-20:** Focused cards and dense cards share the same behavior model.
- **D-21:** Phase 9 strengthens one compact card system, not two separate models.
- **D-22:** The right-side flyout remains the detailed meal surface from Phases 5 and 6.
- **D-23:** Phase 9 is a UI and interaction refactor only — no new backend capability.

### Claude's Discretion

- Exact icon choices for regenerate, delete, and favorite-star affordances
- Exact tooltip copy, timing, and placement
- Exact spacing differences between dense and focused card variants
- Exact hover, focus-ring, and pressed-state treatments for the compact card and its icon affordances

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CARD-01 | Every meal renders as a card in both dense plan-grid and focused single-meal contexts | MealPlanGrid already uses MealCard for all states; single shared component path confirmed |
| CARD-02 | Dense meal cards show only essential summary: title, status, favorite state, and primary actions | Note: D-11 removes favorite from card; CARD-02 language "favorite state" means status chip visibility, not the favorite control; confirmed by D-01/D-02 |
| CARD-03 | Meal cards do not repeat breakfast/lunch/dinner labels when surrounding layout already communicates meal type | MealPlanGrid row-header rail already shows meal-type labels; card's `meal.meal_type` rendering in top-left (`<p>`) must be conditionally suppressed |
| CARD-04 | Clicking a meal card opens the flyout, removing the separate `View details` action | plan-page.tsx handleViewDetails exists and just needs to be wired to card `onClick` rather than button callback |
| CARD-05 | Destructive meal actions use compact icon treatment without reducing clarity or accessibility | Icon + aria-label + tooltip pattern; MealDeleteConfirmation survives trigger change |

</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Compact card rendering (payload, layout, icons) | Frontend component (`MealCard.tsx`) | — | Self-contained presentational component; no backend data change |
| Click-to-flyout wiring | Frontend component (`MealCard.tsx` + `plan-page.tsx`) | — | Card emits an event; route wires it to flyout state |
| Icon button click isolation (stop propagation) | Frontend component (`MealCard.tsx`) | — | Prevents icon clicks from also triggering the card-level flyout open |
| Meal-type label suppression | Frontend component (`MealCard.tsx`) | `MealPlanGrid.tsx` (context prop) | Grid knows its own row-label context; passes `showMealTypeLabel` prop to card |
| Flyout star/favorite affordance | Frontend component (`MealDetailFlyout.tsx`) | — | Absorbs favorite controls moved off card; no new backend |
| Delete confirmation flow | Frontend component (`MealCard.tsx` + `MealDeleteConfirmation.tsx`) | — | Trigger changes from text button to icon; confirmation component unchanged |
| Tooltip rendering | Frontend component (`MealCard.tsx`) | — | Native `title` attribute or custom tooltip div; no library needed |
| Regression test coverage | Test files (3 existing + new) | — | Tests must update assertions and add new compact-card cases |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.0 | Component rendering | Project runtime [VERIFIED: package.json] |
| Tailwind CSS | 3.4.18 | Utility styling | Project design system [VERIFIED: package.json] |
| Vitest | 3.2.4 | Unit/component testing | Project test runner [VERIFIED: package.json] |
| @testing-library/react | 16.3.2 | Component test rendering | Project test pattern [VERIFIED: package.json] |
| @testing-library/jest-dom | 6.9.1 | DOM matchers | Project test setup [VERIFIED: package.json] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React DOM `useState` | (built-in) | Delete confirmation toggle state | Already used in MealCard for `isConfirmingDelete` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline SVG icon buttons | Lucide React or Heroicons | No icon library is in the project; UI-SPEC says "app-local inline SVG icon buttons" — do not add a library |
| Native `title` tooltip | Custom tooltip div | `title` attribute is sufficient for Phase 9; custom tooltip div only needed if pointer-only access is a concern (Phase 9 decision: agent's discretion) |
| New `CompactMealCard` component | Refactor existing `MealCard.tsx` | CONTEXT.md code insight explicitly says "refactor one shared card component instead of branching" |

**No new npm packages required for this phase.** [VERIFIED: package.json + UI-SPEC]

---

## Architecture Patterns

### System Architecture Diagram

```
User interaction
       │
       ▼
  ┌─────────────────────────────────────────────┐
  │  MealCard (compact)                          │
  │  ┌─────────────────────────────────────────┐│
  │  │ Card wrapper — onClick → opens flyout   ││
  │  │  ┌────────────┐  ┌───────────────────┐  ││
  │  │  │ Title +    │  │ [Regen] [Delete]  │  ││
  │  │  │ Status chip│  │  icon buttons     │  ││
  │  │  │            │  │ (stopPropagation) │  ││
  │  │  └────────────┘  └───────────────────┘  ││
  │  │                                         ││
  │  │  [Delete pressed]                       ││
  │  │       │                                 ││
  │  │       ▼                                 ││
  │  │  MealDeleteConfirmation overlay         ││
  │  │  (keep / confirm delete)               ││
  │  └─────────────────────────────────────────┘│
  └─────────────────────────────────────────────┘
       │ onClick                  │ onRegenerate / onDelete
       ▼                          ▼
  plan-page.tsx             plan-page.tsx
  handleViewDetails         handleDelete / handleRegenerate
       │
       ▼
  MealDetailFlyout (opens)
  ┌───────────────────────────┐
  │ Meal title + day/type     │
  │ Summary text              │
  │ Recipe content (enriched) │
  │ Rationale                 │
  │ [★ Favorite star button]  │  ← NEW in Phase 9
  │ [Regenerate] [Delete]     │
  └───────────────────────────┘
```

### Recommended Project Structure

No new directories or files required. Phase 9 modifies existing files only:

```
src/
├── components/generation/
│   ├── MealCard.tsx                    ← primary refactor target
│   ├── MealDeleteConfirmation.tsx      ← minimal change (trigger type only)
│   ├── MealDetailFlyout.tsx            ← add star/favorite affordance
│   ├── MealPlanGrid.tsx                ← pass showMealTypeLabel prop
│   ├── generation-components.test.tsx  ← update card rendering assertions
│   ├── meal-plan-management.test.tsx   ← update delete trigger assertions
│   └── meal-detail-flyout.test.tsx     ← update focus-trap sequence + add star test
└── routes/
    ├── plan-page.tsx                   ← wire card onClick to flyout open
    └── plan-page.test.tsx              ← add card-click-opens-flyout test
```

### Pattern 1: Clickable Card Wrapper with Icon Propagation Guard

**What:** The card `<article>` becomes a full-surface clickable element via `onClick`. Icon buttons inside it call `event.stopPropagation()` before their own handler so they don't also trigger the card-level flyout open.

**When to use:** Any time a card must be clickable as a unit while containing smaller interactive controls.

**Example:**
```tsx
// Source: established React event model [ASSUMED - standard React pattern]
<article
  role="button"
  tabIndex={0}
  onClick={() => onCardClick?.()}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCardClick?.(); }}
  className="... cursor-pointer"
>
  <h3>{meal.title}</h3>
  <button
    type="button"
    aria-label="Delete meal"
    title="Delete meal"
    onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(true); }}
  >
    {/* SVG icon */}
  </button>
</article>
```

**Important:** Using `<article role="button">` makes the card semantically a button. An alternative is a full-width transparent `<button>` covering the card behind the content, with `z-index` separation. Either approach is valid; the propagation guard is the same either way. The propagation guard approach is simpler and does not require `z-index` layering.

### Pattern 2: Conditional Meal-Type Label via Prop

**What:** `MealPlanGrid` passes a `showMealTypeLabel` prop to `MealCard`. In the desktop grid, the row-header rail already labels the meal type, so `showMealTypeLabel={false}` suppresses the label inside the card. In mobile layout, `MealPlanGrid` shows meal-type labels in the stacked section header above the card — also justifying suppression inside the card itself.

**When to use:** When a card is always embedded in a layout that already provides its type context.

**Example:**
```tsx
// MealPlanGrid.tsx — both desktop and mobile already render the label externally
<MealCard
  slot={slot}
  showMealTypeLabel={false}   // suppress the top-left label inside the card
  onCardClick={...}
  ...
/>
```

### Pattern 3: Return Focus After Card-Click Flyout Open

**What:** The current `handleViewDetails` receives a `HTMLButtonElement` trigger for focus return. With Phase 9, the card itself becomes the trigger. The card element needs a `ref` or the `currentTarget` of the click event must be passed to `handleViewDetails`.

**When to use:** Preserving keyboard accessibility on flyout open/close cycle.

**Example:**
```tsx
// plan-page.tsx
function handleViewDetails(slotKey: string, trigger: HTMLElement) {
  setSelectedSlotKey(slotKey);
  setFlyoutTrigger(trigger as HTMLButtonElement); // type broadening needed
}

// MealCard.tsx
<article
  onClick={(e) => onCardClick?.(e.currentTarget)}
  ...
>
```

The `MealDetailFlyout` `returnFocusTo` prop is typed as `HTMLElement | null` — already flexible enough. The `flyoutTrigger` state in `plan-page.tsx` is typed as `HTMLButtonElement | null` — may need to relax to `HTMLElement | null`.

### Pattern 4: Inline SVG Icon Buttons (No Library)

**What:** UI-SPEC mandates "app-local inline SVG icon buttons." Use simple SVG paths for the delete (trash) and regenerate (arrows-rotate or refresh) icons inlined directly in JSX. Size consistently at 20px × 20px or 18px × 18px.

**When to use:** All icon-only actions in Phase 9.

**Example:**
```tsx
// Delete icon — SVG inline [ASSUMED - standard icon pattern; exact path is agent's discretion]
<button
  type="button"
  aria-label="Delete meal"
  title="Delete meal"
  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#803b26]"
  onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(true); }}
>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
</button>
```

Minimum hit-target per UI-SPEC: `44px`. The icon is visually small (18–20px) but the button wrapper expands the hit area.

### Pattern 5: Star Affordance in MealDetailFlyout

**What:** The flyout absorbs the favorite control as a star button. The `favoriteState` prop already flows into `MealDetailFlyout`. Phase 9 adds a star icon button alongside or in place of the current text-based "Save to favorites" button — or the planner may choose to keep the text button and add the icon as a supplement. Decision is agent's discretion.

**When to use:** Flyout actions section for enriched meals with `favoriteState === "ready"` or `"saved"`.

### Anti-Patterns to Avoid

- **Nested interactive elements:** Do not place a `<button>` inside another `<button>`. If the card wrapper is a `<button>`, then the icon buttons inside it are invalid HTML. Use `<div role="button">` or an absolutely-positioned transparent button approach. The recommended approach is a non-button wrapper with `role="button"` + `tabIndex={0}` + keyboard handler, containing real `<button>` children.
- **Hover-only icon visibility:** D-16 requires the delete icon visible at all times. Do not use `group-hover:opacity-100` or `invisible group-hover:visible` patterns.
- **Removing aria-label from icon buttons:** Icon-only buttons without `aria-label` fail WCAG 2.1 SC 4.1.2. Every icon button must have `aria-label`.
- **Creating a second dense-card component:** D-21 requires one shared compact card system. Do not create `CompactMealCard.tsx` as a separate file.
- **Adding the meal-type label back to the card:** Even in focused/mobile contexts, `MealPlanGrid` shows the label externally. The card should not re-add it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Focus trap in flyout | Custom focus trap | Existing `MealDetailFlyout` focus trap code | Already implemented and tested in `meal-detail-flyout.test.tsx` |
| Delete confirmation state | New confirmation component | Existing `MealDeleteConfirmation` | Already isolated with its own props contract |
| Tooltip | Tooltip library | Native `title` attribute (agent's discretion for custom) | UI-SPEC says no component library; `title` works for Phase 9 scope |
| Icon library | Lucide/Heroicons install | Inline SVG | UI-SPEC explicitly specifies "app-local inline SVG icon buttons" |

**Key insight:** This phase is a subtraction and rewiring exercise. Almost everything needed already exists; the risk is building new abstractions instead of simplifying existing ones.

---

## Common Pitfalls

### Pitfall 1: Nested Button HTML Validity

**What goes wrong:** Wrapping the entire card in `<article onClick=...>` without role is fine. But if the developer wraps it in `<button>` to get keyboard behavior for free, then the `<button>` children (regenerate, delete icons) are invalid HTML (`<button>` inside `<button>`).

**Why it happens:** Natural shortcut to avoid writing `onKeyDown` for Enter/Space on the wrapper.

**How to avoid:** Use `<article role="button" tabIndex={0} onKeyDown={...}>` pattern, not `<article>` wrapped by a `<button>`. Or use the transparent-overlay-button pattern (full-width button behind content, icons on top with higher z-index).

**Warning signs:** Browser console HTML validation warnings; screen readers treating nested button as unexpected.

### Pitfall 2: Click Propagation Leaks to Flyout

**What goes wrong:** Pressing the delete or regenerate icon fires both the icon handler and the card-level `onClick`, opening the flyout simultaneously with the delete confirmation.

**Why it happens:** Forgetting `event.stopPropagation()` on icon button click handlers.

**How to avoid:** Every icon button's `onClick` must call `e.stopPropagation()` before its own logic.

**Warning signs:** Flyout opens when icon is clicked; test `fireEvent.click(deleteIcon)` also triggers `onCardClick`.

### Pitfall 3: Focus Return Breakage After Card-Click Flyout Open

**What goes wrong:** Closing the flyout does not return focus to the card because the card element is not a standard `HTMLButtonElement` and `flyoutTrigger` is typed to `HTMLButtonElement | null`.

**Why it happens:** `handleViewDetails` in `plan-page.tsx` currently accepts `HTMLButtonElement` from the old "View details" button. Changing the trigger source to the card wrapper (likely a `<div>` or `<article>`) requires broadening the type.

**How to avoid:** Change `flyoutTrigger` state type to `HTMLElement | null`. `returnFocusTo.focus()` works on any focusable `HTMLElement`. Make the card wrapper element focusable (`tabIndex={0}`) so it can receive focus.

**Warning signs:** Flyout closes but focus goes to `<body>` instead of back to the card; existing focus-return tests fail.

### Pitfall 4: Test Assertion Drift

**What goes wrong:** Existing tests that query by text (`"Delete meal"` button, `"dinner"` label in card body, `"Salmon, rice..."` description text) will fail after Phase 9 removes those elements.

**Why it happens:** Three test files contain assertions against the current over-detailed card surface.

**How to avoid:** Update these assertions in the same wave that refactors the component. Do not leave tests that assert on removed DOM elements. Tests to update:
- `generation-components.test.tsx` line 138: `expect(screen.getByText("dinner"))` — card no longer renders meal type in body
- `generation-components.test.tsx` line 140: `expect(screen.getByText("Salmon, rice..."))` — description removed from card
- `meal-plan-management.test.tsx` line 44: `screen.getByRole("button", { name: "Delete meal" })` — now an icon button with `aria-label`
- `meal-detail-flyout.test.tsx` lines 60-64: focus trap sequence changes when flyout button order changes (if star button is added before regenerate/delete)

**Warning signs:** Test suite red after component changes; failing tests mentioning removed text content.

### Pitfall 5: Favorite State Prop Becomes Orphaned on MealCard

**What goes wrong:** `MealCard` currently accepts `favoriteState`, `favoriteHelperText`, `onSaveFavorite`, `onOpenFavorites` props. Phase 9 removes favorite from the card surface. If these props remain in the type signature but are unused, future callers will still pass them and the data flow stays wired unnecessarily. If they are removed, all call sites in `MealPlanGrid.tsx` and `plan-page.tsx` must be cleaned up.

**How to avoid:** Remove the favorite-related props from `MealCard`'s type definition. Clean up all call sites. Favorite state continues to flow only to `MealDetailFlyout` (already wired in `plan-page.tsx`).

**Warning signs:** Unused prop lint warnings; favorite data still passing into card but going nowhere.

---

## Code Examples

### Current vs. Target MealCard prop interface

**Current (before Phase 9):**
```tsx
// Source: src/components/generation/MealCard.tsx [VERIFIED: codebase]
type MealCardProps = {
  slot: Extract<MealPlanSlot, { state: "filled" }>;
  errorMessage?: string | null;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  isEnriching?: boolean;
  isDeleting?: boolean;
  isFinalized?: boolean;
  favoriteState?: "disabled" | "ready" | "saved";   // REMOVE in Phase 9
  favoriteHelperText?: string | null;                // REMOVE in Phase 9
  onDelete: () => void;
  onRegenerate: () => void;
  onRetryEnrichment?: () => void;
  onToggleSelection?: () => void;
  onViewDetails?: (trigger: HTMLButtonElement) => void;  // REPLACE with onCardClick
  onSaveFavorite?: () => void;                       // REMOVE in Phase 9
  onOpenFavorites?: (trigger: HTMLButtonElement) => void;  // REMOVE in Phase 9
};
```

**Target (after Phase 9):**
```tsx
// [ASSUMED - exact names are agent's discretion]
type MealCardProps = {
  slot: Extract<MealPlanSlot, { state: "filled" }>;
  errorMessage?: string | null;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  isEnriching?: boolean;
  isDeleting?: boolean;
  isFinalized?: boolean;
  showMealTypeLabel?: boolean;           // NEW - suppresses meal_type label in card
  onDelete: () => void;
  onRegenerate: () => void;
  onRetryEnrichment?: () => void;
  onToggleSelection?: () => void;
  onCardClick?: (trigger: HTMLElement) => void;  // REPLACES onViewDetails
};
```

### Delete Confirmation Flow After Icon Trigger

The `MealDeleteConfirmation` component API does not change. Only the thing that calls `setIsConfirmingDelete(true)` changes from a text button to an icon button:

```tsx
// Source: src/components/generation/MealCard.tsx [VERIFIED: codebase]
// Current trigger:
<button type="button" onClick={() => setIsConfirmingDelete(true)}>Delete meal</button>

// Phase 9 trigger (icon version):
<button
  type="button"
  aria-label="Delete meal"
  title="Delete meal"
  onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(true); }}
>
  {/* trash SVG */}
</button>
```

### Existing Delete Confirmation Component (unchanged)

```tsx
// Source: src/components/generation/MealDeleteConfirmation.tsx [VERIFIED: codebase]
// Props: isDeleting, onCancel, onConfirm
// Renders: "Remove this meal from the plan?" + "Keep meal" + "Confirm delete" buttons
// UI-SPEC copywriting contract updates this text to:
//   "Delete meal: Remove this meal from the plan? You can regenerate this slot again afterward."
// Keep the MealDeleteConfirmation component structure; update its copy string.
```

### MealPlanGrid call site (showMealTypeLabel)

```tsx
// Source: src/components/generation/MealPlanGrid.tsx [VERIFIED: codebase]
// Both mobile and desktop layouts already render the meal-type label externally.
// Mobile: <p className="text-xs uppercase...">{mealTypeLabels[mealType]}</p> above each card
// Desktop: <p key={`${mealType}-label`}>...</p> in the left rail
// Therefore showMealTypeLabel={false} is correct for ALL card renders in MealPlanGrid.
<MealCard
  slot={slot}
  showMealTypeLabel={false}
  onCardClick={(trigger) => onViewDetails?.(slot.slotKey, trigger)}
  ...
/>
```

### Flyout open wiring change in plan-page.tsx

```tsx
// Source: src/routes/plan-page.tsx [VERIFIED: codebase]
// Current: handleViewDetails(slotKey: string, trigger: HTMLButtonElement)
// Phase 9: broaden trigger type to HTMLElement
function handleViewDetails(slotKey: string, trigger: HTMLElement) {
  setSelectedSlotKey(slotKey);
  setFlyoutTrigger(trigger as HTMLButtonElement); // or change state type
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Text buttons for all card actions | Icon buttons with aria-label + tooltip | Phase 9 | Compact card footprint; requires test assertion updates |
| `onViewDetails` callback from explicit button | `onCardClick` from full card surface | Phase 9 | Removes "View details" affordance; card IS the entry point |
| Favorite controls inline in card | Favorite star in flyout only | Phase 9 | Simplifies card; favorite state prop removed from MealCard |
| Meal-type label rendered by card | Meal-type label suppressed by card (shown by grid) | Phase 9 | Prevents label duplication |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `<article role="button" tabIndex={0}>` is the correct pattern for clickable card wrapper | Architecture Patterns, Pitfall 1 | If browser/AT compatibility requires a different approach, the propagation guard pattern still applies |
| A2 | Native `title` attribute is sufficient for Phase 9 tooltip requirement | Don't Hand-Roll | If tooltip needs to work on touch/mobile, custom tooltip div may be required instead |
| A3 | Removing favorite props from MealCard will not break any other consumer outside MealPlanGrid | Pitfall 5 | If another component imports MealCard directly with favorite props, it would fail TypeScript compilation — caught at build time |
| A4 | The `flyoutTrigger` state in plan-page.tsx can be broadened to `HTMLElement | null` without breaking MealDetailFlyout | Code Examples | MealDetailFlyout.returnFocusTo is already typed as `HTMLElement | null` [VERIFIED: codebase] — safe |

---

## Open Questions

1. **Confirmation text update scope**
   - What we know: UI-SPEC copywriting contract specifies new text for `MealDeleteConfirmation`
   - What's unclear: Whether the planner should update `MealDeleteConfirmation.tsx` copy in Phase 9 or leave it to Phase 10 UI polish
   - Recommendation: Update it in Phase 9 since the component is already being touched

2. **Selection mode treatment on compact card**
   - What we know: `isSelectionMode` and `isSelected` props currently render a "Select" toggle button in the card
   - What's unclear: D-10 says "keep only delete and regenerate as direct actions" — does selection mode affordance survive Phase 9?
   - Recommendation: Keep the selection toggle since selection mode is a different UX mode from normal browsing, and the decision docs don't explicitly remove it. The planner should confirm this interpretation.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 9 has no external dependencies. All work is component-level React/TypeScript with existing test tooling.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/components/generation/` |
| Full suite command | `npx vitest run` |

Test suite baseline: **155 tests, 22 test files, all passing** [VERIFIED: live run 2026-04-23]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CARD-01 | Card renders in both dense grid and focused contexts | unit | `npx vitest run src/components/generation/meal-plan-management.test.tsx` | ✅ exists (needs update) |
| CARD-02 | Dense card shows title, status, primary actions; no description | unit | `npx vitest run src/components/generation/generation-components.test.tsx` | ✅ exists (needs update) |
| CARD-03 | Card does not render meal-type label when grid already shows it | unit | `npx vitest run src/components/generation/generation-components.test.tsx` | ✅ exists (needs update) |
| CARD-04 | Clicking card opens flyout; no separate View details button | unit | `npx vitest run src/routes/plan-page.test.tsx` | ✅ exists (needs new test) |
| CARD-05 | Delete uses icon + aria-label + tooltip; confirmation flow survives | unit | `npx vitest run src/components/generation/meal-plan-management.test.tsx` | ✅ exists (needs update) |

### Sampling Rate

- **Per task commit:** `npx vitest run src/components/generation/ src/routes/plan-page.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green (155+ tests) before `/gsd-verify-work`

### Wave 0 Gaps

No new test files need to be created from scratch. All required test infrastructure exists. Wave 0 updates are in-file assertion changes to existing tests:

- `src/components/generation/generation-components.test.tsx`
  - Remove assertion for `screen.getByText("dinner")` in card body (meal type no longer in card)
  - Remove assertion for `screen.getByText("Salmon, rice, cucumbers, and yogurt sauce.")` (description removed from card)
  - Add assertion that compact card renders title and status chip
  - Add assertion that card has no "View details" button
- `src/components/generation/meal-plan-management.test.tsx`
  - Update `screen.getByRole("button", { name: "Delete meal" })` — icon button still has `aria-label="Delete meal"` so this assertion may survive unchanged
  - Add test: clicking anywhere on card (not icon) fires `onCardClick`
  - Add test: clicking delete icon does NOT fire `onCardClick`
- `src/components/generation/meal-detail-flyout.test.tsx`
  - Update focus trap test if star button is added (new focusable element changes Tab sequence)
  - Add test for star/favorite affordance in flyout
- `src/routes/plan-page.test.tsx`
  - Add test: card `onClick` triggers flyout open (currently only `onViewDetails` button click was tested)

*(Note: `aria-label="Delete meal"` on the icon button means existing test `screen.getByRole("button", { name: "Delete meal" })` may continue to work without text-selector changes — the label is the same, just now on an icon button)*

---

## Security Domain

Phase 9 is a pure presentational refactor — no authentication, session management, data validation, cryptography, or API changes. ASVS categories V2, V3, V4, V6 do not apply. V5 (input validation) does not apply (no form input in this phase).

The only security-adjacent concern is WCAG accessibility (not ASVS): icon-only buttons must have `aria-label` to remain accessible. This is covered in the component patterns above.

---

## Sources

### Primary (HIGH confidence)
- `src/components/generation/MealCard.tsx` — current component implementation [VERIFIED: codebase read]
- `src/components/generation/MealPlanGrid.tsx` — grid context and label rendering [VERIFIED: codebase read]
- `src/components/generation/MealDetailFlyout.tsx` — flyout props, focus trap, favorite wiring [VERIFIED: codebase read]
- `src/routes/plan-page.tsx` — handleViewDetails, flyoutTrigger state, favorite state flow [VERIFIED: codebase read]
- `src/components/generation/MealDeleteConfirmation.tsx` — isolated confirmation component [VERIFIED: codebase read]
- `src/components/generation/generation-components.test.tsx` — existing assertions on card text [VERIFIED: codebase read]
- `src/components/generation/meal-plan-management.test.tsx` — delete flow assertions [VERIFIED: codebase read]
- `src/components/generation/meal-detail-flyout.test.tsx` — focus trap test sequence [VERIFIED: codebase read]
- `src/routes/plan-page.test.tsx` — route-level flyout wiring tests [VERIFIED: codebase read]
- `package.json` — React 19.2, Tailwind 3.4, Vitest 3.2, testing-library 16.3 [VERIFIED: codebase read]
- `vitest.config.ts` — jsdom environment, setupFiles [VERIFIED: codebase read]
- `tailwind.config.ts`, `src/styles/globals.css` — design tokens [VERIFIED: codebase read]
- `.planning/phases/09-compact-meal-card-refactor/09-CONTEXT.md` — locked decisions [VERIFIED]
- `.planning/phases/09-compact-meal-card-refactor/09-UI-SPEC.md` — design system contract [VERIFIED]
- Live Vitest run — 155 tests passing baseline [VERIFIED: 2026-04-23]

### Secondary (MEDIUM confidence)
- WCAG 2.1 SC 4.1.2 — icon buttons require accessible name (aria-label) [CITED: standard]

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified from package.json and live test run
- Architecture: HIGH — all component code read and cross-referenced with CONTEXT.md decisions
- Pitfalls: HIGH — identified directly from reading current code and test assertions
- Test gaps: HIGH — baseline verified by live test run

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (stable framework stack)
