type SelectionActionBarProps = {
  selectedCount: number;
  onSelectAll: () => void;
  onDoneSelecting: () => void;
  onEnrichSelected: () => void;
};

export function SelectionActionBar({
  selectedCount,
  onSelectAll,
  onDoneSelecting,
  onEnrichSelected,
}: SelectionActionBarProps) {
  return (
    <div className="sticky top-4 z-10 rounded-[1.5rem] border border-[rgba(74,103,65,0.14)] bg-white/88 px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
            Selection mode
          </p>
          <p className="mt-1 text-sm text-[var(--color-ink)]">
            {selectedCount === 0 ? "Choose the meals you want to enrich." : `${selectedCount} meal${selectedCount === 1 ? "" : "s"} selected`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onSelectAll}
            className="min-h-[44px] rounded-full border border-[rgba(74,103,65,0.2)] px-4 py-2 text-sm text-[var(--color-sage-deep)]"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={onDoneSelecting}
            className="min-h-[44px] rounded-full px-4 py-2 text-sm text-[var(--color-sage-deep)]"
          >
            Done selecting
          </button>
          <button
            type="button"
            onClick={onEnrichSelected}
            disabled={selectedCount === 0}
            className="min-h-[44px] rounded-full bg-[#4A6741] px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enrich selected meals
          </button>
        </div>
      </div>
    </div>
  );
}
