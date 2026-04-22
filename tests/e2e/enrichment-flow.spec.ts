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
  spoonacular_recipe_id?: number | null;
  ingredients?: Array<{ original: string }> | null;
  nutrition?: { nutrients: Array<{ name: string; amount: number; unit: string }> } | null;
  instructions?: string[] | null;
  image_url?: string | null;
};

type UsageEntry = {
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

function uniqueEmail(prefix = "enrichment-flow"): string {
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

function buildUsage(entries: UsageEntry[]) {
  const today = entries.reduce(
    (acc, entry) => {
      acc.requests_made += 1;
      acc.points_used += entry.points_used;
      acc.cache_hits += entry.cache_hit ? 1 : 0;
      acc.cache_misses += entry.cache_hit ? 0 : 1;
      acc.quota_used = entry.quota_used ?? acc.quota_used;
      acc.quota_left = entry.quota_left ?? acc.quota_left;
      return acc;
    },
    {
      usage_date_utc: "2026-04-22",
      requests_made: 0,
      cache_hits: 0,
      cache_misses: 0,
      points_used: 0,
      quota_used: 0,
      quota_left: 50,
      daily_limit: 50,
    }
  );

  return {
    today,
    recent: [...entries].reverse(),
    liveConcurrencyLimit: 2,
  };
}

function extractMealId(postData: unknown): string | null {
  if (!postData) {
    return null;
  }

  if (Array.isArray(postData) && postData.length > 0) {
    return extractMealId(postData[0]);
  }

  if (typeof postData !== "object") {
    return null;
  }

  if ("mealId" in postData && typeof postData.mealId === "string") {
    return postData.mealId;
  }

  if ("json" in postData && typeof postData.json === "object" && postData.json !== null) {
    return extractMealId(postData.json);
  }

  return extractMealId(Object.values(postData as Record<string, unknown>)[0]);
}

test.describe("Enrichment Flow", () => {
  let meals: PersistedMeal[];
  let usageEntries: UsageEntry[];
  let enrichCallCount: Record<string, number>;

  test.beforeEach(async ({ page }) => {
    meals = [
      {
        id: "meal-1",
        day_of_week: "Monday",
        meal_type: "dinner",
        title: "Lemon Orzo Chicken",
        short_description: "Chicken thighs with lemony orzo and spinach.",
        rationale: "Simple skillet dinner with familiar flavors.",
        status: "draft",
      },
      {
        id: "meal-2",
        day_of_week: "Tuesday",
        meal_type: "dinner",
        title: "Peanut Noodle Bowls",
        short_description: "A creamy noodle bowl with crunchy vegetables.",
        rationale: "Fast comfort-food dinner.",
        status: "draft",
      },
      {
        id: "meal-3",
        day_of_week: "Wednesday",
        meal_type: "dinner",
        title: "Herby Salmon Bowls",
        short_description: "Salmon, rice, cucumbers, and yogurt sauce.",
        rationale: "High-protein dinner with bright herbs.",
        status: "draft",
      },
    ];
    usageEntries = [];
    enrichCallCount = {};

    await signUp(page, "enrichment-flow");

    await page.route("**/functions/v1/trpc/mealPlan.get**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: trpcJson({
          id: "plan-1",
          title: "Weeknight plan",
          numDays: 3,
          mealTypes: ["dinner"],
          meals,
        }),
      });
    });

    await page.route("**/functions/v1/trpc/devTools.llmLogs**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: trpcJson([]),
      });
    });

    await page.route("**/functions/v1/trpc/devTools.spoonacularUsage**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: trpcJson(buildUsage(usageEntries)),
      });
    });

    await page.route("**/functions/v1/trpc/meal.enrich**", async (route) => {
      const mealId = extractMealId(route.request().postDataJSON());

      if (!mealId) {
        await route.fulfill({ status: 500, contentType: "application/json", body: trpcJson({}) });
        return;
      }

      enrichCallCount[mealId] = (enrichCallCount[mealId] ?? 0) + 1;

      if (mealId === "meal-2" && enrichCallCount[mealId] === 1) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify([{ error: { json: { message: "Unsafe Spoonacular match for peanut allergy." } } }]),
        });
        return;
      }

      const mealIndex = meals.findIndex((meal) => meal.id === mealId);
      const baseMeal = meals[mealIndex];
      const isCacheHit = baseMeal.status === "enriched";
      const recipeId = mealId === "meal-1" ? 101 : mealId === "meal-2" ? 202 : 303;

      meals[mealIndex] = {
        ...baseMeal,
        status: "enriched",
        spoonacular_recipe_id: recipeId,
        image_url: `https://img.example/${recipeId}.jpg`,
        ingredients: [{ original: "1 cup rice" }, { original: "2 salmon fillets" }],
        instructions: ["Cook the rice.", "Roast the salmon."],
        nutrition: {
          nutrients: [
            { name: "Calories", amount: 520, unit: "kcal" },
            { name: "Protein", amount: 34, unit: "g" },
          ],
        },
      };

      usageEntries.push({
        meal_id: mealId,
        meal_plan_id: "plan-1",
        spoonacular_recipe_id: recipeId,
        cache_hit: isCacheHit,
        endpoint: isCacheHit ? "meal-row" : `recipes/${recipeId}/information`,
        points_used: isCacheHit ? 0 : 2,
        quota_request: isCacheHit ? 0 : 2,
        quota_used: isCacheHit ? usageEntries.length : usageEntries.length + 2,
        quota_left: isCacheHit ? 50 - usageEntries.length : 50 - (usageEntries.length + 2),
        usage_date_utc: "2026-04-22",
        created_at: new Date().toISOString(),
      });

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: trpcJson({
          mealId,
          mealPlanId: "plan-1",
          status: "enriched",
          cacheHit: isCacheHit,
          liveConcurrencyLimit: 2,
        }),
      });
    });

    await page.goto("/plan/plan-1");
  });

  test("ENRCH-01: user can multi-select meals and enrich them from the persisted plan surface", async ({ page }) => {
    await page.getByRole("button", { name: "Select meals" }).click();
    await page.getByRole("button", { name: "Select all" }).click();
    await page.getByRole("button", { name: "Enrich selected meals" }).click();

    await expect(page.getByTestId("meal-plan-grid-desktop").getByText("Enriched")).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Retry enrichment" }).first()).toBeVisible();
  });

  test("ENRCH-04: grid updates live as individual meals complete and failures stay local", async ({ page }) => {
    await page.getByRole("button", { name: "Select meals" }).click();
    await page.getByRole("button", { name: "Select all" }).click();
    await page.getByRole("button", { name: "Enrich selected meals" }).click();

    await expect(page.getByTestId("meal-plan-grid-desktop").getByText("Enriched")).toHaveCount(2);
    const desktopRetry = page
      .getByTestId("meal-plan-grid-desktop")
      .getByRole("button", { name: "Retry enrichment" });
    await expect(desktopRetry).toBeVisible();
    await desktopRetry.click();
  });

  test("ENRCH-05 / DEVT-04: enriched flyout and Spoonacular usage reporting work end to end", async ({ page }) => {
    await page.getByRole("button", { name: "Select meals" }).click();
    await page.getByRole("button", { name: "Select all" }).click();
    await page.getByRole("button", { name: "Enrich selected meals" }).click();
    await page
      .getByTestId("meal-plan-grid-desktop")
      .getByRole("button", { name: "Retry enrichment" })
      .click();

    await page.getByRole("button", { name: "View details" }).first().click();
    await expect(page.getByText("Ingredients")).toBeVisible();
    await expect(page.getByText("Cook the rice.")).toBeVisible();
    await expect(page.getByText("Nutrition summary")).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Select all" }).click();
    await page.getByRole("button", { name: "Enrich selected meals" }).click();

    await page.goto("/dev");
    await expect(page.getByText("Spoonacular Usage")).toBeVisible();
    await expect(page.getByText("Today's usage")).toBeVisible();
    await expect(page.getByText("Cache hits")).toBeVisible();
    await expect(page.getByText("recipes/101/information")).toBeVisible();
  });
});
