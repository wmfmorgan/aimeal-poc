import { expect, test, type Page, type Route } from "@playwright/test";

const DEFAULT_PASSWORD = "PlanPlate2026!";

function uniqueEmail(prefix = "layout-shell") {
  return `${prefix}+${Date.now()}@planplate.local`;
}

function trpcJson(data: unknown) {
  return JSON.stringify([{ result: { data } }]);
}

function buildMeals(numDays: number) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].slice(
    0,
    numDays
  );

  return days.map((day, index) => ({
    id: `meal-${day.toLowerCase()}`,
    day_of_week: day,
    meal_type: "dinner",
    title: `${day} Dinner`,
    short_description: `Dinner draft ${index + 1}`,
    rationale: null,
    status: "draft",
    is_favorite: false,
    spoonacular_recipe_id: null,
  }));
}

async function signUp(page: Page, prefix: string) {
  await page.goto("/auth");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByPlaceholder("you@example.com").fill(uniqueEmail(prefix));
  await page.getByPlaceholder("8 characters minimum").fill(DEFAULT_PASSWORD);
  await page.locator("button[type=submit]").filter({ hasText: "Create account" }).click();
  await expect(page).toHaveURL(/\/household/, { timeout: 15_000 });
}

async function mockHousehold(route: Route) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: trpcJson({
      id: "household-test-id",
      name: "Morgan Family",
      cookingSkillLevel: "intermediate",
      appliances: ["oven", "air fryer"],
      members: [{ id: "member-1", name: "Alex", allergies: [], avoidances: [], dietType: "" }],
    }),
  });
}

async function mockPersistedPlan(page: Page, numDays: number) {
  await page.route("**/functions/v1/trpc/mealPlan.get**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: trpcJson({
        id: `plan-${numDays}`,
        title: `${numDays}-day layout plan`,
        numDays,
        mealTypes: ["dinner"],
        generation_status: "draft",
        shopping_list: null,
        meals: buildMeals(numDays),
      }),
    });
  });
}

test.describe("Phase 8 layout shell", () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page, "layout-shell");
    await page.route("**/functions/v1/trpc/household.get**", mockHousehold);
  });

  test("desktop 4-day and 7-day plans use distinct density without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });

    await mockPersistedPlan(page, 4);
    await page.goto("/plan/plan-4");
    const relaxedGrid = page.getByTestId("meal-plan-grid-desktop");
    await expect(relaxedGrid).toBeVisible();
    const relaxedGap = await relaxedGrid.evaluate((node) => window.getComputedStyle(node).columnGap);

    await page.unroute("**/functions/v1/trpc/mealPlan.get**");
    await mockPersistedPlan(page, 7);
    await page.goto("/plan/plan-7");
    const denseGrid = page.getByTestId("meal-plan-grid-desktop");
    await expect(denseGrid).toBeVisible();
    await expect(denseGrid.getByText("Sunday", { exact: true })).toBeVisible();
    const denseMetrics = await denseGrid.evaluate((node) => ({
      gap: window.getComputedStyle(node).columnGap,
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth,
    }));

    expect(Number.parseFloat(relaxedGap)).toBeGreaterThan(Number.parseFloat(denseMetrics.gap));
    expect(denseMetrics.scrollWidth).toBeLessThanOrEqual(denseMetrics.clientWidth + 2);
  });

  test("tablet keeps the matrix plan layout before falling back to mobile stacking", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await mockPersistedPlan(page, 7);
    await page.goto("/plan/plan-7");

    await expect(page.getByTestId("meal-plan-grid-desktop")).toBeVisible();
    await expect(page.getByTestId("meal-plan-grid-mobile")).toBeHidden();
    const tabletMetrics = await page.getByTestId("meal-plan-grid-desktop").evaluate((node) => ({
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth,
    }));
    expect(tabletMetrics.scrollWidth / tabletMetrics.clientWidth).toBeLessThanOrEqual(1.08);
  });

  test("mobile keeps the stacked plan model", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockPersistedPlan(page, 4);
    await page.goto("/plan/plan-4");

    await expect(page.getByTestId("meal-plan-grid-mobile")).toBeVisible();
    await expect(page.getByTestId("meal-plan-grid-desktop")).toBeHidden();
  });

  test("home, household, and auth preserve their width caps inside the wider shell", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });

    await page.goto("/");
    const homeSizes = await page.getByTestId("home-page-layout").evaluate((node) => {
      const hero = node.querySelector("[data-testid='home-page-hero']") as HTMLElement;
      return { layout: node.clientWidth, hero: hero.clientWidth };
    });
    expect(homeSizes.hero).toBeLessThan(homeSizes.layout);

    await page.unroute("**/functions/v1/trpc/household.get**");
    await page.route("**/functions/v1/trpc/household.get**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: trpcJson(null),
      });
    });
    await page.goto("/household");
    const householdSizes = await page.locator("form").evaluate((node) => {
      const primary = node.querySelector("[data-testid='household-primary-rail']") as HTMLElement;
      const support = node.querySelector("[data-testid='household-support-rail']") as HTMLElement;
      return { primary: primary.clientWidth, support: support.clientWidth };
    });
    expect(householdSizes.primary).toBeGreaterThan(householdSizes.support);

    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto("/auth");
    const authWidth = await page.getByTestId("auth-shell").evaluate((node) => node.clientWidth);
    expect(authWidth).toBeLessThanOrEqual(512);
  });
});
