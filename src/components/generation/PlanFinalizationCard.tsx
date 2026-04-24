import type { PersistedMealPlan } from "@/lib/generation/types";

type PlanFinalizationCardProps = {
  plan: PersistedMealPlan;
  enrichedCount: number;
  draftCount: number;
  isFinalizing?: boolean;
  finalizeError?: string | null;
  onFinalize: (trigger: HTMLButtonElement) => void;
  onViewShoppingList: (trigger: HTMLButtonElement) => void;
  onOpenFavorites: (trigger: HTMLButtonElement) => void;
};

export function PlanFinalizationCard({
  plan,
  enrichedCount,
  draftCount,
  isFinalizing = false,
  finalizeError = null,
  onFinalize,
  onViewShoppingList,
  onOpenFavorites,
}: PlanFinalizationCardProps) {
  const isFinalized = plan.generation_status === "finalized";
  const hasShoppingList = Array.isArray(plan.shopping_list) && plan.shopping_list.length > 0;
  const finalizeDisabled = enrichedCount === 0 || isFinalizing;

  return (
    <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-6 py-6 shadow-[var(--shadow-soft)] backdrop-blur-sm md:px-7 md:py-6">
      <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
        Finalize your plan
      </p>
      <div className="mt-3 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-[40rem]">
          <h3 className="font-display text-3xl leading-tight text-[var(--color-sage-deep)]">
            {isFinalized ? "Your shopping list is ready." : "Finalize turns your enriched meals into a clean shopping list and locks this plan for cooking."}
          </h3>
          <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
            {isFinalized
              ? "This finalized plan keeps your enriched recipes in place and retires draft-only editing."
              : "Draft meals will be removed from this finalized plan. Only enriched meals will be kept."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5 text-sm font-semibold text-[var(--color-sage-deep)]">
            <span className="rounded-full bg-[rgba(74,103,65,0.1)] px-4 py-2">
              {enrichedCount} enriched recipes
            </span>
            <span className="rounded-full bg-[rgba(128,59,38,0.08)] px-4 py-2 text-[#803b26]">
              {draftCount} draft meals
            </span>
            {isFinalized ? (
              <span className="rounded-full bg-[rgba(74,103,65,0.16)] px-4 py-2">
                Finalized
              </span>
            ) : null}
          </div>
          {finalizeError ? (
            <p className="mt-4 rounded-[1.25rem] bg-[rgba(128,59,38,0.08)] px-4 py-3 text-sm text-[#803b26]" role="alert">
              {finalizeError}
            </p>
          ) : null}
          {!isFinalized && finalizeDisabled ? (
            <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
              Enrich meals before finalizing so your shopping list has at least one recipe to keep.
            </p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[14rem]">
          {isFinalized ? (
            <button
              type="button"
              onClick={(event) => onViewShoppingList(event.currentTarget)}
              className="min-h-[44px] rounded-full bg-[#4A6741] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              View shopping list
            </button>
          ) : (
            <button
              type="button"
              onClick={(event) => onFinalize(event.currentTarget)}
              disabled={finalizeDisabled}
              className="min-h-[44px] rounded-full bg-[#4A6741] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isFinalizing ? "Finalizing…" : "Finalize plan"}
            </button>
          )}
          <button
            type="button"
            onClick={(event) => onOpenFavorites(event.currentTarget)}
            className="min-h-[44px] rounded-full border border-[rgba(74,103,65,0.16)] bg-white/72 px-5 py-3 text-sm font-semibold text-[var(--color-sage-deep)] shadow-[var(--shadow-soft)]"
          >
            Open favorites
          </button>
          {hasShoppingList && !isFinalized ? (
            <button
              type="button"
              onClick={(event) => onViewShoppingList(event.currentTarget)}
              className="min-h-[44px] px-2 text-sm text-[var(--color-sage-deep)] hover:underline"
            >
              View shopping list
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
