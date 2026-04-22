import type { DayOfWeek, MealType } from "@/lib/generation/types";

type EmptyMealSlotProps = {
  dayOfWeek: DayOfWeek;
  mealType: MealType;
  errorMessage?: string | null;
  onRegenerate: () => void;
};

export function EmptyMealSlot({
  dayOfWeek,
  mealType,
  errorMessage,
  onRegenerate,
}: EmptyMealSlotProps) {
  return (
    <article className="rounded-[1.5rem] bg-[rgba(255,255,255,0.58)] p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">{mealType}</p>
      <p className="mt-2 font-display text-xl leading-snug text-[var(--color-sage-deep)]">
        Open slot
      </p>
      <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
        This meal was removed. Regenerate this slot to replace it.
      </p>
      <p className="mt-3 text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
        {dayOfWeek}
      </p>
      {errorMessage ? (
        <p className="mt-4 rounded-xl bg-[rgba(128,59,38,0.08)] px-4 py-3 text-sm text-[#803b26]" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onRegenerate}
        className="mt-5 min-h-[44px] rounded-xl bg-[#4A6741] px-6 py-3 text-sm font-semibold tracking-wide text-white transition-opacity hover:opacity-90"
      >
        Regenerate meal
      </button>
    </article>
  );
}
