import { expect, test, type Page, type Route } from "@playwright/test";

const DEFAULT_PASSWORD = "PlanPlate2026!";

type PersistedMeal = {
  id: string;
  day_of_week: string;
  meal_type: string;
  title: string;
  short_description: string;
  rationale: string | null;
  status: "draft" | "enriched";
};

function uniqueEmail(prefix = "plan-management"): string {
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

test.describe("Persisted plan management", () => {
  let meals: PersistedMeal[];

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
        title: "Ginger Salmon Rice Bowls",
        short_description: "Salmon, cucumbers, rice, and yogurt drizzle.",
        rationale: "Fast high-protein dinner for a busy night.",
        status: "draft",
      },
    ];

    await signUp(page, "plan-management");

    await page.route("**/functions/v1/trpc/mealPlan.get**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: trpcJson({
          id: "plan-1",
          title: "Weeknight plan",
          numDays: 2,
          mealTypes: ["dinner"],
          meals,
        }),
      });
    });

    await page.route("**/functions/v1/trpc/meal.delete**", async (route) => {
      meals = meals.filter((meal) => meal.id !== "meal-1");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: trpcJson({
          mealPlanId: "plan-1",
          dayOfWeek: "Monday",
          mealType: "dinner",
        }),
      });
    });

    await page.route("**/functions/v1/trpc/meal.regenerate**", async (route) => {
      const replacement: PersistedMeal = {
        id: `meal-${Date.now()}`,
        day_of_week: "Monday",
        meal_type: "dinner",
        title: "Regenerated Citrus Chicken",
        short_description: "Bright lemon chicken with roasted broccoli and couscous.",
        rationale: "Keeps the slot fresh without changing the rest of the plan.",
        status: "draft",
      };

      meals = [...meals.filter((meal) => !(meal.day_of_week === "Monday" && meal.meal_type === "dinner")), replacement];

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: trpcJson({
          mealPlanId: "plan-1",
          dayOfWeek: "Monday",
          mealType: "dinner",
          mealId: replacement.id,
          title: replacement.title,
        }),
      });
    });

    await page.goto("/plan/plan-1");
  });

  test("opens the flyout and closes it with Escape", async ({ page }) => {
    await page.getByRole("button", { name: "View details" }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Why this fits")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("deletes a meal into an empty slot and regenerates it without clearing sibling slots", async ({ page }) => {
    const desktopGrid = page.getByTestId("meal-plan-grid-desktop");

    await expect(desktopGrid.getByText("Lemon Orzo Chicken")).toBeVisible();
    await expect(desktopGrid.getByText("Ginger Salmon Rice Bowls")).toBeVisible();

    await desktopGrid.getByRole("button", { name: "Delete meal" }).first().click();
    await page.getByRole("button", { name: "Confirm delete" }).click();

    await expect(desktopGrid.getByText("Open slot")).toBeVisible();
    await expect(desktopGrid.getByText("Ginger Salmon Rice Bowls")).toBeVisible();

    await desktopGrid.getByRole("button", { name: "Regenerate meal" }).first().click();

    await expect(desktopGrid.getByText("Regenerated Citrus Chicken")).toBeVisible();
    await expect(desktopGrid.getByText("Ginger Salmon Rice Bowls")).toBeVisible();
  });

  test("no inline edit regression", async ({ page }) => {
    await expect(page.getByText("Edit title")).toHaveCount(0);
    await expect(page.getByText("Rename")).toHaveCount(0);
    await expect(page.getByText("Save changes")).toHaveCount(0);
    await expect(page.locator("input, textarea, [contenteditable='true']")).toHaveCount(0);
  });
});
