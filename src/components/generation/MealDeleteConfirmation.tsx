type MealDeleteConfirmationProps = {
  isDeleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function MealDeleteConfirmation({
  isDeleting = false,
  onCancel,
  onConfirm,
}: MealDeleteConfirmationProps) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl bg-[rgba(128,59,38,0.06)] px-3 py-2">
      <span className="text-xs text-[#803b26]">Delete meal: Remove this meal from the plan? You can regenerate this slot again afterward.</span>
      <button
        type="button"
        onClick={onCancel}
        disabled={isDeleting}
        className="min-h-[44px] px-2 text-sm text-[var(--color-sage-deep)] hover:underline disabled:opacity-60"
      >
        Keep meal
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={isDeleting}
        className="min-h-[44px] px-2 text-sm text-[#803b26] hover:underline disabled:opacity-60"
      >
        Confirm delete
      </button>
    </div>
  );
}
