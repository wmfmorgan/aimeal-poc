import { expect, test, type Page } from "@playwright/test";

const DEFAULT_PASSWORD = "PlanPlate2026!";

type PersistedMeal = {
  id: string;
  day_of_week: string;
  meal_type: string;
  title: string;
  short_description: string;
  rationale: string | null;
  status: "draft" | "enriched";
  is_favorite?: boolean;
  spoonacular_recipe_id?: number | null;
  ingredients?: unknown[] | null;
  instructions?: string[] | null;
  nutrition?: Record<string, unknown> | null;
  image_url?: string | null;
};

type FavoriteEntry = {
  id: string;
  title: string;
  spoonacular_recipe_id: number;
  ingredients: unknown[];
  nutrition: Record<string, unknown> | null;
  instructions: string[];
  image_url: string | null;
  created_at: string;
};

function uniqueEmail(prefix = "finalization-favorites") {
  return `${prefix}+${Date.now()}@planplate.local`;
}

async function signUp(page: Page, prefix: string) {
  const email = uniqueEmail(prefix);

  await page.goto("/auth");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("8 characters minimum").fill(DEFAULT_PASSWORD);
  await page.locator("button[type=submit]").filter({ hasText: "Create account" }).click();
  await expect(page).toHaveURL(/\/household/, { timeout: 15_000 });
}

function trpcJson(data: unknown) {
  return JSON.stringify([{ result: { data } }]);
}

test.describe("Phase 7 finalization and favorites", () => {
  let meals: PersistedMeal[];
  let shoppingList: Array<{ heading: string; items: Array<{ key: string; name: string; category: string; quantityLabel: string; quantityDetails: Array<{ amount: number | null; unit: string | null; label: string }>; originalExamples: string[] }> }>;
  let favorites: FavoriteEntry[];
  let generationStatus: "draft" | "finalized";

  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.addInitScript(() => {
      Object.assign(window, { __lastCopiedText: "" });
      Object.assign(navigator, {
        clipboard: {
          writeText: async (text: string) => {
            Object.assign(window, { __lastCopiedText: text });
          },
        },
      });
    });

    meals = [
      {
        id: "meal-draft",
        day_of_week: "Monday",
        meal_type: "dinner",
        title: "Quick Tomato Pasta",
        short_description: "Tomato pasta with basil.",
        rationale: "Fast pantry dinner.",
        status: "draft",
        is_favorite: false,
        spoonacular_recipe_id: null,
      },
      {
        id: "meal-enriched",
        day_of_week: "Tuesday",
        meal_type: "dinner",
        title: "Herby Salmon Bowls",
        short_description: "Salmon, rice, cucumbers, and yogurt sauce.",
        rationale: "Fast weeknight protein.",
        status: "enriched",
        is_favorite: false,
        spoonacular_recipe_id: 42,
        ingredients: [
          { id: 1, name: "Salmon fillet", aisle: "Seafood", amount: 2, unit: "", original: "2 salmon fillets" },
          { id: 2, name: "Rice", aisle: "Pasta and Rice", amount: 1, unit: "cup", original: "1 cup rice" },
        ],
        instructions: ["Roast the salmon.", "Cook the rice."],
        nutrition: { nutrients: [{ name: "Calories", amount: 520, unit: "kcal" }] },
        image_url: "https://img.example/salmon.jpg",
      },
    ];

    shoppingList = [
      {
        heading: "Seafood",
        items: [
          {
            key: "1",
            name: "Salmon fillet",
            category: "Seafood",
            quantityLabel: "2",
            quantityDetails: [{ amount: 2, unit: null, label: "2" }],
            originalExamples: ["2 salmon fillets"],
          },
        ],
      },
    ];

    favorites = [];
    generationStatus = "draft";

    await signUp(page, "finalization-favorites");

    await page.route("**/functions/v1/trpc/mealPlan.get**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: trpcJson({
          id: "plan-1",
          title: "Weeknight plan",
          numDays: 2,
          mealTypes: ["dinner"],
          generation_status: generationStatus,
          shopping_list: generationStatus === "finalized" ? shoppingList : null,
          meals,
        }),
      });
    });

    await page.route("**/functions/v1/trpc/mealPlan.finalize**", async (route) => {
      if (!meals.some((meal) => meal.status === "enriched")) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify([{ error: { message: "Finalize requires at least one enriched meal." } }]),
        });
        return;
      }

      generationStatus = "finalized";
      meals = meals.filter((meal) => meal.status === "enriched");

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: trpcJson({
          mealPlanId: "plan-1",
          generationStatus: "finalized",
          shoppingList,
          removedDraftCount: 1,
          enrichedMealCount: 1,
        }),
      });
    });

    await page.route("**/functions/v1/trpc/meal.saveFavorite**", async (route) => {
      meals = meals.map((meal) =>
        meal.id === "meal-enriched"
          ? {
              ...meal,
              is_favorite: true,
            }
          : meal
      );

      favorites = [
        {
          id: "favorite-1",
          title: "Herby Salmon Bowls",
          spoonacular_recipe_id: 42,
          ingredients: meals.find((meal) => meal.id === "meal-enriched")?.ingredients ?? [],
          nutrition: { nutrients: [{ name: "Calories", amount: 520, unit: "kcal" }] },
          instructions: ["Roast the salmon.", "Cook the rice."],
          image_url: "https://img.example/salmon.jpg",
          created_at: "2026-04-22T00:00:00.000Z",
        },
      ];

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: trpcJson({
          mealId: "meal-enriched",
          mealPlanId: "plan-1",
          favoriteId: "favorite-1",
          spoonacularRecipeId: 42,
          isFavorite: true,
        }),
      });
    });

    await page.route("**/functions/v1/trpc/favorites.list**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: trpcJson(favorites),
      });
    });

    await page.goto("/plan/plan-1");
  });

  test("finalizes a mixed-state plan, copies the shopping list, and persists favorites across revisit", async ({ page }) => {
    await page.getByRole("button", { name: "View details" }).first().click();
    const mealDialog = page.getByRole("dialog");
    await expect(mealDialog.getByText("Enrich this meal to save it")).toBeVisible();
    await mealDialog.getByRole("button", { name: "Close", exact: true }).click();

    await page.getByRole("button", { name: "Finalize plan" }).click();
    const finalizeDialog = page.getByRole("dialog");
    await expect(
      finalizeDialog.getByText("Draft meals will be removed from this finalized plan. Only enriched meals will be kept.")
    ).toBeVisible();
    await finalizeDialog.getByRole("button", { name: "Finalize plan" }).click();

    await expect(page.getByRole("button", { name: "View shopping list" })).toBeVisible();
    await expect(page.getByText("Quick Tomato Pasta")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "View details" }).first()).toBeVisible();

    const shoppingListDialog = page.getByRole("dialog");
    await expect(page.getByText("Seafood")).toBeVisible();
    await expect(shoppingListDialog.getByText("Salmon fillet", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Copy shopping list" }).click();
    await expect(page.getByText("Shopping list copied")).toBeVisible();
    await shoppingListDialog.getByRole("button", { name: "Close", exact: true }).click();

    await page.getByRole("button", { name: "View details" }).click();
    const favoriteDialog = page.getByRole("dialog");
    await favoriteDialog.getByRole("button", { name: "Save to favorites" }).click();
    await expect(favoriteDialog.getByText("Saved")).toBeVisible();
    await favoriteDialog.getByRole("button", { name: "Open favorites" }).click();
    const favoritesPanel = page.getByRole("dialog").last();
    await expect(
      favoritesPanel.getByRole("heading", { name: "Favorites library" })
    ).toBeVisible();
    await expect(favoritesPanel.getByText("Herby Salmon Bowls")).toBeVisible();
  });

  test("surfaces finalize rejection when a plan has no enriched meals", async ({ page }) => {
    meals = [
      {
        id: "meal-draft",
        day_of_week: "Monday",
        meal_type: "dinner",
        title: "Quick Tomato Pasta",
        short_description: "Tomato pasta with basil.",
        rationale: "Fast pantry dinner.",
        status: "draft",
        is_favorite: false,
        spoonacular_recipe_id: null,
      },
    ];

    await page.reload();
    await expect(page.getByRole("button", { name: "Finalize plan" })).toBeDisabled();
    await expect(
      page.getByText("Enrich meals before finalizing so your shopping list has at least one recipe to keep.")
    ).toBeVisible();
  });
});
