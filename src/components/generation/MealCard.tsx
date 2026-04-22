import { useState } from "react";

import { MealDeleteConfirmation } from "@/components/generation/MealDeleteConfirmation";
import { type MealPlanSlot } from "@/lib/generation/types";

type MealCardProps = {
  slot: Extract<MealPlanSlot, { state: "filled" }>;
  errorMessage?: string | null;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  isEnriching?: boolean;
  isDeleting?: boolean;
  onDelete: () => void;
  onRegenerate: () => void;
  onRetryEnrichment?: () => void;
  onToggleSelection?: () => void;
  onViewDetails?: (trigger: HTMLButtonElement) => void;
};

export function MealCard({
  slot,
  errorMessage,
  isSelectionMode = false,
  isSelected = false,
  isEnriching = false,
  isDeleting = false,
  onDelete,
  onRegenerate,
  onRetryEnrichment,
  onToggleSelection,
  onViewDetails,
}: MealCardProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const { meal } = slot;
  const statusLabel = isEnriching ? "Enriching" : meal.status === "enriched" ? "Enriched" : "Draft";

  return (
    <article
      className={`rounded-[1.5rem] bg-white/70 p-6 transition-colors ${isSelected ? "ring-2 ring-[rgba(74,103,65,0.35)]" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
          {meal.meal_type}
        </p>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[rgba(74,103,65,0.12)] px-3 py-1 text-xs font-semibold text-[var(--color-sage-deep)]">
            {statusLabel}
          </span>
          {isSelectionMode ? (
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={onToggleSelection}
              className="min-h-[36px] rounded-full border border-[rgba(74,103,65,0.2)] px-3 py-1 text-xs text-[var(--color-sage-deep)]"
            >
              {isSelected ? "Selected" : "Select"}
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-2 font-display text-xl leading-snug text-[var(--color-sage-deep)]">
        {meal.title}
      </p>
      <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
        {meal.short_description}
      </p>
      {errorMessage ? (
        <p className="mt-4 rounded-xl bg-[rgba(128,59,38,0.08)] px-4 py-3 text-sm text-[#803b26]" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {isConfirmingDelete ? (
        <MealDeleteConfirmation
          isDeleting={isDeleting}
          onCancel={() => setIsConfirmingDelete(false)}
          onConfirm={onDelete}
        />
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={(event) => onViewDetails?.(event.currentTarget)}
            className="min-h-[44px] px-2 text-sm text-[var(--color-sage-deep)] hover:underline"
          >
            View details
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            className="min-h-[44px] rounded-xl bg-[#4A6741] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Regenerate meal
          </button>
          {errorMessage ? (
            <button
              type="button"
              onClick={onRetryEnrichment}
              className="min-h-[44px] rounded-xl bg-[rgba(128,59,38,0.08)] px-4 py-2 text-sm font-semibold text-[#803b26]"
            >
              Retry enrichment
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            className="min-h-[44px] px-2 text-sm text-[#803b26] hover:underline"
          >
            Delete meal
          </button>
        </div>
      )}
    </article>
  );
}
