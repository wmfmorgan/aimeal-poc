import { expect, test, type Page, type Route } from "@playwright/test";

const DEFAULT_PASSWORD = "PlanPlate2026!";

function uniqueEmail(prefix = "generation"): string {
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

async function mockHousehold(route: Route) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: trpcJson({
      id: "household-test-id",
      name: "Morgan Family",
      cookingSkillLevel: "intermediate",
      appliances: ["oven", "air fryer"],
      members: [
        {
          id: "member-1",
          name: "Alex",
          allergies: ["peanuts"],
          avoidances: ["olives"],
          dietType: "",
        },
      ],
    }),
  });
}

test.describe("Generation Form", () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page, "generation-flow");

    await page.route("**/functions/v1/trpc/household.get**", mockHousehold);
    await page.route("**/functions/v1/trpc/mealPlan.create**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: trpcJson({ id: "test-plan-id-12345" }),
      });
    });
    await page.route("**/functions/v1/trpc/devTools.llmLogs**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: trpcJson([
          {
            id: "log-1",
            model: "grok-4-1-fast-non-reasoning",
            prompt: "Prompt preview",
            response: "Response preview",
            prompt_tokens: 321,
            completion_tokens: 654,
            household_id: "household-test-id",
            created_at: new Date("2026-04-21T12:00:00.000Z").toISOString(),
          },
        ]),
      });
    });
    await page.route("**/functions/v1/generate-draft", async (route) => {
      const mockSSE = [
        'data: {"day_of_week":"Monday","meal_type":"breakfast","title":"Oat Porridge with Berries","short_description":"A warming bowl of rolled oats topped with seasonal berries."}\n\n',
        'data: {"day_of_week":"Monday","meal_type":"lunch","title":"Grilled Chicken Salad","short_description":"Lightly dressed mixed greens with grilled chicken breast."}\n\n',
        'data: {"day_of_week":"Monday","meal_type":"dinner","title":"Beef Stir Fry","short_description":"Tender beef and vegetables over jasmine rice."}\n\n',
        "data: [DONE]\n\n",
      ].join("");

      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
        body: mockSSE,
      });
    });

    await page.goto("/plan/new");
  });

  test("GEN-01: GenerationForm renders with meal type preset buttons", async ({ page }) => {
    await expect(page.getByText("Dinner only")).toBeVisible();
    await expect(page.getByText("Lunch + Dinner")).toBeVisible();
    await expect(page.getByText("All three")).toBeVisible();
  });

  test("GEN-01: Day count stepper increments and stays within range", async ({ page }) => {
    const increaseButton = page.getByRole("button", { name: "Increase days" });
    await expect(increaseButton).toBeVisible();
    await increaseButton.click();
    await expect(page.getByText("8")).toBeVisible();
  });

  test("GEN-02: Submitting the form shows skeleton grid immediately", async ({ page }) => {
    await page.getByRole("button", { name: /Generate Your Plan/i }).click();
    await expect(page.locator(".animate-pulse").first()).toBeVisible({ timeout: 1000 });
  });

  test("GEN-02: Meal cards populate after SSE events arrive", async ({ page }) => {
    await page.getByRole("button", { name: /Generate Your Plan/i }).click();
    await expect(page.getByText("Oat Porridge with Berries")).toBeVisible({ timeout: 3000 });
  });

  test("GEN-02: Plan ready banner appears after stream completes", async ({ page }) => {
    await page.getByRole("button", { name: /Generate Your Plan/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: /plan is ready/i })).toBeVisible({
      timeout: 5000,
    });
  });

  test("DEVT-03: /dev shows the LLM Requests heading and a mocked log entry", async ({ page }) => {
    await page.goto("/dev");
    await expect(page.getByText("LLM Requests")).toBeVisible();
    await expect(page.getByText("grok-4-1-fast-non-reasoning")).toBeVisible();
    await expect(page.getByText(/tokens/)).toBeVisible();
  });

  test("DEVT-03: /dev renders the Spoonacular placeholder section", async ({ page }) => {
    await page.goto("/dev");
    await expect(page.getByText("Spoonacular Usage")).toBeVisible();
    await expect(page.getByText("Coming in Phase 6.")).toBeVisible();
  });
});

test.skip("MANUAL GEN-02: First real meal card appears within 2000ms of submit", () => {
  // See .planning/phases/04-draft-generation-with-streaming/04-VALIDATION.md
});
