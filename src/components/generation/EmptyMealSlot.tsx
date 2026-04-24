import type { DayOfWeek, MealType } from "@/lib/generation/types";

type EmptyMealSlotProps = {
  dayOfWeek: DayOfWeek;
  mealType: MealType;
  errorMessage?: string | null;
  onRegenerate: () => void;
};

export function EmptyMealSlot({
  errorMessage,
  onRegenerate,
}: EmptyMealSlotProps) {
  return (
    <article className="flex min-h-[4.5rem] items-center justify-between gap-3 rounded-[1.25rem] border border-dashed border-[rgba(74,103,65,0.25)] bg-white/30 px-4 py-3">
      <span className="text-sm text-[var(--color-muted)]">Open slot</span>
      <div className="flex shrink-0 items-center gap-1">
        {errorMessage ? (
          <span className="text-xs text-[#803b26]" role="alert">{errorMessage}</span>
        ) : null}
        <button
          type="button"
          aria-label="Regenerate meal"
          onClick={onRegenerate}
          className="flex min-h-[44px] w-11 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-[rgba(74,103,65,0.08)] hover:text-[var(--color-sage-deep)]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </button>
      </div>
    </article>
  );
}
