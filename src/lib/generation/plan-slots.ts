/**
 * Persisted plan slot normalization helpers (Phase 5).
 *
 * Converts a `PersistedMealPlan` (DB rows) into a stable slot map keyed by
 * `day_of_week:meal_type`.  Missing rows are represented as intentional
 * `{ state: "empty" }` slots — never absent from the map — so the grid
 * always renders a complete, stable layout regardless of how many meals
 * have been deleted (D-06, D-11, D-12).
 *
 * Key alignment: uses the same `day:mealType` format as `buildSlotKey` in
 * `stream-parser.ts` so Phase 4 streaming and Phase 5 persisted paths share
 * one slot-identity contract.
 */

import { DAYS_OF_WEEK, MEAL_TYPES, type DayOfWeek, type MealPlanSlot, type MealType, type PersistedMeal, type PersistedMealPlan } from "./types";

/**
 * Returns the canonical slot key used across both the streaming and
 * persisted-management paths: `"Monday:dinner"`, `"Tuesday:breakfast"`, etc.
 *
 * Mirrors `buildSlotKey` from `stream-parser.ts` so callers can use either
 * helper interchangeably.
 */
export function buildMealPlanSlotKey(dayOfWeek: string, mealType: string): string {
  return `${dayOfWeek}:${mealType}`;
}

function isMealType(value: string): value is MealType {
  return (MEAL_TYPES as readonly string[]).includes(value);
}

function isDayOfWeek(value: string): value is DayOfWeek {
  return (DAYS_OF_WEEK as readonly string[]).includes(value);
}

/**
 * Normalize a `PersistedMealPlan` into a complete slot map.
 *
 * For every (day × mealType) combination that falls within the plan's
 * `numDays` and `mealTypes` configuration:
 *
 * - If a persisted `PersistedMeal` row exists → `{ state: "filled", meal }`
 * - Otherwise → `{ state: "empty", day_of_week, meal_type }`
 *
 * Meals with unrecognized `day_of_week` or `meal_type` values are discarded
 * (T-05-03: malformed data cannot collapse the grid structure).
 *
 * The result is a `Record<string, MealPlanSlot>` where every expected key is
 * present, making `slots[key] === undefined` impossible during rendering.
 */
export function buildMealPlanSlots(plan: PersistedMealPlan): Record<string, MealPlanSlot> {
  const days = DAYS_OF_WEEK.slice(0, Math.max(0, Math.min(plan.numDays, DAYS_OF_WEEK.length)));
  const activeMealTypes = plan.mealTypes.filter(isMealType);

  // Index valid persisted meals by slot key for O(1) lookup.
  const mealsByKey = new Map<string, PersistedMeal>();
  for (const meal of plan.meals) {
    if (isDayOfWeek(meal.day_of_week) && isMealType(meal.meal_type)) {
      const key = buildMealPlanSlotKey(meal.day_of_week, meal.meal_type);
      mealsByKey.set(key, meal);
    }
    // Silently discard meals with unrecognized day/type values (T-05-03).
  }

  const slots: Record<string, MealPlanSlot> = {};

  for (const day of days) {
    for (const mealType of activeMealTypes) {
      const key = buildMealPlanSlotKey(day, mealType);
      const persisted = mealsByKey.get(key);

      if (persisted) {
        slots[key] = {
          state: "filled",
          slotKey: key,
          day_of_week: day,
          meal_type: mealType,
          meal: persisted,
        };
      } else {
        slots[key] = { state: "empty", slotKey: key, day_of_week: day, meal_type: mealType };
      }
    }
  }

  return slots;
}
