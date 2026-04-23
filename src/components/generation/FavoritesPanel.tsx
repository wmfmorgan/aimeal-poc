import { useEffect, useId, useRef } from "react";

import type { FavoriteLibraryEntry } from "@/hooks/use-meal-plan";

type FavoritesPanelProps = {
  favorites: FavoriteLibraryEntry[];
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

export function FavoritesPanel({
  favorites,
  isOpen,
  returnFocusTo = null,
  onClose,
}: FavoritesPanelProps) {
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
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close favorites library"
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
              Favorites library
            </p>
            <h2 id={titleId} className="mt-3 font-display text-3xl leading-tight text-[var(--color-sage-deep)]">
              Favorites library
            </h2>
            <p className="mt-3 text-sm leading-8 text-[var(--color-muted)]">
              Saved recipes stay available across future meal plans.
            </p>
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
        {favorites.length === 0 ? (
          <section className="mt-8 rounded-[1.5rem] bg-white/72 p-6">
            <h3 className="font-display text-2xl text-[var(--color-sage-deep)]">No saved recipes yet</h3>
            <p className="mt-3 text-sm leading-8 text-[var(--color-muted)]">
              Save any enriched recipe from your plan or flyout to build a favorites library you can revisit across future meal plans.
            </p>
          </section>
        ) : (
          <div className="mt-8 space-y-4">
            {favorites.map((favorite) => (
              <section key={favorite.id} className="rounded-[1.5rem] bg-white/72 p-6">
                <div className="flex gap-4">
                  {favorite.image_url ? (
                    <img
                      src={favorite.image_url}
                      alt={favorite.title}
                      className="h-24 w-24 rounded-[1.25rem] object-cover"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
                      Recipe
                    </p>
                    <h3 className="mt-2 font-display text-2xl leading-tight text-[var(--color-sage-deep)]">
                      {favorite.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                      Saved {new Date(favorite.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
