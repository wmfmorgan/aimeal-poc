export const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];
export type MealType = (typeof MEAL_TYPES)[number];

export type MealSlot = {
  day_of_week: DayOfWeek;
  meal_type: MealType;
  title: string;
  short_description: string;
};

export type GenerationFormState = {
  numDays: number;
  mealTypes: MealType[];
};

export type StreamState = "idle" | "streaming" | "complete" | "error";

export const MEAL_TYPE_PRESETS = [
  {
    label: "Dinner only",
    mealTypes: ["dinner"] as MealType[],
  },
  {
    label: "Lunch + Dinner",
    mealTypes: ["lunch", "dinner"] as MealType[],
  },
  {
    label: "All three",
    mealTypes: ["breakfast", "lunch", "dinner"] as MealType[],
  },
] as const;

export const GENERATION_COPY = {
  eyebrow: "Draft generation",
  heading: "Generate your meal plan draft",
  body:
    "Pick how many days to plan and which meal slots matter first. The draft streams into the grid as the AI responds.",
  mealTypesLabel: "Meal cadence",
  numDaysLabel: "Number of days",
  submitCta: "Generate Your Plan →",
  submitError: "Could not create your plan. Please try again.",
  planReadyBanner: "Your plan is ready. Meals will be enriched in the next step.",
  streamErrorBanner: "The draft stream stopped before finishing.",
  streamErrorRetry: "Try again →",
} as const;
