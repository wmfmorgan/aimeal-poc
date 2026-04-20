import { useParams } from "react-router-dom";

export function PlanPage() {
  const { id } = useParams();

  return (
    <section className="max-w-3xl space-y-4 rounded-[1.75rem] bg-white/72 p-8">
      <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">Plan surface</p>
      <h2 className="font-display text-4xl text-[var(--color-sage-deep)]">Plan placeholder</h2>
      <p className="text-sm leading-7 text-[var(--color-muted)]">
        Phase 4 and Phase 5 will populate the meal plan shell with streaming draft generation and
        grid management. This placeholder keeps the future route contract live today.
      </p>
      <p className="text-sm font-semibold text-[var(--color-sage-deep)]">Current route id: {id}</p>
    </section>
  );
}
