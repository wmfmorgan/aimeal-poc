import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { GenerationForm } from "@/components/generation/GenerationForm";
import { MealPlanGrid } from "@/components/generation/MealPlanGrid";
import { PlanReadyBanner } from "@/components/generation/PlanReadyBanner";
import { StreamErrorBanner } from "@/components/generation/StreamErrorBanner";
import { useGenerationStream } from "@/hooks/use-generation-stream";
import { useMealPlan } from "@/hooks/use-meal-plan";
import { buildMealPlanSlots } from "@/lib/generation/plan-slots";
import type { MealSlot } from "@/lib/generation/types";

type FormParams = {
  numDays: number;
  mealTypes: string[];
};

// ---------------------------------------------------------------------------
// Persisted plan management mode
// ---------------------------------------------------------------------------

function PersistedPlanView({ id }: { id: string }) {
  const navigate = useNavigate();
  const { plan, isLoading, error } = useMealPlan(id);

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

  const slots = buildMealPlanSlots(plan);

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

      {/* Meal plan grid */}
      <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
        <MealPlanGrid
          numDays={plan.numDays}
          mealTypes={plan.mealTypes}
          slots={slots as unknown as Record<string, MealSlot>}
        />
      </section>
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
