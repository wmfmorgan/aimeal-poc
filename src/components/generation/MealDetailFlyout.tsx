import { useEffect, useId, useRef } from "react";

import type { MealPlanSlot } from "@/lib/generation/types";

type MealDetailFlyoutProps = {
  isOpen: boolean;
  returnFocusTo?: HTMLElement | null;
  slot: Extract<MealPlanSlot, { state: "filled" }> | null;
  isFinalized?: boolean;
  favoriteState?: "disabled" | "ready" | "saved";
  favoriteHelperText?: string | null;
  onClose: () => void;
  onDelete: () => void;
  onRegenerate: () => void;
  onSaveFavorite?: () => void;
  onOpenFavorites?: (trigger: HTMLButtonElement) => void;
};

const FOCUSABLE_SELECTOR = [
  "button",
  "[href]",
  "input",
  "select",
  "textarea",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function MealDetailFlyout({
  isOpen,
  returnFocusTo = null,
  slot,
  isFinalized = false,
  favoriteState = "disabled",
  favoriteHelperText = null,
  onClose,
  onDelete,
  onRegenerate,
  onSaveFavorite,
  onOpenFavorites,
}: MealDetailFlyoutProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen || !slot) {
      return;
    }

    closeButtonRef.current?.focus();
  }, [isOpen, slot]);

  useEffect(() => {
    if (!isOpen || !slot) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        returnFocusTo?.focus();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((element) => !element.hasAttribute("disabled"));

      if (focusables.length === 0) {
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) {
        return;
      }
      const active = document.activeElement;
      const currentIndex = focusables.findIndex((element) => element === active);

      event.preventDefault();

      if (event.shiftKey) {
        if (active === first || currentIndex <= 0) {
          last.focus();
          return;
        }

        focusables[currentIndex - 1]?.focus();
        return;
      }

      if (active === last || currentIndex === -1) {
        first.focus();
        return;
      }

      focusables[currentIndex + 1]?.focus();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, slot, onClose, returnFocusTo]);

  if (!isOpen || !slot) {
    return null;
  }

  const { meal } = slot;
  const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients : [];
  const instructionSteps = Array.isArray(meal.instructions) ? meal.instructions : [];
  const nutrientList =
    meal.nutrition && typeof meal.nutrition === "object" && Array.isArray((meal.nutrition as { nutrients?: unknown }).nutrients)
      ? ((meal.nutrition as { nutrients: Array<{ name?: string; amount?: number | string; unit?: string }> }).nutrients ?? [])
      : [];
  const isEnriched = meal.status === "enriched" && (ingredients.length > 0 || instructionSteps.length > 0);

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close meal details"
        className="absolute inset-0 bg-[rgba(33,42,35,0.28)]"
        onClick={() => {
          onClose();
          returnFocusTo?.focus();
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-[rgba(255,252,245,0.96)] px-6 py-6 shadow-[-24px_0_48px_rgba(33,42,35,0.18)] backdrop-blur md:px-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
              {meal.meal_type} · {meal.day_of_week}
            </p>
            <h2 id={titleId} className="mt-3 font-display text-3xl leading-tight text-[var(--color-sage-deep)]">
              {meal.title}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => {
              onClose();
              returnFocusTo?.focus();
            }}
            className="min-h-[44px] rounded-full bg-white/85 px-4 py-2 text-sm text-[var(--color-sage-deep)]"
          >
            Close
          </button>
        </div>

        {isEnriched && meal.image_url ? (
          <section className="mt-8 overflow-hidden rounded-[1.5rem] bg-white/72">
            <img
              src={meal.image_url}
              alt={meal.title}
              className="h-64 w-full object-cover"
            />
          </section>
        ) : null}

        <section className="mt-8 rounded-[1.5rem] bg-white/72 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Summary</p>
          <p className="mt-3 text-base leading-8 text-[var(--color-ink)]">{meal.short_description}</p>
        </section>

        {isEnriched ? (
          <>
            <section className="mt-5 rounded-[1.5rem] bg-white/72 p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Ingredients</p>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--color-ink)]">
                {ingredients.map((ingredient, index) => (
                  <li key={`${meal.id}-ingredient-${index}`}>
                    {typeof ingredient === "object" && ingredient !== null && "original" in ingredient
                      ? String((ingredient as { original?: unknown }).original ?? "")
                      : String(ingredient)}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-5 rounded-[1.5rem] bg-white/72 p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Instructions</p>
              <ol className="mt-3 space-y-3 text-sm leading-7 text-[var(--color-ink)]">
                {instructionSteps.map((step, index) => (
                  <li key={`${meal.id}-instruction-${index}`}>
                    <span className="mr-2 font-semibold text-[var(--color-sage-deep)]">{index + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </section>

            <section className="mt-5 rounded-[1.5rem] bg-white/72 p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Nutrition summary</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {nutrientList.slice(0, 4).map((nutrient, index) => (
                  <div
                    key={`${meal.id}-nutrient-${index}`}
                    className="rounded-full bg-[rgba(74,103,65,0.1)] px-3 py-2 text-sm text-[var(--color-sage-deep)]"
                  >
                    {nutrient.name}: {nutrient.amount}
                    {nutrient.unit ? ` ${nutrient.unit}` : ""}
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="mt-5 rounded-[1.5rem] bg-white/72 p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Recipe view</p>
            <p className="mt-3 text-base leading-8 text-[var(--color-ink)]">
              Enrichment unlocks the full recipe here, including ingredients, instructions, nutrition, and imagery.
            </p>
          </section>
        )}

        <section className="mt-5 rounded-[1.5rem] bg-white/72 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Why this fits</p>
          <p className="mt-3 text-base leading-8 text-[var(--color-ink)]">
            {meal.rationale ?? "This meal lines up with the household context used to generate the plan."}
          </p>
        </section>

        <section className="mt-5 rounded-[1.5rem] bg-white/72 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Management actions</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {!isFinalized ? (
              <>
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="min-h-[44px] rounded-xl bg-[#4A6741] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Regenerate meal
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="min-h-[44px] rounded-xl bg-[rgba(128,59,38,0.08)] px-4 py-2 text-sm font-semibold text-[#803b26]"
                >
                  Delete meal
                </button>
              </>
            ) : null}
            {favoriteState === "ready" ? (
              <button
                type="button"
                onClick={onSaveFavorite}
                className="min-h-[44px] rounded-xl bg-[rgba(74,103,65,0.1)] px-4 py-2 text-sm font-semibold text-[var(--color-sage-deep)]"
              >
                Save to favorites
              </button>
            ) : null}
            {favoriteState === "saved" ? (
              <>
                <span
                  aria-live="polite"
                  className="min-h-[44px] rounded-xl bg-[rgba(74,103,65,0.14)] px-4 py-2 text-sm font-semibold text-[var(--color-sage-deep)]"
                >
                  Saved
                </span>
                <button
                  type="button"
                  onClick={(event) => onOpenFavorites?.(event.currentTarget)}
                  className="min-h-[44px] px-2 text-sm text-[var(--color-sage-deep)] hover:underline"
                >
                  Open favorites
                </button>
              </>
            ) : null}
            {favoriteState === "disabled" && favoriteHelperText ? (
              <p className="text-sm leading-7 text-[var(--color-muted)]">
                Favorites are available after enrichment
                <br />
                {favoriteHelperText}
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
