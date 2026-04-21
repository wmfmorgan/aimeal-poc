import { buildExpectedSlots } from "@/lib/generation/stream-parser";
import { type MealSlot } from "@/lib/generation/types";

import { MealCard } from "./MealCard";
import { SkeletonMealCard } from "./SkeletonMealCard";

type MealPlanGridProps = {
  numDays: number;
  mealTypes: string[];
  slots: Record<string, MealSlot>;
};

export function MealPlanGrid({ numDays, mealTypes, slots }: MealPlanGridProps) {
  const expectedSlots = buildExpectedSlots(numDays, mealTypes);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {expectedSlots.map((slotKey) => {
        const meal = slots[slotKey];
        return meal ? <MealCard key={slotKey} meal={meal} /> : <SkeletonMealCard key={slotKey} />;
      })}
    </div>
  );
}
