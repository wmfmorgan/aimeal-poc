# Phase 8: Layout Width & Shell Polish - Pattern Map

**Mapped:** 2026-04-23
**Files analyzed:** 11
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/layout/AppFrame.tsx` | component | request-response | `src/app/layout/AppFrame.tsx` | exact |
| `src/routes/plan-page.tsx` | route | request-response | `src/routes/plan-page.tsx` | exact |
| `src/components/generation/MealPlanGrid.tsx` | component | transform | `src/components/generation/MealPlanGrid.tsx` | exact |
| `src/components/generation/PlanFinalizationCard.tsx` | component | request-response | `src/components/generation/PlanFinalizationCard.tsx` | exact |
| `src/components/generation/GenerationForm.tsx` | component | request-response | `src/components/generation/GenerationForm.tsx` | exact |
| `src/routes/home-page.tsx` | route | request-response | `src/routes/home-page.tsx` | exact |
| `src/routes/household-page.tsx` | route | CRUD | `src/routes/household-page.tsx` | exact |
| `src/routes/dev-page.tsx` | route | request-response | `src/routes/dev-page.tsx` | exact |
| `src/routes/auth-page.tsx` | route | request-response | `src/routes/auth-page.tsx` | exact |
| `src/components/generation/FavoritesPanel.tsx` | component | event-driven | `src/components/generation/ShoppingListPanel.tsx` | role-match |
| `src/components/generation/MealDetailFlyout.tsx` | component | event-driven | `src/components/generation/FavoritesPanel.tsx` | role-match |

## Pattern Assignments

### `src/app/layout/AppFrame.tsx` (component, request-response)

**Why this file is in Phase 8:** D-01 through D-03 and the UI contract both name `AppFrame` as the primary shell-width refactor point.

**Analog:** `src/app/layout/AppFrame.tsx`

**Imports + shell dependencies** ([src/app/layout/AppFrame.tsx](/Users/jabroni/Projects/aimeal-poc/src/app/layout/AppFrame.tsx:1))
```tsx
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "@/lib/auth/auth-state";
import { AUTH_COPY } from "@/lib/auth/auth-copy";
import { useLatestMealPlan } from "@/hooks/use-meal-plan";
```

**Outer shell width + chrome pattern** ([src/app/layout/AppFrame.tsx](/Users/jabroni/Projects/aimeal-poc/src/app/layout/AppFrame.tsx:40))
```tsx
return (
  <div className="min-h-screen bg-transparent px-5 py-6 text-[var(--color-ink)] md:px-10 md:py-8">
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col rounded-[2rem] bg-[rgba(255,255,255,0.52)] p-4 shadow-[var(--shadow-soft)] backdrop-blur md:p-8">
      <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
```

**Header hierarchy to preserve while tightening** ([src/app/layout/AppFrame.tsx](/Users/jabroni/Projects/aimeal-poc/src/app/layout/AppFrame.tsx:44))
```tsx
<div className="max-w-2xl space-y-4">
  <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-muted)]">
    PlanPlate
  </p>
  <div className="space-y-3">
    <h1 className="font-display text-5xl leading-none text-[var(--color-sage-deep)] md:text-7xl">
      Build the meal plan before you polish the recipes.
    </h1>
```

### `src/routes/plan-page.tsx` (route, request-response)

**Why this file is in Phase 8:** D-04 through D-12 make persisted `/plan/:id` the main beneficiary of reclaimed width.

**Analog:** `src/routes/plan-page.tsx`

**Composed page stack pattern** ([src/routes/plan-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/plan-page.tsx:245))
```tsx
return (
  <div className="space-y-8">
    <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
```

**Compact header + secondary action pattern** ([src/routes/plan-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/plan-page.tsx:252))
```tsx
<div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
  <h2 className="font-display text-2xl font-semibold leading-snug text-[var(--color-sage-deep)]">
    {plan.title}
  </h2>
  <button
    type="button"
    onClick={() => navigate("/plan/new")}
    className="shrink-0 rounded-full bg-[var(--color-sage)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 min-h-[44px]"
  >
    Create new plan
  </button>
</div>
```

**Section ordering that Phase 8 should preserve** ([src/routes/plan-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/plan-page.tsx:270))
```tsx
<PlanFinalizationCard ... />

{!isFinalized ? (
  isSelectionMode ? <SelectionActionBar ... /> : <div className="flex justify-end">...</div>
) : null}

<section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
  <MealPlanGrid ... />
</section>
```

### `src/components/generation/MealPlanGrid.tsx` (component, transform)

**Why this file is in Phase 8:** D-07 through D-09 and the UI contract explicitly call for adaptive density by day count.

**Analog:** `src/components/generation/MealPlanGrid.tsx`

**Grid data shaping pattern** ([src/components/generation/MealPlanGrid.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealPlanGrid.tsx:60))
```tsx
const days = DAYS_OF_WEEK.slice(0, Math.max(0, Math.min(numDays, DAYS_OF_WEEK.length)));
const activeMealTypes = MEAL_TYPES.filter((mealType) => mealTypes.includes(mealType));
```

**Mobile stack pattern to preserve** ([src/components/generation/MealPlanGrid.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealPlanGrid.tsx:165))
```tsx
<div className="space-y-6 md:hidden" data-testid="meal-plan-grid-mobile">
  {days.map((day) => (
    <section key={day} className="space-y-4" aria-label={`${day} meals`}>
```

**Desktop matrix pattern to adjust, not replace** ([src/components/generation/MealPlanGrid.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealPlanGrid.tsx:185))
```tsx
<div
  className="hidden gap-4 md:grid"
  data-testid="meal-plan-grid-desktop"
  style={{ gridTemplateColumns: `minmax(6rem, auto) repeat(${days.length}, minmax(0, 1fr))` }}
>
```

### `src/components/generation/PlanFinalizationCard.tsx` (component, request-response)

**Why this file is in Phase 8:** D-05 and D-06 say this surface can be rebalanced, but must remain subordinate to the grid.

**Analog:** `src/components/generation/PlanFinalizationCard.tsx`

**Card shell + split layout pattern** ([src/components/generation/PlanFinalizationCard.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/PlanFinalizationCard.tsx:28))
```tsx
<section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
  <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
    Finalize your plan
  </p>
  <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
```

**Copy block width cap pattern** ([src/components/generation/PlanFinalizationCard.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/PlanFinalizationCard.tsx:34))
```tsx
<div className="max-w-2xl">
  <h3 className="font-display text-3xl leading-tight text-[var(--color-sage-deep)]">
```

**Action stack pattern** ([src/components/generation/PlanFinalizationCard.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/PlanFinalizationCard.tsx:67))
```tsx
<div className="flex flex-col gap-3">
  <button className="min-h-[44px] rounded-full bg-[#4A6741] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
  ...
  <button className="min-h-[44px] rounded-full border border-[rgba(74,103,65,0.16)] bg-white/72 px-5 py-3 text-sm font-semibold text-[var(--color-sage-deep)] shadow-[var(--shadow-soft)]">
```

### `src/components/generation/GenerationForm.tsx` (component, request-response)

**Why this file is in Phase 8:** The UI contract explicitly says `/plan/new` should inherit the wider shell and tighter rhythm from the persisted plan page. `PlanPage` reuses this form.

**Analog:** `src/components/generation/GenerationForm.tsx`

**Primary form surface pattern** ([src/components/generation/GenerationForm.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/GenerationForm.tsx:71))
```tsx
<section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
  <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
  <h2 className="mt-3 font-display text-4xl leading-tight text-[var(--color-sage-deep)]">
  <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-muted)]">
```

**Stack rhythm pattern** ([src/components/generation/GenerationForm.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/GenerationForm.tsx:83))
```tsx
<form onSubmit={handleSubmit} className="mt-8 space-y-8">
```

### `src/routes/home-page.tsx` (route, request-response)

**Why this file is in Phase 8:** D-13 through D-15 include the home route in the shell-wide spacing cleanup.

**Analog:** `src/routes/home-page.tsx`

**Editorial split layout pattern** ([src/routes/home-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/home-page.tsx:13))
```tsx
<section className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
```

**Narrative column measure pattern** ([src/routes/home-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/home-page.tsx:20))
```tsx
<h2 className="font-display text-4xl leading-tight text-[var(--color-sage-deep)] md:text-5xl">
...
<p className="max-w-2xl text-base leading-8 text-[var(--color-muted)]">
```

**Supporting rail card pattern** ([src/routes/home-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/home-page.tsx:54))
```tsx
<aside className="flex flex-col gap-5 rounded-[1.75rem] bg-[rgba(255,255,255,0.78)] p-6">
```

### `src/routes/household-page.tsx` (route, CRUD)

**Why this file is in Phase 8:** The UI contract calls for a tighter long-form layout with reduced oversized margins.

**Analog:** `src/routes/household-page.tsx`

**Hero + support rail pattern** ([src/routes/household-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/household-page.tsx:262))
```tsx
<form onSubmit={handleSave} className="space-y-8" noValidate>
  <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.9fr)]">
```

**Primary route intro shell** ([src/routes/household-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/household-page.tsx:264))
```tsx
<div className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
  <h2 className="mt-3 font-display text-4xl leading-tight text-[var(--color-sage-deep)] md:text-5xl">
```

**Reusable form-section shell** ([src/routes/household-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/household-page.tsx:291))
```tsx
<section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-6 py-6 shadow-[var(--shadow-soft)] backdrop-blur-sm md:px-8 md:py-8">
```

### `src/routes/dev-page.tsx` (route, request-response)

**Why this file is in Phase 8:** The UI contract says dev content should fill the wider shell without losing per-card framing.

**Analog:** `src/routes/dev-page.tsx`

**Vertical section stack pattern** ([src/routes/dev-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/dev-page.tsx:17))
```tsx
<div className="space-y-8">
  <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
```

**Metric grid pattern** ([src/routes/dev-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/dev-page.tsx:106))
```tsx
<div className="mt-6 grid gap-4 md:grid-cols-4">
```

**Sub-card framing pattern** ([src/routes/dev-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/dev-page.tsx:107))
```tsx
<div className="rounded-[1.25rem] border border-[rgba(74,103,65,0.12)] bg-white/60 px-5 py-4">
```

### `src/routes/auth-page.tsx` (route, request-response)

**Why this file is in Phase 8:** The UI contract keeps `/auth` focused and capped at `32rem`, but wants less wasted perimeter around it.

**Analog:** `src/routes/auth-page.tsx`

**Centered single-surface composition** ([src/routes/auth-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/auth-page.tsx:323))
```tsx
<div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8">
  <div className="w-full max-w-[32rem] rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
```

**Compact heading block pattern** ([src/routes/auth-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/auth-page.tsx:329))
```tsx
<div className="mb-6 space-y-3">
  <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
  <h2 className="font-display text-[20px] font-semibold leading-snug text-[var(--color-sage-deep)]">
```

### `src/components/generation/FavoritesPanel.tsx` (component, event-driven)

**Why this file is in Phase 8:** UI contract says preserve the current width model and make sure widened plan pages still feel visually aligned with overlays.

**Analog:** `src/components/generation/ShoppingListPanel.tsx`

**Right-side overlay frame to preserve** ([src/components/generation/ShoppingListPanel.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/ShoppingListPanel.tsx:101))
```tsx
<div className="fixed inset-0 z-40">
  <button className="absolute inset-0 bg-[rgba(33,42,35,0.28)]" />
  <div
    className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-[rgba(255,252,245,0.96)] px-6 py-6 shadow-[-24px_0_48px_rgba(33,42,35,0.18)] backdrop-blur md:px-8"
  >
```

**Favorites’ own content shell pattern** ([src/components/generation/FavoritesPanel.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/FavoritesPanel.tsx:108))
```tsx
<div className="flex items-start justify-between gap-4">
...
{favorites.length === 0 ? (
  <section className="mt-8 rounded-[1.5rem] bg-white/72 p-6">
) : (
  <div className="mt-8 space-y-4">
```

### `src/components/generation/MealDetailFlyout.tsx` (component, event-driven)

**Why this file is in Phase 8:** D-16 preserves the right-side flyout as the canonical detail pattern, so the layout pass must accommodate it without redesigning it.

**Analog:** `src/components/generation/FavoritesPanel.tsx`

**Overlay shell parity pattern** ([src/components/generation/MealDetailFlyout.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealDetailFlyout.tsx:123))
```tsx
<div className="fixed inset-0 z-40">
  <button
    type="button"
    aria-label="Close meal details"
    className="absolute inset-0 bg-[rgba(33,42,35,0.28)]"
  />
  <div
    className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-[rgba(255,252,245,0.96)] px-6 py-6 shadow-[-24px_0_48px_rgba(33,42,35,0.18)] backdrop-blur md:px-8"
  >
```

**Internal content-card rhythm to leave intact** ([src/components/generation/MealDetailFlyout.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealDetailFlyout.tsx:173))
```tsx
<section className="mt-8 rounded-[1.5rem] bg-white/72 p-6">
...
<section className="mt-5 rounded-[1.5rem] bg-white/72 p-6">
```

## Shared Patterns

### Route Coverage
**Source:** [src/app/router.tsx](/Users/jabroni/Projects/aimeal-poc/src/app/router.tsx:12)
**Apply to:** Confirm the shell-wide width pass reaches `/`, `/auth`, `/household`, `/plan/:id`, and `/dev`. `/plan/new` is handled inside `PlanPage` rather than via a separate route file.
```tsx
const router = createBrowserRouter([
  {
    path: "/",
    element: <AppFrame />,
    children: [
      { index: true, element: <ProtectedRoute><HomePage /></ProtectedRoute> },
      { path: "auth", element: <AuthRoute><AuthPage /></AuthRoute> },
      { path: "household", element: <ProtectedRoute><HouseholdPage /></ProtectedRoute> },
      { path: "plan/:id", element: <ProtectedRoute><PlanPage /></ProtectedRoute> },
      { path: "dev", element: <DevPage /> },
    ],
  },
]);
```

### Editorial Surface Shell
**Source:** [src/routes/household-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/household-page.tsx:291), [src/routes/plan-page.tsx](/Users/jabroni/Projects/aimeal-poc/src/routes/plan-page.tsx:315), [src/components/generation/GenerationForm.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/GenerationForm.tsx:71)
**Apply to:** All route-level cards and major plan sections when tightening spacing or widening containers.
```tsx
<section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-6 py-6 shadow-[var(--shadow-soft)] backdrop-blur-sm md:px-8 md:py-8">
```

### Sticky Plan Action Bar
**Source:** [src/components/generation/SelectionActionBar.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/SelectionActionBar.tsx:15)
**Apply to:** Any Phase 8 plan-page tightening that affects action-bar spacing above the grid.
```tsx
<div className="sticky top-4 z-10 rounded-[1.5rem] border border-[rgba(74,103,65,0.14)] bg-white/88 px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur">
```

### Right-Side Overlay Panels
**Source:** [src/components/generation/FavoritesPanel.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/FavoritesPanel.tsx:91), [src/components/generation/MealDetailFlyout.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/MealDetailFlyout.tsx:124), [src/components/generation/ShoppingListPanel.tsx](/Users/jabroni/Projects/aimeal-poc/src/components/generation/ShoppingListPanel.tsx:102)
**Apply to:** Keep overlay width, blur, and right-anchored behavior visually consistent while widening the underlying plan workspace.
```tsx
<div className="fixed inset-0 z-40">
  <div className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-[rgba(255,252,245,0.96)] px-6 py-6 shadow-[-24px_0_48px_rgba(33,42,35,0.18)] backdrop-blur md:px-8">
```

## No Analog Found

None. Phase 8 is a refactor/polish pass over established route and shell surfaces rather than a new UI pattern introduction.

## Metadata

**Analog search scope:** `src/app`, `src/routes`, `src/components/generation`
**Files scanned:** 34
**Pattern extraction date:** 2026-04-23
