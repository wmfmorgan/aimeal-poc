import type { PersistedMeal, ShoppingListGroup, ShoppingListItem, ShoppingListQuantityDetail } from "./types.ts";

type IngredientRecord = Record<string, unknown>;

const FALLBACK_GROUP = "Other ingredients";

function isRecord(value: unknown): value is IngredientRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeUnit(value: unknown): string | null {
  const unit = normalizeText(value).toLowerCase();
  return unit.length > 0 ? unit : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(/\.?0+$/, "");
}

function buildQuantityLabel(details: ShoppingListQuantityDetail[]): string {
  return details.map((detail) => detail.label).join(" + ");
}

function readIngredient(ingredient: unknown) {
  if (!isRecord(ingredient)) {
    return null;
  }

  const ingredientId =
    typeof ingredient.id === "number" && Number.isFinite(ingredient.id)
      ? String(Math.trunc(ingredient.id))
      : null;
  const name = normalizeText(ingredient.name) || normalizeText(ingredient.nameClean);
  const original = normalizeText(ingredient.original);
  const amount = toNumber(ingredient.amount);
  const unit = normalizeUnit(ingredient.unit);
  const category = normalizeText(ingredient.aisle) || FALLBACK_GROUP;
  const identity = ingredientId ?? (normalizeName(name) || normalizeName(original));

  if (!identity) {
    return null;
  }

  return {
    identity,
    name: name || original || "Ingredient",
    category,
    amount,
    unit,
    original,
  };
}

function upsertQuantityDetail(
  details: ShoppingListQuantityDetail[],
  amount: number | null,
  unit: string | null
) {
  const label =
    amount == null
      ? unit ?? "as needed"
      : unit
        ? `${formatAmount(amount)} ${unit}`
        : formatAmount(amount);

  const existing = details.find((detail) => detail.unit === unit && detail.amount != null && amount != null);
  if (existing && amount != null) {
    const nextAmount = (existing.amount ?? 0) + amount;
    existing.amount = nextAmount;
    existing.label = existing.unit ? `${formatAmount(nextAmount)} ${existing.unit}` : formatAmount(nextAmount);
    return;
  }

  if (!details.some((detail) => detail.label === label)) {
    details.push({
      amount,
      unit,
      label,
    });
  }
}

export function buildShoppingList(meals: Array<Pick<PersistedMeal, "status" | "ingredients">>): ShoppingListGroup[] {
  const grouped = new Map<string, Map<string, ShoppingListItem>>();

  for (const meal of meals) {
    if (meal.status !== "enriched" || !Array.isArray(meal.ingredients)) {
      continue;
    }

    for (const rawIngredient of meal.ingredients) {
      const ingredient = readIngredient(rawIngredient);
      if (!ingredient) {
        continue;
      }

      const groupHeading = ingredient.category;
      const group = grouped.get(groupHeading) ?? new Map<string, ShoppingListItem>();

      const existing = group.get(ingredient.identity);
      if (existing) {
        upsertQuantityDetail(existing.quantityDetails, ingredient.amount, ingredient.unit);
        if (ingredient.original && !existing.originalExamples.includes(ingredient.original)) {
          existing.originalExamples.push(ingredient.original);
        }
        existing.quantityLabel = buildQuantityLabel(existing.quantityDetails);
        group.set(ingredient.identity, existing);
        grouped.set(groupHeading, group);
        continue;
      }

      const quantityDetails: ShoppingListQuantityDetail[] = [];
      upsertQuantityDetail(quantityDetails, ingredient.amount, ingredient.unit);

      group.set(ingredient.identity, {
        key: ingredient.identity,
        name: ingredient.name,
        category: groupHeading,
        quantityLabel: buildQuantityLabel(quantityDetails),
        quantityDetails,
        originalExamples: ingredient.original ? [ingredient.original] : [],
      });
      grouped.set(groupHeading, group);
    }
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([heading, items]) => ({
      heading,
      items: [...items.values()].sort((left, right) => left.name.localeCompare(right.name)),
    }));
}

export function buildShoppingListCopy(groups: ShoppingListGroup[]): string {
  return groups
    .map((group) => {
      const lines = group.items.map((item) => `- ${item.name}${item.quantityLabel ? ` (${item.quantityLabel})` : ""}`);
      return [group.heading, ...lines].join("\n");
    })
    .join("\n\n");
}
