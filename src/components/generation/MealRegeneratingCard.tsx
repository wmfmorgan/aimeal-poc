import type { PersistedMeal } from "@/lib/generation/types";

type MealRegeneratingCardProps = {
  mealType: string;
  previous?: PersistedMeal | null;
};

export function MealRegeneratingCard({ mealType, previous }: MealRegeneratingCardProps) {
  return (
    <article className="rounded-[1.5rem] bg-white/70 p-6">
      <div className="opacity-60">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">{mealType}</p>
        <p className="mt-2 font-display text-xl leading-snug text-[var(--color-sage-deep)]">
          {previous?.title ?? "Refreshing this slot"}
        </p>
        <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
          {previous?.short_description ?? "We’re replacing this slot with a new meal suggestion."}
        </p>
      </div>
      <p className="mt-5 inline-flex rounded-full bg-[rgba(74,103,65,0.12)] px-3 py-1 text-sm font-medium text-[var(--color-sage-deep)] animate-pulse">
        Regenerating meal...
      </p>
    </article>
  );
}
