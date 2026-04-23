import { DAYS_OF_WEEK, MEAL_TYPES, type MealSlot, type MealType } from "./types.ts";

function isMealType(value: string): value is MealType {
  return (MEAL_TYPES as readonly string[]).includes(value);
}

function isDayOfWeek(value: string): value is MealSlot["day_of_week"] {
  return (DAYS_OF_WEEK as readonly string[]).includes(value);
}

export function buildSlotKey(dayOfWeek: string, mealType: string): string {
  return `${dayOfWeek}:${mealType}`;
}

export function buildExpectedSlots(numDays: number, mealTypes: string[]): string[] {
  const days = DAYS_OF_WEEK.slice(0, Math.max(0, Math.min(numDays, DAYS_OF_WEEK.length)));

  return days.flatMap((day) =>
    mealTypes.filter(isMealType).map((mealType) => buildSlotKey(day, mealType))
  );
}

export function parseMealLine(line: string): MealSlot | null {
  try {
    const parsed = JSON.parse(line) as Partial<MealSlot>;

    if (
      !parsed ||
      typeof parsed.title !== "string" ||
      typeof parsed.short_description !== "string" ||
      typeof parsed.day_of_week !== "string" ||
      typeof parsed.meal_type !== "string" ||
      !isDayOfWeek(parsed.day_of_week) ||
      !isMealType(parsed.meal_type)
    ) {
      return null;
    }

    return {
      day_of_week: parsed.day_of_week,
      meal_type: parsed.meal_type,
      title: parsed.title,
      short_description: parsed.short_description,
    };
  } catch {
    return null;
  }
}
