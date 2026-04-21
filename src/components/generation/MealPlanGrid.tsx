import { Fragment } from "react";

import { buildSlotKey } from "@/lib/generation/stream-parser";
import { DAYS_OF_WEEK, MEAL_TYPES, type MealSlot, type MealType } from "@/lib/generation/types";

import { MealCard } from "./MealCard";
import { SkeletonMealCard } from "./SkeletonMealCard";

type MealPlanGridProps = {
  numDays: number;
  mealTypes: string[];
  slots: Record<string, MealSlot>;
};

const mealTypeLabels: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

export function MealPlanGrid({ numDays, mealTypes, slots }: MealPlanGridProps) {
  const days = DAYS_OF_WEEK.slice(0, Math.max(0, Math.min(numDays, DAYS_OF_WEEK.length)));
  const activeMealTypes = MEAL_TYPES.filter((mealType) => mealTypes.includes(mealType));

  function renderSlot(day: string, mealType: MealType) {
    const slotKey = buildSlotKey(day, mealType);
    const meal = slots[slotKey];

    return meal ? <MealCard meal={meal} /> : <SkeletonMealCard />;
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
        className="hidden gap-4 md:grid"
        data-testid="meal-plan-grid-desktop"
        style={{ gridTemplateColumns: `minmax(6rem, auto) repeat(${days.length}, minmax(0, 1fr))` }}
      >
        <div />
        {days.map((day) => (
          <p
            key={day}
            className="text-center text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]"
          >
            {day}
          </p>
        ))}

        {activeMealTypes.map((mealType) => (
          <Fragment key={mealType}>
            <p
              key={`${mealType}-label`}
              className="flex items-center text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]"
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
