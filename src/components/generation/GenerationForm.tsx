import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { useHousehold } from "@/hooks/use-household";
import { trpcClient } from "@/lib/trpc/client";
import {
  GENERATION_COPY,
  MEAL_TYPE_PRESETS,
  type MealType,
  type StreamState,
} from "@/lib/generation/types";

type GenerationFormProps = {
  onStartGeneration: (params: {
    householdId: string;
    mealPlanId: string;
    numDays: number;
    mealTypes: string[];
  }) => void;
  streamState: StreamState;
};

function arraysEqual(current: string[], next: readonly string[]): boolean {
  return current.length === next.length && current.every((value, index) => value === next[index]);
}

export function GenerationForm({ onStartGeneration, streamState }: GenerationFormProps) {
  const navigate = useNavigate();
  const { household } = useHousehold();
  const [mealTypes, setMealTypes] = useState<MealType[]>(["breakfast", "lunch", "dinner"]);
  const [numDays, setNumDays] = useState(7);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createPlan = useMutation({
    mutationFn: (input: { householdId: string; numDays: number; mealTypes: MealType[] }) =>
      trpcClient.mutation("mealPlan.create", input) as Promise<{ id: string }>,
  });

  const isSubmitting = streamState === "streaming" || createPlan.isPending;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!household?.id) {
      setSubmitError("Create your household first so generation has the right constraints.");
      return;
    }

    setSubmitError(null);

    try {
      const { id } = await createPlan.mutateAsync({
        householdId: household.id,
        numDays,
        mealTypes,
      });

      onStartGeneration({
        householdId: household.id,
        mealPlanId: id,
        numDays,
        mealTypes,
      });
      navigate(`/plan/${id}`, { replace: true });
    } catch {
      setSubmitError(GENERATION_COPY.submitError);
    }
  }

  return (
    <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
      <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
        {GENERATION_COPY.eyebrow}
      </p>
      <h2 className="mt-3 font-display text-4xl leading-tight text-[var(--color-sage-deep)]">
        {GENERATION_COPY.heading}
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-muted)]">
        {GENERATION_COPY.body}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
            {GENERATION_COPY.mealTypesLabel}
          </p>
          <div className="mt-3 flex flex-col gap-2 rounded-xl bg-[rgba(74,103,65,0.06)] p-1 md:flex-row">
            {MEAL_TYPE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setMealTypes([...preset.mealTypes])}
                className={[
                  "min-h-[44px] flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                  arraysEqual(mealTypes, preset.mealTypes)
                    ? "bg-[#4A6741] text-white shadow-sm"
                    : "text-[var(--color-sage-deep)] hover:bg-white/60",
                ].join(" ")}
                disabled={isSubmitting}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
            {GENERATION_COPY.numDaysLabel}
          </p>
          <div className="mt-3 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setNumDays((current) => Math.max(1, current - 1))}
              disabled={numDays <= 1 || isSubmitting}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(74,103,65,0.25)] text-[var(--color-sage-deep)] transition-opacity hover:border-[#4A6741] disabled:opacity-40"
              aria-label="Decrease days"
            >
              -
            </button>
            <span className="min-w-[2ch] text-center font-semibold text-[var(--color-ink)]">
              {numDays}
            </span>
            <button
              type="button"
              onClick={() => setNumDays((current) => Math.min(14, current + 1))}
              disabled={numDays >= 14 || isSubmitting}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(74,103,65,0.25)] text-[var(--color-sage-deep)] transition-opacity hover:border-[#4A6741] disabled:opacity-40"
              aria-label="Increase days"
            >
              +
            </button>
          </div>
        </div>

        {submitError && (
          <p className="rounded-xl bg-[rgba(128,59,38,0.08)] px-4 py-3 text-sm text-[#803b26]" role="alert">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-[44px] rounded-xl bg-[#4A6741] px-6 py-3 text-sm font-semibold tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {GENERATION_COPY.submitCta}
        </button>
      </form>
    </section>
  );
}
