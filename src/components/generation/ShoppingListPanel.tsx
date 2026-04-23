import { useEffect, useId, useRef, useState } from "react";

import { buildShoppingListCopy } from "@/lib/generation/shopping-list";
import type { ShoppingListGroup as ShoppingListGroupType } from "@/lib/generation/types";

import { ShoppingListGroup } from "./ShoppingListGroup";

type ShoppingListPanelProps = {
  groups: ShoppingListGroupType[];
  isOpen: boolean;
  returnFocusTo?: HTMLElement | null;
  onClose: () => void;
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

export function ShoppingListPanel({
  groups,
  isOpen,
  returnFocusTo = null,
  onClose,
}: ShoppingListPanelProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setCopyMessage(null);
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

  async function handleCopy() {
    const text = buildShoppingListCopy(groups);
    await navigator.clipboard.writeText(text);
    setCopyMessage("Shopping list copied");
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close shopping list"
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
        className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-[rgba(255,252,245,0.96)] px-6 py-6 shadow-[-24px_0_48px_rgba(33,42,35,0.18)] backdrop-blur md:px-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
              Shopping list
            </p>
            <h2 id={titleId} className="mt-3 font-display text-3xl leading-tight text-[var(--color-sage-deep)]">
              Your shopping list is ready.
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
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="min-h-[44px] rounded-full bg-[#4A6741] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Copy shopping list
          </button>
          {copyMessage ? (
            <p aria-live="polite" className="text-sm font-semibold text-[var(--color-sage-deep)]">
              {copyMessage}
            </p>
          ) : null}
        </div>
        {groups.length === 0 ? (
          <section className="mt-8 rounded-[1.5rem] bg-white/72 p-6">
            <h3 className="font-display text-2xl text-[var(--color-sage-deep)]">No shopping list yet</h3>
            <p className="mt-3 text-sm leading-8 text-[var(--color-muted)]">
              Finalize this plan to build a de-duplicated shopping list from your enriched meals.
            </p>
          </section>
        ) : (
          <div className="mt-8 space-y-4">
            {groups.map((group) => (
              <ShoppingListGroup key={group.heading} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
