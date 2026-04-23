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
  isFinalized?: boolean;
  showMealTypeLabel?: boolean;
  onDelete: () => void;
  onRegenerate: () => void;
  onRetryEnrichment?: () => void;
  onToggleSelection?: () => void;
  onCardClick?: (trigger: HTMLElement) => void;
};

export function MealCard({
  slot,
  errorMessage,
  isSelectionMode = false,
  isSelected = false,
  isEnriching = false,
  isDeleting = false,
  isFinalized = false,
  showMealTypeLabel = true,
  onDelete,
  onRegenerate,
  onRetryEnrichment,
  onToggleSelection,
  onCardClick,
}: MealCardProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const { meal } = slot;
  const statusLabel = isEnriching ? "Enriching" : meal.status === "enriched" ? "Enriched" : "Draft";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={(e) => onCardClick?.(e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCardClick?.(e.currentTarget);
        }
      }}
      className={`rounded-[1.5rem] bg-white/70 p-4 transition-colors cursor-pointer hover:bg-white/85 ${
        isSelected ? "ring-2 ring-[rgba(74,103,65,0.35)]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {showMealTypeLabel !== false ? (
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
            {meal.meal_type}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[rgba(74,103,65,0.12)] px-3 py-1 text-xs font-semibold text-[var(--color-sage-deep)]">
            {statusLabel}
          </span>
          {isSelectionMode ? (
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={(e) => { e.stopPropagation(); onToggleSelection?.(); }}
              className="min-h-[36px] rounded-full border border-[rgba(74,103,65,0.2)] px-3 py-1 text-xs text-[var(--color-sage-deep)]"
            >
              {isSelected ? "Selected" : "Select"}
            </button>
          ) : null}
          {!isFinalized ? (
            <button
              type="button"
              aria-label="Delete meal"
              title="Delete meal"
              onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(true); }}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#803b26]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-2 font-display text-xl leading-snug text-[var(--color-sage-deep)]">
        {meal.title}
      </p>
      {errorMessage ? (
        <p className="mt-4 rounded-xl bg-[rgba(128,59,38,0.08)] px-4 py-3 text-sm text-[#803b26]" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {isConfirmingDelete ? (
        <div onClick={(e) => e.stopPropagation()}>
          <MealDeleteConfirmation
            isDeleting={isDeleting}
            onCancel={() => setIsConfirmingDelete(false)}
            onConfirm={onDelete}
          />
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          {!isFinalized ? (
            <button
              type="button"
              aria-label="Regenerate meal"
              title="Regenerate meal"
              onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--color-sage-deep)]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </button>
          ) : null}
          {errorMessage && !isFinalized ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRetryEnrichment?.(); }}
              className="min-h-[44px] rounded-xl bg-[rgba(128,59,38,0.08)] px-4 py-2 text-sm font-semibold text-[#803b26]"
            >
              Retry enrichment
            </button>
          ) : null}
        </div>
      )}
    </article>
  );
}
