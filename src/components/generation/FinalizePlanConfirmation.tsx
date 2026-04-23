import { useEffect, useId, useRef } from "react";

type FinalizePlanConfirmationProps = {
  isOpen: boolean;
  returnFocusTo?: HTMLElement | null;
  isSubmitting?: boolean;
  canConfirm?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const FOCUSABLE_SELECTOR = [
  "button",
  "[href]",
  "input",
  "select",
  "textarea",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function restoreFocus(target: HTMLElement | null) {
  window.setTimeout(() => target?.focus(), 0);
}

export function FinalizePlanConfirmation({
  isOpen,
  returnFocusTo = null,
  isSubmitting = false,
  canConfirm = true,
  onClose,
  onConfirm,
}: FinalizePlanConfirmationProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        restoreFocus(returnFocusTo);
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

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, returnFocusTo]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close finalize plan confirmation"
        className="absolute inset-0 bg-[rgba(33,42,35,0.28)]"
        onClick={() => {
          onClose();
          restoreFocus(returnFocusTo);
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-y-auto bg-[rgba(255,252,245,0.96)] px-6 py-6 shadow-[-24px_0_48px_rgba(33,42,35,0.18)] backdrop-blur md:px-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
              Finalize plan
            </p>
            <h2 id={titleId} className="mt-3 font-display text-3xl leading-tight text-[var(--color-sage-deep)]">
              Finalize plan:
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => {
              onClose();
              restoreFocus(returnFocusTo);
            }}
            className="min-h-[44px] rounded-full bg-white/85 px-4 py-2 text-sm text-[var(--color-sage-deep)]"
          >
            Close
          </button>
        </div>
        <section className="mt-8 rounded-[1.5rem] bg-[rgba(128,59,38,0.08)] p-6">
          <p className="text-base leading-8 text-[#803b26]">
            Draft meals will be removed from this finalized plan. Only enriched meals will be kept.
          </p>
        </section>
        <section className="mt-5 rounded-[1.5rem] bg-white/72 p-6">
          <p className="text-sm leading-8 text-[var(--color-ink)]">
            Finalize turns your enriched meals into a clean shopping list and locks this plan for cooking.
          </p>
        </section>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting || !canConfirm}
            className="min-h-[44px] rounded-full bg-[#4A6741] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Finalizing…" : "Finalize plan"}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              restoreFocus(returnFocusTo);
            }}
            className="min-h-[44px] rounded-full border border-[rgba(74,103,65,0.16)] bg-white/72 px-5 py-3 text-sm font-semibold text-[var(--color-sage-deep)]"
          >
            Cancel
          </button>
        </div>
        {!canConfirm ? (
          <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
            Enrich at least one meal before finalizing so the shopping list has a recipe to keep.
          </p>
        ) : null}
      </div>
    </div>
  );
}
