import { Fragment } from "react";

import { buildSlotKey } from "@/lib/generation/stream-parser";
import { DAYS_OF_WEEK, MEAL_TYPES, type MealPlanSlot, type MealSlot, type MealType } from "@/lib/generation/types";

import { EmptyMealSlot } from "./EmptyMealSlot";
import { MealCard } from "./MealCard";
import { MealRegeneratingCard } from "./MealRegeneratingCard";
import { SkeletonMealCard } from "./SkeletonMealCard";

type MealPlanGridProps = {
  numDays: number;
  mealTypes: string[];
  slots: Record<string, MealSlot | MealPlanSlot>;
  isSelectionMode?: boolean;
  isFinalized?: boolean;
  selectedMealIds?: string[];
  pendingMealIds?: Record<string, boolean>;
  enrichmentErrorsByMealId?: Record<string, string | null>;
  onDelete?: (slotKey: string) => void;
  onRegenerate?: (slotKey: string) => void;
  onRetryEnrichment?: (mealId: string) => void;
  onToggleSelectMeal?: (mealId: string) => void;
  onViewDetails?: (slotKey: string, trigger: HTMLElement) => void;
};

const mealTypeLabels: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

function isManagedSlot(slot: MealSlot | MealPlanSlot | undefined): slot is MealPlanSlot {
  return !!slot && typeof slot === "object" && "state" in slot;
}

export function MealPlanGrid({
  numDays,
  mealTypes,
  slots,
  isSelectionMode = false,
  isFinalized = false,
  selectedMealIds = [],
  pendingMealIds = {},
  enrichmentErrorsByMealId = {},
  onDelete,
  onRegenerate,
  onRetryEnrichment,
  onToggleSelectMeal,
  onViewDetails,
}: MealPlanGridProps) {
  const days = DAYS_OF_WEEK.slice(0, Math.max(0, Math.min(numDays, DAYS_OF_WEEK.length)));
  const activeMealTypes = MEAL_TYPES.filter((mealType) => mealTypes.includes(mealType));
  const isFiveDayLayout = days.length === 5;
  const isSixPlusDayLayout = days.length >= 6;
  const desktopGridGapClass = isSixPlusDayLayout
    ? "gap-x-2 gap-y-4 lg:gap-x-3"
    : isFiveDayLayout
      ? "gap-x-3 gap-y-5 lg:gap-x-4"
      : "gap-x-4 gap-y-6 xl:gap-x-6";
  const desktopLabelClass = isSixPlusDayLayout
    ? "text-[10px] tracking-[0.22em] lg:text-[11px]"
    : isFiveDayLayout
      ? "text-[11px] tracking-[0.24em]"
      : "text-xs tracking-[0.26em]";
  const leftRailWidth = isSixPlusDayLayout ? "minmax(5.25rem, auto)" : "minmax(6rem, auto)";

  function renderSlot(day: string, mealType: MealType) {
    const slotKey = buildSlotKey(day, mealType);
    const slot = slots[slotKey];

    if (!slot) {
      return <SkeletonMealCard />;
    }

    if (!isManagedSlot(slot)) {
      return <MealCard slot={{
        state: "filled",
        slotKey,
        day_of_week: slot.day_of_week,
        meal_type: slot.meal_type,
        meal: {
          id: slotKey,
          day_of_week: slot.day_of_week,
          meal_type: slot.meal_type,
          title: slot.title,
          short_description: slot.short_description,
          rationale: null,
          status: "draft",
        },
      }} showMealTypeLabel={false} onDelete={() => {}} onRegenerate={() => {}} />;
    }

    switch (slot.state) {
      case "filled":
        return (
          <MealCard
            slot={slot}
            isSelectionMode={isSelectionMode}
            isFinalized={isFinalized}
            isSelected={selectedMealIds.includes(slot.meal.id)}
            isEnriching={pendingMealIds[slot.meal.id] === true}
            errorMessage={enrichmentErrorsByMealId[slot.meal.id] ?? null}
            showMealTypeLabel={false}
            onDelete={() => onDelete?.(slot.slotKey)}
            onRegenerate={() => onRegenerate?.(slot.slotKey)}
            onRetryEnrichment={() => onRetryEnrichment?.(slot.meal.id)}
            onToggleSelection={() => onToggleSelectMeal?.(slot.meal.id)}
            onCardClick={
              onViewDetails ? (trigger) => onViewDetails(slot.slotKey, trigger) : undefined
            }
          />
        );
      case "empty":
        return (
          <EmptyMealSlot
            dayOfWeek={slot.day_of_week}
            mealType={slot.meal_type}
            onRegenerate={() => onRegenerate?.(slot.slotKey)}
          />
        );
      case "regenerating":
        return <MealRegeneratingCard mealType={slot.meal_type} previous={slot.previous} />;
      case "error":
        if (!slot.previous) {
          return (
            <EmptyMealSlot
              dayOfWeek={slot.day_of_week}
              mealType={slot.meal_type}
              errorMessage={slot.message}
              onRegenerate={() => onRegenerate?.(slot.slotKey)}
            />
          );
        }

        const previous = slot.previous;

        return (
          <MealCard
            slot={{
              state: "filled",
              slotKey: slot.slotKey,
              day_of_week: slot.day_of_week,
              meal_type: slot.meal_type,
              meal: previous,
            }}
            errorMessage={slot.message}
            isFinalized={isFinalized}
            showMealTypeLabel={false}
            onDelete={() => onDelete?.(slot.slotKey)}
            onRegenerate={() => onRegenerate?.(slot.slotKey)}
            onCardClick={
              onViewDetails ? (trigger) => onViewDetails(slot.slotKey, trigger) : undefined
            }
          />
        );
      default:
        return <SkeletonMealCard />;
    }
  }

  return (
    <>
      <div className="space-y-6 md:hidden" data-testid="meal-plan-grid-mobile">
        {days.map((day) => (
          <section key={day} className="space-y-4" aria-label={`${day} meals`}>
            <h3 className="font-display text-[20px] font-semibold leading-snug text-[var(--color-sage-deep)]">
              {day}
            </h3>
            <div className="space-y-4">
              {activeMealTypes.map((mealType) => (
                <div key={mealType} className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
                    {mealTypeLabels[mealType]}
                  </p>
                  {renderSlot(day, mealType)}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div
        className={`hidden md:grid ${desktopGridGapClass}`}
        data-testid="meal-plan-grid-desktop"
        style={{ gridTemplateColumns: `${leftRailWidth} repeat(${days.length}, minmax(0, 1fr))` }}
      >
        <div />
        {days.map((day) => (
          <p
            key={day}
            className={`text-center uppercase text-[var(--color-muted)] ${desktopLabelClass}`}
          >
            {day}
          </p>
        ))}

        {activeMealTypes.map((mealType) => (
          <Fragment key={mealType}>
            <p
              key={`${mealType}-label`}
              className={`flex items-center uppercase text-[var(--color-muted)] ${desktopLabelClass}`}
            >
              {mealTypeLabels[mealType]}
            </p>
            {days.map((day) => (
              <div key={`${day}:${mealType}`} className="min-w-0">
                {renderSlot(day, mealType)}
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </>
  );
}
