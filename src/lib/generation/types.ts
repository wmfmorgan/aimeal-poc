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

// ---------------------------------------------------------------------------
// Persisted plan management types (Phase 5)
// ---------------------------------------------------------------------------

export type MealPlanSlotState = "filled" | "empty" | "regenerating" | "error";

/**
 * A persisted meal row as returned from the database via `mealPlan.get`.
 */
export type PersistedMeal = {
  id: string;
  day_of_week: DayOfWeek;
  meal_type: MealType;
  title: string;
  short_description: string;
  rationale: string | null;
  status: "draft" | "enriched";
  spoonacular_recipe_id?: number | null;
  ingredients?: unknown[] | null;
  nutrition?: Record<string, unknown> | null;
  instructions?: string[] | null;
  image_url?: string | null;
};

export type SpoonacularUsageEntry = {
  meal_id: string | null;
  meal_plan_id: string | null;
  spoonacular_recipe_id: number | null;
  cache_hit: boolean;
  endpoint: string;
  points_used: number;
  quota_request: number | null;
  quota_used: number | null;
  quota_left: number | null;
  usage_date_utc: string;
  created_at: string;
};

export type SpoonacularUsageSummary = {
  usage_date_utc: string;
  requests_made: number;
  cache_hits: number;
  cache_misses: number;
  points_used: number;
  quota_used: number | null;
  quota_left: number | null;
  daily_limit: number;
};

/**
 * A full persisted meal plan with its meals array, as returned from
 * the `mealPlan.get` tRPC procedure.
 */
export type PersistedMealPlan = {
  id: string;
  title: string;
  numDays: number;
  mealTypes: MealType[];
  meals: PersistedMeal[];
};

/**
 * A union type representing a single cell in the meal-plan grid.
 *
 * - `filled`      — a persisted meal exists for this day + type slot
 * - `empty`       — slot is intentionally empty (deleted or never populated)
 * - `regenerating`— slot-local loading state during single-slot regeneration
 * - `error`       — slot-local error state after a failed mutation
 */
export type MealPlanSlot =
  | { state: "filled"; slotKey: string; day_of_week: DayOfWeek; meal_type: MealType; meal: PersistedMeal }
  | { state: "empty"; slotKey: string; day_of_week: DayOfWeek; meal_type: MealType }
  | { state: "regenerating"; slotKey: string; day_of_week: DayOfWeek; meal_type: MealType; previous: PersistedMeal | null }
  | { state: "error"; slotKey: string; day_of_week: DayOfWeek; meal_type: MealType; message: string; previous: PersistedMeal | null };

// ---------------------------------------------------------------------------

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
