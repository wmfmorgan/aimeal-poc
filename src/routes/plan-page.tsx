import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { FavoritesPanel } from "@/components/generation/FavoritesPanel";
import { FinalizePlanConfirmation } from "@/components/generation/FinalizePlanConfirmation";
import { GenerationForm } from "@/components/generation/GenerationForm";
import { MealDetailFlyout } from "@/components/generation/MealDetailFlyout";
import { MealPlanGrid } from "@/components/generation/MealPlanGrid";
import { PlanFinalizationCard } from "@/components/generation/PlanFinalizationCard";
import { PlanReadyBanner } from "@/components/generation/PlanReadyBanner";
import { SelectionActionBar } from "@/components/generation/SelectionActionBar";
import { ShoppingListPanel } from "@/components/generation/ShoppingListPanel";
import { StreamErrorBanner } from "@/components/generation/StreamErrorBanner";
import { useGenerationStream } from "@/hooks/use-generation-stream";
import { useMealEnrichment } from "@/hooks/use-meal-enrichment";
import { useMealPlan } from "@/hooks/use-meal-plan";
import { getFavoriteDisabledReason } from "@/lib/generation/favorites";
import { buildMealPlanSlots } from "@/lib/generation/plan-slots";
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
    refetchPlan,
    deleteMeal,
    regenerateMeal,
    finalizePlan,
    saveFavorite,
    favoritesLibrary,
    slotMutationStateByKey = {},
  } = mealPlanState;
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [flyoutTrigger, setFlyoutTrigger] = useState<HTMLElement | null>(null);
  const [overlayReturnFocusTo, setOverlayReturnFocusTo] = useState<HTMLElement | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isFinalizeConfirmationOpen, setIsFinalizeConfirmationOpen] = useState(false);
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [finalizeUiError, setFinalizeUiError] = useState<string | null>(null);
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

  useEffect(() => {
    if (plan?.generation_status === "finalized") {
      setIsSelectionMode(false);
    }
  }, [plan?.generation_status]);

  if (isLoading) {
    return (
      <div className="space-y-6 md:space-y-8">
        <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-6 py-6 shadow-[var(--shadow-soft)] backdrop-blur-sm md:px-7 md:py-6">
          <p className="text-sm text-[var(--color-muted)]">Loading your meal plan…</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 md:space-y-8">
        <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-6 py-6 shadow-[var(--shadow-soft)] backdrop-blur-sm md:px-7 md:py-6">
          <p className="text-sm text-[#803b26]" role="alert">
            We couldn't load this meal plan. Please try again in a moment.
          </p>
        </section>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-6 md:space-y-8">
        <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-6 py-6 shadow-[var(--shadow-soft)] backdrop-blur-sm md:px-7 md:py-6">
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

  function handleViewDetails(slotKey: string, trigger: HTMLElement) {
    setSelectedSlotKey(slotKey);
    setFlyoutTrigger(trigger);
  }

  function setOverlayTrigger(trigger: HTMLElement | null) {
    setOverlayReturnFocusTo(trigger);
  }

  async function handleFinalizePlan() {
    setOverlayTrigger(
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    );
    setFinalizeUiError(null);

    const latestPlan = (await refetchPlan()).data ?? plan;
    const latestEnrichedCount =
      latestPlan?.meals.filter((meal) => meal.status === "enriched").length ?? 0;

    if (latestEnrichedCount === 0) {
      setFinalizeUiError("Enrich at least one meal before finalizing.");
      return;
    }

    try {
      await finalizePlan.mutateAsync({ mealPlanId: id });
      setIsFinalizeConfirmationOpen(false);
      setIsShoppingListOpen(true);
    } catch {
      // Mutation state already carries the user-facing error.
    }
  }

  async function handleSaveFavorite(mealId: string) {
    try {
      await saveFavorite.mutateAsync({ mealId });
    } catch {
      // Mutation state already carries the user-facing error.
    }
  }

  const selectedSlot = selectedSlotKey ? managedSlots[selectedSlotKey] : null;
  const visibleFilledMealIds = Object.values(managedSlots)
    .filter((slot): slot is Extract<MealPlanSlot, { state: "filled" }> => slot.state === "filled")
    .map((slot) => slot.meal.id);
  const isFinalized = plan.generation_status === "finalized";
  const enrichedCount = plan.meals.filter((meal) => meal.status === "enriched").length;
  const draftCount = plan.meals.filter((meal) => meal.status !== "enriched").length;
  const favoriteStateByMealId = Object.fromEntries(
    plan.meals.map((meal) => {
      const favoriteState = meal.is_favorite
        ? "saved"
        : meal.status === "enriched" && meal.spoonacular_recipe_id
          ? "ready"
          : "disabled";

      return [meal.id, favoriteState];
    })
  ) as Record<string, "disabled" | "ready" | "saved">;
  const favoriteHelperTextByMealId = Object.fromEntries(
    plan.meals.map((meal) => [meal.id, getFavoriteDisabledReason(meal)])
  ) as Record<string, string | null>;

  return (
    <div className="space-y-6 md:space-y-8 xl:space-y-7">
      {/* Plan header card */}
      <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-6 py-6 shadow-[var(--shadow-soft)] backdrop-blur-sm md:px-7 md:py-6">
        <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
          Your Meal Plan
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="max-w-[40rem] font-display text-2xl font-semibold leading-snug text-[var(--color-sage-deep)] md:text-[2rem]">
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
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)] md:leading-7">
          {plan.numDays} days · {plan.mealTypes.join(", ")}
        </p>
      </section>

      <PlanFinalizationCard
        plan={plan}
        enrichedCount={enrichedCount}
        draftCount={draftCount}
        isFinalizing={finalizePlan.isPending}
        finalizeError={finalizeUiError ?? finalizePlan.error?.message ?? null}
        onFinalize={(trigger) => {
          setOverlayTrigger(trigger);
          setFinalizeUiError(null);
          setIsFinalizeConfirmationOpen(true);
        }}
        onViewShoppingList={(trigger) => {
          setOverlayTrigger(trigger);
          setIsShoppingListOpen(true);
        }}
        onOpenFavorites={(trigger) => {
          setOverlayTrigger(trigger);
          setIsFavoritesOpen(true);
        }}
      />

      {!isFinalized ? (
        isSelectionMode ? (
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
        )
      ) : null}

      {/* Meal plan grid */}
      <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-4 py-5 shadow-[var(--shadow-soft)] backdrop-blur-sm md:px-5 md:py-5 xl:px-6 xl:py-6">
        <MealPlanGrid
          numDays={plan.numDays}
          mealTypes={plan.mealTypes}
          slots={managedSlots}
          isSelectionMode={!isFinalized && isSelectionMode}
          isFinalized={isFinalized}
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
        isFinalized={isFinalized}
        favoriteState={
          selectedSlot?.state === "filled"
            ? favoriteStateByMealId[selectedSlot.meal.id] ?? "disabled"
            : "disabled"
        }
        favoriteHelperText={
          selectedSlot?.state === "filled"
            ? favoriteHelperTextByMealId[selectedSlot.meal.id] ?? null
            : null
        }
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
        onSaveFavorite={() => {
          if (selectedSlot?.state === "filled") {
            void handleSaveFavorite(selectedSlot.meal.id);
          }
        }}
        onOpenFavorites={(trigger) => {
          setOverlayTrigger(trigger);
          setIsFavoritesOpen(true);
        }}
      />
      <FinalizePlanConfirmation
        isOpen={isFinalizeConfirmationOpen}
        returnFocusTo={overlayReturnFocusTo}
        isSubmitting={finalizePlan.isPending}
        canConfirm={enrichedCount > 0}
        onClose={() => {
          setFinalizeUiError(null);
          setIsFinalizeConfirmationOpen(false);
        }}
        onConfirm={() => {
          void handleFinalizePlan();
        }}
      />
      <ShoppingListPanel
        groups={plan.shopping_list ?? []}
        isOpen={isShoppingListOpen}
        returnFocusTo={overlayReturnFocusTo}
        onClose={() => setIsShoppingListOpen(false)}
      />
      <FavoritesPanel
        favorites={favoritesLibrary}
        isOpen={isFavoritesOpen}
        returnFocusTo={overlayReturnFocusTo}
        onClose={() => setIsFavoritesOpen(false)}
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
    <div className="space-y-6 md:space-y-8 xl:space-y-7">
      {showForm && (
        <GenerationForm onStartGeneration={handleStartGeneration} streamState={state} />
      )}

      {showGrid && (
        <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-5 py-5 shadow-[var(--shadow-soft)] backdrop-blur-sm md:px-6 md:py-6">
          <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
            Your Meal Plan
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold leading-snug text-[var(--color-sage-deep)]">
            {state === "streaming" ? "Generating your meals…" : "Your meals"}
          </h2>
          <div className="mt-5 md:mt-6">
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
