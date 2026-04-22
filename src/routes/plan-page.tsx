import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { GenerationForm } from "@/components/generation/GenerationForm";
import { MealDetailFlyout } from "@/components/generation/MealDetailFlyout";
import { MealPlanGrid } from "@/components/generation/MealPlanGrid";
import { PlanReadyBanner } from "@/components/generation/PlanReadyBanner";
import { SelectionActionBar } from "@/components/generation/SelectionActionBar";
import { StreamErrorBanner } from "@/components/generation/StreamErrorBanner";
import { useGenerationStream } from "@/hooks/use-generation-stream";
import { useMealEnrichment } from "@/hooks/use-meal-enrichment";
import { useMealPlan } from "@/hooks/use-meal-plan";
import { buildMealPlanSlotKey, buildMealPlanSlots } from "@/lib/generation/plan-slots";
import type { DayOfWeek, MealPlanSlot, MealType, PersistedMeal } from "@/lib/generation/types";

type FormParams = {
  numDays: number;
  mealTypes: string[];
};

// ---------------------------------------------------------------------------
// Persisted plan management mode
// ---------------------------------------------------------------------------

function PersistedPlanView({ id }: { id: string }) {
  const navigate = useNavigate();
  const mealPlanState = useMealPlan(id);
  const {
    plan,
    isLoading,
    error,
    deleteMeal,
    regenerateMeal,
    slotMutationStateByKey = {},
  } = mealPlanState;
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [flyoutTrigger, setFlyoutTrigger] = useState<HTMLButtonElement | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const mealEnrichment = useMealEnrichment(id);
  const slots = plan ? buildMealPlanSlots(plan) : {};
  const managedSlots: Record<string, MealPlanSlot> = {};

  for (const [slotKey, slot] of Object.entries(slots)) {
    const mutationState = slotMutationStateByKey[slotKey];

    if (!mutationState) {
      managedSlots[slotKey] = slot;
      continue;
    }

    const previous = slot.state === "filled" ? slot.meal : null;

    if (mutationState.isRegenerating) {
      managedSlots[slotKey] = {
        state: "regenerating",
        slotKey,
        day_of_week: slot.day_of_week,
        meal_type: slot.meal_type,
        previous,
      };
      continue;
    }

    if (mutationState.error) {
      managedSlots[slotKey] = {
        state: "error",
        slotKey,
        day_of_week: slot.day_of_week,
        meal_type: slot.meal_type,
        message: mutationState.error,
        previous,
      };
      continue;
    }

    managedSlots[slotKey] = slot;
  }

  useEffect(() => {
    if (!selectedSlotKey) {
      return;
    }

    if (managedSlots[selectedSlotKey]?.state !== "filled") {
      setSelectedSlotKey(null);
    }
  }, [managedSlots, selectedSlotKey]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
          <p className="text-sm text-[var(--color-muted)]">Loading your meal plan…</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
          <p className="text-sm text-[#803b26]" role="alert">
            We couldn't load this meal plan. Please try again in a moment.
          </p>
        </section>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-8">
        <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
          <p className="text-sm text-[var(--color-muted)]">
            This plan could not be found.
          </p>
        </section>
      </div>
    );
  }

  function getSlot(slotKey: string): MealPlanSlot | undefined {
    return managedSlots[slotKey];
  }

  function getPersistedMeal(slotKey: string): PersistedMeal | null {
    const slot = getSlot(slotKey);
    return slot?.state === "filled" ? slot.meal : null;
  }

  function parseSlotKey(slotKey: string): { dayOfWeek: DayOfWeek; mealType: MealType } {
    const [dayOfWeek, mealType] = slotKey.split(":");
    return {
      dayOfWeek: dayOfWeek as DayOfWeek,
      mealType: mealType as MealType,
    };
  }

  function handleDelete(slotKey: string) {
    const meal = getPersistedMeal(slotKey);
    if (!meal || !deleteMeal) {
      return;
    }

    deleteMeal.mutate({ mealId: meal.id });
  }

  function handleRegenerate(slotKey: string) {
    if (!regenerateMeal) {
      return;
    }

    const { dayOfWeek, mealType } = parseSlotKey(slotKey);
    regenerateMeal.mutate({
      mealPlanId: id,
      dayOfWeek,
      mealType,
    });
  }

  function handleViewDetails(slotKey: string, trigger: HTMLButtonElement) {
    setSelectedSlotKey(slotKey);
    setFlyoutTrigger(trigger);
  }

  const selectedSlot = selectedSlotKey ? managedSlots[selectedSlotKey] : null;
  const visibleFilledMealIds = Object.values(managedSlots)
    .filter((slot): slot is Extract<MealPlanSlot, { state: "filled" }> => slot.state === "filled")
    .map((slot) => slot.meal.id);

  return (
    <div className="space-y-8">
      {/* Plan header card */}
      <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
          Your Meal Plan
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="font-display text-2xl font-semibold leading-snug text-[var(--color-sage-deep)]">
            {plan.title}
          </h2>
          {/* D-03: Create new plan action — intentionally secondary to the current grid */}
          <button
            type="button"
            onClick={() => navigate("/plan/new")}
            className="shrink-0 rounded-full bg-[var(--color-sage)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 min-h-[44px]"
          >
            Create new plan
          </button>
        </div>
        <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
          {plan.numDays} days · {plan.mealTypes.join(", ")}
        </p>
      </section>

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
          <button
            type="button"
            onClick={() => setIsSelectionMode(true)}
            className="min-h-[44px] rounded-full border border-[rgba(74,103,65,0.16)] bg-white/72 px-5 py-2.5 text-sm font-semibold text-[var(--color-sage-deep)] shadow-[var(--shadow-soft)]"
          >
            Select meals
          </button>
        </div>
      )}

      {/* Meal plan grid */}
      <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
        <MealPlanGrid
          numDays={plan.numDays}
          mealTypes={plan.mealTypes}
          slots={managedSlots}
          isSelectionMode={isSelectionMode}
          selectedMealIds={mealEnrichment.selectedMealIds}
          pendingMealIds={mealEnrichment.pendingByMealId}
          enrichmentErrorsByMealId={mealEnrichment.errorByMealId}
          onDelete={handleDelete}
          onRegenerate={handleRegenerate}
          onRetryEnrichment={(mealId) => {
            void mealEnrichment.retryMeal(mealId);
          }}
          onToggleSelectMeal={mealEnrichment.toggleMealSelection}
          onViewDetails={handleViewDetails}
        />
      </section>
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
        onRegenerate={() => {
          if (selectedSlotKey) {
            handleRegenerate(selectedSlotKey);
          }
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generation mode (id === "new")
// ---------------------------------------------------------------------------

function GenerationView() {
  const { slots, state, error, startGeneration, reset } = useGenerationStream();
  const [formParams, setFormParams] = useState<FormParams | null>(null);

  const showForm = state === "idle";
  const showGrid = state === "streaming" || state === "complete" || state === "error";

  function handleStartGeneration(params: {
    householdId: string;
    mealPlanId: string;
    numDays: number;
    mealTypes: string[];
  }) {
    setFormParams({ numDays: params.numDays, mealTypes: params.mealTypes });
    void startGeneration(params);
  }

  return (
    <div className="space-y-8">
      {showForm && (
        <GenerationForm onStartGeneration={handleStartGeneration} streamState={state} />
      )}

      {showGrid && (
        <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
            Your Meal Plan
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold leading-snug text-[var(--color-sage-deep)]">
            {state === "streaming" ? "Generating your meals…" : "Your meals"}
          </h2>
          <div className="mt-6">
            <MealPlanGrid
              numDays={formParams?.numDays ?? 7}
              mealTypes={formParams?.mealTypes ?? ["breakfast", "lunch", "dinner"]}
              slots={slots}
            />
          </div>
        </section>
      )}

      {state === "complete" && <PlanReadyBanner />}
      {state === "error" && <StreamErrorBanner message={error} onRetry={reset} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route orchestrator — branches on id === "new"
// ---------------------------------------------------------------------------

export function PlanPage() {
  const { id } = useParams<{ id: string }>();

  // T-05-05: treat id === "new" as the only generation path; pass all other
  // ids through the validated mealPlan.get procedure.
  if (id !== "new") {
    return <PersistedPlanView id={id ?? ""} />;
  }

  return <GenerationView />;
}
