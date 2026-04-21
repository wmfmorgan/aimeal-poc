import { useState } from "react";
import { useParams } from "react-router-dom";

import { GenerationForm } from "@/components/generation/GenerationForm";
import { MealPlanGrid } from "@/components/generation/MealPlanGrid";
import { PlanReadyBanner } from "@/components/generation/PlanReadyBanner";
import { StreamErrorBanner } from "@/components/generation/StreamErrorBanner";
import { useGenerationStream } from "@/hooks/use-generation-stream";

type FormParams = {
  numDays: number;
  mealTypes: string[];
};

export function PlanPage() {
  const { id } = useParams<{ id: string }>();
  const { slots, state, error, startGeneration, reset } = useGenerationStream();
  const [formParams, setFormParams] = useState<FormParams | null>(null);

  const showForm = id === "new" || state === "idle";
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
