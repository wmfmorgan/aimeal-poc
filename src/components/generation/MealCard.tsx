import { type MealSlot } from "@/lib/generation/types";

type MealCardProps = {
  meal: MealSlot;
};

export function MealCard({ meal }: MealCardProps) {
  return (
    <article className="rounded-[1.5rem] bg-white/70 p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
        {meal.meal_type}
      </p>
      <p className="mt-2 font-display text-xl leading-snug text-[var(--color-sage-deep)]">
        {meal.title}
      </p>
      <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
        {meal.short_description}
      </p>
    </article>
  );
}
