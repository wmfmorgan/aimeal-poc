import type { PersistedMeal } from "./types.ts";

type SpoonacularInstructionNode = {
  step?: string | null;
};

type SpoonacularInstructionBlock = {
  steps?: SpoonacularInstructionNode[] | null;
};

export type SpoonacularRecipePayload = {
  id: number | null;
  extendedIngredients?: unknown;
  nutrition?: unknown;
  analyzedInstructions?: SpoonacularInstructionBlock[] | null;
  instructions?: string[] | null;
  image?: string | null;
  cached_at?: string | null;
};

export type SpoonacularCacheCandidate = Pick<
  PersistedMeal,
  "spoonacular_recipe_id" | "ingredients" | "nutrition" | "instructions" | "image_url"
> & {
  cached_at?: string | null;
};

export type EnrichedMealPatch = Pick<
  PersistedMeal,
  "status" | "spoonacular_recipe_id" | "ingredients" | "nutrition" | "instructions" | "image_url"
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeIngredients(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function normalizeNutrition(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

export function getInstructionSteps(recipe: Pick<SpoonacularRecipePayload, "analyzedInstructions" | "instructions">): string[] | null {
  const analyzedSteps =
    recipe.analyzedInstructions
      ?.flatMap((block) => block.steps ?? [])
      .map((step) => step.step?.trim() ?? "")
      .filter((step) => step.length > 0) ?? [];

  if (analyzedSteps.length > 0) {
    return analyzedSteps;
  }

  const instructionFallback =
    recipe.instructions?.map((step) => step.trim()).filter((step) => step.length > 0) ?? [];

  return instructionFallback.length > 0 ? instructionFallback : null;
}

export function isRecipeCached(recipe: SpoonacularCacheCandidate | null | undefined): boolean {
  if (!recipe || recipe.spoonacular_recipe_id == null) {
    return false;
  }

  const hasIngredients = Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0;
  const hasNutrition = isRecord(recipe.nutrition);
  const hasInstructions = Array.isArray(recipe.instructions) && recipe.instructions.length > 0;
  const hasImage = isNonEmptyString(recipe.image_url);

  return hasIngredients && hasNutrition && hasInstructions && hasImage;
}

// Phase 6 keeps cache-first reuse for the PoC per D-10. We do not enforce a
// hidden expiry here; the current one-hour pricing-page language is tracked as
// explicit risk acceptance in the plan summary instead.
export function buildEnrichedMealPatch(recipe: SpoonacularRecipePayload): EnrichedMealPatch {
  return {
    status: "enriched",
    spoonacular_recipe_id: recipe.id,
    ingredients: normalizeIngredients(recipe.extendedIngredients),
    nutrition: normalizeNutrition(recipe.nutrition),
    instructions: getInstructionSteps(recipe),
    image_url: isNonEmptyString(recipe.image) ? recipe.image : null,
  };
}
