export const CUISINE_ENUM: ReadonlySet<string> = new Set([
  "african",
  "american",
  "british",
  "cajun",
  "caribbean",
  "chinese",
  "eastern european",
  "european",
  "french",
  "german",
  "greek",
  "indian",
  "irish",
  "italian",
  "japanese",
  "jewish",
  "korean",
  "latin american",
  "mediterranean",
  "mexican",
  "middle eastern",
  "nordic",
  "southern",
  "spanish",
  "thai",
  "vietnamese",
]);

export const TYPE_ENUM: ReadonlySet<string> = new Set([
  "main course",
  "side dish",
  "dessert",
  "appetizer",
  "salad",
  "bread",
  "breakfast",
  "soup",
  "beverage",
  "sauce",
  "marinade",
  "fingerfood",
  "snack",
  "drink",
]);

export const DIET_ENUM: ReadonlySet<string> = new Set([
  "gluten free",
  "ketogenic",
  "vegetarian",
  "lacto-vegetarian",
  "ovo-vegetarian",
  "vegan",
  "pescetarian",
  "paleo",
  "primal",
  "low fodmap",
  "whole30",
]);

export const INTOLERANCE_ENUM: ReadonlySet<string> = new Set([
  "dairy",
  "egg",
  "gluten",
  "grain",
  "peanut",
  "seafood",
  "sesame",
  "shellfish",
  "soy",
  "sulfite",
  "tree nut",
  "wheat",
]);

export const EQUIPMENT_ENUM: ReadonlySet<string> = new Set([
  "blender",
  "oven",
  "frying pan",
  "slow cooker",
  "pressure cooker",
  "grill",
  "microwave",
  "food processor",
  "stand mixer",
  "immersion blender",
  "wok",
  "dutch oven",
]);

const MEAL_TYPE_TO_SPOONACULAR: Record<string, string> = {
  breakfast: "breakfast",
  lunch: "main course",
  dinner: "main course",
};

const SKILL_TIME_CAP: Record<string, number | null> = {
  beginner: 30,
  intermediate: 60,
  advanced: null,
};

type EnumDropField = "cuisine" | "type";

export type Member = {
  allergies: string[];
  avoidances: string[];
  diet_type: string | null;
};

export type HouseholdRestrictions = {
  diet: string | null;
  intolerances: string[];
  excludeIngredients: string[];
  equipment: string[];
  maxReadyTime: number | null;
};

export type SearchHints = {
  cuisine: string | null;
  type: string | null;
  includeIngredients: string[];
  excludeIngredients: string[];
  maxReadyTime: number | null;
  mainIngredient: string | null;
};

export type EnumDropTelemetry = {
  totalEmitted: number;
  dropped: number;
  markers: string[];
};

export function mealTypeToSpoonacularType(mealType: string): string | null {
  return MEAL_TYPE_TO_SPOONACULAR[mealType] ?? null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeNonEmptyLowerString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeStringArray(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim().toLowerCase())
    .slice(0, maxItems);
}

function trackEnumValue(
  raw: unknown,
  allowed: ReadonlySet<string>,
  field: EnumDropField,
  telemetry?: EnumDropTelemetry,
): string | null {
  const normalized = normalizeNonEmptyLowerString(raw);
  if (!normalized) {
    return null;
  }

  if (telemetry) {
    telemetry.totalEmitted += 1;
  }

  if (allowed.has(normalized)) {
    return normalized;
  }

  if (telemetry) {
    telemetry.dropped += 1;
    telemetry.markers.push(`[[enum-drop:${field}:${normalized}]]`);
  }

  return null;
}

function normalizeSearchHintsInternal(
  raw: unknown,
  telemetry?: EnumDropTelemetry,
): SearchHints | null {
  if (!isRecord(raw)) {
    return null;
  }

  const includeSource = Array.isArray(raw.include_ingredients)
    ? raw.include_ingredients
    : Array.isArray(raw.includeIngredients)
      ? raw.includeIngredients
      : [];
  const excludeSource = Array.isArray(raw.exclude_ingredients)
    ? raw.exclude_ingredients
    : Array.isArray(raw.excludeIngredients)
      ? raw.excludeIngredients
      : [];
  const snakeReadyTime = raw.max_ready_time_min;
  const camelReadyTime = raw.maxReadyTime;
  const maxReadyTime =
    typeof snakeReadyTime === "number" && snakeReadyTime > 0
      ? Math.min(120, Math.max(5, Math.trunc(snakeReadyTime)))
      : typeof camelReadyTime === "number" && camelReadyTime > 0
        ? Math.min(120, Math.max(5, Math.trunc(camelReadyTime)))
        : null;

  return {
    cuisine: trackEnumValue(raw.cuisine, CUISINE_ENUM, "cuisine", telemetry),
    type: trackEnumValue(raw.type, TYPE_ENUM, "type", telemetry),
    includeIngredients: normalizeStringArray(includeSource, 4),
    excludeIngredients: normalizeStringArray(excludeSource, 8),
    maxReadyTime,
    mainIngredient: normalizeNonEmptyLowerString(raw.main_ingredient ?? raw.mainIngredient),
  };
}

export function normalizeSearchHints(raw: unknown): SearchHints | null {
  return normalizeSearchHintsInternal(raw);
}

export function collectEnumDropTelemetry(raw: unknown): EnumDropTelemetry {
  const telemetry: EnumDropTelemetry = {
    totalEmitted: 0,
    dropped: 0,
    markers: [],
  };

  normalizeSearchHintsInternal(raw, telemetry);
  return telemetry;
}

export function aggregateHouseholdRestrictions(
  members: Member[],
  appliances: string[],
  skillLevel: string,
): HouseholdRestrictions {
  const intolerances = new Set<string>();
  const excludeIngredients = new Set<string>();
  const diets = new Set<string>();

  for (const member of members) {
    for (const allergy of member.allergies) {
      const normalized = normalizeNonEmptyLowerString(allergy);
      if (!normalized) {
        continue;
      }

      if (INTOLERANCE_ENUM.has(normalized)) {
        intolerances.add(normalized);
      } else {
        excludeIngredients.add(normalized);
      }
    }

    for (const avoidance of member.avoidances) {
      const normalized = normalizeNonEmptyLowerString(avoidance);
      if (normalized) {
        excludeIngredients.add(normalized);
      }
    }

    const diet = normalizeNonEmptyLowerString(member.diet_type);
    if (diet && DIET_ENUM.has(diet)) {
      diets.add(diet);
    }
  }

  const equipment = appliances
    .map((appliance) => appliance.trim().toLowerCase())
    .filter((appliance) => appliance.length > 0 && EQUIPMENT_ENUM.has(appliance));

  return {
    diet: diets.size === 1 ? [...diets][0] : null,
    intolerances: [...intolerances],
    excludeIngredients: [...excludeIngredients],
    equipment: [...new Set(equipment)],
    maxReadyTime: SKILL_TIME_CAP[skillLevel] ?? null,
  };
}

export function countLoggedEnumDrops(
  responseText: string,
): { totalEmitted: number; dropped: number } {
  const summaryMatches = [...responseText.matchAll(/\[\[enum-drop-summary:emitted=(\d+);dropped=(\d+)\]\]/g)];
  const summaryMatch = summaryMatches.at(-1);

  if (!summaryMatch) {
    return { totalEmitted: 0, dropped: 0 };
  }

  return {
    totalEmitted: Number(summaryMatch[1] ?? 0),
    dropped: Number(summaryMatch[2] ?? 0),
  };
}
